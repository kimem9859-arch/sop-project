# -*- coding: utf-8 -*-
"""알고리즘 명세서 슬라이드 SVG — 왼쪽 처리 순서 / 오른쪽 입출력 · 파라미터 · 유의."""
W, H = 1920, 1080
SANS = "NanumGothic, 'Noto Sans KR', 'Malgun Gothic', sans-serif"
C_DARK, C_MID, C_TEXT, C_SUB = "#1F4E79", "#2E6FBA", "#1F2A36", "#6B7A88"
LX, LW, RX, RW = 56, 1080, 1180, 684


def ew(s, fs):
    w = 0.0
    for ch in s:
        o = ord(ch)
        w += 1.0 if (0xAC00 <= o <= 0xD7A3 or 0x3130 <= o <= 0x318F or
                     0x2E80 <= o <= 0xA4CF or 0xFF00 <= o <= 0xFF60) else 0.55
    return w * fs


def wrap(s, fs, limit):
    out, cur = [], ""
    for word in s.split(" "):
        t = (cur + " " + word).strip()
        if cur and ew(t, fs) > limit:
            out.append(cur); cur = word
        else:
            cur = t
    if cur:
        out.append(cur)
    return out


def build(steps, io_pairs, params, notes, out_html):
    """steps [(제목, 설명)] · io_pairs [(라벨, 내용)] · params [(이름, 값)] · notes [문장]"""
    o = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">',
         f'<rect width="{W}" height="{H}" fill="#fff"/>',
         '<defs><marker id="dn" markerWidth="10" markerHeight="8" refX="5" refY="8" orient="auto">'
         f'<path d="M0,0 L10,0 L5,8 Z" fill="#9AA9B6"/></marker></defs>']

    def txt(x, y, s, fs=22, fill=C_TEXT, w="normal", a="start"):
        o.append(f'<text x="{x}" y="{y}" font-family="{SANS}" font-size="{fs}" fill="{fill}" '
                 f'font-weight="{w}" text-anchor="{a}">{s}</text>')

    def sect(x, y, s):
        o.append(f'<rect x="{x}" y="{y - 20}" width="6" height="28" rx="3" fill="{C_DARK}"/>')
        txt(x + 20, y + 2, s, 27, C_DARK, "bold")

    # ── 왼쪽 · 처리 순서 ──────────────────────────
    sect(LX, 66, "처리 순서")
    n = len(steps)
    top, bot = 104, 1016
    gap = 22
    bh = (bot - top - gap * (n - 1)) / n
    for i, (title, desc) in enumerate(steps):
        y = top + i * (bh + gap)
        o.append(f'<rect x="{LX}" y="{y}" width="{LW}" height="{bh}" rx="14" fill="#F3F8FD" '
                 f'stroke="{C_MID}" stroke-opacity="0.45" stroke-width="1.5"/>')
        o.append(f'<circle cx="{LX + 46}" cy="{y + bh / 2}" r="25" fill="{C_DARK}"/>')
        txt(LX + 46, y + bh / 2 + 9, str(i + 1), 25, "#fff", "bold", "middle")
        lines = wrap(desc, 21, LW - 140)
        ty = y + bh / 2 - (13 if len(lines) == 1 else 24)
        txt(LX + 90, ty, title, 26, C_DARK, "bold")
        for ln in lines:
            ty += 30
            txt(LX + 90, ty, ln, 21, C_SUB)
        if i < n - 1:
            cx = LX + LW / 2
            o.append(f'<line x1="{cx}" y1="{y + bh + 2}" x2="{cx}" y2="{y + bh + gap - 4}" '
                     f'stroke="#9AA9B6" stroke-width="2" marker-end="url(#dn)"/>')

    # ── 오른쪽 ──────────────────────────────────
    y = 66
    sect(RX, y, "입력 · 출력")
    y += 24
    for lab, val in io_pairs:
        o.append(f'<rect x="{RX}" y="{y}" width="{RW}" height="66" rx="12" fill="#EAF2FA" '
                 f'stroke="{C_MID}" stroke-width="1.5"/>')
        txt(RX + 22, y + 41, lab, 22, C_DARK, "bold")
        txt(RX + 128, y + 41, val, 21, C_TEXT)
        y += 78

    y += 34
    sect(RX, y, "파라미터")
    y += 26
    for i, (k, v) in enumerate(params):
        o.append(f'<rect x="{RX}" y="{y}" width="{RW}" height="52" '
                 f'fill="{"#FFFFFF" if i % 2 else "#F3F8FD"}"/>')
        txt(RX + 20, y + 34, k, 21, C_TEXT)
        txt(RX + RW - 20, y + 34, v, 21, C_DARK, "bold", "end")
        o.append(f'<line x1="{RX}" y1="{y + 52}" x2="{RX + RW}" y2="{y + 52}" '
                 f'stroke="#CBDCEF" stroke-width="1"/>')
        y += 52

    y += 44
    sect(RX, y, "유의")
    y += 22
    for s in notes:
        for j, ln in enumerate(wrap(s, 20, RW - 34)):
            y += 30
            txt(RX + (17 if j else 0), y, ln if j else "• " + ln, 20, C_SUB)
        y += 10

    o.append('</svg>')
    open(out_html, "w", encoding="utf-8").write(
        "<!doctype html><meta charset='utf-8'>"
        "<style>html,body{margin:0;padding:0;background:#fff}svg{display:block}</style>" + "\n".join(o))
