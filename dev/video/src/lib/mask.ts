import type {DetView} from "./dets.ts";
import type {Clip} from "./edit.ts";

// 화면 정지 구간에서 흐림·어둡게를 빼는 자리(화면 좌표) — 탐지 연출의 주인공은 선명하게
// (시안 1 피드백 「버튼은 화면 효과에서 잘라」·「손에는 적용되지 않게」·공구도 같게)
// a = 선명한 정도(0~1) — 버튼은 강조 차례가 와야 차오른다(시안 4 피드백 「스캔이 실행되고 있을 때 … 배경과 같이 흐림 · 어두움 …
//   각 버튼 강조 효과가 실행될 때 같이 밝고 선명해지게」) · reveal(이름) = 그 버튼의 a
export type Rect = {x: number; y: number; w: number; h: number; a: number};
const BOX_PAD = 16, HAND_PAD = 30;

export function holesFor(intro: Clip["intro"], v: DetView, fit: {s: number; x: number; y: number}, reveal: (name: string) => number = () => 1): Rect[] {
  const box = ([, , x1, y1, x2, y2]: [string, number, number, number, number, number], p: number, a = 1): Rect =>
    ({x: fit.x + x1 * fit.s - p, y: fit.y + y1 * fit.s - p, w: (x2 - x1) * fit.s + 2 * p, h: (y2 - y1) * fit.s + 2 * p, a});
  const hand = (): Rect[] => {
    if (!v.hand) return [];
    const xs = v.hand.map((q) => q[0]), ys = v.hand.map((q) => q[1]);
    return [box(["hand", 1, Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)], HAND_PAD)];
  };
  if (intro === "buttons") return v.btn.filter((b) => reveal(b[0]) > 0).map((b) => box(b, BOX_PAD, reveal(b[0])));
  if (intro === "hand") return hand();
  if (intro === "tool") return v.tool.map((b) => box(b, BOX_PAD));
  if (intro === "overlap") return [...hand(), ...v.tool.map((b) => box(b, BOX_PAD))];
  return [];
}

// 흰 사각형(가장자리 부드럽게)만 보이는 가림막 그림 — CSS mask-image 에 그대로
export function holeMask(rs: Rect[], W: number, H: number): string {
  const rects = rs.map((r) => `<rect x='${r.x.toFixed(1)}' y='${r.y.toFixed(1)}' width='${r.w.toFixed(1)}' height='${r.h.toFixed(1)}' rx='14' fill='white' fill-opacity='${r.a.toFixed(3)}'/>`).join("");
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${W}' height='${H}'><defs><filter id='f'><feGaussianBlur stdDeviation='6'/></filter></defs><g filter='url(#f)'>${rects}</g></svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}
