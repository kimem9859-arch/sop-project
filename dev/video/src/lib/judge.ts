import type {Ev} from "./timeline.ts";

// 판정 기준 장면의 「0.3초 머묾 타이머」 — 경고 사건에 남은 머문 시작(dwell_start_ms)부터 경고까지의 비율
// 기록에 있는 값으로만 그린다(꾸민 수치 아님) · 경고 뒤 SHOW_AFTER_MS 동안 가득 찬 채로 남는다 · 머문 시작이 없으면 그리지 않는다
export const SHOW_AFTER_MS = 1000;
export type Dwell = {button: string; startMs: number; warnMs: number; progress: number; warned: boolean};

export function dwellAt(evs: Ev[], runStart: number, t: number): Dwell | null {
  for (const e of evs) {
    if (e.t < runStart || e.kind !== "state" || e.d.new !== "WARNING") continue;
    const s = e.d.dwell_start_ms;
    if (typeof s !== "number" || !e.d.dwell_roi || e.t <= s) continue;
    if (t >= s && t < e.t + SHOW_AFTER_MS)
      return {button: e.d.dwell_roi, startMs: s, warnMs: e.t, progress: Math.min(1, (t - s) / (e.t - s)), warned: t >= e.t};
  }
  return null;
}
