# tool_v1 — 공구 검출 모델 (스패너·드라이버·렌치)

공구 서브작업(작업자가 맞는 공구를 손에 들었는지) 판정을 위한 **4번째 Hailo 모델**의 첫 산출물.
콘솔 버튼(`console_v2`)과 **별도 모델**이다(버튼은 색이 클래스라 색 증강 금지 / 공구는 색 증강 필수 — 정면 충돌).

## 상태 (2026-08-11)
- ✅ 학습(.pt) 완료 — `yolov8n`@640, ARCAD 3클래스. **수치·판정 = 통합문서 §10.36 참조**(여기 복제 금지).
- 🔴 판정 보류 — ARCAD valid 점수는 우리 카메라 성능이 아니다. **진짜 판정 = 파이 눈확인(대기)**.
- ⏳ 다음 세션 = ONNX→DFC(.hef)→파이 4번째 모델 배포.

## 클래스 (3종, `recipe.json` 정합)
`spanner`(←ARCAD Adjustable Spanner) · `driver`(←ScrewDriver) · `wrench`(←Wrench).

## 파일
- `filter_tool_classes.py` — 다클래스 YOLOv8 export를 3클래스만 남기고 인덱스 리맵. `drop_empty=True`면 배경(다른 공구)만 있는 이미지 제외. 테스트 = `test_filter_tool_classes.py`.
- `train_tool_v1.py` — **Colab 실행용**. ARCAD 공개 v9 직접 다운로드 → 필터 → `yolov8n` 학습(색 증강 ON·상하뒤집기·회전). 로컬 GPU 불필요.

## 실행 순서 (Colab T4)
1. `sop-project` clone → `dev/ai_model/tool_v1` → `pip install roboflow ultralytics` → `ROBOFLOW_API_KEY` 설정.
2. `python train_tool_v1.py` → 끝에 ARCAD valid mAP 자동 출력. **best.pt를 즉시 Drive/다운로드로 저장**(Colab `/content`는 런타임 리셋 시 소멸).

## 파이에서 이어하기 — 눈확인 (다음 작업)

🔴 **`tool_v1.pt`는 git에 없다** — Colab이 **Google Drive `MyDrive/tool_v1.pt`** 에 저장했다(repo 밖). 파이에서 repo만 pull하면 모델이 없으니 **Drive에서 먼저 받아야** 한다.

1. Drive의 `MyDrive/tool_v1.pt`를 파이 `~/tool_v1.pt`로 다운로드.
2. 파이에 `ultralytics` 설치(없으면). **CPU 추론 — Hailo 불필요.**
3. `tools-baseline` 촬영본(360장, 파이 로컬·gitignore, §10.35)에 돌려 오버레이 생성:
   ```bash
   yolo predict model=~/tool_v1.pt \
     source=~/sop-project/Rpi5/Demo/test/raw/20260810_154055_esp32_tools-baseline_console_v2/ \
     conf=0.65 save=True project=~/tool_eyeball name=v1
   ```
4. `~/tool_eyeball/v1/`의 오버레이에서 **스패너·(미니)드라이버가 옳게 잡히는지 눈으로** 확인(렌치는 이 영상에 없음). = §10.36의 **진짜 판정**.
5. 결과에 따라: 잘 잡히면 §10.36 판정 보류 해제 방향 / 약하면 개선 레버(§10.36-(5): 증강↓·yolov8s).

> ⚠️ ARCAD valid 점수(0.591)는 우리 카메라 성능이 아니다 — 이 눈확인이 우리 도메인 첫 확인이다.

## 데이터 귀속
ARCAD `tools-detection-b2xjk` (Roboflow Universe, **CC BY 4.0**). 출처 표기 의무.

## 설계·계획
`docs/superpowers/specs/2026-08-10-공구모델-tool_v1-design.md` · `docs/superpowers/plans/2026-08-10-공구모델-tool_v1.md`.
