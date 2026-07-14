# .githooks — 공유 git 훅

repo에 커밋되는 git 훅 모음(양 머신 공유용). `.git/hooks`는 git 추적이 안 되므로 여기 둔다.

## 활성화 (클론 후 1회, 각 머신에서)

```bash
git config core.hooksPath .githooks
```

> 이 설정은 로컬 git config라 **클론마다 1회** 필요하다(자동 아님). 미설정이면 훅이 안 돈다.

## 훅 목록

### `pre-commit` — 문서 정합성 점검 (LLM · diff-only)
- **언제**: `CLAUDE.md`·`README.md`·`docs/*.md` 중 하나라도 staged로 커밋할 때만 발동(코드·기타 커밋엔 미발동).
- **무엇**: 이번 변경의 **diff만**(-U20 넓은 컨텍스트) `claude -p`(Haiku)에 보내, diff 안에서 보이는 문장끼리의 직접 모순을 보수적으로 경고.
- **성격**: **경고만·비차단**(항상 커밋 진행). 오탐이 나도 커밋을 막지 않는다.
- **범위 축소 이력**(2026-07-14 Fable 점검): 원래는 문서 전문 전체+memory를 매 커밋 전송했으나 **diff-only로 축소** — ①비용·지연(매번 corpus 토큰) ②프롬프트 인젝션 면적(문서 전문이 통째 유입) 때문. 대가로 **diff에 안 보이는 다른 문서와의 교차 대조는 불가**(얕은 안전망) — 교차 모순 1차 방어는 CLAUDE.md 단일정본 규칙 + 편집 규율.
- **끄기**: `SKIP_DOCSYNC=1 git commit ...` / claude 미설치·오프라인이면 자동 스킵.

## 배경
이 훅은 옛 `.claude/hooks/doc-consistency-check.sh`(SessionStart grep, 2026-07-01 제거)를 대체한다.
차이: 타이밍(세션시작→**커밋시점**)·방식(하드코딩 grep→**LLM 의미 대조**)·초점(**diff 앵커**로 오탐 억제).
