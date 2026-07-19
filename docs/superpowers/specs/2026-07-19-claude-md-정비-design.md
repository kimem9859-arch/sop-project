# CLAUDE.md 정비 설계 — 워크플로 규칙 흡수 + 이력 슬림화 (2026-07-19)

> brainstorming-first 규칙에 따른 설계 문서. 논의·결정만 기록(측정·사양 수치는 통합문서 §10).

## 배경·문제
1. 사용자가 "즉흥·바로 구현" 습관을 교정하려 brainstorming-first를 채택(같은 날). 그 보완으로 "무엇을 얼마나 만들지"(수술적·최소 구현) 규칙이 필요.
2. 참고 자료로 Karpathy·Boris CLAUDE.md 제시. **단, 둘은 범용 워크플로 템플릿** — 우리 CLAUDE.md의 프로젝트 지식층에는 무관. 워크플로층에만 적용.
3. CLAUDE.md 「(이전) 시점 기록」 블록이 파일 40%를 차지, 완료 이력 + gotcha 복제. gotcha 8종 grep 대조 결과 **전부 정본/가이드에 원본 존재**(고유 정보 0) → CLAUDE.md 자신의 "복제 금지" 규칙 위반. 삭제해도 손실 0.

## 결정 (승인됨)
- **A안 채택**: 워크플로 규칙 추가 + 이력 포인터화.

### 흡수한 것 (Karpathy·Boris 선별)
- 수술적·최소 구현(요청 범위만·리팩터링 금지·기존 스타일) — Karpathy Surgical + Boris Minimal
- 근본원인 우선·임시방편 금지 — Boris No Laziness / systematic-debugging
- 비자명 변경 제출 전 "더 우아한 방법?" 1회 자기검열(자명한 건 스킵) — Boris #5 Balanced
- 틀어지면 멈추고 재계획 — Boris #1

### ⛔ 명시적으로 거부한 것 (환경·방침 충돌)
- subagent 자유 남용·auto mode → 비용 규율·"묻지 않으면 agent 금지"와 충돌
- 자동 버그수정 즉시착수("just fix it") → brainstorming-first와 정반대
- `tasks/todo.md`·`lessons.md` 신설 → memory 시스템·작업로그·Task 도구가 상위(파편화)

### 원칙
- Karpathy·Boris = **메뉴, 템플릿 아님**(제1원칙: 값 하는 것만 흡수).
- 프로젝트 지식층(프로젝트·정본·모델·현재상태)은 그들과 무관하므로 손대지 않음.

## 변경 파일
- `CLAUDE.md`: ①작업규칙에 "수술적·최소 구현+자기검열" 불릿(+거부 목록) 추가 ②「이전 기록」 블록 → 포인터 소절 교체 ③헤더 날짜 07-16→07-19.

## 검증
- gotcha 8종 타 문서 원본 존재 grep 확인(완료) → 손실 0.
- 포인터 대상 4파일 실재 확인(완료).
- 편집 후 CLAUDE.md 재독 + pre-commit 정합성 훅 통과.
