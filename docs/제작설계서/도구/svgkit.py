# -*- coding: utf-8 -*-
"""제작설계서 도식 공통 요소 — 색 · 글꼴 · 글자 · 구획 제목 · 칩 · 줄바꿈."""
W, H = 1920, 1080
SANS = "NanumGothic, 'Noto Sans KR', 'Malgun Gothic', sans-serif"
C_DARK, C_MID, C_TEXT, C_SUB = "#1F4E79", "#2E6FBA", "#1F2A36", "#6B7A88"
C_TINT, C_LINE = "#F3F8FD", "#CBDCEF"
C_WARN, C_WARN_BG = "#C2703F", "#FDF1EC"
C_STOP, C_STOP_BG = "#C0504D", "#FBEDEC"
C_OK, C_OK_BG = "#4A6B37", "#EEF6EA"
C_GRAY, C_GRAY_BG = "#8C98A4", "#EFF2F5"


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


class Doc:
    def __init__(self):
        self.o = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">',
                  f'<rect width="{W}" height="{H}" fill="#fff"/>',
                  '<defs>'
                  '<marker id="ar" markerWidth="11" markerHeight="9" refX="10" refY="4.5" orient="auto">'
                  f'<path d="M0,0 L11,4.5 L0,9 Z" fill="{C_MID}"/></marker>'
                  '<marker id="arg" markerWidth="11" markerHeight="9" refX="10" refY="4.5" orient="auto">'
                  f'<path d="M0,0 L11,4.5 L0,9 Z" fill="{C_GRAY}"/></marker>'
                  '</defs>']

    def add(self, s):
        self.o.append(s)

    def txt(self, x, y, s, fs=22, fill=C_TEXT, w="normal", a="start", op=1.0):
        self.o.append(f'<text x="{x}" y="{y}" font-family="{SANS}" font-size="{fs}" fill="{fill}" '
                      f'font-weight="{w}" text-anchor="{a}" opacity="{op}">{s}</text>')

    def sect(self, x, y, s, fs=27):
        self.o.append(f'<rect x="{x}" y="{y - 20}" width="6" height="28" rx="3" fill="{C_DARK}"/>')
        self.txt(x + 20, y + 2, s, fs, C_DARK, "bold")

    def box(self, x, y, w, h, fill="#fff", stroke=C_MID, rx=12, sw=1.6, op=1.0):
        self.o.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}" '
                      f'fill-opacity="{op}" stroke="{stroke}" stroke-width="{sw}"/>')

    def chip(self, x, y, w, h, s, edge=C_MID, fs=21, fill="#fff", tcol=None):
        self.box(x, y, w, h, fill, edge, h / 2)
        self.txt(x + w / 2, y + h / 2 + fs * 0.36, s, fs, tcol or C_TEXT, "normal", "middle")

    def params(self, x, y, w, rows, fs=21):
        for i, (k, v) in enumerate(rows):
            self.o.append(f'<rect x="{x}" y="{y}" width="{w}" height="50" '
                          f'fill="{"#FFFFFF" if i % 2 else C_TINT}"/>')
            self.txt(x + 20, y + 33, k, fs, C_TEXT)
            self.txt(x + w - 20, y + 33, v, fs, C_DARK, "bold", "end")
            self.o.append(f'<line x1="{x}" y1="{y + 50}" x2="{x + w}" y2="{y + 50}" '
                          f'stroke="{C_LINE}" stroke-width="1"/>')
            y += 50
        return y

    def notes(self, x, y, w, lines, fs=20):
        for s in lines:
            for j, ln in enumerate(wrap(s, fs, w - 30)):
                y += 29
                self.txt(x + (17 if j else 0), y, ln if j else "• " + ln, fs, C_SUB)
            y += 10
        return y

    def save(self, path):
        self.o.append('</svg>')
        open(path, "w", encoding="utf-8").write(
            "<!doctype html><meta charset='utf-8'>"
            "<style>html,body{margin:0;padding:0;background:#fff}svg{display:block}</style>"
            + "\n".join(self.o))
