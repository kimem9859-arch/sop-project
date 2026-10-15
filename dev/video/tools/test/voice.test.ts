import {test} from "node:test";
import assert from "node:assert/strict";
import {TTS_ENV} from "../../src/edits/ttsEnv.ts";
import {TTS_SEC} from "../../src/edits/ttsSec.ts";
import {voiceTrack} from "../../src/lib/voiceLevel.ts";

// 음성비서 물결이 목소리를 따라(시안 17 8차) — tools/tts_env.py 의 곡선 · lib/voiceLevel
test("음성 곡선은 음성 파일과 같은 길이(1/30초마다) — 음성을 다시 만들고 tts_env.py 를 안 돌리면 걸린다", () => {
  for (const [name, sec] of Object.entries(TTS_SEC)) {
    const e = TTS_ENV[name];
    assert.ok(e, `${name} 곡선 없음`);
    assert.ok(Math.abs(e.l.length - Math.ceil(sec * 30)) <= 1 && e.p.length === e.l.length, `${name} ${e.l.length} ↔ ${sec}초`);
  }
});

test("물결 — 목소리가 나오면 세지고 끝나면 잔잔하게 돌아옴 · 흐름은 끊기지 않고 높은 목소리일수록 빨리 흐른다", () => {
  const env = {hi: {l: Array(30).fill(1), p: Array(30).fill(1)}, lo: {l: Array(30).fill(1), p: Array(30).fill(0)}};
  const v = voiceTrack([{frame: 30, name: "tts_hi", volume: 1}, {frame: 90, name: "tts_lo", volume: 1}], env, 150, 30);
  assert.ok(Math.abs(v.amp[10] - 0.3) < 1e-9, "말 없을 때 0.3");
  assert.ok(v.amp[50] > 1.2, `말할 때 ${v.amp[50]}`);
  assert.ok(v.amp[85] < 0.4, `끝나면 잔잔 ${v.amp[85]}`);
  for (let f = 1; f < 150; f++) assert.ok(v.phase[f] > v.phase[f - 1]);
  const step = (f: number) => v.phase[f] - v.phase[f - 1];
  assert.ok(step(50) > step(110) && step(110) > step(10), `높은 소리 ${step(50)} > 낮은 소리 ${step(110)} > 쉼 ${step(10)}`);
});
