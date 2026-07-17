#!/usr/bin/env bash
# SessionStart 훅 — 세션 시작 표 배너(원격 동기화 + 이어하기 + session_id).
# 목적: 이전 세션의 ⏸중단·▶다음, 양 repo 동기화 상태, 현재 session_id를 하나의 표 배너로 띄우고
#       session_id를 모델 컨텍스트에 주입("세션 마무리" 기록·resume 식별용).
# ※ 시작 HEAD 기록은 2026-07-17 제거(짝이던 SessionEnd commit 훅 폐기 — 자세한 경위는 CC 작업로그).
# 앞서 도는 session-sync-check.sh 가 .startup-sync.tmp 에 남긴 동기화 행을 읽어 합친다.
# 표 정렬·JSON 인코딩은 _banner.py 가 담당. jq 비의존.
set -uo pipefail

PROJ="${CLAUDE_PROJECT_DIR:-$(pwd)}"
LOG="$PROJ/docs/작업로그.md"
SYNC_TMP="$PROJ/.claude/.startup-sync.tmp"
TAB=$'\t'

# 세션ID: env var 우선(이 머신 실재), 없으면 stdin JSON의 session_id fallback (jq 없이 grep).
SID="${CLAUDE_CODE_SESSION_ID:-}"
if [ -z "$SID" ]; then
  SID=$(cat 2>/dev/null \
        | grep -o '"session_id"[[:space:]]*:[[:space:]]*"[^"]*"' \
        | head -1 | sed 's/.*"\([^"]*\)"$/\1/')
fi

# 동기화 점검을 직접(순차) 호출 — Claude Code가 SessionStart 훅을 병렬 실행하므로
# 별도 훅으로 두면 tmp 핸드오프에 경쟁이 생긴다. 여기서 직접 부르면 순서 보장.
bash "$PROJ/.claude/hooks/session-sync-check.sh" 2>/dev/null || true

# 이어하기: 최신 사람 블록(첫 '## ' ~ 다음 '## ')에서 ⏸중단·▶다음만 추출. '(없음)' 제외.
open=""
if [ -f "$LOG" ]; then
  open=$(awk '/^## /{c++} c==1{print} c>=2{exit}' "$LOG" | grep -E '^-? *(⏸|▶)' | grep -vE '\(없음\)')
fi

# 표 데이터를 _banner.py 규약(T/R/N)으로 조립해 파이프
{
  printf 'T%s🚀 세션 시작 점검\n' "$TAB"

  # 동기화 행 (sync-check tmp: "🔄 label<TAB>state")
  if [ -s "$SYNC_TMP" ]; then
    while IFS= read -r ln; do
      [ -n "$ln" ] && printf 'R%s%s\n' "$TAB" "$ln"
    done < "$SYNC_TMP"
  fi

  # 이어하기 행 (콜론 기준 키/값 분리 — ASCII 안전)
  if [ -n "$open" ]; then
    printf '%s\n' "$open" | sed 's/^-\{0,1\} *//' | while IFS= read -r ln; do
      key=${ln%%:*}; val=${ln#*:}
      if [ "$val" = "$ln" ]; then val=""; fi   # 콜론 없음
      val=${val# }
      printf 'R%s%s%s%s\n' "$TAB" "$key" "$TAB" "$val"
    done
  else
    printf 'R%s📋 이어하기%s미완 작업 없음\n' "$TAB" "$TAB"
  fi

  # session_id 각주(전체폭)
  [ -n "$SID" ] && printf 'N%s🆔 %s\n' "$TAB" "$SID"
} | python3 "$PROJ/.claude/hooks/_banner.py"

# 임시파일 정리
rm -f "$SYNC_TMP" 2>/dev/null

exit 0
