import {test} from "node:test";
import assert from "node:assert/strict";
import {dwellAt} from "../../src/lib/judge.ts";
import {stagedRun} from "../../src/lib/staged.ts";

// 경고 사건의 머문 시작(dwell_start_ms)부터 경고까지 = 0.3초 타이머 · 경고 뒤 조금 더 보인다
const R = stagedRun(3, [], {first: "B1", extra: [
  {t: 7.43, kind: "state", d: {old: "MONITOR", new: "WARNING", expected: "B1", dwell_roi: "B3", dwell_start_ms: 7130}},
]});
test("머묾 타이머 — 시작 전엔 없음 · 시작~경고 사이 비율 · 경고 뒤 1초까지 가득", () => {
  assert.equal(dwellAt(R.events, R.runStart, 6800), null);
  const m = dwellAt(R.events, R.runStart, 7280)!;
  assert.equal(m.button, "B3");
  assert.ok(Math.abs(m.progress - 0.5) < 1e-9);
  assert.deepEqual([m.kind, m.done], ["warn", false]);
  assert.deepEqual([dwellAt(R.events, R.runStart, 7900)?.progress, dwellAt(R.events, R.runStart, 7900)?.done], [1, true]);
  assert.equal(dwellAt(R.events, R.runStart, 8500), null);
});
test("머문 시작 기록이 없는 경고는 타이머를 그리지 않는다", () => {
  const X = stagedRun(3, [], {first: "B1", extra: [{t: 7.43, kind: "state", d: {old: "MONITOR", new: "WARNING", expected: "B1", dwell_roi: "B3"}}]});
  assert.equal(dwellAt(X.events, X.runStart, 7300), null);
});
test("스침 — 0.3초 안에 떠난 기록(경고 아님)은 떠난 순간에 멈춘 타이머 · 1초 뒤 사라짐", () => {
  const G = stagedRun(3, [], {first: "B1", extra: [
    {t: 6.27, kind: "state", d: {old: "MONITOR", new: "PROCESS_RUN", expected: "B1", dwell_roi: "B4", dwell_start_ms: 6150}},
  ]});
  const a = dwellAt(G.events, G.runStart, 6200)!;
  assert.deepEqual([a.kind, a.button, a.done], ["graze", "B4", false]);
  assert.ok(Math.abs(a.progress - 50 / 300) < 1e-9);
  const b = dwellAt(G.events, G.runStart, 6800)!;
  assert.deepEqual([b.kind, b.done], ["graze", true]);
  assert.ok(Math.abs(b.progress - 120 / 300) < 1e-9);
  assert.equal(dwellAt(G.events, G.runStart, 7300), null);
});
