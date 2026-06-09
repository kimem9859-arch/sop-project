# ai_model — 트랙 B (console_v1 버튼 동적검출)

> 버튼(B1~B4)·디스플레이·타워램프를 1인칭 글래스 영상에서 **동적 검출**하는 YOLO 모델.
> Step1 PoC([`../poc`](../poc))는 색 ROI로 대체했고, 여기서 ROI를 YOLO로 교체한다.
> 설계 정본: [`docs/통합수행설계문서_전체_섹션1-15.md`](../../docs/통합수행설계문서_전체_섹션1-15.md) §7·§10.

## 단계 (첫 작업 = 데이터 수집, 리드타임 김)
1. **데이터 수집·라벨**: 콘솔부착 + 글래스 1인칭 + **부분가림**, Roboflow.
2. **YOLO 학습**: 버튼 B1~B4·디스플레이·타워램프.
3. **ROI 교체**: 색ROI → YOLO ROI.
4. **가림 대응**: camera_thread IoU 트래커 `YOLO_MAX_MISS` 확장 + 가림 학습.
5. **배포**: `.pt` → Hailo `.hef` → 글래스 → RPi5+Hailo **FPS 실측**.

## 모델 네이밍 규약 (정본 §7)
- `person_v1.pt`(person만·검증완료, mAP 0.96) → `console_v1.pt`(공정 객체·시연용·미완) → `console_v1.hef`(Hailo).

## 기술 핵심
- SOP = JSON 분리 / 가림 학습 + 트랙 지속 / 재현율 > 정밀도.
