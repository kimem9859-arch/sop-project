"""배너 관문 — spec §6.3. 실행: python3 .claude/hooks/test_banner.py"""
import json, os, subprocess, sys
inp = "T\t🚀 세션 시작 점검\nR\t🔄 sop-project\t동기화됨\nR\t⏸ 🔴 인터락\t미복구\nN\t🆔 abc-123\n"
out = subprocess.run([sys.executable, os.path.join(os.path.dirname(os.path.abspath(__file__)), "_banner.py")], input=inp, capture_output=True, text=True).stdout
j = json.loads(out); ctx = j["hookSpecificOutput"]["additionalContext"]; msg = j["systemMessage"]
fails = [f"누락 {s}" for s in ("sop-project", "동기화됨", "인터락", "미복구", "abc-123") if s not in ctx]
fails += ["정렬 표 잔존"] if ("┌" in ctx or "│" in ctx) else []
fails += ["사람 화면이 한 줄 아님"] if "\n" in msg else []
print("❌ " + "; ".join(fails) if fails else "✅ 배너 관문 통과"); sys.exit(1 if fails else 0)
