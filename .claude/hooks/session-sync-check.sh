#!/usr/bin/env bash
# SessionStart 훅 — 양 repo(sop-project, Rpi5) 원격 fetch 후 ahead/behind 보고.
# 목적: 새 세션에서 "로컬이 최신이겠거니" 가정하다 stale 상태로 답하는 문제 방지(2026-06-11 도입).
# 출력(stdout)은 SessionStart 훅 규약상 그대로 모델 컨텍스트에 주입된다. jq 비의존.
set -uo pipefail

PROJ="${CLAUDE_PROJECT_DIR:-$(pwd)}"

report_repo() {
  local label="$1" dir="$2"
  if [ ! -d "$dir/.git" ]; then
    printf '  - %s: git repo 없음 (%s)\n' "$label" "$dir"
    return
  fi
  # 원격 갱신 (오프라인/지연 대비 timeout, 실패해도 로컬 기준으로 계속)
  timeout 15 git -C "$dir" fetch --quiet 2>/dev/null || \
    printf '  - %s: ⚠ fetch 실패(오프라인?) — 아래는 마지막 fetch 기준\n' "$label"
  local branch upstream counts behind ahead dirty state
  branch=$(git -C "$dir" rev-parse --abbrev-ref HEAD 2>/dev/null)
  upstream=$(git -C "$dir" rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>/dev/null)
  if [ -z "${upstream:-}" ]; then
    printf '  - %s [%s]: upstream 미설정\n' "$label" "$branch"
    return
  fi
  counts=$(git -C "$dir" rev-list --left-right --count "${upstream}...HEAD" 2>/dev/null)
  behind=$(printf '%s' "$counts" | awk '{print $1+0}')
  ahead=$(printf '%s' "$counts" | awk '{print $2+0}')
  dirty=$(git -C "$dir" status --porcelain 2>/dev/null | head -c1)
  state=""
  [ "${behind:-0}" -gt 0 ] && state="${state}⬇${behind} behind "
  [ "${ahead:-0}" -gt 0 ]  && state="${state}⬆${ahead} ahead "
  [ -n "$dirty" ]          && state="${state}✎ 로컬변경 "
  [ -z "$state" ]          && state="✓ 동기화됨"
  printf '  - %s [%s] vs %s: %s\n' "$label" "$branch" "$upstream" "$state"
}

{
  echo "[세션 시작 동기화 점검 — 작업 전 원격 상태 확인]"
  report_repo "sop-project" "$PROJ"
  report_repo "Rpi5" "$PROJ/Rpi5"
  echo "⬇behind가 있으면 로컬을 최신으로 가정하지 말고 먼저 git pull 할 것."
}
