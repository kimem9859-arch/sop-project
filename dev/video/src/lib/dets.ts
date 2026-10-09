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

// fromSec 이후 손이 처음 보인 시각(초) — 손 등장 연출은 본편에서 이 한 번만(G3 「첫 등장에만」) · 없으면 null
export function firstHandAt(d: Dets, fromSec: number): number | null {
  const f0 = Math.ceil(fromSec * d.fps - 1e-6);
  for (const r of d.rows) if (r.f >= f0 && r.hand) return r.f / d.fps;
  return null;
}

// sec 이전 backSec 안에서 name 버튼이 마지막으로 보인 박스 — 누르는 손가락이 버튼을 가려 검출이 끊길 때 누름 파동 자리
// (10/9 초안 B3 누름 앞뒤 13프레임 끊김) · 앞(미래)은 보지 않는다 · 없으면 null
export function lastBox(d: Dets, sec: number, name: string, backSec: number): Box | null {
  const f = Math.floor(sec * d.fps + 1e-6);
  for (let k = 0; k <= Math.round(backSec * d.fps); k++) {
    const b = rowAt(d, f - k)?.btn.find((x) => x[0] === name);
    if (b) return b;
  }
  return null;
}

// 검지 끝(손 21점의 8번) 자취 — sec 부터 back 초 전까지 프레임마다(오래된 것 → 지금) · 손이 없는 순간은 건너뜀
// 판정 장면에서 「무엇을 보고 판정하나」(검지 끝이 버튼 박스 안)를 빛 꼬리로 보인다(시안 8 피드백 「테크적이고 화려하게」)
export function tipTrail(d: Dets, sec: number, back: number): Pt[] {
  const n = Math.round(back * d.fps);
  const out: Pt[] = [];
  for (let i = n; i >= 0; i--) {
    const h = detAt(d, sec - i / d.fps).hand;
    if (h && h[8]) out.push(h[8]);
  }
  return out;
}
