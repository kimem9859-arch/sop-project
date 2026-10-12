import type {Ev} from "./timeline.ts";

// 판정 기준 장면의 「머묾 타이머」 — 오답 버튼 상자에 검지가 머문 시간(기록에 있는 값으로만 · 꾸민 수치 아님)
//   warn  = 0.3초 이상 머물러 경고(state → WARNING · dwell_start_ms) — 머문 시작부터 경고까지 차오름 · 끝난 뒤 1초
//   graze = 0.3초 안에 떠남(스침 · 경고 아님) — 감시 → 작업 진행 전이에 남은 dwell_roi·dwell_start_ms(견본 154014 판 1) · 1초
//   block = 0.3초 전에 눌러 차단(state → BLOCK 에 머문 시작이 있을 때) — 잠깐 보이고 차단 순간 0.3초 안에 사라짐(시안 3 피드백)
// 머문 시작이 없으면 그리지 않는다 · dwell_end_ms = 머묾 재기가 멈춘 시각(누른 순간 — 차단 표시가 누름보다 늦게 오는 시안 17 장면에서
//   타이머가 누른 자리에서 멈춘다 · 없으면 상태가 바뀐 시각)
export const SHOW_AFTER_MS = 1000, BLOCK_AFTER_MS = 300;
export const DWELL_MS = 300; // 경고 기준 0.3초(통합 §7.4 · 발표 S20)
export type Dwell = {kind: "warn" | "graze" | "block"; button: string; startMs: number; endMs: number; progress: number; done: boolean};

export function dwellAt(evs: Ev[], runStart: number, t: number): Dwell | null {
  for (const e of evs) {
    if (e.t < runStart || e.kind !== "state") continue;
    const s = e.d.dwell_start_ms;
    if (typeof s !== "number" || !e.d.dwell_roi || e.t <= s || t < s) continue;
    const kind = e.d.new === "WARNING" ? "warn" : e.d.new === "BLOCK" ? "block" : "graze";
    if (kind === "graze" && e.t - s >= DWELL_MS) continue;
    if (t >= e.t + (kind === "block" ? BLOCK_AFTER_MS : SHOW_AFTER_MS)) continue;
    const end = typeof e.d.dwell_end_ms === "number" ? e.d.dwell_end_ms : e.t;
    const progress = kind === "warn" ? Math.min(1, (t - s) / (e.t - s)) : Math.min(1, (Math.min(t, end) - s) / DWELL_MS);
    return {kind, button: e.d.dwell_roi, startMs: s, endMs: e.t, progress, done: t >= e.t};
  }
  return null;
}
