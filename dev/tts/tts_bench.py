import time, wave, sys
import sherpa_onnx
D="vits-mimic3-ko_KO-kss_low"
cfg = sherpa_onnx.OfflineTtsConfig(
    model=sherpa_onnx.OfflineTtsModelConfig(
        vits=sherpa_onnx.OfflineTtsVitsModelConfig(
            model=f"{D}/ko_KO-kss_low.onnx",
            tokens=f"{D}/tokens.txt",
            data_dir=f"{D}/espeak-ng-data",
        ),
        num_threads=4, provider="cpu",
    ),
    max_num_sentences=1,
)
t0=time.time(); tts = sherpa_onnx.OfflineTts(cfg); load=time.time()-t0
print(f"모델 적재 {load:.2f}s")
S={"warn":"잠깐, 순서가 다릅니다.",
   "short":"네, 안전 수칙을 준수하며 작업하시면서 진행하시면 됩니다.",
   "mid":"장갑을 벗으면 장비에 손상을 줄 수 있으니 안전을 위해 장갑을 착용한 상태로 작업해 주세요.",
   "long":"3번 밸브가 열려 있으면 챔버 도어를 안전하게 열 수 없습니다. 반드시 밸브를 잠근 후에 도어를 열어주세요."}
for k,t in S.items():
    s=time.time(); a=tts.generate(t, sid=0, speed=1.0); e=time.time()-s
    dur=len(a.samples)/a.sample_rate
    fn=f"kss_{k}.wav"
    with wave.open(fn,"w") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(a.sample_rate)
        import array; w.writeframes(array.array("h",[int(max(-1,min(1,x))*32767) for x in a.samples]).tobytes())
    print(f"{k:6s} 글자 {len(t):2d}  합성 {e:5.2f}s  음성 {dur:5.2f}s  RTF {e/dur:.3f}  {a.sample_rate}Hz")
