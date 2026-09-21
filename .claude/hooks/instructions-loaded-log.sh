#!/usr/bin/env bash
# InstructionsLoaded 훅 — 어떤 규칙이 언제·왜 붙었는지 누적 기록한다.
#
# 왜 있나: paths: 스코프 규칙은 조용히 실패한다. 패턴이 안 맞으면 오류 없이
# 그냥 안 붙고, /context 에도 안 나온다(세션 시작 로드분만 나온다).
# 실적 = 규칙 7개 중 2개가 그렇게 죽어 있었다(정본편집·규칙배치).
#
# 이 훅은 아무것도 막지 못하고 stdout 은 모델에 안 보인다(공식 사양).
# 기록 전용이다. 읽는 법은 .claude/rules/cc인프라.md 참조.
set -uo pipefail

LOG_DIR="${RULE_LOAD_LOG_DIR:-$HOME/lab/rule-loads}"

payload=$(timeout 5 cat 2>/dev/null) || exit 0
[ -n "$payload" ] || exit 0

mkdir -p "$LOG_DIR" 2>/dev/null || exit 0

timeout 5 python3 -c '
import json, os, sys, datetime

log_dir = sys.argv[1]
try:
    d = json.loads(sys.stdin.read())
except Exception:
    sys.exit(0)

path = d.get("file_path") or ""
if not path:
    sys.exit(0)

# 저장소 안이면 상대 경로로 — 머신마다 절대 경로가 달라 집계가 갈린다
root = os.environ.get("CLAUDE_PROJECT_DIR", "")
if root and path.startswith(root + os.sep):
    path = path[len(root) + 1:]

row = "\t".join([
    datetime.datetime.now().isoformat(timespec="seconds"),
    (d.get("session_id") or "")[:8],
    d.get("load_reason") or "",
    path,
])

stamp = datetime.date.today().strftime("%Y-%m")
try:
    with open(os.path.join(log_dir, stamp + ".tsv"), "a", encoding="utf-8") as f:
        f.write(row + "\n")
except Exception:
    pass
' "$LOG_DIR" <<<"$payload" 2>/dev/null

exit 0
