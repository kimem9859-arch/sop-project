import {test} from "node:test";
import assert from "node:assert/strict";
import {fitOffset, onsets} from "../../src/lib/sync.ts";

test("짧은 딸깍 소리 시각을 10ms 안으로 찾는다", () => {
  const rate = 16000;
  const pcm = new Int16Array(rate * 5);
  let seed = 1;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5;
  for (let i = 0; i < pcm.length; i++) pcm[i] = Math.round(rnd() * 200);
  for (const s of [1.0, 2.5, 4.2]) for (let i = 0; i < 80; i++) pcm[Math.round(s * rate) + i] = i % 2 ? 8000 : -8000;
  const on = onsets(pcm, rate);
  assert.equal(on.length, 3);
  [1.0, 2.5, 4.2].forEach((s, i) => assert.ok(Math.abs(on[i] - s) <= 0.01, `${on[i]} vs ${s}`));
});
test("누름 기록과 소리에서 영상 0초의 기록 시각을 찾는다(누름 아닌 소리 섞임)", () => {
  const offset = 250000000;
  const fit = fitOffset([0.3, 1.0, 2.5, 3.1, 4.2], [1.0, 2.5, 4.2].map((s) => offset + s * 1000 + 4));
  assert.equal(fit.matched, 3);
  assert.ok(Math.abs(fit.offsetMs - (offset + 4)) < 1e-6);
});
test("짝이 안 맞으면 matched 가 작다(중단 규칙 판단)", () => {
  assert.ok(fitOffset([0.5], [250000000, 250003000, 250007000]).matched <= 1);
});
test("WAV 읽기 — 파이프 출력처럼 data 길이 칸이 비어(0xFFFFFFFF) 있어도 끝까지 읽는다", async () => {
  const {wavPcm} = await import("../../src/lib/sync.ts");
  const samples = [0, 1000, -1000, 32767];
  const h = Buffer.alloc(44);
  h.write("RIFF", 0); h.writeUInt32LE(0xffffffff, 4); h.write("WAVE", 8);
  h.write("fmt ", 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(16000, 24); h.writeUInt32LE(32000, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
  h.write("data", 36); h.writeUInt32LE(0xffffffff, 40);
  const body = Buffer.alloc(samples.length * 2);
  samples.forEach((v, i) => body.writeInt16LE(v, i * 2));
  const {pcm, rate} = wavPcm(Buffer.concat([h, body]));
  assert.equal(rate, 16000);
  assert.deepEqual([...pcm], samples);
});
