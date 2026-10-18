// HUD 켜짐 시간표(초 · boot 0~1 = 0~BOOT_SEC) — HudBoot(가상 세계 · 점검 목록 · 스캔 선)와 Hud(단계 목록 · 버튼 강조 차례)가 같이 쓰는 순수 계산
// 시안 17 피드백 「가상 환경 연출 · 비전 감시 시작 상태 점검 · 점검 완료 장면을 합쳤으면」 → 한 장면:
//   0 ~ 0.6                    안경 프레임이 사라진 직후 가상 세계가 펼쳐짐(번쩍 · 눈꺼풀)
//   HEAD_AT ~                  가상 세계가 배경으로 이어지는 위에 「비전 감시 시작」 + 점검 4줄(차분한 등장)
//   4번째 줄(작업 레시피) 정상  왼쪽 위 단계 목록이 나타남(PANEL_FROM · 시안 17 「레시피 불러오기가 정상이 되면」 · 편집마다 다르게 = panelState)
//   BANNER_FROM                같은 띠 안에 「점검 완료 · 버튼 탐지를 시작합니다」
//   LIST_END ~ BANNER_TO       띠와 가상 세계가 함께 걷힘(= WORLD_SEC)
//   CHECK_SEC ~ + SCAN_HOLD_SEC 화면 정지 — 스캔 선 위 → 아래 → 위 한 번 → 그다음 버튼 강조 B1 → … → EMO(지지직 없음)
//   끝나면 단계 목록 「작업 시작」 → 「감시 중」
// (옛 시안 1~7 피드백 — 점검 줄 · 버튼 차례 줄임 · 가상 세계 화려하게 · 스캔 왕복 1.5초 — 는 그대로)
export const HEAD_AT = 0.7, ROW_AT = 1.1, ROW_GAP = 0.45, ROW_CHECK = 0.35;
export const RECIPE_OK = ROW_AT + 3 * ROW_GAP + ROW_CHECK;     // 4번째 줄 「작업 레시피 불러오기」 정상
export const BANNER_FROM = RECIPE_OK + 0.15, LIST_END = BANNER_FROM + 1.0, BANNER_TO = LIST_END + 0.5;
export const WORLD_SEC = BANNER_TO;
export const CHECK_SEC = BANNER_TO + 0.3;
export const BTN_ORDER = ["B1", "B2", "B3", "B4", "EMO"];
export const BTN_INTRO_SEC = 1.0;               // 버튼 하나의 강조 연출 길이
const SCAN_AT = 0.1, SCAN_HALF = 0.75;          // 스캔 시작(정지 구간 기준) · 내려가는(올라오는) 데 걸리는 초
export const SCAN_END = CHECK_SEC + SCAN_AT + 2 * SCAN_HALF;
const BTN_FIRST = SCAN_AT + 2 * SCAN_HALF + 0.1;
export const BTN_STEP = 0.45; // 스캔이 끝난 뒤 첫 버튼 · 버튼 사이 간격 = 확대 창이 떠 있는 초(5차에 0.35 로 줄였다가 「확대 효과가 너무 빨라」로 되돌림)
export const SCAN_HOLD_SEC = BTN_FIRST + BTN_STEP * (BTN_ORDER.length - 1) + BTN_INTRO_SEC + 0.3;
export const BOOT_SEC = CHECK_SEC + SCAN_HOLD_SEC;
export const PANEL_FROM = RECIPE_OK / BOOT_SEC;

// 켜짐 모양(편집마다 · Cut BOOT_OPTS → Hud) — world = 가상 세계 펼침 · panelAt = 단계 목록이 나타나는 켜짐 초(한이음 = 점검 완료 뒤 · D84)
export type BootOpts = {world: boolean; panelAt: number};
// 단계 목록 — 보이는지 · 나타난 뒤 초(지지직 등장 · 켜짐이 끝나면 null)
//   🔴 boot(0~1) 비율로 비교 · 계산한다 — 켜짐 초(boot × BOOT_SEC)로 바꿔 쓰면 수학적으로 같아도 반올림이 달라
//   지지직(floor(age × 30))이 프레임마다 바뀐다(최종 리뷰 — 예선판 2프레임이 달라졌던 것) · 기본값은 옛 Hud 식과 비트 단위로 같다
export function panelState(boot: number, panelAt = RECIPE_OK): {shown: boolean; age: number | null} {
  const from = panelAt / BOOT_SEC;
  return {shown: boot >= from, age: boot >= 1 ? null : (boot - from) * BOOT_SEC};
}

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
