# `detector.py` VDevice 공유 구조 변경 — 설계 (2026-07-22)

> **구현 전 설계안.** 승인 후 구현한다(CLAUDE.md brainstorming-first HARD-GATE).
> 관련: [HOI 경로 실증](2026-07-21-HOI-경로-design.md) — 이 변경이 그 통합의 **유일한 선행 조건**이다.

## 1. 왜 바꾸나

HOI(손 검출)를 붙이려면 **버튼 검출 모델과 손 모델이 같은 Hailo-8을 함께 써야** 한다. 그런데 실측 확인된 제약이 둘 있다:

1. **`VDevice()`는 물리 장치당 하나만 생성 가능** — 두 번째는 `HAILO_OUT_OF_PHYSICAL_DEVICES`(error 74)로 실패
2. 현재 `HailoDetector.__init__`은 **자체 `VDevice()`를 만들고 `network_group.activate()`를 `ExitStack`에 영구 보유**해 장치를 독점한다(`detector.py:99,110`)

→ 손 검출을 **별도로 붙이는 것은 구조적으로 불가능**하다. 하나의 VDevice를 공유하는 형태로 바꿔야 한다.

**성능은 문제가 아님이 이미 확인됐다**(2026-07-21 A/B 실측): console_v2 단독 8.15ms vs 팜+핸드 동시 로드 8.14ms — 평균 저하 없음. p95만 9.24 → 11.33ms로 소폭 증가하나 프레임 간격(약 80ms) 대비 여유가 5배다.

## 2. 제약 — 반드시 지킬 것

| # | 제약 | 이유 |
|---|---|---|
| C1 | **`create_detector()` 시그니처 불변** | 호출부 5곳(`camera_thread.py:41`·`bench_detector.py:334`·`tune_exposure.py:90`·`score_hef.py:123`·`replay_raw.py:184`)이 인자 없이 부른다 |
| C2 | **`PyTorchDetector` 무영향** | Hailo와 무관한 경로 |
| C3 | **기존 단일 모델 동작·성능 보존** | 시연 경로(`safety_console.py`→`camera_thread.py`)가 여기에 걸려 있다 |
| C4 | **`config.HEF_MODEL_PATH` 런타임 오버라이드 유지** | `replay_raw.py:174`·`score_hef.py:94`가 import 전에 덮어쓰는 패턴을 쓴다 |
| C5 | **손 모델 없이도 동작** | 손 검출은 선택 기능. 모델 파일이 없어도 버튼 검출은 돌아야 한다 |

## 3. 채택안 — 모듈 수준 공유 장치 (`hailo_device.py` 신설)

물리 NPU가 기기당 하나이므로, **싱글턴이 실제 하드웨어 구조를 그대로 반영**한다. 억지 전역상태가 아니다.

```
Rpi5/Demo/
  hailo_device.py   ← 신설. VDevice 싱글턴 + HEF 로드 헬퍼
  detector.py       ← 수정. 자체 VDevice 생성 → 공유 장치 사용
```

### 3.1 `hailo_device.py` (신설, 약 60줄)

책임 세 가지만 진다:

- **`get_vdevice()`** — ROUND_ROBIN 스케줄러로 설정된 `VDevice`를 **최초 1회 생성**해 반환. 이후 호출은 같은 객체. 생성은 `threading.Lock`으로 보호(카메라 스레드와 GUI 스레드가 동시에 부를 수 있다).
- **`configure(hef_path)`** — HEF를 로드해 `network_group`을 만들어 반환. 같은 경로를 두 번 부르면 캐시된 것을 준다.
- **`shutdown()`** — 프로세스 종료 시 명시적 해제(선택). 평상시엔 부르지 않는다.

⚠️ **스케줄러를 쓰면 `activate()`를 직접 호출하지 않는다.** 스케줄러가 컨텍스트 전환을 관리하므로 수동 활성화는 오히려 독점을 만든다. (2026-07-21 프로브가 이 방식으로 3모델 동시 구동을 확인)

### 3.2 `detector.py` 수정 (약 10줄 교체)

`HailoDetector.__init__`에서:

- **삭제**: `VDevice()` 직접 생성, `network_group.activate(...)` 영구 보유
- **교체**: `hailo_device.configure(config.HEF_MODEL_PATH)`로 network_group 획득
- **유지**: `InferVStreams` 파이프라인, `self._lock`, `detect()` 본문 **전부 그대로**

`close()`는 **자기 파이프라인만 닫고 공유 VDevice는 건드리지 않는다.** 지금은 `self._stack.close()`가 VDevice까지 파괴하는데, 공유 구조에서 그러면 다른 모델이 죽는다.

### 3.3 향후 손 검출 연결 (이번 범위 아님 — 인터페이스만 확인)

```python
from hailo_device import get_vdevice     # 같은 장치를 그대로 공유
hand = HandLandmarker(get_vdevice())
```
`hoi_probe.py`가 쓰는 `blaze_hailo`의 `HailoInference`도 VDevice를 인자로 받게 바꾸면 그대로 붙는다.

## 4. 거부한 대안

| 대안 | 거부 사유 |
|---|---|
| **`create_detector(vdevice=...)` 의존성 주입** | 명시적이고 테스트하기 좋으나 **C1 위반** — 호출부 5곳을 모두 고쳐야 한다. 그중 `camera_thread.py`는 시연 경로다. 얻는 것 대비 건드리는 범위가 크다 |
| **`HailoSession` 컨텍스트 매니저로 전면 재설계** | 구조적으로 가장 깨끗하나 호출부 5곳 + 생명주기 전면 재작성. **"멀쩡히 도는 코드는 리팩터링하지 않는다"**(CLAUDE.md)에 정면 위배 |
| **손 검출을 별도 프로세스로 분리 + IPC** | VDevice 제약을 회피하지 못한다 — 어느 프로세스든 물리 장치는 하나다. 오히려 프레임 동기 문제까지 추가된다 |
| **현행 유지 + 손 검출 포기** | HOI가 §7.2 설계의 한 축이고 §4 NFR-1 측정의 전제다. 포기하면 "버튼이 보인다"까지만 남는다 |

## 5. 위험과 완화

| 위험 | 영향 | 완화 |
|---|---|---|
| 🔴 **시연 경로 회귀** — `camera_thread.py`가 이 코드를 쓴다 | 데모가 안 뜨면 치명적 | 변경 전후 `bench_detector.py`로 **동일 프레임 검출 결과·FPS 대조**. 불일치 시 즉시 롤백(단일 커밋으로 유지) |
| `activate()` 제거로 단일 모델 성능 변화 | FPS 저하 가능성 | A/B 실측에서 스케줄러 방식 8.15ms로 현행과 동등 확인. 구현 후 재확인 |
| 싱글턴 생성 경쟁 | 카메라 스레드·GUI 스레드 동시 진입 | 생성부를 `threading.Lock`으로 보호 |
| 모델을 나중에 추가 로드 가능한가 | 손 검출을 detector 생성 후에 붙일 수 있어야 함 | **구현 시 검증 항목** — 프로브에선 3모델을 한 번에 configure 했다. 사후 추가가 안 되면 지연 로드 대신 초기 일괄 로드로 설계 조정 |
| `score_hef.py` 등이 detector를 만들고 닫기를 반복 | VDevice가 남아 자원 누수처럼 보일 수 있음 | 프로세스 수명과 함께 정리. 반복 생성/해제는 `close()`가 파이프라인만 닫으므로 안전 |

## 6. 검증 계획 (구현 후)

1. **회귀 — 검출 동등성**: 변경 전후 같은 raw 프레임에서 `bench_detector.py --frames 50`을 돌려 **클래스별 검출 수·평균 conf가 일치**하는지
2. **회귀 — 채점 동등성**: `score_hef.py --self-check`가 여전히 **mAP50 ≈ 0.996**
3. **성능**: A/B 하네스로 단일 모델 추론 시간이 **8.1~8.7ms 범위 유지**
4. **공유 동작**: `detector` + `hoi_probe`의 손 모델을 **한 프로세스에서 동시 로드**해 둘 다 정상 추론
5. **정리**: `close()` 후 다른 detector가 계속 동작하는지(공유 장치가 죽지 않았는지)
6. **시연 경로**: 카메라 연결 가능해지면 `run_demo.sh`로 GUI 기동 확인 — **하드웨어 필요, 그전까지는 미검증 항목으로 남긴다**

## 6-1. ✅ 구현·검증 결과 (2026-07-22)

**구현 완료** — `hailo_device.py` 신설 + `detector.py` `__init__`·`close()` 교체. 설계 그대로이며 `create_detector()` 시그니처·호출부 5곳 모두 불변.

| # | 검증 | 결과 |
|---|---|---|
| 1 | **검출 동등성** | 12프레임 **60건 전부 동일**(클래스·score·박스 좌표까지) |
| 2 | **채점 재현** | test 113장 재채점 → mAP50 **0.992** · recall **0.993** · 오분류 1건 — **§10.20과 완전 일치** |
| 3 | 성능 | 10.11ms → **10.19ms** (+0.8%) |
| 4 | ⭐ **공유 동작** | 버튼(console_v2) + 팜 + 핸드가 **한 VDevice에서 동시 구동**. 변경 전이라면 `HAILO_OUT_OF_PHYSICAL_DEVICES` 로 실패했을 지점 |
| 5 | close 안전성 | `detector.close()` 후에도 손 검출 계속 — 공유 장치가 죽지 않음 |
| 6 | **시연 경로(GUI)** | ❌ **미검증** — 아래 참조 |

### 🔴 발견하고 고친 버그 — 교착(deadlock)

첫 실행이 **응답 없이 멈췄다.** 원인은 `configure()` 가 `_lock` 을 잡은 채 `get_vdevice()` 를 부르고 그 안에서 **같은 락을 다시 잡는** 것이었다. `threading.Lock` 은 재진입이 안 되므로 자기 자신을 기다린다.

→ **`RLock` 으로 교체**해 해결(사유를 코드 주석에 명시). **검증을 "아무것도 안 바뀌었나"로 잡지 않았다면 시연 당일에 데모가 멈췄을 버그**다.

### ▶ 남은 검증 — 시연 경로 (카메라 필요)

`camera_thread.py:41` 이 `create_detector()` 를 쓰므로 **로직상 동일하게 동작해야 하지만 실제 기동은 확인하지 못했다**(ESP32 전원 미연결). 카메라가 가능해지면 **가장 먼저** 확인할 것:

```bash
cd ~/sop-project/Rpi5/Demo && ./run_demo.sh
```
확인 항목: ①GUI 기동 ②카메라 영상 표시 ③버튼 검출 오버레이 ④종료 시 예외 없음.
실패하면 즉시 롤백(이 변경은 **단일 커밋**이라 `git revert` 한 번이면 된다).

## 7. 범위

**포함**: `hailo_device.py` 신설, `detector.py`의 `HailoDetector.__init__`·`close()` 수정
**제외**: 손 검출 클래스 구현, HOI 융합 로직, `camera_thread.py`·`safety_console.py` 수정, 접촉 판정 임계 설계

→ 이 변경만으로는 **기능이 늘지 않는다.** 동작은 그대로이고 **손 검출을 붙일 수 있는 상태가 되는 것**이 산출물이다. 그래서 회귀가 없다는 것이 유일한 성공 기준이다.
