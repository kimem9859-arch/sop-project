import {test} from "node:test";
import assert from "node:assert/strict";
import {burstAge, decode, insetSpot, screenSince, shake, typed} from "../../src/lib/fx.ts";
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

test("암호 풀림 — 앞부분은 원문 · 나머지는 같은 글자 수의 원문 글자 섞기(빈칸은 빈칸) · dur 뒤엔 원문 그대로", () => {
  const text = "지금 할 일: 렌치를 찾아 쥔다";
  const n = Array.from(text).length;
  assert.deepEqual(decode(text, 1, 1, 7), [text, ""]);
  const [d0, z0] = decode(text, 0, 1, 7);
  assert.equal(d0, "");
  assert.equal(Array.from(z0).length, n);
  const [d, z] = decode(text, 0.5, 1, 7);
  assert.ok(text.startsWith(d) && d.length > 0);
  const zs = Array.from(z), rest = Array.from(text).slice(Array.from(d).length);
  assert.equal(zs.length, rest.length);
  zs.forEach((c, i) => assert.ok(rest[i] === " " ? c === " " : c !== " " && text.includes(c), `${i}: ${c}`));
  assert.deepEqual(decode(text, 0.5, 1, 7), [d, z]);   // 같은 입력 → 같은 값
});
test("확대 창 자리 — 오른쪽 위부터 · 다른 상자나 화면 밖이면 다음 자리(왼쪽 위 → 오른쪽 아래 → 왼쪽 아래)", () => {
  const box = {x: 900, y: 500, w: 80, h: 80}, S = 170, W = 1920, H = 1080;
  const ru = insetSpot(box, S, [], W, H);
  assert.ok(ru.x > box.x + box.w && ru.y + S < box.y);                       // 오른쪽 위
  const lu = insetSpot(box, S, [{x: ru.x, y: ru.y, w: 10, h: 10}], W, H);   // 오른쪽 위가 막힘
  assert.ok(lu.x + S < box.x && lu.y + S < box.y);
  const edge = insetSpot({x: 1800, y: 500, w: 80, h: 80}, S, [], W, H);    // 오른쪽 끝 → 왼쪽으로
  assert.ok(edge.x + S <= 1800 && edge.x >= 0);
  const top = insetSpot({x: 900, y: 40, w: 80, h: 80}, S, [], W, H);       // 위 끝 → 아래로
  assert.ok(top.y >= 40 + 80);
});
test("확대 창 자리 — 대각선 넷이 다 막히면 위 · 오른쪽 · 왼쪽 · 아래 · 그래도 막히면 가장 덜 가리는 자리", () => {
  const box = {x: 1300, y: 880, w: 80, h: 80}, S = 214, W = 1920, H = 1080;            // 아래 끝 — 아래쪽 자리는 화면 밖
  const avoid = [{x: 1500, y: 700, w: 70, h: 70}, {x: 1080, y: 720, w: 70, h: 70}];        // 오른쪽 위 · 왼쪽 위를 막는 상자
  const up = insetSpot(box, S, avoid, W, H);
  assert.ok(up.y + S <= box.y && up.x < box.x + box.w && up.x + S > box.x);             // 바로 위
  const all = insetSpot(box, S, [{x: 0, y: 0, w: W, h: 870}], W, H);                      // 위 전부가 막힘
  assert.ok(all.x >= 20 && all.y >= 20 && all.x + S <= W - 20 && all.y + S <= H - 20);   // 그래도 화면 안
  assert.ok(all.y > 700);                                                                  // 덜 가리는 아래쪽(옆) 자리
  const big = insetSpot({x: 0, y: 0, w: W, h: H}, S, [], W, H);                            // 화면 안 자리가 없어도 화면 안으로
  assert.ok(big.x >= 20 && big.y >= 20 && big.x + S <= W - 20 && big.y + S <= H - 20);
});
