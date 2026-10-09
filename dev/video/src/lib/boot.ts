// HUD 켜짐 시간표(초 · boot 0~1 = 0~BOOT_SEC) — HudBoot(가상 세계 · 점검 목록 · 스캔 선)와 Hud(단계 목록 · 버튼 강조 차례)가 같이 쓰는 순수 계산
// 시안 1~3 피드백:
//   0 ~ WORLD_SEC              안경 프레임이 사라진 직후 가상 세계가 펼쳐짐(여기까지 인트로)
//   HEAD_AT ~ LIST_END         「비전 감시 시작」 + 점검 4줄(차분한 등장)
//   LIST_END ~ BANNER_FROM     점검 목록이 내려가며 사라짐 → BANNER 「점검 완료 · 버튼 탐지를 시작합니다」 따로
//   BANNER_TO ~ CHECK_SEC      왼쪽 위 단계 목록이 나타남(「작업 시작」)
//   CHECK_SEC ~ + SCAN_HOLD_SEC 화면 정지 — 스캔 선 위 → 아래 → 위 한 번 → 그다음 버튼 강조 B1 → … → EMO(지지직 없음)
//   끝나면 단계 목록 「작업 시작」 → 「감시 중」
// 시안 6 피드백 「영상 길이 … 1분 30초 정도」 → 점검 줄 · 버튼 차례를 줄임 · 「가상 세계를 좀 더 화려하게」 → WORLD_SEC 늘림
export const WORLD_SEC = 2.6;
export const HEAD_AT = 2.5, ROW_AT = 3.0, ROW_GAP = 0.45, ROW_CHECK = 0.35;
export const LIST_END = 5.1, BANNER_FROM = 5.35, BANNER_TO = 6.15;
export const CHECK_SEC = BANNER_TO + 0.8;
export const BTN_ORDER = ["B1", "B2", "B3", "B4", "EMO"];
export const BTN_INTRO_SEC = 1.0;               // 버튼 하나의 강조 연출 길이
const SCAN_AT = 0.1, SCAN_HALF = 1.0;           // 스캔 시작(정지 구간 기준) · 내려가는(올라오는) 데 걸리는 초
export const SCAN_END = CHECK_SEC + SCAN_AT + 2 * SCAN_HALF;
const BTN_FIRST = SCAN_AT + 2 * SCAN_HALF + 0.1, BTN_STEP = 0.45; // 스캔이 끝난 뒤 첫 버튼 · 버튼 사이 간격
export const SCAN_HOLD_SEC = BTN_FIRST + BTN_STEP * (BTN_ORDER.length - 1) + BTN_INTRO_SEC + 0.3;
export const BOOT_SEC = CHECK_SEC + SCAN_HOLD_SEC;
export const PANEL_FROM = BANNER_TO / BOOT_SEC;

const easeInOut = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);

// 켜짐 s 초의 스캔 선 높이 — 스캔 중이 아니면 null
export function scanY(s: number, H: number): number | null {
  const u = s - CHECK_SEC - SCAN_AT;
  if (u < 0 || u > 2 * SCAN_HALF) return null;
  return (u <= SCAN_HALF ? easeInOut(u / SCAN_HALF) : 1 - easeInOut((u - SCAN_HALF) / SCAN_HALF)) * H;
}

// 켜짐 s 초에 그 버튼의 강조 연출이 시작된 뒤 지난 초(음수 = 아직) · 차례에 없는 이름이면 null
export function btnIntroAge(name: string, s: number): number | null {
  const i = BTN_ORDER.indexOf(name);
  return i < 0 ? null : s - (CHECK_SEC + BTN_FIRST + BTN_STEP * i);
}
