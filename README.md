# SOP 가디언

1인칭(글래스) 비전으로 **PECVD 정비(PM) 작업의 SOP 순서 위반을 실시간 감시·차단**하는 공정 안전 시스템 PoC.
"누름 사후 반응"이 아니라 **누르기 직전 손-버튼 ROI를 인식해 사전 경고/인터록**하는 안전 레이어를 목표로 한다.

> **📖 설계 정본은 [`docs/통합수행설계문서_전체_섹션1-15.md`](docs/통합수행설계문서_전체_섹션1-15.md)** 하나다.
> 배경·SOP·하드웨어·AI·FSM·인터록·KPI는 전부 그 문서가 단일 기준(Source of Truth)이며,
> 이 README는 폴더 지도일 뿐 사양을 정의하지 않는다.

## 폴더 구조

```
.
├─ docs/                  📄 문서
│  ├─ 통합수행설계문서_전체_섹션1-15.md   ★ 단일 정본
│  ├─ 프로젝트_기준문서_v*.md          ★ 정본 = 버전 번호가 가장 높은 본
│  └─ 기말발표_5장.pdf
├─ dev/                   💻 개발
│  ├─ poc/                Step1 PoC — MediaPipe 손 + 색 ROI + dwell (검증 완료)
│  ├─ interlock/          트랙 A — 물리 인터록 (ref/ = ESP/Arduino 참고자산)
│  ├─ fsm/                순서위반 상태머신 (정본 코드는 Rpi5/Demo/fsm.py)
│  └─ ai_model/           트랙 B — console_v1 YOLO 버튼 동적검출
├─ media/                 🎬 overlay 영상 (정상·스침만 git 추적)
└─ Rpi5/                  🍓 RPi 데모 (별도 git repo)

gitignore 환경자산(루트): .poc_venv · poc_data · .syslibs
```

각 `dev/*/` 폴더의 README에 트랙별 구성·다음 단계가 정리돼 있다.

## PoC 실행 (Step1)

루트에서 실행한다(`run.sh`가 루트 기준으로 venv·libGLESv2를 물린다):

```bash
# 계측: 클립 → frames.csv·events.csv
./dev/poc/run.sh poc_data/clips/ --rois dev/poc/rois.json --out dev/poc/out

# 채점: lock-on·오탐·순서·임계 sweep
.poc_venv/bin/python dev/poc/score.py --frames dev/poc/out --gt poc_data/ground_truth_segments.csv --sweep
```

자세한 프로토콜·성공기준은 [`dev/poc/POC_PROTOCOL.md`](dev/poc/POC_PROTOCOL.md),
다른 머신 이식은 [`dev/poc/SETUP.md`](dev/poc/SETUP.md) 참고.
