import {test} from "node:test";
import assert from "node:assert/strict";
import {stagedRun} from "../../src/lib/staged.ts";
import {runs} from "../../src/lib/timeline.ts";
import {stateAt} from "../../src/lib/uiState.ts";

// 10/9 시험 전 영상(측정 기록 없음) — 화면을 보고 정한 누름 시각(초)
const R = stagedRun(1, [
  {button: "B1", t: 6.44, sub: {label: "플라즈마 클린 진행", sec: 10}},
  {button: "B2", t: 19.52, sub: {label: "N2 퍼지", sec: 10}, tool: {want: "wrench", seen: 24.6, grasped: 26.6}},
  {button: "B3", t: 36.95, sub: {label: "전극 온도 하강", sec: 10}},
  {button: "B4", t: 50.98},
]);
const at = (sec: number) => stateAt(R.events, R.runStart, sec * 1000);

test("판 시작 뒤 첫 차례는 B1 · 누르기 전엔 감시 중", () => {
  assert.equal(R.runStart, 1000);
  assert.equal(at(5).state, "MONITOR");
  assert.equal(at(5).expected, "B1");
});
test("누른 직후 = 맞는 누름 · 대기 막대 시작", () => {
  const s = at(6.5);
  assert.deepEqual(s.lastPress, {button: "B1", t: 6440, ok: true});
  assert.equal(s.sub?.label, "플라즈마 클린 진행");
});
test("대기 막대 = 정한 초만큼 차오른다", () => {
  assert.ok(Math.abs(at(6.44 + 5).sub!.progress - 0.5) < 0.01);
});
test("대기가 끝나면 완료 목록에 들고 다음 차례로", () => {
  const s = at(17);
  assert.deepEqual(s.done, ["B1"]);
  assert.equal(s.sub, null);
  assert.equal(s.expected, "B2");
});
test("공구 — 찾는 중 → 확인 중 → 쥠", () => {
  assert.equal(at(22).tool?.phase, "search");
  assert.equal(at(25).tool?.phase, "checking");
  assert.equal(at(27).tool?.phase, "grasped");
  assert.equal(at(27).tool?.want, "wrench");
});
test("마지막 누름 = 완주 · 네 단계 완료", () => {
  const s = at(52);
  assert.deepEqual(s.done, ["B1", "B2", "B3", "B4"]);
  assert.equal(s.state, "IDLE");
  assert.deepEqual(runs(R.events), [{start: 1000, end: 50980, ok: true}]);
});
test("사건은 시각 순서", () => {
  assert.ok(R.events.every((e, i) => i === 0 || R.events[i - 1].t <= e.t));
});
test("공구 확인은 1초마다 한 번씩 세고 세 번째가 쥠(실제 시스템 confirm 3번)", () => {
  assert.deepEqual([at(24.7).tool?.checks, at(25.7).tool?.checks, at(26.7).tool?.checks], [1, 2, 3]);
  assert.equal(at(26.7).tool?.phase, "grasped");
});
test("정답 누름 없이도 판을 꾸민다(first) · 덧붙인 사건(extra)은 초 → ms 로 시각 순서에 섞인다", () => {
  const W = stagedRun(3, [], {first: "B1", extra: [
    {t: 7.43, kind: "state", d: {old: "MONITOR", new: "WARNING", expected: "B1", dwell_roi: "B3", dwell_start_ms: 7130}},
    {t: 8.0, kind: "press", d: {button: "B2", source: "gpio", expected: "B1", state: "WARNING"}},
    {t: 8.0, kind: "state", d: {old: "WARNING", new: "BLOCK", expected: "B1"}},
  ]});
  const s = (sec: number) => stateAt(W.events, W.runStart, sec * 1000);
  assert.equal(s(6).expected, "B1");
  assert.deepEqual([s(7.5).alert?.kind, s(7.5).alert?.button], ["warning", "B3"]);
  assert.deepEqual([s(8.1).alert?.kind, s(8.1).alert?.button, s(8.1).lastPress?.ok], ["block", "B2", false]);
  assert.ok(W.events.every((e, i) => i === 0 || W.events[i - 1].t <= e.t));
});
