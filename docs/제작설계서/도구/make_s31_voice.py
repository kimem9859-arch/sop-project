# -*- coding: utf-8 -*-
"""32쪽 알고리즘 명세서 ⑦ 음성 파이프라인 — 소형 LLM 이 답을 만들되 사실 카드에 묶인다.

근거 = docs/superpowers/specs/2026-09-07-음성비서-LLM-design.md (B 갈래, 설계 확정)
       docs/superpowers/plans/2026-09-08-음성비서-LLM.md (구현 계획 9태스크)
  §4  구조 — ①②③⑧ 은 그대로, ④사실카드 ⑤LLM ⑥검산 ⑦런타임TTS 가 신규
  §5  사실 카드 — 라벨을 축약하지 않는다 · 부재를 명시한다
  §6  프롬프트 계약 — 사실에만 근거 · 스스로 허가하지 않는다 · 두 문장
  §7  재생 직전 검산 — 문장에 나온 사실만 대조
  §10 모든 실패의 착지점이 고정 wav
통합문서 §10.62 = 측정 정본
  (2) 사실 카드는 prefill 에 거의 공짜 — 625토큰이 72토큰보다 빨랐다
  (4) 답변 길이가 지배 변수 · 두 문장 5.3~5.4초 · 길이 제한은 안전 장치
  (6) 🔴 라벨을 줄이자 다음 단계를 현재로 답했다
  (8) pi2 gemma4:e2b-it-qat · RTT 0.678ms
A 갈래 실측(§10.61) = 뒤 무음 0.4초 · STT 53~211ms · 앞 두 글자 「가디」
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from svgkit import *
from svg2png import render

d = Doc()
d.add('<defs>'
      '<marker id="ao" markerWidth="11" markerHeight="9" refX="10" refY="4.5" orient="auto">'
      f'<path d="M0,0 L11,4.5 L0,9 Z" fill="{C_OK}"/></marker>'
      '<marker id="aw" markerWidth="11" markerHeight="9" refX="10" refY="4.5" orient="auto">'
      f'<path d="M0,0 L11,4.5 L0,9 Z" fill="{C_WARN}"/></marker>'
      '<marker id="as2" markerWidth="11" markerHeight="9" refX="10" refY="4.5" orient="auto">'
      f'<path d="M0,0 L11,4.5 L0,9 Z" fill="{C_STOP}"/></marker>'
      '<marker id="ah" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">'
      f'<path d="M0,0 L10,4 L0,8 Z" fill="{C_GRAY}"/></marker></defs>')

# ══ 머리 ════════════════════════════════════════════
d.txt(70, 62, "묻는 말에 문장을 만들어 답한다", 30, C_DARK, "bold")
d.txt(70, 96, "소형 LLM 이 그 자리에서 문장을 만든다. 대신 「사실 카드」 밖으로는 한 발도 못 나가게 묶는다.", 21, C_SUB)
d.box(70, 118, 1780, 46, C_TINT, C_LINE, 10, 1.2)
for x, k, v in [(92, "소형 LLM", "인터넷 없이 기기 안에서 도는 작은 언어 모델"),
                (860, "사실 카드", "지금 작업 상태를 적어 LLM 에게 건네는 쪽지")]:
    d.txt(x, 148, k, 20, C_DARK, "bold")
    d.txt(x + ew(k, 20) + 22, 148, "= " + v, 20, C_TEXT)

# ══ 파이프라인 ══════════════════════════════════════
d.sect(70, 212, "파이프라인 — 일곱 단계")

SW, SP, SY, SH = 238, 257, 270, 150
STAGE = [
    ("발화만 자른다",       "뒤 무음 0.4 초",      C_MID),
    ("글자로 바꾼다",       "53 ~ 211 ms",         C_MID),
    ("무슨 말인지 가른다",   "앞 두 글자 「가디」",   C_MID),
    ("사실 카드를 만든다",   "세 곳에서 모은다",     C_DARK),
    ("LLM 이 문장을 만든다", "파이 2 · 5 ~ 7 초",   C_WARN),
    ("재생 직전 검산",      "어긋나면 버린다",      C_DARK),
    ("음성으로 들려준다",    "그 자리에서 합성",     C_OK),
]
# 묶음 배경 — 무엇이 코드고 무엇이 LLM 인가
d.box(60, 240, 770, 192, "#FAFCFE", C_LINE, 14, 1.4)
d.txt(76, 262, "듣는다 — 정해진 규칙이 판단한다", 19, C_SUB, "bold")
d.box(833, 240, 1029, 192, "#FEFAF7", "#EAD4C4", 14, 1.4)
d.txt(849, 262, "답한다 — 🆕 소형 LLM 갈래", 19, C_WARN, "bold")

for i, (name, val, col) in enumerate(STAGE):
    x = 70 + i * SP
    star = (i == 4)
    d.box(x, SY, SW, SH, "#fff", col, 14, 3.0 if star else 2.0)
    d.add(f'<circle cx="{x+SW/2}" cy="{SY+34}" r="19" fill="{col}"/>')
    d.txt(x + SW / 2, SY + 42, str(i + 1), 22, "#fff", "bold", "middle")
    for j, ln in enumerate(wrap(name, 19, SW - 26)):
        d.txt(x + SW / 2, SY + 84 + j * 24, ln, 19, C_DARK, "bold", "middle")
    d.box(x + 16, SY + SH - 44, SW - 32, 32, C_TINT if not star else C_WARN_BG,
          "#DCE8F4" if not star else "#EAD4C4", 8, 1.2)
    d.txt(x + SW / 2, SY + SH - 22, val, 17, col, "bold", "middle")
    if i < 6:
        d.add(f'<line x1="{x+SW+2}" y1="{SY+SH/2}" x2="{x+SP-6}" y2="{SY+SH/2}" '
              f'stroke="{C_GRAY}" stroke-width="2.4" marker-end="url(#ah)"/>')

# ══ 사실 카드 ═══════════════════════════════════════
d.sect(70, 478, "LLM 에게 주는 것은 이 쪽지 하나뿐이다")

CY, CH = 506, 300
d.box(70, CY, 890, CH, "#FBFCFD", C_DARK, 14, 2.2)
d.add(f'<rect x="70" y="{CY}" width="7" height="{CH}" rx="3.5" fill="{C_DARK}"/>')
d.txt(100, CY + 36, "[ 사실 ]", 20, C_DARK, "bold")
CARD = [
    "작업 : PECVD 정비(PM) 시퀀스 · 전체 4 단계 · 진행 중 (경과 3 분 12 초)",
    "현재 진행 중인 단계 : 2 단계 「펌프/퍼지」 · 지금 눌러야 할 버튼 B2",
    "상태 : 정상 (경고 없음, 차단 없음)",
    "그 다음에 올 단계 : 3 단계 「전극 냉각」 · 버튼 B3",
    "2 단계의 서브작업 : N2 퍼지 10 초 · 2 단계에 필요한 공구 = 렌치",
    "카메라에 지금 보이는 공구 : 렌치 (신뢰도 0.44)",
    "지금까지 : 완료 1 단계 · 순서 위반 0 회 · 차단 0 회",
]
for i, ln in enumerate(CARD):
    d.txt(100, CY + 74 + i * 27, ln, 17, C_TEXT)
d.add(f'<line x1="100" y1="{CY+248}" x2="930" y2="{CY+248}" stroke="{C_LINE}" stroke-width="1.2"/>')
d.txt(100, CY + 276, "세 곳에서 모은다 — 화면이 내보낸 진행 상태 · 카메라 공구 검출 · 작업 절차서", 18, C_SUB)

# ══ 지어내지 못하게 하는 세 가지 ════════════════════
RX, RW = 990, 860
for i, (t, s, col, bg) in enumerate([
        ("라벨을 줄여 쓰지 않는다",
         "「현재 :」로 줄였더니 다음 단계를 현재로 답했다. 카드 내용은 같았고 라벨만 달랐다.",
         C_STOP, C_STOP_BG),
        ("없는 것은 없다고 적는다",
         "빈칸을 두면 지어낸다. 「지금은 공구를 확인하는 단계가 아니다」라고 적어 준다.",
         C_WARN, C_WARN_BG),
        ("카드에 없으면 답하지 않는다",
         "「3 번 밸브 규정 토크가 몇이야?」 → 「확인할 수 없습니다」",
         C_OK, C_OK_BG)]):
    y = CY + i * 104
    d.box(RX, y, RW, 92, bg, col, 12, 2)
    d.txt(RX + 22, y + 36, t, 22, col, "bold")
    for j, ln in enumerate(wrap(s, 18, RW - 44)):
        d.txt(RX + 22, y + 64 + j * 24, ln, 18, C_TEXT)

# ══ 검산과 폴백 ═════════════════════════════════════
d.sect(70, 838, "만든 문장을 바로 들려주지 않는다 — 5 ~ 7 초 사이에 상황이 바뀔 수 있다")

# 앞의 두 칸은 차례로, 뒤의 두 칸은 검산에서 갈라진다
for x, t, sub, col, bg in [(70, "LLM 이 만든 문장", "5 ~ 7 초가 걸렸다", C_WARN, C_WARN_BG),
                           (523, "재생 직전 검산", "문장에 나온 사실만 다시 본다", C_DARK, "#fff")]:
    d.box(x, 866, 420, 82, bg, col, 12, 2.2)
    d.txt(x + 22, 902, t, 21, col, "bold")
    d.txt(x + 22, 930, sub, 18, C_SUB)
d.add(f'<line x1="494" y1="907" x2="515" y2="907" stroke="{C_GRAY}" '
      f'stroke-width="2.4" marker-end="url(#ah)"/>')

for y, t, sub, col, bg, mk in [(862, "같다", "만든 문장을 그대로 들려준다", C_OK, C_OK_BG, "ao"),
                               (926, "다르다", "미리 만들어 둔 고정 음성으로 바꾼다", C_STOP, C_STOP_BG, "as2")]:
    d.box(996, y, 854, 58, bg, col, 12, 2.2)
    d.txt(1018, y + 37, t, 21, col, "bold")
    d.txt(1018 + ew(t, 21) + 24, y + 37, "→   " + sub, 18, C_TEXT)
    # 검산 상자에서 갈라져 나온다
    d.add(f'<path d="M947,907 L971,907 L971,{y+29} L988,{y+29}" fill="none" '
          f'stroke="{col}" stroke-width="2.4" marker-end="url(#{mk})"/>')

d.txt(70, 1014, "• 그 사이 작업자가 다음 버튼을 눌렀다면, 만들어 둔 문장은 이미 틀린 답이 된다.", 19, C_SUB)
d.txt(70, 1044, "• 어디서 실패하든 착지점은 같다 — 모델이 안 붙어도, 시간이 넘어도, 검산이 어긋나도 미리 만든 음성이 답한다.", 19, C_SUB)

out = sys.argv[1] if len(sys.argv) > 1 else "."
h = os.path.join(out, "S31_음성파이프라인.html"); d.save(h)
png = os.path.join(out, "S31_음성파이프라인.png"); render(h, W, H, png); os.remove(h)
print("생성:", png)
