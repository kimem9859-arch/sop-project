# .githooks — 공유 git 훅

repo에 커밋되는 git 훅 모음(양 머신 공유용). `.git/hooks`는 git 추적이 안 되므로 여기 둔다.

## 활성화 (클론 후 1회, 각 머신에서)

```bash
git config core.hooksPath .githooks
```

> 이 설정은 로컬 git config라 **클론마다 1회** 필요하다(자동 아님). 미설정이면 훅이 안 돈다.

## 훅 목록

### `pre-commit` — 문서 간 정합성 점검 (LLM · diff 앵커)
- **언제**: `CLAUDE.md`·`README.md`·`docs/*.md` 중 하나라도 staged로 커밋할 때만 발동(코드·기타 커밋엔 미발동).
- **무엇**: 이번 변경(diff)을 앵커로, 다른 문서에 지금 모순되거나 함께 고쳤어야 하는데 빠진 곳을 `claude -p`(Haiku)가 보수적으로 대조·경고. "역반영 완료인데 다른 문서엔 ▶미완" 같은 의미적 drift 포착용.
- **성격**: **경고만·비차단**(항상 커밋 진행). 오탐이 나도 커밋을 막지 않는다.
- **memory 참조**: `git rev-parse --show-toplevel` 기반으로 이 프로젝트의 memory 디렉터리를 자동 계산해 존재하면 대조에 포함(없으면 스킵). `DOCSYNC_MEMORY_DIR`로 오버라이드 가능. ⚠ memory는 데스크톱 로컬이라 파이 등에선 대개 부재 → 그 머신에선 memory 대조 생략(정상).
- **끄기**: `SKIP_DOCSYNC=1 git commit ...` / claude 미설치·오프라인이면 자동 스킵.

## 배경
이 훅은 옛 `.claude/hooks/doc-consistency-check.sh`(SessionStart grep, 2026-07-01 제거)를 대체한다.
차이: 타이밍(세션시작→**커밋시점**)·방식(하드코딩 grep→**LLM 의미 대조**)·초점(**diff 앵커**로 오탐 억제).
