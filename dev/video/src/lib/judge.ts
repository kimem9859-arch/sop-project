import type {Ev} from "./timeline.ts";

// 판정 기준 장면의 「머묾 타이머」 — 오답 버튼 상자에 검지가 머문 시간(기록에 있는 값으로만 · 꾸민 수치 아님)
//   warn  = 0.3초 이상 머물러 경고(state → WARNING · dwell_start_ms) — 머문 시작부터 경고까지 차오름
//   graze = 0.3초 안에 떠남(스침 · 경고 아님) — 감시 → 작업 진행 전이에 남은 dwell_roi·dwell_start_ms(실제 기록에 있음 ·
//           견본 154014 판 1) · 떠난 순간에 멈춘 타이머
// 끝난 뒤 SHOW_AFTER_MS 동안 남는다 · 머문 시작이 없으면 그리지 않는다
export const SHOW_AFTER_MS = 1000;
export const DWELL_MS = 300; // 경고 기준 0.3초(통합 §7.4 · 발표 S20)
export type Dwell = {kind: "warn" | "graze"; button: string; startMs: number; endMs: number; progress: number; done: boolean};

export function dwellAt(evs: Ev[], runStart: number, t: number): Dwell | null {
  for (const e of evs) {
    if (e.t < runStart || e.kind !== "state") continue;
    const s = e.d.dwell_start_ms;
    if (typeof s !== "number" || !e.d.dwell_roi || e.t <= s || t < s || t >= e.t + SHOW_AFTER_MS) continue;
    const warn = e.d.new === "WARNING";
    if (!warn && e.t - s >= DWELL_MS) continue;
    const done = t >= e.t;
    const progress = warn ? Math.min(1, (t - s) / (e.t - s)) : (Math.min(t, e.t) - s) / DWELL_MS;
    return {kind: warn ? "warn" : "graze", button: e.d.dwell_roi, startMs: s, endMs: e.t, progress, done};
  }
  return null;
}
