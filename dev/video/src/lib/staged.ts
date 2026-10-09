import type {Ev} from "./timeline.ts";

// 시험 전 초안용 「연출 기록」 — 측정 기록 없이 찍은 영상에, 화면을 보고 정한 누름 시각으로 정상 판 하나를 꾸민다.
// 🔴 실제 시스템 기록이 아니다(설계 D15 = 실제 기록) — 이것으로 만든 화면에는 반드시 그렇게 표기한다.
// 사건 모양 = 측정 기록(Rpi5/Demo/measure/README.md)과 같아 uiState 가 그대로 읽는다 · 시각 = 영상 초 × 1000(sync offsetMs 0)
export type StagedPress = {
  button: string; t: number;                              // 누른 시각(영상 초)
  sub?: {label: string; sec: number};                     // 누른 뒤 대기(recipe 의 서브 단계)
  tool?: {want: string; seen: number; grasped: number};   // 대기 중 공구 — 처음 보인 시각 · 쥠 확인 시각(영상 초)
};
// 덧붙이는 사건(경고·차단·음성 등 — 시각은 영상 초) · src 없으면 main
export type StagedEv = {t: number; kind: string; d: Ev["d"]; src?: Ev["src"]};
const MONITOR_AFTER = 2;  // 차례가 바뀐 뒤 감시 중이 되기까지(초) — 견본 판 1 은 1.1~2.8초
const CONFIRM_AFTER = 0.8; // 누른 뒤 공정 진행으로 넘어가기까지(초) — 견본 판 1 은 0.5~0.8초
const SCAN_EVERY = 1;     // 공구 검사 간격(초) — 견본 판 1 의 tool_scan 간격

// opt.first = 첫 차례(정답 누름 없이 경고·차단만 꾸밀 때) · opt.extra = 그대로 섞을 사건
export function stagedRun(start: number, presses: StagedPress[], opt: {first?: string; extra?: StagedEv[]} = {}): {runStart: number; runEnd: number; events: Ev[]} {
  const ev: Ev[] = [];
  const add = (sec: number, kind: string, d: Ev["d"] = {}, src: Ev["src"] = "main") => ev.push({t: Math.round(sec * 1000), kind, d, src});
  const state = (sec: number, from: string, to: string, expected: string) => add(sec, "state", {old: from, new: to, expected});
  const first = opt.first ?? presses[0].button;
  add(start, "run_start");
  state(start, "IDLE", "READY", first);
  state(start, "READY", "PROCESS_RUN", first);
  state(start + MONITOR_AFTER, "PROCESS_RUN", "MONITOR", first);
  presses.forEach((p, i) => {
    const next = presses[i + 1];
    add(p.t, "gpio_edge", {button: p.button, src: "edge"});
    add(p.t, "press", {button: p.button, source: "gpio", expected: p.button, state: "MONITOR"});
    if (!next) {
      state(p.t, "MONITOR", "IDLE", first);
      add(p.t, "step_done", {order: i + 1, button: p.button});
      add(p.t, "run_end", {ok: true, total_sec: p.t - start});
      return;
    }
    const end = p.t + (p.sub?.sec ?? 0);
    if (p.sub) {
      add(p.t, "sub", {what: "start", button: p.button, label: p.sub.label});
      state(p.t + CONFIRM_AFTER, "MONITOR", "PROCESS_RUN", p.button);
      add(end, "sub", {what: "finish", button: p.button, label: p.sub.label});
    }
    if (p.tool) {
      const {want, seen, grasped} = p.tool;
      // 찾는 중 = 누른 뒤부터 · 확인 중 = 처음 보인 때부터 1초마다 · 쥠 = grasped 부터(실제 시스템은 연속 확인 3번째에 쥠)
      const times: number[] = [];
      for (let s = p.t + 0.2; s < seen; s += SCAN_EVERY) times.push(s);
      for (let s = seen; s < grasped - 1e-6; s += SCAN_EVERY) times.push(s);
      for (let s = grasped; s < end; s += SCAN_EVERY) times.push(s);
      for (const s of times) {
        const phase = s < seen ? "search" : s < grasped ? "checking" : "grasped";
        add(s, "tool_scan", {hand: true, seen: phase === "search" ? [] : [want], tool: phase === "grasped" ? want : null, phase, want});
      }
    }
    state(end, "PROCESS_RUN", "READY", next.button);
    state(end, "READY", "PROCESS_RUN", next.button);
    add(end, "step_done", {order: i + 1, button: p.button});
    state(Math.min(end + MONITOR_AFTER, next.t - 0.3), "PROCESS_RUN", "MONITOR", next.button);
  });
  for (const x of opt.extra ?? []) add(x.t, x.kind, x.d, x.src);
  ev.sort((a, b) => a.t - b.t); // 같은 시각은 넣은 순서 유지(안정 정렬)
  return {runStart: ev[0].t, runEnd: ev[ev.length - 1].t, events: ev};
}
