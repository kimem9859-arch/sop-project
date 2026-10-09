// HUD 켜짐 시간표(초 · boot 0~1 = 0~BOOT_SEC) — HudBoot(점검 목록·스캔 선)와 Hud(버튼 탐지 연출 차례)가 같이 쓰는 순수 계산
// 10/9 초안·시안 1 피드백:
//   0 ~ LIST_END            「비전 감시 시작」 + 점검 4줄(영상 흐름 · 지지직 아닌 차분한 등장)
//   LIST_END ~ BANNER_FROM  점검 목록이 내려가며 사라짐
//   BANNER_FROM ~ BANNER_TO 「점검 완료 · 버튼 탐지를 시작합니다」 따로(「UI를 내리고 그 다음에 … 뜨게끔 나누었으면」)
//   CHECK_SEC ~ + SCAN_HOLD_SEC  화면 정지 — 스캔 선 위 → 아래 → 다시 위(「아래로 간 후 다시 위로 한번더」) ·
//                                버튼 탐지 연출은 B1 → B2 → B3 → B4 → EMO 차례로(「빠르지 않게 순서대로」)
//   ~ + PANEL_SEC           단계 목록 등장(영상 다시 흐름)
export const LIST_END = 2.55, BANNER_FROM = 2.85, BANNER_TO = 3.85;
export const CHECK_SEC = 3.9;
export const BTN_ORDER = ["B1", "B2", "B3", "B4", "EMO"];
export const BTN_INTRO_SEC = 1.0;               // 버튼 하나의 탐지 연출 길이
const BTN_FIRST = 0.3, BTN_STEP = 0.5;          // 정지 구간 시작 뒤 첫 버튼 · 버튼 사이 간격
const SCAN_AT = 0.1, SCAN_HALF = 1.1;           // 스캔 시작(정지 구간 기준) · 내려가는(올라오는) 데 걸리는 초
export const SCAN_HOLD_SEC = BTN_FIRST + BTN_STEP * (BTN_ORDER.length - 1) + BTN_INTRO_SEC + 0.2;
export const PANEL_SEC = 0.8;
export const BOOT_SEC = CHECK_SEC + SCAN_HOLD_SEC + PANEL_SEC;
export const PANEL_FROM = (CHECK_SEC + SCAN_HOLD_SEC) / BOOT_SEC;

const easeInOut = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);

// 켜짐 s 초의 스캔 선 높이 — 스캔 중이 아니면 null
export function scanY(s: number, H: number): number | null {
  const u = s - CHECK_SEC - SCAN_AT;
  if (u < 0 || u > 2 * SCAN_HALF) return null;
  return (u <= SCAN_HALF ? easeInOut(u / SCAN_HALF) : 1 - easeInOut((u - SCAN_HALF) / SCAN_HALF)) * H;
}

// 켜짐 s 초에 그 버튼의 탐지 연출이 시작된 뒤 지난 초(음수 = 아직) · 차례에 없는 이름이면 null
export function btnIntroAge(name: string, s: number): number | null {
  const i = BTN_ORDER.indexOf(name);
  return i < 0 ? null : s - (CHECK_SEC + BTN_FIRST + BTN_STEP * i);
}
