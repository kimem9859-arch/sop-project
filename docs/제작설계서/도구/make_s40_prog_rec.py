# -*- coding: utf-8 -*-
"""40쪽 프로그램 목록 ① 인식 — 프레임이 지나가는 차례대로.

근거 = Rpi5/Demo/ 실제 파일 (줄 수는 wc -l)
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from svgkit import *
from svg2png import render

MONO = "'DejaVu Sans Mono', Consolas, monospace"
d = Doc()

d.txt(70, 62, "인식은 어느 파일이 맡나", 30, C_DARK, "bold")
d.txt(70, 96, "영상 한 장이 지나가는 차례대로 늘어놓았다.", 21, C_SUB)
d.box(70, 118, 1780, 46, C_TINT, C_LINE, 10, 1.2)
for x, k, v in [(92, "NPU", "검출 모델을 빠르게 돌리는 전용 칩 (Hailo-8)"),
                (900, "별도 프로세스", "본 프로그램과 따로 도는 프로그램")]:
    d.txt(x, 148, k, 20, C_DARK, "bold")
    d.txt(x + ew(k, 20) + 22, 148, "= " + v, 20, C_TEXT)


def card(x, y, w, name, lines, desc, col=C_MID, bg="#fff"):
    h = 58 + 24 * len(wrap(desc, 18, w - 36))
    d.box(x, y, w, h, bg, col, 12, 1.8)
    d.add(f'<text x="{x+18}" y="{y+34}" font-family="{MONO}" font-size="20" fill="{col}" '
          f'font-weight="bold">{name}</text>')
    d.txt(x + w - 18, y + 34, f"{lines} 줄", 17, C_SUB, "normal", "end")
    for i, ln in enumerate(wrap(desc, 18, w - 36)):
        d.txt(x + 18, y + 60 + i * 24, ln, 18, C_SUB)
    return h


d.sect(70, 214, "프레임이 지나가는 차례")
CW, CG = 400, 60
HEAD = ["① 받기", "② NPU 나눠 쓰기", "③ 버튼 찾기", "④ 손 찾기"]
for i, t in enumerate(HEAD):
    x = 70 + i * (CW + CG)
    d.box(x, 244, CW, 42, "#EAF2FA", C_MID, 21, 1.4)
    d.txt(x + CW / 2, 272, t, 21, C_DARK, "bold", "middle")
    if i < 3:
        d.add(f'<line x1="{x+CW+8}" y1="265" x2="{x+CW+CG-10}" y2="265" stroke="{C_MID}" '
              f'stroke-width="2.4" marker-end="url(#ar)"/>')

COL = [
 [("camera_thread.py", 754, "글라스 영상을 받아 프레임 루프를 돌린다"),
  ("frame_orient.py", 44, "상하반전 · 회전을 바로잡는다"),
  ("fps.py", 44, "프레임 도착 간격에서 초당 장수를 잰다")],
 [("hailo_device.py", 98, "하나의 NPU 를 세 모델이 나눠 쓰도록 조율한다")],
 [("detector.py", 152, "버튼 5 종을 찾는다. 모델을 갈아 끼울 수 있게 감쌌다")],
 [("hand_tracker.py", 215, "손바닥을 찾고 관절 21 점을 찍는다")],
]
for i, cards in enumerate(COL):
    x = 70 + i * (CW + CG)
    y = 306
    for n, l, s in cards:
        y += card(x, y, CW, n, l, s) + 16

d.sect(70, 626, "곁가지 — 본 흐름과 따로 도는 것")
card(70, 654, 860, "tool_gate.py", 170,
     "공구 추론을 켜고 끈다. 공구 지참 서브 작업 동안에만 켠다", C_WARN, C_WARN_BG)
card(70, 770, 860, "tool_worker.py", 127,
     "공구 검출을 별도 프로세스로 돌린다. 본 프로그램에 없는 라이브러리를 쓰기 때문이다",
     C_WARN, C_WARN_BG)
card(990, 654, 860, "check_model.py", 69,
     "학습한 모델이 약속한 클래스·입력 크기를 지키는지 검사한다 — 개발 단계 전용",
     "#8C98A4", "#F1F3F5")

d.box(990, 770, 860, 108, C_TINT, C_LINE, 12, 1.4)
d.txt(1014, 804, "NPU 에서 도는 모델은 셋", 21, C_DARK, "bold")
d.txt(1014, 836, "버튼 검출 · 손바닥 검출 · 관절 21 점", 19, C_SUB)
d.txt(1014, 864, "공구 검출만 CPU 에서 돈다 — 그래서 별도 프로세스다.", 19, C_SUB)

d.notes(70, 908, 1790, [
    "detector.py 는 모델을 감싸 두어, 다른 검출 모델로 갈아 끼워도 나머지를 고치지 않는다.",
    "공구 검출은 늘 돌지 않는다. 필요한 구간에서만 켜 영상 처리와 자원을 다투지 않게 한다.",
])

out = sys.argv[1] if len(sys.argv) > 1 else "."
h = os.path.join(out, "S40_프로그램인식.html"); d.save(h)
png = os.path.join(out, "S40_프로그램인식.png"); render(h, W, H, png); os.remove(h)
print("생성:", png)
