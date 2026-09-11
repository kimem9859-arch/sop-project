# -*- coding: utf-8 -*-
import io
from svgkit import Doc, ew, C_DARK, C_SUB, C_TEXT, C_TINT, C_LINE


def header(title, sub, terms):
    """도입 한 문장 + 용어 띠를 SVG 조각으로 돌려준다 (seqdraw 위에 덧그린다)."""
    h = Doc()
    h.txt(70, 62, title, 30, C_DARK, "bold")
    h.txt(70, 96, sub, 21, C_SUB)
    h.box(70, 118, 1780, 46, C_TINT, C_LINE, 10, 1.2)
    for x, k, v in terms:
        h.txt(x, 148, k, 20, C_DARK, "bold")
        h.txt(x + ew(k, 20) + 12, 148, "= " + v, 20, C_TEXT)
    return "\n".join(h.o[3:])          # <svg>·배경·defs 를 뺀 알맹이만


def inject(html_path, frag):
    t = io.open(html_path, encoding="utf-8").read()
    io.open(html_path, "w", encoding="utf-8").write(t.replace("</svg>", frag + "\n</svg>"))
