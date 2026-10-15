"""음성비서 물결이 목소리를 따라 움직이게 — 음성 파일마다 1/30초 간격으로 소리 크기 · 높낮이를 재어 src/edits/ttsEnv.ts 로 쓴다.

쓰임: ~/env/tts-trial/st/bin/python tools/tts_env.py public/audio   (tts_supertonic.py · tts_gemini.py 로 음성을 다시 만든 뒤 함께)
  · 시안 17 8차 피드백 「보라색 물결 효과가 목소리 높낮이에 따라 효과 속도를 강하게 약하게」
  · l = 소리 크기(그 파일의 큰 소리 95번째 백분위 = 1 · 0~1) · p = 높낮이(그 목소리의 낮은 10% ~ 높은 90% 를 0~1 · 소리 없는 곳은 앞 값 유지)
  · 높낮이 = 40 ms 창의 자기상관 봉우리(70~400 Hz) — 목소리 떨림이 뚜렷한 곳(상관 0.3 이상)만 · 시험 = tools/test/voice.test.ts(길이가 ttsSec 과 맞는지)
"""
import glob
import json
import os
import sys

import numpy as np
import soundfile as sf

FPS = 30


def env(path: str) -> dict:
    w, sr = sf.read(path)
    w = w if w.ndim == 1 else w.mean(1)
    hop, win = sr // FPS, int(0.04 * sr)
    n = int(np.ceil(len(w) / hop))
    rms = np.array([np.sqrt(np.mean(w[i * hop: i * hop + win] ** 2)) if i * hop < len(w) else 0.0 for i in range(n)])
    loud = np.clip(rms / max(1e-9, np.percentile(rms, 95)), 0, 1)
    lo, hi = int(sr / 400), int(sr / 70)
    f0 = np.full(n, np.nan)
    for i in range(n):
        x = w[i * hop: i * hop + win]
        if len(x) < win or loud[i] < 0.15:
            continue
        x = x - x.mean()
        ac = np.correlate(x, x, "full")[len(x) - 1:]
        if ac[0] <= 0:
            continue
        ac = ac / ac[0]
        k = lo + int(np.argmax(ac[lo:hi]))
        if ac[k] >= 0.3:
            f0[i] = sr / k
    voiced = f0[~np.isnan(f0)]
    pitch = np.full(n, 0.5)
    if len(voiced) >= 3:
        a, b = np.percentile(voiced, 10), np.percentile(voiced, 90)
        last = 0.5
        for i in range(n):
            if not np.isnan(f0[i]):
                last = float(np.clip((f0[i] - a) / max(1e-9, b - a), 0, 1))
            pitch[i] = last
    return {"l": [round(float(v), 2) for v in loud], "p": [round(float(v), 2) for v in pitch]}


out = {os.path.basename(p)[4:-4]: env(p) for p in sorted(glob.glob(os.path.join(sys.argv[1], "tts_*.wav")))}
with open(os.path.join(os.path.dirname(__file__), "../src/edits/ttsEnv.ts"), "w") as f:
    f.write("// 🔴 tools/tts_env.py 가 만든다 — 손으로 고치지 않는다(public/audio/tts_*.wav 의 1/30초마다 소리 크기 l · 높낮이 p · 0~1)\n")
    f.write(f"export const TTS_ENV: Record<string, {{l: number[]; p: number[]}}> = {json.dumps(out, separators=(',', ':'))};\n")
print({k: len(v["l"]) for k, v in out.items()})
