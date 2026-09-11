# -*- coding: utf-8 -*-
"""60쪽 성능 검증 — 값과 조건을 떼어놓을 수 없게.

근거 = 개발보고서 Ⅱ-3 각 절의 실측 수치 (조건 표기 그대로)
    mAP50 0.992 · 재현율 0.993   모조 콘솔 · 클린룸 형광등 · 시험셋 113장   Ⅱ-3-2)
    개입 감지 92% (24/26)         링 25px · 체류 0.3초                      Ⅱ-3-5)
    공구 오검출 0.2% (962 중 2)    콘솔이 화면 대부분을 차지하는 정비 구도    Ⅱ-3-4)
    추론 1회 약 11ms · 23.96fps    NPU INT8 · 손 없는 정지 장면              Ⅱ-3-8)
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from svgkit import *
from svg2png import render

d = Doc()

d.txt(70, 62, "성능은 조건과 함께 읽어야 한다", 30, C_DARK, "bold")
d.txt(70, 96, "같은 지표라도 구도와 조명이 달라지면 값이 달라진다. 그래서 값 아래에 잰 조건을 붙였다.", 21, C_SUB)
d.box(70, 118, 1780, 46, C_TINT, C_LINE, 10, 1.2)
for x, k, v in [(92, "mAP50", "찾아낸 상자가 정답과 얼마나 겹치는지 (0~1)"),
                (760, "재현율", "있는 것 가운데 몇 개를 찾아냈나"),
                (1240, "개입 감지", "누르기 전에 손을 잡아낸 비율")]:
    d.txt(x, 148, k, 20, C_DARK, "bold")
    d.txt(x + ew(k, 20) + 22, 148, "= " + v, 20, C_TEXT)


def metric(x, y, w, h, name, big, sub, cond, col, bg):
    d.box(x, y, w, h, "#fff", col, 16, 2.4)
    d.txt(x + 26, y + 44, name, 22, C_SUB, "bold")
    d.txt(x + 26, y + 112, big, 54, col, "bold")
    if sub:
        d.txt(x + 26, y + 152, sub, 21, C_SUB)
    ch = 30 + 26 * len(wrap(cond, 19, w - 76))
    d.box(x + 20, y + h - ch - 20, w - 40, ch, bg, col, 10, 1.6)
    d.txt(x + 40, y + h - ch + 2, "잰 조건", 17, col, "bold")
    for i, ln in enumerate(wrap(cond, 19, w - 76)):
        d.txt(x + 40, y + h - ch + 28 + i * 26, ln, 19, C_TEXT)


d.sect(70, 212, "얼마나 잘 잡나")
metric(70, 240, 573, 300, "버튼 검출", "0.992", "mAP50   ·   재현율 0.993",
       "모조 콘솔 · 클린룸 형광등 · 시험셋 113 장", C_MID, "#EAF2FA")
metric(673, 240, 573, 300, "개입 감지", "92 %", "26 번 가운데 24 번",
       "사각 도넛 링 25px · 체류 0.3 초", C_OK, C_OK_BG)
metric(1276, 240, 574, 300, "공구 오검출", "0.2 %", "962 프레임 가운데 2 건",
       "콘솔이 화면 대부분을 차지하는 정비 구도", C_WARN, C_WARN_BG)

# ══ 속도 ════════════════════════════════════════════
d.sect(70, 596, "얼마나 빠른가")
metric(70, 624, 573, 260, "추론 1 회", "약 11 ms", "",
       "NPU · INT8 양자화", C_MID, "#EAF2FA")

d.box(673, 624, 1177, 260, "#fff", C_MID, 16, 2.4)
d.txt(699, 668, "처리 속도", 22, C_SUB, "bold")
BX0, BX1, MAXF = 720, 1780, 30
bx = lambda f: BX0 + f / MAXF * (BX1 - BX0)
BY_, BH_ = 712, 54
d.add(f'<rect x="{BX0}" y="{BY_}" width="{BX1-BX0}" height="{BH_}" rx="8" fill="{C_GRAY_BG}"/>')
d.add(f'<rect x="{BX0}" y="{BY_}" width="{bx(23.96)-BX0}" height="{BH_}" rx="8" fill="{C_OK}" fill-opacity="0.8"/>')
d.add(f'<line x1="{bx(15)}" y1="{BY_-16}" x2="{bx(15)}" y2="{BY_+BH_+16}" stroke="{C_STOP}" stroke-width="3"/>')
d.txt(bx(15) + 12, BY_ - 22, "목표 15 fps", 20, C_STOP, "bold")
d.txt(bx(23.96) - 18, BY_ + 36, "23.96 fps", 26, "#fff", "bold", "end")
for f in (0, 10, 20, 30):
    d.txt(bx(f), BY_ + BH_ + 32, str(f), 18, C_SUB, "normal", "middle")
d.box(699, 812, 1125, 52, C_STOP_BG, C_STOP, 10, 1.6)
d.txt(719, 834, "잰 조건", 17, C_STOP, "bold")
d.txt(719, 856, "손 없는 정지 장면 · 인식을 모두 켠 상태", 19, C_TEXT)

d.notes(70, 906, 1790, [
    "값만 옮기면 안 된다 — 구도와 조명이 달라지면 같은 지표도 달라진다.",
    "23.96 fps 는 손 없는 정지 장면에서 잰 값이다. 손이 들어오면 달라진다.",
])

out = sys.argv[1] if len(sys.argv) > 1 else "."
h = os.path.join(out, "S60_성능검증.html"); d.save(h)
png = os.path.join(out, "S60_성능검증.png"); render(h, W, H, png); os.remove(h)
print("생성:", png)
