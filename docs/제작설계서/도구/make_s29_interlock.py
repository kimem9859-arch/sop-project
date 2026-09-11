# -*- coding: utf-8 -*-
"""29쪽 알고리즘 명세서 ⑤ 인터락 명령 · 응답 확인.

근거 = Rpi5/Demo/interlock.py · config.py · arduino/console_interlock.ino
    명령 3종 RUN/WARN/BLOCK (interlock.py:36-40)
    ACK 대기 1.0초 (config INTERLOCK_TIMEOUT)
    BLOCK 만 재시도 2회 (config INTERLOCK_BLOCK_ACK_RETRIES)
    재연결 시 마지막 명령 재송신 (interlock.py:119-128)
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from svgkit import *
from svg2png import render

MONO = "'DejaVu Sans Mono', Consolas, monospace"
d = Doc()

# ══ 도입 ════════════════════════════════════════════
d.txt(70, 62, "차단 명령이 실제로 닿았는지 어떻게 확인하나", 30, C_DARK, "bold")
d.txt(70, 96, "보내기만 하고 끝내면 케이블이 빠져 있어도 차단된 줄 안다. "
              "그래서 「받았다」는 회신을 받아야 차단이 성립한 것으로 본다.", 21, C_SUB)
d.box(70, 118, 1780, 46, C_TINT, C_LINE, 10, 1.2)
for x, k, v in [(92, "인터락", "오답 버튼을 눌러도 신호가 들어가지 않게 버튼 입력을 물리적으로 끊는 장치"),
                (860, "ACK", "제어 보드가 「명령을 받았다」고 보내는 회신 한 줄")]:
    d.txt(x, 148, k, 20, C_DARK, "bold")
    d.txt(x + ew(k, 20) + 22, 148, "= " + v, 20, C_TEXT)

# ══ 왼쪽 · 명령 3종 ═════════════════════════════════
d.sect(70, 216, "보내는 명령은 세 가지뿐")
CMD = [("RUN",   C_OK,   C_OK_BG,   "정상 진행 중",         "타워램프 녹색",          "그대로 동작"),
       ("WARN",  C_WARN, C_WARN_BG, "순서 위반 경고",        "타워램프 황색",          "그대로 동작"),
       ("BLOCK", C_STOP, C_STOP_BG, "오답 버튼을 눌렀을 때",  "타워램프 적색 + 부저",   "릴레이로 끊는다")]
y = 244
for name, col, bg, when, lamp, elec in CMD:
    d.box(70, y, 860, 132, bg, col, 14, 2)
    d.add(f'<rect x="70" y="{y}" width="9" height="132" rx="4" fill="{col}"/>')
    d.add(f'<text x="112" y="{y+56}" font-family="{MONO}" font-size="38" fill="{col}" '
          f'font-weight="bold">{name}</text>')
    d.txt(112, y + 96, when, 21, C_SUB)
    d.txt(390, y + 50, "타워램프", 19, C_SUB); d.txt(390, y + 82, lamp, 22, C_TEXT, "bold")
    d.txt(660, y + 50, "버튼 입력", 19, C_SUB); d.txt(660, y + 82, elec, 22, C_TEXT, "bold")
    y += 152

d.box(70, 706, 860, 116, C_TINT, C_LINE, 12, 1.4)
d.txt(94, 744, "보내는 방식", 21, C_DARK, "bold")
d.add(f'<text x="230" y="746" font-family="{MONO}" font-size="24" fill="{C_TEXT}">'
      f'"BLOCK\\n"</text>')
d.txt(400, 744, "글자 그대로 한 줄 · USB 시리얼 115200 bps", 20, C_SUB)
d.txt(94, 792, "같은 명령이 이어지면 보내지 않는다 — 같은 상태를 되풀이 전송하지 않는다.", 20, C_SUB)

# ══ 오른쪽 · 판정 흐름 ══════════════════════════════
RX = 990
d.sect(RX, 216, "BLOCK 만 회신을 끝까지 확인한다")
CXm = 1330

def rect(cx, y, w, h, s, col, bg, fs=23):
    d.box(cx - w / 2, y, w, h, bg, col, 10, 2)
    d.txt(cx, y + h / 2 + fs * 0.36, s, fs, col, "bold", "middle")

def dia(cx, cy, w, h, l1, l2=None):
    d.add(f'<polygon points="{cx},{cy-h/2} {cx+w/2},{cy} {cx},{cy+h/2} {cx-w/2},{cy}" '
          f'fill="#EAF2FA" stroke="{C_MID}" stroke-width="2"/>')
    if l2:
        d.txt(cx, cy - 4, l1, 21, C_DARK, "bold", "middle")
        d.txt(cx, cy + 24, l2, 21, C_DARK, "bold", "middle")
    else:
        d.txt(cx, cy + 8, l1, 21, C_DARK, "bold", "middle")

def arr(x1, y1, x2, y2, lab=None, lx=0, ly=0):
    d.add(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{C_MID}" '
          f'stroke-width="2.4" marker-end="url(#ar)"/>')
    if lab:
        d.txt((x1 + x2) / 2 + lx, (y1 + y2) / 2 + ly, lab, 20, C_DARK, "bold", "middle")

rect(CXm, 248, 330, 58, "BLOCK 전송", C_MID, "#fff")
arr(CXm, 306, CXm, 336)
dia(CXm, 400, 400, 116, "1 초 안에", "ACK 가 왔나?")
arr(CXm + 200, 400, 1660, 400, "예", 0, -14)
rect(1780, 372, 220, 56, "차단 성립", C_OK, C_OK_BG, 22)
arr(CXm, 458, CXm, 500, "아니오", -56, 4)
dia(CXm, 566, 430, 116, "다시 보낼 기회가", "남았나?  (최대 2 번)")
arr(CXm - 215, 566, 1080, 566, "예", 0, -14)
d.add(f'<path d="M1080,566 L1030,566 L1030,248 L{CXm-165},248" fill="none" stroke="{C_MID}" '
      f'stroke-width="2.4" marker-end="url(#ar)"/>')
d.txt(1046, 400, "다시 보낸다", 20, C_DARK, "bold", "middle")
arr(CXm, 624, CXm, 666, "아니오", -46, 4)
rect(CXm, 666, 470, 58, "차단 미확인 — 이상 알림", C_STOP, C_STOP_BG, 22)
d.txt(CXm, 750, "처음 1 번 + 다시 2 번 = 모두 3 번 보내고도 회신이 없을 때", 20, C_SUB, "normal", "middle")
d.txt(CXm, 776, "배선과 제어 보드를 점검하라고 화면에 띄운다", 20, C_SUB, "normal", "middle")

d.box(RX, 802, 860, 118, "#F7F9FB", "#D9E3EC", 12, 1.4)
d.add(f'<rect x="{RX}" y="802" width="6" height="118" rx="3" fill="#9AA9B6"/>')
d.txt(RX + 24, 836, "케이블이 빠졌다 다시 붙으면", 21, C_DARK, "bold")
d.txt(RX + 24, 868, "마지막에 보낸 명령을 다시 보낸다 — 차단 중이었다면 차단이 그대로 유지된다.", 20, C_SUB)
d.txt(RX + 24, 900, "연결이 끊기면 3 초마다 다시 붙여 본다.", 20, C_SUB)

# ══ 아래 ════════════════════════════════════════════
d.notes(70, 940, 1790, [
    "RUN · WARN 은 안 닿아도 램프가 늦게 바뀔 뿐이다. BLOCK 은 안 닿으면 오답 버튼이 먹힌다.",
    "제어 보드는 어떤 명령이든 ACK 를 회신한다. ACK 가 없으면 연결이 끊긴 것이다.",
])

out = sys.argv[1] if len(sys.argv) > 1 else "."
h = os.path.join(out, "S29_인터락명령.html"); d.save(h)
png = os.path.join(out, "S29_인터락명령.png"); render(h, W, H, png); os.remove(h)
print("생성:", png)
