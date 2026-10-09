import {test} from "node:test";
import assert from "node:assert/strict";
import {calloutAt} from "../../src/lib/callout.ts";

// 사람이 짚은 표시(타워램프)의 자리 — 열쇠 시각 사이를 이어 따라간다 · 범위 밖(앞뒤 0.2초 넘게)은 없음
const keys: [number, number, number, number, number][] = [[10, 100, 0, 20, 80], [11, 200, 10, 20, 80], [12, 200, 10, 40, 80]];
test("열쇠 사이는 직선으로 잇고, 열쇠 위는 그 값", () => {
  assert.deepEqual(calloutAt(keys, 10), [100, 0, 20, 80]);
  assert.deepEqual(calloutAt(keys, 10.5), [150, 5, 20, 80]);
  assert.deepEqual(calloutAt(keys, 11.5), [200, 10, 30, 80]);
});
test("범위 밖은 null · 앞뒤 0.2초까지는 끝 값", () => {
  assert.equal(calloutAt(keys, 9.7), null);
  assert.deepEqual(calloutAt(keys, 12.1), [200, 10, 40, 80]);
  assert.equal(calloutAt(keys, 12.3), null);
  assert.equal(calloutAt([], 1), null);
});
