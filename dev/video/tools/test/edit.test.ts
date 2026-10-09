import {test} from "node:test";
import assert from "node:assert/strict";
import {place, srcSec, totalFrames, type Clip} from "../../src/lib/edit.ts";

const c = (from: number, to: number, speed: number): Clip => ({take: "x", file: "original.mp4", from, to, speed, overlay: true});
test("배속 구간의 길이 = 원본 길이 / 배속", () => {
  const ps = place([c(0, 8, 1), c(10, 30, 4), c(40, 42, 0.5)], 30);
  assert.deepEqual(ps.map((p) => [p.start, p.frames]), [[0, 240], [240, 150], [390, 120]]);
  assert.equal(totalFrames(ps), 510);
});
test("원본 시각은 구간 안에서 단조 증가하고 끝이 to 에 닿는다", () => {
  const k = c(10, 30, 4);
  const xs = Array.from({length: 151}, (_, f) => srcSec(k, f, 30));
  xs.slice(1).forEach((x, i) => assert.ok(x > xs[i]));
  assert.equal(xs[150], 30);
});
test("잘못된 구간은 멈춘다", () => {
  assert.throws(() => place([c(5, 5, 1)], 30), /잘못된 구간/);
  assert.throws(() => place([c(0, 5, 0)], 30), /잘못된 구간/);
});
test("정지(hold) 구간 — 길이 = hold 초 · 원본 시각은 from 에 고정", () => {
  const h: Clip = {take: "x", file: "proxy.mp4", from: 3.2, to: 3.2, speed: 1, overlay: true, hold: 2.6, intro: "buttons"};
  const ps = place([c(0, 3.2, 1), h, c(3.2, 5, 1)], 30);
  assert.deepEqual(ps.map((p) => [p.start, p.frames]), [[0, 96], [96, 78], [174, 54]]);
  assert.equal(srcSec(h, 0, 30), 3.2);
  assert.equal(srcSec(h, 77, 30), 3.2);
  assert.throws(() => place([{...h, hold: 0}], 30), /잘못된 구간/);
});
