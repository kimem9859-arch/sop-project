# -*- coding: utf-8 -*-
"""39쪽 엔티티 관계도(ERD) — 두 데이터베이스, 세션이 중심.

근거 = Rpi5/Demo/test/hoi.db · bench.db 실제 스키마 (sqlite_master · pragma table_info)
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from svgkit import *
from svg2png import render

MONO = "'DejaVu Sans Mono', Consolas, monospace"
d = Doc()

d.txt(70, 62, "잰 것을 어디에 쌓아 두나", 30, C_DARK, "bold")
d.txt(70, 96, "촬영 한 번이 세션 하나다. 모든 기록은 그 세션에 매달린다.", 21, C_SUB)
d.box(70, 118, 1780, 46, C_TINT, C_LINE, 10, 1.2)
for x, k, v in [(92, "세션", "촬영 한 번 — 날짜 · 구도 · 모델이 한 묶음"),
                (760, "PK", "그 표에서 행 하나를 가리키는 열"),
                (1200, "FK", "다른 표의 PK 를 가리키는 열"),
                (1600, "1 : N", "한 세션에 여러 행")]:
    d.txt(x, 148, k, 20, C_DARK, "bold")
    d.txt(x + ew(k, 20) + 22, 148, "= " + v, 20, C_TEXT)


def ent(x, y, w, name, rows, cols, hub=False):
    col, bg = (C_STOP, C_STOP_BG) if hub else (C_MID, "#EAF2FA")
    h = 40 + len(cols) * 25 + 14
    d.box(x, y, w, h, "#fff", col, 12, 2 if hub else 1.8)
    d.add(f'<rect x="{x}" y="{y}" width="{w}" height="40" rx="12" fill="{bg}"/>')
    d.add(f'<rect x="{x}" y="{y+26}" width="{w}" height="14" fill="{bg}"/>')
    d.add(f'<text x="{x+14}" y="{y+28}" font-family="{MONO}" font-size="20" fill="{col}" '
          f'font-weight="bold">{name}</text>')
    d.txt(x + w - 14, y + 28, rows, 17, C_SUB, "normal", "end")
    yy = y + 64
    for c in cols:
        tag, rest = ("", c)
        if c.startswith("PK "): tag, rest = "PK", c[3:]
        elif c.startswith("FK "): tag, rest = "FK", c[3:]
        if tag:
            d.txt(x + 14, yy, tag, 15, C_STOP if tag == "PK" else C_MID, "bold")
        d.add(f'<text x="{x+48}" y="{yy}" font-family="{MONO}" font-size="17" '
              f'fill="{C_TEXT}">{rest}</text>')
        yy += 25
    return h


def hub_bus(hx, hy, hw, hh, kids, bus_y, kid_y):
    """세션 상자 아래에서 가로 버스로 갈라져 각 자식 위로 내려간다."""
    cx = hx + hw / 2
    d.add(f'<line x1="{cx}" y1="{hy+hh}" x2="{cx}" y2="{bus_y}" stroke="{C_STOP}" stroke-width="2.4"/>')
    xs = [k[0] + k[1] / 2 for k in kids]
    d.add(f'<line x1="{min(xs)}" y1="{bus_y}" x2="{max(xs)}" y2="{bus_y}" stroke="{C_STOP}" stroke-width="2.4"/>')
    for x in xs:
        d.add(f'<line x1="{x}" y1="{bus_y}" x2="{x}" y2="{kid_y-4}" stroke="{C_STOP}" '
              f'stroke-width="2.4" marker-end="url(#ar)"/>')
    d.txt(cx + 16, bus_y - 10, "1 : N", 18, C_STOP, "bold")


# ══ 판정 데이터베이스 ═══════════════════════════════
d.sect(70, 212, "판정 데이터베이스   hoi.db   —   무엇이 언제 눌렸나")
HX, HW = 780, 380
hh = ent(HX, 234, HW, "sessions", "22 행",
         ["PK id", "date · time", "condition · posture", "fps · frames"], hub=True)
K1 = [(300, 340, "presses", "503 행", ["FK session_id", "frame · button", "is_violation"]),
      (810, 340, "palm_frames", "20,754 행", ["FK session_id", "tip_x · tip_y", "zone_level"]),
      (1320, 340, "button_boxes", "39,940 행", ["FK session_id", "cls_name", "x1 y1 x2 y2"])]
hub_bus(HX, 234, HW, hh, [(k[0], k[1]) for k in K1], 402, 430)
for x, w, n, r, c in K1:
    ent(x, 430, w, n, r, c)

# ══ 성능 데이터베이스 ═══════════════════════════════
d.sect(70, 604, "성능 데이터베이스   bench.db   —   얼마나 잘 잡았나")
hh2 = ent(HX, 626, HW, "sessions", "33 행",
          ["PK id", "source · condition", "model · hef_path", "conf_high · conf_low"], hub=True)
K2 = [(70, 340, "detections", "77,073 행", ["FK session_id", "cls_name · score", "x1 y1 x2 y2"]),
      (450, 340, "rawdet", "52,187 행", ["FK session_id", "cls_name · score", "x1 y1 x2 y2"]),
      (830, 340, "perf", "15,906 행", ["FK session_id", "fps · inference_ms", "detection_count"]),
      (1210, 340, "stability", "4,769 행", ["FK session_id", "track_id", "duration · miss_count"]),
      (1590, 260, "replay_runs", "5 행", ["PK id", "FK session_id", "hef · degrade"])]
hub_bus(HX, 626, HW, hh2, [(k[0], k[1]) for k in K2], 794, 822)
for x, w, n, r, c in K2:
    ent(x, 822, w, n, r, c)
d.add(f'<line x1="1720" y1="{951}" x2="1720" y2="{975}" stroke="{C_STOP}" stroke-width="2.4" '
      f'marker-end="url(#ar)"/>')
d.box(1590, 975, 260, 44, "#EAF2FA", C_MID, 10, 1.6)
d.add(f'<text x="1604" y="1003" font-family="{MONO}" font-size="18" fill="{C_MID}" '
      f'font-weight="bold">replay_dets</text>')
d.txt(1836, 1003, "6,440 행", 16, C_SUB, "normal", "end")

d.notes(70, 950, 1480, [
    "두 데이터베이스 모두 sessions 가 중심이고, 나머지는 session_id 로 매달린다.",
    "판정 DB 는 눌림 한 번이 한 행, 성능 DB 는 프레임 한 장이 한 행이다.",
])

out = sys.argv[1] if len(sys.argv) > 1 else "."
h = os.path.join(out, "S39_ERD.html"); d.save(h)
png = os.path.join(out, "S39_ERD.png"); render(h, W, H, png); os.remove(h)
print("생성:", png)
