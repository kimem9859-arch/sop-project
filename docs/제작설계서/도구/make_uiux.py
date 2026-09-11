# -*- coding: utf-8 -*-
"""15쪽 UI/UX 정의서 도식 SVG → PNG. 표와 같은 파랑·하양 테마.
사용: python3 make_uiux.py [출력폴더]
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from svg2png import render

W, H = 1920, 1080
SANS = "NanumGothic, 'Noto Sans KR', 'Malgun Gothic', sans-serif"
C_DARK, C_MID, C_TEXT, C_SUB = "#1F4E79", "#2E6FBA", "#1F2A36", "#6B7A88"

# (층, 질문, 화면 요소 4, 진한색, 옅은색)
LAYERS = [
    ("지각", "무엇이 보이는가",
     ["1인칭 영상", "버튼 검출 박스", "손 랜드마크", "버튼 판정 구역"], "#2E6FBA", "#EAF2FA"),
    ("이해", "지금 옳은가",
     ["현재 상태 표시", "순서 위반 경고 팝업", "위반 사유 문구", "차단 표시"], "#C2703F", "#FDF1EC"),
    ("예측", "다음에 무엇을 하는가",
     ["공정 단계 목록", "기대 단계 강조", "대기 진행 바", "필요 공구 안내"], "#4A6B37", "#EEF6EA"),
]
FLOW = [("대기 · 점검", "#5B7C99", "카메라 · 인터락 · 버튼 입력 연결 확인"),
        ("정상 진행", "#4A8C5A", "현재 단계와 남은 대기 시간 안내"),
        ("경고",     "#D08A3E", "누르기 전 시청각 경고 · 해제 버튼"),
        ("차단",     "#C0504D", "차단 사유 표시 · 작업자 본인 해제")]
AUX = ["메뉴", "설정", "알림", "연결 상태 아이콘"]
CFG = ["다크 · 화이트 테마", "검출 오버레이", "작업 초기화",
       "콘솔 점검", "녹화", "캘리브레이션"]

o = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">',
     f'<rect width="{W}" height="{H}" fill="#fff"/>']


def txt(x, y, s, fs=24, fill=C_TEXT, w="normal", a="start"):
    o.append(f'<text x="{x}" y="{y}" font-family="{SANS}" font-size="{fs}" fill="{fill}" '
             f'font-weight="{w}" text-anchor="{a}">{s}</text>')


def chip(x, y, w, h, s, edge, fs=22, fill="#fff", tcol=None):
    o.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{h/2}" fill="{fill}" '
             f'stroke="{edge}" stroke-width="1.6"/>')
    txt(x + w / 2, y + h / 2 + fs * 0.36, s, fs, tcol or C_TEXT, "normal", "middle")


def sect(x, y, s):
    o.append(f'<line x1="{x}" y1="{y + 10}" x2="{x + 5}" y2="{y + 10}" stroke="{C_DARK}" stroke-width="0"/>')
    o.append(f'<rect x="{x}" y="{y - 20}" width="6" height="28" rx="3" fill="{C_DARK}"/>')
    txt(x + 20, y + 2, s, 28, C_DARK, "bold")


# ── 왼쪽 : 정보 3층 ────────────────────────────────
LX, LW = 56, 1000
sect(LX, 66, "정보 3층 — 어느 정보를 어디에 두나")
BY, BH, GAP = 100, 280, 28
for i, (name, q, items, dark, tint) in enumerate(LAYERS):
    y = BY + i * (BH + GAP)
    o.append(f'<rect x="{LX}" y="{y}" width="{LW}" height="{BH}" rx="18" fill="{tint}" '
             f'stroke="{dark}" stroke-opacity="0.35" stroke-width="1.4"/>')
    o.append(f'<rect x="{LX}" y="{y}" width="11" height="{BH}" rx="5" fill="{dark}"/>')
    txt(LX + 48, y + 118, name, 52, dark, "bold")
    txt(LX + 48, y + 168, q, 24, C_SUB)
    gx, gy, cw, ch, g = LX + 350, y + 69, 310, 64, 14
    for k, it in enumerate(items):
        chip(gx + (k % 2) * (cw + g), gy + (k // 2) * (ch + g), cw, ch, it, dark, 22)

# ── 오른쪽 : 화면 상태 · 설정 ──────────────────────
RX, RW = 1112, 752
sect(RX, 66, "화면 상태")
fy, fh = 110, 84
for i, (name, col, desc) in enumerate(FLOW):
    y = fy + i * (fh + 16)
    o.append(f'<rect x="{RX}" y="{y}" width="{RW}" height="{fh}" rx="12" fill="{col}" '
             f'fill-opacity="0.10" stroke="{col}" stroke-width="2"/>')
    o.append(f'<rect x="{RX}" y="{y}" width="8" height="{fh}" rx="4" fill="{col}"/>')
    txt(RX + 34, y + fh / 2 + 11, name, 31, col, "bold")
    txt(RX + RW - 26, y + fh / 2 + 8, desc, 21, C_SUB, "normal", "end")
    if i < len(FLOW) - 1:
        cx, ay = RX + RW - 46, y + fh + 8
        o.append(f'<path d="M {cx-9} {ay} L {cx+9} {ay} L {cx} {ay+12} Z" fill="#9AA9B6"/>')

txt(RX, 540, "보조 화면", 24, C_SUB, "bold")
cw, ch, g = 368, 64, 16
for i, a in enumerate(AUX):
    r, k = divmod(i, 2)
    chip(RX + k * (cw + g), 558 + r * (ch + g), cw, ch, a, C_MID, 25, "#F3F8FD", C_DARK)

sect(RX, 758, "설정 항목")
cw, ch, g = 240, 62, 16
for i, c in enumerate(CFG):
    r, k = divmod(i, 3)
    chip(RX + k * (cw + g), 792 + r * (ch + g), cw, ch, c, "#B9CFE4", 21)

# 화면 배치 원칙 — 콘솔 디스플레이와 글라스 시야 양쪽을 고려한 배치
NY, NH = 946, 92
o.append(f'<rect x="{RX}" y="{NY}" width="{RW}" height="{NH}" rx="12" fill="#F7F9FB" '
         f'stroke="#D9E3EC" stroke-width="1.2"/>')
o.append(f'<rect x="{RX}" y="{NY}" width="6" height="{NH}" rx="3" fill="#9AA9B6"/>')
txt(RX + 26, NY + 30, "화면 배치 원칙", 21, C_DARK, "bold")
txt(RX + 26, NY + 56, "정보는 가장자리에 두고 가운데는 비운다.", 19, C_SUB)
txt(RX + 26, NY + 80, "콘솔 디스플레이와 스마트 글라스 시야 어느 쪽에 띄워도 앞을 가리지 않는다.", 19, C_SUB)

o.append('</svg>')
out = sys.argv[1] if len(sys.argv) > 1 else "."
h = os.path.join(out, "S15_UIUX정의서.html")
open(h, "w", encoding="utf-8").write(
    "<!doctype html><meta charset='utf-8'>"
    "<style>html,body{margin:0;padding:0;background:#fff}svg{display:block}</style>" + "\n".join(o))
png = os.path.join(out, "S15_UIUX정의서.png")
render(h, W, H, png); os.remove(h)
print("생성:", png)
