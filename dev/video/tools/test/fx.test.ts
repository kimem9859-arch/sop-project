import {test} from "node:test";
import assert from "node:assert/strict";
import {burstAge, screenSince, shake, typed} from "../../src/lib/fx.ts";
import {place, type Clip} from "../../src/lib/edit.ts";

test("글자 써짐 — 0초 = 빈 글 · dur 이상 = 전부 · 가운데 = 앞부분(한글 한 글자 단위)", () => {
  assert.equal(typed("다음 단계 뭐야?", 0, 1), "");
  assert.equal(typed("다음 단계 뭐야?", 1, 1), "다음 단계 뭐야?");
  assert.equal(typed("다음 단계 뭐야?", 5, 1), "다음 단계 뭐야?");
  assert.equal(typed("가디언", 0.5, 1), "가디");
  assert.equal(typed("가디언", -1, 1), "");
});
test("흔들림 — 처음에 크고 dur 뒤엔 0 · 같은 입력이면 같은 값(렌더가 몇 번이든 같은 영상)", () => {
  const [x0, y0] = shake(0.02, 18, 0.3);
  assert.ok(Math.hypot(x0, y0) > 0);
  assert.deepEqual(shake(0.3, 18, 0.3), [0, 0]);
  assert.deepEqual(shake(-0.1, 18, 0.3), [0, 0]);
  assert.deepEqual(shake(0.1, 18, 0.3), shake(0.1, 18, 0.3));
  const [x1, y1] = shake(0.25, 18, 0.3), cap = 18 * (1 - 0.25 / 0.3) ** 2 + 1e-9;
  assert.ok(Math.abs(x1) <= cap && Math.abs(y1) <= cap);
});
test("화면 시계 — 느린 구간 → 정지 구간으로 넘어가도 거꾸로 가지 않는다 · 같은 갈래에서 화면에 안 나온 시각이면 null", () => {
  const k = (from: number, to: number, speed: number, run: string, hold?: number): Clip =>
    ({take: "x", run, file: "f", from, to, speed, overlay: true, ...(hold !== undefined ? {hold} : {})});
  const ps = place([k(0, 1, 1, "a"), k(7.3, 8.05, 0.4, "b"), k(8.05, 8.05, 1, "b", 3.6)], 30);  // 0~30 · 30~86 · 86~194
  const xs: number[] = [];
  for (let f = 53; f < ps[1].frames; f++) xs.push(screenSince(ps, 1, f, 30, 8.0)!);   // 8.0 = 느린 구간 52.5 프레임째
  for (let f = 0; f < 5; f++) xs.push(screenSince(ps, 2, f, 30, 8.0)!);
  xs.slice(1).forEach((x, i) => assert.ok(x > xs[i], `${i}: ${xs[i]} → ${x}`));
  assert.ok(Math.abs(xs[0] - 0.5 / 30) < 1e-9);
  assert.equal(screenSince(ps, 2, 0, 30, 0.5), null);   // 다른 갈래(a)에서만 나온 시각
  assert.equal(screenSince(ps, 2, 0, 30, 6.0), null);   // 화면에 나온 적 없는 시각
});
test("장 전환 — 장 제목 카드 첫 win 초 동안만 카드 시작 뒤 초 · 절 카드 · 다른 구간은 null", () => {
  const k = (card?: "chapter" | "section"): Clip => ({take: "x", file: "f", from: 0, to: card ? 0 : 1, speed: 1, overlay: true,
    ...(card ? {hold: 1, card, chapter: {no: "01", title: "t", desc: "d"}} : {})});
  const ps = place([k(), k("chapter"), k("section"), k()], 30);   // 0~30 · 30~60 장 · 60~90 절 · 90~120
  assert.equal(burstAge(ps, 29, 30, 0.4), null);
  assert.equal(burstAge(ps, 30, 30, 0.4), 0);
  assert.equal(burstAge(ps, 36, 30, 0.4), 0.2);
  assert.equal(burstAge(ps, 42, 30, 0.4), null);
  assert.equal(burstAge(ps, 60, 30, 0.4), null);
});
