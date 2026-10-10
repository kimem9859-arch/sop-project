import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common, sherpa_onnx
D = os.path.expanduser(os.environ.get("KSS_DIR", "~/env/tts/vits-mimic3-ko_KO-kss_low"))
NT = int(sys.argv[1]) if len(sys.argv) > 1 else 4
st = {}
def load():
    cfg = sherpa_onnx.OfflineTtsConfig(model=sherpa_onnx.OfflineTtsModelConfig(
        vits=sherpa_onnx.OfflineTtsVitsModelConfig(model=f"{D}/ko_KO-kss_low.onnx", tokens=f"{D}/tokens.txt", data_dir=f"{D}/espeak-ng-data"),
        num_threads=NT, provider="cpu"), max_num_sentences=1)
    st["t"] = sherpa_onnx.OfflineTts(cfg)
def synth(text):
    a = st["t"].generate(text, sid=0, speed=1.0); return a.samples, a.sample_rate
common.run(f"kss_t{NT}", load, synth)
