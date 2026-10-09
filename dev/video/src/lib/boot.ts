// HUD 켜짐 시간표(boot 0~1 · BOOT_SEC 초) — HudBoot(스캔 선)와 ButtonBoxes(버튼 탐지 연출)가 같이 쓰는 순수 계산
export const BOOT_SEC = 3;
// 스캔 선이 위→아래로 지나가는 구간 — 맨 아래 버튼도 켜짐이 끝나기 전에 탐지 연출(0.7초)을 마치게 앞당겼다(G3 「버튼도 탐지 실행 연출」)
export const SCAN_FROM = 0.36;
export const SCAN_TO = 0.72;

const easeOut = (x: number) => (x >= 1 ? 1 : x <= 0 ? 0 : 1 - Math.pow(2, -10 * x));

export const scanY = (boot: number, H: number) => easeOut((boot - SCAN_FROM) / (SCAN_TO - SCAN_FROM)) * H;

// 역함수 — 스캔 선이 높이 y 를 지나간 boot 값(버튼마다 탐지 연출을 시작하는 때)
export function scanPassBoot(y: number, H: number): number {
  const v = Math.min(Math.max(y / H, 0), 1 - 1e-9);
  const x = v <= 0 ? 0 : -Math.log2(1 - v) / 10;
  return SCAN_FROM + Math.min(1, x) * (SCAN_TO - SCAN_FROM);
}
