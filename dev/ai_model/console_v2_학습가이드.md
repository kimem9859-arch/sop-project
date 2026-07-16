# console_v2 학습 가이드 — 데스크톱(RTX 5060 + WSL2 Ubuntu)

> 데스크톱에서 **학습(.pt) → DFC 변환(.hef)**을 실행하기 위한 절차서. 파이가 아니라 **x86 GPU 머신**에서 수행한다.
> - **증강 근거·스펙** = `Rpi5/Demo/augmentation_plan.md` (검정→파랑 전환 반영)
> - **측정 수치 정본** = 통합문서 §10 (여기 복제 금지)
> - **.hef 규격·DFC 절차** = `dev/ai_model/README.md` + `참고/YOLOv8n_Hailo8_변환_작업기록.md`
> - v1 학습 설정 = §10.5 (Ultralytics 8.4.63, `hsv_h0/s0.2/v0.3`, best ep38)

## 파이프라인 위치
```
✅ export(YOLOv8) → ① 환경준비 → ② 데이터셋 download → ③ 학습(.pt) → ④ DFC 변환(.hef) → ⑤ 파이 replay 평가
```

---

## ① 환경 준비 (WSL2 Ubuntu)
### GPU 인식 확인
```bash
nvidia-smi          # RTX 5060이 보여야 함 (WSL용 NVIDIA 드라이버 필요)
```
### ⚠️ RTX 5060 = Blackwell(sm_120) → 최신 PyTorch 필수
구버전 torch는 5060을 못 잡거나 `sm_120` 에러가 난다. **CUDA 12.8+ 빌드** 설치:
```bash
python3 -m venv .venv && source .venv/bin/activate
pip install --pre torch torchvision --index-url https://download.pytorch.org/whl/cu128
pip install ultralytics albumentations roboflow
python -c "import torch; print(torch.cuda.is_available(), torch.cuda.get_device_name(0))"
# → True  NVIDIA GeForce RTX 5060  이어야 정상
```
> ※ `--pre`/cu128은 시점에 따라 안정판으로 바뀔 수 있음. `torch.cuda.is_available()`가 `True`면 됨.

## ② 데이터셋 download (Roboflow SDK)
API 키는 **환경변수**로(커밋 금지):
```bash
export ROBOFLOW_API_KEY="발급받은_개인키"
```
```python
# download_dataset.py
import os
from roboflow import Roboflow
rf = Roboflow(api_key=os.environ["ROBOFLOW_API_KEY"])
project = rf.workspace("eung-min").project("console_v2-mjefr")
dataset = project.version(N).download("yolov8")   # N = Roboflow에서 만든 버전 번호
print("dataset at:", dataset.location)
```
### 검증 (data.yaml)
- `names: ['B1','B2','B3','B4','EMO']` (숫자 `'0'..'4'` 아님) · `nc: 5`
- train ≈ 522 / valid ≈ 130 / test 0
- valid에 4개 세션(174153/175129/175658/**180016 저조도**)이 다 있는지

## ③ 학습 (Ultralytics)
### 기본
- **베이스**: `yolov8n.pt`(v1과 동일 아키텍처·전이학습). 정확도 여유 보려면 `yolov8s.pt`도 시도(FPS 트레이드오프 §10.6·§10.11 고려).
- **imgsz=640**: Roboflow에서 **Stretch 640**으로 구웠으니 이미 정사각 → letterbox 왜곡 없음(파이 `detector.py` stretch 추론과 정합).

### 증강 하이퍼파라미터 (augmentation_plan.md 반영 — 파랑 기준)
| 파라미터 | 값 | 근거 |
|---|---|---|
| `hsv_h` | **0.0** (필수) | 색이 클래스 정의 — Hue 흔들면 파랑↔B3↔EMO 혼동 |
| `hsv_s` | 0.3 | 채도 소폭(저조도 채도강하 일부 흡수) |
| `hsv_v` | 0.4 | 밝기 여유 — **저조도 대비**(주력 위협) |
| `degrees` | 12 | 헤드캠 기울기(±). **180° 뒤집기 금지** |
| `translate` | 0.1 / `scale` 0.5 | 위치 지름길 방어 |
| `fliplr` | 0.5 | 좌우 미러 OK(위치 불변성↑) |
| `flipud` | **0.0** | 상하 뒤집기 금지(정립 배포) |
| `mosaic` | 1.0 / `close_mosaic` 10 | 위치 편향 완화 |

### 학습 스크립트
```python
# train_console_v2.py
from ultralytics import YOLO
model = YOLO("yolov8n.pt")
model.train(
    data="console_v2-mjefr-N/data.yaml",   # download된 경로
    epochs=200, patience=40, imgsz=640, batch=16, device=0,
    hsv_h=0.0, hsv_s=0.3, hsv_v=0.4,
    degrees=12, translate=0.1, scale=0.5,
    fliplr=0.5, flipud=0.0, mosaic=1.0, close_mosaic=10,
    project="runs", name="console_v2",
)
```

### ⚠️ 커스텀 Albumentations (선택·권장) — 기본값의 ToGray 제거 + 색손실 증강 추가
Ultralytics는 albumentations 설치 시 **기본 변환에 `ToGray`·`CLAHE`가 들어간다 — 색 기반 클래스엔 유해**(회색화). 또 우리에게 필요한 **저조도·정반사·JPEG**가 없다. 학습 전 아래로 교체:
```python
# train_console_v2.py 상단 (model.train 호출 전)에 monkeypatch
import albumentations as A
import ultralytics.data.augment as aug

def _custom_albu(self, p=1.0):
    self.p = p
    self.transform = A.Compose([
        # 주력: 저조도(밝기·채도↓ + 노이즈) — §10.13 B3 사멸 방어
        A.RandomBrightnessContrast(brightness_limit=(-0.5, 0.1), contrast_limit=0.2, p=0.5),
        A.HueSaturationValue(hue_shift_limit=0, sat_shift_limit=(-40, 10), val_shift_limit=(-40, 10), p=0.4),
        A.GaussNoise(var_limit=(10, 60), p=0.3),
        # 보험(소량): 정반사/글레어
        A.RandomSunFlare(flare_roi=(0, 0, 1, 1), src_radius=80, p=0.1),
        # 강등(약하게): 파랑 무손상이라 일반 견고성 정도만
        A.ImageCompression(quality_lower=60, quality_upper=100, p=0.2),
        A.Downscale(scale_min=0.5, scale_max=0.9, p=0.1),
    ], bbox_params=A.BboxParams(format="yolo", label_fields=["class_labels"]))
    # ❌ ToGray / CLAHE / 전역 Hue 변환은 넣지 않는다

aug.Albumentations.__init__ = _custom_albu
```
> ※ Ultralytics 버전에 따라 `Albumentations` 내부 구조가 달라질 수 있으니, **학습 로그에 `ToGray`가 안 뜨는지** 확인. 부담되면 이 훅은 생략하고 위 네이티브 하이퍼파라미터만으로 1차 학습해도 된다(그 경우 `hsv_v=0.4`가 저조도 대비를 일부 담당).

## ④ DFC 변환 (.pt → .hef)
- 규격(반드시 준수, `dev/ai_model/README.md`): **DFC 3.33.1 / HailoRT 4.x / uint8 640×640 / NMS on-chip**. HailoRT 5.x 금지.
- 절차 참고: `참고/YOLOv8n_Hailo8_변환_작업기록.md`.
- **캘리브 1024+장** (v1은 64장 level0 → 정밀도 하락, §10.5 주). 캘리브 세트는 **라벨 불필요·입력 분포만 대표**하면 되므로: dedup 전 raw에서 추출하거나 train 이미지 재사용 가능(§10.13 캘리브 항목).

## ⑤ 파이 replay 평가
```bash
# .hef를 Rpi5/Demo/models/ 로 옮긴 뒤 (파이에서)
python3 test/replay_raw.py test/raw/20260713_180016 --hef console_v2.hef   # 저조도 — B3·B4 살아났나
python3 test/replay_raw.py test/raw/20260713_175129 --hef console_v2.hef   # 정반사 — B2 중복 회귀 없나
```
- **판정 기준**: v1 대비 저조도 B3·B4 검출률 상승, 정반사 B2 중복 오분류 무회귀.
- ⚠️ **저조도 파랑 B4 생존은 여기서 처음 측정**됨(§10.13 미측정 플래그).

---
## 절대 규칙 요약
1. `hsv_h=0` — 색 증강 금지(§10.13).
2. 증강 축 = **저조도 주력 · 정반사 보험** (블러/JPEG/저해상도는 파랑 무손상이라 강등).
3. DFC = **DFC 3.33.1 / HailoRT 4.x / uint8 640 / NMS on-chip**.
4. 측정 수치는 이 문서에 쓰지 말고 **통합문서 §10**에.
