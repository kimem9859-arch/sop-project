"""sherpa-onnx 판 Supertonic(INT8) — 쓰임: bench_sst.py <모델 폴더> <이름> <단계> <스레드> · 목소리 sid 0 = F1(voice.bin 대조)."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common, sherpa_onnx
M, name, steps, NT = sys.argv[1].rstrip("/") + "/", sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
st = {}
def load():
    c = sherpa_onnx.OfflineTtsConfig(model=sherpa_onnx.OfflineTtsModelConfig(
        supertonic=sherpa_onnx.OfflineTtsSupertonicModelConfig(
            duration_predictor=M+"duration_predictor.int8.onnx", text_encoder=M+"text_encoder.int8.onnx",
            vector_estimator=M+"vector_estimator.int8.onnx", vocoder=M+"vocoder.int8.onnx",
            tts_json=M+"tts.json", unicode_indexer=M+"unicode_indexer.bin", voice_style=M+"voice.bin"),
        num_threads=NT, provider="cpu"), max_num_sentences=1)
    st["t"] = sherpa_onnx.OfflineTts(c)
    g = sherpa_onnx.GenerationConfig(); g.sid = 0; g.num_steps = steps; g.speed = 1.05; g.extra["lang"] = "ko"
    st["g"] = g
def synth(text):
    a = st["t"].generate(text, st["g"]); return a.samples, a.sample_rate
common.run(f"{name}_s{steps}_t{NT}", load, synth)
