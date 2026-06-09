# interlock — 트랙 A (물리 인터록)

> SOP 가디언의 **차단(인터록)** 부. FSM의 `on_interlock(bool)` 판정을 받아
> 위반 시 물리 차단(시뮬 부하: LED/램프)을 거는 경로. 정본 설계는
> [`docs/통합수행설계문서_전체_섹션1-15.md`](../../docs/통합수행설계문서_전체_섹션1-15.md) §8·§11·§12.

## 구성(예정)
- **차단 대상**: 실장비 없음 → 시뮬 부하(LED/램프). Arduino UNO R4 + 4채널 릴레이로 LED 차단 스파이크.
- **프로토콜**: RPi `pyserial` → 차단 `"BLOCK\n"` / 해제 `"OK\n"`(+ACK). `/dev/ttyACM0` 115200.
- **연결**: fsm `SafetyFSM(on_interlock=set_interlock)` 한 줄 (Step3).
- **산출물**: §12 입력버튼·인터록 결선도 (버튼 배치 확정됨).

## 참고 자산
- `../../trackA_interlock_ref/` — 구 Test에서 살린 ESP32 TCP·Arduino 스케치(`camera_stream` 등).

## 역할 분담
- 배선·실연결 = 사용자 / 코드·배선도 = Claude.
