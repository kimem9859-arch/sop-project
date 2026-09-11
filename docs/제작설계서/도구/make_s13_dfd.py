# -*- coding: utf-8 -*-
"""9쪽 데이터 흐름도 — 영상 한 장이 어디를 거쳐 차단까지 가나.

🔴 Gemini 생성본을 대체한다. 그림 안 한글이 깨져 있었다 —
   「Hallo-8」(→Hailo) · 「손끝이 어는」(→어느) · 「인터록」(→인터락) ·
   「장비 전기신호 차단」(→버튼 입력 차단) · 「전기는 끊지 않는다」(→버튼 입력은).

근거
  Rpi5/Demo/camera_thread.py    글라스 프레임 → 검출 → 손 추적 → 구역 판정
  Rpi5/Demo/fsm.py:210          체류 0.3 초 + 박스 안이라야 경고
  Rpi5/Demo/fsm.py:231-234      🔴 오답 버튼을 실제로 누르면 **경고를 생략하고** 즉시 BLOCK
                                — 경고를 거쳐 차단으로 가는 것이 아니다
  Rpi5/Demo/recipe.json         정답 순서의 단일 출처 (D1)
  Rpi5/arduino/console_interlock  CH5 가 버튼 공통 GND 를 끊는다
⚠️ D2 판정 로그는 넣지 않는다 — 테스트용 DB 라 ERD 슬라이드와 함께 뺐다.
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from svgkit import *
from svg2png import render

REPORT = "--report" in sys.argv          # 개발보고서용 — 제목 없이, 여백을 잘라낸다
SHIFT, RH = 150, 870                      # 위로 당길 양 · 잘라낸 뒤 높이

d = Doc()
d.add('<defs>'
      '<marker id="ag2" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">'
      f'<path d="M0,0 L10,4 L0,8 Z" fill="{C_OK}"/></marker>'
      '<marker id="aw2" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">'
      f'<path d="M0,0 L10,4 L0,8 Z" fill="{C_WARN}"/></marker>'
      '<marker id="ar2" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">'
      f'<path d="M0,0 L10,4 L0,8 Z" fill="{C_STOP}"/></marker>'
      '<marker id="ad2" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">'
      f'<path d="M0,0 L10,4 L0,8 Z" fill="{C_GRAY}"/></marker>'
      '<marker id="ab2" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">'
      f'<path d="M0,0 L10,4 L0,8 Z" fill="{C_MID}"/></marker></defs>')

# ══ 머리 — 슬라이드판에만 (보고서는 Word 캡션이 제목을 맡는다) ═══
if not REPORT:
    d.txt(70, 62, "영상 한 장이 어디를 거쳐 차단까지 가나", 30, C_DARK, "bold")
    d.txt(70, 96, "네 구간을 지난다. 어느 것도 건너뛰지 않는다.", 21, C_SUB)
    d.box(70, 118, 1780, 46, C_TINT, C_LINE, 10, 1.2)
    for x, k, v in [(92, "NPU", "검출 모델을 빠르게 돌리는 전용 칩"),
                    (760, "HOI 융합", "손과 버튼을 따로 찾은 뒤 둘의 관계를 맞춰 보는 것")]:
        d.txt(x, 148, k, 20, C_DARK, "bold")
        d.txt(x + ew(k, 20) + 22, 148, "= " + v, 20, C_TEXT)

# ══ 네 구간 띠 ══════════════════════════════════════
LANE = [(70, 380, "①", "감지", "1인칭 영상 수집"),
        (480, 420, "②", "인식", "엣지 AI 분석"),
        (930, 380, "③", "판정", "순서 상태 대조"),
        (1340, 510, "④", "대응", "경고와 물리 차단")]
for x, w, num, name, sub in LANE:
    d.box(x, 190, w, 590, "#FBFCFD", "#E3EAF1", 14, 1.2)
    d.box(x, 190, w, 54, C_DARK, C_DARK, 14, 1)
    d.add(f'<rect x="{x}" y="{222}" width="{w}" height="22" fill="{C_DARK}"/>')
    d.txt(x + 20, 226, num, 22, "#fff", "bold")
    d.txt(x + 50, 226, name, 23, "#fff", "bold")
    d.txt(x + w - 20, 226, sub, 19, "#C9DCF0", "normal", "end")


def node(x, y, w, h, title, lines, col, bg, ts=22):
    d.box(x, y, w, h, bg, col, 12, 2)
    d.txt(x + w / 2, y + 40, title, ts, C_DARK, "bold", "middle")
    for i, ln in enumerate(lines):
        d.txt(x + w / 2, y + 72 + i * 26, ln, 18, C_SUB, "normal", "middle")


def store(x, y, w, h, title, sub):
    ry = 14
    d.add(f'<path d="M{x},{y+ry} v{h-2*ry} a{w/2},{ry} 0 0 0 {w},0 v{-(h-2*ry)}" '
          f'fill="{C_TINT}" stroke="{C_DARK}" stroke-width="2"/>')
    d.add(f'<ellipse cx="{x+w/2}" cy="{y+ry}" rx="{w/2}" ry="{ry}" fill="#fff" '
          f'stroke="{C_DARK}" stroke-width="2"/>')
    d.txt(x + w / 2, y + 52, title, 21, C_DARK, "bold", "middle")
    d.txt(x + w / 2, y + 76, sub, 18, C_SUB, "normal", "middle")


def dia(cx, cy, hw, hh, text):
    d.add(f'<path d="M{cx-hw},{cy} L{cx},{cy-hh} L{cx+hw},{cy} L{cx},{cy+hh} Z" '
          f'fill="#fff" stroke="{C_MID}" stroke-width="2.4"/>')
    d.txt(cx, cy + 7, text, 21, C_DARK, "bold", "middle")


def arrow(path, col=C_MID, mk="ab2", dash=None):
    dd = f' stroke-dasharray="{dash}"' if dash else ""
    d.add(f'<path d="{path}" fill="none" stroke="{col}" stroke-width="2.4"{dd} '
          f'marker-end="url(#{mk})"/>')


# ── ① 감지 ───────────────────────────────────────────
node(100, 268, 320, 170, "작업자 + 스마트 글라스",
     ["XIAO ESP32-S3 Sense", "OV3660 카메라 · 1 인칭", "무선으로 파이에 보낸다"],
     C_MID, "#EAF2FA")
node(100, 610, 320, 150, "장비 콘솔",
     ["버튼 B1 ~ B4 · 비상정지(EMO)", "눌림은 GPIO 로 들어간다"], C_GRAY, C_GRAY_BG)

# ── ② 인식 ───────────────────────────────────────────
d.box(500, 262, 380, 402, "#fff", C_DARK, 12, 2)
d.txt(690, 294, "라즈베리파이 5 + Hailo-8 NPU", 20, C_DARK, "bold", "middle")
d.txt(690, 317, "온디바이스 — 밖으로 나가지 않는다", 17, C_SUB, "normal", "middle")
for i, (t, s1, s2) in enumerate([
        ("객체 검출", "YOLOv8n — 버튼 5 종", "한 번의 순전파로 위치까지"),
        ("손 추적", "BlazePalm + BlazeHand", "손바닥 → 관절 21 점"),
        ("HOI 융합", "손끝이 어느 버튼 구역에", "링 25px + 안쪽 상자")]):
    y = 330 + i * 112
    d.box(522, y, 336, 88, "#EAF2FA", C_MID, 10, 1.6)
    d.txt(690, y + 28, t, 21, C_DARK, "bold", "middle")
    d.txt(690, y + 52, s1, 17, C_SUB, "normal", "middle")
    d.txt(690, y + 74, s2, 16, C_MID, "bold", "middle")
    if i < 2:
        arrow(f"M690,{y+90} V{y+108}")

# ── ③ 판정 ───────────────────────────────────────────
store(970, 262, 300, 88, "D1  작업 절차서", "정답 순서 · 단계마다 정답 버튼")
dia(1120, 436, 150, 54, "기대 단계의 버튼인가?")
dia(1120, 590, 150, 54, "0.3 초 이상 머물렀나?")
arrow("M1120,350 V378")
d.txt(1136, 372, "기대 단계", 18, C_DARK, "bold")
arrow("M1120,490 V532")
d.txt(1136, 520, "오답", 18, C_STOP, "bold")

# ── ④ 대응 ───────────────────────────────────────────
node(1370, 268, 450, 124, "정상 진행",
     ["화면에 다음 단계 안내", "타워램프 녹"], C_OK, C_OK_BG)
node(1370, 412, 450, 148, "경고 (WARNING)",
     ["화면 팝업 · 타워램프 황 · 부저", "버튼 입력은 끊지 않는다"], C_WARN, C_WARN_BG)
node(1370, 600, 450, 148, "차단 (BLOCK)",
     ["인터락 — 버튼 입력 차단", "타워램프 적 · 부저"], C_STOP, C_STOP_BG)

# ── 출력 장치 띠 ─────────────────────────────────────
d.box(70, 800, 1780, 120, "#F7F9FB", "#D9E3EC", 14, 1.4)
d.txt(94, 830, "출력 장치   —   ④ 대응을 실제 장치로 내보낸다", 20, C_DARK, "bold")
for x, w, t, s in [(100, 520, "아두이노 UNO R4 + 릴레이", "판정 결과를 받아 채널을 켜고 끈다"),
                   (640, 420, "타워램프 · 부저", "녹 · 황 · 적 + 경고음"),
                   (1080, 740, "10.5 인치 터치 디스플레이", "경고 표시 · 작업자 해제 버튼")]:
    d.box(x, 844, w, 62, "#fff", C_GRAY, 10, 1.6)
    d.txt(x + w / 2, 870, t, 20, C_DARK, "bold", "middle")
    d.txt(x + w / 2, 894, s, 17, C_SUB, "normal", "middle")

# ══ 구간을 잇는 흐름 ════════════════════════════════
arrow("M420,353 H492")
d.txt(456, 338, "WiFi", 17, C_MID, "bold", "middle")

arrow("M880,436 H962")
d.txt(921, 416, "손끝이", 17, C_MID, "bold", "middle")
d.txt(921, 462, "있는 구역", 17, C_MID, "bold", "middle")

arrow("M420,685 H942 V484 H1099", C_STOP, "ar2")
d.txt(560, 710, "버튼 눌림 · GPIO", 18, C_STOP, "bold")
d.add(f'<circle cx="942" cy="685" r="5" fill="{C_STOP}"/>')
arrow("M942,685 H1322 V674 H1362", C_STOP, "ar2")
d.txt(1150, 710, "오답이면 경고를 건너뛰고 즉시 차단", 17, C_STOP, "bold", "middle")

arrow("M1270,436 H1322 V330 H1362", C_OK, "ag2")
d.txt(1300, 404, "정답", 18, C_OK, "bold", "end")

arrow("M1270,590 H1322 V486 H1362", C_WARN, "aw2")
d.txt(1300, 558, "머물렀다", 18, C_WARN, "bold", "end")



arrow("M1120,838 V648", C_GRAY, "ad2", "8 6")
d.txt(1104, 742, "작업자 해제 → 판정 복귀", 18, C_SUB, "bold", "end")

# ══ 범례 ════════════════════════════════════════════
LEG = [("처리", C_MID, "#EAF2FA"), ("하드웨어", C_GRAY, C_GRAY_BG),
       ("정상", C_OK, C_OK_BG), ("경고", C_WARN, C_WARN_BG), ("차단", C_STOP, C_STOP_BG)]
x = 76
for t, col, bg in LEG:
    d.box(x, 956, 22, 22, bg, col, 5, 1.6)
    d.txt(x + 32, 974, t, 19, C_SUB)
    x += 52 + ew(t, 19)
d.add(f'<line x1="{x+10}" y1="967" x2="{x+56}" y2="967" stroke="{C_MID}" stroke-width="2.4"/>')
d.txt(x + 66, 974, "데이터 흐름", 19, C_SUB)
x += 66 + ew("데이터 흐름", 19) + 24
d.add(f'<line x1="{x}" y1="967" x2="{x+46}" y2="967" stroke="{C_GRAY}" stroke-width="2.4" '
      f'stroke-dasharray="8 6"/>')
d.txt(x + 56, 974, "해제 후 복귀", 19, C_SUB)

args = [a for a in sys.argv[1:] if not a.startswith("--")]
out = args[0] if args else "."
name, hh = "S13_데이터흐름도", H
if REPORT:
    name, hh = "S13_데이터흐름도_보고서", RH
    o = d.o
    d.o = ([f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{RH}" '
            f'viewBox="0 0 {W} {RH}">', f'<rect width="{W}" height="{RH}" fill="#fff"/>',
            o[2], o[3], f'<g transform="translate(0,-{SHIFT})">'] + o[4:] + ['</g>'])
h = os.path.join(out, name + ".html"); d.save(h)
png = os.path.join(out, name + ".png"); render(h, W, hh, png); os.remove(h)
print("생성:", png, f"({W}x{hh})")
