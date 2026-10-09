export type Box = [string, number, number, number, number, number]; // 이름 · 점수 · x1 · y1 · x2 · y2 (사본 픽셀)
export type Pt = [number, number];
export type DetRow = {f: number; btn: Box[]; tool: Box[]; hand: Pt[] | null};
export type Dets = {src: string; fps: number; w: number; h: number; rows: DetRow[]};
export type DetView = {btn: Box[]; tool: Box[]; hand: Pt[] | null};

// 검출이 이만큼(프레임) 끊겨도 직전 것을 유지한다(깜빡임 방지) — 넘으면 지운다(멈춘 박스가 남지 않게)
export const HOLD_FRAMES = 3;

function rowAt(d: Dets, f: number): DetRow | undefined {
  let lo = 0;
  let hi = d.rows.length - 1;
  while (lo <= hi) {
    const m = (lo + hi) >> 1;
    const r = d.rows[m];
    if (r.f === f) return r;
    if (r.f < f) lo = m + 1;
    else hi = m - 1;
  }
  return undefined;
}

function heldBoxes(d: Dets, f: number, key: "btn" | "tool"): Box[] {
  const seen = new Map<string, Box>();
  for (let k = 0; k <= HOLD_FRAMES; k++) {
    const r = rowAt(d, f - k);
    if (!r) continue;
    for (const b of r[key]) if (!seen.has(b[0])) seen.set(b[0], b);
  }
  return [...seen.values()];
}

function heldHand(d: Dets, f: number): Pt[] | null {
  for (let k = 0; k <= HOLD_FRAMES; k++) {
    const r = rowAt(d, f - k);
    if (r?.hand) return r.hand;
  }
  return null;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function detAt(d: Dets, sec: number): DetView {
  const fi = sec * d.fps;
  const f0 = Math.floor(fi + 1e-6);
  const a = Math.max(0, fi - f0);
  const b0 = heldBoxes(d, f0, "btn");
  const t0 = heldBoxes(d, f0, "tool");
  const h0 = heldHand(d, f0);
  if (a < 1e-6) return {btn: b0, tool: t0, hand: h0};
  const b1 = heldBoxes(d, f0 + 1, "btn");
  const t1 = heldBoxes(d, f0 + 1, "tool");
  const h1 = heldHand(d, f0 + 1);
  const mix = (x: Box[], y: Box[]): Box[] =>
    x.map((b) => {
      const o = y.find((c) => c[0] === b[0]);
      return o ? [b[0], b[1], lerp(b[2], o[2], a), lerp(b[3], o[3], a), lerp(b[4], o[4], a), lerp(b[5], o[5], a)] : b;
    });
  const hand = h0 && h1 ? h0.map((p, i): Pt => [lerp(p[0], h1[i][0], a), lerp(p[1], h1[i][1], a)]) : h0;
  return {btn: mix(b0, b1), tool: mix(t0, t1), hand};
}

export function fitRect(w: number, h: number, W: number, H: number) {
  const s = Math.min(W / w, H / h);
  return {s, x: (W - w * s) / 2, y: (H - h * s) / 2};
}
