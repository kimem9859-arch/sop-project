# -*- coding: utf-8 -*-
"""제작설계서 핵심 소스코드 이미지 생성 — 파랑·하양 테마, 16:9.

왜 코드로 만드나:
    코드는 순수 텍스트다. 글자가 한 자도 틀리면 안 되고, 줄 번호·들여쓰기가
    정확해야 한다. 이미지 생성 모델이 아니라 렌더링이 맞는 대상이다.

줄이 많으면 좌우 2단으로 나눈다. 긴 줄은 접어서(wrap) 이어 붙인다.
"""
import html, re, sys

W, H = 1920, 1080
HEADER_H = 84
PAD_X, PAD_TOP, PAD_BOT = 40, 22, 26
GUTTER_W = 78
COL_GAP = 34

K_ADV = 1.05   # em 폭 → px 환산 보정 (실측)
MONO = "D2Coding, 'NanumGothicCoding', 'DejaVu Sans Mono', monospace"
SANS = "NanumGothic, 'Noto Sans KR', sans-serif"

C_HDR      = "#1F4E79"
C_HDR_TXT  = "#FFFFFF"
C_HDR_SUB  = "#AECBEA"
C_GUT_BG   = "#EDF4FC"
C_GUT_LINE = "#C7DCF2"
C_LINENO   = "#8AA7C6"
C_TEXT     = "#1F2A36"
C_KW       = "#0B5FA5"
C_STR      = "#1B7A5A"
C_NUM      = "#B45309"
C_COM      = "#8592A0"
C_FN       = "#1F4E79"
C_DEC      = "#7A3FA5"

PY_KW = set("""and as assert async await break class continue def del elif else except
finally for from global if import in is lambda nonlocal not or pass raise return try
while with yield True False None self""".split())
C_KW_SET = set("""void int const bool char float double long short unsigned static if else
for while do return break continue switch case default true false struct class public
private String byte word HIGH LOW INPUT OUTPUT INPUT_PULLUP""".split())
JSON_KW = set("true false null".split())


def ewidth(s):
    """em 단위 표시 폭 — 한글·전각은 1.0, 그 외 0.5."""
    w = 0.0
    for ch in s:
        o = ord(ch)
        w += 1.0 if (0x1100 <= o <= 0x115F or 0x2E80 <= o <= 0xA4CF or
                     0xAC00 <= o <= 0xD7A3 or 0xF900 <= o <= 0xFAFF or
                     0xFE30 <= o <= 0xFE6F or 0xFF00 <= o <= 0xFF60 or
                     0xFFE0 <= o <= 0xFFE6) else 0.5
    return w


def tokenize(line, lang):
    """(텍스트, 색) 목록. 색이 None 이면 기본색."""
    if lang == "py":
        kws, com = PY_KW, "#"
    elif lang == "c":
        kws, com = C_KW_SET, "//"
    else:
        kws, com = JSON_KW, None
    out, i, n = [], 0, len(line)
    while i < n:
        ch = line[i]
        if com and line.startswith(com, i):
            out.append((line[i:], C_COM)); break
        if ch in "\"'":
            q, j = ch, i + 1
            while j < n:
                if line[j] == "\\":
                    j += 2; continue
                if line[j] == q:
                    j += 1; break
                j += 1
            out.append((line[i:j], C_STR)); i = j; continue
        if ch == "@" and i == len(line) - len(line.lstrip()):
            m = re.match(r"@[\w.]+", line[i:])
            if m:
                out.append((m.group(), C_DEC)); i += m.end(); continue
        if ch.isdigit():
            m = re.match(r"\d+\.?\d*", line[i:])
            out.append((m.group(), C_NUM)); i += m.end(); continue
        m = re.match(r"[A-Za-z_]\w*", line[i:])
        if m:
            w = m.group()
            after = line[i + m.end():].lstrip()
            if w in kws:
                out.append((w, C_KW))
            elif after.startswith("("):
                out.append((w, C_FN))
            else:
                out.append((w, None))
            i += m.end(); continue
        out.append((ch, None)); i += 1
    return out


def wrap_tokens(toks, limit):
    """토큰 목록을 em 폭 limit 로 접는다. [[(text,color),...], ...]"""
    rows, cur, wsum = [], [], 0.0
    for text, col in toks:
        buf = ""
        for ch in text:
            cw = ewidth(ch)
            if wsum + cw > limit and (cur or buf):
                if buf:
                    cur.append((buf, col)); buf = ""
                rows.append(cur); cur, wsum = [], 0.0
            buf += ch; wsum += cw
        if buf:
            cur.append((buf, col))
    rows.append(cur)
    return rows or [[]]


def build(src_lines, nums, lang, title, subtitle, out_html):
    """nums = 각 줄의 실제 파일 줄 번호. 번호가 끊기면 ⋮ 를 넣는다."""
    esc = html.escape
    toks = [tokenize(l.rstrip("\n").replace("\t", "    "), lang) for l in src_lines]

    def layout(ncol, fs):
        colw = (W - 2 * PAD_X - (COL_GAP if ncol == 2 else 0)) / ncol
        code_w = colw - GUTTER_W - 14
        limit = code_w / (fs * K_ADV)        # em 단위 한도
        lh = fs * 1.46
        rows = []                             # (lineno or None, tokrows)
        for k, t in enumerate(toks):
            if k and nums[k] != nums[k - 1] + 1:
                rows.append(("gap", []))
            wr = wrap_tokens(t, limit)
            rows.append((nums[k], wr[0]))
            for extra in wr[1:]:
                rows.append((None, extra))
        avail_h = H - HEADER_H - PAD_TOP - PAD_BOT
        per = int(avail_h // lh)
        need = -(-len(rows) // ncol)
        return rows, lh, colw, per, need <= per

    chosen = None
    for fs in range(24, 12, -1):
        r = layout(1, fs)
        if r[4]:
            chosen = (1, fs) + r[:4]; break
    if chosen is None:
        for fs in range(22, 11, -1):
            r = layout(2, fs)
            if r[4]:
                chosen = (2, fs) + r[:4]; break
    if chosen is None:
        raise SystemExit("들어가지 않는다 — 범위를 줄일 것")
    ncol, fs, rows, lh, colw, per = chosen
    chw = fs * K_ADV

    o = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">']
    o.append(f'<rect width="{W}" height="{H}" fill="#FFFFFF"/>')
    o.append(f'<rect width="{W}" height="{HEADER_H}" fill="{C_HDR}"/>')
    o.append(f'<text x="{PAD_X}" y="40" font-family="{MONO}" font-size="27" font-weight="bold" '
             f'fill="{C_HDR_TXT}">{esc(title)}</text>')
    o.append(f'<text x="{PAD_X}" y="69" font-family="{SANS}" font-size="19" '
             f'fill="{C_HDR_SUB}">{esc(subtitle)}</text>')

    nrow = -(-len(rows) // ncol)
    chunks = [rows[i * nrow:(i + 1) * nrow] for i in range(ncol)]
    # 실제 내용 폭에 맞춰 가로 가운데, 실제 줄 수에 맞춰 세로 가운데
    maxem = 0.0
    for _no, trow in rows:
        maxem = max(maxem, sum(ewidth(t) for t, _c in trow))
    code_px = maxem * chw + 28
    blockw = ncol * (GUTTER_W + 14 + code_px) + (COL_GAP if ncol == 2 else 0)
    blockw = min(blockw, W - 2 * PAD_X)
    unitw = (blockw - (COL_GAP if ncol == 2 else 0)) / ncol
    x0 = (W - blockw) / 2
    used_h = nrow * lh
    y0 = HEADER_H + (H - HEADER_H - used_h) / 2 - lh * 0.1
    for ci, chunk in enumerate(chunks):
        cx = x0 + ci * (unitw + COL_GAP)
        o.append(f'<rect x="{cx}" y="{y0 - 10}" width="{GUTTER_W}" '
                 f'height="{used_h + 20}" rx="4" fill="{C_GUT_BG}"/>')
        o.append(f'<line x1="{cx + GUTTER_W}" y1="{y0 - 10}" x2="{cx + GUTTER_W}" '
                 f'y2="{y0 + used_h + 10}" stroke="{C_GUT_LINE}" stroke-width="1.6"/>')
        for ri, (no, trow) in enumerate(chunk):
            y = y0 + (ri + 1) * lh - lh * 0.28
            if no == "gap":
                o.append(f'<text x="{cx + GUTTER_W + 14}" y="{y}" font-family="{MONO}" '
                         f'font-size="{fs}" fill="{C_LINENO}">⋮</text>')
                continue
            if no is not None:
                o.append(f'<text x="{cx + GUTTER_W - 12}" y="{y}" font-family="{MONO}" '
                         f'font-size="{fs * 0.86:.1f}" fill="{C_LINENO}" text-anchor="end">{no}</text>')
            if not trow:
                continue
            spans = []
            for text, col in trow:
                st = f' fill="{col}"' if col else f' fill="{C_TEXT}"'
                if col == C_KW or col == C_FN:
                    st += ' font-weight="bold"'
                if col == C_COM:
                    st += ' font-style="italic"'
                spans.append(f'<tspan{st}>{esc(text)}</tspan>')
            ind = 0 if no is not None else 2 * chw   # 접힌 줄은 들여쓴다
            o.append(f'<text x="{cx + GUTTER_W + 14 + ind}" y="{y}" font-family="{MONO}" '
                     f'font-size="{fs}" xml:space="preserve">{"".join(spans)}</text>')
        if ci == 0 and ncol == 2:
            dx = x0 + unitw + COL_GAP / 2
            o.append(f'<line x1="{dx}" y1="{y0 - 6}" x2="{dx}" '
                     f'y2="{y0 + used_h + 6}" stroke="#DCE8F5" stroke-width="1.6"/>')
    o.append('</svg>')
    svg = "\n".join(o)
    open(out_html, "w", encoding="utf-8").write(
        "<!doctype html><meta charset='utf-8'>"
        "<style>html,body{margin:0;padding:0;background:#fff}svg{display:block}</style>" + svg)
    return ncol, fs
