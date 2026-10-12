import {test} from "node:test";
import assert from "node:assert/strict";
import {holeMask, holesFor} from "../../src/lib/mask.ts";
import type {DetView} from "../../src/lib/dets.ts";

// 화면 정지 구간에서 흐림·어둡게를 빼는 자리(시안 1 피드백 「버튼은 화면 효과에서 잘라」·「손에는 적용되지 않게」)
const fit = {s: 2, x: 10, y: 0};
// 손 21점 — 손목(0) · 손바닥 뿌리(5 · 9 · 13 · 17)가 들어간 실제 모양(x 100~120 · y 90~140)
const HAND21: [number, number][] = Array.from({length: 21}, (_, i) => [100 + (i % 5) * 5, 90 + Math.floor(i / 5) * 12.5]);
HAND21[0] = [110, 140]; HAND21[5] = [100, 110]; HAND21[17] = [120, 110];
const view: DetView = {btn: [["B1", 0.9, 0, 0, 10, 10], ["B2", 0.9, 20, 0, 30, 10]], tool: [["wrench", 0.9, 50, 50, 60, 80]], hand: HAND21};
test("버튼 정지 = 버튼마다 · 손 정지 = 손 상자 · 공구 = 공구 상자 · 겹침 = 손 + 공구 · 그 밖 = 없음(화면 좌표 · 여유 포함)", () => {
  const b = holesFor("buttons", view, fit);
  assert.equal(b.length, 2);
  assert.deepEqual(b[0], {x: 10 - 16, y: 0 - 16, w: 20 + 32, h: 20 + 32, a: 1});
  const h = holesFor("hand", view, fit);
  assert.equal(h.length, 1);
  assert.deepEqual([h[0].x, h[0].y, h[0].w, h[0].h, h[0].a], [10 + 200 - 30, 180 - 30, 40 + 60, 100 + 60, 1]);   // 감싼 상자(여유 포함)
  assert.equal(holesFor("tool", view, fit).length, 1);
  assert.equal(holesFor("overlap", view, fit).length, 2);
  assert.deepEqual(holesFor(undefined, view, fit), []);
  assert.deepEqual(holesFor("hand", {...view, hand: null}, fit), []);
});
test("가림막(mask) = 자리마다 흰 사각형 하나 · 크기는 화면 크기", () => {
  const url = holeMask([{x: 1, y: 2, w: 3, h: 4, a: 1}, {x: 5, y: 6, w: 7, h: 8, a: 1}], 1920, 1080);
  const svg = decodeURIComponent(url.replace("data:image/svg+xml;charset=utf-8,", ""));
  assert.equal((svg.match(/<rect /g) ?? []).length, 2);
  assert.ok(svg.includes("width='1920'") && svg.includes("height='1080'"));
});
test("버튼 정지 — 강조 차례가 온 버튼만 선명해지고(0 → 1로 차오름) · 그 전엔 흐림 속에 남는다", () => {
  const reveal = (name: string) => (name === "B1" ? 1 : name === "B2" ? 0.4 : 0);
  const b = holesFor("buttons", view, fit, reveal);
  assert.deepEqual(b.map((r) => r.a), [1, 0.4]);
  assert.deepEqual(holesFor("buttons", view, fit, () => 0), []);
  assert.equal(holesFor("hand", view, fit)[0].a, 1);
});
test("가림막 — 자리마다 그 밝기(a)로 칠한다", () => {
  const svg = decodeURIComponent(holeMask([{x: 1, y: 2, w: 3, h: 4, a: 0.4}], 10, 10).replace("data:image/svg+xml;charset=utf-8,", ""));
  assert.ok(svg.includes("fill-opacity='0.400'"));
});
test("손 자리 = 판정 · 공구 장면은 손 모양(시안 17 3차) · 손 탐지 장면은 사각형(4차 「이전 박스로 롤백」) — 21점 · 손가락 굵기는 손바닥 폭에 비례", () => {
  assert.equal(holesFor("hand", view, fit)[0].hand, undefined);   // 손 탐지 = 사각형
  assert.ok(holesFor("overlap", view, fit)[0].hand);               // 공구 겹침 = 손 모양
  const [h] = holesFor("dwell", view, fit);                        // 판정 장면(spotHoles) = 손 모양
  assert.equal(h.hand!.length, 21);
  assert.deepEqual(h.hand![0], [10 + 110 * 2, 140 * 2]);
  const palm = Math.hypot((120 - 100) * 2, 0);   // 5 ↔ 17 = 40 px(손목 ↔ 9 의 절반보다 큼)
  assert.ok(Math.abs(h.lw! - (palm * 0.32 + 28)) < 1e-9);
  const svg = decodeURIComponent(holeMask([h], 1920, 1080).replace("data:image/svg+xml;charset=utf-8,", ""));
  assert.equal((svg.match(/<line /g) ?? []).length, 21);
  assert.equal((svg.match(/<polygon /g) ?? []).length, 1);
  assert.equal((svg.match(/<rect /g) ?? []).length, 0);   // 사각형이 아니다
});
