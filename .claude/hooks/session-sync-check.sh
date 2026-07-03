#!/usr/bin/env bash
# SessionStart 훅 — 양 repo(sop-project, Rpi5) 원격 fetch 후 ahead/behind 점검.
# 목적: 새 세션에서 "로컬이 최신이겠거니" 가정하다 stale 상태로 답하는 문제 방지(2026-06-11 도입).
# 표시는 하지 않는다 — 결과 행을 임시파일(.startup-sync.tmp)에 써서 뒤이어 도는
# session-worklog-brief.sh 가 '이어하기'와 합쳐 하나의 표 배너로 띄운다(2026-07-03 개편).
# jq 비의존.
set -uo pipefail

PROJ="${CLAUDE_PROJECT_DIR:-$(pwd)}"
TMP="$PROJ/.claude/.startup-sync.tmp"
: > "$TMP" 2>/dev/null || TMP=/dev/null

# repo 한 개 점검 → "키<TAB>값" 한 줄을 $TMP 에 append
report_repo() {
  local label="$1" dir="$2" branch upstream counts behind ahead dirty state
  if [ ! -d "$dir/.git" ]; then
    printf '🔄 %s\t— (repo 없음)\n' "$label" >> "$TMP"
    return
  fi
  timeout 15 git -C "$dir" fetch --quiet 2>/dev/null
  branch=$(git -C "$dir" rev-parse --abbrev-ref HEAD 2>/dev/null)
  upstream=$(git -C "$dir" rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>/dev/null)
  if [ -z "${upstream:-}" ]; then
    printf '🔄 %s\t[%s] upstream 미설정\n' "$label" "$branch" >> "$TMP"
    return
  fi
  counts=$(git -C "$dir" rev-list --left-right --count "${upstream}...HEAD" 2>/dev/null)
  behind=$(printf '%s' "$counts" | awk '{print $1+0}')
  ahead=$(printf '%s' "$counts" | awk '{print $2+0}')
  dirty=$(git -C "$dir" status --porcelain 2>/dev/null | head -c1)
  # 값 문자열은 폭이 일정한 한글/ASCII만 사용(✎⬇⬆ 등 폭 모호 기호 배제 → 표 정렬 안정)
  state=""
  [ "${behind:-0}" -gt 0 ] && state="${state}behind ${behind} "
  [ "${ahead:-0}" -gt 0 ]  && state="${state}ahead ${ahead} "
  [ -n "$dirty" ]          && state="${state}로컬변경 "
  [ -z "$state" ]          && state="동기화됨"
  printf '🔄 %s\t%s\n' "$label" "$state" >> "$TMP"
}

report_repo "sop-project" "$PROJ"
report_repo "Rpi5" "$PROJ/Rpi5"
exit 0
