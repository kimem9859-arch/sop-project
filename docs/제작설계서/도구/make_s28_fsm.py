# -*- coding: utf-8 -*-
"""28쪽 알고리즘 명세서 ④ 순서 판정 FSM — 6 상태 전이도.

전이 근거 = Rpi5/Demo/fsm.py
    PROCESS_RUN → MONITOR (구역 진입) · MONITOR → PROCESS_RUN (이탈)      fsm.py:196-201
    MONITOR → WARNING (오답 구역 체류 + 박스 안)                          fsm.py:210-213
    정답 눌림 → 다음 단계(READY→PROCESS_RUN) · 마지막이면 IDLE            fsm.py:238-247
    오답 눌림 → 즉시 BLOCK                                                fsm.py:231-233
    WARNING → MONITOR (경고 해제) · BLOCK → READY (작업자 해제)            fsm.py:262-270
    EMO → 어느 상태에서든 BLOCK                                           fsm.py:250-254
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from svgkit import *
from svg2png import render

d = Doc()
d.add('<defs>'
      '<marker id="aw" markerWidth="11" markerHeight="9" refX="10" refY="4.5" orient="auto">'
      f'<path d="M0,0 L11,4.5 L0,9 Z" fill="{C_WARN}"/></marker>'
      '<marker id="as" markerWidth="11" markerHeight="9" refX="10" refY="4.5" orient="auto">'
      f'<path d="M0,0 L11,4.5 L0,9 Z" fill="{C_STOP}"/></marker>'
      '<marker id="ak" markerWidth="11" markerHeight="9" refX="10" refY="4.5" orient="auto">'
      f'<path d="M0,0 L11,4.5 L0,9 Z" fill="{C_OK}"/></marker></defs>')

# ══ 도입 ════════════════════════════════════════════
d.txt(70, 62, "순서 위반을 어떻게 판정하나 — 여섯 가지 상태로 나눈다", 30, C_DARK, "bold")
d.txt(70, 96, "인식은 AI 가 확률로 하지만 순서 판정은 고정된 규칙이다. "
              "같은 상황이면 언제나 같은 결과가 나오고, 차단한 이유를 설명할 수 있다.", 21, C_SUB)
d.box(70, 118, 1780, 46, C_TINT, C_LINE, 10, 1.2)
for x, k, v in [(92, "상태 기계", "지금 어느 상황인지를 몇 가지로 나눠 두고 정해진 조건에서만 다음으로 넘어가는 방식"),
                (1180, "기대 단계", "지금 눌러야 하는 정답 버튼")]:
    d.txt(x, 148, k, 20, C_DARK, "bold")
    d.txt(x + ew(k, 20) + 22, 148, "= " + v, 20, C_TEXT)

# ══ 상태 상자 ═══════════════════════════════════════
def state(cx, y, w, name, sub, col, bg, h=88):
    d.box(cx - w / 2, y, w, h, bg, col, 14, 2.4)
    d.txt(cx, y + 38, name, 27, col, "bold", "middle")
    d.txt(cx, y + 68, sub, 20, C_SUB, "normal", "middle")

CX, BW = 900, 360
state(CX, 196, BW, "IDLE", "전원 · 완료 대기", C_MID, "#fff")
state(CX, 336, BW, "READY", "단계 입력 대기", C_MID, C_TINT)
state(CX, 476, BW, "PROCESS RUN", "정상 공정 진행", C_MID, C_TINT)
state(CX, 616, BW, "MONITOR", "손 - 구역 감시", C_DARK, "#DEEAF6")
state(760, 800, 300, "WARNING", "시청각 경고", C_WARN, C_WARN_BG)
state(1300, 800, 320, "BLOCK", "버튼 입력 차단", C_STOP, C_STOP_BG)

# ══ 전이 ════════════════════════════════════════════
def path(pts, col=C_MID, mk="ar", dash=None):
    dd = f' stroke-dasharray="{dash}"' if dash else ""
    p = " ".join(("M" if i == 0 else "L") + f"{x},{y}" for i, (x, y) in enumerate(pts))
    d.add(f'<path d="{p}" fill="none" stroke="{col}" stroke-width="2.6"{dd} marker-end="url(#{mk})"/>')

path([(CX, 284), (CX, 332)])
d.txt(CX + 22, 315, "레시피 로드", 20, C_DARK, "bold")
path([(CX, 424), (CX, 472)])
d.txt(CX + 22, 455, "감시 시작", 20, C_DARK, "bold")
path([(CX, 564), (CX, 612)])
d.txt(CX + 22, 595, "손끝이 버튼 구역에 들어옴", 20, C_DARK, "bold")

# MONITOR → PROCESS RUN (구역 이탈)
path([(1080, 644), (1180, 644), (1180, 520), (1084, 520)])
d.txt(1196, 590, "구역 이탈", 20, C_DARK, "bold")

# MONITOR → BLOCK (오답 버튼 눌림)
path([(1080, 688), (1300, 688), (1300, 796)], C_STOP, "as")
d.txt(1318, 742, "오답 버튼을 실제로 누름", 20, C_STOP, "bold")

# MONITOR → READY (정답 눌림 → 다음 단계)
path([(720, 660), (380, 660), (380, 380), (716, 380)], C_OK, "ak")
d.txt(362, 500, "정답 버튼 눌림 → 다음 단계", 20, C_OK, "bold", "end")
d.txt(362, 528, "(마지막 단계면 IDLE)", 19, C_SUB, "normal", "end")

# MONITOR ↔ WARNING
path([(800, 704), (800, 796)], C_WARN, "aw")
d.txt(790, 760, "오답 구역에 0.3 초 머묾", 20, C_WARN, "bold", "end")
path([(872, 800), (872, 708)])
d.txt(886, 760, "경고 해제", 20, C_DARK, "bold")

# WARNING → BLOCK
path([(910, 844), (1136, 844)], C_STOP, "as")
d.txt(1023, 828, "강행하여 누름", 20, C_STOP, "bold", "middle")

# BLOCK → READY (작업자 해제)
path([(1460, 844), (1620, 844), (1620, 380), (1084, 380)])
d.txt(1352, 362, "작업자 해제", 20, C_DARK, "bold", "middle")

d.notes(70, 918, 1790, [
    "비상정지(EMO)는 어느 상태에서든 곧바로 차단으로 간다. 물리 버튼을 되돌려야 풀린다.",
    "정답 구역에 손이 있어도 그것만으로는 넘어가지 않는다 — 실제로 눌러야 다음 단계가 된다.",
    "오답을 눌러 차단되면 해제해도 기대 단계는 그대로다 — 같은 단계를 다시 요구한다.",
])

out = sys.argv[1] if len(sys.argv) > 1 else "."
h = os.path.join(out, "S28_FSM.html"); d.save(h)
png = os.path.join(out, "S28_FSM.png"); render(h, W, H, png); os.remove(h)
print("생성:", png)
