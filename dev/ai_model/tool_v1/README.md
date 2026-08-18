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
  conf=0.65 save=True project=~/lab/tool-detect/tool_eyeball name=v1
```

**결과 = 미달**(수치·해석 정본 = §10.37). 요약: 재현율 6.9%(conf 0.65, 25/360) · 오픈엔드 스패너를 `spanner`로 일관 오분류(정답 0/7) · **위치 검출은 정상** · 드라이버 분류는 정상.
⛔ 히스토그램 평활화 가설은 **기각**(걸수록 나빠짐, §10.37-(5)).

## ⛔ `tool_v2`(증강 축소) — 시도했고 **폐기**했다 (2026-08-11)

`degrees` 30→10 · `flipud` 0.5→0.0 만 바꿔 재학습(데이터·seed 동일 = 깨끗한 A/B).

**ARCAD valid 는 올랐는데(0.591→0.635) 우리 도메인은 전면 악화**했다 — 재현율 붕괴, 조합 렌치 미검출, **빈 바닥을 conf 0.78 로 오검출**. 수치·판정 = **§10.38**.

🔑 **이 실험의 진짜 소득은 「ARCAD valid 가 방향을 거꾸로 가리킨다」는 실측**이다. 그래서 **하이퍼파라미터를 더 돌리지 않는다** — 잣대가 거꾸로인 채로 조준하는 셈이다.

## ⛔ ARCAD 폐기 확정 (2026-08-12) — 원인은 **다양성**

`valid` 재분할을 설계하다 근본 원인을 찾았다. **정본 = §10.39.**

ARCAD 5,203장은 실질적으로 **출처 118개**였다 — 3클래스가 **영상 7편**에서 나왔고 **`wrench` 는 영상 3편이 전부**(`v_16` 하나가 73%)다. 모델은 「공구」가 아니라 **「그 영상 속 장면」** 을 외웠다.

🔑 **결정적 근거**: `tool_v1` 을 ARCAD 영상 프레임에 채점하면 **100% 정답**인데 우리 프레임에선 **8%**다. 학습은 완벽히 됐고 **일반화만 안 됐다.**

⛔ **`valid` 재분할도 철회.** 프레임 단위로 나누면 누출, 영상 단위로 나누면 valid 가 단일 장면이 된다. **시험지를 고쳐도 교재가 얇은 건 그대로다.**

## ✅ `tool_v3` 데이터셋 병합 완료 (2026-08-12)

| 항목 | 내용 |
|---|---|
| **공구 3종** | **드라이버 · 렌치/스패너 · 플라이어/펜치** (몽키 별도 구분 포기 — 큰 데이터셋은 모든 렌치를 `wrench` 하나로 묶는다) |
| **데이터셋** | **`6-tool-dataset-bb0ug` v3 + `mechanical-tools-83ynn` v2 병합** (출처 5,762·4,026 = 1·2위 / 우리 스패너 7장에서 7/7·6/7) |
| 보강 후보(미사용) | `tools-vsisj` v5 (164클래스를 3종으로 병합 필요 — 이번 병합엔 안 넣음) |
| 제외 | `mmmxd`(출처 537), ARCAD |

**절차**: ①클래스명 정규화·3종 병합 ②네거티브(공구 없는 배경) 15% 혼합 ③**출처 단위 재분할**(누출 제거) ④산출물 기준 누출 재계산·체크섬 ⑤`dataset_diversity.py` 관문 통과 확인 ⑥라벨 눈확인(`preview_labels.py`).

`build_tool_v3_dataset.py`(도구)로 실행 — `~/data/ds_tool_v3`(약 3만 장, train/valid 분할)가 결과물이다. 학습은 아직 **미실행**(`train_tool_v3.py` 는 작성만 됨). 규모·관문 통과 여부의 정확한 수치는 통합문서 §10 참조.

### 🔴 병합 과정에서 새로 밝혀진 함정

- **`.rf.` 앞 파일 stem 이 같다고 「같은 사진」이 아니다.** `6-tool`·`mech83` 두 데이터셋 모두 `000001.jpg` 처럼 흔한 원본 파일명을 여러 업로더가 그대로 썼고, 같은 stem 아래 플라이어·렌치세트·망치·밧줄처럼 **전혀 다른 사진**이 섞여 있음을 육안으로 확인했다. 각 데이터셋의 Roboflow README 도 이를 뒷받침한다 — `6-tool` v3 은 *"2 versions of each source image"*(배수가 균일), `mech83` v2 는 ***"No image augmentation techniques were applied"***(증강 자체가 없음). 따라서 **이름 기반 중복 제거를 하면 서로 다른 사진이 지워진다** — `build()` 에는 `pick_one_per_group` 함수가 남아 있지만 이 이유로 **미사용**이다.
- **출처(source) 판정 전에 접두어를 붙이면 안 된다.** `source_key` 는 "뒤 일련번호를 떼되 남는 부분이 3글자 이상일 때만 자른다"는 규칙인데, 파일명 앞에 데이터셋 접두어가 붙으면 판정이 달라진다(`m0`→`m0` vs `mech83_m0`→`mech83_m`). 실데이터에서는 이 순서를 반대로 하면 `mech83` 출처 4,026개가 하나로 뭉개진다. 그래서 **출력 파일명의 접두어는 `.rf.` 뒤에 붙인다**(예: `m0_jpg.rf.mech83_h0.jpg`) — 원본 stem 이 앞쪽에 그대로 남아 출처 판정에 영향을 안 준다.
- **`dataset_diversity.py` 가 세는 「출처 수」는 실제 장면 다양성의 하한선이다.** 위 첫 번째 함정 때문에 같은 stem 아래 다른 사진이 섞여 있어도 하나의 출처로 세어진다. 과대평가될 위험은 없지만(오히려 보수적으로 낮게 나옴), 이 수치를 곧 "실제 서로 다른 장면 수"로 읽어서는 안 된다.

## ▶ 다음 — 학습 실행 → 파이 실시간 눈확인 판정

병합은 끝났고 **학습이 남았다**. `train_tool_v3.py`(Colab 스크립트, 아래 「Colab CLI」절 참조)로 학습 → `best.pt` 회수 → `Rpi5/Demo/models/`에 배치 → `tool_live.py`로 **파이 실시간 눈확인**. 판정 기준·절차는 `tool_v1`/`tool_v2` 때와 동일(위 절 참조).

> 🔴 **학습 전 반드시 `dataset_diversity.py` 관문을 통과시킬 것.** 이 도구가 없었다면 `tools-hmqnl`(31,119장으로 보이나 실제 v2 는 3,160장·`screwdriver` 없음)에 며칠을 버렸을 것이다.
> ℹ️ Colab 은 **파이 브라우저로도 실행 가능**하다 — 데스크톱이 없어도 재학습할 수 있다. 이제 **터미널만으로도 가능**하다(아래 「Colab CLI」절).

## 🗂 파이 로컬 자산 (repo 밖 — 새 세션에서도 그대로 쓴다)

| 경로 | 내용 |
|---|---|
| **`~/env/rfenv`** | **Python 3.12 + torch(CPU) + ultralytics + inference.** 파이 기본 3.13 엔 못 깔아서 만든 것(§10.35-(7)). `~/env/rfenv/bin/python <스크립트>` 로 쓴다 |
| `~/data/ds_6tool` · `~/data/ds_mech83` | **주력 데이터셋 2종** (출처 5,762 · 4,026) |
| `~/data/ds_vsisj` | 3순위 보강재 (164클래스 → 3종 병합 필요, 미사용) |
| **`~/data/ds_tool_v3`** | **`6-tool` + `mech83` 병합본**(약 3만 장, train/valid 분할, 관문 통과·체크섬 기록됨) — 학습 입력 |
| `~/lab/tool-detect/tool_v3_preview` | `preview_labels.py` 눈확인 오버레이(20장) — 병합본 라벨 육안 검수용 |
| `~/lab/tool-detect/tool_research/` | `classes.json`(**23개 데이터셋 클래스 원자료**) · `preds_*.json`(측정 기록 9종) |
| `~/lab/tool-detect/tool_eyeball*` · `~/lab/tool-detect/tool_live_shots*` | §10.37·§10.38 판정 근거 오버레이 |
| `Rpi5/Demo/models/tool_v1.pt`·`tool_v2.pt` | 폐기된 모델(gitignore) — 비교 기준선으로 보존 |

> ⛔ ARCAD(`~/arcad_v9`)·`~/ds_mmmxd`·`~/ds_hmqnl` 은 **삭제했다**(2026-08-12, 4GB 회수). 판정 근거는 §10.39 에 남아 있고 필요하면 몇 분이면 다시 받는다.

## 🔬 진단 도구

- **`dataset_diversity.py`** — 학습 전 관문. 「출처 수」를 센다. 클래스별로 잰다.
- **`div_merged.py`** — 3종으로 **병합한 뒤** 잰다. 과세분화된 데이터셋(`tools-vsisj` 164클래스)은 이쪽으로 봐야 실제 학습 조건을 대표한다.
- **`build_tool_v3_dataset.py`** — 클래스 3종 매핑·네거티브 혼합·출처 단위 재분할·산출물 기준 누출 재계산·체크섬까지 한 번에 처리하는 병합 도구. `python build_tool_v3_dataset.py <출력경로> <데이터셋:접두어> ...` 형태로 실행. 테스트 = `test_build_tool_v3_dataset.py`.
- **`preview_labels.py`** — 병합 결과 라벨을 박스로 그려 눈으로 확인한다. `python preview_labels.py <데이터셋> <출력폴더> [장수] [seed]`.

## 🎥 실시간 눈확인 도구
`Rpi5/Demo/test/tool_live.py` — ESP32 스트림에 모델을 얹어 **공구를 손에 들고 즉시 확인**한다. 자동 캡처(검출된 프레임만), `1`/`2` 로 모델 전환. 이것이 §10.38-(3)(4) 판정의 근거다.

## 🚀 Colab CLI — 파이 터미널에서 학습 (2026-08-12 검증)

브라우저·Drive 경유 없이 파이에서 바로 GPU 학습을 돌린다. T4 할당·원격 실행·파일 회수 전부 실측 확인됨.

```bash
uv tool install google-colab-cli --with "jupyter-kernel-client<1.0"
colab sessions          # 최초 1회 브라우저 OAuth (대화형 터미널 필요)
```

🔴 **`jupyter-kernel-client<1.0` 고정 필수** — colab-cli 0.6.0 이 버전을 안 고정해서, 최신 1.0.x 가 딸려오면 `colab exec` 가 `AttributeError: KernelClient` 로 죽는다(1.0 에서 개명).

⚠️ `--keep` 없으면 스크립트 종료 즉시 VM 반납 → `best.pt` 회수 불가.
⚠️ `--timeout` 기본값 30초. 학습엔 반드시 크게.
⚠️ `colab stop` 누락 = 크레딧 소모.

🔴 **`colab run` 은 스크립트 한 파일의 내용만 VM 으로 보낸다** — 같은 폴더의 다른 모듈(`build_tool_v3_dataset.py` 등)은 따라가지 않는다. 그래서 `train_tool_v3.py` 는 VM 에서 자기 자신이 `sop-project` 를 얕게(shallow) clone 해 필요한 파일을 스스로 확보하도록 짜여 있다.

## 데이터 귀속
ARCAD `tools-detection-b2xjk` (Roboflow Universe, **CC BY 4.0**). 출처 표기 의무.

## 설계·계획
`docs/superpowers/specs/2026-08-10-공구모델-tool_v1-design.md` · `docs/superpowers/plans/2026-08-10-공구모델-tool_v1.md`.
