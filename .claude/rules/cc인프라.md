---
paths: [".claude/**"]
---

# 이 저장소의 Claude Code 인프라

> 🔴 **경위는 여기 없다** — 언제·어느 커밋으로·왜 고쳤나는 `docs/claude-code-작업로그.md` 가 정본이다.
> 🔴 **폐기한 훅 3건과 그 교훈은 `훅설계.md`** 에 있다.

## 등록된 것

**훅은 ①②③ 셋이다**(`.claude/settings.json`) — ①② 는 `SessionStart`, ③ 은 `InstructionsLoaded`. 권한 허용목록도 같은 파일에 있고 **전부 repo 공유**라 양 머신이 동일하다 — **클론 후 별도 설정이 필요 없다.**

| | 항목 | 역할 |
| --- | --- | --- |
| ① | `hooks/session-worklog-brief.sh` | **세션 시작 배너** — 원격 동기화 + `⏸`중단·`▶`다음 + 📭 기록 안 끝난 세션 + session_id 주입 |
| ② | `hooks/session-prune-stubs.sh` | resume 목록의 tiny·원격제어 스텁을 `.trash` 로 정리 |
| — | `hooks/session_archive.py` | 세션 **보존·색인**. ①이 배너 전에 **순차 호출**(독립 훅 아님). 산출물은 저장소 밖 `~/lab/session-archive/` |
| ③ | `hooks/instructions-loaded-log.sh` | **규칙 로드 기록**(`InstructionsLoaded`) — 어떤 규칙이 언제·왜 붙었는지 `~/lab/rule-loads/YYYY-MM.tsv` 에 누적. 저장소 밖 |
| — | `hooks/session-sync-check.sh` | ⚠️ **독립 훅이 아니다** — ①이 내부에서 순차 호출한다(SessionStart 병렬 경쟁 회피). 양 저장소의 ahead/behind·로컬변경을 점검 |
| — | 스킬 `session-wrap` | `work-close` 3단계의 작업로그 기록 절차. 사용자 입구 없음(`user-invocable: false`) |
| — | 스킬 `work-close` / 커맨드 `/작업마무리` | 작업 단위의 끝 — 결말 확인 → 정본 기록 → 세션 마무리 → push 한 번 |
| — | 스킬 `session-resume` / 커맨드 `/이어하기` | 이전 작업 이어받기 — 진행중 세션은 한 번 묻고, 멈춘 지점과 추천 하나를 보고하고 멈춘다 |

**보존 색인의 기재 판정 4종** — **진행중**(마지막 대화 60분 내 · 세션을 열기만 한 것은 활동으로 세지 않는다) · **미기재**(세션 번호 없음) · **부분기재**(번호는 있으나 그 세션 커밋 해시가 로그에 없음) · **기재**.

**`work-close` 2.5 의 기계 검사 4종** — ①색인 누락 ②색인 유령 ③`[CURRENT]`·🔓 가 가리키는 근거 절 실재 ④**짝 커밋**(저널에 새 `§12.N` 을 썼는데 통합문서가 안 바뀌면 커밋 전에 멈춘다).

## 규칙이 정말 붙는지 확인하는 법

🔴 **`paths:` 스코프 규칙은 조용히 실패한다** — 패턴이 안 맞으면 오류 없이 그냥 안 붙고, `/context` 에도 안 나온다(세션 시작 로드분만 나온다). 규칙 7개 중 2개가 그렇게 죽어 있었다.

- **쓸 때의 원칙**(첫 패턴에 와일드카드)은 `규칙배치.md` 가 정본이다.
- **즉석 확인** — 그 규칙의 `paths:` 에 맞는 파일을 **Read 도구로** 연다(`cat` 은 발동하지 않는다). 붙으면 규칙 본문이 그 자리에 나타난다.
- **누적 확인** — 훅 ③ 의 로그를 본다:

```bash
# 이번 달 규칙별 로드 횟수 — 0회인 규칙이 죽은 규칙이다
cut -f4 ~/lab/rule-loads/$(date +%Y-%m).tsv | sort | uniq -c | sort -rn
# 등록돼 있는데 한 번도 안 붙은 규칙 찾기
comm -13 <(cut -f4 ~/lab/rule-loads/*.tsv | sort -u) <(ls .claude/rules/*.md | sort)
```

## 도구를 쓸 때

- **바로 쓰는 것**(조회·보고)과 **승인받는 것**(설정 파일 생성·장시간 실행)을 가른다.
- 도구를 쓰면 **답변에 한 줄로 밝힌다.**
- ⚠️ `context7` 은 **외부 전송**이다 · `session-report` 산출물은 **커밋하지 않는다** · `ralph-loop` 는 **횟수 상한 필수** · `pyright-lsp` 는 **PyQt6·Hailo 처럼 타입 정보가 없는 라이브러리의 경고가 잡음일 수 있다**.

## 이 머신(파이1)의 플러그인 상태

> 🔴 **플러그인 활성은 머신 로컬이다**(`~/.claude/settings.json`) — repo 로 공유되지 않으므로 **데스크톱은 다를 수 있다.**

**켜짐 6** = `superpowers` · `claude-md-management` · `ralph-loop` · `context7` · `pyright-lsp` · `session-report`
**꺼짐 9** = `hookify` · `code-review` · `code-simplifier` · `skill-creator` · `claude-code-setup` · `data`·`design`·`engineering`·`cowork-plugin-management`(`@synced`)

- 🔴 **`hookify` 를 끈 근거** — 판정할 규칙 0개인 채로 약 2만 회 실행되고 **적발 0건**이었다(`훅설계.md` 제1원칙). 되살리려면 `~/.claude/settings.json` 에서 `true`.
- ⚠️ **`code-review`·`simplify` 는 플러그인이 꺼져 있어도 스킬 목록에 보인다** — **Claude Code 내장 스킬**이 같은 이름을 쓴다. 이름이 보인다고 플러그인이 켜진 것이 아니다.
