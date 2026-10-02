#!/usr/bin/env python3
"""파이 Claude Code 활용 집계 — 발표용 수치를 원천에서 다시 뽑는다(파이에서만 돈다).

원천과 기준선
- 토큰·금액: ~/.claude/projects/-home-pi-sop-project 대화 기록(메인·서브에이전트·.trash).
  🔴 응답 하나가 내용 블록마다 한 줄씩(평균 약 2.3줄) 기록된다 → (message.id, requestId) 로 묶어 필드마다 최대값을 쓴다
     (output_tokens 만 앞 줄에 스트리밍 도중 값이 남는 경우가 있다 · 나머지 필드는 같다).
     ~/.claude/stats-cache.json(/stats 의 누적 통계)은 줄마다 더해 약 2.3배 부풀려져 있다 — 기록이 지워진 기간의 참고 추정에만 쓴다.
  🔴 대화 기록은 cleanupPeriodDays 가 지나면 지워진다 → `--csv` 로 일별·모델별 표를 남겨 둔다.
- 커밋·코드 줄·새 파일: 저장소 3개에서 이 파이가 만든 커밋만.
  · sop-project·Rpi5 = 작성자 이름이 이 파이 `git config user.name` (이전 이름 제외).
    이 파이 HEAD reflog 의 「만든」 커밋은 모두 작성자 이름 쪽에 들어 있다(reflog 가 남은 기간 대조).
  · project-docs = 데스크톱도 같은 이름을 써서 이름으로 못 가른다 → 이 파이 HEAD reflog 의 커밋만.
  · 초기 폴더(~/_archive/claude-project*) 에 있던 커밋은 뺀다(사용자 결정 — 지금 저장소 기준).
  · 옛 저장소에서 통째로 옮겨 온 커밋(IMPORTED)은 커밋 수에만 넣고 줄·파일 수에서 뺀다.
- push: 이 파이의 원격 추적 reflog 「update by push」(reflog 가 시작된 날부터 → 「최소」).
- 세션·지시: ~/.claude/history.jsonl 의 project = sop-project 폴더.
- 가격: claude-api 스킬 가격표(2026-09-25) · 100만 토큰당 달러 · 캐시 쓰기 1.25배(5분)·2배(1시간).

사용: python3 docs/claude-code-활용집계/집계.py [--기준 "YYYY-MM-DD HH:MM"] [--csv 경로] | --검증
"""
import csv, glob, json, os, re, subprocess, sys
from collections import Counter, defaultdict
from datetime import datetime

HOME = os.path.expanduser("~")
P = subprocess.run(["git", "rev-parse", "--show-toplevel"], capture_output=True, text=True,
                   cwd=os.path.dirname(os.path.abspath(__file__))).stdout.strip()
REPOS = [("sop-project", P), ("Rpi5", os.path.join(P, "Rpi5")), ("project-docs", os.path.join(HOME, "project-docs"))]
EARLY = [os.path.join(HOME, "_archive/claude-project"), os.path.join(HOME, "_archive/claude-project-old")]
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
KINDS = ("in", "out", "cw5", "cw1", "cr")


def git(repo, *a):
    # 🔴 quotePath 를 끄지 않으면 한글 경로가 "…py" 처럼 따옴표째 나와 확장자를 놓친다(코드 1.5만 줄 누락을 겪음)
    return subprocess.run(["git", "-c", "core.quotePath=false", "-C", repo, *a], capture_output=True, text=True).stdout


def local(ts):
    return datetime.fromisoformat(ts.replace("Z", "+00:00")).astimezone()


def cost(m, t):
    i, o, r = PRICE[m]
    return (t["in"] * i + t["out"] * o + t["cw5"] * i * 1.25 + t["cw1"] * i * 2 + t["cr"] * r) / 1e6


def opt(name):
    return sys.argv[sys.argv.index(name) + 1] if name in sys.argv else None


# ── 토큰 ──────────────────────────────────────────────────────────────
def transcripts():
    return (glob.glob(TX + "/*.jsonl") + glob.glob(TX + "/*/subagents/*.jsonl")
            + glob.glob(TX + "/.trash/**/*.jsonl", recursive=True))


def tokens(cut):
    """응답마다 (모델, 날짜, 입력, 출력, 캐시 쓰기 5분, 1시간, 캐시 읽기) — 같은 응답의 줄은 필드별 최대값."""
    best, lines, no_split = {}, 0, 0
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
            if d.get("type") != "assistant" or not u or local(d["timestamp"]) > cut:
                continue
            lines += 1
            cc = u.get("cache_creation")
            if not cc:
                no_split += 1                        # 나눔 정보가 없으면 싼 쪽(5분)으로 — 금액 하한
            v = [u.get("input_tokens", 0), u.get("output_tokens", 0),
                 (cc or {}).get("ephemeral_5m_input_tokens", 0) if cc else u.get("cache_creation_input_tokens", 0),
                 (cc or {}).get("ephemeral_1h_input_tokens", 0), u.get("cache_read_input_tokens", 0)]
            k = (m.get("id"), d.get("requestId"))
            if k in best:
                best[k][2:] = [max(a, b) for a, b in zip(best[k][2:], v)]
            else:
                best[k] = [m.get("model"), local(d["timestamp"]).strftime("%Y-%m-%d"), *v]
    return list(best.values()), lines, no_split


def before_transcripts_estimate(dup, first_day):
    """대화 기록이 지워진 기간(첫 사용 ~ 기록 시작 전날)의 참고 추정.
    누적 통계(중복 포함) 모델별 합 − 같은 통계의 일별 값(기록이 남은 기간) → 중복 배수로 나눈다.
    가정 = 그 기간에도 응답당 줄 수가 같았다 · 모델 안의 4종 비율은 그 모델 전체 비율 · 캐시 쓰기는 1시간 보관."""
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
    """이 파이 HEAD reflog 에 「만든」 기록이 있는 커밋(커밋·수정·병합·rebase 로 다시 쓴 커밋·cherry-pick·revert)."""
    mine = set()
    for ln in git(repo, "reflog", "show", "--format=%H %gs", "HEAD").splitlines():
        h, _, act = ln.partition(" ")
        if (re.match(r"^(commit( \([\w ]+\))?|.*\((pick|reword|squash|fixup|edit|continue)\)|cherry-pick|revert)(:|$)", act)
                or re.match(r"^(merge|pull)\b.*: Merge made", act)):
            mine.add(h)
    return mine


def early_commits():
    s = set()
    for r in EARLY:
        if os.path.isdir(os.path.join(r, ".git")):
            s |= set(git(r, "rev-list", "--all").split())
    return s


def pi_commits(name, repo, me, until, early):
    if name == "project-docs":
        mine = made_here(repo)
        cs = [c for c in commits(repo, refs_of(name), until=until) if c["h"] in mine]
    else:
        cs = commits(repo, refs_of(name), author=me, until=until)
    return [c for c in cs if c["h"] not in early]


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
    cut_s = opt("--기준") or datetime.now().strftime("%Y-%m-%d %H:%M")
    cut = datetime.strptime(cut_s, "%Y-%m-%d %H:%M").astimezone()
    me = git(P, "config", "user.name").strip()
    out = []
    w = out.append
    w(f"# 기준 시각 {cut_s} · HEAD " + " · ".join(f"{n} {git(r, 'rev-parse', '--short', 'HEAD').strip()}" for n, r in REPOS))

    rows, lines, no_split = tokens(cut)
    dup = lines / len(rows)
    by, day_model = defaultdict(Counter), defaultdict(Counter)
    for mdl, day, *v in rows:
        t = dict(zip(KINDS, v))
        by[mdl].update(t); by[mdl]["msg"] += 1
        day_model[(day, mdl)].update(t); day_model[(day, mdl)]["msg"] += 1
    days = sorted({d for d, _ in day_model})
    T = Counter()
    usd = usd_nocache = 0.0
    w("\n## 토큰·금액 (대화 기록 · 응답별 중복 제거)")
    w(f"- 기간 {days[0]} ~ {days[-1]} · 사용한 날 {len(days)}일 · 응답 {len(rows):,}개(기록 줄 {lines:,} · 응답당 {dup:.2f}줄)")
    for mdl, t in sorted(by.items(), key=lambda kv: -sum(kv[1][k] for k in KINDS)):
        tot = sum(t[k] for k in KINDS)
        if mdl not in PRICE:
            w(f"- {mdl}: 토큰 {tot:,} · 가격 없음(제외)"); continue
        c = cost(mdl, t)
        i, o, _ = PRICE[mdl]
        usd += c; usd_nocache += ((t["in"] + t["cw5"] + t["cw1"] + t["cr"]) * i + t["out"] * o) / 1e6
        T.update({k: t[k] for k in KINDS})
        w(f"- {mdl}: 토큰 {tot:,}(입력 {t['in']:,} · 출력 {t['out']:,} · 캐시 쓰기 5분 {t['cw5']:,}/1시간 {t['cw1']:,} · 캐시 읽기 {t['cr']:,}) · ${c:,.0f}")
    total = sum(T.values())
    w(f"- **합계 토큰 {total:,} · API 가격 환산 ${usd:,.0f}** · 캐시 읽기 비중 {T['cr'] / total:.1%} · 캐시 없었다면 ${usd_nocache:,.0f}(캐시로 {1 - usd / usd_nocache:.0%} 절감)")
    w(f"- 캐시 쓰기 나눔 정보가 없는 기록 줄 {no_split:,} → 5분 단가로 셈(하한)")
    f0, est_tok, est_usd = before_transcripts_estimate(dup, days[0])
    w(f"- 참고 추정 — 대화 기록이 지워진 {f0}~{days[0]} 전날(초기 폴더·다른 폴더 포함 · 누적 통계 ÷ {dup:.2f}): "
      f"토큰 약 {est_tok / 1e8:.1f}억 · 약 ${est_usd:,.0f}")
    csv_path = opt("--csv")
    if csv_path:
        with open(csv_path, "w", newline="", encoding="utf-8") as fh:
            cw = csv.writer(fh)
            cw.writerow(["날짜", "모델", "응답", "입력", "출력", "캐시쓰기_5분", "캐시쓰기_1시간", "캐시읽기"])
            for (day, mdl), t in sorted(day_model.items()):
                cw.writerow([day, mdl, t["msg"], *(t[k] for k in KINDS)])
        w(f"- 일별·모델별 표 → {csv_path}")

    w("\n## 저장소 (이 파이가 만든 커밋)")
    early = early_commits()
    agg = Counter(); kinds = Counter(); files_new = Counter(); files_now = 0
    specs = plans = tests_now = 0
    for name, repo in REPOS:
        cs = pi_commits(name, repo, me, cut_s, early)
        signed = {c["h"] for c in cs if c["claude"]}
        nm = [c for c in cs if not c["merge"] and c["claude"] and c["h"][:7] not in IMPORTED]
        add_code = sum(a for c in nm for a, _, p in c["stat"] if ext(p) in CODE)
        del_code = sum(d for c in nm for _, d, p in c["stat"] if ext(p) in CODE)
        add_doc = sum(a for c in nm for a, _, p in c["stat"] if ext(p) in DOC)
        new_paths = [p for c in nm for p in c["added"]]
        new = Counter("코드" if ext(p) in CODE else "문서" if ext(p) in DOC else "그 밖" for p in new_paths)
        still = sum(os.path.exists(os.path.join(repo, p)) for p in set(new_paths))
        for c in cs:
            m = re.match(r"^(\w+)", c["subj"]); kinds[m[1] if m else "?"] += 1
        if name == "sop-project":
            specs = sum(1 for p in new_paths if p.startswith("docs/superpowers/specs/"))
            plans = sum(1 for p in new_paths if p.startswith("docs/superpowers/plans/"))
        if name == "Rpi5":
            tests_now = sum(os.path.exists(os.path.join(repo, p)) for p in set(new_paths)
                            if re.match(r"^Demo/selftest/test_.*\.py$", p))
        rem = blame_remaining(repo, {c["h"] for c in nm})
        first = min(c["ad"] for c in cs) if cs else "-"
        w(f"- {name}: 커밋 {len(cs):,}(Claude 표시 {len(signed):,} · 병합 {sum(c['merge'] for c in cs)}) · {first}~ · "
          f"코드 +{add_code:,}/−{del_code:,}줄 · 지금 남은 코드 {rem:,}줄 · 문서(.md) +{add_doc:,}줄 · 새 파일 {dict(new)} · 그중 지금 있는 것 {still}")
        agg.update(commits=len(cs), signed=len(signed), add_code=add_code, rem=rem, add_doc=add_doc)
        files_new.update(new); files_now += still
    w(f"- **합계 커밋 {agg['commits']:,}(Claude 표시 {agg['signed']:,}) · 코드 누적 +{agg['add_code']:,}줄 · 지금 남은 코드 {agg['rem']:,}줄 · "
      f"문서 +{agg['add_doc']:,}줄 · 새 파일 {sum(files_new.values()):,}개 {dict(files_new)}(지금 있는 것 {files_now}) · 설계서 {specs} · 계획서 {plans}**")
    w(f"- 커밋 종류(제목 머리) {kinds.most_common(8)}")

    w("\n## push (이 파이 reflog · 기준 시각까지)")
    tp = 0
    for name, repo in REPOS:
        rl = git(repo, "reflog", "show", "--date=iso-strict", "refs/remotes/origin/main").splitlines()
        stamps = [(l, re.search(r"\{([^}]+)\}", l)) for l in rl]
        stamps = [(l, datetime.fromisoformat(m[1]).astimezone()) for l, m in stamps if m]
        pushes = [l for l, t in stamps if "update by push" in l and t <= cut]
        start = stamps[-1][1].strftime("%Y-%m-%d") if stamps else "-"
        w(f"- {name}: {len(pushes)}회(기록 시작 {start})"); tp += len(pushes)
    w(f"- **합계 최소 {tp}회**")

    w("\n## 세션·지시 (history.jsonl · sop-project 폴더 · 기준 시각까지)")
    H = [json.loads(l) for l in open(os.path.join(HOME, ".claude/history.jsonl"), encoding="utf-8")]
    H = [x for x in H if x.get("project") == P and datetime.fromtimestamp(x["timestamp"] / 1000).astimezone() <= cut]
    sess = {x.get("sessionId") for x in H}
    hd = sorted({datetime.fromtimestamp(x["timestamp"] / 1000).strftime("%Y-%m-%d") for x in H})
    slash = sum(1 for x in H if (x.get("display") or "").startswith("/"))
    logged = set()   # 데스크톱 슬라이드와 같은 정의 = 두 작업로그 블록 제목(## …)의 첫 세션
    for f in ("docs/작업로그.md", "docs/claude-code-작업로그.md"):
        logged |= set(re.findall(r"^## .*?session ([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})",
                                 open(os.path.join(P, f), encoding="utf-8").read(), re.M))
    w(f"- 기간 {hd[0]} ~ {hd[-1]} · 사용한 날 {len(hd)}일 · 세션 {len(sess)} · 지시 {len(H):,}(슬래시 명령 {slash} 포함) · "
      f"작업로그 블록 제목의 세션 {len(logged)} 중 파이 {len(sess & logged)}")

    w("\n## 도구 (대화 기록 · 중복 제거 · 기준 시각까지)")
    seen, tc = set(), Counter()
    for f in transcripts():
        for line in open(f, encoding="utf-8", errors="ignore"):
            if '"tool_use"' not in line:
                continue
            try:
                d = json.loads(line)
            except ValueError:
                continue
            if not d.get("timestamp") or local(d["timestamp"]) > cut:
                continue
            for x in (d.get("message") or {}).get("content") or []:
                if isinstance(x, dict) and x.get("type") == "tool_use" and x.get("id") not in seen:
                    seen.add(x.get("id")); tc[x.get("name")] += 1
    w(f"- 도구 호출 {sum(tc.values()):,} · Bash {tc['Bash']:,} · 서브에이전트 {tc['Agent'] + tc['Task']:,} · 스킬 {tc['Skill']:,}")
    w(f"- 자가 테스트 파일(이 파이 커밋이 만든 Rpi5 `Demo/selftest/test_*.py` 중 지금 있는 것) {tests_now}개")
    print("\n".join(out))


def verify():
    """검증 b — 데스크톱 슬라이드(2026-10-02 · 커밋 1,598 · 코드 약 6.3만 줄)를 모든 작성자로 재현한다."""
    until = "2026-10-02 14:32"
    tc = tl = 0
    for name, repo in REPOS:
        cs = commits(repo, ["origin/main"], until=until)
        tc += len(cs)
        tl += sum(a for c in cs if not c["merge"] and c["claude"] for a, _, p in c["stat"] if ext(p) in CODE)
        print(f"{name}: 커밋 {len(cs)}")
    print(f"모든 작성자 · {until} 까지: 커밋 {tc:,} · 코드 누적 +{tl:,}줄 (슬라이드 1,598 · 약 6.3만)")


if __name__ == "__main__":
    verify() if "--검증" in sys.argv else main()
