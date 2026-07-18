# interlock — 트랙 A (물리 인터록)

> SOP 가디언의 **차단(인터록)** 부. FSM의 `on_interlock(bool)` 판정을 받아
> 위반 시 물리 차단(시뮬 부하: LED/램프)을 거는 경로. 정본 설계는
> [`docs/통합수행설계문서_전체_섹션1-15.md`](../../docs/통합수행설계문서_전체_섹션1-15.md) §8·§11·§12.

## 현황 (2026-07-15 — 트랙 A 실물 완료)
- ✅ **결선도 확정** → [`결선도_초안.md`](결선도_초안.md) (부품·핀맵·전원·배선 전부 검증) + drawio 도면 2종(팀 공유 드라이브 보관, 정본 아님).
- ✅ **코드 작성·실연결 검증 완료** (Rpi5 `feature/fsm-interlock`):
  - `Demo/interlock.py`(pyserial 매니저)·`Demo/console_interlock/console_interlock.ino`·`config.py`(시리얼 설정)·`safety_console.py`(스텁→실송신 배선).
  - 펌웨어 업로드 후 RUN/WARN/BLOCK ↔ ACK 왕복 + `InterlockController` end-to-end 동작 확인. (당시엔 부품 미배선 — 통신 경로만. **실물 결선은 아래 7/15 항목으로 완료**)
- ⚠️ **보드 = Arduino UNO R4 Minima** (WiFi 아님 — USB PID 0x0069/0x0369). 업로드 FQBN은 **`arduino:renesas_uno:minima`**(dfu-util). DFU 권한용 udev 룰 `/etc/udev/rules.d/99-arduino-unor4.rules` 설치 완료. 상세 = `.ino` 상단 주석.
- ✅ **물리 입력부(버튼 B1~B4·EMO → Pi GPIO) 코드 완료**(2026-06-13) — `Demo/gpio_input.py`(gpiozero, active-low 버튼·NC fail-safe EMO), `safety_console`에 시그널 마샬링 배선. gpiozero Mock으로 검증. → 입력→판정→출력 코드상 완성.
- ✅ **GUI 시스템 종료 + 전원부 정리** — `⏻ 시스템 종료`(안전종료), 마스터=멀티탭(§8). 로커 RL2-321N 미사용.
- ✅ **전장 실물 결선 + E2E 검증 완료(2026-07-15, 상세 §12)** — 결선도 §3 그대로 배선, 전 구간 실물 확인: 버튼 B1~B4·EMO GPIO 입력 / 시리얼 ACK 4/4·릴레이 채널 정합 / 12V 타워램프 실점등(녹·황·적+부저) / **폴트 3종 통과**(무ACK 경고창·재연결 BLOCK 복원 / EMO 단선 부팅 즉시 BLOCK / ACK 회귀).
  - 검증 중 발견·수정: Arduino 펌웨어 미탑재 → 재업로드 / **EMO 비상 유지 중 GUI BLOCK 해제가 통과되던 안전 결함 → `gpio_input.emo_active()` 레벨 체크 + `safety_console._release_block()` 거부·경고창**(Rpi5).
- ▶ **다음 = 없음(트랙 A 완료)** — 남은 연동은 비전 쪽(HOI·실테스트, CLAUDE.md 현재 상태 참조). 실콘솔 이관 시 재결선만 재확인.

## 구성 (확정)
- **차단 대상**: 실장비 없음 → 시뮬 부하(12V LED 파일럿, 시연용). 최종 차단 시각화 = 타워램프 녹 OFF. Arduino UNO R4 + 릴레이(**최종 4채널 사용** / 8채널 모듈 SZH-RLBG-009는 시연·확장용).
- **프로토콜**: RPi `pyserial` → `RUN`/`WARN`/`BLOCK\n`(+ACK). `/dev/ttyACM0` 115200.
- **연결**: fsm `SafetyFSM(on_interlock=…, on_feedback=…)` → `safety_console._on_interlock/_on_feedback` 배선.
- **입력**: 버튼 B1~B4·EMO → Pi GPIO (✅ 코드 완료 `gpio_input.py`, 결선도 §3.1).

## 참고 자산
- `./ref/` — 구 Test에서 살린 ESP32 TCP·Arduino 스케치(`camera_stream` 등). gitignore(637M).

## 역할 분담
- 배선·실연결 = 사용자 / 코드·배선도 = Claude.
