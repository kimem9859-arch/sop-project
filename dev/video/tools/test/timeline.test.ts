import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {parseCsv} from "../../src/lib/csv.ts";
import {mergeEvents, parseEvents, runs} from "../../src/lib/timeline.ts";

const fx = (f: string) => readFileSync(new URL(`./fixtures/20261009_154014/${f}`, import.meta.url), "utf8");

test("CSV — 따옴표 안 쉼표·겹따옴표·BOM·CRLF", () => {
  assert.deepEqual(parseCsv('\uFEFFa,b\r\n1,"{""k"": ""x,y""}"\r\n'), [["a", "b"], ["1", '{"k": "x,y"}']]);
});
test("머리줄이 다르면 멈춘다", () => {
  assert.throws(() => parseEvents("x,y\n1,2\n", "main"), /머리줄/);
});
test("뒤섞인 줄도 시각 순서로 합친다(Review Focus 2)", () => {
  const text = fx("events.csv");
  const [head, ...body] = text.trimEnd().split("\n");
  const shuffled = [head, ...body.reverse()].join("\n") + "\n";
  assert.deepEqual(mergeEvents(parseEvents(shuffled, "main")), mergeEvents(parseEvents(text, "main")));
});
test("견본 세션 = 판 3개(시작 시각 · 완주 여부)", () => {
  const evs = mergeEvents(parseEvents(fx("events.csv"), "main"), parseEvents(fx("voice_events.csv"), "voice"));
  const rs = runs(evs);
  assert.deepEqual(rs.map((r) => r.start), [250011525.954, 250057782.499, 250126887.025]);
  assert.deepEqual(rs.map((r) => r.ok), [true, false, true]);
});
