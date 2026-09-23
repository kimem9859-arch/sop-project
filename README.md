# SOP 가디언

1인칭(글래스) 비전으로 **PECVD 정비(PM) 작업의 SOP 순서 위반을 실시간 감지·차단**하는 휴먼 에러 사전 예방 시스템.
"누름 사후 반응"이 아니라 **누르기 직전 손-버튼 ROI를 인식해 사전 경고/인터락**한다. 콘솔은 **시연용 모조품**(실제 PECVD 기능 없음) — 핵심은 비전 AI 순서위반 감지·차단이고, 안전은 목적이 아니라 그 효과다(프레이밍 B).

> **이 README는 포인터다** — "무엇이 어디 있나"만 답한다. 사양·수치·설계 판단은 여기 두지 않는다.
> 무엇이 사실인지는 [`docs/통합문서.md`](docs/통합문서.md), 어떻게 작업할지는 [`CLAUDE.md`](CLAUDE.md)가 답한다.

---

## 🧭 무엇을 어디서 찾나

| 찾는 것 | 있는 곳 |
| --- | --- |
| **설계·사양·배경·SOP·하드웨어·KPI** | [`docs/통합문서.md`](docs/통합문서.md) ★ **단일 정본** |
| 개발환경(버전·스택) | 통합문서 **§14.2** ★ 정본 / 개발보고서용 시점 사본 = [`docs/개발보고서-개발환경.md`](docs/개발보고서-개발환경.md) |
| 개발보고서 「가치·제작 노력」 소재 | [`docs/개발보고서-가치와제작노력.md`](docs/개발보고서-가치와제작노력.md) — 수치 정본은 통합문서 §12 `[CURRENT]` |
| **확정 측정 수치** (mAP·FPS·감지율 등) | 통합문서 **§12 머리 `[CURRENT]` 표** — 개별 §12.x를 직접 뒤지지 말 것 |
| **한 주제의 §12 절 전부** | 통합문서 **§12 머리 갈래 색인** |
| **§12 측정 절 본문** (`§12.N` 원문·조건·마커) | [`docs/성능검증-저널.md`](docs/성능검증-저널.md) — 시간순 기록 · 색인·`[CURRENT]`·🔓 는 통합문서 §12 머리가 정본 |
| **살아 있는 미결·알려진 위험** | 통합문서 **§12 머리 🔓 미결 표** |
| 통합문서 공동 검토 진행·합의(2026-09-15~) | [`docs/정본검토-기록.md`](docs/정본검토-기록.md) — 머리 「현재 위치」 · 정본 아님 · 장별 추가 조사 = `docs/정본검토-조사-*.md` |
| 모델 네이밍 규약·3단계 상태 | 통합문서 **§6.1** |
| 버튼 클래스맵·Pi 추론 규격 | [`dev/ai_model/README.md`](dev/ai_model/README.md) |
| FSM 상태 전이·임계값 | 통합문서 **§7** (임계 정본 §7.4) |
| 핀·채널 배정 · 부품 사양 | 통합문서 **§15**(배정) · **§14.1**(부품) ★ 정본 |
| 회로도(전선·전원 상세) | [`dev/interlock/`](dev/interlock/) · [`dev/glass/`](dev/glass/) 결선도 — 배정이 §15 와 어긋나면 **§15 가 이긴다** |
| **지금 어디까지 · 다음 할 일** | [`docs/작업로그.md`](docs/작업로그.md)의 `⏸`/`▶` → SessionStart 훅이 배너로 표시 |
| 프로젝트 작업 이력 (무엇을 했나) | [`docs/작업로그.md`](docs/작업로그.md) |
| **문서에 반영 안 된 작업**(2026-09-11 전수 점검) | [`docs/미기록작업-점검-20260911.md`](docs/미기록작업-점검-20260911.md) — 발견 목록·처리 대기 |
| Claude Code 인프라 이력 | [`docs/claude-code-작업로그.md`](docs/claude-code-작업로그.md) |
| 훅 구성·작업 방식·훅 설계 원칙 | [`docs/claude-code-작업문서.md`](docs/claude-code-작업문서.md) |
| **작업 규칙·금지·함정** | [`CLAUDE.md`](CLAUDE.md) |
| 파이 홈 폴더 배치·생성 규칙 | [`docs/파이-홈-폴더규칙.md`](docs/파이-홈-폴더규칙.md) |
| 작업 전 설계 근거 (왜·거부한 대안) | [`docs/superpowers/specs/`](docs/superpowers/specs/) |
| 파이 런타임 코드 | `Rpi5/` — **별도 repo** (아래 셋업 참조) |
| 라벨링·데이터셋·증강 스펙 | `Rpi5/Demo/docs/` |
| 트랙별 구성·다음 단계 | 각 `dev/*/README.md` |
| 영상·사진·발표자료 (대용량) | Google Drive — **정본 아님**, 팀 공유용 (통합문서 §16.3) |

**정본 우선순위** — ① `docs/통합문서.md`(설계·사양·측정) → ② repo(`dev/interlock`·`dev/glass` 결선도, `Rpi5` 코드) → ③ Google Drive(**정본 아님**). 충돌 시 위쪽이 이긴다.

⚠️ **일정·작업 진행상태는 문서 범위 밖이다.** 일정 추적 도구를 쓰지 않으며, 마일스톤·마감을 문서로 관리하지 않는다.

## 📋 문서별 역할·경계 → `.claude/rules/문서배치.md`

🔴 **`docs/` 문서나 이 파일을 열면 그 규칙이 자동으로 붙는다**(`paths:` 로 연결). 「쓸 내용 → 갈 곳」은 거기가 정본이다. **이 문서는 「무엇이 어디 있나」(위치·경로)만** 답한다.

### 규칙을 어디에 두나 → `.claude/rules/규칙배치.md`

🔴 **규칙 공간 표·경위 금지·중복 금지·폐기 이관·길이·소급**은 거기가 정본이다.

## 폴더 구조

```
.
├─ docs/                  📄 문서
│  ├─ 통합문서.md                     ★ 단일 정본
│  ├─ 작업로그.md · claude-code-작업로그.md · claude-code-작업문서.md
│  ├─ superpowers/specs · plans        작업 전 설계·계획
│  └─ 제작설계서/         📐 제출 제작설계서 자료 (이미지·생성도구·_보관 캡처)
├─ dev/                   💻 개발
│  ├─ poc/                Step1 PoC — MediaPipe 손 + 색 ROI + dwell (검증 완료)
│  ├─ interlock/          트랙 A — 물리 인터락 (ref/ = ESP/Arduino 참고자산)
│  ├─ fsm/                순서위반 상태머신 (정본 코드는 Rpi5/Demo/fsm.py)
│  └─ ai_model/           트랙 B — YOLO 버튼 동적검출 (상태는 통합문서 §6.1)
├─ captures/              🖼️ 손 검출 샘플 이미지 (테스트 입력용)
├─ media/                 🎬 overlay 영상 (정상·스침만 git 추적)
│  └─ 발표차트/           📊 발표용 차트 SVG·PNG (생성기 = Rpi5/Demo/test/slide_charts.py)
└─ Rpi5/                  🍓 RPi 데모 (별도 git repo · gitignore)

gitignore 환경자산(루트): .poc_venv · poc_data · .syslibs — 머신마다 재구축
```

### 형제 저장소 — 한이음 장려상 평가 작업공간 (🛑 지금 없다)

**2026-09-22 신설했다가 같은 날 지웠다** — 「처음부터 다시 만들고 싶다」(사용자). **경로가 정해지면 다시 만든다.**

```
/home/pi/sop-project/       ← 여기 (통합문서·코드 = 사실의 정본)
(작업공간 — 미정)            ← 🛑 재생성 대기 · 백업 = ~/lab/hanium-장려상-백업-20260922
/home/pi/Documents/한이음-제출문서/   ← 🔴 제출물 실물 (PDF 22건)
```

- 🔴 **제출물 정본은 저장소가 아니라 PDF 다** — `개발보고서 34쪽` · `제작설계서 55쪽`(2026-09-08 최종본). 작업 저장소에는 `.docx`·`.pptx`·`.pdf` 를 두지 않는다(`.gitignore`).
- ⚠️ **편집 가능한 원본은 데스크톱 바탕화면에만 있다.** 파이는 `pdftotext -layout` 로 읽고 대조만 한다.
- 🔴 **그 저장소는 sop-project 세션에서 로드되지 않는다**(형제 폴더). 제출문서 작업은 **그 폴더에서 세션을 연다.**
- 의존은 **한 방향뿐** — 이 저장소의 코드·스크립트는 그쪽을 참조하지 않는다. ⚠️ 예외 하나 = 세션 시작 배너가 `../hanium-장려상/계획.md` 의 `### 일정` 절을 읽어 **마감 D-day** 를 띄운다. 🛑 **지금은 그 파일이 없어 D-day 가 안 뜬다**(없으면 생략하는 설계라 오류는 아니다) — 작업공간을 다시 만들 때 경로를 맞추면 복구된다.
- 사실·수치가 바뀌면 **이 저장소에서 먼저** 고친다.
- 📦 옛 작업공간 `hanium-docs` 는 1차 접수(9/8)용이었고 역할이 끝나 **로컬에서 지웠다**. 이력은 원격 private 저장소에 35커밋으로 남아 있고, 로컬 사본은 `~/lab/hanium-docs-백업-20260922` 다.
- 🔑 **다시 만들 때의 기준** — `hanium-docs` 의 규칙·판정표는 **8월 말에 멈춰 낡았다**(판정표 531줄 중 21곳이 옛 절 번호를 가리킨다). 기준은 저장소가 아니라 **이미 제출한 최종본 PDF** 이고, 집필 규칙은 **개발보고서에만** 적용한다(제작설계서는 ppt 라 제외).

### Rpi5 = 별도 repo (파이 런타임 코드)

`github.com/kimem9859-arch/Rpi5.git`, 작업 브랜치 **`main`**. 런타임 맥락은 `Rpi5/CLAUDE.md`에 있다.

> 🆕 **2026-08-13 브랜치 단일화** — `feature/glass-ui`·`feature/fsm-interlock`을 `main`으로 fast-forward 병합하고 삭제했다. 갈래가 하나뿐인데 브랜치가 넷이라 **셋업 절차가 41커밋 뒤처진 코드를 받는 상태**였다.
> **`test-artifacts`는 남긴다** — 코드가 아니라 **측정 원자료 보관소**다(PNG 400·CSV 100·MP4 7, 50MB+). gitignore로 본류에서 뺀 것이라 병합하면 모든 clone이 이를 받는다. [`성능검증-저널.md`](docs/성능검증-저널.md) 의 갈래 ②·③ 측정 절이 근거로 인용한다.

```bash
# 파이 셋업 (엄브렐러 재현)
git clone https://github.com/kimem9859-arch/sop-project.git ~/sop-project
cd ~/sop-project
git clone https://github.com/kimem9859-arch/Rpi5.git Rpi5
cd ~/sop-project && claude        # 통합문서 + 코드 한자리
```

## PoC 실행 (Step1, 데스크톱)

루트에서 실행한다(`run.sh`가 루트 기준으로 venv·libGLESv2를 물린다):

```bash
# 계측: 클립 → frames.csv·events.csv
./dev/poc/run.sh poc_data/clips/ --rois dev/poc/rois.json --out dev/poc/out

# 채점: lock-on·오탐·순서·임계 sweep
.poc_venv/bin/python dev/poc/score.py --frames dev/poc/out --gt poc_data/ground_truth_segments.csv --sweep
```

프로토콜·성공기준은 [`dev/poc/POC_PROTOCOL.md`](dev/poc/POC_PROTOCOL.md), 다른 머신 이식은 [`dev/poc/SETUP.md`](dev/poc/SETUP.md).

## 📎 영역별 세부 함정의 원본

함정은 각 원본에만 둔다(복제 금지). 아래는 그 위치다. 실제로 물린 작업 규칙·금지는 `CLAUDE.md`에 있다.

| 영역 | 원본 |
| --- | --- |
| 라벨링 규칙 — 제3자 라벨러용 (사각형 박스만·버튼 = 동그라미 전체·공구 = 보이는 부분+갈라진 조각 박스 하나·불확실 → `exclude` 태그·예시 사진, 2026-09-15 새로 씀) | `Rpi5/Demo/docs/labeling_guide.md` · 사진 `Rpi5/Demo/docs/labeling_guide_img/` |
| 데이터 파이프라인·Roboflow 함정 2개(`annotation_labelmap`·`annotation_overwrite` 캐시) | `Rpi5/Demo/docs/dataset_pipeline.md` |
| 증강 스펙 (파랑=저조도 주력·정반사 보험·`hsv_h=0`·기하 ±15°) | `Rpi5/Demo/docs/augmentation_plan.md` |
| 비전 모델 학습 이론(1차 자료 근거·재정립 ①) | [`dev/ai_model/학습이론.md`](dev/ai_model/학습이론.md) |
| 라벨 가림 규칙 조사 원자료(데이터셋 지침·학술 연구·반론 검증·조각 동일성, 재정립 ②) | [`dev/ai_model/조사/가림규칙/`](dev/ai_model/조사/가림규칙/) |
| 학습 절차·DFC 변환·albumentations 2.x 인자 함정 | [`dev/ai_model/console_v2_학습가이드.md`](dev/ai_model/console_v2_학습가이드.md) |
| 측정·원인 분석 (B4 미탐지·정반사·저조도 B3 사멸·파랑 스티커) | 통합문서 §12.5~§12.17 (갈래 ②·③) |
| 트랙 A 인터락 코드·전장 E2E·EMO 해제 결함 | 통합문서 §15 · Rpi5 `main` · [`dev/interlock/README.md`](dev/interlock/README.md) |
| 목적 프레이밍 B·발표 역반영 | 통합문서 §1·§3 (발표자료는 데스크톱 보관, repo 미포함) |
