#!/usr/bin/env python3
"""파이 Claude Code 활용 집계 — 발표용 수치를 원천에서 다시 뽑는다(파이에서만 돈다).

원천과 기준선
- 토큰·금액: ~/.claude/projects/-home-pi-sop-project 대화 기록(메인·서브에이전트·.trash).
  🔴 응답 하나가 내용 블록마다 한 줄씩(평균 약 2.3줄) **같은 usage** 로 기록된다 → (message.id, requestId) 로 중복을 뺀다.
     ~/.claude/stats-cache.json(/stats 의 누적 통계)은 이 중복을 그대로 더해 부풀려져 있다 — 참고 추정에만 쓴다.
- 커밋·코드 줄·새 파일: 저장소 3개에서 이 기기가 만든 커밋만(이전 작성자 이름 제외).
  · sop-project·Rpi5 = 작성자 이름이 이 기기 `git config user.name` — 이 기기의 HEAD reflog 와 대조해 일치(Rpi5 458/458 · sop-project 618/618, 9/4~).
  · project-docs = 데스크톱도 같은 이름을 써서 이름으로 못 가른다 → 이 기기 HEAD reflog 의 커밋(3건)만.
  · 옛 저장소에서 통째로 옮겨 온 커밋(IMPORTED)은 커밋 수에만 넣고 줄·파일 수에서 뺀다.
- push: 이 기기의 원격 추적 reflog 「update by push」(reflog 가 시작된 날부터).
- 세션·지시: ~/.claude/history.jsonl 의 project = sop-project 폴더.
- 가격: claude-api 스킬 가격표(2026-09-25) · 100만 토큰당 달러 · 캐시 쓰기 1.25배(5분)·2배(1시간).

사용: python3 docs/claude-code-활용집계/집계.py [--검증]
"""
import glob, json, os, re, subprocess, sys
from collections import Counter, defaultdict
from datetime import datetime

HOME = os.path.expanduser("~")
P = subprocess.run(["git", "rev-parse", "--show-toplevel"], capture_output=True, text=True,
                   cwd=os.path.dirname(os.path.abspath(__file__))).stdout.strip()
REPOS = [("sop-project", P), ("Rpi5", os.path.join(P, "Rpi5")), ("project-docs", os.path.join(HOME, "project-docs"))]
TX = os.path.join(HOME, ".claude/projects/-home-pi-sop-project")
CLAUDE_MARK = "Co-Authored-By: Claude"
CODE = {".py", ".ino", ".cpp", ".c", ".h", ".hpp", ".js", ".mjs", ".ts", ".sh", ".css"}
DOC = {".md"}
IMPORTED = {"bf9bc0f", "e1f56f9"}   # project-docs 첫 커밋 — 옛 hanium-docs 내용을 옮겨 옴(새로 쓴 줄 아님)
# (입력, 출력, 캐시 읽기) — 100만 토큰당 달러
PRICE = {
    "claude-opus-5-5": (4, 20, 0.20), "claude-opus-5": (5, 25, 0.5), "claude-opus-4-8": (5, 25, 0.5),
    "claude-opus-4-7": (5, 25, 0.5), "claude-opus-4-6": (5, 25, 0.5), "claude-fable-5": (10, 50, 1.0),
    "claude-sonnet-5": (2, 10, 0.2), "claude-sonnet-4-6": (3, 15, 0.3),
    "claude-haiku-4-5-20251001": (1, 5, 0.1), "claude-haiku-4-5": (1, 5, 0.1),
}


def git(repo, *a):
    # 🔴 quotePath 를 끄지 않으면 한글 경로가 "…py" 처럼 따옴표째 나와 확장자를 놓친다(코드 1.5만 줄 누락을 겪음)
    return subprocess.run(["git", "-c", "core.quotePath=false", "-C", repo, *a], capture_output=True, text=True).stdout


def local_day(ts):
    return datetime.fromisoformat(ts.replace("Z", "+00:00")).astimezone().strftime("%Y-%m-%d")


def cost(m, t):
    i, o, r = PRICE[m]
    return (t["in"] * i + t["out"] * o + t["cw5"] * i * 1.25 + t["cw1"] * i * 2 + t["cr"] * r) / 1e6


# ── 토큰 ──────────────────────────────────────────────────────────────
def transcripts():
    return (glob.glob(TX + "/*.jsonl") + glob.glob(TX + "/*/subagents/*.jsonl")
            + glob.glob(TX + "/.trash/**/*.jsonl", recursive=True))


def tokens():
    seen, by = set(), defaultdict(lambda: Counter())
    days, lines, no_split = set(), 0, 0
    for f in transcripts():
        for line in open(f, encoding="utf-8", errors="ignore"):
            if '"usage"' not in line:
                continue
            try:
                d = json.loads(line)
            except ValueError:
                continue
            m = d.get("message") or {}
            u = m.get("usage")
            if d.get("type") != "assistant" or not u:
                continue
            lines += 1
            k = (m.get("id"), d.get("requestId"))
            if k in seen:
                continue
            seen.add(k)
            c = by[m.get("model")]
            cc = u.get("cache_creation") or {}
            cw = u.get("cache_creation_input_tokens", 0)
            if cc:
                c["cw5"] += cc.get("ephemeral_5m_input_tokens", 0); c["cw1"] += cc.get("ephemeral_1h_input_tokens", 0)
            else:
                c["cw5"] += cw; no_split += cw          # 나눔 정보가 없으면 싼 쪽(5분)으로 — 금액 하한
            c["in"] += u.get("input_tokens", 0); c["out"] += u.get("output_tokens", 0)
            c["cr"] += u.get("cache_read_input_tokens", 0); c["msg"] += 1
            days.add(local_day(d["timestamp"]))
    return by, sorted(days), lines, len(seen), no_split


def before_transcripts_estimate(dup, first_day):
    """대화 기록이 지워진 기간(첫 사용 ~ 기록 시작 전날)의 참고 추정.
    누적 통계(중복 포함) 모델별 합 − 같은 통계의 일별 값(기록이 남은 기간) → 중복 배수로 나눈다.
    모델 안의 4종 비율은 그 모델 전체 비율을 따른다고 가정 · 캐시 쓰기는 1시간 보관(Claude Code 기본)으로 친다."""
    s = json.load(open(os.path.join(HOME, ".claude/stats-cache.json")))
    daily = Counter()
    for x in s["dailyModelTokens"]:
        if x["date"] >= first_day:
            daily.update(x["tokensByModel"])
    tot, usd = 0.0, 0.0
    for mdl, v in s["modelUsage"].items():
        kinds = {"in": v["inputTokens"], "out": v["outputTokens"], "cr": v["cacheReadInputTokens"],
                 "cw1": v["cacheCreationInputTokens"]}
        whole = sum(kinds.values())
        before = max(0, whole - daily[mdl])
        if not whole or not before:
            continue
        t = {k: n * before / whole / dup for k, n in kinds.items()}
        t["cw5"] = 0
        tot += before / dup
        usd += cost(mdl, t) if mdl in PRICE else 0
    return s["firstSessionDate"][:10], tot, usd


# ── git ───────────────────────────────────────────────────────────────
def newpath(p):
    p = re.sub(r"\{([^{}]*) => ([^{}]*)\}", r"\2", p)
    return (p.split(" => ")[1] if " => " in p else p).replace("//", "/")


def commits(repo, refs, author=None, until=None):
    """커밋마다 (hash, 작성자, 날짜, 제목, Claude 표시, 병합, [(추가, 삭제, 경로)], [새 파일])."""
    args = ["log", *refs, "--numstat", "--summary", "--date=short",
            "--format=%x01%H%x02%an%x02%ad%x02%P%x02%s%x02%B%x03"]
    if until:
        args.append("--until=" + until)
    out, res = git(repo, *args), []
    for rec in out.split("\x01")[1:]:
        head, _, tail = rec.partition("\x03")
        h, an, ad, parents, subj, body = head.split("\x02")
        if author and an != author:
            continue
        stat, added = [], []
        for ln in tail.splitlines():
            m = re.match(r"^(\d+|-)\t(\d+|-)\t(.+)$", ln)
            if m:
                stat.append((0 if m[1] == "-" else int(m[1]), 0 if m[2] == "-" else int(m[2]), newpath(m[3])))
            m = re.match(r"^ create mode \d+ (.+)$", ln)
            if m:
                added.append(m[1])
        res.append(dict(h=h, an=an, ad=ad, subj=subj, claude=CLAUDE_MARK in body,
                        merge=len(parents.split()) > 1, stat=stat, added=added))
    return res


def ext(p):
    return os.path.splitext(p)[1].lower()


def refs_of(name):
    return ["HEAD", "origin/main"] if name == "project-docs" else ["HEAD"]


def made_here(repo):
    """이 기기 HEAD reflog 에 「만든」 기록이 있는 커밋(커밋·수정·병합·옮겨 심기)."""
    out = git(repo, "reflog", "show", "--format=%H %gs", "HEAD")
    return {ln[:40] for ln in out.splitlines()
            if re.match(r"^\S+ (commit|commit \(\w+\)|.*\(pick\)|cherry-pick|revert)\b", ln)}


def pi_commits(name, repo, me):
    if name == "project-docs":
        mine = made_here(repo)
        return [c for c in commits(repo, refs_of(name)) if c["h"] in mine]
    return commits(repo, refs_of(name), author=me)


def blame_remaining(repo, hashes):
    """지금 HEAD 의 코드 줄 중 hashes 커밋이 쓴 줄."""
    n = 0
    for f in git(repo, "ls-files").splitlines():
        if ext(f) not in CODE:
            continue
        cur = None
        for ln in git(repo, "blame", "--line-porcelain", "HEAD", "--", f).splitlines():
            if re.match(r"^[0-9a-f]{40} ", ln):
                cur = ln[:40]
            elif ln.startswith("\t") and cur in hashes:
                n += 1
    return n


# ── 실행 ──────────────────────────────────────────────────────────────
def main():
    me = git(P, "config", "user.name").strip()
    out = []
    w = out.append

    by, days, lines, msgs, no_split = tokens()
    dup = lines / msgs
    T = Counter()
    usd = usd_nocache = 0.0
    w("## 토큰·금액 (대화 기록 · 중복 제거)")
    w(f"- 기간 {days[0]} ~ {days[-1]} · 사용한 날 {len(days)}일 · 응답 {msgs:,}개(기록 줄 {lines:,} · 응답당 {dup:.2f}줄)")
    for mdl, t in sorted(by.items(), key=lambda kv: -sum(kv[1].values())):
        tot = t["in"] + t["out"] + t["cw5"] + t["cw1"] + t["cr"]
        if mdl not in PRICE:
            w(f"- {mdl}: 토큰 {tot:,} · 가격 없음(제외)"); continue
        c = cost(mdl, t)
        i = PRICE[mdl][0]
        nc = ((t["in"] + t["cw5"] + t["cw1"] + t["cr"]) * i + t["out"] * PRICE[mdl][1]) / 1e6
        usd += c; usd_nocache += nc; T.update(t)
        w(f"- {mdl}: 토큰 {tot:,}(입력 {t['in']:,} · 출력 {t['out']:,} · 캐시 쓰기 5분 {t['cw5']:,}/1시간 {t['cw1']:,} · 캐시 읽기 {t['cr']:,}) · ${c:,.0f}")
    total = T["in"] + T["out"] + T["cw5"] + T["cw1"] + T["cr"]
    w(f"- **합계 토큰 {total:,} · API 가격 환산 ${usd:,.0f}** · 캐시 읽기 비중 {T['cr'] / total:.1%} · 캐시 없었다면 ${usd_nocache:,.0f}(캐시로 {1 - usd / usd_nocache:.0%} 절감)")
    w(f"- 캐시 쓰기 나눔 정보 없음 {no_split:,} 토큰 → 5분 단가로 셈(하한)")
    f0, est_tok, est_usd = before_transcripts_estimate(dup, days[0])
    w(f"- 참고 추정 — 대화 기록이 지워진 {f0}~{days[0]} 전날(초기 폴더·다른 폴더 포함 · 누적 통계 ÷ {dup:.2f}): "
      f"토큰 약 {est_tok / 1e8:.1f}억 · 약 ${est_usd:,.0f}")

    w("\n## 저장소 (이 기기가 만든 커밋)")
    agg = Counter(); kinds = Counter(); files_new = Counter(); specs = plans = tests_now = 0
    for name, repo in REPOS:
        cs = pi_commits(name, repo, me)
        signed = {c["h"] for c in cs if c["claude"]}
        nm = [c for c in cs if not c["merge"] and c["claude"] and c["h"][:7] not in IMPORTED]
        add_code = sum(a for c in nm for a, d, p in c["stat"] if ext(p) in CODE)
        del_code = sum(d for c in nm for a, d, p in c["stat"] if ext(p) in CODE)
        add_doc = sum(a for c in nm for a, d, p in c["stat"] if ext(p) in DOC)
        new = Counter("코드" if ext(p) in CODE else "문서" if ext(p) in DOC else "그 밖" for c in nm for p in c["added"])
        for c in cs:
            m = re.match(r"^(\w+)", c["subj"]); kinds[m[1] if m else "?"] += 1
        specs += sum(1 for c in nm for p in c["added"] if p.startswith("docs/superpowers/specs/")) if name == "sop-project" else 0
        plans += sum(1 for c in nm for p in c["added"] if p.startswith("docs/superpowers/plans/")) if name == "sop-project" else 0
        rem = blame_remaining(repo, {c["h"] for c in nm})
        if name == "Rpi5":
            tests = {p for c in nm for p in c["added"] if re.match(r"^Demo/selftest/test_.*\.py$", p)}
            tests_now = sum(os.path.exists(os.path.join(repo, p)) for p in tests)
        first = min(c["ad"] for c in cs) if cs else "-"
        w(f"- {name}: 커밋 {len(cs):,}(Claude 표시 {len(signed):,} · 병합 {sum(c['merge'] for c in cs)}) · {first}~ · "
          f"코드 +{add_code:,}/−{del_code:,}줄 · 지금 남은 코드 {rem:,}줄 · 문서(.md) +{add_doc:,}줄 · 새 파일 {dict(new)}")
        agg.update(commits=len(cs), signed=len(signed), add_code=add_code, rem=rem, add_doc=add_doc)
        files_new.update(new)
    w(f"- **합계 커밋 {agg['commits']:,}(Claude 표시 {agg['signed']:,}) · 코드 누적 +{agg['add_code']:,}줄 · 지금 남은 코드 {agg['rem']:,}줄 · "
      f"문서 +{agg['add_doc']:,}줄 · 새 파일 {sum(files_new.values()):,}개 {dict(files_new)} · 설계서 {specs} · 계획서 {plans}**")
    w(f"- 커밋 종류(제목 머리) {kinds.most_common(8)}")

    w("\n## push (이 기기 reflog)")
    tp = 0
    for name, repo in REPOS:
        rl = git(repo, "reflog", "show", "--date=short", "refs/remotes/origin/main").splitlines()
        pushes = [l for l in rl if "update by push" in l]
        m = re.search(r"\{(\d{4}-\d\d-\d\d)", rl[-1]) if rl else None
        start = m[1] if m else "-"
        w(f"- {name}: {len(pushes)}회(기록 시작 {start})"); tp += len(pushes)
    w(f"- **합계 최소 {tp}회**")

    w("\n## 세션·지시 (history.jsonl · sop-project 폴더)")
    H = [json.loads(l) for l in open(os.path.join(HOME, ".claude/history.jsonl"), encoding="utf-8")]
    H = [x for x in H if x.get("project") == P]
    sess = {x.get("sessionId") for x in H}
    hd = sorted({datetime.fromtimestamp(x["timestamp"] / 1000).strftime("%Y-%m-%d") for x in H})
    slash = sum(1 for x in H if (x.get("display") or "").startswith("/"))
    logged = set()   # 데스크톱 슬라이드와 같은 정의 = 두 작업로그 블록 제목(## …)의 세션
    for f in ("docs/작업로그.md", "docs/claude-code-작업로그.md"):
        logged |= set(re.findall(r"^## .*?session ([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})",
                                 open(os.path.join(P, f), encoding="utf-8").read(), re.M))
    w(f"- 기간 {hd[0]} ~ {hd[-1]} · 사용한 날 {len(hd)}일 · 세션 {len(sess)} · 지시 {len(H):,}(슬래시 명령 {slash} 포함) · "
      f"작업로그 블록 제목의 세션 {len(logged)} 중 파이 {len(sess & logged)}")

    w("\n## 도구 (대화 기록 · 중복 제거)")
    seen, tc = set(), Counter()
    for f in transcripts():
        for line in open(f, encoding="utf-8", errors="ignore"):
            if '"tool_use"' not in line:
                continue
            try:
                d = json.loads(line)
            except ValueError:
                continue
            for x in (d.get("message") or {}).get("content") or []:
                if isinstance(x, dict) and x.get("type") == "tool_use" and x.get("id") not in seen:
                    seen.add(x.get("id")); tc[x.get("name")] += 1
    w(f"- 도구 호출 {sum(tc.values()):,} · Bash {tc['Bash']:,} · 서브에이전트 {tc['Agent'] + tc['Task']:,} · 스킬 {tc['Skill']:,}")

    w(f"- 자가 테스트 파일(이 기기 커밋이 만든 Rpi5 `Demo/selftest/test_*.py` 중 지금 있는 것) {tests_now}개")
    print("\n".join(out))


def verify():
    """검증 b — 데스크톱 슬라이드(2026-10-02 · 커밋 1,598 · 코드 약 6.3만 줄)를 모든 작성자로 재현한다."""
    until = "2026-10-02 14:32"
    tc = tl = 0
    for name, repo in REPOS:
        cs = commits(repo, ["origin/main"], until=until)
        tc += len(cs)
        tl += sum(a for c in cs if not c["merge"] and c["claude"] for a, d, p in c["stat"] if ext(p) in CODE)
        print(f"{name}: 커밋 {len(cs)}")
    print(f"모든 작성자 · {until} 까지: 커밋 {tc:,} · 코드 누적 +{tl:,}줄 (슬라이드 1,598 · 약 6.3만)")


if __name__ == "__main__":
    verify() if "--검증" in sys.argv else main()
