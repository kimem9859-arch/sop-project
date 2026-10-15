import type {Sound} from "./edit.ts";

// 음성비서 물결이 목소리를 따라 움직이게(시안 17 8차 피드백 「보라색 물결이 목소리 높낮이에 따라 속도를 강하게 약하게」)
//   편집 전체 소리 트랙(lib/edit sfxTrack)에서 tts_* 가 나오는 프레임마다 그 파일의 소리 크기 · 높낮이(tools/tts_env.py → TTS_ENV)를 읽어
//   amp = 물결 세기 배율(소리가 크면 크게 · 조용하면 잔잔하게 0.3) · phase = 물결이 흐른 거리(목소리가 높을수록 빨리 흐름 · 쌓아 가므로 끊기지 않음)
//   세기는 올라갈 때 빠르고 내려갈 때 천천히(음절 사이 깜빡임 없이)
export type Env = Record<string, {l: number[]; p: number[]}>;
export type VoiceTrack = {amp: number[]; phase: number[]};
const REST = 0.3, RISE = 0.6, FALL = 0.2;

export function voiceTrack(sounds: Sound[], env: Env, total: number, fps: number): VoiceTrack {
  const loud = new Array<number>(total).fill(0), pitch = new Array<number>(total).fill(-1);
  for (const s of sounds) {
    const e = s.name.startsWith("tts_") ? env[s.name.slice(4)] : undefined;
    if (!e) continue;
    for (let k = 0; k < e.l.length && s.frame + k < total; k++) {
      const f = s.frame + k, l = e.l[k] * Math.min(1, s.volume);
      if (l > loud[f]) { loud[f] = l; pitch[f] = e.p[k]; }
    }
  }
  const amp: number[] = [], phase: number[] = [];
  let a = REST, ph = 0;
  for (let f = 0; f < total; f++) {
    const target = REST + (1.3 - REST) * loud[f];
    a += (target - a) * (target > a ? RISE : FALL);
    const speed = pitch[f] < 0 ? 0.6 : 0.8 + 1.6 * pitch[f] * Math.max(0.4, loud[f]);   // 말 없을 때 천천히 · 높은 소리일수록 빠르게
    ph += speed / fps;
    amp.push(a); phase.push(ph);
  }
  return {amp, phase};
}
