"""TTS 비교 공통 — 문장 · wav 저장 · 말소리 길이(앞뒤 무음 뺀 길이) · 표 출력."""
import json, os, resource, statistics, sys, time, wave
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
S = json.load(open(os.path.join(HERE, "sentences.json"), encoding="utf-8"))

def save(path, x, sr):
    x = np.clip(np.asarray(x, dtype=np.float32).reshape(-1), -1, 1)
    with wave.open(path, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
        w.writeframes((x * 32767).astype("<i2").tobytes())

def speech_len(x, sr, thr=0.02):
    """앞뒤 무음(최고점의 2% 미만)을 뺀 말소리 길이(초)."""
    x = np.abs(np.asarray(x, dtype=np.float32).reshape(-1))
    if x.max() <= 0: return 0.0
    idx = np.where(x > thr * x.max())[0]
    return (idx[-1] - idx[0]) / sr

def run(name, load_fn, synth_fn, reps=3):
    """load_fn() → 적재 · synth_fn(text) → (samples, sr). 첫 문장으로 한 번 데우고, 문장마다 reps 번 재서 가운데 값."""
    out = os.path.join(HERE, "out", name); os.makedirs(out, exist_ok=True)
    t0 = time.perf_counter(); load_fn(); load = time.perf_counter() - t0
    synth_fn(S["checking"])                                   # 데우기
    rows = []
    for k, text in S.items():
        ts = []
        for _ in range(reps):
            t = time.perf_counter(); x, sr = synth_fn(text); ts.append(time.perf_counter() - t)
        save(os.path.join(out, f"{k}.wav"), x, sr)
        dur = len(np.asarray(x).reshape(-1)) / sr
        sp = speech_len(x, sr)
        rows.append({"key": k, "chars": len(text), "synth": statistics.median(ts), "dur": dur, "speech": sp, "sr": sr})
    rss = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1024
    json.dump({"name": name, "load": load, "rss_mb": rss, "rows": rows}, open(os.path.join(out, "_bench.json"), "w"), ensure_ascii=False, indent=1)
    print(f"[{name}] 적재 {load:.2f}s · 최대 메모리 {rss:.0f}MB")
    for r in rows:
        print(f"  {r['key']:10s} {r['chars']:2d}자 합성 {r['synth']:.3f}s · 전체 {r['dur']:.2f}s · 말소리 {r['speech']:.2f}s · {r['chars']/max(r['speech'],1e-9):.1f}자/초 · {r['sr']}Hz")
