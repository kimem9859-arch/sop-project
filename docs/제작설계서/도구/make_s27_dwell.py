# -*- coding: utf-8 -*-
"""27쪽 알고리즘 명세서 ③ 손-버튼 접촉·체류.

🔴 두 개의 0.3 초는 서로 다른 값이다 (fsm.py:174 · fsm.py:210)
    FSM_DWELL_THRESHOLD_SEC = 0.3  경고를 낼 기준
    FSM_GAP_FILL_SEC        = 0.3  검출 끊김을 견디는 한계
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from svgkit import *
from svg2png import render

d = Doc()

# ══ 도입 ════════════════════════════════════════════
d.txt(70, 62, "스치고 지나간 손과 누르려는 손을 어떻게 가르나", 30, C_DARK, "bold")
d.txt(70, 96, "손끝이 버튼 위에 얼마나 오래 머무는지로 가른다. "
              "다가오기만 해도 경고하면 작업자가 경고를 믿지 않게 된다.", 21, C_SUB)
d.box(70, 118, 1780, 46, C_TINT, C_LINE, 10, 1.2)
for x, k, v in [(92, "머문 시간", "손끝이 버튼 구역에 들어온 뒤 흐른 시간"),
                (700, "판정 구역", "화면에서 「이 버튼을 누르려 한다」고 볼 범위"),
                (1350, "경고", "화면 팝업 + 타워램프 · 부저 (전기는 끊지 않는다)")]:
    d.txt(x, 148, k, 20, C_DARK, "bold")
    d.txt(x + ew(k, 20) + 22, 148, "= " + v, 20, C_TEXT)

# ══ 왼쪽 · 구역 평면도 ══════════════════════════════
d.sect(70, 216, "버튼을 위에서 본 판정 구역")

IX0, IY0, IX1, IY1 = 360, 296, 680, 528
R = 62
d.add(f'<rect x="{IX0-R}" y="{IY0-R}" width="{IX1-IX0+2*R}" height="{IY1-IY0+2*R}" rx="10" '
      f'fill="{C_WARN_BG}" stroke="{C_WARN}" stroke-width="2.2" stroke-dasharray="9 6"/>')
d.add(f'<rect x="{IX0}" y="{IY0}" width="{IX1-IX0}" height="{IY1-IY0}" rx="8" '
      f'fill="{C_STOP_BG}" stroke="{C_STOP}" stroke-width="2.6"/>')
d.add(f'<circle cx="{(IX0+IX1)/2}" cy="{(IY0+IY1)/2}" r="64" fill="#E4E9EE" stroke="#A9B6C2" stroke-width="2"/>')
d.txt((IX0+IX1)/2, (IY0+IY1)/2 + 8, "버튼", 23, "#6B7A88", "bold", "middle")
d.txt(IX0-R+14, IY0-R+30, "바깥 링 — 다가온 단계", 21, C_WARN, "bold")
d.txt(IX0+14, IY0+30, "안쪽 상자 — 누를 자리", 21, C_STOP, "bold")

DY = IY1 + R + 34
d.add(f'<line x1="{IX0-R}" y1="{DY}" x2="{IX0}" y2="{DY}" stroke="{C_WARN}" stroke-width="2"/>')
for x in (IX0-R, IX0):
    d.add(f'<line x1="{x}" y1="{DY-9}" x2="{x}" y2="{DY+9}" stroke="{C_WARN}" stroke-width="2"/>')
d.txt((IX0-R+IX0)/2, DY + 30, "25 px", 21, C_WARN, "bold", "middle")
d.txt(IX0 + 14, DY + 30, "— 검출된 버튼 상자를 사방으로 이만큼 넓힌 띠", 20, C_SUB)

TR = [(150, 686), (318, 584), (450, 484)]
d.add(f'<path d="M{TR[0][0]},{TR[0][1]} L{TR[1][0]},{TR[1][1]} L{TR[2][0]},{TR[2][1]}" fill="none" '
      f'stroke="{C_DARK}" stroke-width="2.6" stroke-dasharray="10 7"/>')
for i, (x, y) in enumerate(TR):
    d.add(f'<circle cx="{x}" cy="{y}" r="17" fill="{C_DARK}"/>')
    d.txt(x, y + 8, str(i + 1), 21, "#fff", "bold", "middle")
d.txt(70, 736, "손끝(검지 끝)이 다가오는 길", 21, C_DARK, "bold")
d.txt(70, 764, "① 구역 밖   →   ② 링에 들어옴 · 여기서부터 시간을 잰다   →   ③ 상자에 들어옴 · 여기서만 경고", 20, C_SUB)

LY = 796
for i, (col, bg, s) in enumerate([
        (C_WARN, C_WARN_BG, "링 — 시간만 잰다. 경고는 나가지 않는다"),
        (C_STOP, C_STOP_BG, "상자 — 여기서 시간이 다 차야 경고가 나간다")]):
    y = LY + i * 40
    d.add(f'<rect x="70" y="{y}" width="28" height="28" rx="6" fill="{bg}" stroke="{col}" stroke-width="2"/>')
    d.txt(110, y + 22, s, 21, C_SUB)

# ══ 오른쪽 · 세 가지 경우 ═══════════════════════════
TX0, TX1, TMAX = 1080, 1848, 0.6
tx = lambda t: TX0 + t / TMAX * (TX1 - TX0)
d.sect(1080, 216, "검출이 끊겼을 때 — 이어서 세나, 버리나")

def bar(y, segs, h=56):
    for t0, t1, col, op in segs:
        d.add(f'<rect x="{tx(t0)}" y="{y}" width="{tx(t1)-tx(t0)}" height="{h}" '
              f'fill="{col}" fill-opacity="{op}"/>')
    d.add(f'<rect x="{TX0}" y="{y}" width="{TX1-TX0}" height="{h}" rx="6" fill="none" '
          f'stroke="{C_LINE}" stroke-width="1.4"/>')

def vline(t, y0, y1, col, lab, anchor="start", dash=None):
    dd = f' stroke-dasharray="{dash}"' if dash else ""
    d.add(f'<line x1="{tx(t)}" y1="{y0}" x2="{tx(t)}" y2="{y1}" stroke="{col}" stroke-width="3"{dd}/>')
    if lab:
        d.txt(tx(t) + (10 if anchor == "start" else -10), y0 - 8, lab, 20, col, "bold", anchor)

# ① 짧게 끊겼을 때 — 이어서 센다
d.txt(1080, 268, "① 짧게 끊겼을 때  (견딤 한계 0.3 초 안)", 24, C_DARK, "bold")
bar(286, [(0.00, 0.06, C_GRAY, 0.30), (0.06, 0.18, C_WARN, 0.55),
          (0.18, 0.26, C_GRAY, 0.55), (0.26, 0.36, C_WARN, 0.55),
          (0.36, 0.60, C_STOP, 0.75)])
vline(0.36, 286, 352, C_STOP, "머문 시간 0.3 초 → 경고")
d.txt(tx(0.22), 372, "끊김 0.08 초 — 견딤 한계 안이라 들어온 시각을 그대로 둔다", 19, C_SUB, "bold", "middle")

# ② 오래 끊겼을 때 — 버린다
d.txt(1080, 424, "② 오래 끊겼을 때  (견딤 한계 0.3 초 초과)", 24, C_DARK, "bold")
bar(442, [(0.00, 0.06, C_GRAY, 0.30), (0.06, 0.18, C_WARN, 0.55),
          (0.18, 0.53, C_GRAY, 0.55), (0.53, 0.60, C_WARN, 0.55)])
vline(0.48, 442, 508, "#6E7A86", "")
d.txt(tx(0.30), 528, "끊긴 지 0.3 초가 지나면 잰 시간을 버린다 — 다시 들어온 때가 새 시작", 19, C_SUB, "bold", "middle")

# ③ 견딤이 없다면 — 왜 견딤이 필요한가
d.txt(1080, 580, "③ 만약 견딤이 없다면  (비교)", 24, "#8C98A4", "bold")
bar(598, [(0.00, 0.06, C_GRAY, 0.30), (0.06, 0.18, C_WARN, 0.32),
          (0.18, 0.26, C_GRAY, 0.55), (0.26, 0.60, C_WARN, 0.32)])
vline(0.26, 598, 664, C_GRAY, "끊기는 즉시 버린다", "start")
vline(0.40, 590, 672, C_STOP, "", dash="8 6")
d.txt(tx(0.40) + 10, 586, "버튼이 눌리는 순간", 20, C_STOP, "bold")
d.txt(TX1, 692, "눌릴 때까지 0.3 초를 못 채운다 — 누르기 전에 경고를 내지 못한다", 19, "#6E7A86", "bold", "end")

AY = 730
d.add(f'<line x1="{TX0}" y1="{AY}" x2="{TX1}" y2="{AY}" stroke="{C_SUB}" stroke-width="1.6"/>')
for t in (0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6):
    d.add(f'<line x1="{tx(t)}" y1="{AY}" x2="{tx(t)}" y2="{AY+9}" stroke="{C_SUB}" stroke-width="1.6"/>')
    d.txt(tx(t), AY + 32, f"{t:g}", 19, C_SUB, "normal", "middle")
d.txt(TX1, AY + 60, "손끝이 구역에 들어온 뒤 흐른 시간 (초)", 19, C_SUB, "normal", "end")

for i, (col, op, s) in enumerate([(C_GRAY, 0.45, "구역 밖 · 검출 끊김"),
                                  (C_WARN, 0.55, "구역 안 — 시간을 잰다"),
                                  (C_STOP, 0.75, "경고")]):
    x = 1080 + i * 264
    d.add(f'<rect x="{x}" y="826" width="28" height="28" rx="6" fill="{col}" fill-opacity="{op}"/>')
    d.txt(x + 40, 848, s, 20, C_SUB)

# ══ 아래 ════════════════════════════════════════════
d.notes(70, 886, 1790, [
    "0.3 초가 두 번 나오지만 다른 값이다 — 경고 기준과 끊김 견딤 한계.",
    "누적 카운터가 아니라 「들어온 시각」 하나만 기억한다. 끊긴 동안에도 시계는 흐른다.",
    "누르는 그 순간 손이 버튼을 덮어 끊긴다. 견디지 않으면 눌리기 직전에 0 이 된다.",
])

out = sys.argv[1] if len(sys.argv) > 1 else "."
h = os.path.join(out, "S27_접촉체류.html"); d.save(h)
png = os.path.join(out, "S27_접촉체류.png"); render(h, W, H, png); os.remove(h)
print("생성:", png)
