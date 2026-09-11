# -*- coding: utf-8 -*-
"""42쪽 프로그램 목록 ③ 표시 · 운용 — 화면이 쌓이는 층.

근거 = Rpi5/Demo/ 실제 파일 (줄 수는 wc -l)
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from svgkit import *
from svg2png import render

MONO = "'DejaVu Sans Mono', Consolas, monospace"
d = Doc()

d.txt(70, 62, "화면과 운용은 어느 파일이 맡나", 30, C_DARK, "bold")
d.txt(70, 96, "아래층이 위층을 받친다. 위로 갈수록 작업자가 보는 것에 가깝다.", 21, C_SUB)
d.box(70, 118, 1780, 46, C_TINT, C_LINE, 10, 1.2)
for x, k, v in [(92, "오버레이", "영상 위에 겹쳐 그리는 정보 층"),
                (860, "테마 토큰", "색과 글꼴을 한 곳에 모아 둔 것")]:
    d.txt(x, 148, k, 20, C_DARK, "bold")
    d.txt(x + ew(k, 20) + 22, 148, "= " + v, 20, C_TEXT)


def card(x, y, w, name, lines, desc, col=C_MID, bg="#fff", fs=19):
    ls = wrap(desc, 17, w - 32)
    h = 54 + 23 * len(ls)
    d.box(x, y, w, h, bg, col, 12, 1.8)
    d.add(f'<text x="{x+16}" y="{y+32}" font-family="{MONO}" font-size="{fs}" fill="{col}" '
          f'font-weight="bold">{name}</text>')
    d.txt(x + w - 16, y + 32, f"{lines} 줄", 16, C_SUB, "normal", "end")
    for i, ln in enumerate(ls):
        d.txt(x + 16, y + 56 + i * 23, ln, 17, C_SUB)
    return h


def layer(n, label, y, h, col):
    d.box(70, y, 84, h, "#fff", col, 10, 1.6)
    d.txt(112, y + h / 2 - 6, n, 24, col, "bold", "middle")
    d.txt(112, y + h / 2 + 20, label, 15, C_SUB, "normal", "middle")


d.sect(70, 214, "화면이 쌓이는 층   —   아래가 위를 받친다")
LX, LW = 170, 930

# 4층 — 보이는 것
layer("4", "보이는 것", 246, 104, C_STOP)
for i, (n, l, s) in enumerate([("overlay.py", 661, "영상 위에 단계 · 검출 · 경고를 그린다"),
                               ("overlay_menu.py", 729, "메뉴 · 알림 · 설정 패널"),
                               ("overlay_result.py", 172, "작업 완료 결과 안내창")]):
    card(LX + i * 316, 246, 296, n, l, s, C_STOP, C_STOP_BG)

# 3층 — 조립
layer("3", "조립", 372, 82, C_DARK)
card(LX, 372, LW, "safety_console.py", 1747,
     "창 전체를 조립하고 인식 · 판정 · 인터락 · 화면을 서로 잇는다", C_DARK, "#DEEAF6", 21)

# 2층 — 꾸밈
layer("2", "꾸밈", 476, 82, C_MID)
for i, (n, l, s) in enumerate([("theme.py", 148, "다크 · 화이트 두 벌의 색을 정한다"),
                               ("anim.py", 177, "오버레이가 나타나고 사라지는 움직임")]):
    card(LX + i * 476, 476, 454, n, l, s)

# 1층 — 바닥
layer("1", "바닥", 580, 82, "#8C98A4")
for i, (n, l, s) in enumerate([("main.py", 60, "프로그램을 띄운다"),
                               ("config.py", 428, "값과 경로를 한 곳에 모아 둔다")]):
    card(LX + i * 476, 580, 454, n, l, s, "#8C98A4", "#F1F3F5")

for y in (356, 462, 566):
    d.add(f'<line x1="{LX + LW/2}" y1="{y+10}" x2="{LX + LW/2}" y2="{y}" stroke="{C_SUB}" '
          f'stroke-width="2.2" marker-end="url(#arg)"/>')
d.txt(LX + LW / 2 + 16, 470, "받친다", 17, C_SUB, "bold")

# ══ 오른쪽 — 따로 도는 것 ═══════════════════════════
RX, RW = 1160, 690
d.sect(RX, 214, "본 화면과 따로 도는 것")
card(RX, 246, RW, "voice_assistant.py", 290,
     "음성비서 데몬 — 호출어를 듣고 답을 내보낸다", C_OK, C_OK_BG)
card(RX, 340, RW, "voice_lib.py", 187,
     "음성 판정 로직 — 소켓 · 모델 없이 따로 시험할 수 있게 떼어 놓았다", C_OK, C_OK_BG)
card(RX, 458, RW, "session_stats.py", 151,
     "한 번의 작업에서 일어난 일을 모아 완료 안내창에 넘긴다")

d.txt(RX, 590, "시연 영상 촬영 — 개발 단계 전용", 20, C_SUB, "bold")
for i, (n, l, s) in enumerate([("demo_recorder.py", 158, "한 번 실행에 다섯 파일을 남긴다"),
                               ("demo_ffmpeg.py", 149, "촬영 중 꼭 필요한 것만 돌린다"),
                               ("demo_postprocess.py", 76, "촬영 뒤 규격을 맞춘다")]):
    card(RX, 610 + i * 84, RW, n, l, s, "#8C98A4", "#F1F3F5", 18)

d.notes(70, 890, 1790, [
    "safety_console.py 가 1,747 줄로 가장 크다 — 여러 부품을 잇는 자리라 그렇다. 판정과 인식은 따로 떼어 두었다.",
    "voice_lib.py 를 떼어 둔 덕에 마이크와 모델 없이도 음성 판정을 시험할 수 있다.",
])

out = sys.argv[1] if len(sys.argv) > 1 else "."
h = os.path.join(out, "S42_프로그램표시.html"); d.save(h)
png = os.path.join(out, "S42_프로그램표시.png"); render(h, W, H, png); os.remove(h)
print("생성:", png)
