import {test} from "node:test";
import assert from "node:assert/strict";
import {existsSync, readFileSync} from "node:fs";
import {place, sfxTrack} from "../../src/lib/edit.ts";
import {FEATURE, FEATURE_STAGED, TTS_LINES} from "../../src/edits/feature.ts";
import {TTS_SEC} from "../../src/edits/ttsSec.ts";

// 소리(시안 14) — 효과음 · TTS 파일과 편집표 시각이 서로 맞는지(VITS 는 매번 길이가 달라 손으로 옮긴 숫자가 어긋나기 쉽다 · 리뷰)
const file = (n: string) => new URL(`../../public/audio/${n}.wav`, import.meta.url);
function wavSec(n: string): number {   // RIFF 머리 — fmt · data 덩어리
  const b = readFileSync(file(n));
  let o = 12, rate = 0, ch = 1, bits = 16;
  while (o + 8 <= b.length) {
    const id = b.toString("ascii", o, o + 4), sz = b.readUInt32LE(o + 4);
    if (id === "fmt ") { ch = b.readUInt16LE(o + 10); rate = b.readUInt32LE(o + 12); bits = b.readUInt16LE(o + 22); }
    if (id === "data") return sz / (rate * ch * (bits / 8));
    o += 8 + sz + (sz % 2);
  }
  throw new Error(`${n}: data 없음`);
}

test("TTS 길이 파일(ttsSec.ts) = 실제 wav 길이 — wav 를 다시 만들면 tools/tts.py 가 같이 고친다", () => {
  for (const [k, sec] of Object.entries(TTS_SEC)) assert.ok(Math.abs(wavSec(`tts_${k}`) - sec) < 0.002, `${k}: ${wavSec(`tts_${k}`)} vs ${sec}`);
});
test("편집표의 소리는 하나도 버려지지 않고(구간 밖 아님) 파일이 모두 있다", () => {
  const tr = sfxTrack(place(FEATURE, 30), 30);
  assert.equal(tr.length, FEATURE.reduce((n, c) => n + (c.sfx?.length ?? 0), 0));
  for (const s of tr) assert.ok(existsSync(file(s.name)), s.name);
});
test("음성비서 답은 다음 일 전에 끝난다 — 공구 질문 = 구간 끝(30.2) · 단계 질문 = 3단계 완료(B3 36.95 + 10초)", () => {
  const ev = FEATURE_STAGED["20261009_pre#voice"].extra ?? [];
  const end = (key: "tool" | "step") => {
    const a = ev.find((e) => e.kind === "answer" && e.d.text === TTS_LINES[key])!;
    const play = ev.filter((e) => e.kind === "play_start" && e.t > a.t).sort((x, y) => x.t - y.t)[0];
    const done = ev.filter((e) => e.kind === "play_end" && e.t > play.t).sort((x, y) => x.t - y.t)[0];
    assert.ok(Math.abs(done.t - (play.t + wavSec(`tts_${key}`))) < 0.01, `${key} 말풍선 끝 ${done.t} ↔ 소리 끝 ${play.t + wavSec(`tts_${key}`)}`);
    return play.t + wavSec(`tts_${key}`);
  };
  assert.ok(end("tool") <= 30.2, `공구 답 끝 ${end("tool")}`);
  assert.ok(end("step") <= 36.95 + 10, `단계 답 끝 ${end("step")}`);
});
