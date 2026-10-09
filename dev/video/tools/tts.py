"""음성비서 TTS — 실제 시스템과 같은 합성기(Rpi5/Demo/voice_tts.Tts · sherpa VITS ko_KO-kss_low · 속도 1.0)로 답을 wav 로.

쓰임: node tools/tts_lines.ts | ~/env/tts/.venv/bin/python tools/tts.py public/audio [이름,이름 …](그것만 다시 — 테이크 고르기)
  · 🔑 VITS 는 매번 길이가 조금 다르다(같은 문장 3.74 → 3.98초 · 실제 시스템도 같음) → 만든 wav 는 커밋해 고정하고,
    길이는 src/edits/ttsSec.ts 로 써서 편집표가 그대로 읽는다(손으로 옮기지 않는다 · 시험 = tools/test/sound.test.ts)
  · 문장 = 편집표(edits/feature.ts)의 TTS_LINES(한 곳) · 길이(초)를 찍는다 → 편집표의 말 끝 시각에 맞춘다
  · 모델 = ~/env/tts/vits-mimic3-ko_KO-kss_low(파이와 같은 자리 · 데스크톱엔 시안 14 에서 받음)
시안 14(2026-10-10 · 사용자 「음성비서 답변은 tts로 넣을 수 있다면」)
"""
import json
import os
import sys
import wave

sys.dont_write_bytecode = True   # Rpi5 폴더에 __pycache__ 를 남기지 않는다(데스크톱은 읽기만 · 리뷰)
sys.path.append(os.path.join(os.path.dirname(__file__), "../../../Rpi5/Demo"))
from voice_tts import Tts  # noqa: E402 — 실제 시스템 코드 그대로(고치지 않는다)
import array  # noqa: E402

out = sys.argv[1]
only = set(sys.argv[2].split(",")) if len(sys.argv) > 2 else None
os.makedirs(out, exist_ok=True)
tts = Tts()
lines = json.load(sys.stdin)
for name, text in lines.items():
    if only and name not in only:
        continue
    r = tts.synth(text)
    if r is None:
        sys.exit(f"TTS 실패: {name} {text}")
    pcm, rate, sec = r
    a = array.array("h")
    a.frombytes(pcm)
    g = 0.89 * 32767 / max(1, max(abs(v) for v in a))   # 최고점 -1 dBFS 로(효과음과 같은 기준 · 말이 묻히지 않게)
    pcm = array.array("h", [int(max(-32767, min(32767, v * g))) for v in a]).tobytes()
    with wave.open(f"{out}/tts_{name}.wav", "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(pcm)
    print(f"tts_{name}.wav {sec:.2f}s {text}")

# 길이 파일 — 편집표가 말 끝 시각 · 정지 길이를 이걸로 정한다(지금 있는 wav 전부를 다시 잰다)
secs = {}
for name in lines:
    with wave.open(f"{out}/tts_{name}.wav") as w:
        secs[name] = round(w.getnframes() / w.getframerate(), 3)
with open(os.path.join(os.path.dirname(__file__), "../src/edits/ttsSec.ts"), "w") as f:
    f.write("// 🔴 tools/tts.py 가 만든다 — 손으로 고치지 않는다(public/audio/tts_*.wav 의 길이 · 초)\n")
    f.write(f"export const TTS_SEC = {json.dumps(secs, ensure_ascii=False)} as const;\n")
print("ttsSec.ts", secs)
