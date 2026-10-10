"""큰 모델을 데스크톱 CPU 4스레드로 — 한 문장씩 합성 시간만(파이 가능성 가늠). 쓰임: big_cpu.py qw|cb"""
import sys, time, json, torch, numpy as np
torch.set_num_threads(4)
S = json.load(open("sentences.json", encoding="utf-8"))
which = sys.argv[1]
t0 = time.perf_counter()
if which == "qw":
    from qwen_tts import Qwen3TTSModel
    m = Qwen3TTSModel.from_pretrained("Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice", device_map="cpu", dtype=torch.float32)
    gen = lambda t: (lambda w, sr: (np.asarray(w[0]).reshape(-1), sr))(*m.generate_custom_voice(text=t, language="Korean", speaker="Sohee"))
else:
    from chatterbox.mtl_tts import ChatterboxMultilingualTTS
    m = ChatterboxMultilingualTTS.from_pretrained(device="cpu")
    gen = lambda t: (m.generate(t, language_id="ko").squeeze().cpu().numpy(), m.sr)
print(f"[{which}] 적재 {time.perf_counter()-t0:.1f}s", flush=True)
for k in ["checking", "warn_B2"]:
    t = time.perf_counter(); w, sr = gen(S[k]); e = time.perf_counter() - t
    print(f"  {k:10s} {len(S[k])}자 합성 {e:.1f}s · 음성 {len(w)/sr:.2f}s · RTF {e/(len(w)/sr):.2f}", flush=True)
