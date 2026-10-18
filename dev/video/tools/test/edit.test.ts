import {test} from "node:test";
import assert from "node:assert/strict";
import {bootTimes, captionTrack, noteTrack, place, sfxTrack, srcSec, totalFrames, type Clip} from "../../src/lib/edit.ts";

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
test("켜짐 시계 — boot 구간부터 흐르고 제목 카드(card) 동안은 멈춘다 · boot 전은 null", () => {
  const h = (hold: number, extra: Partial<Clip> = {}): Clip => ({take: "x", file: "f", from: 3, to: 3, speed: 1, overlay: true, hold, ...extra});
  const ps = place([c(10, 12, 1), {...c(0, 3, 1), boot: true}, h(2, {card: "chapter"}), h(1.5, {card: "section"}), h(4, {intro: "buttons"}), c(3, 5, 1)], 30);
  assert.deepEqual(bootTimes(ps, 30), [null, {at: 0, runs: true}, {at: 3, runs: false}, {at: 3, runs: false}, {at: 3, runs: true}, {at: 7, runs: true}]);
});
test("켜짐 시계 — boot 가 숫자면 그 초부터(켜짐 장면을 빼고 장 카드에서 시작 · 캡스톤 D83)", () => {
  const h = (hold: number, extra: Partial<Clip> = {}): Clip => ({take: "x", file: "f", from: 3, to: 3, speed: 1, overlay: true, hold, ...extra});
  const ps = place([c(10, 12, 1), h(2, {card: "chapter", boot: 4.75}), h(1.5, {card: "section"}), h(4, {intro: "buttons"}), c(3, 5, 1)], 30);
  assert.deepEqual(bootTimes(ps, 30), [null, {at: 4.75, runs: false}, {at: 4.75, runs: false}, {at: 4.75, runs: true}, {at: 8.75, runs: true}]);
});

test("자막 트랙 — 구간 자막(caption)은 구간 전체 · subs 는 구간 안 화면 초 · 바로 이어지는 같은 문장은 하나로 · 카드 구간은 없음", () => {
  const k = (cap?: string, subs?: [number, number, string][], card?: "chapter"): Clip =>
    ({take: "x", file: "f", from: 0, to: 1, speed: 1, overlay: true, caption: cap, subs, ...(card ? {hold: 1, card} : {})});
  const ps = place([k("가"), k("가"), k(undefined, undefined, "chapter"), k(undefined, [[0, 0.5, "나"], [0.5, 2, "다"]]), k("라")], 30);
  assert.deepEqual(captionTrack(ps, 30), [
    {start: 0, end: 60, text: "가"},                // 두 구간이 이어져 하나로
    {start: 90, end: 105, text: "나"},
    {start: 105, end: 120, text: "다"},             // 구간 끝(120)에서 자름
    {start: 120, end: 150, text: "라"},
  ]);
});
test("소리 트랙 — 구간 안 화면 초 → 편집 전체 프레임 · 구간 길이를 넘는 소리는 버림 · 음량 기본 1", () => {
  const k = (sfx?: [number, string, number?][]): Clip => ({take: "x", file: "f", from: 0, to: 1, speed: 1, overlay: true, sfx});
  const ps = place([k([[0, "a"]]), k([[0.5, "b", 0.3], [1.0, "c"]])], 30);   // 0~30 · 30~60
  assert.deepEqual(sfxTrack(ps, 30), [{frame: 0, name: "a", volume: 1}, {frame: 45, name: "b", volume: 0.3}]);
});
test("알림 글씨 트랙 — note 가 있는 구간 시작부터 정해진 초 동안 · 다음 알림이 오면 거기서 끊김 · 편집 끝을 넘지 않음(한이음 D84 ⑥)", () => {
  const k = (sec: number, note?: string): Clip => ({take: "x", file: "f", from: 0, to: sec, speed: 1, overlay: true, note});
  const ps = place([k(1, "가"), k(1), k(1, "나"), k(2)], 30);   // 0 · 30 · 60 · 90 ~ 150
  assert.deepEqual(noteTrack(ps, 30, 3), [{start: 0, end: 60, text: "가"}, {start: 60, end: 150, text: "나"}]);
  // 제목 카드가 시작되면 거기서 끊김(카드 위에 앞 장면 글씨가 남지 않게)
  const card: Clip = {take: "x", file: "f", from: 0, to: 0, speed: 1, overlay: true, hold: 1, card: "section"};
  assert.deepEqual(noteTrack(place([k(1, "가"), card, k(2, "나")], 30), 30, 3), [{start: 0, end: 30, text: "가"}, {start: 60, end: 120, text: "나"}]);
});
