import time, wave, numpy as np, sherpa_onnx, difflib, json, sys

REF = {
 "warn":"잠깐, 순서가 다릅니다.",
 "short":"네, 안전 수칙을 준수하며 작업하시면서 진행하시면 됩니다.",
 "mid":"장갑을 벗으면 장비에 손상을 줄 수 있으니 안전을 위해 장갑을 착용한 상태로 작업해 주세요.",
 "long":"3번 밸브가 열려 있으면 챔버 도어를 안전하게 열 수 없습니다. 반드시 밸브를 잠근 후에 도어를 열어주세요.",
}
def read(p):
    with wave.open(p) as w:
        assert w.getframerate()==16000
        d=np.frombuffer(w.readframes(w.getnframes()),dtype=np.int16)
    return d.astype(np.float32)/32768, 16000

def norm(s):
    return "".join(ch for ch in s if not ch.isspace() and ch not in ",.?!·")

def cer(ref, hyp):
    r,h = norm(ref), norm(hyp)
    sm = difflib.SequenceMatcher(None, r, h)
    same = sum(b.size for b in sm.get_matching_blocks())
    return (len(r)-same)/len(r)*100 if r else 0.0

Z="sherpa-onnx-zipformer-korean-2024-06-24"
S="sherpa-onnx-sense-voice-zh-en-ja-ko-yue-int8-2025-09-09"
ST="sherpa-onnx-streaming-zipformer-korean-2024-06-16"

def build(name):
    t=time.time()
    if name=="zipformer-ko":
        r=sherpa_onnx.OfflineRecognizer.from_transducer(
            encoder=f"{Z}/encoder-epoch-99-avg-1.int8.onnx",
            decoder=f"{Z}/decoder-epoch-99-avg-1.onnx",
            joiner=f"{Z}/joiner-epoch-99-avg-1.int8.onnx",
            tokens=f"{Z}/tokens.txt", num_threads=4)
    elif name=="sensevoice":
        r=sherpa_onnx.OfflineRecognizer.from_sense_voice(
            model=f"{S}/model.int8.onnx", tokens=f"{S}/tokens.txt",
            num_threads=4, language="ko", use_itn=True)
    else:
        r=sherpa_onnx.OnlineRecognizer.from_transducer(
            encoder=f"{ST}/encoder-epoch-99-avg-1.int8.onnx",
            decoder=f"{ST}/decoder-epoch-99-avg-1.onnx",
            joiner=f"{ST}/joiner-epoch-99-avg-1.int8.onnx",
            tokens=f"{ST}/tokens.txt", num_threads=4)
    return r, time.time()-t

def run(name):
    try:
        rec, load = build(name)
    except Exception as e:
        print(f"[{name}] 🔴 적재 실패: {type(e).__name__}: {str(e)[:120]}"); return
    print(f"\n=== {name}  (적재 {load:.2f}s)")
    tot_c=tot_t=tot_a=0
    for k in ("warn","short","mid","long"):
        s,sr = read(f"in_{k}.wav"); dur=len(s)/sr
        t0=time.time()
        if name=="streaming-ko":
            st=rec.create_stream(); st.accept_waveform(sr,s)
            st.input_finished()
            while rec.is_ready(st): rec.decode_stream(st)
            txt=rec.get_result(st)
        else:
            st=rec.create_stream(); st.accept_waveform(sr,s)
            rec.decode_stream(st); txt=st.result.text
        el=time.time()-t0
        c=cer(REF[k],txt)
        tot_c+=c; tot_t+=el; tot_a+=dur
        print(f"  {k:6s} {el:5.2f}s (RTF {el/dur:.2f})  CER {c:5.1f}%  → {txt}")
    print(f"  평균 CER {tot_c/4:5.1f}%   전체 RTF {tot_t/tot_a:.2f}")

for n in ("zipformer-ko","sensevoice","streaming-ko"): run(n)
