# -*- coding: utf-8 -*-
"""32쪽 알고리즘 상세 설명서 ① 2단 구역 판정 — 왜 한 단으로는 안 되나.

근거 = Rpi5/Demo/fsm.py:147-150 · roi_zones.py:15 · 개발보고서 Ⅱ-3-5
    "체류는 링에서도 쌓이지만(예열), 발화는 박스 안에서만 한다"
    "링에서만 임계를 넘겨도 경고하지 않는다 — 접근은 위반이 아니다"
    "대신 누적을 유지해, 손이 박스 안으로 들어오는 순간 즉시 판정된다"
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from svgkit import *
from svg2png import render

d = Doc()

d.txt(70, 62, "왜 구역을 두 단으로 나눴나", 30, C_DARK, "bold")
d.txt(70, 96, "한 단으로는 둘 중 하나를 잃는다. 경고가 늦거나, 헛경고가 나거나.", 21, C_SUB)
d.box(70, 118, 1780, 46, C_TINT, C_LINE, 10, 1.2)
for x, k, v in [(92, "예열", "경고를 내기 전에 시간만 미리 재 두는 것"),
                (860, "헛경고", "위반이 아닌데 나가는 경고")]:
    d.txt(x, 148, k, 20, C_DARK, "bold")
    d.txt(x + ew(k, 20) + 22, 148, "= " + v, 20, C_TEXT)

d.sect(70, 216, "손이 버튼으로 다가오는 길을 한 줄로 펴서 본다")

AX0, AX1 = 360, 1620
Z = [(360, 840, "구역 밖", C_GRAY_BG, "#8C98A4"),
     (840, 1180, "링  (25 px)", C_WARN_BG, C_WARN),
     (1180, 1620, "상자  = 버튼 자리", C_STOP_BG, C_STOP)]
for x0, x1, name, bg, col in Z:
    d.txt((x0 + x1) / 2, 256, name, 20, col, "bold", "middle")
d.txt(AX1 + 16, 256, "버튼에 가까워진다 →", 19, C_SUB)

ROWS = [
    ("상자에서만 잰다", "좁게 잡으면", 1180, 1180, "늦는다", C_STOP,
     "상자에 들어와서야 재기 시작한다."),
    ("링까지 한 구역으로", "넓게 잡으면", 840, 840, "헛경고", C_WARN,
     "다가오기만 해도 경고가 나간다."),
    ("두 단으로 나눈다", "지금 방식", 840, 1180, "제때", C_OK,
     "링부터 재고, 경고는 상자에서만."),
]
for i, (title, kind, t_start, w_start, res, rcol, why) in enumerate(ROWS):
    y = 300 + i * 186
    d.txt(70, y + 34, title, 25, C_DARK, "bold")
    d.txt(70, y + 64, kind, 19, C_SUB)

    for x0, x1, name, bg, col in Z:
        d.add(f'<rect x="{x0}" y="{y}" width="{x1-x0}" height="66" fill="{bg}"/>')
    d.add(f'<rect x="{AX0}" y="{y}" width="{AX1-AX0}" height="66" rx="6" fill="none" '
          f'stroke="{C_LINE}" stroke-width="1.4"/>')
    for x0, x1, *_ in Z[1:]:
        d.add(f'<line x1="{x0}" y1="{y}" x2="{x0}" y2="{y+66}" stroke="#C8D0D8" stroke-width="1.4"/>')

    # 시간 재기 시작
    d.add(f'<line x1="{t_start}" y1="{y-14}" x2="{t_start}" y2="{y+66}" stroke="{C_MID}" stroke-width="3"/>')
    d.add(f'<path d="M{t_start},{y-14} l14,7 l-14,7 Z" fill="{C_MID}"/>')
    d.txt(t_start + 20, y - 16, "시간 재기 시작", 19, C_MID, "bold")

    # 경고가 나갈 수 있는 구간
    d.add(f'<rect x="{w_start}" y="{y+76}" width="{AX1-w_start}" height="16" rx="8" fill="{C_STOP}" fill-opacity="0.75"/>')
    d.txt(w_start + 12, y + 112, "경고가 나갈 수 있는 구간", 19, C_STOP, "bold")

    d.box(1660, y + 8, 190, 50, "#fff", rcol, 25, 2)
    d.txt(1755, y + 41, res, 23, rcol, "bold", "middle")
    for j, ln in enumerate(wrap(why, 19, 280)):
        d.txt(70, y + 100 + j * 24, ln, 19, C_SUB)

d.notes(70, 880, 1790, [
    "좁게 잡으면 누를 때까지 0.3 초를 못 채운다 — 경고가 눌린 뒤에 나간다.",
    "링에서 시간이 다 차도 경고하지 않는다 — 다가오는 것은 위반이 아니다.",
    "대신 잰 시간은 이어진다. 손이 상자에 드는 순간 곧바로 판정된다.",
])

out = sys.argv[1] if len(sys.argv) > 1 else "."
h = os.path.join(out, "S32_2단구역.html"); d.save(h)
png = os.path.join(out, "S32_2단구역.png"); render(h, W, H, png); os.remove(h)
print("생성:", png)
