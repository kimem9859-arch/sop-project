---
name: 측정도구
description: 벤치·replay·측정 기록과 세기·옛 데이터 도구(HOI DB·FSM 시뮬레이터)를 돌릴 때의 규칙과 함정 — 도구는 config 에서 읽는다·재구현 금지·검증 관문·단일 출처
when_to_use: bench_detector·replay_raw·hoi_metrics·measure_check·세기(보고 도구)를 돌리거나 고칠 때 · 옛 데이터 도구(fsm_sim·dwell_probe·hoi_probe_batch·db_import — 백업 폴더)를 되돌려 쓸 때 · 측정 도구를 새로 만들 때 · 임계를 바꿔가며 재려 할 때
---

# 측정 도구를 돌릴 때

> 산출 수치의 정본은 **통합문서 §12 `[CURRENT]` 표**다. 여기에 수치를 적지 않는다.

## 🔴 도구를 만들거나 고칠 때

- 🔴 **런타임이 바뀌면 측정 도구도 같이 바꾼다** — 도구 기본값이 config 를 안 따라 **네 번 물렸다**(conf·ring·dwell·gap). **도구는 config 에서 읽는다.**
- 🔴 **재구현하지 않는다** — 판정(체류·갭메우기·발화)은 **시연 프로그램이 직접 적은 기록**(`fsm.csv`·`events.csv`)으로 센다. 도구에 규칙을 다시 쓰면 정본이 둘이 된다. 옛 재생 도구 `fsm_sim` 도 같은 이유로 **실제 `SafetyFSM` 을 import** 하는 얇은 껍데기였다.
- 🔴 **ROI 구역 판정은 `roi_zones.zone_at_point()` 로** — **SQL 에 링 규칙을 다시 쓰지 말 것.** `roi_zones.py` 가 단일 출처다.
- **지표는 저장하지 않고 질의로 계산한다** — 판정 생산이 바뀌면 저장값이 stale 이 된다.
- `hoi_metrics.py` 가 **사전 감지율·선행시간·구간 판정의 단일 출처**다(`capability_hit` · `analyze_presses` · `segments` — 세기가 재사용). 세 군데서 각각 다르게 계산되던 것을 여기 하나로 모았다. DB 층(`connect`·`load_*`)은 옛 `hoi.db` 전용이다.
- **옛 계산 도구**(`dwell_probe`·`hoi_probe`·`hoi_probe_batch`·`hoi_import`·`fsm_sim`·`db_import`·`slide_charts`)는 `Rpi5/백업/세기-20261009/` 에 있다 — 그 자리에서는 돌지 않으니 `git mv` 로 되돌려 쓴다(그 폴더 README). **새 측정에는 쓰지 않는다** — 추적 없이·판정을 흉내 내며 시연과 다르게 거친다.

## 잴 때

- ⚠️ **임계 효과는 임계를 실제로 바꿔가며 파이프라인 그대로 측정한다** — 원점수를 보려고 임계를 0.01 로 열면 **가중 NMS 가 저점수 앵커를 섞어 점수를 끌어내려** 반대 결론이 난다.
- ⚠️ **`cam_probe` 10프레임 표본을 게이트로 쓰지 말 것** — 분산이 커 세션 평균과 어긋난다.
- 소스는 **ESP32 뿐이다**(`--source usb` 는 웹캠 제거로 없다 — 옛 세션 파일명엔 `usb` 가 남아 있다).
- **해상도가 섞이면 픽셀 값을 환산한다** — 링은 `frame_orient.ring_px`(VGA 25px × 사진 크기 배율)가 단일 출처다 — 옛 도구(`dwell_probe`·`hoi_probe_batch`)는 사진 크기로 자동 환산하고, 새 기록은 `events.csv` 의 `camera` 크기 사건으로 해상도를 안다. `bench_detector` manifest 의 `frame_size`·`calibration_file` 로 세션 해상도를 확인한다. 🔴 `hoi_metrics.CLIFF_Y`(337)는 **VGA 좌표**다 — XGA 세션을 hoi.db 에 넣기 전에 환산을 붙일 것.
- **rawdet 을 본다** — 저신뢰 구간은 **트래킹 이전 raw 검출**에서만 드러난다. confirmed 트랙만 보면 놓친다.

## 관문

- 🔴 **새 측정 기록의 관문 = `python3 test/measure_check.py <세션 폴더> --log …`**(기록 켬/끔 FPS 중앙값 하락 ≤3% · 사건 ↔ 시연 로그 · 음성 사건 ↔ 데몬 로그). 실패한 세션의 값은 쓰지 않는다.
- 🔴 **옛 데이터(`hoi.db`)를 다룰 때는 `fsm_sim --gate` 가 관문이다**(백업에서 되돌린 뒤). 실패하면 **그 상태로는 어떤 수치도 쓰지 않는다.**
- ⚠️ **옛 시뮬레이터(`fsm_sim`)의 시뮬레이션 정책 4종**(BLOCK·WARNING 즉시 자동 해제 · 기대단계 사전 주입 · IDLE 시 자동 다음 주기)은 **실제 GUI 운용과 다르다.** 산출 수치는 그 병기 없이 쓰지 않는다.

## 옛 DB — 옛 데이터를 다시 셀 때만

- 적재·재생 도구는 백업 폴더에 있다(위) — 되돌려 쓴다. 새 측정은 DB 없이 시연 기록 CSV 를 센다.
- **버튼 DB(`bench.db`)와 HOI DB(`hoi.db`)는 별개 파일**이다 — 분석 단위가 프레임 vs **눌림 이벤트**로 다르고, `db_import.py` 의 INSERT 가 컬럼 수에 고정돼 있다.
- HOI 는 **2단계** — ①`hoi_probe_batch.py`(팜 추론 캐시 · 중단·재개 가능) → ②`hoi_import.py`(DB 재구축, 수 초).
- ⚠️ **수동 매핑 표 2개**(`_POSTURE`·`_VIOLATION_RULE`)가 코드에 있다. 세션이 늘면 갱신한다 — 미등록 세션은 NULL 이 되고 임포터가 그 목록을 **보고**한다.
- ⚠️ **`sqlite3` CLI 가 이 파이에 없다** — 질의는 `python3 -c "import sqlite3 ..."` 로.
- ✅ **검증은 코드가 아니라 결과로** — §12 값과 대조한다.

## 모델을 바꿔가며 대조할 때

- `replay_raw.py` 는 `--hef` 로 런타임 지정이 되지만, **`bench_detector.py`·데모는 `--hef` 를 안 받으므로 config 를 되돌려야** 한다.
- 절차·판정 논리 = [`replay평가.md`](replay평가.md)
