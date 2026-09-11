# -*- coding: utf-8 -*-
"""33쪽 알고리즘 상세 설명서 ② 체류 시간 임계 — 왜 0.3 초인가.

근거 = 개발보고서 Ⅲ-2-2)③ 순서 인식 오탐(스침) 억제
    "초기값 0.5 초는 스침 오탐만 보고 임의로 정한 값, 위반을 제때 잡는지는 측정한 적 없음"
    "실제로 눌러 재측정한 결과 버튼 체류 중앙값 0.39~0.40 초로 천천히 눌러도 동일(3회 재현)"
    "0.5 초는 위반의 14%만 포착해 임계를 중앙값 아래로 재설정"
    Ⅱ-3-5) "체류 0.3 초로 스침과 의도적 접근 구분"
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from svgkit import *
from svg2png import render

d = Doc()

d.txt(70, 62, "왜 0.3 초인가", 30, C_DARK, "bold")
d.txt(70, 96, "처음엔 스침만 보고 0.5 초로 정했다. 실제로 눌러 재 보니 그 값으로는 위반을 놓쳤다.", 21, C_SUB)
d.box(70, 118, 1780, 46, C_TINT, C_LINE, 10, 1.2)
for x, k, v in [(92, "스침", "누르려는 것이 아니라 지나가는 손"),
                (860, "중앙값", "잰 값을 줄 세웠을 때 한가운데 값")]:
    d.txt(x, 148, k, 20, C_DARK, "bold")
    d.txt(x + ew(k, 20) + 22, 148, "= " + v, 20, C_TEXT)

d.sect(70, 216, "버튼에 머문 시간을 한 줄에 놓고 본다")

X0, X1, TMAX = 300, 1700, 0.8
tx = lambda t: X0 + t / TMAX * (X1 - X0)
BY, BH = 352, 72

# 구간
d.add(f'<rect x="{X0}" y="{BY}" width="{tx(0.3)-X0}" height="{BH}" fill="{C_GRAY_BG}"/>')
d.add(f'<rect x="{tx(0.3)}" y="{BY}" width="{X1-tx(0.3)}" height="{BH}" fill="{C_WARN_BG}"/>')
d.add(f'<rect x="{X0}" y="{BY}" width="{X1-X0}" height="{BH}" rx="6" fill="none" '
      f'stroke="{C_LINE}" stroke-width="1.4"/>')
d.txt((X0 + tx(0.3)) / 2, BY + 44, "스침으로 본다", 22, "#7A8894", "bold", "middle")
d.txt((tx(0.3) + X1) / 2, BY + 44, "누르려는 것으로 본다", 22, C_WARN, "bold", "middle")

# 임계선 — 처음 값과 지금 값
d.add(f'<line x1="{tx(0.5)}" y1="304" x2="{tx(0.5)}" y2="{BY+BH+8}" stroke="#8C98A4" '
      f'stroke-width="3" stroke-dasharray="9 6"/>')
d.txt(tx(0.5) + 14, 298, "처음 정한 값  0.5 초", 21, "#6E7A86", "bold")
d.add(f'<line x1="{tx(0.3)}" y1="304" x2="{tx(0.3)}" y2="{BY+BH+8}" stroke="{C_DARK}" stroke-width="4"/>')
d.txt(tx(0.3) - 14, 298, "지금 임계  0.3 초", 21, C_DARK, "bold", "end")
d.add(f'<line x1="{tx(0.5)-12}" y1="264" x2="{tx(0.3)+12}" y2="264" stroke="{C_DARK}" '
      f'stroke-width="2.4" marker-end="url(#ar)"/>')
d.txt((tx(0.3) + tx(0.5)) / 2, 256, "낮췄다", 20, C_DARK, "bold", "middle")

# 눈금
for t in (0, 0.2, 0.4, 0.6, 0.8):
    d.add(f'<line x1="{tx(t)}" y1="{BY+BH}" x2="{tx(t)}" y2="{BY+BH+10}" stroke="{C_SUB}" stroke-width="1.6"/>')
    d.txt(tx(t), BY + BH + 34, f"{t:g}", 19, C_SUB, "normal", "middle")
d.txt(X1, BY + BH + 64, "버튼에 머문 시간 (초)", 19, C_SUB, "normal", "end")

# 실측 중앙값
MY = 492
d.add(f'<rect x="{tx(0.39)}" y="{MY}" width="{tx(0.40)-tx(0.39)}" height="30" rx="5" fill="{C_OK}"/>')
d.add(f'<line x1="{tx(0.395)}" y1="{BY+BH+46}" x2="{tx(0.395)}" y2="{MY}" stroke="{C_OK}" '
      f'stroke-width="2.4" stroke-dasharray="7 5"/>')
d.add(f'<path d="M{tx(0.395)},{BY+BH+8} l9,14 l-18,0 Z" fill="{C_OK}"/>')
d.txt(tx(0.395), MY + 60, "실제로 눌렀을 때 버튼에 머문 시간 — 중앙값 0.39 ~ 0.40 초", 21, C_OK, "bold", "middle")
d.txt(tx(0.395), MY + 88, "천천히 눌러도 같았다 (3 회 재현)", 19, C_SUB, "normal", "middle")

# ══ 아래 · 바꾸기 전과 후 ═══════════════════════════
d.sect(70, 640, "임계를 바꾸기 전과 후")
CARD = [("0.5 초였을 때", "#8C98A4", "#F1F3F5",
         "위반의 14 %만 잡혔다",
         "중앙값 0.39~0.40 초가 임계보다 낮다. 실제로 누르는 손 대부분이 임계에 못 미쳤다."),
        ("0.3 초로 낮춘 뒤", C_DARK, "#EAF2FA",
         "중앙값보다 아래로 내려왔다",
         "실제로 누르는 손은 대부분 넘어서고, 스치는 손은 여전히 못 넘는다.")]
for i, (t, col, bg, head, why) in enumerate(CARD):
    x = 70 + i * 910
    d.box(x, 668, 880, 156, bg, col, 14, 2)
    d.add(f'<rect x="{x}" y="668" width="9" height="156" rx="4" fill="{col}"/>')
    d.txt(x + 32, 706, t, 22, col, "bold")
    d.txt(x + 32, 748, head, 27, col, "bold")
    for j, ln in enumerate(wrap(why, 19, 810)):
        d.txt(x + 32, 786 + j * 25, ln, 19, C_SUB)

d.notes(70, 856, 1790, [
    "처음 0.5 초는 스침을 막으려고 정한 값이었다. 위반을 제때 잡는지는 재 본 적이 없었다.",
    "임계는 실제로 눌러 재 본 값에서 나왔다 — 짐작이 아니다.",
])

out = sys.argv[1] if len(sys.argv) > 1 else "."
h = os.path.join(out, "S33_체류임계.html"); d.save(h)
png = os.path.join(out, "S33_체류임계.png"); render(h, W, H, png); os.remove(h)
print("생성:", png)
