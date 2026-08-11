# tool_v1 — 공구 검출 모델 (스패너·드라이버·렌치)

공구 서브작업(작업자가 맞는 공구를 손에 들었는지) 판정을 위한 **4번째 Hailo 모델**의 첫 산출물.
콘솔 버튼(`console_v2`)과 **별도 모델**이다(버튼은 색이 클래스라 색 증강 금지 / 공구는 색 증강 필수 — 정면 충돌).

## 상태 (2026-08-11)
- ✅ 학습(.pt) 완료 — `yolov8n`@640, ARCAD 3클래스. **수치 = 통합문서 §10.36**(여기 복제 금지).
- 🔴 **판정 = 미달** (파이 눈확인 완료, **§10.37**). 현 상태로 **시연 사용 불가** — 재현율 6.9%(conf 0.65)·`spanner`↔`wrench` 구분 실패.
  - 단 **폐기가 아니라 재학습 대상**: ARCAD 원본 대조군 3/3 통과라 모델·파이프라인 자체는 건강하다.
- ⏳ 다음 = **증강 줄여 재학습**(아래) → 재판정 → ONNX→DFC(.hef)→파이 4번째 모델 배포.

## ⚠️ 클래스 이름 주의 — 우리 실물 스패너는 `wrench`다
`spanner` = **몽키**(조절식), `wrench` = **조합·오픈엔드**. 보유 실물은 오픈엔드이므로 **정답은 `wrench`**이고 몽키는 없다.
→ §10.36의 `spanner` AP50 0.704는 **우리가 갖고 있지도 않은 공구 점수**다. 인용 금지(§10.37-(1)).

## 클래스 (3종, `recipe.json` 정합)
`spanner`(←ARCAD Adjustable Spanner) · `driver`(←ScrewDriver) · `wrench`(←Wrench).

## 파일
- `filter_tool_classes.py` — 다클래스 YOLOv8 export를 3클래스만 남기고 인덱스 리맵. `drop_empty=True`면 배경(다른 공구)만 있는 이미지 제외. 테스트 = `test_filter_tool_classes.py`.
- `train_tool_v1.py` — **Colab 실행용**. ARCAD 공개 v9 직접 다운로드 → 필터 → `yolov8n` 학습(색 증강 ON·상하뒤집기·회전). 로컬 GPU 불필요.

## 실행 순서 (Colab T4)
1. `sop-project` clone → `dev/ai_model/tool_v1` → `pip install roboflow ultralytics` → `ROBOFLOW_API_KEY` 설정.
2. `python train_tool_v1.py` → 끝에 ARCAD valid mAP 자동 출력. **best.pt를 즉시 Drive/다운로드로 저장**(Colab `/content`는 런타임 리셋 시 소멸).

## ✅ 파이 눈확인 — 완료 (2026-08-11)

`tool_v1.pt`는 `Rpi5/Demo/models/tool_v1.pt`에 있다(**미커밋** — Drive에서 받아 옮긴 것). 재현 명령:

```bash
# rfenv = uv venv --python 3.12 + uv pip install --torch-backend cpu ultralytics
#   ⚠️ 파이 기본 Python 3.13 에는 못 깐다(§10.35-(7) 함정과 동일)
yolo predict model=Rpi5/Demo/models/tool_v1.pt \
  source=Rpi5/Demo/test/raw/20260810_154055_esp32_tools-baseline_console_v2/ \
  conf=0.65 save=True project=~/tool_eyeball name=v1
```

**결과 = 미달**(수치·해석 정본 = §10.37). 요약: 재현율 6.9%(conf 0.65, 25/360) · 오픈엔드 스패너를 `spanner`로 일관 오분류(정답 0/7) · **위치 검출은 정상** · 드라이버 분류는 정상.
⛔ 히스토그램 평활화 가설은 **기각**(걸수록 나빠짐, §10.37-(5)).

## ⛔ `tool_v2`(증강 축소) — 시도했고 **폐기**했다 (2026-08-11)

`degrees` 30→10 · `flipud` 0.5→0.0 만 바꿔 재학습(데이터·seed 동일 = 깨끗한 A/B).

**ARCAD valid 는 올랐는데(0.591→0.635) 우리 도메인은 전면 악화**했다 — 재현율 붕괴, 조합 렌치 미검출, **빈 바닥을 conf 0.78 로 오검출**. 수치·판정 = **§10.38**.

🔑 **이 실험의 진짜 소득은 「ARCAD valid 가 방향을 거꾸로 가리킨다」는 실측**이다. 그래서 **하이퍼파라미터를 더 돌리지 않는다** — 잣대가 거꾸로인 채로 조준하는 셈이다.

## ▶ 다음 — valid 재분할

현재 valid = **115장(2.2%)·`wrench` 0장**. `spanner`↔`wrench` 구분이 **학습 내내 한 번도 채점된 적이 없다.** train 5,088장에서 약 15%를 떼어 **3종이 모두 든 valid** 를 만든다.

🔴 **최대 함정 = 증강 누출.** ARCAD v9 는 원본 1장을 **3벌로 부풀린** 버전이라, 무작위로 나누면 같은 원본의 증강본이 train·valid 양쪽에 걸려 **점수가 거짓으로 오른다**(`Rpi5/CLAUDE.md` "Roboflow 자동 랜덤분할 금지"와 같은 함정). **원본 식별자로 묶어 그룹 단위 분할**할 것. ⚠️ 파일명 규칙 확인이 **첫 단계**(미확인).

> ⚠️ 재분할해도 **valid 는 여전히 ARCAD 도메인**이다. 잣대가 덜 거짓말하게 되는 것이지 우리 성능을 재는 게 아니다 — **최종 판정은 계속 파이 눈확인**(`Rpi5/Demo/test/tool_live.py`).
> ℹ️ Colab 은 **파이 브라우저로도 실행 가능**하다 — 데스크톱이 없어도 재학습할 수 있다.

## 🎥 실시간 눈확인 도구
`Rpi5/Demo/test/tool_live.py` — ESP32 스트림에 모델을 얹어 **공구를 손에 들고 즉시 확인**한다. 자동 캡처(검출된 프레임만), `1`/`2` 로 모델 전환. 이것이 §10.38-(3)(4) 판정의 근거다.

## 데이터 귀속
ARCAD `tools-detection-b2xjk` (Roboflow Universe, **CC BY 4.0**). 출처 표기 의무.

## 설계·계획
`docs/superpowers/specs/2026-08-10-공구모델-tool_v1-design.md` · `docs/superpowers/plans/2026-08-10-공구모델-tool_v1.md`.
