import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {mergeEvents, parseEvents, type Ev} from "../../src/lib/timeline.ts";
import {BUBBLE_HOLD_MS, stateAt} from "../../src/lib/uiState.ts";

const fx = (f: string) => readFileSync(new URL(`./fixtures/20261009_154014/${f}`, import.meta.url), "utf8");
const evs = mergeEvents(parseEvents(fx("events.csv"), "main"), parseEvents(fx("voice_events.csv"), "voice"));
const R1 = 250011525.954, R2 = 250057782.499, R3 = 250126887.025;
const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-6, `${a} vs ${b}`);

test("판 1 — B1 누른 직후: 맞는 누름 · 서브 시작", () => {
  const s = stateAt(evs, R1, 250014500);
  assert.deepEqual(s.lastPress, {button: "B1", t: 250014480.592, ok: true});
  assert.equal(s.sub?.label, "플라즈마 클린 진행");
  assert.deepEqual(s.done, []);
});
test("서브 진행 막대 = 시작~끝 기록의 비율", () => {
  near(stateAt(evs, R1, 250014481.399 + (250024659.497 - 250014481.399) / 2).sub!.progress, 0.5);
});
test("서브가 끝나면 완료 목록에 들어가고 막대가 사라진다", () => {
  const s = stateAt(evs, R1, 250024700);
  assert.deepEqual(s.done, ["B1"]);
  assert.equal(s.sub, null);
});
test("공구 — 확인 중 → 쥠", () => {
  assert.equal(stateAt(evs, R1, 250033600).tool?.phase, "checking");
  assert.equal(stateAt(evs, R1, 250035600).tool?.phase, "grasped");
  assert.equal(stateAt(evs, R1, 250035600).tool?.want, "wrench");
});
test("판 2 — 틀린 버튼 누름 → 차단 카드(누른 버튼 · 기대 버튼) · 음성 알림", () => {
  const s = stateAt(evs, R2, 250060300);
  assert.equal(s.state, "BLOCK");
  assert.deepEqual(s.alert, {kind: "block", expected: "B1", button: "B3", since: 250060267.358});
  assert.equal(s.lastPress?.ok, false);
  assert.equal(s.voice.alert, "alert_block_B1");
});
test("차단 해제 뒤 카드가 사라지고, 음성 알림은 alert_clear 에서 끝난다", () => {
  const s = stateAt(evs, R2, 250064300);
  assert.equal(s.alert, null);
  assert.equal(s.voice.alert, "alert_block_B1");
  assert.equal(stateAt(evs, R2, 250064400).voice.alert, null);
});
test("판 2 시작으로 보면 판 1 완료가 안 보인다(Review Focus 3)", () => {
  assert.deepEqual(stateAt(evs, R2, 250060300).done, []);
});
test("판 3 — 호출 → 질문 → 답 → 재생 → 말풍선 유지 뒤 사라짐", () => {
  const a = stateAt(evs, R3, 250137000);
  assert.equal(a.voice.question, "지금몇판이야?");
  assert.equal(a.voice.answer, "지금은 1단계입니다.");
  assert.equal(a.voice.speaking, false);
  assert.equal(stateAt(evs, R3, 250137500).voice.speaking, true);
  assert.equal(stateAt(evs, R3, 250138725.116 + BUBBLE_HOLD_MS + 100).voice.question, null);
});
test("빈 받아쓰기는 질문이 아니고, 글 없는 답은 answer null(Review Focus 5)", () => {
  const e = (t: number, kind: string, d: Record<string, unknown> = {}): Ev => ({t, kind, d, src: "voice"});
  const xs = [e(1, "wake"), e(2, "stt", {text: ""}), e(3, "stt", {text: "다음 뭐야"}), e(4, "answer", {src: "고정", key: "ans_next"})];
  const s = stateAt(xs, 0, 5);
  assert.equal(s.voice.question, "다음 뭐야");
  assert.equal(s.voice.answer, null);
});
test("경고 — 머문 버튼(dwell_roi)과 기대 버튼", () => {
  const xs: Ev[] = [{t: 10, kind: "state", d: {old: "MONITOR", new: "WARNING", expected: "B3", dwell_roi: "B4"}, src: "main"}];
  assert.deepEqual(stateAt(xs, 0, 11).alert, {kind: "warning", expected: "B3", button: "B4", since: 10});
});
test("서브 — 시작 시각(since)과 전체 길이(totalMs) · 남은 초 계산용", () => {
  const s = stateAt(evs, R1, 250014500).sub!;
  near(s.since, 250014481.399);
  near(s.totalMs, 250024659.497 - 250014481.399);
});
test("공구 — 단계가 바뀐 시각(since) · 연속 확인 수(checks)", () => {
  const tl = evs.filter((e) => e.kind === "tool_scan" && e.t > R1 && e.t < R2);
  const ck = tl.filter((e) => e.d.phase === "checking");
  const gr = tl.find((e) => e.d.phase === "grasped")!;
  assert.deepEqual([stateAt(evs, R1, ck[0].t).tool?.since, stateAt(evs, R1, ck[0].t).tool?.checks], [ck[0].t, 1]);
  assert.deepEqual([stateAt(evs, R1, ck[1].t).tool?.since, stateAt(evs, R1, ck[1].t).tool?.checks], [ck[0].t, 2]);
  assert.deepEqual([stateAt(evs, R1, gr.t).tool?.since, stateAt(evs, R1, gr.t).tool?.checks], [gr.t, 3]);
});
test("단계 완료 — 마지막으로 끝난 단계와 그 시각(lastDone)", () => {
  const d = evs.find((e) => e.kind === "step_done" && e.t > R1)!;
  assert.equal(stateAt(evs, R1, d.t - 1).lastDone, null);
  assert.deepEqual(stateAt(evs, R1, d.t + 100).lastDone, {button: "B1", order: 1, t: d.t});
});
test("음성 — 호출 → 듣는 중 → 질문 → 「확인해 보겠습니다」(답 전 재생) · LLM 생각 중(질문~답) → 답", () => {
  const V = (t: number, kind: string, d: Record<string, unknown> = {}): Ev => ({t, kind, d, src: "voice"});
  const ev = [V(1000, "wake"), V(2500, "stt", {text: "다음 단계 뭐야?"}), V(2700, "play_start"), V(3600, "play_end", {what: "완료"}),
    V(2650, "card", {lines: ["[사실]", "지금 할 일: 기다린다"]}), V(6000, "answer", {text: "기다리세요."}), V(6100, "play_start"), V(8000, "play_end", {what: "완료"})]
    .sort((a, b) => a.t - b.t);
  const v = (t: number) => stateAt(ev, 0, t).voice;
  assert.deepEqual([v(1500).called, v(1500).listening, v(1500).question], [true, true, null]);
  assert.deepEqual([v(2600).question, v(2600).thinking, v(2600).thinkingSince, v(2600).ack], ["다음 단계 뭐야?", true, 2500, false]);
  assert.deepEqual([v(3000).ack, v(3000).thinking], [true, true]);
  assert.deepEqual(v(3000).card, ["[사실]", "지금 할 일: 기다린다"]);
  assert.deepEqual([v(6200).answer, v(6200).thinking, v(6200).ack], ["기다리세요.", false, true]);
  assert.deepEqual([v(11000).called, v(11000).question, v(11000).card], [false, null, null]);
});
test("음성 — 호출 시각 · 답 시각(듣는 중 파동 · 답 글자가 써지는 연출의 시계)", () => {
  const V = (t: number, kind: string, d: Record<string, unknown> = {}): Ev => ({t, kind, d, src: "voice"});
  const ev = [V(1000, "wake"), V(2500, "stt", {text: "다음 단계 뭐야?"}), V(6000, "answer", {text: "기다리세요."}),
    V(6100, "play_start"), V(8000, "play_end", {what: "완료"})];
  const v = (t: number) => stateAt(ev, 0, t).voice;
  assert.deepEqual([v(500).calledSince, v(500).answerSince], [null, null]);
  assert.deepEqual([v(1500).calledSince, v(1500).answerSince], [1000, null]);
  assert.deepEqual([v(6200).calledSince, v(6200).answerSince], [1000, 6000]);
  assert.deepEqual([v(11000).calledSince, v(11000).answerSince], [null, null]);   // 말풍선이 걷히면 같이
});
