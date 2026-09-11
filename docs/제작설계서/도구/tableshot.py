# -*- coding: utf-8 -*-
"""제작설계서 표 이미지 생성 — 파랑·하양 테마, 16:9.

머리행 진파랑 + 본문 흰/연파랑 줄무늬. 글자 크기는 내용에 맞춰 자동으로 정한다.
셀 안 긴 글은 자동으로 접힌다(한글 폭 계산 포함).
"""
import html

W, H = 1920, 1080
PAD_X, PAD_Y = 60, 60
SANS = "NanumGothic, 'Noto Sans KR', 'Malgun Gothic', sans-serif"
K_ADV = 0.98          # em 폭 → px 환산 보정 (한글 비율 폰트 실측)

C_HDR_BG   = "#1F4E79"
C_HDR_TX   = "#FFFFFF"
C_ROW_A    = "#FFFFFF"
C_ROW_B    = "#F3F8FD"
C_LINE     = "#CBDCEF"
C_TEXT     = "#1F2A36"
C_FIRST    = "#1F4E79"
C_CAPTION  = "#2E6FBA"
C_HL_BG    = "#E4EFFB"   # 강조 열 배경
C_HL_TX    = "#123A63"   # 강조 열 글자


def ewidth(s):
    """em 단위 표시 폭 — 한글·전각 1.0, 그 외 0.55."""
    w = 0.0
    for ch in s:
        o = ord(ch)
        w += 1.0 if (0x1100 <= o <= 0x115F or 0x2E80 <= o <= 0xA4CF or
                     0xAC00 <= o <= 0xD7A3 or 0xF900 <= o <= 0xFAFF or
                     0xFF00 <= o <= 0xFF60) else 0.55
    return w


def _wrap(text, limit_em):
    """공백 우선으로 접는다. 한 낱말이 한도를 넘으면 글자 단위로 자른다."""
    out, cur, cw = [], "", 0.0
    for word in text.split(" "):
        ww = ewidth(word)
        if cur and cw + ewidth(" ") + ww > limit_em:
            out.append(cur); cur, cw = "", 0.0
        if ww > limit_em:
            if cur:
                out.append(cur); cur, cw = "", 0.0
            buf, bw = "", 0.0
            for ch in word:
                c = ewidth(ch)
                if bw + c > limit_em:
                    out.append(buf); buf, bw = "", 0.0
                buf += ch; bw += c
            cur, cw = buf, bw
        else:
            if cur:
                cur += " "; cw += ewidth(" ")
            cur += word; cw += ww
    if cur:
        out.append(cur)
    return out or [""]


def build(header, rows, out_html, ratios=None, caption=None,
          bold_first=True, align=None, hilite_col=None,
          canvas=None, fs_max=30):
    """canvas=(W,H) 로 캔버스 크기를 바꾼다. 세로로 긴 표는 (820, 1080) 처럼 준다."""
    global W, H, PAD_X, PAD_Y
    _wh = (W, H, PAD_X, PAD_Y)
    if canvas:
        W, H = canvas
        PAD_X = max(18, int(W * 0.035))
        PAD_Y = max(18, int(H * 0.030))
    """header: [str] · rows: [[str]] · ratios: 열 폭 비율 · align: ['l'|'c'|'r']"""
    esc = html.escape
    ncol = len(header)
    if ratios is None:
        base = []
        for c in range(ncol):
            m = max([ewidth(header[c])] + [ewidth(r[c]) for r in rows])
            base.append(min(m, 46.0))
        tot = sum(base)
        ratios = [b / tot for b in base]
    if align is None:
        align = ["l"] * ncol
    tot_r = sum(ratios)
    ratios = [r / tot_r for r in ratios]

    avail_w = W - 2 * PAD_X
    cap_h = 46 if caption else 0
    avail_h = H - 2 * PAD_Y - cap_h

    chosen = None
    for fs in range(fs_max, 10, -1):
        cw = [avail_w * r for r in ratios]
        padc = fs * 0.9
        lh = fs * 1.45
        wrapped, ok = [], True
        for r in [header] + rows:
            cells = []
            for c in range(ncol):
                lim = (cw[c] - 2 * padc) / (fs * K_ADV)
                if lim < 3:
                    ok = False; break
                cells.append(_wrap(r[c], lim))
            if not ok:
                break
            wrapped.append(cells)
        if not ok:
            continue
        heights = [max(len(c) for c in row) * lh + fs * 1.05 for row in wrapped]
        if sum(heights) <= avail_h:
            chosen = (fs, cw, lh, padc, wrapped, heights)
            break
    if chosen is None:
        raise SystemExit("표가 들어가지 않는다 — 행을 줄이거나 슬라이드를 나눌 것")
    fs, cw, lh, padc, wrapped, heights = chosen

    tw = sum(cw)
    x0 = (W - tw) / 2
    y0 = PAD_Y + cap_h + (avail_h - sum(heights)) / 2

    o = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">',
         f'<rect width="{W}" height="{H}" fill="#FFFFFF"/>']
    if caption:
        o.append(f'<text x="{x0}" y="{PAD_Y + 26}" font-family="{SANS}" font-size="25" '
                 f'font-weight="bold" fill="{C_CAPTION}">{esc(caption)}</text>')

    y = y0
    for ri, row in enumerate(wrapped):
        hh = heights[ri]
        is_hdr = ri == 0
        fill = C_HDR_BG if is_hdr else (C_ROW_A if (ri % 2) else C_ROW_B)
        o.append(f'<rect x="{x0}" y="{y}" width="{tw}" height="{hh}" fill="{fill}"/>')
        if hilite_col is not None and not is_hdr:
            hx = x0 + sum(cw[:hilite_col])
            o.append(f'<rect x="{hx}" y="{y}" width="{cw[hilite_col]}" height="{hh}" fill="{C_HL_BG}"/>')
        x = x0
        for c in range(ncol):
            lines = row[c]
            ty = y + (hh - len(lines) * lh) / 2 + lh * 0.72
            if is_hdr:
                col, wt = C_HDR_TX, "bold"
            elif hilite_col is not None and c == hilite_col:
                col, wt = C_HL_TX, "bold"
            elif c == 0 and bold_first:
                col, wt = C_FIRST, "bold"
            else:
                col, wt = C_TEXT, "normal"
            a = "middle" if (is_hdr or align[c] == "c") else ("end" if align[c] == "r" else "start")
            tx = x + cw[c] / 2 if a == "middle" else (x + cw[c] - padc if a == "end" else x + padc)
            for ln in lines:
                o.append(f'<text x="{tx}" y="{ty}" font-family="{SANS}" font-size="{fs}" '
                         f'fill="{col}" font-weight="{wt}" text-anchor="{a}">{esc(ln)}</text>')
                ty += lh
            if c:
                o.append(f'<line x1="{x}" y1="{y}" x2="{x}" y2="{y + hh}" '
                         f'stroke="{"#4A7BA8" if is_hdr else C_LINE}" stroke-width="1.2"/>')
            x += cw[c]
        if not is_hdr:
            o.append(f'<line x1="{x0}" y1="{y}" x2="{x0 + tw}" y2="{y}" '
                     f'stroke="{C_LINE}" stroke-width="1.2"/>')
        y += hh
    o.append(f'<line x1="{x0}" y1="{y}" x2="{x0 + tw}" y2="{y}" '
             f'stroke="{C_HDR_BG}" stroke-width="2.4"/>')
    o.append('</svg>')
    svg = "\n".join(o)
    open(out_html, "w", encoding="utf-8").write(
        "<!doctype html><meta charset='utf-8'>"
        "<style>html,body{margin:0;padding:0;background:#fff}svg{display:block}</style>" + svg)
    W, H, PAD_X, PAD_Y = _wh
    return fs
