"""Piper(piper-tts) — 쓰임: bench_piper.py <모델 .onnx> <이름> <스레드> · 스레드 수를 정하려고 세션을 다시 만든다."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common, numpy as np, onnxruntime
from piper import PiperVoice
P, name, NT = sys.argv[1], sys.argv[2], int(sys.argv[3])
st = {}
def load():
    v = PiperVoice.load(P)
    so = onnxruntime.SessionOptions(); so.intra_op_num_threads = NT; so.inter_op_num_threads = 1
    v.session = onnxruntime.InferenceSession(P, sess_options=so, providers=["CPUExecutionProvider"])
    st["v"] = v
def synth(text):
    ch = list(st["v"].synthesize(text))
    return np.concatenate([c.audio_float_array for c in ch]), ch[0].sample_rate
common.run(f"{name}_t{NT}", load, synth)
