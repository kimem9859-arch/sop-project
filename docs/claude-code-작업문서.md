# Claude Code 작업문서 (설명서)

> **Claude Code를 이 프로젝트에서 어떻게 쓰고 있으며, 어떤 CC 기능·도구가 있고, 재사용 원칙이 무엇인지** 정리한 **설명서**(시간순 로그 아님).
> 목적 = Claude Code를 생산적·유용하게 쓰는 법(전역 CC 인프라 + 이 프로젝트 작업 효율).
>
> **짝 문서 · 역할 경계**
> - `claude-code-작업문서.md`(이 파일) = **설명서** — "지금 CC 인프라가 뭐고 어떻게 일하나 + 원칙" (주제별·개정)
> - `claude-code-작업로그.md` = **CC 작업 로그** — "언제 어떤 CC 작업을 했나" (시간순)
> - `작업로그.md` = **프로젝트 작업 로그** (CC 제외)
> - `CLAUDE.md`·통합문서 = 프로젝트 사양·진척

---

## 1. 현재 CC 인프라 (이 repo에 설치됨)

| 구분 | 항목 | 역할 |
|---|---|---|
| SessionStart 훅 | `session-sync-check.sh` | git 원격 ahead/behind·로컬변경 보고 |
| SessionStart 훅 | `session-worklog-brief.sh` | 작업로그 ⏸중단·▶다음 이어하기 브리핑 + session_id 주입 |
| SessionEnd 훅 | `session-worklog-commit.sh` | 그 세션이 만든 커밋을 `docs/작업로그.md`에 자동 매핑 |
| pre-commit 훅 | `.githooks/pre-commit` | 문서 커밋 시 diff 앵커로 다른 문서·memory와의 모순을 `claude -p`(Haiku)가 대조·경고. warn-only·비차단 |

- 등록: SessionStart/End = `.claude/settings.json`(pull하면 자동) / pre-commit = `.githooks/` + `git config core.hooksPath .githooks`(클론 후 1회).
- 폐기 이력: 구 `doc-consistency-check.sh`(SessionStart grep) = 타이밍상 예방 불가·중복이라 제거 → pre-commit LLM으로 재설계.

## 2. 작업 방식 (how I work with Claude Code)

- **세션 시작**: 브리핑 훅의 "이어갈 작업 + session_id" + 원격 동기화 상태 먼저 확인. behind면 pull 먼저.
- **세션 마무리** (스킬 `/session-wrap`): **"세션 마무리"/"세션 정리"** 라고 하면 이번 세션 작업을 4분류(✅완료/⏸중단/▶다음/🔗커밋)로 기록 — **프로젝트 작업은 `작업로그.md`, CC 작업은 `claude-code-작업로그.md`** 로 나눠서(전체 UUID 태그). ※정의 = 하루 끝이 아니라 **한 작업 단위(A작업)가 끝난 시점**(하루 여러 번 가능).
- **문서 커밋**: pre-commit 정합성 훅이 자동 대조(경고만). 무시하려면 `SKIP_DOCSYNC=1`.
- **큰/되돌리기 어려운 변경**: 계획(plan mode) 또는 A/B 선택지로 먼저 확인.
- **세션 이어가기**: 로그의 `session <UUID>`를 `claude --resume`에 사용.

## 3. 범용 훅 설계 원칙 (재사용 지식)

### 3.1 이벤트별 타이밍 — "무엇을 막고 싶은가"의 시점에 건다
- **SessionStart**: 브리핑·컨텍스트 주입용. stdout이 모델 컨텍스트에 주입됨. **drift 예방엔 부적합**(이미 벌어진 뒤).
- **SessionEnd**: 로깅·정리용. **best-effort**(강제종료 시 미발동)·차단 불가.
- **Stop**: 매 응답 종료 — 너무 잦음.
- **pre-commit(git)**: 변경이 **커밋되는 순간** = 예방·검증의 올바른 타이밍. warn-only(exit 0)면 안 막음.

### 3.2 탐지: grep vs LLM
- 하드코딩 grep = brittle·의미 모순 못 잡음·감시값을 박으면 훅 자신이 stale.
- 의미 판단은 `claude -p`(헤드리스) + **diff 앵커**로 초점↑·비용↓. 규모 작으면 문서 전문 대조도 감당.

### 3.3 오탐 억제 = 최우선 (훅이 죽는 이유)
- 개방형 "다 찾아줘"는 과탐 → 노이즈 → 훅 무시. 노이즈 훅은 곧 폐기됨.
- 보수적 프롬프트: **실제 두 문장이 직접 모순 + 양쪽 인용 가능할 때만**. "빠진 언급/생략"은 모순 아님.
- warn-only·비차단 + 바이패스 env.

### 3.4 견고성 관례 (bash 훅)
- `set -uo pipefail`, **jq 비의존**(env·grep), `timeout`, **실패해도 exit 0**(fail-open).
- **한글/비ASCII 경로**: `git -c core.quotepath=false`(안 하면 이스케이프로 매칭 실패).
- **세션ID**: `$CLAUDE_CODE_SESSION_ID` 우선 + stdin JSON fallback.
- **경로 이식**: 하드코딩 금지 → `git rev-parse --show-toplevel`·`$HOME`·env override.
- **배포/공유**: 범용은 전역 `~/.claude/`(모든 폴더 자동) / 프로젝트 전용은 그 repo `.claude/`. git 훅은 `.githooks/`+`core.hooksPath`.

### 3.5 워크로그(세션 추적) 3종 조합
- SessionStart brief(브리핑+session_id+시작 HEAD 기록) / SessionEnd commit(시작HEAD..현재 커밋 자동매핑) / **"세션 마무리" 수동 요약**(스킬 `/session-wrap`, 의미 기록=진짜 안전판).
- 마커 추출은 **줄 맨 앞에서만**(`^-? *(⏸|▶)`) — 본문 속 글자 오탐 방지.

### 3.6 실전 함정
- SessionStart는 예방 못 함(타이밍) → pre-commit으로 재설계.
- 측정값·네이밍 하드코딩 → 훅 자신이 stale.
- 마커 grep이 본문 속 `▶`/`⏸` 오탐 → 줄 앞 앵커링.
- best-effort 이벤트(SessionEnd)는 강제종료 시 누락 → 수동 안전판 병행.
- pre-commit LLM 첫 실사용서 "빠진 언급" 오탐 → 직접모순+인용으로 엄격화.
