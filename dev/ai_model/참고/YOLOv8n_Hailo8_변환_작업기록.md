# YOLOv8n → Hailo-8 .hef 변환 작업 기록

> 라즈베리파이5 + Hailo-8 가속기용 커스텀 YOLOv8n(버튼 5종 탐지) 모델 변환
> 작성일: 2026-06-11 / 환경: WSL2 Ubuntu 24.04, i5-12600K, RAM 15GB (GPU 없음)

---

## 0. 시작 환경 확인

| 항목 | 결과 |
|---|---|
| DFC 버전 | **v3.33.1** ✅ |
| HailoRT | Not Installed (변환엔 불필요) |
| Python | 3.12.3 (`~/hailo-venv`) |
| hailomz | **미설치** → 설치 필요 |
| GPU | 없음 (CPU만) — 나중에 정확도에 영향 |

작업 폴더(`/mnt/d/Hailo_DFC/`)에 있던 파일:
- `best.onnx` (4월 6일, 44.7MB) — **옛 14클래스, 사용 금지**
- `console_v1.onnx` (6월 10일, 12MB) — 새 5클래스 후보
- `데이터셋 train 사진/` — 캘리브 이미지 폴더

활성화: `source ~/hailo-venv/bin/activate`

---

## 1. Model Zoo 버전 정리

### 문제 ①: `git checkout v2.18.0` 실패 ("did not match")
**원인**: 실제 git 태그명이 `v2.18.0`이 아니라 **`v2.18`** 이었음.

전체 태그 목록:
```
... v2.16  v2.17  v2.18  v2.19.0  v5.0.0  v5.1.0  v5.2.0  v5.3.0
```
- `v5.x` = Hailo-10/15용 (DFC 5.3.0 요구) → **사용 불가**
- `v2.18` = 우리가 찾던 버전

**해결**: `git checkout v2.18` (detached HEAD)

### 검증: 짝이 맞는지 확인
체크아웃한 `setup.py`가 다음을 선언 → **정확한 짝 확정**:
```python
DFC_VERSION = "3.33.1"
MODEL_ZOO_VERSION = "2.18.0"
```

---

## 2. 설치 과정 — 난관들

### 문제 ②: 첫 설치 시 OOM (Exit code 137)
`pip install -e .` 실행 → 프로세스 강제 종료(메모리 부족).

**원인**: `scikit-image`, `numba` 등이 소스 컴파일되며 병렬 빌드가 RAM 초과.

**해결**: 빌드 병렬도를 1로 제한 (`MAKEFLAGS="-j1" MAX_JOBS=1`) + 백그라운드 + 로그.
→ scikit-image 168단계 소스 빌드 정상 통과.

### 문제 ③: `pillow<=9.3.0` 빌드 실패
```
Failed to build pillow
ERROR: Could not build wheels for pillow
```
**원인**: Model Zoo v2.18이 `pillow<=9.3.0`으로 고정했는데, **Pillow 9.3.0은 Python 3.12용 휠이 없고 3.12에서 소스 컴파일 불가** (3.12 지원은 Pillow 9.5/10.0부터). 게다가 DFC는 이미 **Pillow 12.2.0**을 사용 중.

**해결**: `setup.py`의 핀을 `pillow<=9.3.0` → `pillow`로 완화 (기존 12.2.0 유지, DFC 안 건드림).

### 문제 ④: `--no-deps` 설치 시 `PackageNotFoundError`
```
importlib.metadata.PackageNotFoundError: No package metadata was found for
The Dataflow Compiler package 'hailo-dataflow-compiler' was not found.
```
그 후 무한 재귀처럼 보이는 에러:
```
subprocess: pip install -e . --use-pep517 --no-deps ... exit status 1
```
**원인**: **setuptools 82**가 `develop` 명령을 deprecate하면서 내부적으로 `pip install -e . --use-pep517`를 **빌드 격리 모드**로 재호출 → 격리 환경엔 DFC가 안 보임 → setup.py의 `raise PackageNotFoundError`가 발생. (`--no-build-isolation`을 줘도 내부 재호출이 그 플래그를 안 물려받음)

**해결**: setup.py의 해당 `raise`를 경고 출력(print)으로 변경. DFC는 실제 venv엔 멀쩡히 있으므로, 격리 환경에서의 "없음"은 무시해도 안전.

### 문제 ⑤: 의존성 충돌 위험 회피 (선제적 판단)
`nuscenes-devkit`을 dry-run으로 확인하니:
```
Would install ... matplotlib-3.10.9 ...
```
**문제점**: DFC가 정확히 `matplotlib==3.5.2`를 쓰는데 nuscenes-devkit이 **3.10으로 올려버려 DFC를 깰 위험**.

**해결**: 3D/트래킹 전용 패키지(`nuscenes-devkit`, `motmetrics`, `lap`, `pyquaternion`)는 **일부러 제외**하고, 2D 탐지 컴파일에 필요한 것만 선별 설치.

---

## 3. 실제 설치한 패키지

**선별 설치한 의존성** (병렬도 1, 백그라운드):
```
numba==0.59.0, imageio==2.22.4, omegaconf==2.3.0, detection-tools==0.3,
scikit-image==0.20.0, opencv-python, scipy, scikit-learn,
termcolor, tqdm, pycocotools, Shapely>=2.0.0, Levenshtein
```
함께 끌려온 것: llvmlite 0.42.0, Cython 3.2.5, tifffile, joblib, rapidfuzz, PyWavelets, tf-slim 등.
(matplotlib 3.5.2, numpy 1.26.4는 DFC가 이미 보유 → 유지)

**제외한 의존성**: `nuscenes-devkit`, `motmetrics`, `lap`, `pyquaternion`
(3D/트래킹 평가 전용, 우리 작업 무관 + DFC 충돌 위험)

**본체**: `pip install -e . --no-deps` → `hailo_model_zoo 2.18.0` 설치 성공.

---

## 4. 런타임 import 에러 — 플러그인 자동탐색

hailomz가 실행 시 **모든** eval/infer/postprocess 플러그인을 자동 import하는데, 제외한 패키지 때문에 연쇄적으로 실패:

| 에러 | 발생 파일 | 누락 모듈 |
|---|---|---|
| 문제 ⑥ | `eval_factory.py` | `pyquaternion` (3D 평가) |
| 〃 | 〃 | `motmetrics` (트래킹 평가) |
| 문제 ⑦ | `infer_factory.py` | `torch` (torch 추론) |
| 문제 ⑧ | `postprocessing_factory.py` | `nuscenes` (3D 후처리) |

**해결**: 세 factory 파일의 `importlib.import_module(...)`를 **try/except ImportError로 감싸서** 누락 모듈은 건너뛰도록 수정. 이 플러그인들은 2D 탐지 컴파일과 무관하므로 안전.

수정 후 로그:
```
[hailomz] skipping optional eval plugin 'detection_3d_evaluation': No module named 'pyquaternion'
[hailomz] skipping optional eval plugin 'multiple_object_tracking_evaluation': No module named 'motmetrics'
[hailomz] skipping optional infer plugin 'torch_infer': No module named 'torch'
[hailomz] skipping optional postprocess plugin 'detection_3d_postprocessing': No module named 'nuscenes'
```

---

## 5. 모델 구조 분석 — 가장 중요한 부분

### 모델 검증 (`console_v1.onnx`)
```
opset: 11 ✅
input: images [1, 3, 640, 640] ✅
output: output0 [1, 9, 8400]   ← 9 = 4(bbox) + 5(클래스) → 5클래스 확정 ✅
```
(옛 14클래스였다면 [1, 18, 8400])

### 문제 ⑨ (잠재적): 단일 concat 출력 → NMS 못 붙임
우리 onnx는 Ultralytics **풀 익스포트**라 출력이 `[1,9,8400]` 하나로 합쳐져 있음(DFL+concat 포함).
Hailo가 자체 NMS를 붙이려면 **그 전 단계인 헤드 conv 6개 지점에서 그래프를 잘라야** 함.

**해결**: onnx 그래프를 분석해 절단 지점(채널 64=reg, 5=cls) 6개를 정확히 식별:
```
stride8 : /model.22/cv2.0/cv2.0.2/Conv (64),  /model.22/cv3.0/cv3.0.2/Conv (5)
stride16: /model.22/cv2.1/cv2.1.2/Conv (64),  /model.22/cv3.1/cv3.1.2/Conv (5)
stride32: /model.22/cv2.2/cv2.2.2/Conv (64),  /model.22/cv3.2/cv3.2.2/Conv (5)
```
→ `--end-node-names`로 지정.

### 사전 검증: `parse`로 레이어명 확인
전체 컴파일(수십 분) 전에 빠른 `parse`만 실행 → HAR 내부 레이어명 검사:
```
output_layer1 <- yolov8n/conv41    output_layer2 <- yolov8n/conv42
output_layer3 <- yolov8n/conv52    output_layer4 <- yolov8n/conv53
output_layer5 <- yolov8n/conv62    output_layer6 <- yolov8n/conv63
```
→ 기본 `yolov8n.alls` / `yolov8n_nms_config.json`이 기대하는 이름과 **완벽 일치**.
토폴로지가 공식 COCO yolov8n과 동일(클래스 수만 다름)하므로 기본 설정 그대로 사용 가능.

### `--classes 5` 처리 확인
코드(`main_utils.py`)를 직접 읽어 확인: alls가 `.json` 경로를 쓰므로 → hailomz가 자동으로
json을 복제 → `classes=5`로 수정 → `config_path`로 교체.
(걱정했던 "Model Script Not Found"류 에러 미발생)

---

## 6. 캘리브레이션 데이터 준비

**문제 ⑩**: `데이터셋 train 사진` 폴더에 154장이 있는데, 그중 **32개가 `(1).jpg` 중복본**.

**해결**: 중복본 제외 → **고유 122장**(≈말했던 123장)을 `/mnt/d/Hailo_DFC/calib_images/`로 분리.
전부 640×640 확인. (중복은 캘리브 통계를 편향시키므로 제거)

---

## 7. 컴파일 실행 및 진행 중 경고

최종 명령:
```bash
source ~/hailo-venv/bin/activate
cd /mnt/d/Hailo_DFC
hailomz compile yolov8n \
  --ckpt /mnt/d/Hailo_DFC/console_v1.onnx \
  --calib-path /mnt/d/Hailo_DFC/calib_images/ \
  --classes 5 --hw-arch hailo8 \
  --end-node-names /model.22/cv2.0/cv2.0.2/Conv /model.22/cv3.0/cv3.0.2/Conv \
                   /model.22/cv2.1/cv2.1.2/Conv /model.22/cv3.1/cv3.1.2/Conv \
                   /model.22/cv2.2/cv2.2.2/Conv /model.22/cv3.2/cv3.2.2/Conv
```

### ⚠️ 경고 (에러 아님, 정확도 영향)
```
[warning] Reducing optimization level to 0 ... because there's less data than
the recommended amount (1024), and there's no available GPU
[warning] Running model optimization with zero level ... not recommended for production
```
**의미**: GPU 없음 + 캘리브 <1024장 → 양자화 최적화가 **level 0**(기본 양자화, 압축·adaround 없음).
동작엔 문제없으나 정밀도는 GPU 환경 대비 낮을 수 있음. 캘리브는 실제 64장 사용(랜덤 아님).

진행: Mixed Precision → Statistics Collector → Calibration(64) → 양자화 → 하드웨어 할당(Mapping) → HEF 빌드.

할당 결과 (8개 cluster, 총 control 75% / compute 43% / memory 28% 사용):
```
[info] Successful Mapping (allocation time: 13s)
[info] Building HEF...
[info] Successful Compilation (compilation time: 6s)
[info] HEF file written to yolov8n.hef
COMPILE_EXIT=0
```

---

## 8. 결과 및 최종 검증

### 산출물
- **`/mnt/d/Hailo_DFC/yolov8n.hef`** (4.4MB)
- `yolov8n.har` (중간 산출물)

### HAR 로드로 검증한 핵심 속성 (과거 "미탐지" 3대 원인 → 전부 정상)

| 항목 | 검증 결과 |
|---|---|
| **입력 형식** | `normalization([0,0,0],[255,255,255])`이 **네트워크 내부**에서 수행 → 입력은 **UINT8** (raw 0–255) ✅ |
| **NMS 포함** | `nms_postprocess(meta_arch=yolov8, engine=cpu)`, 출력 `postprocess_output_layer [-1, 5, 5, 100]` = [클래스 5, bbox 5값, 최대제안 100] ✅ |
| **클래스 수** | nms config `"classes": 5` + 출력 shape로 이중 확인 ✅ |
| 입력 shape | `[-1, 640, 640, 3]` (NHWC) ✅ |
| sigmoid | cls 레이어(conv42/53/63)에만 적용 ✅ |

---

## 9. 변경한 파일 요약 (model zoo 체크아웃 내, 되돌릴 수 있음)

1. `setup.py` — `pillow<=9.3.0` → `pillow`
2. `setup.py` — DFC 미발견 시 `raise` → 경고 print
3. `core/eval/eval_factory.py` — 플러그인 import try/except
4. `core/infer/infer_factory.py` — 플러그인 import try/except
5. `core/postprocessing/postprocessing_factory.py` — 플러그인 import try/except

---

## 10. 남은 과제 / 권장사항

### 정확도 개선(선택)
~~정밀도가 부족하면 → **GPU 호스트 + 캘리브 이미지 1024장 이상**으로 재최적화하면
optimization level이 올라가 양자화 품질 향상 (특히 약한 B4 클래스).~~

> 🔴 **2026-07-16 정정 (이 처방은 틀렸다 — v2 변환 시 DFC 소스 확인)**
> - **"캘리브 1024장"만으로는 아무 효과가 없다.** `mo_config.py`: `if dataset_length < 1024: opt=1` **다음에** `if not has_gpu: opt=0`이 와서 덮어쓴다 → **GPU가 없으면 장수와 무관하게 level 0**.
> - **위 §6에서 "122장을 준비했는데 64장만 쓰더라"는 것도 버그가 아니었다** — `CalibrationConfig.calibset_size` **기본값이 64**이고 `min(calibset_size, dataset_length)`이라 더 넣어도 안 쓴다. **명시해야 한다.**
> - **"약한 B4 클래스" 부분도 반증됐다** — B4 미탐지는 양자화 탓이 아니다(§10.7: 에뮬레이션서 int8 .hef가 B4 0.95 검출). 실제 원인 = 카메라 입력 품질(§10.9).
> - **실제 해법** = alls에 `model_optimization_flavor(optimization_level=1)` + `model_optimization_config(calibration, calibset_size=N)` 명시. level 1의 `bias_correction`은 경사학습을 쓰지 않아 **GPU 없이 CPU로 돌아간다**(level 2 finetune부터 GPU 필요).
> - **GPU를 구할 거면 RTX 40 시리즈 이하** — DFC 3.33.1의 TF 2.18엔 sm_120(Blackwell/RTX 50) 커널이 없다. **다만 구할 이유가 없다**(B4와 무관).
> - 최신 절차 정본 = `dev/ai_model/console_v2_학습가이드.md` §④.

### Pi 추론 코드 점검 (과거 실패 재발 방지)
- 입력은 **uint8 640×640 RGB 그대로** (float32 정규화 ❌ — 정규화는 칩 내부에서 함)
- 출력은 **HailoRT NMS 결과**(`[클래스, 5, 100]`)를 파싱 (raw 텐서 디코딩 ❌)
- 클래스 인덱스: **0=B1(노랑), 1=B2(흰색), 2=B3(핑크), 3=B4(검정), 4=EMO(빨강 비상정지)**
- Pi의 HailoRT는 **4.x** 유지 (DFC 3.33.1로 만든 hef와 호환). DFC를 5.x로 올리면 호환 깨짐.

---

## 부록: 핵심 명령 모음 (재현용)

```bash
# 환경
source ~/hailo-venv/bin/activate
hailo --version   # DFC 3.33.1 확인

# Model Zoo 체크아웃 (작업 폴더의 hailo_model_zoo)
cd /mnt/d/Hailo_DFC/hailo_model_zoo
git checkout v2.18

# (위 문제 ③④ 수정 적용 후) 의존성 + 본체 설치
export MAKEFLAGS="-j1" MAX_JOBS=1
pip install numba==0.59.0 imageio==2.22.4 omegaconf==2.3.0 detection-tools==0.3 \
            scikit-image==0.20.0 opencv-python scipy scikit-learn termcolor tqdm \
            pycocotools "Shapely>=2.0.0" Levenshtein
pip install -e . --no-deps

# onnx 검증
python -c "import onnx;m=onnx.load('/mnt/d/Hailo_DFC/console_v1.onnx');print(m.opset_import[0].version,[d.dim_value for d in m.graph.input[0].type.tensor_type.shape.dim])"
# → 11 [1, 3, 640, 640]

# 컴파일 (7장 참고)
cd /mnt/d/Hailo_DFC
hailomz compile yolov8n --ckpt console_v1.onnx --calib-path calib_images/ \
  --classes 5 --hw-arch hailo8 \
  --end-node-names /model.22/cv2.0/cv2.0.2/Conv /model.22/cv3.0/cv3.0.2/Conv \
                   /model.22/cv2.1/cv2.1.2/Conv /model.22/cv3.1/cv3.1.2/Conv \
                   /model.22/cv2.2/cv2.2.2/Conv /model.22/cv3.2/cv3.2.2/Conv
```
