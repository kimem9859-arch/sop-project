import {test} from "node:test";
import assert from "node:assert/strict";
import {detAt, fitRect, HOLD_FRAMES, type Box, type Dets, lastBox, type DetRow} from "../../src/lib/dets.ts";

const B = (n: string, x: number): Box => [n, 0.9, x, 10, x + 20, 30];
const mk = (rows: Dets["rows"]): Dets => ({src: "t", fps: 30, w: 100, h: 50, rows});
const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-6, `${a} vs ${b}`);

test("정확한 프레임은 그 행 그대로", () => {
  const d = mk([{f: 0, btn: [B("B1", 0)], tool: [], hand: null}, {f: 1, btn: [B("B1", 10)], tool: [], hand: null}]);
  assert.deepEqual(detAt(d, 1 / 30).btn, [B("B1", 10)]);
});
test("몇 프레임 끊기면 직전 박스·손을 이름별로 유지한다(깜빡임 방지)", () => {
  const d = mk([{f: 0, btn: [B("B1", 0), B("B2", 50)], tool: [], hand: [[1, 1]]}, {f: 1, btn: [B("B1", 0)], tool: [], hand: null}]);
  const v = detAt(d, 1 / 30);
  assert.deepEqual(v.btn.map((b) => b[0]).sort(), ["B1", "B2"]);
  assert.deepEqual(v.hand, [[1, 1]]);
});
test("HOLD_FRAMES 보다 오래 끊기면 지운다(멈춘 박스가 남지 않게)", () => {
  const rows: Dets["rows"] = [{f: 0, btn: [B("B2", 50)], tool: [], hand: [[1, 1]]}];
  for (let f = 1; f <= HOLD_FRAMES + 1; f++) rows.push({f, btn: [], tool: [], hand: null});
  const v = detAt(mk(rows), (HOLD_FRAMES + 1) / 30);
  assert.deepEqual(v.btn, []);
  assert.equal(v.hand, null);
});
test("프레임 사이(느린 재생)는 같은 이름 박스와 손을 선형 보간", () => {
  const d = mk([{f: 0, btn: [B("B1", 0)], tool: [], hand: [[0, 0]]}, {f: 1, btn: [B("B1", 10)], tool: [], hand: [[10, 20]]}]);
  const v = detAt(d, 0.5 / 30);
  near(v.btn[0][2], 5);
  near(v.hand![0][0], 5);
  near(v.hand![0][1], 10);
});
test("fitRect — 세로 사본을 가로 화면 가운데에 맞춤", () => {
  assert.deepEqual(fitRect(720, 1280, 1920, 1080), {s: 0.84375, x: 656.25, y: 0});
});
test("firstHandAt — 그 시각 뒤로 손이 처음 보인 시각(첫 등장 연출은 여기서만)", async () => {
  const {firstHandAt} = await import("../../src/lib/dets.ts");
  const rows: Dets["rows"] = [];
  for (let f = 0; f < 60; f++) rows.push({f, btn: [], tool: [], hand: (f >= 10 && f < 20) || f >= 40 ? [[1, 1]] : null});
  near(firstHandAt(mk(rows), 0)!, 10 / 30);
  near(firstHandAt(mk(rows), 25 / 30)!, 40 / 30);
  assert.equal(firstHandAt(mk(rows.map((r) => ({...r, hand: null}))), 0), null);
});
test("lastBox — 가려진 버튼은 직전에 보인 자리(backSec 안) · 앞은 보지 않는다", () => {
  const row = (f: number, btn: Box[]): DetRow => ({f, btn, tool: [], hand: null});
  const b3: Box = ["B3", 0.9, 10, 10, 20, 20];
  const d: Dets = {src: "x", fps: 30, w: 100, h: 100, rows: [row(0, [b3]), row(1, [b3]), row(2, []), row(3, []), row(4, []), row(5, [["B3", 0.9, 50, 50, 60, 60]])]};
  assert.deepEqual(lastBox(d, 4 / 30, "B3", 1), b3);
  assert.equal(lastBox(d, 4 / 30, "B3", 0.05), null);
  assert.equal(lastBox(d, 4 / 30, "B1", 1), null);
});
