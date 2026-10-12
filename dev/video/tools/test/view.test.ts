import {test} from "node:test";
import assert from "node:assert/strict";
import {IDENTITY, outOfFrame, viewAt, zoomFit, zoomRect} from "../../src/lib/view.ts";

test("기준점이 없으면 원래 화면 · 밖은 끝값", () => {
  assert.deepEqual(viewAt(undefined, 3), IDENTITY);
  const k: [number, number, number, number][] = [[10, 1, 0.5, 0.5], [11, 1.5, 0.45, 0.6]];
  assert.deepEqual(viewAt(k, 5), {z: 1, cx: 0.5, cy: 0.5});
  assert.deepEqual(viewAt(k, 20), {z: 1.5, cx: 0.45, cy: 0.6});
});

test("기준점 사이는 부드럽게(가운데 = 절반 · 끝에서 기울기 0)", () => {
  const k: [number, number, number, number][] = [[0, 1, 0.5, 0.5], [1, 2, 0.5, 0.5]];
  assert.ok(Math.abs(viewAt(k, 0.5).z - 1.5) < 1e-9);
  assert.ok(viewAt(k, 0.01).z - 1 < 0.001);   // 시작 근처는 거의 안 움직임
});

test("확대한 검출 좌표 = 확대한 영상 자리와 같은 변환", () => {
  const W = 1920, H = 1080, v = {z: 1 / 0.7, cx: 0.47, cy: 0.65};
  const fit = {s: 1.5, x: 0, y: 0};               // 1280×720 → 1920×1080
  const f2 = zoomFit(fit, v, W, H), r = zoomRect(v, W, H);
  // 원본 왼쪽 위 모서리(0,0) = 영상 요소의 왼쪽 위
  assert.ok(Math.abs(f2.x - r.left) < 1e-9 && Math.abs(f2.y - r.top) < 1e-9);
  // 창 왼쪽 끝(원본 x = 0.12) 은 화면 왼쪽 끝 0 으로
  assert.ok(Math.abs(f2.x + 0.12 * 1280 * f2.s) < 1e-6);
});

test("창이 원본 밖으로 나가는 기준점을 잡아낸다", () => {
  assert.equal(outOfFrame([0, 1 / 0.7, 0.47, 0.65]), false);   // 가로 0.12~0.82 · 세로 0.30~1.00
  assert.equal(outOfFrame([0, 1.2, 0.3, 0.5]), true);
  assert.equal(outOfFrame([0, 0.9, 0.5, 0.5]), true);
});
