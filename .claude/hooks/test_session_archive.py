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
A, B, C, D, E, F, G = ["%s-0000-0000-0000-00000000000%d" % (ch * 8, i) for i, ch in enumerate("abcdefg", 1)]
def rows_for(turns, ep="cli"):
    rows = []
    for i in range(turns):
        rows.append({"type": "user", "timestamp": "2026-09-13T01:00:0%dZ" % (i % 10), "entrypoint": ep, "message": {"content": "지시 %d" % i}})
        rows.append({"type": "assistant", "timestamp": "2026-09-13T01:00:0%dZ" % (i % 10), "message": {"content": [{"type": "text", "text": "응답 %d" % i}]}})
    return rows
def session(sid, turns, extra=(), sub="", ep="cli"):
    d = os.path.join(sa.sess_dir(PROJ), sub); os.makedirs(d, exist_ok=True)
    p = os.path.join(d, sid + ".jsonl")
    open(p, "w").write("\n".join(json.dumps(r, ensure_ascii=False) for r in rows_for(turns, ep) + list(extra)))
    return p
def tool(name, inp):
    return {"type": "assistant", "timestamp": "2026-09-13T02:00:00Z", "message": {"content": [{"type": "tool_use", "name": name, "input": inp}]}}
T0 = 1_800_000_000
def test_1_parse():
    session(A, 3, [tool("Edit", {"file_path": "/x/a.py"}), tool("Bash", {"command": 'git commit -q -m "feat: 보존\n\n본문"'})])
    s = sa.parse_session(os.path.join(sa.sess_dir(PROJ), A + ".jsonl"))
    check(s and len(s["prompts"]) == 3, "사용자 발화 3건"); check(s and s["files"] == ["/x/a.py"], "편집 파일")
    check(s and s["commits"] == ["feat: 보존"], "커밋 제목: %r" % (s and s["commits"]))
def test_1b_commit_forms():
    cases = [
        ("git commit -m \"$(cat <<'EOF'\n제목A\n\n본문\nEOF\n)\"", ["제목A"]),
        ("git add x && \\\ngit commit -q -F - <<'MSG'\n제목B\nMSG", ["제목B"]),
        ("cd /x && git -C Rpi5 commit -m \"제목C\"", ["제목C"]),
        ("grep -n 'git commit -m' plan.md", []),
        ("cat > f.md <<'EOF'\ngit commit -m \"가짜\"\nEOF", []),
    ]
    for cmd, want in cases:
        got = sa.commits_in(cmd); check(got == want, "커밋 형태 %r → %r (기대 %r)" % (cmd[:30], got, want))
def test_1c_prompt_shapes():
    p = os.path.join(_tmp, "shapes.jsonl")
    rows = rows_for(3) + [
        {"type": "user", "message": {"content": [{"type": "text", "text": "첨부 확인해줘"}, {"type": "image", "source": {}}]}},
        {"type": "user", "message": {"content": [{"type": "tool_result", "content": "출력"}]}},
        {"type": "user", "isCompactSummary": True, "message": {"content": "This session is being continued"}},
        {"type": "user", "message": {"content": "[Request interrupted by user]"}},
    ]
    open(p, "w").write("\n".join(json.dumps(r, ensure_ascii=False) for r in rows))
    s = sa.parse_session(p)
    check(s and s["prompts"] == ["지시 0", "지시 1", "지시 2", "첨부 확인해줘"], "발화 형태 필터: %r" % (s and s["prompts"]))
def test_1d_bad_lines():
    p = os.path.join(_tmp, "bad.jsonl")
    open(p, "w").write("[1,2]\n\"문자열\"\n" + "\n".join(json.dumps(r) for r in rows_for(3) + [tool("Bash", {"command": None})]))
    try:
        s = sa.parse_session(p); check(s and s["ua"] == 7, "비정상 줄 뒤에도 파싱")
    except Exception as ex:
        check(False, "비정상 줄에서 예외 %s" % type(ex).__name__)
def test_2_scope():
    session(B, 3); session(C, 2); session(D, 3); session(E, 3, sub=".trash"); session(F, 3, ep="sdk-cli")
    os.makedirs(os.path.join(PROJ, "docs"), exist_ok=True)
    open(os.path.join(PROJ, "docs", "작업로그.md"), "w").write("## 2026-09-13 · session %s (테스트)\n미기재 %s 남음\n" % (A, B[:8]))
    r = sa.run(PROJ, D, now=T0); arch = os.environ["SESSION_ARCHIVE_DIR"]
    check(r.startswith("scanned 2") and r.endswith("errors 0"), "대상 2건(A·B): " + r)
    idx = open(os.path.join(arch, "INDEX.tsv")).read()
    check("%s\t지시 0\t1\t1\t기재" % A in idx, "A 기재"); check("%s\t지시 0\t0\t0\t미기재" % B in idx, "B 는 짧은 ID 언급만으로 기재가 되지 않는다")
    for x in (C, D, E, F): check(x not in idx, "제외 실패: " + x[:8])
def test_3_recent_skip():
    check(sa.run(PROJ, D, now=T0 + 60) == "skipped-recent", "30분 안 재실행은 건너뛴다")
def test_4_lock_skip():
    lk = open(os.path.join(os.environ["SESSION_ARCHIVE_DIR"], ".lock"), "w"); fcntl.flock(lk, fcntl.LOCK_EX)
    check(sa.run(PROJ, D, now=T0 + 4000) == "skipped-lock", "잠금 중이면 건너뛴다"); lk.close()
def test_5_rewrite_newer():
    src = os.path.join(sa.sess_dir(PROJ), B + ".jsonl"); os.utime(src, (T0 - 7200, T0 - 7200))
    check("written 1" in sa.run(PROJ, D, now=T0 + 8000), "원본이 새로우면 다시 쓴다")
def test_6_unlogged():
    u = sa.unlogged(36500, now=T0 + 8000)
    check(len(u) == 1 and u[0].startswith("bbbbbbbb"), "미기재 목록 = B: %r" % u)
def test_7_corrupt_stamp():
    open(os.path.join(os.environ["SESSION_ARCHIVE_DIR"], ".last-scan"), "w").write("깨짐")
    check(sa.run(PROJ, D, now=T0 + 20000).startswith("scanned"), "깨진 .last-scan 은 0 으로 본다")
def test_8_active_session():
    p = session(G, 3); os.utime(p, (T0 + 40000 - 60, T0 + 40000 - 60))
    sa.run(PROJ, D, now=T0 + 40000)
    idx = open(os.path.join(os.environ["SESSION_ARCHIVE_DIR"], "INDEX.tsv")).read()
    check("%s\t지시 0\t0\t0\t진행중" % G in idx, "60분 안에 바뀐 세션은 진행중")
    check(not any(x.startswith("gggggggg") for x in sa.unlogged(36500, now=T0 + 40000)), "진행중은 미기재 목록에서 빠진다")
if __name__ == "__main__":
    for n, f in sorted(globals().items()):
        if n.startswith("test_"): f()
    print(("❌ 실패 %d건\n   - " % len(_fails) + "\n   - ".join(_fails)) if _fails else "✅ 보존·색인 관문 통과")
    sys.exit(1 if _fails else 0)
