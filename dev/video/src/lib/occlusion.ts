import type {DetView} from "./dets.ts";

export type Rect = {x: number; y: number; w: number; h: number};
type Fit = {s: number; x: number; y: number};

// 화면 자리(rect)에 버튼·공구 박스나 손 점이 들어오는가 — 들어오면 그 패널을 흐리게 해 손·버튼을 가리지 않는다(PRODUCT 원칙 3)
export function covers(r: Rect, v: DetView, fit: Fit): boolean {
  const X = (x: number) => fit.x + x * fit.s;
  const Y = (y: number) => fit.y + y * fit.s;
  const hitBox = ([, , x1, y1, x2, y2]: [string, number, number, number, number, number]) =>
    X(x1) < r.x + r.w && X(x2) > r.x && Y(y1) < r.y + r.h && Y(y2) > r.y;
  if (v.btn.some(hitBox) || v.tool.some(hitBox)) return true;
  return (v.hand ?? []).some(([x, y]) => X(x) >= r.x && X(x) <= r.x + r.w && Y(y) >= r.y && Y(y) <= r.y + r.h);
}
