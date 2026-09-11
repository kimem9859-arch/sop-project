# -*- coding: utf-8 -*-
"""8쪽 시스템 구성도 ② 소프트웨어 구성 — 층으로 쌓았다.

🔴 Gemini 생성본을 대체한다. 「릴레이 8채널 제어」(→5 채널) 를 바로잡고,
   빠져 있던 글라스 ESP32 펌웨어를 넣는다(45쪽 개발 환경과 맞춘다).
🔑 층 순서는 42쪽 프로그램 목록 ③ 과 같게 **아래가 바닥**이다
   (Gemini 본은 위가 바닥이라 42쪽과 반대였다).

근거
  통합문서 §11.2                 런타임·개발도구 버전 정본
  Rpi5/Demo/                     HailoRT · OpenCV · YOLOv8 · MediaPipe · FSM · PyQt6
  Rpi5/Demo/voice_*.py           sherpa-onnx STT/TTS · ollama gemma4:e2b-it-qat
  Rpi5/arduino/console_interlock 릴레이 5 채널 제어 · ACK
실행: python3 make_s12_software.py <출력폴더> [--report]
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from svgkit import *
from svg2png import render

MONO = "'DejaVu Sans Mono', Consolas, monospace"
REPORT = "--report" in sys.argv
SHIFT, RH = 150, 890

d = Doc()
d.add('<defs>'
      '<marker id="ad2" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">'
      f'<path d="M0,0 L10,4 L0,8 Z" fill="{C_GRAY}"/></marker>'
      '<marker id="ab2" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">'
      f'<path d="M0,0 L10,4 L0,8 Z" fill="{C_MID}"/></marker></defs>')

if not REPORT:
    d.txt(70, 62, "소프트웨어는 어떻게 쌓여 있나", 30, C_DARK, "bold")
    d.txt(70, 96, "모델은 개발 PC 에서 만들고, 시연 장비에는 도는 것만 올린다.", 21, C_SUB)
    d.box(70, 118, 1780, 46, C_TINT, C_LINE, 10, 1.2)
    for x, k, v in [(92, "런타임", "프로그램이 돌 때 필요한 부품"),
                    (760, ".hef", "NPU 가 읽을 수 있게 바꾼 모델 파일")]:
        d.txt(x, 148, k, 20, C_DARK, "bold")
        d.txt(x + ew(k, 20) + 22, 148, "= " + v, 20, C_TEXT)

# ══ 모델 준비 ═══════════════════════════════════════
d.sect(70, 212, "모델 준비 — 개발 PC 에서만 한다")
d.box(70, 240, 1780, 100, "#FBFCFD", "#E3EAF1", 12, 1.4)
STEP = [("Ultralytics YOLOv8", "학습"), ("PyTorch", "가중치"), ("ONNX", "중간 형식"),
        ("Hailo DFC", "NPU 변환"), (".hef 모델", "시연 장비에 올린다")]
SX, SW2, SG = 96, 300, 40
for i, (t, s) in enumerate(STEP):
    x = SX + i * (SW2 + SG)
    last = (i == len(STEP) - 1)
    col = C_OK if last else C_MID
    d.box(x, 262, SW2, 56, C_OK_BG if last else "#EAF2FA", col, 10, 1.8)
    d.txt(x + SW2 / 2, 288, t, 20, C_DARK, "bold", "middle")
    d.txt(x + SW2 / 2, 310, s, 16, col, "bold", "middle")
    if not last:
        d.add(f'<line x1="{x+SW2+6}" y1="290" x2="{x+SW2+SG-8}" y2="290" '
              f'stroke="{C_GRAY}" stroke-width="2.4" marker-end="url(#ad2)"/>')

# ══ 시연 장비 층 ════════════════════════════════════
d.sect(70, 386, "시연 장비에서 도는 층 — 아래가 바닥이다")


def layer(y, h, num, name, note, items, col, bg):
    d.box(70, y, 1110, h, bg, col, 12, 2)
    d.add(f'<rect x="70" y="{y}" width="150" height="{h}" rx="12" fill="{col}"/>')
    d.add(f'<rect x="196" y="{y}" width="24" height="{h}" fill="{col}"/>')
    d.txt(145, y + h / 2 - 6, num, 21, "#fff", "bold", "middle")
    d.txt(145, y + h / 2 + 20, name, 21, "#fff", "bold", "middle")
    n = len(items)
    iw = (1110 - 150 - 24 - (n - 1) * 16) / n
    for i, (t, s) in enumerate(items):
        x = 236 + i * (iw + 16)
        d.box(x, y + 16, iw, h - 32, "#fff", col, 9, 1.5)
        d.txt(x + iw / 2, y + 46, t, 19, C_DARK, "bold", "middle")
        for j, ln in enumerate(wrap(s, 16, iw - 24)):
            d.txt(x + iw / 2, y + 70 + j * 21, ln, 16, C_SUB, "normal", "middle")
    d.txt(1196, y + h / 2 + 6, note, 16, C_SUB, "bold")


layer(414, 96, "④", "표현", "", [("PyQt6", "작업자 화면 · 단계 표시 · 경고 팝업 · 해제 버튼")],
      C_OK, C_OK_BG)
layer(526, 96, "③", "판정", "", [("FSM — 유한 상태 머신", "정비 순서 대조 · 순서 위반 판정")],
      C_DARK, C_TINT)
layer(638, 126, "②", "인식", "",
      [("OpenCV", "영상 디코딩 · 전처리"),
       ("Ultralytics YOLOv8", "버튼 · 공구 검출"),
       ("MediaPipe", "BlazePalm · BlazeHandLandmark · 손 21 점")], C_MID, "#EAF2FA")
layer(780, 126, "①", "기반", "",
      [("HailoRT · hailo_platform", "NPU 추론 실행"),
       ("gpiozero", "버튼 입력 수신"),
       ("pySerial", "제어 신호 송신")], C_GRAY, C_GRAY_BG)

d.add(f'<path d="M1204,880 V440" fill="none" stroke="{C_GRAY}" stroke-width="2.4" '
      f'marker-end="url(#ad2)"/>')
for i, ch in enumerate("위로 갈수록 작업자가 보는 것에 가깝다"):
    d.txt(1226, 470 + i * 21, ch, 16, C_SUB, "bold")

# ══ 따로 도는 것 ════════════════════════════════════
d.sect(1290, 386, "따로 도는 것")


def sidepanel(y, h, title, tag, col, bg, items):
    d.box(1290, y, 560, h, bg, col, 12, 2)
    d.txt(1314, y + 34, title, 21, col, "bold")
    d.txt(1826, y + 34, tag, 17, C_SUB, "normal", "end")
    for i, (t, s) in enumerate(items):
        yy = y + 52 + i * 76
        d.box(1312, yy, 516, 64, "#fff", col, 9, 1.5)
        d.add(f'<text x="1332" y="{yy+27}" font-family="{MONO}" font-size="17" '
              f'fill="{C_DARK}" font-weight="bold">{t}</text>')
        d.txt(1332, yy + 50, s, 16, C_SUB)


sidepanel(414, 296, "음성", "파이 2 에서 돈다", C_WARN, C_WARN_BG,
          [("sherpa-onnx-zipformer-korean", "STT — 말을 글자로"),
           ("ollama + gemma4:e2b-it-qat", "LLM — 사실 카드로 안내 문장 생성"),
           ("sherpa-onnx + vits-mimic3-ko", "TTS — 글자를 말소리로")])
sidepanel(738, 168, "장치 펌웨어", "보드 안에서 돈다", C_STOP, C_STOP_BG,
          [("console_interlock.ino", "아두이노 — 릴레이 5 채널 제어 · ACK 응답"),
           ("ESP32 Arduino core + WiFiManager", "글라스 — 카메라 · 마이크 · 스피커")])

d.txt(70, 946, "• 인식은 AI 가 확률로 내놓지만 판정은 고정 규칙이다 — 같은 상황이면 언제나 같은 결과가 나온다.", 19, C_SUB)
d.txt(70, 976, "• 음성은 별도 프로세스라 한쪽이 멈춰도 다른 쪽은 돈다. 판정에 끼어들지 않고 결과를 읽기만 한다.", 19, C_SUB)

args = [a for a in sys.argv[1:] if not a.startswith("--")]
out = args[0] if args else "."
name, hh = "S12_소프트웨어구성", H
if REPORT:
    name, hh = "S12_소프트웨어구성_보고서", RH
    o = d.o
    d.o = ([f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{RH}" '
            f'viewBox="0 0 {W} {RH}">', f'<rect width="{W}" height="{RH}" fill="#fff"/>',
            o[2], o[3], f'<g transform="translate(0,-{SHIFT})">'] + o[4:] + ['</g>'])
h = os.path.join(out, name + ".html"); d.save(h)
png = os.path.join(out, name + ".png"); render(h, W, hh, png); os.remove(h)
print("생성:", png, f"({W}x{hh})")
