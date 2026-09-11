# -*- coding: utf-8 -*-
"""시퀀스 다이어그램 SVG 생성기 — 22쪽 기능 처리도와 같은 형식.

MSGS 항목
    ("call",   from, to, 라벨)     실선 화살표 (명령·호출)
    ("ret",    from, to, 라벨)     점선 화살표 (응답·반환)
    ("self",   who,      라벨)     자기 자신으로 도는 고리
    ("frag",   라벨)               조건 상자 시작
    ("div",    라벨)               조건 상자 안 구분선
    ("end",)                       조건 상자 끝
"""
W, H = 1920, 1080
SANS = "NanumGothic, 'Noto Sans KR', 'Malgun Gothic', sans-serif"
C_DARK, C_MID, C_TEXT, C_SUB = "#1F4E79", "#2E6FBA", "#1F2A36", "#6B7A88"
C_BOX, C_BOXED = "#DEEAF6", "#2E6FBA"
C_ACT = "#BBD3EA"

def _ew(s, fs):
    """한글·전각은 1.0, 그 밖은 0.55 로 본 표시 폭(px)."""
    w = 0.0
    for ch in s:
        o = ord(ch)
        w += 1.0 if (0xAC00 <= o <= 0xD7A3 or 0x3130 <= o <= 0x318F or
                     0x2E80 <= o <= 0xA4CF or 0xFF00 <= o <= 0xFF60) else 0.55
    return w * fs


HEAD_Y, HEAD_H = 40, 78
TOP = 178
STEP, SELF_STEP = 60, 88
FRAG_PAD, DIV_STEP = 40, 40


def build(participants, msgs, out_html, note=None, hi=None,
          legend="실선 = 명령 · 점선 = 응답 · 세로 막대 = 처리 중",
          step=None, self_step=None, off=0):
    HY, TP = HEAD_Y + off, TOP + off
    STEP = step or globals()["STEP"]
    SELF_STEP = self_step or globals()["SELF_STEP"]
    n = len(participants)
    lane = (W - 120) / n
    cx = [60 + lane * (i + 0.5) for i in range(n)]
    idx = {p[0] if isinstance(p, tuple) else p: i for i, p in enumerate(participants)}

    # 1차 통과 — y 좌표와 조건 상자 계산
    y, items, frags, stack = TP, [], [], []
    for m in msgs:
        k = m[0]
        if k == "frag":
            stack.append([m[1], y - 22, []]); y += FRAG_PAD
        elif k == "div":
            stack[-1][2].append((y - 20, m[1])); y += DIV_STEP
        elif k == "end":
            f = stack.pop(); frags.append((f[0], f[1], y - 18, f[2]))
        elif k == "self":
            items.append(("self", idx[m[1]], m[2], y)); y += SELF_STEP
        else:
            items.append((k, idx[m[1]], idx[m[2]], m[3], y)); y += STEP
    bottom = y + 6

    touch = {}
    for it in items:
        if it[0] == "self":
            for p in (it[1],):
                touch.setdefault(p, []).append(it[3])
        else:
            for p in (it[1], it[2]):
                touch.setdefault(p, []).append(it[4])

    o = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">',
         f'<rect width="{W}" height="{H}" fill="#fff"/>',
         '<defs>'
         f'<marker id="ah" markerWidth="11" markerHeight="9" refX="10" refY="4.5" orient="auto">'
         f'<path d="M0,0 L11,4.5 L0,9 Z" fill="{C_MID}"/></marker>'
         f'<marker id="ahd" markerWidth="11" markerHeight="9" refX="10" refY="4.5" orient="auto">'
         f'<path d="M0,0 L11,4.5 L0,9 Z" fill="#8FA6B8"/></marker></defs>']

    def txt(x, yy, s, fs=22, fill=C_TEXT, w="normal", a="middle"):
        o.append(f'<text x="{x}" y="{yy}" font-family="{SANS}" font-size="{fs}" fill="{fill}" '
                 f'font-weight="{w}" text-anchor="{a}">{s}</text>')

    # 생명선
    for i in range(n):
        o.append(f'<line x1="{cx[i]}" y1="{HY + HEAD_H}" x2="{cx[i]}" y2="{bottom}" '
                 f'stroke="#B9C7D4" stroke-width="1.4" stroke-dasharray="7 7"/>')

    # 조건 상자
    for label, y0, y1, divs in frags:
        o.append(f'<rect x="{60}" y="{y0}" width="{W - 120}" height="{y1 - y0}" rx="8" fill="none" '
                 f'stroke="{C_MID}" stroke-width="1.6" stroke-opacity="0.55"/>')
        tw = 26 + len(label) * 15
        o.append(f'<path d="M60,{y0} h{tw} l0,26 l-14,12 H60 Z" fill="#EAF2FA" '
                 f'stroke="{C_MID}" stroke-width="1.4" stroke-opacity="0.55"/>')
        txt(70, y0 + 26, label, 20, C_DARK, "bold", "start")
        for dy, dl in divs:
            o.append(f'<line x1="60" y1="{dy}" x2="{W - 60}" y2="{dy}" stroke="{C_MID}" '
                     f'stroke-width="1.2" stroke-opacity="0.45" stroke-dasharray="6 6"/>')
            txt(74, dy + 26, dl, 20, C_DARK, "bold", "start")

    # 처리 막대
    for p, ys in touch.items():
        o.append(f'<rect x="{cx[p] - 8}" y="{min(ys) - 16}" width="16" height="{max(ys) - min(ys) + 32}" '
                 f'rx="3" fill="{C_ACT}" stroke="{C_MID}" stroke-width="1"/>')

    # 메시지
    for it in items:
        if it[0] == "self":
            _, p, label, yy = it
            if cx[p] + 112 + _ew(label, 21) > W - 60:      # 오른쪽이 좁으면 왼쪽으로 돈다
                x = cx[p] - 8
                o.append(f'<path d="M{x},{yy - 14} H{x - 88} V{yy + 26} H{x - 10}" fill="none" '
                         f'stroke="{C_MID}" stroke-width="1.8" marker-end="url(#ah)"/>')
                txt(x - 104, yy + 12, label, 21, C_TEXT, "normal", "end")
            else:
                x = cx[p] + 8
                o.append(f'<path d="M{x},{yy - 14} H{x + 88} V{yy + 26} H{x + 10}" fill="none" '
                         f'stroke="{C_MID}" stroke-width="1.8" marker-end="url(#ah)"/>')
                txt(x + 104, yy + 12, label, 21, C_TEXT, "normal", "start")
            continue
        kind, a, b, label, yy = it
        x1, x2 = cx[a], cx[b]
        d = 1 if x2 > x1 else -1
        x1 += d * 9; x2 -= d * 9
        dash = ' stroke-dasharray="8 6"' if kind == "ret" else ""
        col = "#8FA6B8" if kind == "ret" else C_MID
        mk = "ahd" if kind == "ret" else "ah"
        o.append(f'<line x1="{x1}" y1="{yy}" x2="{x2}" y2="{yy}" stroke="{col}" '
                 f'stroke-width="1.9"{dash} marker-end="url(#{mk})"/>')
        txt((x1 + x2) / 2, yy - 13, label, 21,
            C_DARK if kind == "call" else C_SUB, "bold" if kind == "call" else "normal")

    # 참가자 머리
    for i, p in enumerate(participants):
        name, sub = (p if isinstance(p, tuple) else (p, None))
        bw = lane - 34
        o.append(f'<rect x="{cx[i] - bw / 2}" y="{HY}" width="{bw}" height="{HEAD_H}" rx="10" '
                 f'fill="{"#FFF3E0" if hi == i else C_BOX}" '
                 f'stroke="{"#D08A3E" if hi == i else C_BOXED}" stroke-width="2"/>')
        txt(cx[i], HY + (44 if sub else 50), name, 24, C_DARK, "bold")
        if sub:
            txt(cx[i], HY + 68, sub, 19, C_SUB)

    if note:
        o.append(f'<rect x="60" y="{bottom + 26}" width="{W - 120}" height="56" rx="10" '
                 f'fill="#F7F9FB" stroke="#D9E3EC" stroke-width="1.2"/>')
        o.append(f'<rect x="60" y="{bottom + 26}" width="6" height="56" rx="3" fill="#9AA9B6"/>')
        txt(86, bottom + 60, note, 21, C_SUB, "normal", "start")
    txt(60, H - 22, legend, 19, "#9AA9B6", "normal", "start")

    o.append('</svg>')
    open(out_html, "w", encoding="utf-8").write(
        "<!doctype html><meta charset='utf-8'>"
        "<style>html,body{margin:0;padding:0;background:#fff}svg{display:block}</style>" + "\n".join(o))
