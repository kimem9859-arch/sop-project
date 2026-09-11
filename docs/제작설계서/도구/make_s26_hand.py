# -*- coding: utf-8 -*-
"""26쪽 알고리즘 명세서 ② 손 추적 — 21점 골격에서 검지 끝을 왜 쓰는지 보인다."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from svgkit import *
from svg2png import render

d = Doc()

# ── 왼쪽 · 손 21점 골격 ───────────────────────────────
PT = {0: (200, 462),
      1: (142, 402), 2: (100, 350), 3: (74, 305), 4: (52, 262),
      5: (158, 292), 6: (150, 228), 7: (146, 186), 8: (142, 146),
      9: (204, 282), 10: (206, 214), 11: (207, 168), 12: (208, 126),
      13: (248, 290), 14: (255, 224), 15: (259, 180), 16: (262, 140),
      17: (290, 312), 18: (303, 262), 19: (310, 226), 20: (316, 192)}
EDGE = [(0, 1), (1, 2), (2, 3), (3, 4), (0, 5), (5, 6), (6, 7), (7, 8),
        (5, 9), (9, 10), (10, 11), (11, 12), (9, 13), (13, 14), (14, 15), (15, 16),
        (13, 17), (17, 18), (18, 19), (19, 20), (0, 17)]
S, OX, OY = 1.34, 176, 236
X = lambda i: OX + PT[i][0] * S
Y = lambda i: OY + PT[i][1] * S

d.txt(70, 62, "손끝이 어느 버튼 위에 있는지 알아내는 방법", 30, C_DARK, "bold")
d.txt(70, 96, "손 전체가 아니라 점 하나면 된다. 버튼 구역 안에 들어왔는지만 판단하면 되기 때문이다.", 21, C_SUB)
d.box(70, 118, 1780, 46, C_TINT, C_LINE, 10, 1.2)
for i, (k, v) in enumerate([("랜드마크", "손의 관절 위치를 찍은 점 — 손목 1 개 + 손가락 20 개 = 21 개"),
                            ("신뢰도", "그 점의 위치가 맞다고 보는 정도 (0~1)")]):
    x = (92, 1080)[i]
    d.txt(x, 148, k, 20, C_DARK, "bold")
    d.txt(x + ew(k, 20) + 22, 148, "= " + v, 20, C_TEXT)
d.sect(70, 216, "손 랜드마크 21 점 — 번호는 손목(0)에서 시작해 엄지 → 새끼 순서다")

# 손바닥 검출 상자 (1단 결과)
d.add(f'<rect x="{X(4) - 34}" y="{Y(12) - 30}" width="{X(20) - X(4) + 74}" '
      f'height="{Y(0) - Y(12) + 62}" rx="16" fill="none" stroke="{C_OK}" '
      f'stroke-width="2.2" stroke-dasharray="10 7"/>')
d.txt(X(4) - 34, Y(12) - 42, "1 단 — 손 영역 상자", 20, C_OK, "bold")

for a, b in EDGE:
    d.add(f'<line x1="{X(a):.1f}" y1="{Y(a):.1f}" x2="{X(b):.1f}" y2="{Y(b):.1f}" '
          f'stroke="{C_MID}" stroke-width="4" stroke-linecap="round" opacity="0.7"/>')

LOFF = {0: (0, 36), 1: (-24, 6), 2: (-24, 6), 3: (-24, 6), 4: (-24, 6),
        5: (-26, 6), 6: (-26, 6), 7: (-26, 6),
        9: (20, 6), 10: (20, 6), 11: (20, 6), 12: (20, 6),
        13: (20, 6), 14: (20, 6), 15: (20, 6), 16: (20, 6),
        17: (22, 6), 18: (22, 6), 19: (22, 6), 20: (22, 6)}
for i in PT:
    if i == 8:
        continue
    d.add(f'<circle cx="{X(i):.1f}" cy="{Y(i):.1f}" r="9" fill="#fff" '
          f'stroke="{C_DARK}" stroke-width="2.6"/>')
    dx, dy = LOFF[i]
    d.txt(X(i) + dx, Y(i) + dy, str(i), 18, C_SUB, "normal",
          "middle" if dx == 0 else ("end" if dx < 0 else "start"))

# 8번 강조
d.add(f'<circle cx="{X(8):.1f}" cy="{Y(8):.1f}" r="19" fill="{C_STOP}"/>')
d.txt(X(8), Y(8) + 8, "8", 22, "#fff", "bold", "middle")
d.add(f'<line x1="250" y1="344" x2="{X(8):.1f}" y2="{Y(8) - 20:.1f}" '
      f'stroke="{C_STOP}" stroke-width="2"/>')
d.box(74, 268, 330, 76, C_STOP_BG, C_STOP)
d.txt(94, 300, "검지 끝 — 8 번", 21, C_STOP, "bold")
d.txt(94, 328, "사람이 버튼을 누르는 바로 그 지점", 19, C_SUB)

d.txt(176, 928, "21 점 가운데 이 한 점만 다음 단계로 넘어간다.", 21, C_SUB)

# ── 오른쪽 ──────────────────────────────────────────
RX, RW = 960, 890
d.sect(RX, 216, "왜 두 번에 나눠 찾나")
CARD = [("1 단 · 손 찾기", "화면 전체에서 손이 들어 있는 네모를 먼저 찾는다 (BlazePalm)"),
        ("2 단 · 관절 찍기", "그 네모만 잘라 키운 뒤 관절 21 개의 자리를 찍는다 (BlazeHandLandmark)"),
        ("한 점 고르기", "21 점 가운데 검지 끝(8 번) 하나만 다음 단계로 넘긴다")]
y = 242
for i, (t, s) in enumerate(CARD):
    d.box(RX, y, RW, 106, C_TINT, C_MID, 14, 1.5)
    d.txt(RX + 26, y + 44, t, 25, C_DARK, "bold")
    d.txt(RX + 26, y + 78, s, 20, C_SUB)
    if i < 2:
        d.add(f'<line x1="{RX + RW / 2}" y1="{y + 108}" x2="{RX + RW / 2}" y2="{y + 124}" '
              f'stroke="{C_MID}" stroke-width="2.4" marker-end="url(#ar)"/>')
    y += 130

d.sect(RX, 654, "신뢰도 하한을 낮춰 둔 이유")
GY, GH = 708, 46
gx = lambda c: RX + c * RW
d.add(f'<rect x="{RX}" y="{GY}" width="{RW}" height="{GH}" rx="8" fill="{C_GRAY_BG}"/>')
d.add(f'<rect x="{gx(0.2)}" y="{GY}" width="{RW - gx(0.2) + RX}" height="{GH}" rx="8" fill="#DEEAF6"/>')
d.add(f'<rect x="{gx(0.11)}" y="{GY}" width="{gx(0.13) - gx(0.11)}" height="{GH}" fill="{C_WARN}"/>')
d.add(f'<line x1="{gx(0.2)}" y1="{GY - 10}" x2="{gx(0.2)}" y2="{GY + GH + 10}" '
      f'stroke="{C_DARK}" stroke-width="3"/>')
for c in (0, 0.25, 0.5, 0.75, 1.0):
    d.txt(gx(c), GY + GH + 34, f"{c:g}", 18, C_SUB, "normal", "middle")
d.txt(gx(0.2) + 12, GY - 16, "하한 0.2 — 이보다 낮으면 손을 못 찾은 것으로 본다", 20, C_DARK, "bold")
d.txt(gx(0.13), GY + GH + 62, "손이 버튼을 덮는 순간 0.11~0.13 까지 떨어진다", 19, C_WARN, "bold", "middle")
d.txt(gx(0.6), GY + 30, "이 구간이면 손을 찾은 것으로 본다", 20, C_DARK, "bold", "middle")

d.notes(70, 962, 830, [
    "화면 전체에서 관절 21 개를 한 번에 찾으면 느리고 부정확하다. 잘라 키운 뒤 찍는다.",
])
d.notes(RX, 856, 890, [
    "누르는 동작은 손이 버튼을 가리는 순간에 일어난다. 하한이 높으면 그 손을 놓친다.",
    "낮추면 오검출이 늘지만, 버튼 구역 안인지를 한 번 더 걸러 오경고로 가지 않는다.",
])

out = sys.argv[1] if len(sys.argv) > 1 else "."
h = os.path.join(out, "S26_손추적.html"); d.save(h)
png = os.path.join(out, "S26_손추적.png"); render(h, W, H, png); os.remove(h)
print("생성:", png)
