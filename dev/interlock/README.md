# interlock — 트랙 A (물리 인터록)

> SOP 가디언의 **차단(인터록)** 부. FSM의 `on_interlock(bool)` 판정을 받아
> 위반 시 물리 차단(시뮬 부하: LED/램프)을 거는 경로. 정본 설계는
> [`docs/통합수행설계문서_전체_섹션1-15.md`](../../docs/통합수행설계문서_전체_섹션1-15.md) §8·§11·§12.

## 현황 (2026-06-12)
- ✅ **결선도 확정** → [`결선도_초안.md`](결선도_초안.md) (부품·핀맵·전원·배선 전부 검증) + Drive drawio 도면 2종.
- ▶ **다음 = 코드 작성** → [`코드작업_핸드오프.md`](코드작업_핸드오프.md) (`interlock.py` + Arduino `.ino`, Rpi5 repo).

## 구성 (확정)
- **차단 대상**: 실장비 없음 → 시뮬 부하(12V LED 파일럿, PoC). 최종 차단 시각화 = 타워램프 녹 OFF. Arduino UNO R4 + 릴레이(**최종 4채널 사용** / 8채널 모듈 SZH-RLBG-009는 PoC·확장용).
- **프로토콜**: RPi `pyserial` → `RUN`/`WARN`/`BLOCK\n`(+ACK). `/dev/ttyACM0` 115200.
- **연결**: fsm `SafetyFSM(on_interlock=…, on_feedback=…)` → `safety_console._on_interlock/_on_feedback` 배선.
- **입력**: 버튼 B1~B4·EMO → Pi GPIO (별도 follow-on).

## 참고 자산
- `./ref/` — 구 Test에서 살린 ESP32 TCP·Arduino 스케치(`camera_stream` 등). gitignore(637M).

## 역할 분담
- 배선·실연결 = 사용자 / 코드·배선도 = Claude.
