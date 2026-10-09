import {test} from "node:test";
import assert from "node:assert/strict";
import {holeMask, holesFor} from "../../src/lib/mask.ts";
import type {DetView} from "../../src/lib/dets.ts";

// 화면 정지 구간에서 흐림·어둡게를 빼는 자리(시안 1 피드백 「버튼은 화면 효과에서 잘라」·「손에는 적용되지 않게」)
const fit = {s: 2, x: 10, y: 0};
const view: DetView = {btn: [["B1", 0.9, 0, 0, 10, 10], ["B2", 0.9, 20, 0, 30, 10]], tool: [["wrench", 0.9, 50, 50, 60, 80]],
  hand: [[100, 100], [120, 140], [110, 90]]};
test("버튼 정지 = 버튼마다 · 손 정지 = 손 상자 · 공구 = 공구 상자 · 겹침 = 손 + 공구 · 그 밖 = 없음(화면 좌표 · 여유 포함)", () => {
  const b = holesFor("buttons", view, fit);
  assert.equal(b.length, 2);
  assert.deepEqual(b[0], {x: 10 - 16, y: 0 - 16, w: 20 + 32, h: 20 + 32});
  const h = holesFor("hand", view, fit);
  assert.deepEqual(h, [{x: 10 + 200 - 30, y: 180 - 30, w: 40 + 60, h: 100 + 60}]);
  assert.equal(holesFor("tool", view, fit).length, 1);
  assert.equal(holesFor("overlap", view, fit).length, 2);
  assert.deepEqual(holesFor(undefined, view, fit), []);
  assert.deepEqual(holesFor("hand", {...view, hand: null}, fit), []);
});
test("가림막(mask) = 자리마다 흰 사각형 하나 · 크기는 화면 크기", () => {
  const url = holeMask([{x: 1, y: 2, w: 3, h: 4}, {x: 5, y: 6, w: 7, h: 8}], 1920, 1080);
  const svg = decodeURIComponent(url.replace("data:image/svg+xml;charset=utf-8,", ""));
  assert.equal((svg.match(/<rect /g) ?? []).length, 2);
  assert.ok(svg.includes("width='1920'") && svg.includes("height='1080'"));
});
