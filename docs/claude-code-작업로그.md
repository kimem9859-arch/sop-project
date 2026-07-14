# Claude Code 작업로그 (CC 작업 시간순)

> **Claude Code 관련 작업(훅·도구·인프라·작업방식 개선)** 을 시간순으로 남기는 로그.
> 프로젝트 작업(`작업로그.md`)과 **분리**. 설명서·원칙은 `claude-code-작업문서.md` 참조.
> **표기**: ✅ 완료 / ⏸ 중단 / ▶ 다음 / 🔗 커밋 · 세션 ID = 전체 UUID.

---

## 2026-07-14 · session efc6fc8b-d6e9-4420-a76f-a5c3480f49f0 (Antigravity CLI 설치)
- ✅ **Antigravity CLI 1.1.2 설치**(Pi#1) — 공식 스크립트 `curl -fsSL https://antigravity.google/cli/install.sh | bash`. linux_arm64 자동 감지·체크섬 검증 통과. 바이너리 `~/.local/bin/agy`, PATH는 스크립트가 `~/.bashrc`·`~/.profile`에 자동 추가.
- ✅ Google 계정 로그인 + 대화 동작 확인(사용자 직접, 실행 경로 sop-project).
- ⚠️ `sop-project` 안에서 `agy` 실행 시 Antigravity 에이전트도 repo 파일을 수정할 수 있음 — Claude Code와 병행 시 같은 파일 동시 편집 주의.
- 🔗 커밋: (설치는 로컬 `~/.local/bin` — repo 커밋 아님)

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
