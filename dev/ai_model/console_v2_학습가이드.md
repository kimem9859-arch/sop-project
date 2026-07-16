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

#### ✅ 구축 완료 실적 (2026-07-16, 데스크톱 WSL2)
`.venv` 위치 = `dev/ai_model/.venv` (gitignore). 검증된 조합:
`torch 2.11.0+cu128` · `torchvision 0.26.0+cu128` · `ultralytics 8.4.96` · `albumentations 2.0.8` · `roboflow 1.3.13` · `opencv 5.0.0` / Python 3.12.3 · **sm_120 인식·GPU 행렬연산·YOLOv8n GPU 추론 통과**.

#### 🔴 선행 조건 — Windows 페이지 파일 (같은 증상 재발 시 여기부터)
구축 중 **WSL이 6번 통째로 죽었다.** 원인은 pip·WSL 버그가 아니라 **Windows 페이지 파일 비활성화**:
커밋 한도 = 물리 RAM(31.75GB)과 **정확히 동일** → 완충 0 → 평소 점유 27GB + 설치 중 vmmem 팽창이 천장을 치면 Windows가 `wslservice.exe`를 죽여 **VM 통째로 사망**(`setsid`로도 못 버팀).
- **증상 식별**: 이벤트뷰어 System 로그에 `Resource-Exhaustion-Detector ID=2004`(가상 메모리 부족)가 WSL 사망 **직전**에 뜬다. `wslservice.exe` 스택 오버플로(`0xc00000fd`)는 **원인이 아니라 결과** — WSL 업데이트는 헛수고다.
- **조치**: 페이지 파일 자동관리 ON → **재부팅**. 커밋 한도 31.75 → 41.25GB, 여유 4.39 → 29.5GB로 회복. 이후 설치 중 vmmem이 **10.98GB**까지 커져도 무사 완주(= 원래 8GB 이상 필요했는데 7.8GB 천장에 막혀 죽던 것).
- ⚠️ **중단된 설치는 venv를 오염시킨다** — `버전 None`짜리 유령 dist-info가 남아 pip이 "설치됨"으로 오인하고 **CUDA 런타임 패키지를 건너뛴다**(`libcudart.so.12 없음`). 고치지 말고 **venv를 지우고 재생성**할 것.
- 학습(200 epoch·수 시간)은 설치보다 고부하다. 페이지 파일 없이는 반드시 중간에 날아간다.

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

### 학습 스크립트 = `dev/ai_model/train_console_v2.py` (작성·검증 완료)
```bash
python train_console_v2.py --smoke    # 1 epoch — 경로·증강·GPU 확인 (~7초)
python train_console_v2.py            # 본 학습 200 epoch (~25~40분, RTX 5060)
```
네이티브 인자는 위 표 그대로 + `workers=2`(WSL2 필수) + `augmentations=AUGS`(아래). 데이터 경로는 `console_v2-1/data.yaml` 고정.

> **스모크 테스트를 반드시 먼저** — 2시간(실측 25~40분) 돌린 뒤에 증강이 안 먹었거나 경로가 틀린 걸 알면 늦다. `--smoke`는 1 epoch만 돌려 ①경로 ②`augmentations=` 수용 ③GPU 학습 전 구간을 7초에 검증한다.

### 커스텀 Albumentations — **공식 `augmentations=` 파라미터로** (몽키패치 불필요)
**⭐ 실행 스크립트 = `dev/ai_model/train_console_v2.py`** (아래 내용이 이미 반영돼 있음. `--smoke`로 1 epoch 검증 후 본 학습).

**왜 커스텀이 필요한가** — 흔히 "Ultralytics 기본 `ToGray`가 색 클래스에 유해하니 제거"라고 하지만 실측하면 **기본값은 `Blur`/`MedianBlur`/`ToGray`/`CLAHE`가 각 `p=0.01`(1%)로 미미**하고, `RandomBrightnessContrast`·`RandomGamma`·`ImageCompression`은 **`p=0.0`(꺼짐)**이다(`augment.py:2107~2113`). 즉 **진짜 이유는 "ToGray 제거"가 아니라 우리가 필요한 저조도(밝기·채도↓) 증강이 Ultralytics에 아예 없다는 것**이다.

> ✅ **몽키패치 하지 말 것 (2026-07-16 정정)** — 구버전 가이드는 `aug.Albumentations.__init__`를 덮어쓰는 몽키패치를 안내했으나, **Ultralytics 8.4.96에는 공식 통로가 있다**: `cfg/__init__.py:609`가 `augmentations`를 `allowed_custom_keys`로 허용하고, `augment.py:2771`이 `Albumentations(p=1.0, transforms=getattr(hyp, "augmentations", None))`로 받는다. → **`model.train(augmentations=[...])`로 그냥 넘기면 된다.** 내부 구조에 의존하지 않아 안전하다.

> 🔴 **albumentations 2.x 인자명 필수 (2026-07-16 실측)** — 1.x 이름(`var_limit`·`quality_lower/upper`·`scale_min/max`)은 2.x에서 **에러 없이 UserWarning만 뜨고 조용히 무시된 뒤 기본값이 적용**된다. 피해: `GaussNoise` std가 의도(≈0.012~0.031)의 **7~16배**(기본 0.2~0.44)로 폭주, `ImageCompression`은 q99~100이라 **무효**, `Downscale`은 고정 0.25로 **강등 방침과 반대로 과격**해진다.

```python
import albumentations as A
from ultralytics import YOLO

AUGS = [
    # 주력: 저조도 — §10.13 B3 사멸 방어
    A.RandomBrightnessContrast(brightness_limit=(-0.5, 0.1), contrast_limit=0.2, p=0.5),
    A.HueSaturationValue(hue_shift_limit=0, sat_shift_limit=(-40, 10), val_shift_limit=(-40, 10), p=0.4),
    A.GaussNoise(std_range=(0.012, 0.031), p=0.3),   # 2.x: std 정규화. 1.x var_limit(10,60) = sqrt(var)/255
    # 보험(소량): 정반사·글레어
    A.RandomSunFlare(flare_roi=(0, 0, 1, 1), src_radius=80, p=0.1),
    # 강등: 파랑 무손상(§10.12)이라 일반 견고성 정도만
    A.ImageCompression(quality_range=(60, 100), p=0.2),
    A.Downscale(scale_range=(0.5, 0.9), p=0.1),
    # ❌ ToGray / CLAHE / Hue 변경 금지 — 색이 곧 클래스 정의
]

YOLO("yolov8n.pt").train(data=..., augmentations=AUGS, workers=2, ...)   # 나머지 인자는 위 표 참조
```
> **검증법**: 학습 로그의 `albumentations:` 줄에 **우리 6개가 지정한 값 그대로** 찍히고 **`ToGray`·`CLAHE`가 없어야** 한다. `hue_shift_limit=(-0.0, 0.0)` 확인 필수.

### 🔴 WSL2 필수 — `workers=2`
기본 `workers=8`이면 **pin memory 스레드에서 `CUDA error: out of memory`로 즉사**한다(2026-07-16 실측). **모델 자체는 1.92GB밖에 안 쓰므로 배치·모델 문제가 아니다** — WSL2의 page-locked(pinned) 메모리가 빠듯한 탓. 워커를 줄이면 해결된다.

### 🔴 Roboflow data.yaml 경로 함정
Roboflow export의 `data.yaml`은 `train: ../train/images`로 나오는데 **실제 이미지는 `<location>/train/images`** 라 Ultralytics가 못 찾는다. → **절대 `path:` + 상대 `train:`/`val:`로 교정**해야 한다. `download_dataset.py`가 다운로드 직후 자동 교정하므로 보통은 신경 쓸 필요 없다(재다운로드해도 매번 적용됨).

## ④ DFC 변환 (.pt → .hef)
- 규격(반드시 준수, `dev/ai_model/README.md`): **DFC 3.33.1 / HailoRT 4.x / uint8 640×640 / NMS on-chip**. HailoRT 5.x 금지.
- v1 절차 원본(환경 구축 난관 포함): `참고/YOLOv8n_Hailo8_변환_작업기록.md`. **환경은 v1 때 구축된 것을 그대로 재사용**(`~/hailo-venv`, model zoo `v2.18` 체크아웃 + 패치 4개, editable → `/mnt/d/Hailo_DFC/hailo_model_zoo`). 재구축 금지 — 그 기록의 난관을 다시 겪는다.

### 🔴 GPU는 쓸 수 없다 — RTX 5060(Blackwell)은 DFC와 비호환 (2026-07-16 확정)
**DFC 3.33.1이 번들한 TensorFlow 2.18에 sm_120(Blackwell) CUDA 커널이 없다.** TF 2.18은 Pascal(6.0)~**Ada(8.9)**까지만 커널을 싣는다(공식 릴리스 노트). Hailo 커뮤니티에도 동일 사례가 보고돼 있고(RTX 5090/sm_120, `CUDA_ERROR_INVALID_PTX`) **Hailo 공식 지원·일정 발표는 없다**.
- **쓸 수 있는 GPU** = RTX 40 시리즈(Ada 8.9, TF 2.18이 전용 커널 탑재)·30 시리즈·20 시리즈/T4·GTX 10 시리즈. **RTX 50 시리즈 ❌**.
- ⚠️ **GPU를 구하지 말 것** — GPU는 level 2+(finetune·adaround)에만 쓰이고, **양자화는 §10.7에서 B4 미탐지 원인에서 배제**됐다. 파이의 Hailo-8 추론에는 CUDA가 아예 무관하다. **RTX 5060은 학습(③)엔 정상 사용**된다(torch cu128). DFC만 못 쓴다.
- ※ hailo-venv의 TF엔 CUDA 라이브러리가 없어 깔끔히 CPU로 떨어진다. **누군가 그 venv에 CUDA를 설치하면 `INVALID_PTX`로 깨진다** — 설치하지 말 것(정 필요하면 `CUDA_VISIBLE_DEVICES=-1`).

### 🔴 캘리브 "1024장" 계획은 무효 — DFC 소스 확인 결과 (2026-07-16 정정)
§10.13이 남긴 "캘리브 1024+장 확보" 과제는 **전제가 둘 다 틀렸다**. `mo_config.py` 실측:
1. **GPU가 없으면 장수와 무관하게 level 0** — `if dataset_length < 1024: optimization = 1` **다음에** `if not has_gpu: optimization = 0`이 와서 덮어쓴다. 1024장을 채워도 소용없다.
2. **`calibset_size` 기본값은 64** (`CalibrationConfig`) — `min(calibset_size, dataset_length)`이라 **이미지를 더 넣어도 64장만 쓴다**. v1이 122장 넣고 64장만 쓴 것은 버그가 아니라 이 기본값 때문이다.

**→ 해법: 레벨을 명시해 자동 축소를 우회한다.** `get_flavor_config`가 `if self.optimization_level is not None`이면 사용자 값을 그대로 쓴다.
| level | 알고리즘 | GPU |
|---|---|---|
| 0 (v1) | equalization | 불필요 |
| **1 (v2 채택)** | **+ bias_correction** | **불필요** — 경사학습 코드 0건(`GradientTape`/`optimizer` 미사용) |
| 2 | + finetune | 필요 |
| 3~4 | + adaround | 필요 |
- level 1이면 **압축도 0으로 유지**된다(`if optimization > 1`일 때만 4bit 압축 → 정확도 손실). 안전.

### 캘리브 데이터 — **학습 이미지 652장 그대로** (raw 불필요·증강본 금지)
- **`console_v2-1/{train,valid}/images` 652장을 한 폴더로 복사**해 사용. 라벨 불필요(양자화 범위 산정용).
- **왜 652인가**: ①이미 **640×640 Stretch** = 파이 추론 입력과 정확히 같은 형식(raw를 쓰면 파이의 stretch 리사이즈를 직접 재현해야 하고, 어긋나면 **조용히** 캘리브가 틀어진다) ②중복 제거되어 같은 장수로 커버리지가 넓다 ③4세션(저조도 포함) 전부 포함.
- **흔들림 프레임 제외는 안전하다** — 캘리브는 활성값 범위를 재는 것인데 **선명한 이미지가 더 큰 활성값**을 만들어 범위가 넓게(보수적으로) 잡히고, 흐린 입력은 그 안에 들어온다. 반대로 흐린 것만 쓰면 선명한 입력이 clipping된다.
- ❌ **오프라인 증강본 금지** — 캘리브는 **실제 배포 입력 분포**를 대표해야 한다. 합성 저조도·플레어를 넣으면 양자화 범위가 비현실적 입력 쪽으로 벌어져 진짜 입력의 정밀도를 깎는다. 실제 저조도는 이미 652장 안에 있다(180016 세션).
- ⚠️ 652장엔 **버튼 없는 프레임이 0장**이다(학습 로그 `0 backgrounds`). 실전엔 있다. ⑤에서 **배경 오탐이 문제로 드러나면** 그때 raw에서 배경 프레임을 섞어 재변환한다(현재는 근거 없음).

### 실행 절차
```bash
# 1) ONNX 내보내기 (학습 venv에서 — onnx 패키지 필요)
python -c "from ultralytics import YOLO; YOLO('console_v2.pt').export(format='onnx', opset=11, imgsz=640, simplify=False, dynamic=False)"
#    검산: opset 11 / 입력 [1,3,640,640] / 출력 [1,9,8400]  ← 9 = 4(bbox)+5(클래스). 14클래스였다면 18.

# 2) 캘리브 폴더
mkdir -p calib_v2 && cp console_v2-1/train/images/*.jpg console_v2-1/valid/images/*.jpg calib_v2/

# 3) 커스텀 alls  →  cfg/alls/generic/console_v2.alls
#    🔴 --model-script는 기본 alls를 "대체"한다(main_driver.py `_extract_model_script_path`)
#       → 원본 yolov8n.alls 내용을 전부 포함해야 한다.
#    🔴 alls 안의 nms_postprocess 경로가 상대경로("../../postprocess_config/...")라
#       반드시 원본과 같은 폴더(cfg/alls/generic/)에 둘 것.
#    원본 + 아래 2줄:
#       model_optimization_flavor(optimization_level=1)
#       model_optimization_config(calibration, calibset_size=652)

# 4) 컴파일 (hailo-venv에서, cwd = /mnt/d/Hailo_DFC)
hailomz compile yolov8n --ckpt <경로>/console_v2.onnx --calib-path <경로>/calib_v2/ \
  --classes 5 --hw-arch hailo8 \
  --model-script <경로>/cfg/alls/generic/console_v2.alls \
  --end-node-names /model.22/cv2.0/cv2.0.2/Conv /model.22/cv3.0/cv3.0.2/Conv \
                   /model.22/cv2.1/cv2.1.2/Conv /model.22/cv3.1/cv3.1.2/Conv \
                   /model.22/cv2.2/cv2.2.2/Conv /model.22/cv3.2/cv3.2.2/Conv
```
- **`--end-node-names`가 왜 필요한가**: Ultralytics 풀 익스포트는 출력이 `[1,9,8400]` 하나로 합쳐져 있어(DFL+concat 포함) Hailo가 자체 NMS를 못 붙인다. **헤드 conv 6개 지점**(reg 64ch / cls 5ch × 3 stride)에서 잘라야 한다. v1과 동일 구조(yolov8n·5클래스)라 **노드 이름도 동일** — 내보낸 뒤 존재를 확인할 것.
- **설정이 먹었는지 로그로 확인**: `Reducing compression level to 0 because requested optimization level equal or less than 1`(= level 1 강제 성공) · `Using dataset with 652 entries for calibration`. 🔴 **`Reducing optimization level to 0 ... no available GPU`가 뜨면 실패** — 그건 v1이 받던 경고다.
- **소요 시간**: bias_correction이 CPU라 **블록당 ~25초 × 73블록 ≈ 30분**, 전체 **35~45분**(v1은 level 0이라 이 단계가 없어 훨씬 빨랐다).

### HAR 검증 (§10.6의 3대 미탐지 원인 차단 — 반드시 수행)
| 항목 | 기대값 |
|---|---|
| 입력 형식 | **uint8** — `normalization([0,0,0],[255,255,255])`이 **네트워크 내부**에 있어야 함(파이에서 float 정규화하면 실패) |
| NMS | `nms_postprocess(meta_arch=yolov8, engine=cpu)` 포함, 출력 `[-1, 5, 5, 100]` |
| 클래스 수 | **5** (nms config `"classes": 5` + 출력 shape 이중 확인) |

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
