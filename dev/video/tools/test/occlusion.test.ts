import {test} from "node:test";
import assert from "node:assert/strict";
import {covers} from "../../src/lib/occlusion.ts";
import type {DetView} from "../../src/lib/dets.ts";

const fit = {s: 1.5, x: 0, y: 0}; // 사본 1280×720 → 화면 1920×1080
const panel = {x: 40, y: 40, w: 360, h: 300};
const view = (btn: DetView["btn"], hand: DetView["hand"] = null): DetView => ({btn, tool: [], hand});

test("버튼 박스가 패널과 겹치면 가린다", () => {
  assert.equal(covers(panel, view([["B1", 0.9, 100, 100, 130, 130]]), fit), true); // 화면 150~195
});
test("패널 밖 박스는 가리지 않는다", () => {
  assert.equal(covers(panel, view([["B1", 0.9, 600, 400, 640, 440]]), fit), false);
});
test("손 점 하나라도 패널 안이면 가린다", () => {
  assert.equal(covers(panel, view([], [[800, 600], [100, 100]]), fit), true);
});
test("공구 박스도 본다", () => {
  assert.equal(covers(panel, {btn: [], tool: [["wrench", 0.9, 10, 10, 50, 50]], hand: null}, fit), true);
});
