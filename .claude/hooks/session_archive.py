#!/usr/bin/env python3
"""세션 보존·색인 — spec 2026-09-13-하네스-design.md §6.1·§6.2 · spec 2026-09-14-작업마무리-이어받기 §5. 판단 없음. 실패해도 exit 0(흔적은 scan.log).
사용: session_archive.py <project_dir> <current_session_id> | session_archive.py --unlogged <days> | session_archive.py --pending <ID8>"""
import datetime, fcntl, glob, json, os, re, subprocess, sys, time
ARCHIVE = os.path.expanduser(os.environ.get("SESSION_ARCHIVE_DIR", "~/lab/session-archive"))
MIN_INTERVAL, STUB_MAX_UA, ACTIVE_SEC = 1800, 5, 3600
LOGS = ("docs/작업로그.md", "docs/claude-code-작업로그.md")
REPOS = (".", "Rpi5")
RECORD = ("docs(세션마무리)", "docs(작업로그)")  # 기록 행위 커밋 — 해시를 로그에 적지 않는 관행이라 대조에서 뺀다
_COMMIT = re.compile(r"^git\s+(?:-C\s+\S+\s+)?commit\b")
_HEREDOC = re.compile(r"<<-?\s*['\"]?(\w+)['\"]?")

def sess_dir(project_dir):
    return os.path.expanduser("~/.claude/projects/" + project_dir.replace("/", "-"))

def local_day(ts):
    try:
        return datetime.datetime.fromisoformat(ts.replace("Z", "+00:00")).astimezone().strftime("%Y-%m-%d")
    except ValueError:
        return ts[:10]

def local_time(ts):
    """세션 기록의 UTC 시각 → 현지 「YYYY-MM-DD HH:MM」. 날짜 착오(세션 시작일 ↔ 작업한 날)를 막으려고 현지로 적는다."""
    try:
        return datetime.datetime.fromisoformat(ts.replace("Z", "+00:00")).astimezone().strftime("%Y-%m-%d %H:%M")
    except (ValueError, AttributeError):
        return (ts or "?")[:16]

def commits_in(cmd):
    """셸 명령에서 실제 git commit 의 제목만 뽑는다. heredoc 본문·다른 명령의 인자 속 문자열은 무시."""
    lines = cmd.replace("\\\n", " ").split("\n")
    out, i = [], 0
    while i < len(lines):
        line = lines[i]; i += 1
        body_from, m = i, _HEREDOC.search(line)
        if m:
            i = next((j for j in range(i, len(lines)) if lines[j].strip() == m.group(1)), len(lines)) + 1
        for seg in re.split(r"&&|\|\||;", line):
            seg = seg.strip()
            if not _COMMIT.match(seg) or "--amend" in seg:  # 고쳐 쓰기는 새 커밋이 아니다(2026-09-14 실데이터 오탐)
                continue
            if m and ("-F" in seg or "$(cat" in seg):
                body = [l for l in lines[body_from:i - 1] if l.strip()]
                out.append((body[0].strip() if body else "")[:100])
            else:
                q = re.search(r'-m\s+"([^"\n]*)', seg) or re.search(r"-m\s+'([^'\n]*)", seg)
                out.append((q.group(1) if q else seg)[:100])
    return out

def user_text(c):
    """사람이 친 발화만. 리스트 형태(첨부)는 text 블록을 잇고, 도구 결과·시스템 주입·중단 표시는 뺀다."""
    if isinstance(c, str):
        parts = [c]
    elif isinstance(c, list) and not any(isinstance(b, dict) and b.get("type") == "tool_result" for b in c):
        parts = [b.get("text") or "" for b in c if isinstance(b, dict) and b.get("type") == "text"]
    else:
        return ""
    return "\n".join(p for p in parts if p and not p.startswith(("<", "[Request interrupted")))

def parse_session(path):
    s = {"id": os.path.basename(path)[:-6], "prompts": [], "files": [], "commits": [], "ts": [], "tail": "", "ua": 0}
    for line in open(path, errors="ignore"):
        try:
            e = json.loads(line)
        except ValueError:
            continue
        if not isinstance(e, dict) or e.get("type") not in ("user", "assistant"):
            continue
        if e.get("entrypoint") == "sdk-cli":  # 헤드리스 호출(claude -p 등)은 작업 세션이 아니다
            return None
        s["ua"] += 1
        if e.get("timestamp"):
            s["ts"].append(e["timestamp"])
        msg = e.get("message")
        c = msg.get("content") if isinstance(msg, dict) else None
        if e["type"] == "user" and not e.get("isMeta") and not e.get("isCompactSummary"):
            p = user_text(c)
            if p:
                s["prompts"].append(p)
        for b in (c if e["type"] == "assistant" and isinstance(c, list) else []):
            if not isinstance(b, dict):
                continue
            if b.get("type") == "text" and b.get("text"):
                s["tail"] = b["text"][-300:]
            inp = b.get("input") if isinstance(b.get("input"), dict) else {}
            if b.get("type") == "tool_use" and b.get("name") in ("Edit", "Write", "NotebookEdit"):
                fp = inp.get("file_path") or inp.get("notebook_path")
                if fp and fp not in s["files"]:
                    s["files"].append(fp)
            if b.get("type") == "tool_use" and b.get("name") == "Bash":
                s["commits"] += commits_in(inp.get("command") or "")
    return None if s["ua"] <= STUB_MAX_UA else s

def render(s):
    first, last = (local_time(s["ts"][0]), local_time(s["ts"][-1])) if s["ts"] else ("?", "?")
    out = ["# " + s["id"], "- 시작 %s · 끝 %s (현지)" % (first, last), "", "## 사용자 발화"]
    out += ["\n[%d] %s" % (i + 1, p) for i, p in enumerate(s["prompts"])]
    out += ["", "## 편집 파일"] + ["- " + f for f in s["files"]] + ["", "## 커밋"] + ["- " + c for c in s["commits"]]
    return "\n".join(out + ["", "## 마지막 응답 꼬리", s["tail"]]) + "\n"

def is_logged(sid, texts):
    return any(sid in t for t in texts)  # 전체 UUID 만 — 짧은 ID 는 배너가 주입한 목록이 로그에 섞이면 거짓 기재가 된다

def repo_commits(project_dir):
    """두 저장소 최근 90일 커밋 — {제목[:100]: [(해시, 현지 시각), …]}. 저장소가 없거나 git 이 실패하면 건너뛴다."""
    out = {}
    for r in REPOS:
        try:
            p = subprocess.run(["git", "-C", os.path.join(project_dir, r), "log", "--since=90.days",
                                "--format=%H%x09%ad%x09%s", "--date=format:%Y-%m-%d %H:%M"],
                               capture_output=True, text=True, timeout=10)
        except Exception:
            continue
        for line in p.stdout.splitlines():
            parts = line.split("\t", 2)
            if len(parts) == 3:
                out.setdefault(parts[2][:100], []).append((parts[0], parts[1]))
    return out

def pending_commits(s, commits, texts):
    """세션 커밋 중 작업로그에 해시(7자리)가 없는 것 → (miss[(해시7, 시각, 제목)], unresolved[제목]).
    판정에는 miss 만 쓴다. 제목으로 해시를 못 찾은 것(unresolved)은 실데이터에서 전부 실패한 커밋 시도·고쳐 쓰기·
    다른 저장소였다(2026-09-14 W1) — 보여 주기만 한다."""
    miss, unresolved = [], []
    for title in dict.fromkeys(s["commits"]):
        if title.startswith(RECORD):
            continue
        found = commits.get(title)
        if not found:
            unresolved.append(title)
        elif not any(h[:7] in t for h, _ in found for t in texts):
            miss.append((found[0][0][:7], found[0][1], title))
    return miss, unresolved

def _texts(project_dir):
    return [open(os.path.join(project_dir, p), errors="ignore").read() for p in LOGS if os.path.exists(os.path.join(project_dir, p))]

def _write(path, text):
    tmp = path + ".tmp"
    with open(tmp, "w") as f:
        f.write(text)
    os.replace(tmp, path)

def _log(now, result):
    with open(os.path.join(ARCHIVE, "scan.log"), "a") as f:
        f.write("%s\t%s\n" % (time.strftime("%Y-%m-%dT%H:%M:%S", time.localtime(now)), result))
    return result

def run(project_dir, current_id, now=None):
    now = now or time.time()
    os.makedirs(ARCHIVE, exist_ok=True)
    lock = open(os.path.join(ARCHIVE, ".lock"), "w")
    try:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError:
        return _log(now, "skipped-lock")
    stamp = os.path.join(ARCHIVE, ".last-scan")
    try:
        last = float(open(stamp).read())
    except (OSError, ValueError):
        last = 0.0
    if now - last < MIN_INTERVAL:
        return _log(now, "skipped-recent")
    texts = _texts(project_dir)
    rows, written, errors = [], 0, 0
    paths = sorted(glob.glob(os.path.join(sess_dir(project_dir), "*.jsonl")))
    if not paths:  # 세션이 하나도 없으면 잘못 불린 것이다 — 멀쩡한 색인·스캔 시각을 덮어쓰지 않는다
        return _log(now, "skipped-no-sessions")
    commits = repo_commits(project_dir)  # 스캔 한 번에 한 번만
    for path in paths:
        sid = os.path.basename(path)[:-6]
        if sid == current_id:
            continue
        try:  # 세션 하나가 전체 스캔을 죽이지 않게 — 대신 흔적을 남긴다
            s = parse_session(path)
            if not s:
                continue
            day = local_day(s["ts"][0]) if s["ts"] else "0000-00-00"
            dst = os.path.join(ARCHIVE, "%s_%s.md" % (day, sid[:8]))
            if not os.path.exists(dst) or os.path.getmtime(path) > os.path.getmtime(dst):
                _write(dst, render(s)); written += 1
            if now - os.path.getmtime(path) < ACTIVE_SEC:
                state = "진행중"  # 병행 세션이 아직 작업 중일 수 있다 — 이어하기가 사용자에게 한 번 묻는다
            elif not is_logged(sid, texts):
                state = "미기재"
            elif pending_commits(s, commits, texts)[0]:
                state = "부분기재"  # 마무리 뒤에 한 일(작업로그에 없는 커밋)이 남았다
            else:
                state = "기재"
            first = (s["prompts"][0] if s["prompts"] else "").replace("\t", " ").replace("\n", " ")[:60]
            last_act = local_time(s["ts"][-1]) if s["ts"] else "?"
            rows.append("\t".join([day, sid, first, str(len(s["files"])), str(len(s["commits"])), state, last_act]))
        except Exception as ex:
            errors += 1
            _log(now, "error %s %s" % (sid[:8], type(ex).__name__))
    _write(os.path.join(ARCHIVE, "INDEX.tsv"), "시작일\t세션\t첫지시\t편집\t커밋\t기재\t마지막활동\n" + "\n".join(rows) + "\n")
    _write(stamp, str(now))
    return _log(now, "scanned %d written %d errors %d" % (len(rows), written, errors))

def unlogged(days, now=None):
    """기록 안 끝난 세션 — 미기재 + 부분기재."""
    cutoff = time.strftime("%Y-%m-%d", time.localtime((now or time.time()) - days * 86400))
    p = os.path.join(ARCHIVE, "INDEX.tsv")
    rows = [l.split("\t") for l in open(p).read().splitlines()[1:] if l] if os.path.exists(p) else []
    return ["%s %s %s%s" % (r[1][:8], r[0], r[2], " · 부분기재" if r[5] == "부분기재" else "")
            for r in rows if len(r) >= 6 and r[5] in ("미기재", "부분기재") and r[0] >= cutoff]

def pending(project_dir, id8, now=None):
    """이어받기용 — 한 세션의 멈춘 지점: 마지막 활동과 경과 · 작업로그에 없는 커밋 · 편집한 계획서 체크 · 마지막 발화 3개 · 응답 꼬리."""
    now = now or time.time()
    paths = sorted(glob.glob(os.path.join(sess_dir(project_dir), id8 + "*.jsonl")))
    if not paths:
        return "세션 %s — 원본 없음" % id8
    s = parse_session(paths[0])
    if not s:
        return "세션 %s — 껍데기·헤드리스라 이어받을 작업 없음" % id8
    out = []
    if s["ts"]:
        last = datetime.datetime.fromisoformat(s["ts"][-1].replace("Z", "+00:00")).astimezone()
        cur = datetime.datetime.fromtimestamp(now).astimezone()
        mins = max(0, int((cur - last).total_seconds() // 60))
        ago = "%d분" % mins if mins < 120 else ("%d시간" % (mins // 60) if mins < 2880 else "%d일" % (mins // 1440))
        days = (cur.date() - last.date()).days
        when = "오늘" if days == 0 else ("어제" if days == 1 else "%d일 전" % days)
        out.append("마지막 활동 %s (%s 전 · %s) · 지금 %s" % (last.strftime("%Y-%m-%d %H:%M"), ago, when, cur.strftime("%Y-%m-%d %H:%M")))
    miss, unresolved = pending_commits(s, repo_commits(project_dir), _texts(project_dir))
    out.append("## 작업로그에 없는 커밋 %d건" % len(miss))
    out += ["- %s %s %s" % (h, t, title) for h, t, title in miss]
    if unresolved:
        out.append("## 해시 못 찾은 커밋 명령 %d건 — 실패한 시도·고쳐 쓰기·다른 저장소일 수 있음(판정 제외)" % len(unresolved))
        out += ["- " + t for t in unresolved]
    plans = [f for f in s["files"] if "/docs/superpowers/plans/" in f and f.endswith(".md")]
    out.append("## 편집한 계획서 %d개" % len(plans))
    for f in plans:
        try:
            body = open(f, errors="ignore").read().splitlines()
        except OSError:
            out.append("- %s (파일 없음)" % f)
            continue
        done = sum(1 for l in body if re.match(r"^\s*- \[[xX]\]", l))
        todo = [l.strip() for l in body if re.match(r"^\s*- \[ \]", l)]
        name = os.path.relpath(f, project_dir) if f.startswith(project_dir) else f
        out.append("- %s — 체크 %d/%d%s" % (name, done, done + len(todo), (" · 첫 미체크: " + todo[0][:120]) if todo else ""))
    out.append("## 마지막 발화")
    out += ["- " + p.replace("\n", " ")[:200] for p in s["prompts"][-3:]]
    out += ["## 응답 꼬리", s["tail"]]
    return "\n".join(out)

USAGE = "사용: session_archive.py <project_dir> <current_session_id> | session_archive.py --unlogged <days> | session_archive.py --pending <ID8>"

if __name__ == "__main__":
    try:
        a = sys.argv[1:]
        if a and a[0] == "--unlogged" and len(a) > 1:
            print("\n".join(unlogged(int(a[1]))))
        elif a and a[0] == "--pending" and len(a) > 1:
            print(pending(os.environ.get("CLAUDE_PROJECT_DIR") or os.getcwd(), a[1]))
        elif a and not a[0].startswith("-") and os.path.isdir(a[0]) and os.path.isdir(sess_dir(os.path.abspath(a[0]))):
            print(run(os.path.abspath(a[0]), a[1] if len(a) > 1 else ""))
        else:  # 도움말·잘못된 인자는 스캔하지 않는다(2026-09-13 --help 가 색인을 비운 사고)
            print(USAGE)
    except Exception as ex:  # fail-open — 그래도 흔적은 남긴다
        print("archive-error %s" % ex, file=sys.stderr)
        try:
            _log(time.time(), "error main %s" % type(ex).__name__)
        except Exception:
            pass
    sys.exit(0)
