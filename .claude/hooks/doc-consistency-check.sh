#!/usr/bin/env bash
# SessionStart 훅 — 문서 정합성 점검 (session-sync-check.sh 짝, 2026-07-01 도입).
# 목적: ① 측정값이 정본(통합문서·타임라인·기준문서) 밖 운영문서에 복제되는 drift,
#       ② console_v1을 '최종 모델'로 칭하는 stale 표현 을 세션 시작 시 자동 경고.
# 근거 규칙: CLAUDE.md '측정·사양 수치 = 통합문서 단일 정본' / 모델 3단계(최종=console_v2).
# 출력(stdout)은 SessionStart 훅 규약상 모델 컨텍스트에 주입된다. 경고만, 차단하지 않음. jq 비의존.
set -uo pipefail

PROJ="${CLAUDE_PROJECT_DIR:-$(pwd)}"
cd "$PROJ" 2>/dev/null || exit 0

# 운영문서 = 측정값 보유 금지(통합문서 §10 포인터만). 기준문서는 나침반이라 요약 허용 → 제외.
OPS=("CLAUDE.md" "README.md")
for f in dev/*/README.md; do [ -f "$f" ] && OPS+=("$f"); done

# 감시 측정값(소량 하드코딩). 결정값 '15fps'는 제외(운영문서 보유 허용).
MEASURE='0\.993|0\.835|~?13 ?fps'

issues=0
echo "[문서 정합성 점검 — 측정값 누출 · 모델 네이밍 stale]"

# ── 검사 1: 운영문서에 측정 수치 복제 여부 ──
for f in "${OPS[@]}"; do
  [ -f "$f" ] || continue
  hits=$(grep -nE "$MEASURE" "$f" 2>/dev/null)
  if [ -n "$hits" ]; then
    echo "  ⚠ [측정값 누출] $f — 측정 수치는 통합문서 §10 포인터로(복제 금지):"
    printf '%s\n' "$hits" | sed 's/^/        /'
    issues=$((issues+1))
  fi
done

# ── 검사 2: console_v1을 '최종 모델'로 칭하는 stale 표현 ──
# '최종 … 모델 … console_v1' / 'console_v1=최종' 형태만 탐지하되,
# 같은 줄에 console_v2가 있으면(= 3단계 설명·fix 인용·폐기표·changelog) 정상이므로 제외해 오탐 차단.
stale=$(grep -rnE '최종 (시연 )?모델[^|]{0,12}console_v1|console_v1[^|]{0,4}[(=][^|]{0,6}최종' \
          --include='*.md' docs/통합수행설계문서_전체_섹션1-15.md docs/프로젝트_기준문서_v*.md \
          CLAUDE.md README.md dev/*/README.md 2>/dev/null \
        | grep -vE 'console_v2|구버전|폐기|차 수정|변경 이력')
if [ -n "$stale" ]; then
  echo "  ⚠ [네이밍 stale] 'console_v1=최종' 표현 — 최종 모델은 console_v2:"
  printf '%s\n' "$stale" | sed 's/^/        /'
  issues=$((issues+1))
fi

[ "$issues" -eq 0 ] && echo "  ✓ 이상 없음 (측정값 누출 0 · 네이밍 stale 0)"
exit 0
