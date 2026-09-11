# -*- coding: utf-8 -*-
"""41쪽 프로그램 목록 ② 판정 · 제어 — fsm.py 를 가운데 두고 무엇이 드나드나.

근거 = Rpi5/Demo/ 실제 파일 · import 관계 (fsm.py ← config · roi_zones)
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from svgkit import *
from svg2png import render

MONO = "'DejaVu Sans Mono', Consolas, monospace"
d = Doc()

d.txt(70, 62, "판정과 제어는 어느 파일이 맡나", 30, C_DARK, "bold")
d.txt(70, 96, "가운데 fsm.py 가 판정한다. 무엇이 들어가고 무엇이 나오는지로 늘어놓았다.", 21, C_SUB)
d.box(70, 118, 1780, 46, C_TINT, C_LINE, 10, 1.2)
for x, k, v in [(92, "판정부", "지금 눌린 것이 옳은 차례인지 가르는 곳"),
                (860, "제어부", "판정 결과를 제어 보드로 내보내는 곳")]:
    d.txt(x, 148, k, 20, C_DARK, "bold")
    d.txt(x + ew(k, 20) + 22, 148, "= " + v, 20, C_TEXT)


def card(x, y, w, name, lines, desc, col=C_MID, bg="#fff", fs=20):
    ls = wrap(desc, 18, w - 36)
    h = 56 + 24 * len(ls)
    d.box(x, y, w, h, bg, col, 12, 1.8)
    d.add(f'<text x="{x+18}" y="{y+33}" font-family="{MONO}" font-size="{fs}" fill="{col}" '
          f'font-weight="bold">{name}</text>')
    d.txt(x + w - 18, y + 33, f"{lines} 줄", 17, C_SUB, "normal", "end")
    for i, ln in enumerate(ls):
        d.txt(x + 18, y + 58 + i * 24, ln, 18, C_SUB)
    return h


def lab(x, y, t, col=C_SUB):
    d.txt(x, y, t, 20, col, "bold")


# ══ 위 — 무엇을 근거로 판정하나 ═════════════════════
d.sect(70, 212, "판정의 근거가 되는 것")
card(560, 240, 400, "recipe.py", 108, "정답 순서를 파일에서 읽는다", C_OK, C_OK_BG)
card(1000, 240, 400, "roi_zones.py", 56, "손끝이 링인지 상자인지 가른다", C_OK, C_OK_BG)
for x in (760, 1200):
    d.add(f'<line x1="{x}" y1="322" x2="{x}" y2="374" stroke="{C_OK}" stroke-width="2.4" '
          f'marker-end="url(#ar)"/>')

# ══ 가운데 — 판정 ═══════════════════════════════════
d.box(560, 378, 840, 150, C_STOP_BG, C_STOP, 16, 3)
d.add(f'<text x="590" y="424" font-family="{MONO}" font-size="27" fill="{C_STOP}" '
      f'font-weight="bold">fsm.py</text>')
d.txt(1370, 424, "290 줄", 19, C_SUB, "normal", "end")
d.txt(590, 458, "여섯 상태로 순서 위반을 판정한다", 21, C_TEXT)
d.txt(590, 492, "기대 단계와 대조 · 체류 시간 확인 · 경고와 차단 결정", 19, C_SUB)

# 왼쪽 — 들어오는 것
d.sect(70, 356, "들어오는 것")
card(70, 384, 400, "gpio_input.py", 108, "버튼 B1~B4 와 비상정지의 눌림을 받는다")
d.add(f'<line x1="474" y1="424" x2="554" y2="424" stroke="{C_MID}" stroke-width="2.4" '
      f'marker-end="url(#ar)"/>')

# 오른쪽 — 판정을 돕는 것
d.sect(1490, 356, "판정을 돕는 것")
card(1490, 384, 360, "sub_task.py", 141, "대기 시간과 공구 조건을 확인한다")
card(1490, 486, 360, "tool_state.py", 142, "공구를 쥐었는지 판정한다")
for y in (424, 526):
    d.add(f'<line x1="1486" y1="{y}" x2="1406" y2="{y}" stroke="{C_MID}" stroke-width="2.4" '
          f'marker-end="url(#ar)"/>')

# ══ 아래 — 내보내는 것 ══════════════════════════════
d.add(f'<line x1="980" y1="532" x2="980" y2="588" stroke="{C_STOP}" stroke-width="3" '
      f'marker-end="url(#ar)"/>')
d.sect(70, 596, "내보내는 것")
OUT = [(70, "interlock.py", 303, "RUN · WARN · BLOCK 을 보내고 회신을 확인한다"),
       (630, "serial_ports.py", 59, "USB 신원으로 제어 보드를 찾는다"),
       (1190, "console_interlock.ino", 139, "아두이노 펌웨어 — 릴레이 5 채널과 타워램프를 구동한다")]
for i, (x, n, l, s) in enumerate(OUT):
    col, bg = (C_STOP, C_STOP_BG) if i == 0 else (C_MID, "#fff")
    if i == 2:
        col, bg = C_WARN, C_WARN_BG
    card(x, 624, 520, n, l, s, col, bg, fs=19)
    if i < 2:
        d.add(f'<line x1="{x+524}" y1="656" x2="{x+556}" y2="656" stroke="{C_MID}" '
              f'stroke-width="2.4" marker-end="url(#ar)"/>')

# ══ 곁 ══════════════════════════════════════════════
card(70, 740, 860, "precheck.py", 137,
     "카메라 · 인터락 · 버튼 입력이 살아 있는지 기동할 때와 작업 시작 전에 확인한다",
     "#8C98A4", "#F1F3F5")

d.notes(70, 850, 1790, [
    "fsm.py 는 화면도 장치도 모른다. 사실만 받아 판정하고 결과만 돌려준다 — 그래서 시험하기 쉽다.",
    "판정과 제어를 나눠 두어, 인터락이 없어도 판정은 그대로 돈다.",
])

out = sys.argv[1] if len(sys.argv) > 1 else "."
h = os.path.join(out, "S41_프로그램판정.html"); d.save(h)
png = os.path.join(out, "S41_프로그램판정.png"); render(h, W, H, png); os.remove(h)
print("생성:", png)
