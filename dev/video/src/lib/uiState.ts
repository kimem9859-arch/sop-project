import type {Ev} from "./timeline.ts";

export type SubView = {button: string; label: string; progress: number; since: number; totalMs: number}; // since = 시작 기록 시각
// since = 단계(찾는 중·확인 중·쥠·다른 공구)가 바뀐 기록 시각 · checks = 연속 확인 수(쥠 = confirm 3번)
export type ToolView = {phase: string; want: string; wrong: string | null; since: number; checks: number};
export type AlertView = {kind: "warning" | "block"; expected: string; button: string | null; since: number};
// called = 호출어(「가디언」)를 들음 · ack = 질문 뒤 답 전에 재생한 소리(「확인해 보겠습니다」 · 실제 시스템은 LLM 과 겹쳐 튼다)
// thinking = 질문~답 사이(LLM 생각 중) · card = LLM 에 붙인 사실 카드 줄(시안의 연출 기록에만 있음 — 실제 기록엔 없다)
// calledSince · answerSince = 호출 · 답 기록 시각(듣는 중 파동 · 답 글자가 써지는 연출의 시계 · 시안 8 피드백 「테크적이고 화려하게」)
export type VoiceView = {listening: boolean; question: string | null; answer: string | null; speaking: boolean; alert: string | null;
  called: boolean; ack: boolean; thinking: boolean; thinkingSince: number | null; card: string[] | null;
  calledSince: number | null; answerSince: number | null; endedAt: number | null;   // endedAt = 답 재생이 끝난 기록 시각(음성 파동이 그때까지 · 시안 17)
  said: Said[]};
// said = 작업자가 말한 것(utter 사건 — 말을 시작한 기록 시각 · 말한 길이 ms) — 말하는 동안 말풍선 글자가 써진다
//   시안 17 3차 피드백 「음성비서의 남자 목소리와 UI가 맞지 않아」 — 「가디언」 · 질문 말풍선이 목소리가 끝난 뒤에야 나오던 것을 목소리와 함께
//   (연출 기록에만 있다 — 실제 기록은 호출 · 받아쓰기 결과만 남는다)
export type Said = {text: string; since: number; dur: number};
export type PressView = {button: string; t: number; ok: boolean};
export type UiState = {
  state: string; expected: string | null; done: string[]; sub: SubView | null; tool: ToolView | null;
  alert: AlertView | null; voice: VoiceView; lastPress: PressView | null;
  lastDone: {button: string; order: number; t: number} | null; // 마지막으로 끝난 단계(완료 안내)
};
const CONFIRM_SCANS = 3; // 쥠 = 연속 확인 3번(Rpi5/Demo/tool_state.py confirm_scans)

export const BUBBLE_HOLD_MS = 2500; // 답 재생이 끝난 뒤 말풍선을 이만큼 더 보인다
// 사실 카드 시각표(질문 뒤 초 · hud FactCard · VoiceBubbles · Fx FactStreams · 편집표 소리가 같이 쓴다)
//   CARD_IN 카드가 크게 나타남(내용은 비어 있음) → STREAM_AT 상태 모음 빛줄기 출발 → CARD_FILL 카드에 닿으면 내용이 써짐
//   → CARD_FLY 「LLM 생각 중」 말풍선으로 날아감 → CARD_LAND 들어감
//   시안 17 3차 피드백 「사실 카드가 나오고 내용이 써지기 전부터 상태 모음 효과」 — 빛줄기가 카드보다 먼저 나가던 것을 카드 → 빛줄기 → 내용 순으로
//   (카드 · 빛줄기 0.6초 · 다 써진 뒤 읽을 틈 약 1.1초 — 날아감 3.0 → 3.2)
export const CARD_IN = 0.6, STREAM_AT = CARD_IN + 0.15, STREAM_RUN = 0.6, CARD_FILL = STREAM_AT + STREAM_RUN, CARD_FLY = 3.2, CARD_LAND = 3.9;
const SUB_FALLBACK_MS = 10000;      // 끝 기록이 없을 때(판이 잘림) — recipe.json 의 sec

function subWindow(evs: Ev[], start: Ev): {end: number | null; paused: [number, number][]} {
  const paused: [number, number][] = [];
  let p: number | null = null;
  for (const e of evs) {
    if (e.t <= start.t || e.kind !== "sub" || e.d.button !== start.d.button) continue;
    if (e.d.what === "pause") p = e.t;
    else if (e.d.what === "resume" && p !== null) { paused.push([p, e.t]); p = null; }
    else if (e.d.what === "finish" || e.d.what === "cancel") {
      if (p !== null) paused.push([p, e.t]);
      return {end: e.t, paused};
    } else if (e.d.what === "start") break;
  }
  return {end: null, paused};
}

const pausedUntil = (paused: [number, number][], t: number) =>
  paused.reduce((s, [a, b]) => s + Math.max(0, Math.min(b, t) - a), 0);

// 기록 시각 t(ms) 의 화면 상태 — runStart 이전 사건은 보지 않는다(다른 판이 섞이지 않게)
export function stateAt(evs: Ev[], runStart: number, t: number): UiState {
  const s: UiState = {
    state: "IDLE", expected: null, done: [], sub: null, tool: null, alert: null,
    voice: {listening: false, question: null, answer: null, speaking: false, alert: null,
      called: false, ack: false, thinking: false, thinkingSince: null, card: null, calledSince: null, answerSince: null, endedAt: null, said: []},
    lastPress: null, lastDone: null,
  };
  let subStart: Ev | null = null;
  let answeredAt: number | null = null;
  let lastPlayEnd = -Infinity;
  for (const e of evs) {
    if (e.t < runStart) continue;
    if (e.t > t) break;
    const d = e.d;
    switch (e.kind) {
      case "state":
        s.state = d.new;
        s.expected = d.expected ?? null;
        if (d.new === "WARNING") s.alert = {kind: "warning", expected: d.expected, button: d.dwell_roi ?? null, since: e.t};
        else if (d.new === "BLOCK")
          s.alert = {kind: "block", expected: d.expected, button: s.lastPress && !s.lastPress.ok ? s.lastPress.button : null, since: e.t};
        else s.alert = null;
        break;
      case "press":
        s.lastPress = {button: d.button, t: e.t, ok: d.button === d.expected && d.state !== "BLOCK"};
        break;
      case "step_done":
        s.done.push(d.button);
        s.lastDone = {button: d.button, order: d.order, t: e.t};
        break;
      case "sub":
        if (d.what === "start") { subStart = e; s.sub = {button: d.button, label: d.label ?? "", progress: 0, since: e.t, totalMs: 0}; s.tool = null; }
        else if (d.what === "finish" || d.what === "cancel") { subStart = null; s.sub = null; s.tool = null; }
        break;
      case "tool_scan": {
        const wrong = s.tool?.wrong ?? null;
        const keep = wrong !== null && d.phase === "search" && Array.isArray(d.seen) && d.seen.includes(wrong);
        const prev = s.tool;
        const same = prev !== null && prev.phase === d.phase && (prev.wrong !== null) === keep;
        const checks = d.phase === "grasped" ? CONFIRM_SCANS : d.phase === "checking" ? (same ? prev.checks + 1 : 1) : 0;
        s.tool = {phase: d.phase, want: d.want, wrong: keep ? wrong : null, since: same ? prev.since : e.t, checks};
        break;
      }
      case "wrong_tool":
        s.tool = {phase: s.tool?.phase ?? "search", want: d.want, wrong: d.got, since: e.t, checks: 0};
        break;
      case "release":
        s.alert = null;
        break;
      case "wake":
        s.voice = {...s.voice, listening: true, called: true, question: null, answer: null, ack: false, thinking: false, thinkingSince: null, card: null,
          calledSince: e.t, answerSince: null, endedAt: null};
        answeredAt = null;
        break;
      case "utter":   // 작업자 말 시작 — first = 호출어(새 대화의 첫 말)
        s.voice = {...s.voice, said: [...(d.first ? [] : s.voice.said), {text: String(d.text ?? ""), since: e.t, dur: Number(d.dur ?? 0) * 1000}]};
        if (d.first) answeredAt = null;   // 새 대화 — 지난 답의 말풍선 걷기가 새 말을 지우지 않게
        break;
      case "stt":
        if (s.voice.listening && d.text) {
          s.voice.question = d.text; s.voice.listening = false; s.voice.thinking = true; s.voice.thinkingSince = e.t;
        }
        break;
      case "card":
        s.voice.card = Array.isArray(d.lines) ? d.lines : null;
        break;
      case "answer":
        s.voice.answer = typeof d.text === "string" && d.text ? d.text : null;
        s.voice.thinking = false; s.voice.answerSince = e.t;
        answeredAt = e.t;
        break;
      case "play_start":
        s.voice.speaking = true;
        if (s.voice.question && answeredAt === null) s.voice.ack = true;
        break;
      case "play_end":
        s.voice.speaking = false; lastPlayEnd = e.t;
        if (answeredAt !== null) s.voice.endedAt = e.t;
        break;
      case "alert":
        s.voice.alert = d.key ?? null;
        break;
      case "alert_played":
      case "alert_clear":
        s.voice.alert = null;
        break;
    }
  }
  if (s.sub && subStart) {
    const {end, paused} = subWindow(evs, subStart);
    const stop = end ?? subStart.t + SUB_FALLBACK_MS;
    const total = stop - subStart.t - pausedUntil(paused, stop);
    const done = t - subStart.t - pausedUntil(paused, t);
    s.sub.progress = Math.min(1, Math.max(0, total > 0 ? done / total : 0));
    s.sub.totalMs = total;
  }
  if (answeredAt !== null && !s.voice.speaking && lastPlayEnd > answeredAt && t - lastPlayEnd > BUBBLE_HOLD_MS) {
    s.voice = {...s.voice, question: null, answer: null, called: false, ack: false, thinking: false, thinkingSince: null, card: null,
      calledSince: null, answerSince: null, endedAt: null, said: []};
  }
  return s;
}
