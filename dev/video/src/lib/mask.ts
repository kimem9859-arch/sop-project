import type {DetView} from "./dets.ts";
import type {Clip} from "./edit.ts";
import {HAND_EDGES, hull} from "./geom.ts";

// 흐림·어둡게를 빼는 자리(화면 좌표) — 탐지 연출의 주인공은 선명하게(정지 구간 · 시안 17 부터 재생 구간도)
// (시안 1 피드백 「버튼은 화면 효과에서 잘라」·「손에는 적용되지 않게」·공구도 같게)
// a = 선명한 정도(0~1) — 버튼은 강조 차례가 와야 차오른다(시안 4 피드백 「스캔이 실행되고 있을 때 … 배경과 같이 흐림 · 어두움 …
//   각 버튼 강조 효과가 실행될 때 같이 밝고 선명해지게」) · reveal(이름) = 그 버튼의 a
// hand = 손 모양 자리(화면 좌표 21점 · lw = 손가락 굵기) — 있으면 사각형 대신 손가락 뼈대를 굵게 + 손바닥을 칠한다(시안 17 3차 피드백
//   「박스가 아닌 손 모양에 맞는 폴리곤으로」) · x · y · w · h 는 그 손을 감싼 상자(여유 포함)
export type Rect = {x: number; y: number; w: number; h: number; a: number; hand?: [number, number][]; lw?: number};
const BOX_PAD = 16, HAND_PAD = 30;
const FINGER = 0.32, FINGER_PAD = 28;   // 손가락 굵기 = 손바닥 폭(5 ↔ 17번 점)의 0.32 + 여유(검출 오차 · 가장자리 흐림)

// 판정 장면(시안 17 피드백 「배경을 흐리고 어둡게 · 손과 판정 구역 버튼만 강조」) — 손 + 판정 구역(버튼 박스에 둘레 링까지)
//   zone = 손이 가려도 크기가 유지되는 버튼 박스(lib/dets stableBox) · 둘레 = JudgeZone 의 바깥 링(박스 긴 변의 0.75) + 여유
export function spotHoles(v: DetView, fit: {s: number; x: number; y: number}, zone: [string, number, number, number, number, number] | null): Rect[] {
  const out = holesFor("dwell", v, fit);   // 손 모양(시안 17 3차)
  if (zone) {
    const [, , x1, y1, x2, y2] = zone, ring = Math.max(x2 - x1, y2 - y1) * fit.s * 0.75 + 24;
    out.push({x: fit.x + x1 * fit.s - ring, y: fit.y + y1 * fit.s - ring, w: (x2 - x1) * fit.s + 2 * ring, h: (y2 - y1) * fit.s + 2 * ring, a: 1});
  }
  return out;
}

export function holesFor(intro: Clip["intro"], v: DetView, fit: {s: number; x: number; y: number}, reveal: (name: string) => number = () => 1): Rect[] {
  const box = ([, , x1, y1, x2, y2]: [string, number, number, number, number, number], p: number, a = 1): Rect =>
    ({x: fit.x + x1 * fit.s - p, y: fit.y + y1 * fit.s - p, w: (x2 - x1) * fit.s + 2 * p, h: (y2 - y1) * fit.s + 2 * p, a});
  // shape = 손 자리 모양 — 손 탐지 장면은 사각형(시안 17 4차 피드백 「객체 탐지 손 장면은 이전 박스로 롤백」) · 판정 · 공구 장면은 손 모양
  const hand = (shape: "box" | "poly"): Rect[] => {
    if (!v.hand) return [];
    const xs = v.hand.map((q) => q[0]), ys = v.hand.map((q) => q[1]);
    const r = box(["hand", 1, Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)], HAND_PAD);
    if (shape === "box") return [r];
    const P = v.hand.map(([x, y]): [number, number] => [fit.x + x * fit.s, fit.y + y * fit.s]);
    const d = (i: number, j: number) => Math.hypot(P[i][0] - P[j][0], P[i][1] - P[j][1]);
    const palm = Math.max(d(5, 17), d(0, 9) * 0.5);   // 손이 옆으로 서면 5 ↔ 17 이 붙으므로 손목 ↔ 가운데 손가락 뿌리의 절반도 본다
    return [{...r, hand: P, lw: palm * FINGER + FINGER_PAD}];
  };
  if (intro === "buttons") return v.btn.filter((b) => reveal(b[0]) > 0).map((b) => box(b, BOX_PAD, reveal(b[0])));
  if (intro === "hand") return hand("box");
  if (intro === "tool") return v.tool.map((b) => box(b, BOX_PAD));
  if (intro === "overlap") return [...hand("poly"), ...v.tool.map((b) => box(b, BOX_PAD))];
  if (intro === "dwell") return hand("poly");   // 판정 장면(spotHoles)
  return [];
}

// 흰 사각형 · 손 모양(가장자리 부드럽게)만 보이는 가림막 그림 — CSS mask-image 에 그대로
//   손 = 뼈대 선을 손가락 굵기로 + 손바닥(손목 · 손가락 뿌리 껍질)을 칠함 · 겹친 곳이 진해지지 않게 묶음 전체에 밝기
const PALM = [0, 1, 2, 5, 9, 13, 17];
const handSvg = (P: [number, number][], lw: number, a: number) => {
  const f = (n: number) => n.toFixed(1);
  const lines = HAND_EDGES.map(([i, j]) => `<line x1='${f(P[i][0])}' y1='${f(P[i][1])}' x2='${f(P[j][0])}' y2='${f(P[j][1])}'/>`).join("");
  const palm = hull(PALM.map((i) => P[i])).map(([x, y]) => `${f(x)},${f(y)}`).join(" ");
  return `<g opacity='${a.toFixed(3)}' fill='white' stroke='white' stroke-width='${f(lw)}' stroke-linecap='round' stroke-linejoin='round'>${lines}<polygon points='${palm}'/></g>`;
};
export function holeMask(rs: Rect[], W: number, H: number): string {
  const rects = rs.map((r) => r.hand && r.lw ? handSvg(r.hand, r.lw, r.a)
    : `<rect x='${r.x.toFixed(1)}' y='${r.y.toFixed(1)}' width='${r.w.toFixed(1)}' height='${r.h.toFixed(1)}' rx='14' fill='white' fill-opacity='${r.a.toFixed(3)}'/>`).join("");
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${W}' height='${H}'><defs><filter id='f'><feGaussianBlur stdDeviation='6'/></filter></defs><g filter='url(#f)'>${rects}</g></svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}
