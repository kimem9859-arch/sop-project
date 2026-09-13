#!/usr/bin/env python3
"""세션 보존·색인 — spec 2026-09-13-하네스-design.md §6.1·§6.2. 판단 없음. 실패해도 exit 0.
사용: session_archive.py <project_dir> <current_session_id> | session_archive.py --unlogged <days>"""
import fcntl, glob, json, os, re, sys, time
ARCHIVE = os.path.expanduser(os.environ.get("SESSION_ARCHIVE_DIR", "~/lab/session-archive"))
MIN_INTERVAL, STUB_MAX_UA = 1800, 5
LOGS = ("docs/작업로그.md", "docs/claude-code-작업로그.md")

def sess_dir(project_dir):
    return os.path.expanduser("~/.claude/projects/" + project_dir.replace("/", "-"))

def commit_subject(cmd):
    m = re.search(r'-m\s+"([^"\n]+)', cmd) or re.search(r"<<'?\w+'?\n([^\n]+)", cmd)
    return (m.group(1) if m else cmd.split("\n")[0])[:100]

def parse_session(path):
    s = {"id": os.path.basename(path)[:-6], "prompts": [], "files": [], "commits": [], "ts": [], "tail": "", "ua": 0}
    for line in open(path, errors="ignore"):
        try:
            e = json.loads(line)
        except ValueError:
            continue
        t = e.get("type")
        if t not in ("user", "assistant"):
            continue
        if e.get("entrypoint") == "sdk-cli":  # 헤드리스 호출(claude -p 등)은 작업 세션이 아니다
            return None
        s["ua"] += 1
        if e.get("timestamp"):
            s["ts"].append(e["timestamp"])
        c = (e.get("message") or {}).get("content")
        if t == "user" and isinstance(c, str) and not c.startswith("<") and not e.get("isMeta"):
            s["prompts"].append(c)
        for b in (c if t == "assistant" and isinstance(c, list) else []):
            if not isinstance(b, dict):
                continue
            if b.get("type") == "text" and b.get("text"):
                s["tail"] = b["text"][-300:]
            inp = b.get("input") or {}
            if b.get("type") == "tool_use" and b.get("name") in ("Edit", "Write", "NotebookEdit"):
                fp = inp.get("file_path") or inp.get("notebook_path")
                if fp and fp not in s["files"]:
                    s["files"].append(fp)
            if b.get("type") == "tool_use" and b.get("name") == "Bash" and "git commit" in inp.get("command", ""):
                s["commits"].append(commit_subject(inp["command"]))
    return None if s["ua"] <= STUB_MAX_UA else s

def render(s):
    out = ["# " + s["id"], "- 시작 %s · 끝 %s" % ((s["ts"] or ["?"])[0], (s["ts"] or ["?"])[-1]), "", "## 사용자 발화"]
    out += ["\n[%d] %s" % (i + 1, p) for i, p in enumerate(s["prompts"])]
    out += ["", "## 편집 파일"] + ["- " + f for f in s["files"]] + ["", "## 커밋"] + ["- " + c for c in s["commits"]]
    return "\n".join(out + ["", "## 마지막 응답 꼬리", s["tail"]]) + "\n"

def is_logged(sid, texts):
    return any(sid in t or re.search(r"\b%s\b" % sid[:8], t) for t in texts)

def _log(now, result):
    open(os.path.join(ARCHIVE, "scan.log"), "a").write("%s\t%s\n" % (time.strftime("%Y-%m-%dT%H:%M:%S", time.localtime(now)), result))
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
    if os.path.exists(stamp) and now - float(open(stamp).read() or 0) < MIN_INTERVAL:
        return _log(now, "skipped-recent")
    texts = [open(os.path.join(project_dir, p), errors="ignore").read() for p in LOGS if os.path.exists(os.path.join(project_dir, p))]
    rows, written = [], 0
    for path in sorted(glob.glob(os.path.join(sess_dir(project_dir), "*.jsonl"))):
        sid = os.path.basename(path)[:-6]
        try:  # 깨진 세션 파일 하나가 전체 스캔을 죽이지 않게
            s = None if sid == current_id else parse_session(path)
        except OSError:
            continue
        if not s:
            continue
        day = s["ts"][0][:10] if s["ts"] else "0000-00-00"
        dst = os.path.join(ARCHIVE, "%s_%s.md" % (day, sid[:8]))
        if not os.path.exists(dst) or os.path.getmtime(path) > os.path.getmtime(dst):
            open(dst, "w").write(render(s)); written += 1
        first = (s["prompts"][0] if s["prompts"] else "").replace("\t", " ").replace("\n", " ")[:60]
        rows.append("\t".join([day, sid, first, str(len(s["files"])), str(len(s["commits"])), "기재" if is_logged(sid, texts) else "미기재"]))
    open(os.path.join(ARCHIVE, "INDEX.tsv"), "w").write("시작일\t세션\t첫지시\t편집\t커밋\t기재\n" + "\n".join(rows) + "\n")
    open(stamp, "w").write(str(now))
    return _log(now, "scanned %d written %d" % (len(rows), written))

def unlogged(days, now=None):
    cutoff = time.strftime("%Y-%m-%d", time.localtime((now or time.time()) - days * 86400))
    p = os.path.join(ARCHIVE, "INDEX.tsv")
    rows = [l.split("\t") for l in open(p).read().splitlines()[1:] if l] if os.path.exists(p) else []
    return ["%s %s %s" % (r[1][:8], r[0], r[2]) for r in rows if r[5] == "미기재" and r[0] >= cutoff]

if __name__ == "__main__":
    try:
        print("\n".join(unlogged(int(sys.argv[2]))) if sys.argv[1] == "--unlogged" else run(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else ""))
    except Exception as ex:  # fail-open
        print("archive-error %s" % ex, file=sys.stderr)
    sys.exit(0)
