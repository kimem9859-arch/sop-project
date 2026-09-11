# -*- coding: utf-8 -*-
"""36쪽 하드웨어 설계도 — 결선도.

근거 = Rpi5/arduino/console_interlock/console_interlock.ino (핀맵·CH5) ·
       dev/interlock/결선도_초안.md §3 (GPIO·부하)
    🔴 결선도_초안 §3.2 의 (D3)(IN5) = PoC LED 는 낡았다.
       2026-09-05 부터 D3 → IN5 → 버튼 공통 GND 차단 (.ino:16, :38)
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from svgkit import *
from svg2png import render

MONO = "'DejaVu Sans Mono', Consolas, monospace"
d = Doc()
d.add('<defs><marker id="as3" markerWidth="11" markerHeight="9" refX="10" refY="4.5" orient="auto">'
      f'<path d="M0,0 L11,4.5 L0,9 Z" fill="{C_STOP}"/></marker></defs>')

d.txt(70, 62, "무엇이 무엇에 연결되나", 30, C_DARK, "bold")
d.txt(70, 96, "차단은 소프트웨어가 무시하는 것이 아니다. 버튼이 돌아오는 선을 실제로 끊는다.", 21, C_SUB)
d.box(70, 118, 1780, 46, C_TINT, C_LINE, 10, 1.2)
for x, k, v in [(92, "공통 GND", "공정 버튼 네 개가 함께 쓰는 돌아오는 선"),
                (900, "NC 접점", "평소에는 붙어 있다가 신호를 주면 떨어지는 접점")]:
    d.txt(x, 148, k, 20, C_DARK, "bold")
    d.txt(x + ew(k, 20) + 22, 148, "= " + v, 20, C_TEXT)

# ══ 위 · 신호가 가는 길 ═════════════════════════════
d.sect(70, 216, "신호가 가는 길")

def unit(x, y, w, h):
    d.box(x, y, w, h, "#fff", C_MID, 14, 2)

unit(70, 250, 330, 276)
d.txt(235, 292, "콘솔 입력", 25, C_DARK, "bold", "middle")
for i, (n, c) in enumerate([("B1", "노랑"), ("B2", "흰"), ("B3", "핑크"), ("B4", "검정")]):
    yy = 336 + i * 28
    d.txt(104, yy, n, 20, C_DARK, "bold")
    d.txt(186, yy, c, 19, C_SUB)
d.add(f'<line x1="96" y1="{436}" x2="374" y2="{436}" stroke="{C_LINE}" stroke-width="1.2" '
      f'stroke-dasharray="5 4"/>')
d.txt(104, 462, "EMO", 20, C_STOP, "bold")
d.txt(186, 462, "적색 · NC 쌍", 19, C_SUB)
d.txt(235, 494, "B1 ~ B4 네 개만 묶는다", 18, C_STOP, "bold", "middle")
d.txt(235, 516, "EMO 는 빼둔다 — 차단 중에도 산다", 18, C_SUB, "normal", "middle")

unit(560, 300, 310, 140)
d.txt(715, 342, "파이 5", 25, C_DARK, "bold", "middle")
d.txt(715, 374, "GPIO 5 · 6 · 13 · 19 · 26", 19, C_SUB, "normal", "middle")
d.txt(715, 402, "눌림을 읽어 판정한다", 19, C_SUB, "normal", "middle")

unit(1030, 300, 310, 140)
d.txt(1185, 342, "아두이노 UNO R4", 24, C_DARK, "bold", "middle")
d.txt(1185, 374, "D7 · D6 · D5 · D4 · D3", 19, C_SUB, "normal", "middle")
d.txt(1185, 402, "릴레이를 구동한다", 19, C_SUB, "normal", "middle")

unit(1500, 250, 350, 250)
d.txt(1675, 292, "릴레이 8 채널 모듈", 25, C_DARK, "bold", "middle")
d.txt(1675, 320, "5 채널 사용 · 평소 붙어 있음 (NC)", 19, C_SUB, "normal", "middle")
for i, (n, load, col) in enumerate([("CH1", "타워램프 적", C_STOP), ("CH2", "타워램프 황", C_WARN),
                                    ("CH3", "타워램프 녹", C_OK), ("CH4", "부저", C_STOP),
                                    ("CH5", "버튼 공통 GND 차단", C_STOP)]):
    yy = 360 + i * 30
    d.txt(1530, yy, n, 20, col, "bold")
    d.txt(1614, yy, load, 19, C_SUB)

def arrow(x1, x2, lab, y=370):
    d.add(f'<line x1="{x1}" y1="{y}" x2="{x2}" y2="{y}" stroke="{C_MID}" stroke-width="2.6" '
          f'marker-end="url(#ar)"/>')
    d.txt((x1 + x2) / 2, y - 16, lab, 20, C_DARK, "bold", "middle")

arrow(404, 556, "GPIO 입력")
arrow(874, 1026, "USB 시리얼")
arrow(1344, 1496, "제어 출력")

# ══ 아래 · 차단이 실제로 끊는 곳 ════════════════════
d.sect(70, 588, "차단이 실제로 끊는 곳")
d.box(70, 616, 400, 112, C_TINT, C_MID, 14, 2)
d.txt(270, 660, "버튼 공통 GND", 24, C_DARK, "bold", "middle")
d.txt(270, 692, "B1 ~ B4 에서 모은 한 가닥", 19, C_SUB, "normal", "middle")

d.box(600, 606, 520, 132, C_STOP_BG, C_STOP, 14, 2.6)
d.txt(860, 648, "릴레이 CH5 접점", 25, C_STOP, "bold", "middle")
d.add(f'<text x="860" y="682" font-family="{MONO}" font-size="20" fill="{C_SUB}" '
      f'text-anchor="middle">Arduino D3 → IN5</text>')
d.txt(860, 714, "BLOCK 일 때 떨어진다", 20, C_STOP, "bold", "middle")

d.box(1250, 616, 400, 112, C_TINT, C_MID, 14, 2)
d.txt(1450, 660, "파이 GND", 24, C_DARK, "bold", "middle")
d.txt(1450, 692, "여기 닿아야 눌림이 읽힌다", 19, C_SUB, "normal", "middle")

for x1, x2 in ((474, 596), (1124, 1246)):
    d.add(f'<line x1="{x1}" y1="672" x2="{x2}" y2="672" stroke="{C_STOP}" stroke-width="3.2" '
          f'marker-end="url(#as3)"/>')

d.add(f'<path d="M1660,504 L1660,566 L860,566 L860,600" fill="none" stroke="{C_STOP}" '
      f'stroke-width="2" stroke-dasharray="8 6" marker-end="url(#as3)"/>')
d.txt(1270, 552, "위 릴레이의 CH5 가 이 접점이다", 19, C_STOP, "bold", "middle")

d.notes(70, 786, 1790, [
    "접점이 떨어지면 눌러도 신호가 파이에 닿지 못한다 — 회로가 끊긴다.",
    "부팅 중에는 접점이 붙어 있다. 전원이 들어오는 동안 버튼이 죽지 않게 하기 위해서다.",
    "경고에서는 끊지 않는다. 오경보로 콘솔이 먹통이 될 수 있다.",
    "아두이노와 릴레이는 파이의 USB 에서 전원을 받는다. 전원이 죽으면 접점이 붙어 버튼이 살아난다 — 차단이 풀리는 쪽으로 넘어진다.",
])

out = sys.argv[1] if len(sys.argv) > 1 else "."
h = os.path.join(out, "S36_결선도.html"); d.save(h)
png = os.path.join(out, "S36_결선도.png"); render(h, W, H, png); os.remove(h)
print("생성:", png)
