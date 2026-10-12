import {test} from "node:test";
import assert from "node:assert/strict";
import type {Box, Dets, Pt} from "../../src/lib/dets.ts";
import {SLOW_PX_S, enterAt, slowAt, speedRead, tipSpeed} from "../../src/lib/speed.ts";

// 손끝 속도 계기(수정 18) — 검지 끝(21점의 8번)의 0.1초 이동 거리로 잰 속도 · 오답 버튼 상자 안에서 기준 아래면 「느려짐」
const hand = (x: number, y: number): Pt[] => Array.from({length: 21}, (_, i): Pt => (i === 8 ? [x, y] : [x + 50, y + 50]));
const BOX: Box = ["B3", 0.9, 200, 0, 260, 60];
const mk = (xs: number[]): Dets => ({src: "", fps: 30, w: 1280, h: 720, rows: xs.map((x, f) => ({f, btn: [BOX], tool: [], hand: hand(x, 30)}))});
// 빠르게 다가와(프레임마다 20 px = 600 px/s) 상자(200~260)에 들어간 뒤 멈춤
const STOP = mk([0, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200, 210, 215, 217, 218, 218]);
// 빠르게 지나감(프레임마다 30 px = 900 px/s) — 상자 안은 7 · 8번 프레임뿐
const PASS = mk([0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330]);

test("속도 = 0.1초(30fps 3장) 동안 손끝이 움직인 거리 ÷ 0.1초 · 손이 없으면 null", () => {
  assert.ok(Math.abs(tipSpeed(STOP, 6 / 30)! - 600) < 1e-6);
  assert.ok(Math.abs(tipSpeed(STOP, 12 / 30)! - 350) < 1e-6);   // 180 → 215
  assert.equal(tipSpeed(mk([]), 0.5), null);
});

test("읽기 — 상자 밖 = 다가가는 중 · 상자 안 빠름 · 상자 안 기준 아래 = 느려짐", () => {
  assert.equal(speedRead(STOP, 5 / 30, BOX)!.kind, "approach");
  assert.deepEqual(speedRead(STOP, 10 / 30, BOX), {v: 600, kind: "fast"});
  const s = speedRead(STOP, 12 / 30, BOX)!;
  assert.equal(s.kind, "slow");
  assert.ok(s.v <= SLOW_PX_S);
});

test("읽기 — 상자를 빠르게 지나 나가면 1초 동안 상자 안 마지막 속도로 「지나감」", () => {
  const r = speedRead(PASS, 10 / 30, BOX)!;
  assert.deepEqual([r.kind, Math.round(r.v)], ["passed", 900]);
  assert.equal(speedRead(PASS, 5 / 30, BOX)!.kind, "approach");
});

test("들어간 순간 · 느려진 순간 — 상자 안 첫 장 · 상자 안에서 기준 아래로 떨어진 첫 장(초)", () => {
  assert.ok(Math.abs(enterAt(STOP, 0, 0.6, "B3")! - 10 / 30) < 1e-9);
  assert.ok(Math.abs(slowAt(STOP, 0, 0.6, "B3")! - 12 / 30) < 1e-9);
  assert.equal(slowAt(PASS, 0, 0.4, "B3"), null, "빠르게 지나가면 느려진 순간이 없다");
});

test("읽기는 촬영 장(정수 프레임)마다 — 프레임 사이 시각은 그 앞 장의 판정(값이 톱니처럼 떨리지 않게 · 리뷰)", () => {
  assert.deepEqual(speedRead(STOP, 11.6 / 30, BOX), speedRead(STOP, 11 / 30, BOX));
  assert.equal(speedRead(STOP, 11 / 30, BOX)!.kind, "fast");
});

test("상자 안에서 한 번 느려지면 1초 동안 「느려짐」 유지 — 카메라가 움직여 손끝이 상자 밖으로 밀린 장에서도(실제 FSM 경고 유지 · 리뷰)", () => {
  const S2 = mk([0, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200, 210, 215, 217, 262, 218]);
  assert.equal(speedRead(S2, 14 / 30, BOX)!.kind, "slow");
});

test("0.1초 전에 손이 없으면 창 안에서 가장 먼 손 있는 장으로 잰다 — 손이 막 나타난 장도 값이 나오게(리뷰)", () => {
  const A: Dets = {src: "", fps: 30, w: 1280, h: 720, rows: [5, 6].map((f) => ({f, btn: [BOX], tool: [], hand: hand(f === 5 ? 100 : 120, 30)}))};
  assert.ok(Math.abs(tipSpeed(A, 6 / 30)! - 600) < 1e-6);   // 1장(1/30초) 사이 20 px
});
