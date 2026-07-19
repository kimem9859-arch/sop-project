# Claude Code 작업로그 (CC 작업 시간순)

> **Claude Code 관련 작업(훅·도구·인프라·작업방식 개선)** 을 시간순으로 남기는 로그.
> 프로젝트 작업(`작업로그.md`)과 **분리**. 설명서·원칙은 `claude-code-작업문서.md` 참조.
> **표기**: ✅ 완료 / ⏸ 중단 / ▶ 다음 / 🔗 커밋 · 세션 ID = 전체 UUID.

---

## 2026-07-19 · session 53ded0ed-b600-4a14-9b4e-c3ebdf10b8c7 (statusline 하단 상태바 도입 + 공식문서 참조 원칙 메모리화)

**발단**: "CC 인프라 개선 — 세션 대화창 하단 커스텀 설정이 뭔지"에서 출발 → statusLine 확인 → 공식 문서(`code.claude.com/docs/ko/statusline`) 원문을 WebFetch로 읽고 그 계약대로 구현. 사용자 요구를 반복 반영해 커스텀.

- ✅ **statusline 신설**(`.claude/hooks/statusline.py`, python3·jq 비의존 — 이 환경 관행). `settings.json`에 `statusLine` 등록(**프로젝트 공유** → 3대 자동 적용). 절차·필드명·rate_limits 주의사항은 공식 문서 원문 기준.
  - **1줄**: `🤖 [모델] | 📁 폴더 | 🌿 브랜치 + git상태 | 세션마무리`. **git상태 3계열**: ✎N(미커밋·노랑)·⬆N(미푸시·마젠타)·✓(완전 깨끗+동기화·희미)·생략(추적원격 없음). ✓는 커밋도 푸시도 다 됐을 때만 → "커밋·푸시 안 하고 넘어가는" 맹점 차단.
  - **세션마무리 표시기**: 워크로그 헤딩의 현재 session_id로 블록 수 판정, **3상태**(⚪미마무리/✅마무리/🔵마무리 후 새 작업). 한 세션 다회 마무리 대응 — 마무리 뒤 코드변경(총 add+del 델타) 발생 시 🔵, 세션별 상태파일 `/tmp/claude-statusline-wrap-<sid>` 기준선. 아이콘만(글자 없음).
  - **2줄**: `Context 진행바 % | Usage(플랜한도) 진행바 % 🕐 5h(리셋) 📅 7d(리셋) | ⏱️ 경과`. 진행바 임계색(70/90%). 💰(비용)는 구독 사용이라 제거. rate_limits 없으면 `Usage —`·타이머 생략.
  - git상태(✎⬆✓)와 마무리(⚪✅🔵)는 **위치·모양·색** 3축으로 구분(연필/화살표 vs 원형).
  - 모의 입력(`echo '{...}' | python3 statusline.py`)으로 전 상태 검증 + ✎→⬆→✓ 실전이 커밋·푸시로 실제 전환됨 확인.
- ✅ **공식문서 참조 원칙 메모리화** — CC 인프라 작업은 `code.claude.com` **원문(llms.txt 인덱스 + URL 끝 `.md`)** 참조, 기억·추측 금지. CC 문서 전용 공식 MCP/플러그인은 **없음**(llms.txt·WebSearch로 확인) → llms.txt+`.md`가 공식·최선, 교차확인은 `claude-code-guide` 에이전트. 메모리 `cc-infra-official-docs-first.md` 저장(MEMORY.md 인덱스 등록).
- ▶ 다음: statusline은 **다음 세션부터 실제 렌더**(현 대화는 설정 적용 전 시작). 필요 시 `refreshInterval`(초단위 타이머 갱신)·⏱️ 제거·Usage 창(5h↔7d) 전환은 상단 상수/설정으로 조정.
- 🔗 커밋: 681fec1 (statusline 도입·푸시 완료)

## 2026-07-14~18 · session 7f54ae1f-ed68-48ba-8463-c8df4d912c64 (폰↔파이 Claude Code 연동 구성 → 제거, tmux 선택적 유지)

**발단**: "핸드폰에서 파이 Claude Code 세션을 이어 작업하고 싶다"(RC 말고 Cowork·웹·SSH 방식). 조사·구성 후 **실사용 빈도가 낮다고 판단해 폰 연동은 제거**하되, 노트북·데스크톱 SSH 작업용 tmux는 선택적으로 남김. ※7/17 로그(session 25178c04)에서 "진짜 미기록·기록 불요"로 남았던 그 세션이 이어져 여기서 매듭 → 미기록 해소.

- ✅ **방식 조사**(웹검색) — 폰에서 로컬 세션 잇는 공식 수단은 **Remote Control 하나뿐**. Claude Code on the web(클라우드 샌드박스=Hailo·ESP32·GPIO 접근 불가), Cowork(비개발 지식작업·Max 전용)는 이 프로젝트 부적합. 결론: **하드웨어가 걸린 작업은 SSH+tmux만이 실효**.
- ✅ **Tailscale SSH 실험 → 롤백** — `tailscale up --ssh`로 키리스 접속(길 A) 시도 후 사용자 선택으로 **키 방식(길 B)**로 전환. `tailscale up --ssh=false --hostname=pi1`로 SSH서버 비활성(Tailscale 네트워크 자체는 유지, `pi1`=100.97.0.91).
- ✅ **키 인증 구성** — 폰 Termius ED25519 공개키를 `~/.ssh/authorized_keys`에 등록(기존 Galaxy Book 키 보존). 폰 Tailscale 켜두기 권장(exit node만 끄면 배터리·속도 영향 미미).
- ✅ **tmux 도입** — 미설치라 `apt install tmux`(3.5a). 세션명 `cc`, 별칭 `alias acc='tmux attach -t cc 2>/dev/null || tmux new -s cc'`를 `.bashrc`에 추가.
- 🗑️ **폰 연동(SSH 자동 attach) 제거** — `.bashrc`의 `if [[ ... $SSH_CONNECTION ... ]]; then tmux attach ...` 5줄 삭제. 이제 어느 기기든 `ssh pi1`은 일반 셸이 뜨고, tmux는 `acc`로 **선택적** 사용.
- ✅ **유지(무해·재사용 가능)**: `acc` 별칭·tmux 패키지·폰 공개키·Tailscale 네트워크. tmux의 실효는 "긴 벤치마크·평가를 걸어두고 연결 끊겨도 파이 안에서 계속 돌게 / 기기간 세션 이어받기" — 노트북·데스크톱 SSH 작업에 값을 함.
- 💡 **교훈**: "폰 연동"의 실체는 `.bashrc` 자동 attach 5줄뿐. tmux 인프라는 폰과 무관하게 남겨도 방해 없음(안 쓰면 발동 안 함). 파이 인계: `.bashrc`는 로컬 파일 — repo 반영 없음.
- 🔗 커밋: (없음 — 전부 로컬 `~/.bashrc`·`~/.ssh`·apt. repo 변경은 이 로그 기입뿐)

## 2026-07-18 · session 5ffb1a95-93ab-4870-8be9-f217d967a578 (소급 점검 첫 실검증 — 성공 · 실누락 2건 적발)

> 아래 블록(같은 세션)에서 신설한 SKILL §2를 **실전 검증**한 결과.

- ✅ **검증 시나리오 통과** — 더미 커밋 `efdbd23`을 심고 새 세션(`f12fa975`)에서 `/세션마무리` 실행: ①더미 **탐지 성공** ②기록행위 커밋 **제외 정상(오탐 0)** ③**질문 후 대기**(임의 소급 없음 — 설계대로). 검증 후 더미 파일 삭제.
- 🎯 **보너스 — 진짜 누락 2건 최초 적발**: 7/17 데스크톱 config v2 전환 세션(`818c71c`·`31cc5e4`)이 **세션마무리 없이 종료**했던 것을 발견 → `작업로그.md`에 **소급 블록**(`session 미상(소급 — 커밋 기반)`)으로 기록. 안전망이 첫 실행에서 실제 값어치 증명.
- ✅ **노이즈 원 제거** — grep 기반 점검이라 "마무리는 했으나 🔗줄 해시 미기입" 커밋 8건이 매번 재검출될 문제 확인 → 해당 블록(7/10·7/13·7/16 데스크톱) 🔗줄에 해시 보충 + **SKILL §2에 제외·보충 규칙 명문화**("해시 미기입은 소급 블록이 아니라 🔗 보충").
- 🔗 커밋: `f5db7f8`(소급 블록·해시 보충·규칙 보강·더미 삭제) — ※이 CC로그 기입 커밋 자체는 기록행위라 점검 제외 대상.

## 2026-07-18 · session 5ffb1a95-93ab-4870-8be9-f217d967a578 (세션마무리 스킬 개선 — 미기록 커밋 소급 점검 신설)

**발단**: 사용자 질문 "이전 세션이 마무리 없이 끝났으면 다음 세션 마무리 때 그 커밋도 기록되나?" → 답 = 안 됨(자동매핑 훅은 7/17 폐기, 새 세션은 이전 대화 컨텍스트 없음) → **사용자 제안으로 스킬에 안전망 신설**.

- ✅ **`session-wrap` SKILL.md에 §2 "미기록 커밋 소급 점검" 신설**(기존 2~5단계 → 3~6 재번호) — 마무리 시 양 repo `git log` 해시를 작업로그 2종에서 grep해 미기록 커밋을 찾고, 발견 시 **사용자에게 "같이 기록할까요?" 확인 후** 별도 소급 블록(`(소급 — 커밋 기반)`, ID 불확실 시 `미상(소급)`)으로 기록. **임의 소급 금지** + "커밋 메시지 기반 — 무커밋 작업·중단 사유는 유실" 한계 명시 의무. 제외 규칙: 현재 세션 커밋·기록 행위 자체 커밋.
- ✅ 동기화: `/세션마무리` 커맨드 단계 열거(6단계) · CLAUDE.md 세션마무리 규칙에 한 구절(자동매핑 폐기 후 유일한 누락 안전망).
- ※ 설계 성격: 훅이 아니라 **스킬 절차 단계** — 마무리 시점에만 실행되므로 상시 오버헤드 0, 폐기된 SessionEnd 훅과 달리 "물어보고 기록"이라 무분류 축적 문제 없음.
- 🔗 커밋: `4cf2516`

## 2026-07-17 · session 25178c04-cfe9-46ce-9065-d6efeea3eec9 (CC 인프라 전수 기능검증 → 훅 2종 폐기)

**발단**: "문서 기입·세션마무리를 안 한 세션이 있나?" 점검 → 미커밋 자동매핑 14줄 발견 → "커밋만 하면 되나?"라는 사용자 의문 → **인프라 전체를 실증 검증**하기로 확대.

- ✅ **미기록 세션 점검(결론: 실질 누락 없음)** — 세션파일 17개 × 로그 대조. 오늘자 3개(`06831a26`·`c98785f8`·`7f01c29e`)는 **pre-commit이 띄운 점검기 스텁**(사람 세션 아님), `20a1dcc5`는 `/clear`→`/exit` 스텁. **`7f54ae1f`(7/14 Termius·Tailscale 모바일 SSH, 발화 35개)만 진짜 미기록**이나 **기록 불요 판단**(사용자). 6월 작업은 `작업로그.md`가 7/1 신설이라 세션블록 없음 — 결과는 CLAUDE.md·통합문서에 반영됨(소급 불요). Rpi5 커밋 20건 대조: 해시 미기입 3건뿐이고 내용은 전부 서술로 커버됨.
- ✅ **⭐ CC 인프라 5종 전수 기능검증 — "값을 하고 있나"를 실측**
  | 자산 | 실측 | 판정 |
  |---|---|---|
  | `session-worklog-brief.sh`+`sync-check` | 배너 정상 렌더·"로컬변경" 정확 탐지, 매 세션 실사용 | ✅ 존치 |
  | `session-wrap`/`/세션마무리` | 세션마무리 커밋 14건 → **세션블록 17개**(작업로그 11+CC 6) = 프로젝트 서사의 본체 | ✅ 존치 |
  | `session-prune-stubs.sh` | 자동프룬 9건 **오탐 0**(전부 발화 1개) | ✅ 존치(단 아래 루프) |
  | `session-worklog-commit.sh` | 산출 45건 중 고유정보 **6건(13%)**, 나머지 중복·자기참조 | 🗑️ 폐기 |
  | `.githooks/pre-commit` | **12회 실행·적발 0건** | 🗑️ 폐기 |
- ✅ **🗑️ SessionEnd 훅 폐기** — ①고유정보 13% ②**"세션마무리 누락을 구제한 사례 0건"** — 그 6건조차 세션마무리를 *한* 세션의 해시 보완이었고, 진짜 누락 세션(`7f54ae1f`)은 **커밋이 없어 훅도 무력**(=보험이 필요할 때 작동 안 하는 보험) ③**자기참조 증식**(매핑을 커밋하면 그 커밋이 다음 매핑 대상 → 무한) ④도입 전제 변화: 7/1 도입 시엔 세션마무리 의식이 미정착(스킬은 7/3 신설)이라 역할분담이 성립했으나, 정착 후엔 순중복.
- ✅ **🗑️ pre-commit 문서정합성 훅 폐기** — 12회 0적발. **오탐 억제(7/14 엄격화)와 탐지력의 트레이드오프에서 탐지력이 0으로 수렴**. 구 `doc-consistency-check.sh`(7/1 제거)에 이은 **같은 목표 두 번째 실패** → 훅으로는 안 된다고 결론. 문서 drift 방어는 **단일정본 규칙 + 편집 규율**이 전담(원래도 1차 방어는 이것·훅은 자칭 "얕은 안전망"이었음).
- ✅ **🔁 닫힌 루프 발견** — 자동프룬 9건이 **전부 pre-commit이 흘린 자기 스텁**이었다. pre-commit이 `claude -p` 호출마다 세션파일을 남기고 prune이 치우는 구조 → pre-commit 폐기로 prune의 일감 대부분이 함께 소멸(prune 본래 목적인 원격제어 스텁 청소만 남음).
- ✅ **💡 §3.0 제1원칙 신설**(작업문서) — **"훅을 만들기 전에 사람 규율로 이미 되는 일인지 묻는다."** 폐기 3건은 타이밍·구현이 틀려서가 아니라 **사람 규율이 하던 일을 기계로 중복**해서 죽었다. 판별질문 = *"없으면 무엇을 잃나?"* → "보험"이면 **지급 실적부터 측정**. 훅에도 유지비(중복산출·자기증식·스텁쓰레기·머신별 설정마찰)가 있어 값을 못 하면 순손실.
- ✅ **SessionEnd 발동조건 문서화** — `/exit`뿐 아니라 `clear`·`resume`·`logout`·`prompt_input_exit`·`bypass_permissions_disabled`·`other` 전부(matcher 미지정 시). **`/clear` 한 번에도 돈다** — 미커밋 14줄의 실제 출처가 이것이었다(직전 세션 `5ffb1a95`가 `/clear`로 종료되며 append).
- ✅ **정리 실행** — `session-worklog-commit.sh`·`.githooks/`(pre-commit+README) 삭제, `settings.json` SessionEnd 등록 제거, `brief.sh` 시작HEAD 기록부 제거, `.worklog-head-*` 잔여 제거, `git config --unset core.hooksPath`. **검증**: bash 문법 3/3 OK·settings.json 유효(SessionStart만)·brief 실행 배너 정상·HEAD파일 재생성 없음.
- ✅ **문서 정합** — `작업로그.md` 🔧 섹션 **동결 보존**(제목→"폐기됨"+경위 주석, 과거 45줄 유지·미커밋 14줄은 폐기) + 헤더 훅 서술 정정 / `CLAUDE.md`·작업문서 표·§3.1·§3.5·§3.6 갱신 / **`.githooks` 마찰 교훈**(Pi#1이 설정 누락으로 2주간 미작동) → "같은 값이면 `.claude/` 쪽을 택하라"로 원칙화.
- ✅ **곁다리 정정** — `작업로그.md:181`의 `6de62507`은 **`.trash`에 있어 resume 불가**(7/13 중복정리 때 이동). 원본 `b83e5757` 참조 주석 추가.
- ⚠️ **양 머신 후속**: 데스크톱·sop-pi-2는 `git pull` 후 **`git config --unset core.hooksPath`** 각자 1회 필요(로컬 config라 pull로 안 지워짐 — 안 하면 훅 파일이 없어 조용히 no-op이지만 설정만 잔존).
- ▶ 다음: (CC 인프라 개선 시) — **§3.0 제1원칙을 먼저 통과시킬 것**.
- 🔗 커밋: `4c22e65`
- ※ 이 세션은 CC 인프라 전용 — 프로젝트 작업 없음.

## 2026-07-14 · session 00c0fb24-7af3-4000-8668-2fbdb19e57aa (Fable 점검 — CC 인프라 버그 수정)

> ※ **Fable 5 모델** 세션. 이번 점검부터 커밋 트레일러 = **실제 작업 모델명**(CLAUDE.md 규칙 갱신).

- ✅ **`session-prune-stubs.sh` 버그 3건** (가짜 세션 dry-run으로 전부 검증):
  - 🔴 `.trash` 30일 보존 약속이 거짓 — `mv`가 mtime 보존 → 31일+ 방치 스텁은 **이동 직후 같은 실행에서 즉시 영구삭제**(복구 창 0). 이동 후 `touch`로 진입 시각 기록.
  - 현재 세션 보호 무효 — `CLAUDE_SESSION_ID`(오타)를 읽어 `cur=""` 상시. `CLAUDE_CODE_SESSION_ID` + stdin 폴백(다른 훅과 동일 규약)으로 교정.
  - `grep -c || echo 0` 이중값(`"0\n0"`) → 정수비교 에러로 **ua=0 빈 스텁이 영원히 정리 안 됨**. `|| true`로 교정.
- ✅ **`session-worklog-commit.sh` fork 중복 기록 해소** — fork/resume 세션 쌍이 같은 시작 HEAD를 공유해 동일 커밋을 2~3벌 기록하던 문제(작업로그 하단 🔧 섹션에서 실증) → 이미 로그에 있는 해시는 스킵. + head 파일 해시 검증·`--` 추가(옵션 해석 방지). 임시 repo fork 시나리오로 검증.
- ✅ **권한 축소** — `settings.json`에서 `Bash(find:*)` 자동승인 제거(`find -delete`·`-exec rm`이 무확인 통과하던 구멍).
- ✅ `.gitignore` 보강 — 루트 `.env`/`*.env`(비밀키 유출 방지, `!*.env.example`) + `.claude/.startup-sync.tmp`.
- ✅ **pre-commit 전송 범위 축소(diff-only)** — 매 커밋 문서 전문+memory 전체를 API 전송하던 것을 **diff(-U20)만**으로(비용·지연·인젝션 면적↓). 대가 = 교차 문서 대조 불가(얕은 안전망 강등, 1차 방어는 단일정본 규칙). 임시 repo 모순 diff로 실검증(경고 출력·exit 0 확인).
- 🔴 **이 파이(Pi#1)에 `core.hooksPath` 미설정 발견** — pre-commit 훅이 **지금까지 이 머신에서 한 번도 안 돌고 있었음**(클론 후 1회 설정 누락). `git config core.hooksPath .githooks` 설정 완료. ⚠️ **sop-pi-2·데스크톱도 각자 확인 필요**(로컬 config라 머신마다).
- 🔗 커밋: sop-project (이 커밋)
- ※ 이 세션의 프로젝트 수정(인터락·EMO·QImage·문서 정합성)은 `docs/작업로그.md` 참조

## 2026-07-14 · session efc6fc8b-d6e9-4420-a76f-a5c3480f49f0 (Antigravity CLI 설치)
- ✅ **Antigravity CLI 1.1.2 설치**(Pi#1) — 공식 스크립트 `curl -fsSL https://antigravity.google/cli/install.sh | bash`. linux_arm64 자동 감지·체크섬 검증 통과. 바이너리 `~/.local/bin/agy`, PATH는 스크립트가 `~/.bashrc`·`~/.profile`에 자동 추가.
- ✅ Google 계정 로그인 + 대화 동작 확인(사용자 직접, 실행 경로 sop-project).
- ⚠️ `sop-project` 안에서 `agy` 실행 시 Antigravity 에이전트도 repo 파일을 수정할 수 있음 — Claude Code와 병행 시 같은 파일 동시 편집 주의.
- ✅ 양 repo 푸시 상태 점검 — sop-project·Rpi5 모두 원격과 동기화 확인(병행 Fable 점검 세션이 이 세션의 `4df284f` 포함 전부 푸시 완료, 추가 푸시 불요).
- 🔗 커밋: 4df284f(이 기록. 설치 자체는 로컬 `~/.local/bin` — repo 반영 없음)

## 2026-07-03 · session 22149442-a0c0-4789-810a-26dcb8c5f91c (Roboflow·Drive MCP 연동)
- ✅ **Roboflow MCP 연동** — `claude mcp add -s user roboflow --transport http https://mcp.roboflow.com/mcp` (OAuth). 30+ 툴 로드, 워크스페이스 `eung-min` 접근 확인. console_v2용 데이터셋(`object-detection-ycjp6`) 조회에 활용.
  - ⚠️ 세션 도중 추가한 MCP는 `/mcp` 패널에 안 보임 → **세션 재시작 후** 인증해야 함(등록은 user config `~/.claude.json`에 즉시 반영).
- ✅ **Google Drive MCP 활용** — 기연결됨(claude.ai). `button_dataset.zip`·학습결과(`results.csv`·`.pt`·`.onnx`·`.hef`) 조회로 B4 원인 재분석 근거 수집.
- 💡 Roboflow MCP는 학습·라벨링까지만 — 최종 배포는 Hailo .hef(DFC 별도 파이프라인). 파이 인계: user config라 `~/.claude.json`에 있음(머신별 재인증 필요).
- ▶ 다음: (필요 시 Roboflow autolabel·재학습에 MCP 활용)
- 🔗 커밋: (MCP 설정은 로컬 `~/.claude.json` — repo 커밋 아님)
- ※ 이 세션의 프로젝트 작업(B4 원인 재분석·문서 정정)은 `docs/작업로그.md` 참조

## 2026-07-13 · session b83e5757-e0a2-4242-af39-9664b2a87abb (ESP32 WiFi 인프라 · 세션 중복 정리)

- ✅ **🔌 ESP32 다중 SSID 우선순위 연결**(Rpi5 4b2d143) — 장소를 옮길 때마다 시리얼로 WiFi를 재주입해야 했던 문제 해결. 기존 펌웨어는 NVS에 SSID **1쌍만** 저장하고 그것만 시도(실패 시 재부팅 루프).
  - `connectWiFiByPriority()`: 주변 SSID를 **스캔**해 `wifi_credentials.h` 배열 순서대로 연결. **신호 세기가 아니라 우선순위 기준**(Jason → Eung Min).
  - 🔑 **파이의 NetworkManager 우선순위도 동일하게 설정**(`autoconnect-priority` Jason 10 / Eung Min 5). **규칙이 달라지면 파이와 ESP32가 서로 다른 네트워크에 붙어 TCP 직결이 불가능**해진다 — 사용자가 정확히 지적한 조건.
  - 자격증명은 `wifi_credentials.h`로 분리 + **gitignore**(비번 미커밋). 템플릿 `.example` 제공.
- ✅ **🖱️ 바탕화면 바로가기 2종** — 명령어 입력 없이 GUI로. `flash_esp32.sh`(포트 자동탐지 → 컴파일 → 업로드 → **IP 자동기록**) / `update_ip.sh`(굽지 않고 시리얼만 읽어 `.camera_ip` 갱신, 수 초). 공용 `read_esp32_ip.sh`는 **파이와 서브넷 불일치 시 경고**.
- ⚠️ **PSRAM=opi 필수 — 함정에 실제로 빠짐**. FQBN 기본값이 `PSRAM=disabled`라 첫 업로드 후 카메라 프레임버퍼 malloc 실패로 **부팅 루프**(`cam_dma_config: frame buffer malloc failed`). `flash_esp32.sh`의 FQBN에 명시해 재발 방지.
- ✅ **arduino-cli ESP32 코어 설치**(esp32:esp32 3.3.10) — 이 파이에는 UNO R4 코어만 있었음(ESP32는 다른 환경에서 굽던 것).
- ✅ **세션 중복 정리** — 같은 대화가 3벌로 분기(resume 시 새 파일 생성). 시작 타임스탬프가 동일하고 44번째 발화까지 내용이 같음. **원본 = `b83e5757`**(가장 진도 앞섬). A `6de62507`·B `fde93b40`는 **사용자 지시 전수 비교로 부분집합임을 확인 후** `.trash` 이동(복구 가능).
- 💡 **교훈**: 파일 내부 `sessionId`는 각자 자기 것으로 재작성되므로 **부모-자식 판별 불가** → 타임스탬프·내용 포함관계로만 가려낼 수 있다.
- ▶ 다음: (필요 시 Roboflow MCP를 라벨링에 활용)
- 🔗 커밋: Rpi5 4b2d143 (펌웨어·스크립트·바로가기)
- ※ 이 세션의 프로젝트 작업(B4 파랑스티커·데이터 촬영·정반사 정정)은 `docs/작업로그.md` 참조

## 2026-07-03 · session 02e16ca9-3c02-4bdb-9d6b-9424b83b2fac (클로드 코드 세션 관리)
- ✅ **resume 목록 오염 원인 규명** — 원격제어(웹/모바일 앱) 접속 시 Claude Code가 `bridge-session`·`queue-operation`·`ai-title` 등 **껍데기 세션파일**을 남기는 게 "복사된 세션"의 실체. (마커 타입은 정상 세션에도 다 있어 무의미 → 판별자는 **실제 대화수 ua**뿐: 쓰레기 ua≤3 vs 정상 ua≥40, 넓은 마진)
- ✅ 원격제어 스텁 6개 수동 삭제(백업 후). 포크쌍 `75243594↔f9d862eb`(55메시지 공유 후 분기, f9d862eb가 최신 본류) 확인·보존.
- ✅ **자동 정리 훅 신설** `.claude/hooks/session-prune-stubs.sh` (SessionStart 등록) — `ua≤5 && 60분초과 && 현재세션 아님` → `.trash/`로 **이동**(하드삭제 아님·30일 후 자동비움). 60분 가드로 갓 시작한 정상 세션 보호. 실전 검증: tiny 13개 이동, 현재세션·실작업 전부 보존.
- ⚠️ 원격 스텁 생성 자체는 앱 내부 동작이라 못 막음 → 60분 뒤 자동 정리로 대응.
- ✅ **"세션 마무리" 스킬 신설** `.claude/skills/session-wrap/SKILL.md` — 4분류 정리·라우팅 절차를 코드화(첫 프로젝트 스킬).
- ✅ **명칭·정의 정정**: "오늘 마무리" → **"세션 마무리"**. 정의를 *하루 끝·작업 종료*가 아니라 ***한 작업 단위(A작업)가 논리적으로 끝난 시점***(하루 여러 번 가능)으로 재정의. CLAUDE.md·CC작업문서·작업로그.md·훅 주석 2곳 표현 통일(과거 저널 항목은 보존).
- ✅ **한글 슬래시 커맨드 신설** `.claude/commands/세션마무리.md` → **`/세션마무리`**(붙여쓰기, 슬래시는 공백 불가). 절차는 SKILL.md 참조(단일정본). 스킬(말 트리거)+커맨드(슬래시) 병행.
- ✅ **SessionStart 출력을 배너로** — 훅 stdout을 순수 JSON(`systemMessage`)으로 내면 사용자에게 보이는 배너로 뜸(평문 echo는 회색 노트로 스침). 먼저 프룬 훅에 적용·실측 확인.
- ✅ **세션 시작 정보 표(表) 배너 통합** — 원격 동기화 + 이어하기(⏸/▶) + session_id를 **하나의 CJK정렬 박스 표**로. 공용 헬퍼 `_banner.py`(East Asian Width 폭계산·박스렌더·JSON인코딩) 신설.
- ✅ **경쟁조건 버그 수정** — Claude Code가 SessionStart 훅을 **병렬 실행** → 별도 훅 간 tmp 핸드오프 경쟁으로 🔄 동기화 행 누락. `sync-check`를 settings에서 빼고 `brief`가 **직접 순차 호출**하도록 변경(순서 보장). brief timeout 30.
- ✅ **긴 값 잘림 → 셀 내 줄바꿈(word-wrap)** — `▶ 다음` 등 긴 텍스트를 `…` 절단 대신 46폭으로 접어 전체 내용 표시. 표 폭 유지→좁은 터미널 박스 안 깨짐.
- ▶ 다음: (CC 인프라 개선 시)
- 🔗 커밋: ed17ee6(resume 정리 훅) · 7e6d39e(세션마무리 스킬+명칭정정) · 37efb1a(/세션마무리 커맨드) · dcf9b36(로그확정) · 98a4944(프룬 배너) · 9ec16f9(표 배너 통합) · 34df9d0(경쟁조건 수정) · 2ecc9f8(줄바꿈) · (이 커밋: 세션 마무리 로그)
- 💡 파이 인계: `git pull`만 하면 적용(SessionStart 배너·프룬 훅 + `/세션마무리` 커맨드·`session-wrap` 스킬은 새 세션부터). 각 머신이 자기 로컬 세션만 정리.

## 2026-07-01~03 · session 75243594-cf0a-4252-928b-51d1f5630c9b (이어서 resume: f9d862eb-ccc1-4a0c-a7bf-4904959fa3e6)
- ✅ LLM Wiki 적합성 검토 → 전면 전환 **보류** 결론(규모·결합도·시점), 메모리화
- ✅ 구 `doc-consistency-check.sh` 훅 제거 (SessionStart 타이밍상 예방 불가·중복)
- ✅ 메모리 ↔ 통합문서 정합 점검 (불일치 0)
- ✅ **세션 작업로그 시스템 구축** — brief(이어하기 브리핑)·commit(커밋 자동매핑) 훅 + "오늘 마무리" 의식
- ✅ **문서 정합성 pre-commit 훅** 구축(`.githooks/pre-commit`, LLM diff앵커) + 프롬프트 정밀도 튜닝(오탐 억제)
- ✅ 세션ID 전체 UUID 통일 · 브리핑 마커 오탐 수정(`^-? *(⏸|▶)`)
- ✅ 별도 `~/claude-code` 폴더 실험 → **폐기**(자동기록 폴더별 마찰·1인 단일프로젝트엔 과함, 경계커밋 3b6cc71 되돌림)
- ✅ CC 문서를 프로젝트와 **최종 2파일 분리**(옵션2): `cc작업기록.md` → `claude-code-작업문서.md`(설명서) 개명 + `claude-code-작업로그.md`(이 파일·CC 로그) 신설. `작업로그.md`는 프로젝트 전용으로 정리.
- ▶ 다음: (CC 인프라 개선 시)
- 🔗 커밋: ee4f949 · e9e4705 · df9f3b8 · b08bba1 · 8f3479a · 20071aa · bd1e24b · 3b6cc71 · 56dc870
- 💡 파이 인계: `git pull` 후 `git config core.hooksPath .githooks` 1회(pre-commit 훅 활성화)
