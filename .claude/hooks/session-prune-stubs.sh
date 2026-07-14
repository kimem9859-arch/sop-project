#!/usr/bin/env bash
# session-prune-stubs.sh — resume 목록 정리용 훅 (SessionStart)
#
# 원격제어(웹/모바일 앱)로 접속할 때마다 Claude Code가 bridge-session·
# queue-operation·ai-title 등 '껍데기 세션파일'을 남긴다. pre-commit 문서정합성
# 훅의 `claude -p` headless 호출도 tiny 세션파일을 남긴다. 둘 다 resume 목록만
# 지저분하게 만드는 쓰레기 — 실제 대화(user/assistant) 메시지가 거의 없다.
#
# 판별: 실제 user/assistant 메시지 ≤ MAX_UA  &&  수정 60분 초과  &&  현재 세션 아님
#   - 정상 세션은 ua가 수십~수백 → 절대 안 걸림(현재 세션 ua=48 vs 최대 쓰레기 3, 넓은 마진).
#   - 60분 가드: 갓 시작한 정상 세션(초기 ua 작음)을 보호. 쓰레기는 영원히 tiny.
#   - 하드 삭제 대신 .trash/ 로 이동(복구 가능). 30일 지난 .trash 항목은 자동 비움.
#
# 비차단·조용함(정상 시 출력 없음). 실패해도 세션 시작을 막지 않는다.

set -uo pipefail

MAX_UA=5
AGE_MIN=60
TRASH_RETAIN_DAYS=30

# 이 프로젝트의 세션 저장 디렉토리 (cwd → Claude Code 규약 경로)
proj_slug="$(echo "${CLAUDE_PROJECT_DIR:-$PWD}" | sed 's#/#-#g')"
sess_dir="$HOME/.claude/projects/${proj_slug}"
[ -d "$sess_dir" ] || exit 0

trash_dir="$sess_dir/.trash"
mkdir -p "$trash_dir" 2>/dev/null || exit 0

# 현재 세션ID: env var 우선, 없으면 stdin JSON의 session_id fallback (brief 훅과 동일 규약)
cur="${CLAUDE_CODE_SESSION_ID:-}"
if [ -z "$cur" ]; then
  cur=$(cat 2>/dev/null \
        | grep -o '"session_id"[[:space:]]*:[[:space:]]*"[^"]*"' \
        | head -1 | sed 's/.*"\([^"]*\)"$/\1/')
fi
now=$(date +%s)
moved=0

shopt -s nullglob
for f in "$sess_dir"/*.jsonl; do
  base="$(basename "$f")"
  # 현재 세션 보호
  [ -n "$cur" ] && [ "$base" = "${cur}.jsonl" ] && continue

  # 나이(분)
  mt=$(stat -c %Y "$f" 2>/dev/null) || continue
  age=$(( (now - mt) / 60 ))
  [ "$age" -gt "$AGE_MIN" ] || continue

  # 실제 대화 메시지 수 (grep -c는 0건이면 exit 1 — || echo 0 쓰면 "0\n0" 이중값이 되므로 || true)
  ua=$(grep -cE '"type":"(user|assistant)"' "$f" 2>/dev/null) || true
  [ "${ua:-0}" -le "$MAX_UA" ] 2>/dev/null || continue

  # mv는 mtime 보존 → touch로 '.trash 진입 시각'을 기록해야 30일 보존 약속이 지켜진다
  if mv "$f" "$trash_dir/" 2>/dev/null; then
    touch "$trash_dir/$base" 2>/dev/null
    moved=$((moved+1))
  fi
done

# 오래된 .trash 항목 자동 비움
find "$trash_dir" -name '*.jsonl' -type f -mtime +"$TRASH_RETAIN_DAYS" -delete 2>/dev/null

# 옮긴 게 있을 때만 출력. Claude Code는 stdout이 순수 JSON이면 필드를 해석:
#   systemMessage    → 사용자에게 보이는 배너(강조 알림)
#   additionalContext → 모델 컨텍스트 주입
# (평문을 섞으면 JSON 파싱이 깨져 systemMessage가 배너로 안 뜬다 → moved=0이면 무출력.)
if [ "$moved" -gt 0 ]; then
  msg="🧹 resume 정리: tiny 세션 ${moved}개 → .trash (복구 가능, ${TRASH_RETAIN_DAYS}일 후 자동삭제)"
  printf '{"systemMessage":"%s","hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"%s"}}\n' "$msg" "$msg"
fi
exit 0
