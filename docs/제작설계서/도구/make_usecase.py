# -*- coding: utf-8 -*-
"""8쪽 유즈케이스 다이어그램 SVG → PNG. 표(tableshot)와 같은 파랑·하양 테마.

사용: python3 make_usecase.py [출력폴더]
유즈케이스 목록이 바뀌면 UCS 만 고치면 된다 — 배치는 자동으로 다시 잡힌다.
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from svg2png import render

W, H = 1920, 1080
SANS = "NanumGothic, 'Noto Sans KR', 'Malgun Gothic', sans-serif"

C_DARK  = "#1F4E79"
C_MID   = "#2E6FBA"
C_TINT  = "#F3F8FD"
C_LINE  = "#CBDCEF"
C_TEXT  = "#1F2A36"
C_ASSOC = "#7FA8CF"

SYS = "SOP 순서 위반 감지 · 차단 시스템"

# (ID, 이름, 밴드, 부액터 연결 여부)
UCS = [
    ("UC-01", "작업 시작",            "진행", False),
    ("UC-02", "정상 공정 진행",        "진행", False),
    ("UC-03", "공구 확인 단계 통과",    "진행", False),
    ("UC-04", "순서 위반 경고",        "개입", False),
    ("UC-05", "강행 시 인터락 차단",    "개입", True),
    ("UC-06", "경고 · 차단 해제",      "개입", False),
    ("UC-07", "비상정지",             "개입", True),
    ("UC-08", "음성 질의 응답",        "운용", False),
    ("UC-09", "콘솔 점검",            "운용", False),
]
BAND_TINT = {"진행": "#EDF5FC", "개입": "#FDF1EC", "운용": "#F1F6EE"}
BAND_EDGE = {"진행": "#B9D5EE", "개입": "#EFC9B6", "운용": "#C7DBB9"}
BAND_TX   = {"진행": "#1F4E79", "개입": "#A9542A", "운용": "#4A6B37"}

BX, BY, BW, BH = 545, 62, 830, 986          # 시스템 경계
CX, RX, RY = 985, 292, 37                    # 타원
TOP, PITCH = 196, 96


def actor(cx, cy, label, sub=None, scale=1.0):
    s, o = scale, []
    o.append(f'<circle cx="{cx}" cy="{cy - 52 * s}" r="{20 * s}" fill="#fff" stroke="{C_DARK}" stroke-width="3"/>')
    o.append(f'<line x1="{cx}" y1="{cy - 32 * s}" x2="{cx}" y2="{cy + 18 * s}" stroke="{C_DARK}" stroke-width="3"/>')
    o.append(f'<line x1="{cx - 28 * s}" y1="{cy - 12 * s}" x2="{cx + 28 * s}" y2="{cy - 12 * s}" stroke="{C_DARK}" stroke-width="3"/>')
    o.append(f'<line x1="{cx}" y1="{cy + 18 * s}" x2="{cx - 22 * s}" y2="{cy + 60 * s}" stroke="{C_DARK}" stroke-width="3"/>')
    o.append(f'<line x1="{cx}" y1="{cy + 18 * s}" x2="{cx + 22 * s}" y2="{cy + 60 * s}" stroke="{C_DARK}" stroke-width="3"/>')
    o.append(f'<text x="{cx}" y="{cy + 96 * s}" font-family="{SANS}" font-size="27" font-weight="bold" '
             f'fill="{C_DARK}" text-anchor="middle">{label}</text>')
    if sub:
        o.append(f'<text x="{cx}" y="{cy + 124 * s}" font-family="{SANS}" font-size="20" '
                 f'fill="#6B7A88" text-anchor="middle">{sub}</text>')
    return o


def main(out_dir="."):
    o = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">',
         f'<rect width="{W}" height="{H}" fill="#fff"/>']

    ys = [TOP + i * PITCH for i in range(len(UCS))]

    # 밴드 배경
    labels = []
    for band in ("진행", "개입", "운용"):
        idx = [i for i, u in enumerate(UCS) if u[2] == band]
        y0, y1 = ys[idx[0]] - RY - 11, ys[idx[-1]] + RY + 11
        o.append(f'<rect x="{BX + 14}" y="{y0}" width="{BW - 28}" height="{y1 - y0}" rx="14" '
                 f'fill="{BAND_TINT[band]}" stroke="{BAND_EDGE[band]}" stroke-width="1.2"/>')
        labels.append((band, (y0 + y1) / 2))

    # 시스템 경계
    o.append(f'<rect x="{BX}" y="{BY}" width="{BW}" height="{BH}" rx="26" fill="none" '
             f'stroke="{C_DARK}" stroke-width="2.6"/>')
    o.append(f'<text x="{CX}" y="{BY + 46}" font-family="{SANS}" font-size="30" font-weight="bold" '
             f'fill="{C_DARK}" text-anchor="middle">{SYS}</text>')

    # 연결선 (타원보다 먼저 그려 타원 뒤로 깔린다)
    AX, AY = 232, 560          # 작업자
    SX, SY = 1690, 612         # 정비 대상 설비
    for i, (uid, name, band, sec) in enumerate(UCS):
        o.append(f'<line x1="{AX + 46}" y1="{AY - 14}" x2="{CX - RX + 8}" y2="{ys[i]}" '
                 f'stroke="{C_ASSOC}" stroke-width="1.8"/>')
        if sec:
            o.append(f'<line x1="{SX - 52}" y1="{SY - 14}" x2="{CX + RX - 8}" y2="{ys[i]}" '
                     f'stroke="{C_ASSOC}" stroke-width="1.8"/>')

    # 밴드 라벨 — 연결선 위로 올려 가려지지 않게 한다
    for band, ty in labels:
        o.append(f'<rect x="{BX + 26}" y="{ty - 38}" width="38" height="76" rx="19" '
                 f'fill="#fff" stroke="{BAND_EDGE[band]}" stroke-width="1.2"/>')
        o.append(f'<text x="{BX + 45}" y="{ty}" font-family="{SANS}" font-size="24" font-weight="bold" '
                 f'fill="{BAND_TX[band]}" text-anchor="middle" dominant-baseline="central" '
                 f'transform="rotate(-90 {BX + 45} {ty})">{band}</text>')

    # 유즈케이스 타원
    for i, (uid, name, band, sec) in enumerate(UCS):
        cy = ys[i]
        o.append(f'<ellipse cx="{CX}" cy="{cy}" rx="{RX}" ry="{RY}" fill="#fff" '
                 f'stroke="{C_MID}" stroke-width="2"/>')
        o.append(f'<text x="{CX}" y="{cy + 9}" font-family="{SANS}" font-size="25" text-anchor="middle">'
                 f'<tspan fill="{C_DARK}" font-weight="bold">{uid}</tspan>'
                 f'<tspan fill="{C_TEXT}">  {name}</tspan></text>')

    o += actor(AX, AY, "작업자", "주 액터")
    o += actor(SX, SY, "정비 대상 설비", "부 액터", 0.92)

    o.append('</svg>')
    html = os.path.join(out_dir, "S08_유즈케이스다이어그램.html")
    open(html, "w", encoding="utf-8").write(
        "<!doctype html><meta charset='utf-8'>"
        "<style>html,body{margin:0;padding:0;background:#fff}svg{display:block}</style>" + "\n".join(o))
    png = os.path.join(out_dir, "S08_유즈케이스다이어그램.png")
    render(html, W, H, png)
    os.remove(html)
    print("생성:", png)


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else ".")
