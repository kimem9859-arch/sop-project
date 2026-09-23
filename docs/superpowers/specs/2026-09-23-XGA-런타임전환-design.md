# 런타임 XGA 전환 — 해상도를 스스로 맞추는 런타임

> 상태: 설계 · 2026-09-23 · 세션 `4b651a56`
> 근거 측정 = 통합문서 §12.68(XGA 탐침) · §12.69(XGA 캘리브레이션) · §12.67(실콘솔 VGA 기준선)

## 1. 목적과 결정

**목적** — XGA(1024×768)를 이 프로젝트의 기본 해상도로 쓴다. 라벨링용 촬영과 시연 모두에 쓴다.

| 결정 | 내용 | 누가 |
| --- | --- | --- |
| D1 | **런타임이 첫 프레임 크기를 보고 스스로 맞춘다** — 펌웨어만 바꾸면 VGA·XGA 어느 쪽이든 동작 | 사용자(㉮) |
| D2 | **GUI 캘리브레이션 버튼과 그 창(CalibrationDialog)을 제거한다** — 캘리브레이션은 `test/calib_capture.py` 로만 | 사용자 |
| D3 | **VGA 보정 파일 재작성은 나중에**(⏸) — 되돌리면 보정이 틀린 상태임을 기록에 남긴다 | 사용자 |
| D4 | **실HW 검증까지 이번에 끝낸다** | 사용자 |

## 2. 설계

### 2.1 펌웨어 — 굽기 한 번

- `camera_stream_tcp.ino`: `FRAMESIZE_VGA` → `FRAMESIZE_XGA`.
- 부팅 때 카메라 초기화 직후 **노출 상한 밴드 `0x3A0E = 2`**(9ms · §12.66-(18) 채택값)를 쓰고 `printExposure("boot")` 로 확인한다.
- JPEG 화질 q15 · 시리얼 진단 명령(`R:`·`W:`·`EXP:`)은 그대로.
- 되돌리기 = `~/lab/esp32-link/mainboard_full_20260923_153411.bin`(VGA · 36ms) 복원.

### 2.2 보정 파일 고르기 — 한 곳에서

- `frame_orient.undistort_map(w, h)` 가 **`camera_calibration_<w>x<h>.npz`** 를 먼저 찾는다. 없으면 기존 `camera_calibration.npz` 를 **`image_size` 가 맞을 때만** 쓴다. 결과와 함께 **어느 파일을 썼는지**를 돌려준다.
- `camera_thread._load_undistort_map`(같은 일을 하는 두 번째 사본)을 없애고 `frame_orient` 를 쓴다.
- 파일이 없거나 크기가 안 맞으면 로그에 **「`test/calib_capture.py` 로 <w>×<h> 보정 파일을 만들 것」**을 남긴다(버튼 안내를 대체).

### 2.3 캘리브레이션 버튼·창 제거 (D2)

- `safety_console.py` 의 `CalibrationDialog` 클래스 · 버튼 · `_open_calibration_dialog` · `calibration_needed_signal` 처리 · `camera_thread` 의 `raw_frame_signal`·`_calibration_active`(창 전용 경로)를 제거한다.
- 버튼 색(`BTN_CALIB`) 등 창만 쓰던 설정·테스트 참조를 함께 걷어낸다. `chessboard.png` 는 `calib_capture.py` 가 쓰므로 남긴다.
- 🔴 `camera_thread` 에서 이름이 사라지므로 **`selftest/test_imports.py` 를 반드시 돌린다**(`Rpi5/CLAUDE.md` 함정).

### 2.4 픽셀 값 — VGA 기준으로 두고 비례

- `config.HAND_ROI_RING_PX` → **`HAND_ROI_RING_PX_VGA = 25`**(§12.22 근거값 그대로)로 이름을 바꾸고, 쓰는 곳은 `frame_orient.px_scale(w)` = **센서 폭 ÷ 640** 을 곱한다(XGA 1.6 → 40px).
- `config.DEMO_FPV_SIZE`(녹화 폴백) · `safety_console` 녹화 폴백 `(640, 480)` 은 **마지막 프레임 크기**가 있으면 그것을, 없으면 기본값을 쓴다(지금 구조 유지, 기본값만 해상도 중립으로).
- `frame_orient` 자체 점검은 **있는 보정 파일마다** 돈다.

### 2.5 측정 도구

- `hoi_metrics.CLIFF_Y = 337` → **`CLIFF_Y_VGA`** 로 이름을 바꾸고, 분석하는 사진의 크기로 환산해 쓴다. `db_report` 의 `w = 640` 도 사진 크기에서.
- `dwell_probe`·`hoi_probe_batch` 는 링을 **분석하는 사진의 폭**으로 환산한다.
- `bench_detector` manifest 에 **`frame_size` · `undistort` · `calibration_file`** 을 기록한다.

### 2.6 문서

- 통합문서 §12 의 픽셀 좌표(절벽 y≈337 · 권장 버튼 y · 링 25px)에 **「VGA 기준」** 표시. README·`Rpi5/CLAUDE.md` 갱신.

## 3. 관문 (측정 전에 정함)

### 3.1 🔒 합격 기준

| # | 관문 | 합격 |
| --- | --- | --- |
| G1 | 자가 테스트 24개 + 보정 선택 단위 테스트(VGA·XGA·없음·크기 불일치) | 전부 통과 |
| G2 | **XGA + 보정 켬** · 손 모델 켬 · 실콘솔 정지(S1)·좌우이동(S2) 각 3회 | 평균 FPS **≥ 13.9**(§12.67-(6) 필요 기준의 상한) · 15fps 미만 **연속 최장 ≤ 5프레임** |
| G3 | 실콘솔 버튼 누르기(S6) 2회 · 정지·좌우이동은 G2 데이터 재사용 | 사전 감지율 **≥ 34%**(§12.67-(5) VGA 기준선) · B3→EMO 확정 오분류 **≤ 57건/8,453프레임 비율**(§12.67-(2)) |
| G4 | `run_demo.sh` 실기동 + 시연 녹화 1회 | 기동·녹화·1인칭 영상 크기가 XGA 로 정상 |
| G5 | 되돌리기 — 백업(VGA)으로 굽고 `run_demo.sh` 실기동 | VGA 로 정상 기동·보정 파일 선택 로그가 VGA 파일 |

### 3.2 중단 규칙

- **G2 또는 G3 미달** → 펌웨어만 백업(VGA)으로 되돌리고 멈춘다. 코드는 두 해상도에서 돌도록 짰으므로 유지한다. 원인 규명은 별도 작업.
- 굽기 전 **시리얼번호 `3C:0F:02:DD:5E:58` 확인** — 아니면 멈춘다.

### 3.3 🔒 홀드아웃

- 합격선은 위 표로 **측정 전에 고정**한다. G3 의 사전 감지율은 회차 분산이 크므로(§12.67-(5) 12%↔53%) **합산값**으로만 판정한다.

## 4. 범위 밖

VGA 재캘리브레이션(D3 · ⏸) · ESP-IDF 송신 버퍼(한 장 1왕복) · 모델 입력 크기를 키운 재학습 · 갭메우기 값 변경(§12.67-(12)) · 통신이 흔들릴 때의 XGA.
