"""후보마다 소리를 파이와 같은 받아쓰기 모델(zipformer 한국어 · int8 · beam · 핫워드 없음)에 들려 글자 오류율(CER)을 잰다.
쓰임: stt_cer.py <out 폴더> — 영문이 없는 7문장으로 CER, 영문(B2 · B3 · EMO) 3문장은 받아쓴 글을 그대로 보인다."""
import json, os, re, sys, wave
import numpy as np, sherpa_onnx
HERE = os.path.dirname(os.path.abspath(__file__))
S = json.load(open(os.path.join(HERE, "sentences.json"), encoding="utf-8"))
Z = os.path.expanduser("~/env/tts-trial/dl-20261010/stt/sherpa-onnx-zipformer-korean-2024-06-24")
rec = sherpa_onnx.OfflineRecognizer.from_transducer(
    encoder=f"{Z}/encoder-epoch-99-avg-1.int8.onnx", decoder=f"{Z}/decoder-epoch-99-avg-1.onnx",
    joiner=f"{Z}/joiner-epoch-99-avg-1.int8.onnx", tokens=f"{Z}/tokens.txt", num_threads=4, decoding_method="modified_beam_search")
norm = lambda s: re.sub(r"[^가-힣A-Za-z0-9]", "", s)
def ed(a, b):
    d = list(range(len(b) + 1))
    for i, x in enumerate(a, 1):
        p, d[0] = d[0], i
        for j, y in enumerate(b, 1):
            p, d[j] = d[j], min(d[j] + 1, d[j-1] + 1, p + (x != y))
    return d[-1]
def hear(path):
    with wave.open(path) as w:
        sr = w.getframerate(); x = np.frombuffer(w.readframes(w.getnframes()), "<i2").astype(np.float32) / 32768
    s = rec.create_stream(); s.accept_waveform(sr, x); rec.decode_stream(s); return s.result.text
root = sys.argv[1]
res = {}
for name in sorted(os.listdir(root)):
    d = os.path.join(root, name)
    if not os.path.isfile(os.path.join(d, "checking.wav")): continue
    errs = tot = 0; latin = {}
    for k, t in S.items():
        h = hear(os.path.join(d, f"{k}.wav"))
        if re.search(r"[A-Za-z]", t): latin[k] = h; continue
        e = ed(norm(t), norm(h)); errs += e; tot += len(norm(t))
    res[name] = {"cer": errs / tot, "latin": latin}
    print(f"{name:28s} CER {100*errs/tot:5.1f}%  | " + " / ".join(f"{k}: {v}" for k, v in latin.items()))
json.dump(res, open(os.path.join(root, "_stt.json"), "w"), ensure_ascii=False, indent=1)
