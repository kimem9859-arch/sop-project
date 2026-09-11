# -*- coding: utf-8 -*-
"""24쪽 기능 처리도 ③ 음성 비서 — 장치 배치와 오가는 길.

근거 = 개발보고서 Ⅱ-1-1) "[2] pi-2 — STT·LLM·TTS 전담, 비전 연산과 부하 분리"
       Ⅱ-3-9) LLM 은 판정이 끝난 사실만 받는다 · 출력 검증
       14쪽 하드웨어/센서 구성도 (글라스⇄WiFi⇄pi-1, pi-1—LAN→pi-2)
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from svgkit import *
from svg2png import render

d = Doc()
d.add('<defs>'
      '<marker id="ag" markerWidth="11" markerHeight="9" refX="10" refY="4.5" orient="auto">'
      f'<path d="M0,0 L11,4.5 L0,9 Z" fill="{C_OK}"/></marker>'
      '<marker id="agr" markerWidth="11" markerHeight="9" refX="1" refY="4.5" orient="auto">'
      f'<path d="M11,0 L0,4.5 L11,9 Z" fill="{C_OK}"/></marker>'
      '<marker id="amr" markerWidth="11" markerHeight="9" refX="1" refY="4.5" orient="auto">'
      f'<path d="M11,0 L0,4.5 L11,9 Z" fill="{C_MID}"/></marker></defs>')

d.txt(70, 62, "음성 처리는 왜 파이를 하나 더 두었나", 30, C_DARK, "bold")
d.txt(70, 96, "말을 알아듣고 답하는 일은 무겁다. 비전 파이가 그 일까지 하면 영상 처리가 무너진다.", 21, C_SUB)
d.box(70, 118, 1780, 46, C_TINT, C_LINE, 10, 1.2)
for x, k, v in [(92, "STT", "말을 글자로 바꾸는 것"),
                (700, "TTS", "글자를 말소리로 바꾸는 것"),
                (1330, "부하 분리", "무거운 일을 다른 기계에 맡기는 것")]:
    d.txt(x, 148, k, 20, C_DARK, "bold")
    d.txt(x + ew(k, 20) + 22, 148, "= " + v, 20, C_TEXT)

d.sect(70, 216, "장치 셋이 나눠 맡는다")

BOX = [(70, 450, "스마트 글라스", "ESP32-S3 · 무선", C_MID, "#fff",
        [("마이크 (내장 PDM)", "작업자의 말을 받는다"),
         ("앰프 + 스피커", "답을 귀 옆에서 들려준다")],
        "받고 들려주기만 한다"),
       (720, 480, "파이 1", "비전 · 순서 판정", C_DARK, C_TINT,
        [("음성은 거쳐 갈 뿐", "알아듣는 일은 하지 않는다"),
         ("사실을 넘겨준다", "현재 단계 · 필요 공구 · 검출 상태")],
        "판정은 여기서 끝난다"),
       (1400, 450, "파이 2", "음성 전담", C_OK, C_OK_BG,
        [("STT", "말을 글자로"),
         ("답변 생성 · 검증", "받은 사실만 근거로"),
         ("TTS", "글자를 말소리로")],
        "비전과 자원을 다투지 않는다")]
BY, BH = 250, 420
for x, w, title, sub, col, bg, items, foot in BOX:
    d.box(x, BY, w, BH, bg, col, 16, 2.4)
    d.txt(x + w / 2, BY + 46, title, 28, col, "bold", "middle")
    d.txt(x + w / 2, BY + 78, sub, 19, C_SUB, "normal", "middle")
    yy = BY + 116
    for t, s in items:
        d.box(x + 24, yy, w - 48, 74, "#fff", col, 10, 1.4)
        d.txt(x + 42, yy + 32, t, 21, C_DARK, "bold")
        d.txt(x + 42, yy + 58, s, 18, C_SUB)
        yy += 88
    d.txt(x + w / 2, BY + BH - 22, foot, 19, col, "bold", "middle")

def link(x1, x2, y, lab, col=C_MID, mk="ar", back=False):
    """back=True 면 오른쪽에서 왼쪽으로 그린다 (화살촉은 왼쪽 끝)."""
    if back:
        d.add(f'<line x1="{x2}" y1="{y}" x2="{x1}" y2="{y}" stroke="{col}" stroke-width="3" '
              f'marker-end="url(#{mk})"/>')
    else:
        d.add(f'<line x1="{x1}" y1="{y}" x2="{x2}" y2="{y}" stroke="{col}" stroke-width="3" '
              f'marker-end="url(#{mk})"/>')
    d.txt((x1 + x2) / 2, y - 14, lab, 19, col, "bold", "middle")

link(524, 716, 330, "음성 · WiFi")
link(1204, 1396, 330, "음성 · LAN")
link(524, 716, 600, "답변 음성", C_OK, "ag", back=True)
link(1204, 1396, 600, "답변 음성", C_OK, "ag", back=True)
d.add(f'<line x1="1204" y1="460" x2="1396" y2="460" stroke="{C_DARK}" stroke-width="3" '
      f'marker-end="url(#ar)"/>')
d.add(f'<line x1="1396" y1="486" x2="1204" y2="486" stroke="{C_DARK}" stroke-width="3" '
      f'marker-end="url(#ar)"/>')
d.txt(1300, 444, "사실 요청", 19, C_DARK, "bold", "middle")
d.txt(1300, 516, "응답", 19, C_DARK, "bold", "middle")

d.notes(70, 720, 1790, [
    "왜 나눴나 — 말을 알아듣고 답하는 일은 무겁다. 한 대가 다 하면 영상 추적이 무너진다.",
    "순서 판정은 파이 1 이 한다. 파이 2 는 끝난 판정을 말로 바꿀 뿐이다.",
    "글라스는 무선 하나로 영상과 음성을 함께 보낸다.",
])

out = sys.argv[1] if len(sys.argv) > 1 else "."
h = os.path.join(out, "S24_음성비서.html"); d.save(h)
png = os.path.join(out, "S24_음성비서.png"); render(h, W, H, png); os.remove(h)
print("생성:", png)
