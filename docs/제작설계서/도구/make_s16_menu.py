# -*- coding: utf-8 -*-
"""16쪽 메뉴 구성도 — 화면 우상단 ☰ 하나에서 갈라지는 트리.

근거 = Rpi5/Demo/overlay_menu.py
    메뉴 7 항목 (overlay_menu.py:189-195) · 시스템 종료는 아래 따로
    설정 패널 4 항목 (SettingsPanel) · 점검 패널 (CheckPanel) · 녹화 패널 (RecordPanel)
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from svgkit import *
from svg2png import render

d = Doc()

d.txt(70, 62, "메뉴는 어떻게 갈라지나", 30, C_DARK, "bold")
d.txt(70, 96, "화면 우상단 단추 하나에서 일곱 갈래로 나뉜다. 시스템 종료만 아래에 따로 둔다.", 21, C_SUB)
d.box(70, 118, 1780, 46, C_TINT, C_LINE, 10, 1.2)
for x, k, v in [(92, "패널", "메뉴 항목을 누르면 화면 위에 열리는 창"),
                (900, "작업 초기화", "지금 작업을 버리고 1 단계부터 다시 시작")]:
    d.txt(x, 148, k, 20, C_DARK, "bold")
    d.txt(x + ew(k, 20) + 22, 148, "= " + v, 20, C_TEXT)

# ── 1단 : 메뉴 열기 ─────────────────────────────────
d.box(70, 380, 250, 110, C_TINT, C_DARK, 14, 2.4)
d.txt(195, 424, "☰", 34, C_DARK, "bold", "middle")
d.txt(195, 460, "화면 우상단", 19, C_SUB, "normal", "middle")

# ── 2단 : 메뉴 7 항목 ───────────────────────────────
MENU = [
 ("점검 (연결)", C_MID, ["카메라 연결", "검출 모델", "손 검출 모델", "인터락 연결", "GPIO 입력", "다시 점검"]),
 ("녹화",        C_MID, ["녹화 시작", "녹화 중지"]),
 ("로그",        C_MID, ["일어난 일을 시간순으로 — 알림과 달리 전부 담는다"]),
 ("캘리브레이션", C_MID, ["카메라 왜곡 보정값 잡기"]),
 ("CCTV 전환",   C_MID, ["보는 화면을 바꾼다"]),
 ("설정",        C_OK,  ["지정 공구", "화면 테마", "공정 단계 패널 배경", "탐지 박스 표시"]),
 ("작업 초기화",  C_WARN, ["1 단계부터 다시"]),
]
MX, MW, MH, GAP = 420, 330, 74, 14
TOP = 230
for i, (name, col, subs) in enumerate(MENU):
    y = TOP + i * (MH + GAP)
    d.box(MX, y, MW, MH, "#fff", col, 12, 2)
    d.txt(MX + 24, y + 46, name, 24, col, "bold")
    # 1단 → 2단 연결
    d.add(f'<path d="M320,435 L370,435 L370,{y+MH/2} L{MX-4},{y+MH/2}" fill="none" '
          f'stroke="{C_DARK}" stroke-width="2" marker-end="url(#ar)"/>')
    # 2단 → 3단
    SX = MX + MW + 60
    d.add(f'<line x1="{MX+MW+4}" y1="{y+MH/2}" x2="{SX-6}" y2="{y+MH/2}" stroke="{col}" '
          f'stroke-width="2" marker-end="url(#ar)"/>')
    if len(subs) == 1 and len(subs[0]) > 12:
        d.txt(SX, y + MH / 2 + 7, subs[0], 20, C_SUB)
    else:
        x = SX
        for s in subs:
            w = ew(s, 19) + 40
            d.box(x, y + MH / 2 - 21, w, 42, "#F7F9FB", col, 21, 1.4)
            d.txt(x + w / 2, y + MH / 2 + 7, s, 19, C_TEXT, "normal", "middle")
            x += w + 12

# ── 아래 : 시스템 종료 ──────────────────────────────
BY = TOP + 7 * (MH + GAP) + 16
d.add(f'<line x1="{MX}" y1="{BY-8}" x2="1850" y2="{BY-8}" stroke="{C_LINE}" '
      f'stroke-width="1.4" stroke-dasharray="7 6"/>')
d.box(MX, BY + 4, MW, MH, C_STOP_BG, C_STOP, 12, 2)
d.txt(MX + 24, BY + 50, "시스템 종료", 24, C_STOP, "bold")
d.add(f'<path d="M320,435 L370,435 L370,{BY+4+MH/2} L{MX-4},{BY+4+MH/2}" fill="none" '
      f'stroke="{C_DARK}" stroke-width="2" marker-end="url(#ar)"/>')
d.add('<defs><marker id="as" markerWidth="11" markerHeight="9" refX="10" refY="4.5" orient="auto">'
      f'<path d="M0,0 L11,4.5 L0,9 Z" fill="{C_STOP}"/></marker></defs>')
d.txt(MX + MW + 60, BY + 4 + MH / 2 + 7,
      "누르면 확인창이 먼저 뜬다 — 실수로 눌러도 바로 꺼지지 않는다", 20, C_STOP, "bold")

d.notes(70, 940, 1790, [
    "「탐지 박스 표시」를 꺼도 순서 위반 감지는 그대로 돈다 — 화면 표시만 끄는 것이다.",
    "로그는 일어난 일을 전부 담고, 알림은 알려야 할 것만 골라 띄운다.",
])

out = sys.argv[1] if len(sys.argv) > 1 else "."
h = os.path.join(out, "S16_메뉴구성도.html"); d.save(h)
png = os.path.join(out, "S16_메뉴구성도.png"); render(h, W, H, png); os.remove(h)
print("생성:", png)
