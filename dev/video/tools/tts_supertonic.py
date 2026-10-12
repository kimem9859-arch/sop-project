"""발표 영상 TTS — Supertonic 3 · F1 목소리(시안 16 · 사용자 「F1 이 발음 · 명료도 · 속도가 가장 좋다」) · 음성비서 · 알림.

쓰임: node tools/tts_lines.ts | ~/env/tts-trial/st/bin/python tools/tts_supertonic.py public/audio [이름,…]
  · 작업자 말(w_*)은 먼저 tools/tts_gemini.py 로 — 이 스크립트가 끝에 모든 길이를 ttsSec.ts 에 쓴다
  · 문장 = tools/tts_lines.ts(편집표 TTS_LINES · lib/alerts ALERT_TEXT — 한 곳) · 실제 시스템(파이) TTS 와는 별개(발표 영상 전용)
  · Supertonic 은 문장 앞뒤에 무음(약 0.5 · 0.7초)을 붙인다 → 말소리 앞 0.05 · 뒤 0.08초만 남기고 자른다(편집표 시각이 말소리에 맞게)
  · 길이는 src/edits/ttsSec.ts 로 써서 편집표가 그대로 읽는다(tools/tts.py 와 같은 방식 · 시험 = tools/test/sound.test.ts)
  · 라이선스: supertonic 코드 MIT · 모델 OpenRAIL-M(Supertone · 상업 이용 가능 · 해로운 용도 금지)
"""
import json
import os
import sys

import numpy as np
import soundfile as sf
from supertonic import TTS

# 빠르기 0.95(시안 17 4차 · 사용자 「여자 TTS 속도를 빠르기 2로」 — 1.05 는 한 문장씩 만들면 1초에 6.5~7.6음절로 빨랐다 · 0.95 ≈ 6.1)
VOICE, SPEED, LEAD, TAIL = "F1", 0.95, 0.05, 0.08
# 작업자 말(호출 · 질문 — 이름이 w_ 로 시작)은 tools/tts_gemini.py(제미나이 남성 · 시안 17 4차)가 만든다 — 여기서는 건너뛰고 길이만 다시 쓴다
WORKER = "w_"
# 영문 버튼 이름 읽기 — 그대로 두면 「B2」를 「비이」처럼 읽는다(시안 17 3차 · 사용자 「"비투"로 읽었으면」) · 화면 글자는 그대로 B2(읽을 때만 바꿈)
SAY = {"B1": "비원", "B2": "비투", "B3": "비쓰리", "B4": "비포"}

out = sys.argv[1]
only = set(sys.argv[2].split(",")) if len(sys.argv) > 2 else None
os.makedirs(out, exist_ok=True)
lines = json.load(sys.stdin)
t = TTS(auto_download=True)
style = t.get_voice_style(voice_name=VOICE)
for name, text in lines.items():
    if (only and name not in only) or name.startswith(WORKER):
        continue
    spoken = text
    for k, v in SAY.items():
        spoken = spoken.replace(k, v)
    wav, _ = t.synthesize(spoken, voice_style=style, lang="ko", speed=SPEED)
    tmp = f"{out}/tts_{name}.wav"
    t.save_audio(wav, tmp)
    w, sr = sf.read(tmp)
    w = w if w.ndim == 1 else w.mean(1)
    a = np.abs(w)
    idx = np.where(a > 0.01 * a.max())[0]
    if not len(idx):
        sys.exit(f"TTS 실패(무음): {name} {text}")
    w = w[max(0, idx[0] - int(LEAD * sr)): idx[-1] + int(TAIL * sr)]
    w = w * (0.89 / np.abs(w).max())                       # 최고점 -1 dBFS(효과음과 같은 기준)
    sf.write(tmp, w, sr, subtype="PCM_16")
    print(f"tts_{name}.wav {len(w) / sr:.2f}s {spoken}")

secs = {}
for name in lines:
    info = sf.info(f"{out}/tts_{name}.wav")
    secs[name] = round(info.frames / info.samplerate, 3)
with open(os.path.join(os.path.dirname(__file__), "../src/edits/ttsSec.ts"), "w") as f:
    f.write("// 🔴 tools/tts_supertonic.py(또는 tools/tts.py)가 만든다 — 손으로 고치지 않는다(public/audio/tts_*.wav 의 길이 · 초)\n")
    f.write(f"export const TTS_SEC = {json.dumps(secs, ensure_ascii=False)} as const;\n")
print("ttsSec.ts", secs)
