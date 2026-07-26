# Demo 구조 재편 — 문서·자체점검 분리 (A안)

- 날짜: 2026-07-26
- 대상 repo: `Rpi5` (브랜치 `feature/fsm-interlock`)
- 상태: 설계 승인됨 → 구현 계획 대기

## 1. 배경

`Rpi5/Demo/` 최상위에 성격이 다른 파일 27개가 한 층에 섞여 있다. 런타임 모듈 12개,
독립 유틸 1개(`check_model.py`), 자체점검 4개, 문서 4개, 실행 스크립트 3개, 데이터 3개다.
무엇이 실행되는 코드이고 무엇이 읽는 문서인지 목록만 봐서는 구분되지 않는다.

이 재편은 **폴더 정리 작업의 3단계**다. 1단계(자동 생성물 제거)와
2단계(`.ino` 3개 → `arduino/`, `YOLO model/` → `models/`, Rpi5 `a5eec14`)는 완료했다.

## 2. 목적과 그 한계

목적은 **앞으로 파일이 늘어날 것에 대비해 자리를 잡는 것**이다.

단, 설계 중 git 이력으로 증가 방향을 실측한 결과 **이 목적만으로는 재편의 실익이 제한적**임이
드러났다. 2026-06-11 이후 신규 파일은 `test/` 18개 대 런타임 최상위 6개였고, 후자 중 4개도
2026-07-22 HOI 통합이라는 단일 사건에서 한꺼번에 나왔다. **증가 압력이 걸리는 곳은 `test/`이고
그곳은 이미 별도 폴더로 분리돼 있다.**

따라서 이 설계가 실제로 해결하는 문제는 증가가 아니라 **혼재**다. 그에 맞춰 범위를 좁혔다.

## 3. 채택안과 기각안

### 채택 — A안: 저위험 분리

문서와 자체점검만 하위 폴더로 옮기고 **런타임 코드는 최상위에 그대로 둔다.**

### 기각 — B안: `src/` 전면 분리

런타임 12개를 `src/`로 내리면 최상위가 6~7개로 가장 깨끗해진다. 그러나
`config.py`의 `_BASE_DIR = os.path.dirname(__file__)`이 `models/`·`recordings/`·`logs/`·
`.camera_ip`·`camera_calibration.npz` 등 데이터 경로의 기준점이라, 이 파일이 하위로 내려가면
경로가 전부 어긋난다. 추가로 `test/` 도구 8개의 `_DEMO_DIR` 계산과 `run_*.sh` 3개를 고쳐야 하고
GUI 실기동 검증이 필수가 된다. **증가가 `test/`에 쏠려 있다는 실측을 감안하면 이 위험을
정당화할 수 없다.**

### 기각 — C안: `README.md` 색인만

파일을 옮기지 않고 역할표만 만든다. 위험은 0이나 구조는 그대로다.

### 기각 — `test/` 개명

`test/`는 실제로는 측정·분석 도구 폴더이고, 자체점검 폴더에 `tests/`를 주는 것이
이름상 가장 정확하다. 그러나 `test/hoi.db`·`test/bench.db`·`test/raw`가 CLAUDE.md·통합문서·
기존 spec 다수에 경로로 박혀 있어 파급이 A안의 범위를 넘는다. **이름의 정확성보다 참조 안정성을
택했다.**

## 4. 구조

```
Demo/
├── docs/          신설 — TESTING_FSM.md · labeling_guide.md
│                        dataset_pipeline.md · augmentation_plan.md
├── selftest/      신설 — test_fsm.py · test_hoi_sim.py
│                        test_imports.py · test_recipe.py
├── test/          변경 없음 (측정·분석 도구)
├── models/ dataset/ logs/ recordings/ scenario/   변경 없음
└── (최상위 유지) 런타임 12 · 유틸 1 · 스크립트 3 · 데이터 3
```

최상위 파일 27 → 19개. (숨김 파일 `.gitignore`·`.camera_ip`는 이 셈에서 제외)

### 폴더 이름

**`selftest/`** — `tests/`는 기존 `test/`와 한 글자 차이라 사람도 셸 탭 완성도 혼동한다.
이 4개의 공통 성격은 `TESTING_FSM.md`가 이미 기술한 대로 "PyQt6·카메라 없이도 도는" 자체 점검이다.

**`docs/`** — Demo 국소 문서임이 경로로 드러난다. 네 문서 모두 Demo의 데이터·테스트를 다룬다.

## 5. 수정 지점

### 코드 — `sys.path` 5줄

옮기는 4개 파일이 부모(`Demo/`)를 import 경로에 넣도록 한 단계 올린다.

| 파일 | 줄 | 내용 |
|---|---|---|
| `test_fsm.py` | 10 | `dirname(__file__)` → 부모 |
| `test_hoi_sim.py` | 14 | 〃 |
| `test_recipe.py` | 11 | 〃 |
| `test_imports.py` | 23 | 〃 |
| `test_imports.py` | 40 | `safety_console.py` 경로도 부모 기준으로 |

**최상위에 남는 `.py` 13개는 한 줄도 수정하지 않는다.** `config._BASE_DIR`, `run_demo.sh`,
`run_scenario.sh`, `run_bench_test.sh`, `test/` 도구 8개도 전부 무변경이다.

### 문서

- `TESTING_FSM.md` — 실행법 3줄을 `python selftest/test_fsm.py` 형태로 갱신 (자신도 이동)
- 루트 `CLAUDE.md` — 포인터 3개(`labeling_guide`·`dataset_pipeline`·`augmentation_plan`)의 경로
- `docs/작업로그.md`·`docs/타임라인.md`의 과거 언급은 **고치지 않는다.** 시간순 저널이라
  그 시점의 사실을 보존하는 것이 맞다.

## 6. 검증

1. `selftest/` 4개 실행 — 기준선과 동일하게 **20개 전부 통과**
2. `test/` 도구가 부모 모듈을 여전히 찾는지 — import 수준 확인
3. `git status`가 전부 **rename(`R`)** 으로 인식 — 파일 내용 변경 0

**GUI 실기동은 요구하지 않는다.** 런타임 파일과 `run_demo.sh`를 건드리지 않기 때문이며,
이것이 A안을 택한 핵심 이유다. (B안이었다면 카메라 연결 후 실기동이 필수였다.)

## 7. 롤백

단일 커밋으로 만들어 `git revert` 한 번에 되돌린다. 실패해도 런타임은 영향권 밖이다.

## 8. 범위 밖

- 런타임 코드의 폴더 이동 (B안)
- `test/` 개명
- `Demo/` 자체의 이름 (런타임 전체가 `Demo`라는 이름 아래 있는 것은 별개 사안)
- 파일 삭제 — 이번 재편에 삭제 대상은 없다. 최상위 27개는 전부 현역으로 확인했다
  (`recipe.py`는 `safety_console.py`가, `camera_calibration.npz`는 렌즈 왜곡 보정이 사용)
