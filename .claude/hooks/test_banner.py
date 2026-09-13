"""배너 관문 V2 — spec 2026-09-13-배너-현황요약 §3. 실행: python3 .claude/hooks/test_banner.py"""
import json, os, subprocess, sys, tempfile
HERE = os.path.dirname(os.path.abspath(__file__))
TABLE = "### 일정 (멘토)\n| 마감 | 날짜 |\n| --- | --- |\n| 멘토 초안 제출 | **2026-08-28** |\n| 1차 접수 | **2026-09-08** (몰림 대비) |\n| 2차 평가 | 2026-10-24~25 |\n\n## 2. 다른 절\n| 무관 | 2026-09-20 |\n"
def run(inp):
    env = dict(os.environ, BANNER_TODAY="2026-09-13")
    out = subprocess.run([sys.executable, os.path.join(HERE, "_banner.py")], input=inp, capture_output=True, text=True, env=env).stdout
    j = json.loads(out); return j["systemMessage"], j["hookSpecificOutput"]["additionalContext"]
fails = []
def eq(name, got, want):
    if got != want: fails.append("%s\n  기대: %r\n  실제: %r" % (name, want, got))
with tempfile.NamedTemporaryFile("w", suffix=".md", delete=False, encoding="utf-8") as f:
    f.write(TABLE); tbl = f.name
P = "R\t📌 대기 항목 출처\t작업로그 최신 블록 2026-09-13 — 낡았을 수 있다\n"
full = ("T\t🚀 세션 시작 점검\nH\t%s\nR\t🔄 sop-project\tbehind 2 ahead 1 로컬변경 \nR\t🔄 Rpi5\t로컬변경 \n" % tbl + P +
        "R\t⏸ 🔴 **인터락 결선 미복구** — 09-05 실패\t\nR\t⏸ ⚠️ gpio 결함\t\nR\t⏸ 🔴 디스크 부족 — 93%\t\n"
        "R\t▶ 다음\t①인터락 NO 개정 실행 ②정본 반영\nR\t📭 미기재 세션(7일)\t3개\nR\t  ·\tabc 09-10 첫 지시\nN\t🆔 sid-123\n")
msg, ctx = run(full)
eq("C1 전체", msg, "🚀 SOP 가디언 · 2차 평가 D-41 (10-24)\n📅 09-13 기록 · ⏸ 대기 3 · 🔴 인터락 결선 미복구 외 1\n▶ 다음 인터락 NO 개정 실행\n⚠️ sop-project behind 2 · Rpi5 로컬변경 · 미기재 세션 3")
fails += ["C1 입력 누락 %s" % s for s in ("sop-project", "gpio 결함", "②정본 반영", "abc 09-10", "sid-123") if s not in ctx]
fails += ["C1 정렬 표 잔존"] if ("┌" in ctx or "│" in ctx) else []
clean = ("T\t🚀 세션 시작 점검\nH\t/없는/경로.md\nR\t🔄 sop-project\tahead 3 로컬변경 \nR\t🔄 Rpi5\t동기화됨\n" + P + "R\t⏸ ⚠️ gpio 결함\t\n")
msg2, _ = run(clean)
eq("C2 이상 없음·마감표 없음·▶ 없음", msg2, "🚀 SOP 가디언\n📅 09-13 기록 · ⏸ 대기 1")
msg3, _ = run("T\tx\n" + P + "R\t⏸ 🔴 가나다라마바사아자차카타파하가나다라마바사아자차카타파하가나다 — 뒤\t\n")
eq("C3 30자 자르기", msg3.split("\n")[1], "📅 09-13 기록 · ⏸ 대기 1 · 🔴 가나다라마바사아자차카타파하가나다라마바사아자차카타파하가나…")
for name, m in (("C1", msg), ("C2", msg2), ("C3", msg3)):
    if m.count("\n") > 3: fails.append(name + " 4줄 초과")
    if "  " in m: fails.append(name + " 연속 공백")
os.unlink(tbl)
print("❌ " + "\n❌ ".join(fails) if fails else "✅ 배너 관문 V2 통과"); sys.exit(1 if fails else 0)
