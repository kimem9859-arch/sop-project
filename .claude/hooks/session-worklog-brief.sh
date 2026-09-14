#!/usr/bin/env bash
# SessionStart 훅 — 세션 시작 배너(원격 동기화 + 이어하기 + 기록 안 끝난 세션(미기재·부분기재) + session_id).
# 목적: 이전 세션의 ⏸중단·▶다음, 양 repo 동기화 상태, 현재 session_id를 하나의 배너로 띄우고
#       session_id를 모델 컨텍스트에 주입("세션 마무리" 기록·resume 식별용).
# ※ 시작 HEAD 기록은 2026-07-17 제거(짝이던 SessionEnd commit 훅 폐기 — 자세한 경위는 CC 작업로그).
# 내부에서 순차 호출하는 session-sync-check.sh 가 실행마다 만든 임시파일에(동시 실행 경합 방지 — spec 2026-09-13-배너-현황요약 §3.4) 남긴 동기화 행을 읽어 합친다.
# 줄 조립·JSON 인코딩은 _banner.py 가 담당(화면 = 현황 요약 · 전체 행 = Claude 컨텍스트). jq 비의존.
set -uo pipefail

PROJ="${CLAUDE_PROJECT_DIR:-$(pwd)}"
LOG="$PROJ/docs/작업로그.md"
# 실행마다 개인 임시파일 — 훅은 시작·재개·분기마다 돌고 동시에 겹칠 수 있다(고정 파일 공유 시 🔄 행 중복·누락, 2026-09-13 재현)
SYNC_TMP=$(mktemp "${TMPDIR:-/tmp}/startup-sync.XXXXXX" 2>/dev/null) && trap 'rm -f "$SYNC_TMP"' EXIT || SYNC_TMP=/dev/null
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
bash "$PROJ/.claude/hooks/session-sync-check.sh" "$SYNC_TMP" 2>/dev/null || true

# 보존·색인(spec 2026-09-13 §6.1) — 배너보다 먼저, 순차. 실패해도 계속.
# 훅 제한시간(30초) 안에 끝나도록 남은 예산 안에서만 돈다 — sync-check fetch 가 오래 걸리면 건너뛴다.
if [ "$SECONDS" -lt 20 ]; then
  timeout $((25 - SECONDS)) python3 "$PROJ/.claude/hooks/session_archive.py" "$PROJ" "$SID" >/dev/null 2>&1 || true
fi
UNLOGGED=$(python3 "$PROJ/.claude/hooks/session_archive.py" --unlogged 7 2>/dev/null)
LATEST_DATE=$(awk '/^## /{print $2; exit}' "$LOG" 2>/dev/null)

# 이어하기: 최신 사람 블록(첫 '## ' ~ 다음 '## ')에서 ⏸중단·▶다음만 추출. '(없음)' 제외.
open=""
if [ -f "$LOG" ]; then
  open=$(awk '/^## /{c++} c==1{print} c>=2{exit}' "$LOG" | grep -E '^-? *(⏸|▶)' | grep -vE '\(없음\)')
fi

# 행 데이터를 _banner.py 규약(T/R/N/H)으로 조립해 파이프
{
  printf 'T%s🚀 세션 시작 점검\n' "$TAB"
  printf 'H%s%s\n' "$TAB" "$PROJ/../hanium-docs/CLAUDE.md"   # 마감 D-day 원천(없으면 요약에서 생략)

  # 동기화 행 (sync-check tmp: "🔄 label<TAB>state")
  if [ -s "$SYNC_TMP" ]; then
    while IFS= read -r ln; do
      [ -n "$ln" ] && printf 'R%s%s\n' "$TAB" "$ln"
    done < "$SYNC_TMP"
  fi

  printf 'R%s📌 대기 항목 출처%s작업로그 최신 블록 %s — 그 뒤 세션이 미기재면 낡았을 수 있다. 실제 상태로 대조할 것\n' "$TAB" "$TAB" "${LATEST_DATE:-?}"

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

  if [ -n "$UNLOGGED" ]; then
    printf 'R%s📭 기록 안 끝난 세션(7일)%s%s개\n' "$TAB" "$TAB" "$(printf '%s\n' "$UNLOGGED" | grep -c .)"
    printf '%s\n' "$UNLOGGED" | while IFS= read -r u; do printf 'R%s  ·%s%s\n' "$TAB" "$TAB" "$u"; done
  fi

  # session_id 각주(전체폭)
  [ -n "$SID" ] && printf 'N%s🆔 %s\n' "$TAB" "$SID"
} | python3 "$PROJ/.claude/hooks/_banner.py"

exit 0
