#!/usr/bin/env bash
# SessionEnd 훅 — 이 세션이 만든 커밋을 작업로그 하단에 자동 매핑 append (2026-07-01 도입).
# 목적: "어떤 세션(ID)에서 어떤 커밋을 했나"를 손 안 대고 남긴다(짝: session-worklog-brief.sh).
# 시작 HEAD(.worklog-head-<id>)와 현재 HEAD를 비교해 그 사이 커밋을 기록.
# ⚠ best-effort — 강제종료 등으로 SessionEnd가 미발동하면 이번 세션분은 누락(의미 요약은 '세션 마무리' 수동 의식이 담보).
# jq 비의존. 차단 불가(로깅용).
set -uo pipefail

PROJ="${CLAUDE_PROJECT_DIR:-$(pwd)}"
LOG="$PROJ/docs/작업로그.md"

SID="${CLAUDE_CODE_SESSION_ID:-}"
if [ -z "$SID" ]; then
  SID=$(cat 2>/dev/null \
        | grep -o '"session_id"[[:space:]]*:[[:space:]]*"[^"]*"' \
        | head -1 | sed 's/.*"\([^"]*\)"$/\1/')
fi
[ -z "$SID" ] && exit 0

HEADFILE="$PROJ/.claude/.worklog-head-$SID"
[ -f "$HEADFILE" ] || exit 0
START=$(cat "$HEADFILE" 2>/dev/null)
rm -f "$HEADFILE" 2>/dev/null

[ -d "$PROJ/.git" ] || exit 0
# START는 커밋 해시여야 함 — 손상된 head 파일이 git 옵션으로 해석되는 것 방지
case "$START" in
  *[!0-9a-f]*|"") exit 0 ;;
esac
END=$(git -C "$PROJ" rev-parse HEAD 2>/dev/null)
[ "$START" = "$END" ] && exit 0            # 이 세션이 만든 커밋 없음 → 스킵

commits=$(git -C "$PROJ" log --oneline "$START..HEAD" -- 2>/dev/null)
[ -z "$commits" ] && exit 0
[ -f "$LOG" ] || exit 0

# fork/resume 세션 쌍이 같은 시작 HEAD를 공유해 동일 커밋을 중복 기록하던 문제:
# 이미 로그에 매핑된 해시는 건너뛴다 (2026-07-14 Fable 점검).
new_commits=""
while IFS= read -r line; do
  h="${line%% *}"
  grep -qF -- "- $h " "$LOG" || new_commits="${new_commits}${line}
"
done <<EOF
$commits
EOF
[ -z "$new_commits" ] && exit 0

DATE=$(date +%Y-%m-%d)
{
  echo ""
  echo "- **$DATE** · session \`$SID\`"
  printf '%s' "$new_commits" | sed 's/^/  - /'
} >> "$LOG"
exit 0
