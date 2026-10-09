import {test} from "node:test";
import assert from "node:assert/strict";
import {hull} from "../../src/lib/geom.ts";

// 손 모양 구역(시안 3 피드백 「각진 모양이 아닌 손 모양에 맞는 구역」) — 손 21점을 감싸는 볼록 껍질
test("볼록 껍질 — 안쪽 점은 빼고 바깥 꼭짓점만 한 바퀴", () => {
  const h = hull([[0, 0], [10, 0], [10, 10], [0, 10], [5, 5], [3, 7], [10, 5]]);
  assert.deepEqual(h, [[0, 0], [10, 0], [10, 10], [0, 10]]);
});
test("점이 셋보다 적으면 그대로", () => {
  assert.deepEqual(hull([[1, 2], [3, 4]]), [[1, 2], [3, 4]]);
});
