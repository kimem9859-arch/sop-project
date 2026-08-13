# SOP 가디언

1인칭(글래스) 비전으로 **PECVD 정비(PM) 작업의 SOP 순서 위반을 실시간 감지·차단**하는 휴먼 에러 사전 예방 시스템.
"누름 사후 반응"이 아니라 **누르기 직전 손-버튼 ROI를 인식해 사전 경고/인터록**한다. 콘솔은 **시연용 모조품**(실제 PECVD 기능 없음) — 핵심은 비전 AI 순서위반 감지·차단이고, 안전은 목적이 아니라 그 효과다(프레이밍 B).

> **이 README는 포인터다** — "무엇이 어디 있나"만 답한다. 사양·수치·설계 판단은 여기 두지 않는다.
> 무엇이 사실인지는 [`docs/통합문서.md`](docs/통합문서.md), 어떻게 작업할지는 [`CLAUDE.md`](CLAUDE.md)가 답한다.

---

## 🧭 무엇을 어디서 찾나

| 찾는 것 | 있는 곳 |
| --- | --- |
| **설계·사양·배경·SOP·하드웨어·KPI** | [`docs/통합문서.md`](docs/통합문서.md) ★ **단일 정본** |
| **확정 측정 수치** (mAP·FPS·감지율 등) | 통합문서 **§10 머리 `[CURRENT]` 표** — 개별 §10.x를 직접 뒤지지 말 것 |
| 모델 네이밍 규약·3단계 상태 | 통합문서 **§7.1** |
| 버튼 클래스맵·Pi 추론 규격 | [`dev/ai_model/README.md`](dev/ai_model/README.md) |
| FSM 상태 전이·임계값 | 통합문서 **§9** (임계 정본 §9.4) |
| 회로도·핀맵 | [`dev/interlock/`](dev/interlock/) · [`dev/glass/`](dev/glass/) 결선도 ★ repo가 정본 |
| **지금 어디까지 · 다음 할 일** | [`docs/작업로그.md`](docs/작업로그.md)의 `⏸`/`▶` → SessionStart 훅이 배너로 표시 |
| 프로젝트 작업 이력 (무엇을 했나) | [`docs/작업로그.md`](docs/작업로그.md) |
| Claude Code 인프라 이력 | [`docs/claude-code-작업로그.md`](docs/claude-code-작업로그.md) |
| 훅 구성·작업 방식·훅 설계 원칙 | [`docs/claude-code-작업문서.md`](docs/claude-code-작업문서.md) |
| **작업 규칙·금지·함정** | [`CLAUDE.md`](CLAUDE.md) |
| 작업 전 설계 근거 (왜·거부한 대안) | [`docs/superpowers/specs/`](docs/superpowers/specs/) |
| 파이 런타임 코드 | `Rpi5/` — **별도 repo** (아래 셋업 참조) |
| 라벨링·데이터셋·증강 스펙 | `Rpi5/Demo/docs/` |
| 트랙별 구성·다음 단계 | 각 `dev/*/README.md` |
| 영상·사진·발표자료 (대용량) | Google Drive — **정본 아님**, 팀 공유용 (통합문서 §14.3) |

**정본 우선순위** — ① `docs/통합문서.md`(설계·사양·측정) → ② repo(`dev/interlock`·`dev/glass` 결선도, `Rpi5` 코드) → ③ Google Drive(**정본 아님**). 충돌 시 위쪽이 이긴다.

⚠️ **일정·작업 진행상태는 문서 범위 밖이다.** 일정 추적 도구를 쓰지 않으며, 마일스톤·마감을 문서로 관리하지 않는다.

## 📋 문서별 역할·경계

각 문서는 자기 주제만 담는다. 쓸 곳을 헷갈리면 아래를 본다.

| 쓸 내용 | 갈 곳 |
| --- | --- |
| 규칙·절차·금지사항·**함정** | `CLAUDE.md` |
| 무엇이 어디 있나 (위치·경로) | `README.md`(이 문서) |
| 설계·사양·SOP·하드웨어 | `docs/통합문서.md` |
| 측정 수치 | `docs/통합문서.md` §10 머리 `[CURRENT]` 표 |
| 무엇을 했나 — 완료·경위·판정 | `docs/작업로그.md` |
| CC 인프라 작업(훅·스킬·도구) | `docs/claude-code-작업로그.md` |
| 훅 구성·작업 방식·설계 원칙 | `docs/claude-code-작업문서.md` |
| 작업 전 설계·거부한 대안 | `docs/superpowers/specs/` |
| **지금 어디까지 · 다음 할 일** | `docs/작업로그.md`의 `⏸`/`▶` |

## 폴더 구조

```
.
├─ docs/                  📄 문서
│  ├─ 통합문서.md                     ★ 단일 정본
│  ├─ 작업로그.md · claude-code-작업로그.md · claude-code-작업문서.md
│  └─ superpowers/specs · plans        작업 전 설계·계획
├─ dev/                   💻 개발
│  ├─ poc/                Step1 PoC — MediaPipe 손 + 색 ROI + dwell (검증 완료)
│  ├─ interlock/          트랙 A — 물리 인터록 (ref/ = ESP/Arduino 참고자산)
│  ├─ fsm/                순서위반 상태머신 (정본 코드는 Rpi5/Demo/fsm.py)
│  └─ ai_model/           트랙 B — YOLO 버튼 동적검출 (상태는 통합문서 §7.1)
├─ media/                 🎬 overlay 영상 (정상·스침만 git 추적)
└─ Rpi5/                  🍓 RPi 데모 (별도 git repo · gitignore)

gitignore 환경자산(루트): .poc_venv · poc_data · .syslibs — 머신마다 재구축
```

## 두 환경 (런타임 분리 / 지식 공유)

| | 🖥️ 데스크톱 | 🍓 라즈베리파이 (Pi#1 = 주 작업기) | 🍓 sop-pi-2 |
| --- | --- | --- | --- |
| 역할 | 설계·통합문서 편집 · PoC(x86) · 발표 제작 | Rpi5 코드 실행·실HW 테스트·Hailo · 통합문서 편집 | Pi#1 복제본(예비/병행) |
| 클론 | `sop-project` | `sop-project` + 그 안 `Rpi5/`(엄브렐러) | Pi#1과 동일 구성 |
| 접속 | — | — | `ssh pi2` (공유기 192.168.1.9) |

통합문서는 양쪽에서 편집·사용한다(파이 = 개발·테스트 중 수정 / 데스크톱 = 발표 제작).

### Rpi5 = 별도 repo (파이 런타임 코드)

`github.com/kimem9859-arch/Rpi5.git`, 작업 브랜치 **`main`**. 런타임 맥락은 `Rpi5/CLAUDE.md`에 있다.

> 🆕 **2026-08-13 브랜치 단일화** — `feature/glass-ui`·`feature/fsm-interlock`을 `main`으로 fast-forward 병합하고 삭제했다. 갈래가 하나뿐인데 브랜치가 넷이라 **셋업 절차가 41커밋 뒤처진 코드를 받는 상태**였다.
> **`test-artifacts`는 남긴다** — 코드가 아니라 **측정 원자료 보관소**다(PNG 400·CSV 100·MP4 7, 50MB+). gitignore로 본류에서 뺀 것이라 병합하면 모든 clone이 이를 받는다. 통합문서 §10.8~§10.10이 근거로 인용한다.

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
| 라벨링 기준 (진짜 버튼 정체·애매하면 안 그림·Modal·B3↔EMO 위치 구분·색기반 자동라벨러 배제) | `Rpi5/Demo/docs/labeling_guide.md` |
| 데이터 파이프라인·Roboflow 함정 2개(`annotation_labelmap`·`annotation_overwrite` 캐시) | `Rpi5/Demo/docs/dataset_pipeline.md` |
| 증강 스펙 (파랑=저조도 주력·정반사 보험·`hsv_h=0`·기하 ±15°) | `Rpi5/Demo/docs/augmentation_plan.md` |
| 학습 절차·DFC 변환·albumentations 2.x 인자 함정 | [`dev/ai_model/console_v2_학습가이드.md`](dev/ai_model/console_v2_학습가이드.md) |
| 측정·원인 분석 (B4 미탐지·정반사·저조도 B3 사멸·파랑 스티커) | 통합문서 §10.5~§10.17 |
| 트랙 A 인터락 코드·전장 E2E·EMO 해제 결함 | 통합문서 §12 · Rpi5 `main` · [`dev/interlock/README.md`](dev/interlock/README.md) |
| 목적 프레이밍 B·발표 역반영 | 통합문서 §1·§3 (발표자료는 데스크톱 보관, repo 미포함) |
