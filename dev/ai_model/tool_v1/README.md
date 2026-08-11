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

## 데이터 귀속
ARCAD `tools-detection-b2xjk` (Roboflow Universe, **CC BY 4.0**). 출처 표기 의무.

## 설계·계획
`docs/superpowers/specs/2026-08-10-공구모델-tool_v1-design.md` · `docs/superpowers/plans/2026-08-10-공구모델-tool_v1.md`.
