# PoC 다른 머신에서 실행하기 (Windows 노트북 / RPi)

> Step 1·2(녹화 클립 정확도)는 **머신 무관** — 가장 쉬운 건 클립을 이 PC로 올려 그대로 돌리는 것.
> 아래는 **노트북/RPi에서 직접** 돌리고 싶을 때.

## 옮길 파일 (이것만)
`dev/poc/roi_hover.py`, `dev/poc/score.py`, `dev/poc/hand_landmarker.task`, `dev/poc/requirements.txt`,
`poc_data/`(clips·ground_truth_segments.csv).
※ `.poc_venv`, `.syslibs`, `dev/poc/run.sh` 는 **이 리눅스 전용** — 가져가지 말 것.

---

## A. Windows 노트북 (가장 권장 — 설치 간단)
```bat
:: 프로젝트 폴더에서
python -m venv .venv
.venv\Scripts\activate
pip install -r dev\poc\requirements.txt

:: 모델 파일이 없으면 받기 (dev\poc\hand_landmarker.task)
:: https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task

:: (1) 첫 프레임 → dev\poc\rois.json 에 버튼 좌표 입력
python dev\poc\roi_hover.py poc_data\clips\정상01.mp4 --dump-frame0 dev\poc\frame0.png
:: (2) 계측
python dev\poc\roi_hover.py poc_data\clips\ --rois dev\poc\rois.json --out dev\poc\out
:: (3) 채점
python dev\poc\score.py --frames dev\poc\out --gt poc_data\ground_truth_segments.csv --sweep
```
- Windows에서는 `libGLESv2` 같은 리눅스 핵 **불필요**. `run.sh` 대신 `python ...` 직접 실행.
- 화면에 영상 안 띄우므로 GPU 없어도 됨 (CPU로 충분, 단 느릴 수 있음).

## B. Raspberry Pi (Step 3 FPS 측정 시에만 권장)
RPi(ARM)에서 mediapipe 설치는 버전·휠 이슈가 있어 까다롭다. **정확도(Step1·2)는 노트북/이 PC에서 하고,
RPi에서는 실제경로 FPS만** 재는 걸 권장.
```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r dev/poc/requirements.txt    # mediapipe ARM 설치 실패 시 버전 조정 필요
# GL 라이브러리 누락 시: sudo apt install -y libgles2 libegl1
python3 dev/poc/roi_hover.py ...           # 사용법은 위와 동일
```
- RPi는 보통 mesa GL이 깔려 있어 이 PC 같은 핵이 불필요. 없으면 위 apt 한 줄.
- **Step 3(ESP32→RPi+Hailo FPS)** 는 별도 스크립트로 진행 (요청 시 작성).

---

## 어디서 하든 동일
- `roi_hover.py` → `frames.csv`/`events.csv` 생성
- `score.py` → lock-on·오탐·순서·혼동행렬·임계 sweep
- 결과 CSV/콘솔 출력을 이 PC로 가져오면 제가 해석·판정 가능
