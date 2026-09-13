"""보존·색인 관문 — spec 2026-09-13-하네스-design.md §6.1·§6.2. 실행: python3 .claude/hooks/test_session_archive.py"""
import fcntl, json, os, sys, tempfile
sys.dont_write_bytecode = True
_tmp = tempfile.mkdtemp()
os.environ["HOME"] = _tmp
os.environ["SESSION_ARCHIVE_DIR"] = os.path.join(_tmp, "archive")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import session_archive as sa
_fails = []
def check(c, m):
    if not c: _fails.append(m)
PROJ = os.path.join(_tmp, "proj")
A, B, C, D, E = ("aaaaaaaa-0000-0000-0000-000000000001", "bbbbbbbb-0000-0000-0000-000000000002",
                 "cccccccc-0000-0000-0000-000000000003", "dddddddd-0000-0000-0000-000000000004",
                 "eeeeeeee-0000-0000-0000-000000000005")
F = "ffffffff-0000-0000-0000-000000000006"
def session(sid, turns, extra=(), sub="", ep="cli"):
    d = os.path.join(sa.sess_dir(PROJ), sub); os.makedirs(d, exist_ok=True)
    rows = []
    for i in range(turns):
        rows.append({"type": "user", "timestamp": "2026-09-13T01:00:0%dZ" % (i % 10), "entrypoint": ep, "message": {"content": "지시 %d" % i}})
        rows.append({"type": "assistant", "timestamp": "2026-09-13T01:00:0%dZ" % (i % 10), "message": {"content": [{"type": "text", "text": "응답 %d" % i}]}})
    rows += list(extra)
    open(os.path.join(d, sid + ".jsonl"), "w").write("\n".join(json.dumps(r, ensure_ascii=False) for r in rows))
def tool(name, inp):
    return {"type": "assistant", "timestamp": "2026-09-13T02:00:00Z", "message": {"content": [{"type": "tool_use", "name": name, "input": inp}]}}
T0 = 1_800_000_000
def test_1_parse():
    session(A, 3, [tool("Edit", {"file_path": "/x/a.py"}), tool("Bash", {"command": 'git commit -q -m "feat: 보존\n\n본문"'})])
    s = sa.parse_session(os.path.join(sa.sess_dir(PROJ), A + ".jsonl"))
    check(s and len(s["prompts"]) == 3, "사용자 발화 3건"); check(s and s["files"] == ["/x/a.py"], "편집 파일")
    check(s and s["commits"] == ["feat: 보존"], "커밋 제목")
def test_2_scope():
    session(B, 3); session(C, 2); session(D, 3); session(E, 3, sub=".trash"); session(F, 3, ep="sdk-cli")
    os.makedirs(os.path.join(PROJ, "docs"), exist_ok=True)
    open(os.path.join(PROJ, "docs", "작업로그.md"), "w").write("## 2026-09-13 · session %s (테스트)\n" % A)
    r = sa.run(PROJ, D, now=T0); arch = os.environ["SESSION_ARCHIVE_DIR"]
    check(r.startswith("scanned 2"), "대상 2건(A·B): " + r)
    idx = open(os.path.join(arch, "INDEX.tsv")).read()
    check("%s\t지시 0\t1\t1\t기재" % A in idx, "A 기재"); check(B in idx and "미기재" in idx, "B 미기재")
    for x in (C, D, E, F): check(x not in idx, "제외 실패: " + x[:8])
def test_3_recent_skip():
    check(sa.run(PROJ, D, now=T0 + 60) == "skipped-recent", "30분 안 재실행은 건너뛴다")
def test_4_lock_skip():
    lk = open(os.path.join(os.environ["SESSION_ARCHIVE_DIR"], ".lock"), "w"); fcntl.flock(lk, fcntl.LOCK_EX)
    check(sa.run(PROJ, D, now=T0 + 4000) == "skipped-lock", "잠금 중이면 건너뛴다"); lk.close()
def test_5_rewrite_newer():
    src = os.path.join(sa.sess_dir(PROJ), B + ".jsonl"); os.utime(src, (T0 + 9e8, T0 + 9e8))
    check("written 1" in sa.run(PROJ, D, now=T0 + 8000), "원본이 새로우면 다시 쓴다")
def test_6_unlogged():
    u = sa.unlogged(36500, now=T0 + 8000)
    check(len(u) == 1 and u[0].startswith("bbbbbbbb"), "미기재 목록 = B: %r" % u)
if __name__ == "__main__":
    for n, f in sorted(globals().items()):
        if n.startswith("test_"): f()
    print(("❌ 실패 %d건\n   - " % len(_fails) + "\n   - ".join(_fails)) if _fails else "✅ 보존·색인 관문 통과")
    sys.exit(1 if _fails else 0)
