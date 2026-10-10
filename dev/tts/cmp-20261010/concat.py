"""후보 하나의 문장 wav 들을 0.7초 쉼으로 이어 한 파일로 — 듣기 비교용. 쓰임: concat.py <out/이름> <저장 경로>"""
import os, sys, wave
import numpy as np
ORDER = ["checking", "wrench", "notstep", "warn_B2", "block_B3", "emo", "cal_long"]
src, dst = sys.argv[1], sys.argv[2]
parts, sr = [], None
for k in ORDER:
    with wave.open(os.path.join(src, f"{k}.wav")) as w:
        sr = w.getframerate(); x = np.frombuffer(w.readframes(w.getnframes()), "<i2").astype(np.float32) / 32767
    a = np.abs(x); idx = np.where(a > 0.02 * a.max())[0]
    x = x[max(0, idx[0] - int(0.05 * sr)): idx[-1] + int(0.08 * sr)]   # 앞뒤 무음을 잘라 쉼을 같게
    parts += [x * (0.89 / a.max()), np.zeros(int(0.7 * sr), np.float32)]
y = np.concatenate(parts)
with wave.open(dst, "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((np.clip(y, -1, 1) * 32767).astype("<i2").tobytes())
print(dst, f"{len(y)/sr:.1f}s", sr)
