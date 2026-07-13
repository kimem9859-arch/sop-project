# CLAUDE.md — SOP 가디언 작업 지침

> 데스크톱·라즈베리파이 양쪽 Claude Code가 자동 로드하는 **공유 두뇌**.
> 설계 사양은 여기서 정의하지 않는다 — 정본은 `docs/통합수행설계문서_전체_섹션1-15.md`.
> Claude Code 작업은 프로젝트 작업과 분리 기록: `docs/claude-code-작업로그.md`(CC 시간순 로그) + `docs/claude-code-작업문서.md`(CC 설명서·원칙). 프로젝트 작업 로그는 `docs/작업로그.md`.

## 프로젝트
**1인칭 Vision AI × 웨어러블 기반 작업자 SOP 순서 위반 실시간 감지·차단 시스템.** PECVD 정비(PM)에서 작업자의 순서 위반(휴먼 에러)을 버튼 누르기 직전에 사전 감지·차단. 콘솔은 **시연용 모조품**(실제 PECVD 기능 없음·타워램프 시각화는 부차적) — 핵심은 **비전 AI 순서위반 감지·차단**. (안전은 효과 → 프레이밍 B)

## 정본 (Source of Truth)
- **설계·사양·배경·SOP·하드웨어·KPI = `docs/통합수행설계문서_전체_섹션1-15.md`** (단일 정본). 작업 시 원문을 읽고 진행.
- 폴더 지도·실행법 = `README.md`. 트랙별 상세 = `dev/*/README.md`.
- 이 CLAUDE.md = "어떻게 일하나"(규칙·흐름·현황)만. 사양은 통합문서로 위임.

## 두 환경의 역할 (런타임 분리 / 지식 공유)
| | 🖥️ 데스크톱 | 🍓 라즈베리파이 (Pi#1 = 주 작업기) | 🍓 sop-pi-2 |
|---|---|---|---|
| 역할 | 설계·통합문서 편집 · PoC(x86) · 발표 제작 | Rpi5 코드 실행·실HW 테스트·Hailo · 통합문서 편집 | Pi#1 복제본(예비/병행). `ssh pi2`(공유기 192.168.1.9) |
| 클론 | `sop-project` | `sop-project` + 그 안 `Rpi5/`(엄브렐러) | Pi#1과 동일 구성 |

## ⭐ 통합문서 = 단일 정본, 양방향 동기화
파이(개발·테스트 중 수정)와 데스크톱(발표 제작)에서 둘 다 편집·사용. **사본 금지**(병합 충돌).
- 파이: 수정 → `git commit && push` (sop-project)
- 데스크톱: `git pull` → 최신본으로 발표 제작

## Rpi5 = 별도 repo (파이 런타임 코드)
- `github.com/kimem9859-arch/Rpi5.git`, 작업 브랜치 **`feature/fsm-interlock`** (최신 본류). 구 브랜치 정리 완료.
- 파이 셋업(엄브렐러 재현):
  ```bash
  git clone https://github.com/kimem9859-arch/sop-project.git ~/sop-project
  cd ~/sop-project
  git clone -b feature/fsm-interlock https://github.com/kimem9859-arch/Rpi5.git Rpi5
  cd ~/sop-project && claude        # 통합문서 + 코드 한자리
  ```
- `Rpi5/`는 sop-project에서 gitignore(별도 repo). 런타임 맥락은 `Rpi5/CLAUDE.md`.

## 모델 (네이밍 규약 정본 §7.1, 3단계)
- `person_v1.pt` 초기 검증(완료) → **`console_v1`** 버튼검출 **1차 검증 테스트**(5클래스 B1~B4+EMO, .hef 빌드완료·파이 실추론·벤치마크 완료 — B1·B2·B3·EMO 검출 동작, **B4 미탐지** 확인) → `console_v2` 최종(B4 해결 위해 재학습 확정).
- 버튼 클래스맵·Pi 추론 규격(uint8 640·HailoRT NMS·4.x): `dev/ai_model/README.md`.
- ※ **측정 수치 정본 = 통합문서 §10**(학습 mAP·실추론 FPS 등). 여기·dev/README는 상태·결정만, 수치는 §10 참조.

## PoC 실행 (Step1, 데스크톱)
루트에서: `./dev/poc/run.sh poc_data/clips/ --rois dev/poc/rois.json --out dev/poc/out`
- 머신별 차이는 `dev/poc/SETUP.md`. 환경자산 `.poc_venv`·`poc_data`·`.syslibs`는 gitignore → 머신마다 재구축.

## 작업·커밋 규칙
- **⭐ 세션 시작 = 원격 먼저**: 양 머신이 같은 repo를 편집하므로, 로컬이 최신이라 가정 금지. 작업 전 `git fetch`로 ahead/behind 확인 후 필요시 `git pull`. (SessionStart 훅 `.claude/hooks/session-sync-check.sh`가 sop-project·Rpi5 양쪽을 자동 점검·보고 — 훅이 안 돌면 수동으로.)
- **자동 점검 인프라(훅)**: SessionStart ① `session-worklog-brief.sh`(**세션 시작 표 배너** = 원격 동기화 + ⏸중단·▶다음 이어하기 + 현재 session_id 주입을 한 표로 표시; 내부에서 `session-sync-check.sh`를 **순차 호출**[SessionStart 병렬실행 경쟁 회피]하고 `_banner.py`로 CJK정렬 표+systemMessage 렌더) ② `session-prune-stubs.sh`(resume 목록의 tiny/원격제어 스텁 세션을 `.trash`로 정리, systemMessage 배너). SessionEnd ③ `session-worklog-commit.sh`(그 세션이 만든 커밋을 `docs/작업로그.md`에 자동 매핑). **pre-commit ④ `.githooks/pre-commit`**(문서 간 정합성 — `CLAUDE.md`·`README.md`·`docs/*.md` 커밋 시 diff를 앵커로 다른 문서·memory와의 모순을 `claude -p`(Haiku)가 대조·경고. **warn-only·비차단**, `SKIP_DOCSYNC=1`로 스킵). ①②③은 `.claude/settings.json` 등록, ④는 **클론 후 1회 `git config core.hooksPath .githooks` 필요**(`.githooks/README.md`). ④는 구 `doc-consistency-check.sh`(SessionStart grep·2026-07-01 제거)를 **다른 설계로 대체** — 타이밍(세션시작→커밋시점)·LLM 의미대조·diff앵커로 교정. 문서 drift의 1차 방어는 여전히 **아래 단일정본 규칙 + 편집 규율**, ④는 그 안전망. 권한 허용목록은 `.claude/settings.json`. **전부 repo 공유**(양 머신 동일).
- **⭐ "세션 마무리" 의식** (슬래시 `/세션마무리` 또는 스킬 `session-wrap`으로 절차화): 사용자가 **`/세션마무리`** 를 치거나 **"세션 마무리"**(또는 "세션 정리")라고 말하면 이번 세션 작업을 4분류(✅완료/⏸중단/▶다음/🔗커밋)로 정리해 **현재 session_id 태그와 함께** 기록한다(브리핑 훅 ID 사용). ※**정의 = 하루의 끝·작업 종료가 아니라 "한 세션/작업 단위(A작업)가 논리적으로 끝난 시점"** — 하루에 여러 번 가능(A작업 끝 → 마무리, B작업 시작). **프로젝트 작업 → `docs/작업로그.md`, Claude Code 작업(훅·도구·인프라) → `docs/claude-code-작업로그.md`** 로 나눠 적는다(둘 다면 양쪽에). (SessionEnd 자동 커밋매핑은 성격 구분 못 해 `작업로그.md` 하단에 전체 무분류로 쌓임 — 사람 기록만 분리.) 로그=시간순 저널이라 CLAUDE.md「현재 상태」(스냅샷)와 역할 분리·공존. 상세 절차는 `.claude/skills/session-wrap/SKILL.md`.
- 사양은 통합문서에만(README/CLAUDE 복붙 금지 → drift). 폴더·경로 바꾸면 README·CLAUDE 같이 갱신.
- **⭐ 측정·사양 수치 = 통합문서 단일 정본**: mAP·FPS·해상도 등 측정값은 통합문서 §10(설계값은 해당 §)에만 두고, 운영문서(CLAUDE·기준문서 제외 dev/README)는 **"§X 참조" 포인터만**(복제 금지). 수치가 바뀌면 통합문서만 고친다. (기준문서는 나침반이라 요약 보유 허용)
- **⭐ 큰/되돌리기 어려운 변경 전 = 계획·확인 먼저**: 다중 파일 수정·구조(번호·파일명) 변경·삭제·외부 전송은 곧장 실행하지 말고, 계획(EnterPlanMode) 또는 A/B 선택지로 **먼저 확인**받는다. 단순·국소 수정은 바로 진행.
- **커밋 구분**: 코드 수정 → 해당 repo(파이 코드는 `Rpi5`로) / 통합문서·설계 → `sop-project`로.
- 커밋 끝에 `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. push는 사용자 요청 시.

## 현재 상태 · 다음 작업 (2026-06-29)
- ✅ Step1 PoC 완료(색 ROI, 정상 100%·스침 오탐 0).
- ✅ 폴더 정리·구조 재편·정본 모델 네이밍 3단계화.
- ✅ **console_v1.hef 빌드 완료**(버튼 5클래스, level0 양자화 — 학습 수치 §10.5). → `dev/ai_model/`.
- ✅ recipe.json 단계라벨 PM 시퀀스 동기화(Rpi5).
- ✅ **console_v1 파이 통합·실추론·벤치마크 완료** — B1·B2·B3·EMO 검출 동작 확인. ESP32 TCP 수신이 FPS 상한(실측값 §10.6). **B4 완전 미탐지 확인 → console_v2 재학습 확정**. ※ **B4 미탐지 원인 정정(2026-07-03)**: 양자화 원인 **반증**(에뮬레이션서 int8 .hef가 B4 0.95 검출) → **카메라 입력 품질(주)·모델 저대비(부) 이중 가설·미확정**(통합문서 §10.7).
- ✅ `Rpi5/Demo/test/bench_detector.py` 작성 + 2회 실측(4종 CSV + 영상). test-artifacts 브랜치 보관.
- ✅ Hailo-8 드라이버 재빌드(kernel 6.18.29 대응). `/etc/modules-load.d/hailo.conf`로 자동로드 설정.
- ✅ MediaPipe 호환성 문제 확인: hailo_platform은 Python 3.13 전용, mediapipe는 aarch64/3.13 미지원 → **HOI 검증 보류**(PoC 단계 YOLO 탐지만 확인).
- ✅ **트랙 A 인터락 코드 완료(2026-06-13, Rpi5 `feature/fsm-interlock`)** — 출력부 `interlock.py`(pyserial→Arduino UNO R4 **Minima** 릴레이, RUN/WARN/BLOCK+ACK, 실연결·ACK 검증) + 입력부 `gpio_input.py`(버튼 B1~B4·EMO→FSM, gpiozero Mock 검증) + GUI `⏻ 시스템 종료`. 전원부 = 결선도 §8(멀티탭 마스터·GUI 안전종료). **입력→판정→출력 코드상 완성**(실물 결선만 남음).
- ✅ **목적 프레이밍 B 정렬(2026-06-13)** — '작업자 안전'→**'휴먼 에러(순서 위반) 사전 예방'**(안전은 효과). 통합문서 §1·§3 과장표현(Fail-Safe·원천차단) 정정.
- ✅ **중간점검 발표 완료** — 발표자료(슬라이드)는 **데스크톱 보관**(파이/ repo 미반영). 아웃라인·대본 초안만 repo `docs/발표/`에 있음.
- ✅ **발표자료 내용 통합문서 역반영 완료(2026-06-29, 커밋 f6218f0)** — 중간점검 발표자료 내용을 통합문서에 반영(§1 제목·§2.1 사고사례·§3 4축 비교표·콘솔명 AI 콘솔·§4.4 타이머·§7 console_v2 SW 목표치·§11·§12) + PoC 용어 재정의. (2026-07-01 완료 확인·stale 표기 정정)
- ✅ **USB/ESP32 카메라 B4 재테스트 완료(2026-07-10, §10.8·§10.9)** — 원인 확정(주가설+부가설 둘 다 참). 계측도구 정비: `bench_detector.py` `--source`·rawdet 로깅·`--lock-exposure`, `tune_exposure.py` 신설.
- **▶ 최우선 다음 = console_v2 재학습** — B4 해결의 핵심은 **블러·JPEG압축·저해상도 증강 학습**(고주파 의존 제거, §10.9). + 데이터 보강(클래스당 1000장)·**정반사 조건 이미지 포함**(§10.8)·640 해상도 확정. GPU 환경에서 재학습·DFC 변환. ※ 카메라 경로 개선(JPEG q≥95)만으로는 여유 없음.
- 트랙 A 인터락 코드 ✅완료 → **다음 = 실물 결선 + E2E**(버튼 GPIO·릴레이·타워램프 배선, 사용자). Step3 통합 → 4 E2E → 5 데모·발표.

## 미해결
- **입력 해상도**: console_v1은 640 빌드·검증 완료. **결정 규칙(2026-06-13)**: MediaPipe 포함 FPS 실측 후 — 15fps 목표 미달이면 QVGA(320) 고려, 충분하면 640 유지+SW 최적화. console_v2 재학습 시 확정(잠정 640). (상세 §7.1)
- ✅ **B4 미탐지 원인 확정(2026-07-10, §10.9)** — 양자화 반증(§10.7) → 통제된 2차 대조 측정(각 400프레임, 정지장면·노출고정)에서 **B1·B2·B3·EMO는 양쪽 97~100% 동일, B4만 ESP32 0% / USB 100%**. **이중 가설 둘 다 참**: ①**주가설=카메라 입력 품질 확정**(ESP32 저해상도+JPEG) ②**부가설=모델 B4 취약 실증** — B4 표현이 고주파 경계에만 의존해 **σ0.8 블러·JPEG q≤50·5% 리샘플**로 붕괴(q90에서도 median 0.629 < 임계 0.65). 근본 원인 = **검은 버튼 on 검은 패널**(대비 ~15/255). → console_v2에 **블러·압축·저해상도 증강 필수**.
- ✅ **raw 저장·재분석 도구 완비(2026-07-10)** — `bench_detector.py --save-raw`(무손실 PNG + manifest.json) + `test/replay_raw.py`(임의 `.hef` 재생·`--ablation` 열화 재현·`--conf-high` 임계값 튜닝). ※ bench의 mp4는 **검출 오버레이본**이라 재분석 금지.
- ✅ **raw 4세션 확보 + 입력품질 직접 측정(§10.10)** — ESP32·USB 각 2세션 ×200프레임(166MB). replay가 라이브 CSV와 **20/20 정확 일치**(충실성 검증). **선명도(Laplacian 분산) ESP32 16.3 vs USB 984 = 60배**. USB에 블러 σ1.2만 걸어도 **'B4만 0, 나머지 정상'인 ESP32 서명이 완전 재현**. 열화 메커니즘 2종(블러=경계 삭제·Lap↓ / JPEG=블로킹 노이즈 오염·Lap 유지)이 별개이며 ESP32는 둘 다 겪음. → **console_v2 시험대 확보**: `replay_raw.py test/raw/<esp32세션> --hef console_v2.hef`.
- **▶ 남은 것**: raw 166MB를 `test-artifacts` 브랜치 보관(용량 → `--raw-every`·ESP32만·git-lfs 중 택).
- **🔴 정반사 → B1·B3가 B2로 오분류(2026-07-10 신규, §10.8)**: B1·B2·B3는 형태 동일·**색으로만 구분**되는데 버튼 광택면 정반사로 색이 날아가면 전부 B2가 됨(USB confirmed의 94%가 B2, B1·B3 0%). **B4 미탐지와 별개 원인** — B4는 해상도 부족, B1·B3는 색 충실도 부족. 대응 2축: ①촬영/입력(AE·AWB 수동고정 `--lock-exposure`, 조명 측면·확산) ②console_v2 학습데이터에 정반사 조건 포함·색 외 특징 학습.
- **MediaPipe / HOI 검증**: Python 3.13 aarch64 미지원. hailo_platform과 공존 불가 → console_v2 단계에서 Python 버전 정책 재검토 필요.
- **🔴 FPS — ESP32 NFR-1 미달 확정(§10.11)**: 실측 **12.5fps < 목표 15fps**(MediaPipe 미포함 값이라 HOI 추가 시 더 하락). 추론은 11ms로 양쪽 동일 → **병목은 전적으로 카메라 경로**(WiFi TCP+JPEG). ⚠️ **화질↔속도 정면 충돌**: B4 구제엔 JPEG q≥95 필요 → 바이트↑ → FPS 더 하락. ESP32엔 여유가 없다. **console_v2로 해결 안 되는 별개 실패** — 해상도 정책(§7.1)·스트림 최적화·NFR 재조정으로 별도 대응.
- **✅ 카메라 방향 결정(2026-07-10, §10.11) — ESP32 유지 + console_v2 구제 시도**: USB(APC900)는 B4 100%·30fps로 성능은 되나 **고정 카메라**라 주 카메라로 쓰면 **"1인칭 Vision AI × 웨어러블" 컨셉이 소멸**(3D 외장 제작 완료). B4 실패는 아직 모델 취약성과 교란돼 있으므로(σ0.8 블러로도 사멸), **증강 학습한 v2를 ESP32 raw에 먼저 평가**해 교란을 제거한다. v2로도 B4가 죽으면 카메라 교체 확정 — 단 그때도 **USB 전환이 아니라 웨어러블 카메라 업그레이드** 우선.
- ✅ 페일세이프/안전 용어 정정 완료(프레이밍 B: 휴먼 에러 예방, 안전은 효과).
- ✅ **배경 사고사례 §2.1 반영(2026-06-29)** — SK하이닉스 청주 화재(06/01·06/12)·보은 포스핀 누출 3건을 **위험성 배경으로만** 기재(사후시스템 인과·사전예방 필요성과 **연결 안 함** — 사용자 지침).

## 용어 주의
- **"PoC"** = 색탐지·MediaPipe 등 **초기 개념증명 "테스트"만** 지칭(구현할 시스템을 미리 보여주는 테스트). **프로젝트 전체는 PoC가 아님** — "비전 AI 순서위반 감지·차단 시스템". `console_v1`은 "1차 검증 테스트"(PoC 표현 금지, 혼동 유발).
- **안전 용어**: 포카요케(실수방지)·인터락·안돈(타워램프 경고)·능동형 안전. ※풀프루프·페일세이프는 과장/조건부라 주의.
