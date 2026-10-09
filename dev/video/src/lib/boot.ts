// HUD 켜짐 시간표(boot 0~1 · BOOT_SEC 초) — HudBoot(점검 목록·스캔 선)와 ButtonBoxes(버튼 탐지 연출)가 같이 쓰는 순수 계산
// 10/9 초안 피드백 「점검하는 듯한 연출 … 모든 사항이 점검 완료되면 그다음에 버튼 탐지」·「탐지 연출 동안 화면을 정지」:
//   0 ~ CHECK_SEC          「비전 감시 시작」 + 점검 목록(영상은 흐른다)
//   ~ + SCAN_HOLD_SEC      화면 정지·흐림 — 스캔 선이 지나가는 버튼마다 탐지 연출(편집표 hold 와 같은 길이)
//   ~ + PANEL_SEC          단계 목록이 지지직 나타남(영상 다시 흐름)
export const CHECK_SEC = 3.2;
export const SCAN_HOLD_SEC = 2.6;
export const PANEL_SEC = 0.8;
export const BOOT_SEC = CHECK_SEC + SCAN_HOLD_SEC + PANEL_SEC;
export const BTN_INTRO_SEC = 1.0; // 버튼 하나의 탐지 연출 길이
// 스캔 선이 위→아래로 지나가는 구간(정지 구간 안) — 맨 아래 버튼도 정지가 풀리기 전에 탐지 연출을 마치게
export const SCAN_FROM = (CHECK_SEC + 0.15) / BOOT_SEC;
export const SCAN_TO = (CHECK_SEC + 1.4) / BOOT_SEC;
export const PANEL_FROM = (CHECK_SEC + SCAN_HOLD_SEC) / BOOT_SEC;

const easeOut = (x: number) => (x >= 1 ? 1 : x <= 0 ? 0 : 1 - Math.pow(2, -10 * x));

export const scanY = (boot: number, H: number) => easeOut((boot - SCAN_FROM) / (SCAN_TO - SCAN_FROM)) * H;

// 역함수 — 스캔 선이 높이 y 를 지나간 boot 값(버튼마다 탐지 연출을 시작하는 때)
export function scanPassBoot(y: number, H: number): number {
  const v = Math.min(Math.max(y / H, 0), 1 - 1e-9);
  const x = v <= 0 ? 0 : -Math.log2(1 - v) / 10;
  return SCAN_FROM + Math.min(1, x) * (SCAN_TO - SCAN_FROM);
}
