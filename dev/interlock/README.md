# interlock — 트랙 A (물리 인터록)

> SOP 가디언의 **차단(인터록)** 부. FSM의 `on_interlock(bool)` 판정을 받아
> 위반 시 물리 차단(시뮬 부하: LED/램프)을 거는 경로. 정본 설계는
> [`docs/통합수행설계문서_전체_섹션1-15.md`](../../docs/통합수행설계문서_전체_섹션1-15.md) §8·§11·§12.

## 현황 (2026-06-13)
- ✅ **결선도 확정** → [`결선도_초안.md`](결선도_초안.md) (부품·핀맵·전원·배선 전부 검증) + Drive drawio 도면 2종.
- ✅ **코드 작성·실연결 검증 완료** (Rpi5 `feature/fsm-interlock`):
  - `Demo/interlock.py`(pyserial 매니저)·`Demo/console_interlock/console_interlock.ino`·`config.py`(시리얼 설정)·`safety_console.py`(스텁→실송신 배선).
  - 펌웨어 업로드 후 RUN/WARN/BLOCK ↔ ACK 왕복 + `InterlockController` end-to-end 동작 확인. (부품 미배선 상태에서 통신 경로만 검증)
- ⚠️ **보드 = Arduino UNO R4 Minima** (WiFi 아님 — USB PID 0x0069/0x0369). 업로드 FQBN은 **`arduino:renesas_uno:minima`**(dfu-util). DFU 권한용 udev 룰 `/etc/udev/rules.d/99-arduino-unor4.rules` 설치 완료. 상세 = `.ino` 상단 주석.
- ✅ **물리 입력부(버튼 B1~B4·EMO → Pi GPIO) 코드 완료**(2026-06-13) — `Demo/gpio_input.py`(gpiozero, active-low 버튼·NC fail-safe EMO), `safety_console`에 시그널 마샬링 배선. gpiozero Mock으로 검증. → 입력→판정→출력 코드상 완성.
- ✅ **GUI 시스템 종료 + 전원부 정리** — `⏻ 시스템 종료`(안전종료), 마스터=멀티탭(§8). 로커 RL2-321N 미사용.
- ▶ **다음 = 실제 릴레이·타워램프·버튼 배선**(사용자) → 점등·E2E 확인. (코드는 전부 준비됨, 결선만 하면 동작)

## 구성 (확정)
- **차단 대상**: 실장비 없음 → 시뮬 부하(12V LED 파일럿, PoC). 최종 차단 시각화 = 타워램프 녹 OFF. Arduino UNO R4 + 릴레이(**최종 4채널 사용** / 8채널 모듈 SZH-RLBG-009는 PoC·확장용).
- **프로토콜**: RPi `pyserial` → `RUN`/`WARN`/`BLOCK\n`(+ACK). `/dev/ttyACM0` 115200.
- **연결**: fsm `SafetyFSM(on_interlock=…, on_feedback=…)` → `safety_console._on_interlock/_on_feedback` 배선.
- **입력**: 버튼 B1~B4·EMO → Pi GPIO (✅ 코드 완료 `gpio_input.py`, 결선도 §3.1).

## 참고 자산
- `./ref/` — 구 Test에서 살린 ESP32 TCP·Arduino 스케치(`camera_stream` 등). gitignore(637M).

## 역할 분담
- 배선·실연결 = 사용자 / 코드·배선도 = Claude.
