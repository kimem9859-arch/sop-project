import type {Clip, Placed} from "./edit.ts";

// 화면 효과의 순수 계산(시안 8 피드백 「연출 · 효과 … 테크적이고 화려하게」) — 같은 입력이면 같은 값(렌더가 몇 번이든 같은 영상)
export const rnd = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

// 글자가 써지는 연출 — age 초 동안 dur 에 걸쳐 앞에서부터(한글 한 글자 단위)
export function typed(text: string, age: number, dur: number): string {
  const cs = Array.from(text);
  const n = age <= 0 ? 0 : age >= dur ? cs.length : Math.ceil((cs.length * age) / dur);  // 올림 — 시작하자마자 첫 글자
  return cs.slice(0, n).join("");
}

// 화면 흔들림 — 처음 amp px 에서 dur 초에 걸쳐 0 으로(제곱 감쇠) · 30fps 박자로 방향이 바뀐다
export function shake(age: number, amp: number, dur: number): [number, number] {
  if (age < 0 || age >= dur) return [0, 0];
  const k = amp * (1 - age / dur) ** 2, f = Math.floor(age * 30);
  return [(rnd(f) * 2 - 1) * k, (rnd(f + 97) * 2 - 1) * k];
}

// 화면 시계 — 원본 sinceSec 가 처음 화면에 나온 프레임부터 지금(ps[i] 의 f 프레임)까지 화면 초
//   같은 촬영 갈래(take · run)로 이어진 구간만 거슬러 찾는다 · 느린 재생 → 정지로 넘어가도 거꾸로 가지 않는다(리뷰 지적 — 차단 순간 2프레임 되감김)
//   화면에 나온 적이 없으면 null
export function screenSince(ps: Placed[], i: number, f: number, fps: number, sinceSec: number): number | null {
  const same = (a: Clip, b: Clip) => a.take === b.take && a.run === b.run;
  let at: number | null = null;
  for (let j = i; j >= 0 && same(ps[j].clip, ps[i].clip); j--) {
    const c = ps[j].clip;
    if (c.hold !== undefined) { if (!c.card && Math.abs(c.from - sinceSec) < 1e-6) at = ps[j].start; }
    else if (c.from <= sinceSec && sinceSec <= c.to) at = ps[j].start + ((sinceSec - c.from) / c.speed) * fps;
  }
  return at === null ? null : (ps[i].start + f - at) / fps;
}

// 장 전환 — f 가 장 제목 카드의 첫 win 초 안이면 카드 시작 뒤 초 · 아니면 null
export function burstAge(ps: Placed[], f: number, fps: number, win: number): number | null {
  const p = ps.find((x) => x.start <= f && f < x.start + x.frames);
  if (!p || p.clip.card !== "chapter") return null;
  const a = (f - p.start) / fps;
  return a < win ? a : null;
}

// 암호 풀림 — age 초 동안 dur 에 걸쳐 앞에서부터 원문이 드러나고, 나머지는 원문 글자를 섞어 같은 글자 수로(빈칸은 빈칸 — 줄 모양 유지)
//   seed = 프레임마다 바꾸면 섞인 글자가 깜빡인다 · 사실 카드(시안 10 — 「추천 외에 제안한 효과에 대해서도」)
export function decode(text: string, age: number, dur: number, seed: number): [string, string] {
  const cs = Array.from(text);
  if (age >= dur) return [text, ""];
  const n = age <= 0 ? 0 : Math.floor((cs.length * age) / dur);
  const pool = cs.filter((c) => c !== " ");
  const noise = cs.slice(n).map((c, i) => (c === " " || !pool.length ? c : pool[Math.floor(rnd(seed * 31 + (n + i) * 7.7) * pool.length)]));
  return [cs.slice(0, n).join(""), noise.join("")];
}

// 확대 창 자리 — 상자 오른쪽 위 → 왼쪽 위 → 오른쪽 아래 → 왼쪽 아래 → 위 → 오른쪽 → 왼쪽 → 아래 중
//   화면 안이고 다른 상자(avoid)와 안 겹치는 첫 자리 · 모두 겹치면 가장 덜 가리는 자리(시안 10 — EMO 창이 B4 를 가림)
export type Rect = {x: number; y: number; w: number; h: number};
export function insetSpot(box: Rect, S: number, avoid: Rect[], W: number, H: number, gap = 30): {x: number; y: number} {
  const R = box.x + box.w + gap, L = box.x - gap - S, U = box.y - gap - S, D = box.y + box.h + gap;
  const cx = box.x + box.w / 2 - S / 2, cy = box.y + box.h / 2 - S / 2;
  const cand = [{x: R, y: U}, {x: L, y: U}, {x: R, y: D}, {x: L, y: D}, {x: cx, y: U}, {x: R, y: cy}, {x: L, y: cy}, {x: cx, y: D}];
  const inside = (p: {x: number; y: number}) => p.x >= 20 && p.y >= 20 && p.x + S <= W - 20 && p.y + S <= H - 20;
  const cover = (p: {x: number; y: number}) => avoid.reduce((s, a) =>
    s + Math.max(0, Math.min(p.x + S, a.x + a.w) - Math.max(p.x, a.x)) * Math.max(0, Math.min(p.y + S, a.y + a.h) - Math.max(p.y, a.y)), 0);
  const clamp = (p: {x: number; y: number}) => ({x: Math.min(Math.max(20, p.x), W - 20 - S), y: Math.min(Math.max(20, p.y), H - 20 - S)});
  const ok = cand.filter(inside), pool = ok.length ? ok : cand.map(clamp);   // 화면 안 자리가 없으면 자리마다 화면 안으로 당김
  return pool.find((p) => cover(p) === 0) ?? pool.reduce((m, p) => (cover(p) < cover(m) ? p : m));
}
