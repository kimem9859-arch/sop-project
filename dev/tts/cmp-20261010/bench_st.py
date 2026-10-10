import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common
from supertonic import TTS
model, voice, steps, NT = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
SPEED = float(os.environ.get("SPEED", "1.05"))   # 패키지 기본값 1.05
st = {}
def load():
    md = os.environ.get("ST_DIR")
    st["t"] = TTS(model=model, model_dir=(os.path.join(md, model) if md else None), auto_download=not md, intra_op_num_threads=NT, inter_op_num_threads=1)
    st["v"] = st["t"].get_voice_style(voice_name=voice)
def synth(text):
    wav, _ = st["t"].synthesize(text, voice_style=st["v"], lang="ko", total_steps=steps, speed=SPEED)
    return wav, st["t"].sample_rate
common.run(f"{model}_{voice}_s{steps}_t{NT}" + ("" if SPEED == 1.05 else f"_v{SPEED}"), load, synth)
