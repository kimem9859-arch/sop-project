"""발표 영상 작업자 목소리 — Gemini 3.8 Flash TTS · 한국어 남성 「ko-kr-training-4」(시안 17 4차 · 사용자 「남자 TTS를 제미나이 남자1로」).

쓰임: node tools/tts_lines.ts | ~/env/tts-trial/st/bin/python tools/tts_gemini.py public/audio
  · 이름이 w_ 로 시작하는 줄(작업자 호출 · 질문)만 만든다 — 음성비서(여성)는 tools/tts_supertonic.py
  · 그 뒤 tts_supertonic.py 를 돌리면 src/edits/ttsSec.ts 에 모든 길이가 다시 써진다(이 스크립트는 길이 파일을 쓰지 않는다)
  · API = 공식 문서 speech-generation 의 Interactions REST 예제 그대로(응답 = 24 kHz 16비트 모노 WAV)
  · 키 = 환경변수 GEMINI_API_KEY · 없으면 ~/.config/gemini/key(파일 또는 그 폴더 안의 파일 하나) — 저장소 밖 · 화면에 출력하지 않는다
  · 무료 등급(2026-10 요금표) — 넣은 문장은 구글 개선에 쓰인다 · 생성물 소유권 주장 · 출처 표기 의무 없음
  · 앞뒤 무음은 tts_supertonic.py 와 같게 말소리 앞 0.05 · 뒤 0.08초만 남기고, 최고점 -1 dBFS
"""
import base64
import glob
import io
import json
import os
import sys
import time
import urllib.error
import urllib.request

import numpy as np
import soundfile as sf

MODEL, VOICE = "gemini-3.8-flash-tts", "ko-kr-training-4"
STYLE = "작업자가 작업 중에 음성비서를 부르고 짧게 묻는 자연스러운 말투"
SAY = {"B1": "비원", "B2": "비투", "B3": "비쓰리", "B4": "비포"}   # tts_supertonic.py 와 같은 읽기
LEAD, TAIL = 0.05, 0.08


def api_key() -> str:
    if os.environ.get("GEMINI_API_KEY"):
        return os.environ["GEMINI_API_KEY"].strip()
    p = os.path.expanduser("~/.config/gemini/key")
    if os.path.isdir(p):
        fs = sorted(glob.glob(os.path.join(p, "*")))
        if len(fs) != 1:
            sys.exit(f"키 폴더 {p} 에 파일이 하나여야 한다({len(fs)}개)")
        p = fs[0]
    return open(p, encoding="utf-8-sig").read().strip()


def synth(key: str, text: str) -> tuple[np.ndarray, int]:
    body = {"model": MODEL,
            "input": [{"type": "user_input", "content": [{"type": "text", "text": text,
                                                          "annotations": [{"type": "speech_metadata", "style": STYLE}]}]}],
            "response_format": {"type": "audio"}, "generation_config": {"speech_config": [{"voice": VOICE}]}}
    req = urllib.request.Request("https://generativelanguage.googleapis.com/v1beta/interactions", data=json.dumps(body).encode(),
                                 headers={"x-goog-api-key": key, "Content-Type": "application/json"}, method="POST")
    for wait in (0, 20, 40):   # 무료 등급 요청 한도(429)면 쉬었다 다시
        time.sleep(wait)
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                d = json.load(r)
            break
        except urllib.error.HTTPError as e:
            if e.code != 429:
                sys.exit(f"HTTP {e.code}: {e.read().decode()[:400]}")
    else:
        sys.exit("요청 한도(429)가 풀리지 않음")
    aud = [c for s in d.get("steps", []) if s.get("type") == "model_output" for c in s.get("content", []) if c.get("type") == "audio"]
    if not aud:
        sys.exit(f"소리 없음: {text}")
    w, sr = sf.read(io.BytesIO(base64.b64decode(aud[-1]["data"])))
    return (w if w.ndim == 1 else w.mean(1)), sr


out = sys.argv[1]
lines = json.load(sys.stdin)
key = api_key()
for name, text in lines.items():
    if not name.startswith("w_"):
        continue
    spoken = text
    for k, v in SAY.items():
        spoken = spoken.replace(k, v)
    w, sr = synth(key, spoken)
    a = np.abs(w)
    idx = np.where(a > 0.01 * a.max())[0]
    w = w[max(0, idx[0] - int(LEAD * sr)): idx[-1] + int(TAIL * sr)]
    w = w * (0.89 / np.abs(w).max())
    sf.write(f"{out}/tts_{name}.wav", w, sr, subtype="PCM_16")
    print(f"tts_{name}.wav {len(w) / sr:.2f}s {spoken}")
