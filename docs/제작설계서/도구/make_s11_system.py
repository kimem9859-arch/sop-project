# -*- coding: utf-8 -*-
"""7쪽 시스템 구성도 ① 전체 구성 — 세 갈래로 짜였다.

🔴 Gemini 생성본을 대체한다. 그림 안 표기가 어긋나 있었다 —
   「인터록」(→인터락) ×2 · 「전기 신호 차단」(→버튼 입력 차단) ·
   「전기는 끊지 않는다」(→버튼 입력은) · 「릴레이 8채널」(→8 채널 모듈 · 5 채널 사용).

근거
  Rpi5/Demo/config.py            YOLO 5 클래스 · 손 21 점 · 공구 3 종
  Rpi5/Demo/recipe.json          PECVD 정비 4 단계
  Rpi5/Demo/fsm.py               6 상태 · 전이 조건
  Rpi5/arduino/console_interlock CH5 가 버튼 공통 GND 를 끊는다
  통합문서 §11.1                  Hailo-8 26 TOPS · UNO R4 · 8 채널 모듈
실행: python3 make_s11_system.py <출력폴더> [--report]
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from svgkit import *
from svg2png import render

REPORT = "--report" in sys.argv
SHIFT, RH = 150, 900

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

if not REPORT:
    d.txt(70, 62, "무엇을 보고, 어떻게 가리고, 어떻게 막나", 30, C_DARK, "bold")
    d.txt(70, 96, "세 갈래로 짜였다. 앞 갈래가 낸 것만 다음 갈래가 받는다.", 21, C_SUB)
    d.box(70, 118, 1780, 46, C_TINT, C_LINE, 10, 1.2)
    for x, k, v in [(92, "인터락", "오답 버튼을 눌러도 신호가 안 가게 입력을 끊는 장치"),
                    (960, "FSM", "지금 어느 상황인지 몇 가지로 나눠 두고 옮겨 다니는 방식")]:
        d.txt(x, 148, k, 20, C_DARK, "bold")
        d.txt(x + ew(k, 20) + 22, 148, "= " + v, 20, C_TEXT)


def panel(x, w, y, h, num, title, sub, col):
    d.box(x, y, w, h, "#FBFCFD", col, 14, 2)
    d.box(x, y, w, 48, col, col, 14, 1)
    d.add(f'<rect x="{x}" y="{y+28}" width="{w}" height="20" fill="{col}"/>')
    d.txt(x + 22, y + 32, num, 21, "#fff", "bold")
    d.txt(x + 50, y + 32, title, 22, "#fff", "bold")
    d.txt(x + w - 22, y + 32, sub, 18, "#E6EEF7", "normal", "end")


# ══ 세 갈래 ═════════════════════════════════════════
d.sect(70, 212, "세 갈래")
PY, PH = 240, 330

# ── ① 인식 ───────────────────────────────────────────
panel(70, 560, PY, PH, "①", "인식", "무엇이 보이나", C_MID)
for i, (t, s) in enumerate([("버튼 검출", "YOLOv8n · 5 클래스 (B1~B4 · EMO)"),
                            ("손 추적", "관절 21 점 — 검지 끝 하나만 쓴다"),
                            ("공구 검출", "드라이버 · 렌치 · 플라이어")]):
    y = 302 + i * 84
    d.box(94, y, 512, 72, "#EAF2FA", C_MID, 10, 1.6)
    d.txt(116, y + 30, t, 21, C_DARK, "bold")
    d.txt(116, y + 55, s, 18, C_SUB)

# ── ② 판정 ───────────────────────────────────────────
panel(680, 560, PY, PH, "②", "판정", "지금 눌러야 할 것인가", C_DARK)
d.txt(704, 316, "작업 절차서 — PECVD 정비", 18, C_SUB)
for i, (n, nm) in enumerate([("1", "클린 · 가스차단"), ("2", "펌프 / 퍼지"),
                             ("3", "전극 냉각"), ("4", "챔버 벤트")]):
    y = 344 + i * 28
    here = (i == 1)
    if here:
        d.box(700, y - 20, 250, 26, "#EAF2FA", "#EAF2FA", 6, 0)
        d.txt(708, y, "▶", 16, C_MID, "bold")
    d.txt(730, y, n, 19, C_MID if here else C_SUB, "bold")
    d.txt(756, y, nm, 19, C_DARK if here else C_SUB, "bold" if here else "normal")

d.box(980, 300, 236, 130, "#fff", C_STOP, 12, 2)
d.txt(1098, 332, "기대 단계", 18, C_SUB, "normal", "middle")
d.txt(1042, 380, "2", 40, C_MID, "bold", "middle")
d.txt(1098, 378, "≠", 28, C_STOP, "bold", "middle")
d.txt(1154, 380, "4", 40, C_STOP, "bold", "middle")
d.txt(1098, 412, "실제로 다가간 버튼", 17, C_SUB, "normal", "middle")
d.box(700, 458, 516, 46, C_STOP_BG, C_STOP, 10, 1.8)
d.txt(958, 488, "순서 위반 — 역순으로 건너뛰었다", 21, C_STOP, "bold", "middle")
d.txt(958, 540, "라즈베리파이 5 + Hailo-8 NPU 에서 판정까지 끝난다", 18, C_SUB, "normal", "middle")

# ── ③ 개입 ───────────────────────────────────────────
panel(1290, 560, PY, PH, "③", "개입", "두 단계로 막는다", C_STOP)
d.box(1314, 300, 512, 62, C_OK_BG, C_OK, 10, 1.8)
d.txt(1336, 328, "정상", 21, C_OK, "bold")
d.txt(1336, 352, "그대로 진행 · 타워램프 녹", 18, C_SUB)

for y, tag, t, s1, s2, col, bg in [
        (376, "1 차", "버튼을 누르기 전에 경고", "화면 팝업 + 타워램프 황 · 부저",
         "버튼 입력은 끊지 않는다", C_WARN, C_WARN_BG),
        (474, "2 차", "강행하면 인터락 차단", "오답 버튼을 실제로 누르면",
         "버튼 입력을 물리적으로 끊는다", C_STOP, C_STOP_BG)]:
    d.box(1314, y, 512, 84, bg, col, 10, 1.8)
    d.box(1330, y + 12, 54, 26, col, col, 13, 1)
    d.txt(1357, y + 31, tag, 16, "#fff", "bold", "middle")
    d.txt(1396, y + 32, t, 21, col, "bold")
    d.txt(1330, y + 58, s1, 18, C_SUB)
    d.txt(1330 + ew(s1, 18) + 14, y + 58, s2, 18, col, "bold")

# ══ FSM 6 상태 ══════════════════════════════════════
d.sect(70, 612, "판정은 여섯 상황으로 나눠 둔다")
SW, SP, SY, SH = 268, 296, 648, 82
ST = [("① 대기", "IDLE", C_GRAY), ("② 준비", "READY", C_MID),
      ("③ 작업 진행", "PROCESS RUN", C_MID), ("④ 감시", "MONITOR", C_MID),
      ("⑤ 경고", "WARNING", C_WARN), ("⑥ 차단", "BLOCK", C_STOP)]
TR = ["레시피 읽기", "단계 시작", "버튼 구역 진입", "오답 구역 0.3 초", "그래도 누르면"]
for i, (t, en, col) in enumerate(ST):
    x = 70 + i * SP
    bg = {C_GRAY: C_GRAY_BG, C_MID: "#EAF2FA", C_WARN: C_WARN_BG, C_STOP: C_STOP_BG}[col]
    d.box(x, SY, SW, SH, bg, col, 12, 2)
    d.txt(x + SW / 2, SY + 34, t, 22, C_DARK, "bold", "middle")
    d.txt(x + SW / 2, SY + 62, en, 18, col, "bold", "middle")
    if i < 5:
        d.add(f'<line x1="{x+SW+2}" y1="{SY+SH/2}" x2="{x+SP-6}" y2="{SY+SH/2}" '
              f'stroke="{C_GRAY}" stroke-width="2.4" marker-end="url(#ad2)"/>')
        d.txt(x + SW + 14, SY - 12, TR[i], 17, C_SUB, "bold", "middle")

# 되돌아가는 길 세 갈래 — 상자 중심에서 나와 상자 밑면으로 들어간다
#   x 좌표는 상태 상자에서 뽑는다: i 번째 = 70 + i*296 .. +268
BOT = SY + SH                                   # 상자 밑면 = 730
for x1, x2, ymid, lab, col, mk in [
        (1388, 1150, 752, "경고 해제", C_WARN, "aw2"),          # ⑤ → ④
        (1030, 500, 778, "정답을 누르면 → 다음 단계", C_OK, "ag2"),   # ④ → ②
        (1684, 430, 804, "작업자 해제", C_STOP, "ar2")]:         # ⑥ → ②
    d.add(f'<path d="M{x1},{BOT} V{ymid} H{x2} V{BOT+4}" fill="none" stroke="{col}" '
          f'stroke-width="2.2" marker-end="url(#{mk})"/>')
    d.txt((x1 + x2) / 2, ymid - 8, lab, 17, col, "bold", "middle")

# ══ 하드웨어 ════════════════════════════════════════
d.sect(70, 856, "이 셋 위에서 돈다")
HW = [(70, 500, "스마트 글라스", "XIAO ESP32-S3 · OV3660 · 450mAh", "영상과 음성을 보낸다"),
      (640, 620, "라즈베리파이 5 + Hailo-8 NPU", "26 TOPS · INT8 · 온디바이스",
       "인식과 판정을 끝낸다 · 터치 화면 출력"),
      (1330, 520, "아두이노 UNO R4 + 릴레이", "8 채널 모듈 · 5 채널 사용",
       "타워램프 · 부저 · 버튼 입력 차단")]
for x, w, t, s1, s2 in HW:
    d.box(x, 884, w, 116, "#F7F9FB", C_GRAY, 12, 1.8)
    d.txt(x + w / 2, 918, t, 21, C_DARK, "bold", "middle")
    d.txt(x + w / 2, 944, s1, 18, C_SUB, "normal", "middle")
    d.txt(x + w / 2, 970, s2, 18, C_MID, "bold", "middle")
d.add(f'<line x1="574" y1="942" x2="634" y2="942" stroke="{C_MID}" stroke-width="2.6" '
      f'marker-end="url(#ab2)"/>')
d.txt(604, 926, "WiFi", 16, C_MID, "bold", "middle")
d.add(f'<line x1="1264" y1="942" x2="1324" y2="942" stroke="{C_MID}" stroke-width="2.6" '
      f'marker-end="url(#ab2)"/>')
d.txt(1294, 926, "USB", 16, C_MID, "bold", "middle")

args = [a for a in sys.argv[1:] if not a.startswith("--")]
out = args[0] if args else "."
name, hh = "S11_전체구성", H
if REPORT:
    name, hh = "S11_전체구성_보고서", RH
    o = d.o
    d.o = ([f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{RH}" '
            f'viewBox="0 0 {W} {RH}">', f'<rect width="{W}" height="{RH}" fill="#fff"/>',
            o[2], o[3], f'<g transform="translate(0,-{SHIFT})">'] + o[4:] + ['</g>'])
h = os.path.join(out, name + ".html"); d.save(h)
png = os.path.join(out, name + ".png"); render(h, W, hh, png); os.remove(h)
print("생성:", png, f"({W}x{hh})")
