import {test} from "node:test";
import assert from "node:assert/strict";
import {detAt, fitRect, HOLD_FRAMES, type Box, type Dets} from "../../src/lib/dets.ts";

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
