#!/usr/bin/env bash
# SessionStart 훅 — 작업로그 이어하기 브리핑 + 세션ID 주입 + 시작 HEAD 기록 (2026-07-01 도입).
# 목적: 이전 세션에서 ⏸중단·▶다음으로 남은 작업을 세션 시작 시 브리핑하고,
#       현재 session_id를 모델 컨텍스트에 주입해 "세션 마무리" 기록·resume 대상 식별을 돕는다.
#       또 커밋 매핑용으로 시작 HEAD를 기록(짝: session-worklog-commit.sh).
# 출력(stdout)은 SessionStart 훅 규약상 모델 컨텍스트에 주입된다. 경고만·차단 없음. jq 비의존.
set -uo pipefail

PROJ="${CLAUDE_PROJECT_DIR:-$(pwd)}"
LOG="$PROJ/docs/작업로그.md"

# 세션ID: env var 우선(이 머신 실재), 없으면 stdin JSON의 session_id fallback (jq 없이 grep).
SID="${CLAUDE_CODE_SESSION_ID:-}"
if [ -z "$SID" ]; then
  SID=$(cat 2>/dev/null \
        | grep -o '"session_id"[[:space:]]*:[[:space:]]*"[^"]*"' \
        | head -1 | sed 's/.*"\([^"]*\)"$/\1/')
fi

echo "[작업로그 — 이어하기 브리핑]"
if [ -f "$LOG" ]; then
  # 최신 사람 블록(첫 '## ' ~ 다음 '## ')에서 ⏸중단·▶다음만 추출. '(없음)'은 제외.
  open=$(awk '/^## /{c++} c==1{print} c>=2{exit}' "$LOG" | grep -E '^-? *(⏸|▶)' | grep -vE '\(없음\)')
  if [ -n "$open" ]; then
    echo "  이전 세션에서 이어갈 작업:"
    printf '%s\n' "$open" | sed 's/^-\{0,1\} */    /'
  else
    echo "  이어할 미완 작업 없음 (최신 블록 기준)."
  fi
else
  echo "  작업로그 파일 없음 — 첫 기록은 '세션 마무리' 시 생성."
fi
[ -n "$SID" ] && echo "  현재 session_id: $SID  (작업 기록·resume 식별용)"

# 커밋 매핑용 시작 HEAD 기록 (SessionEnd가 diff). 실패해도 무해.
if [ -n "$SID" ] && [ -d "$PROJ/.git" ]; then
  head=$(git -C "$PROJ" rev-parse HEAD 2>/dev/null)
  [ -n "$head" ] && printf '%s' "$head" > "$PROJ/.claude/.worklog-head-$SID" 2>/dev/null
fi
exit 0
