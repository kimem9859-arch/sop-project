# -*- coding: utf-8 -*-
"""25쪽 알고리즘 명세서 ① 버튼 검출 — 신뢰도 타임라인으로 이중 임계를 보인다."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from svgkit import *
from svg2png import render

d = Doc()

# ── 그래프 ───────────────────────────────────────────
GX0, GX1, GY0, GY1 = 170, 1200, 208, 604          # conf 1.0 = GY0, 0 = GY1
NF = 28
fx = lambda f: GX0 + f * (GX1 - GX0) / NF
fy = lambda c: GY1 - c * (GY1 - GY0)

CONF = [0.30, 0.42, 0.55, 0.61, 0.71, 0.78, 0.74, 0.62, 0.55, 0.58, 0.53,
        0, 0, 0, 0, 0,
        0.57, 0.66, 0.72, 0.69,
        0, 0, 0, 0, 0, 0, 0,
        0.35, 0.44]

d.txt(70, 62, "손이 버튼을 가려도 버튼 위치를 놓치지 않는 방법", 30, C_DARK, "bold")
d.txt(70, 96, "AI 는 매 프레임 「이 자리에 B1 버튼이 있다」를 확신도와 함께 내놓는다. "
              "확신도가 잠깐 떨어질 때마다 검출을 껐다 켜면 그때마다 순서 판정이 멈춘다.", 21, C_SUB)
d.box(70, 118, 1780, 46, C_TINT, C_LINE, 10, 1.2)
for i, (k, v) in enumerate([("신뢰도", "AI 가 「이 자리에 이 버튼이 있다」고 확신하는 정도 (0~1)"),
                            ("프레임", "영상 한 장 · 초당 15 장 이상"),
                            ("확정", "버튼을 찾은 것으로 인정한 상태")]):
    x = (92, 800, 1210)[i]
    d.txt(x, 148, k, 20, C_DARK, "bold")
    d.txt(x + ew(k, 20) + 22, 148, "= " + v, 20, C_TEXT)

# 구간 배경
def band(f0, f1, fill, op=1.0):
    d.add(f'<rect x="{fx(f0)}" y="{GY0}" width="{fx(f1) - fx(f0)}" height="{GY1 - GY0}" '
          f'fill="{fill}" fill-opacity="{op}"/>')
band(4, 11, "#EAF2FA")
band(11, 16, C_GRAY_BG)
band(16, 20, "#EAF2FA")
band(20, 27, "#E2E6EA")

# 격자 · 축
for c in (0.0, 0.25, 0.5, 0.75, 1.0):
    d.add(f'<line x1="{GX0}" y1="{fy(c)}" x2="{GX1}" y2="{fy(c)}" stroke="{C_LINE}" stroke-width="1"/>')
    d.txt(GX0 - 16, fy(c) + 7, f"{c:.2f}", 19, C_SUB, "normal", "end")
d.add(f'<line x1="{GX0}" y1="{GY0}" x2="{GX0}" y2="{GY1}" stroke="{C_SUB}" stroke-width="1.6"/>')
d.add(f'<line x1="{GX0}" y1="{GY1}" x2="{GX1}" y2="{GY1}" stroke="{C_SUB}" stroke-width="1.6"/>')
d.txt(GX0 - 16, GY0 - 18, "신뢰도", 20, C_SUB, "bold", "end")
d.txt(GX1 + 12, GY1 + 8, "프레임 →", 20, C_SUB)
d.txt(fx(13.5), GY0 - 14, "손이 버튼을 덮어 검출이 끊긴 구간", 20, C_GRAY, "bold", "middle")

# 임계선
d.add(f'<line x1="{GX0}" y1="{fy(0.65)}" x2="{GX1}" y2="{fy(0.65)}" stroke="{C_DARK}" stroke-width="2.2"/>')
d.txt(GX1 + 12, fy(0.65) + 7, "0.65  신규 확정", 20, C_DARK, "bold")
d.add(f'<line x1="{GX0}" y1="{fy(0.50)}" x2="{GX1}" y2="{fy(0.50)}" stroke="{C_WARN}" '
      f'stroke-width="2.2" stroke-dasharray="9 6"/>')
d.txt(GX1 + 12, fy(0.50) + 7, "0.50  확정 유지", 20, C_WARN, "bold")

# 곡선 (미검출은 끊어 그린다)
seg, segs = [], []
for f, c in enumerate(CONF):
    if c == 0:
        if seg: segs.append(seg); seg = []
    else:
        seg.append((fx(f), fy(c)))
if seg: segs.append(seg)
for s in segs:
    d.add('<polyline points="' + " ".join(f"{x:.1f},{y:.1f}" for x, y in s) +
          f'" fill="none" stroke="{C_MID}" stroke-width="3.4" stroke-linejoin="round"/>')
    for x, y in s:
        d.add(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="4.6" fill="{C_MID}"/>')

# 확정 시점 강조
d.add(f'<circle cx="{fx(4)}" cy="{fy(0.71)}" r="11" fill="none" stroke="{C_DARK}" stroke-width="3"/>')

# 주석
def ann(f0, f1, y, s, col):
    x0, x1 = fx(f0), fx(f1)
    d.add(f'<line x1="{x0}" y1="{y}" x2="{x1}" y2="{y}" stroke="{col}" stroke-width="2"/>')
    for x in (x0, x1):
        d.add(f'<line x1="{x}" y1="{y - 7}" x2="{x}" y2="{y + 7}" stroke="{col}" stroke-width="2"/>')
    d.txt((x0 + x1) / 2, y - 14, s, 20, col, "bold", "middle")

d.txt(fx(4), fy(0.71) - 26, "① 0.65 를 넘는 순간 확정", 21, C_DARK, "bold", "middle")
ann(4, 11, GY1 + 62, "② 확정 뒤에는 0.50 까지 내려가도 유지", C_MID)
ann(11, 16, GY1 + 122, "③ 5 프레임(약 0.2~0.3 초)까지는 직전 위치를 그대로 쓴다", C_GRAY)
ann(20, 27, GY1 + 62, "④ 5 프레임을 넘으면 확정을 푼다", "#6E7A86")
d.txt(GX1, 546, "다시 0.65 를 넘어야 확정된다", 19, C_SUB, "normal", "end")

# ── 오른쪽 패널 ──────────────────────────────────────
RX, RW = 1450, 400
d.sect(RX, 208, "입력 · 출력", 24)
d.box(RX, 230, RW, 60, "#EAF2FA")
d.txt(RX + 18, 267, "입력", 21, C_DARK, "bold"); d.txt(RX + 92, 267, "글라스가 보낸 영상 한 장", 20)
d.box(RX, 300, RW, 60, "#EAF2FA")
d.txt(RX + 18, 337, "출력", 21, C_DARK, "bold"); d.txt(RX + 92, 337, "버튼 5 개의 화면 좌표", 20)

d.sect(RX, 410, "파라미터", 24)
d.params(RX, 432, RW, [("입력 크기", "640 × 640"), ("찾는 대상", "버튼 5 개"),
                       ("확정 임계", "0.65"), ("유지 임계", "0.50"),
                       ("끊김 허용", "5 프레임"), ("한 장 처리", "약 11 ms")], 20)

# ── 아래 처리 순서 (가로) ─────────────────────────────
d.sect(70, 792, "처리 순서")
CH = ["영상 한 장 받기", "AI 로 버튼 찾기", "0.65 넘으면 확정", "0.50 까지 유지", "5 프레임 끊김 허용", "버튼 좌표 넘기기"]
cw, g, y = 268, 30, 818
for i, s in enumerate(CH):
    x = 70 + i * (cw + g)
    d.chip(x, y, cw, 62, s, C_MID, 21, C_TINT)
    if i < len(CH) - 1:
        d.add(f'<line x1="{x + cw + 4}" y1="{y + 31}" x2="{x + cw + g - 6}" y2="{y + 31}" '
              f'stroke="{C_MID}" stroke-width="2" marker-end="url(#ar)"/>')

d.notes(70, 908, 1790, [
    "하나만 쓰면 확신도가 그 선을 오르내릴 때마다 버튼이 나타났다 사라졌다 한다.",
    "버튼을 누르는 순간 손이 버튼을 덮는다. 정작 필요한 그 순간에 끊긴다.",
    "작업자가 머리를 돌리면 버튼도 움직인다. 그래서 매 프레임 다시 찾는다.",
])

out = sys.argv[1] if len(sys.argv) > 1 else "."
h = os.path.join(out, "S25_버튼검출.html"); d.save(h)
png = os.path.join(out, "S25_버튼검출.png"); render(h, W, H, png); os.remove(h)
print("생성:", png)
