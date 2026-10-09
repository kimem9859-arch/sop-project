export type OnsetOpt = {hopMs: number; riseDb: number; minGapMs: number; baseHops: number};
export const ONSET_DEFAULT: OnsetOpt = {hopMs: 10, riseDb: 12, minGapMs: 150, baseHops: 20};

// 소리가 갑자기 커지는 시각(초) — 앞 baseHops 칸 평균보다 riseDb 이상 커지고 직전보다 큰 칸
export function onsets(pcm: Int16Array, rate: number, opt: OnsetOpt = ONSET_DEFAULT): number[] {
  const hop = Math.round((rate * opt.hopMs) / 1000);
  const n = Math.floor(pcm.length / hop);
  const db = new Float64Array(n);
  for (let k = 0; k < n; k++) {
    let e = 0;
    for (let i = k * hop; i < (k + 1) * hop; i++) e += pcm[i] * pcm[i];
    db[k] = 10 * Math.log10(e / hop + 1e-9);
  }
  const out: number[] = [];
  let last = -Infinity;
  const gap = opt.minGapMs / opt.hopMs;
  for (let k = opt.baseHops; k < n; k++) {
    let base = 0;
    for (let j = k - opt.baseHops; j < k; j++) base += db[j];
    base /= opt.baseHops;
    if (db[k] - base >= opt.riseDb && db[k] > db[k - 1] && k - last >= gap) {
      out.push((k * hop) / rate);
      last = k;
    }
  }
  return out;
}

export type Fit = {offsetMs: number; matched: number; residualsMs: number[]};

function nearest(sorted: number[], x: number): number {
  let lo = 0;
  let hi = sorted.length - 1;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (sorted[m] < x) lo = m;
    else hi = m;
  }
  return Math.abs(sorted[lo] - x) <= Math.abs(sorted[hi] - x) ? sorted[lo] : sorted[hi];
}

// 사건 시각(ms) = offsetMs + 소리 시각(ms) — 모든 (사건, 소리) 짝을 후보로, tolMs 안에 짝지어지는 사건이 가장 많은 것
export function fitOffset(onsetSec: number[], eventMs: number[], tolMs = 50): Fit {
  const on = onsetSec.map((s) => s * 1000).sort((a, b) => a - b);
  if (!on.length || !eventMs.length) return {offsetMs: NaN, matched: 0, residualsMs: []};
  const resid = (c: number) => eventMs.map((e) => e - c - nearest(on, e - c)).filter((r) => Math.abs(r) <= tolMs);
  let best = {c: NaN, m: -1, err: Infinity};
  for (const e of eventMs) {
    for (const o of on) {
      const r = resid(e - o);
      const err = r.reduce((s, x) => s + Math.abs(x), 0);
      if (r.length > best.m || (r.length === best.m && err < best.err)) best = {c: e - o, m: r.length, err};
    }
  }
  const r0 = [...resid(best.c)].sort((a, b) => a - b);
  const c = best.c + (r0[Math.floor(r0.length / 2)] ?? 0);
  const residualsMs = resid(c);
  return {offsetMs: c, matched: residualsMs.length, residualsMs};
}

// WAV(PCM 16비트 모노) → 샘플 · 🔑 파이프로 받은 WAV 는 길이 칸을 못 채워(0xFFFFFFFF) data 이후 끝까지 읽는다
// (Remotion 내장 ffmpeg 에는 날 PCM 출력 s16le 가 없다 — 2026-10-09 실측)
export function wavPcm(buf: Uint8Array): {pcm: Int16Array; rate: number} {
  const v = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const tag = (o: number) => String.fromCharCode(buf[o], buf[o + 1], buf[o + 2], buf[o + 3]);
  if (tag(0) !== "RIFF" || tag(8) !== "WAVE") throw new Error("WAV 가 아님");
  let o = 12;
  let rate = 0;
  while (o + 8 <= buf.length) {
    const id = tag(o);
    const size = v.getUint32(o + 4, true);
    if (id === "fmt ") rate = v.getUint32(o + 12, true);
    if (id === "data") {
      const start = o + 8;
      const end = size === 0xffffffff || start + size > buf.length ? buf.length : start + size;
      const n = Math.floor((end - start) / 2);
      const pcm = new Int16Array(n);
      for (let i = 0; i < n; i++) pcm[i] = v.getInt16(start + i * 2, true);
      return {pcm, rate};
    }
    o += 8 + size + (size % 2);
  }
  throw new Error("WAV 에 data 가 없음");
}
