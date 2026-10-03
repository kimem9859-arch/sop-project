#!/usr/bin/env bash
# SessionStart 훅 — 양 repo(sop-project, Rpi5) 원격 fetch 후 ahead/behind 점검.
# 목적: 새 세션에서 "로컬이 최신이겠거니" 가정하다 stale 상태로 답하는 문제 방지(2026-06-11 도입).
# 표시는 하지 않는다 — 결과 행을 첫 인자로 받은 임시파일(없으면 .startup-sync.tmp)에 써서 뒤이어 도는
# session-worklog-brief.sh 가 '이어하기'와 합쳐 하나의 배너로 띄운다(2026-07-03 개편).
# jq 비의존.
set -uo pipefail

PROJ="${CLAUDE_PROJECT_DIR:-$(pwd)}"
TMP="${1:-$PROJ/.claude/.startup-sync.tmp}"
: > "$TMP" 2>/dev/null || TMP=/dev/null

# repo 한 개 점검 → "키<TAB>값" 한 줄을 $TMP 에 append
report_repo() {
  local label="$1" dir="$2" branch upstream counts behind ahead dirty state
  if [ ! -d "$dir/.git" ]; then
    printf '🔄 %s\t— (repo 없음)\n' "$label" >> "$TMP"
    return
  fi
  # 🔴 타임아웃은 5초다. fetch 는 네트워크가 막혀도 스스로 포기하지 않고 이 값을 꽉 채운다 —
  # 저장소가 둘이라 15초였을 때 최악 30초로 부모 훅(session-worklog-brief.sh)의 한도 30초를
  # 통째로 먹어 배너가 잘렸다(실측: startup 최대 26.1초 · 30초 타임아웃 1회).
  # 정상일 때 실측 0.5초라 5초도 10배 여유다. 늘리려면 부모 예산부터 본다.
  timeout 5 git -C "$dir" fetch --quiet 2>/dev/null
  branch=$(git -C "$dir" rev-parse --abbrev-ref HEAD 2>/dev/null)
  upstream=$(git -C "$dir" rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>/dev/null)
  if [ -z "${upstream:-}" ]; then
    printf '🔄 %s\t[%s] upstream 미설정\n' "$label" "$branch" >> "$TMP"
    return
  fi
  counts=$(git -C "$dir" rev-list --left-right --count "${upstream}...HEAD" 2>/dev/null)
  behind=$(printf '%s' "$counts" | awk '{print $1+0}')
  ahead=$(printf '%s' "$counts" | awk '{print $2+0}')
  # 🔴 --no-optional-locks — status 가 index.lock 을 잡지 않게. head -c1 이 파이프를 일찍 닫거나 부모 훅이
  #    시간 초과로 끊으면 잠금이 남아 다음 커밋이 막혔다(statusline 과 같은 원인 · 2026-10-03).
  dirty=$(git --no-optional-locks -C "$dir" status --porcelain 2>/dev/null | head -c1)
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

# 커밋 비밀 검사(.githooks/pre-commit) 를 저장소마다 켠다 — git 훅은 사본마다 `core.hooksPath` 를 한 번 켜야 해서
# 설정이 빠진 채 2주간 안 돈 적이 있다(훅설계.md). 꺼져 있으면 여기서 자동으로 켜고 배너에 한 줄 남긴다.
enable_secret_hook() {
  local label="$1" dir="$2"
  [ -x "$dir/.githooks/pre-commit" ] || return 0
  [ "$(git -C "$dir" config core.hooksPath 2>/dev/null)" = ".githooks" ] && return 0
  git -C "$dir" config core.hooksPath .githooks 2>/dev/null \
    && printf '🔒 %s\t커밋 비밀 검사 켬(core.hooksPath)\n' "$label" >> "$TMP"
}
enable_secret_hook "sop-project" "$PROJ"
enable_secret_hook "Rpi5" "$PROJ/Rpi5"
enable_secret_hook "project-docs" "${PROJECT_DOCS_DIR:-$HOME/project-docs}"
exit 0
