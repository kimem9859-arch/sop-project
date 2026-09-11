# -*- coding: utf-8 -*-
"""30쪽 알고리즘 명세서 ⑥ 공구 확인 — 네 가지 장면으로 판정 규칙을 보인다.

근거 = Rpi5/Demo/tool_state.py · config.py · camera_thread.py
🔴 런타임 모델은 `tool_v3.pt` 다 (config.py:414) — 클래스 3 종(driver·wrench·pliers),
   `-in-hand` 접미어가 없다. 접미어는 tool_v4 부터이고 tool_v4 는 미채택이다
   (`models/` 에 `tool_v4_partial_e31·e38.pt` 만 있다 · tool_state.py:39 주석).
   그래서 tool_v3 에서는 `_in_hand_tool()` 이 늘 None 이고,
   **검지 끝이 요구 공구 상자 안인가** 하나로 판정한다.

    손이 안 보이면 판정하지 않는다                       tool_state.py:88-89
    검지 끝이 상자 안이면 쥔 것으로 본다                 tool_state.py:99-101
    한 번 확정되면 유지 / 요구 공구 근거 없을 때만 오답    tool_state.py:85, 105
    검출 임계 0.65 · 스캔 1 초 · 추론 약 0.5 초           config.py:409-411
    공구만 NPU 를 쓰지 않는다 — `.hef` 가 없다           models/ 실측
    wait_tool 서브 작업 동안에만 돈다                     camera_thread.py:242
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from svgkit import *
from svg2png import render

MONO = "'DejaVu Sans Mono', Consolas, monospace"
d = Doc()

d.txt(70, 62, "공구를 손에 쥐었는지 어떻게 확인하나", 30, C_DARK, "bold")
d.txt(70, 96, "검지 끝이 어느 공구 상자에 들어왔는지로 가른다. 손이 안 보이면 아무 판정도 하지 않는다.", 21, C_SUB)
d.box(70, 118, 1780, 46, C_TINT, C_LINE, 10, 1.2)
for x, k, v in [(92, "서브 작업", "버튼을 누른 뒤 채워야 넘어가는 조건"),
                (900, "검지 끝", "손 관절 21 점 가운데 8 번 — 물건을 잡는 지점")]:
    d.txt(x, 148, k, 20, C_DARK, "bold")
    d.txt(x + ew(k, 20) + 22, 148, "= " + v, 20, C_TEXT)

d.sect(70, 216, "검지 끝이 어디에 있느냐로 갈린다")
d.box(1560, 194, 290, 38, C_OK_BG, C_OK, 19, 1.6)
d.txt(1705, 220, "요구 공구 = 렌치", 21, C_OK, "bold", "middle")

# ══ 판정 사례 4 장 ══════════════════════════════════
CASES = [
    ("손이 안 보인다", [("wrench", "0.81", C_MID)], None,
     "판정하지 않는다", C_GRAY, C_GRAY_BG,
     "배경 오검출은 손 없는 화면에서 난다."),
    ("어느 공구에도 안 닿음", [("wrench", "0.78", C_MID)], "어느 상자에도 없다",
     "계속 찾는다", C_MID, C_TINT,
     "놓여 보이는 것과 쥔 것은 다르다."),
    ("요구 공구 상자 안", [("wrench", "0.74", C_OK)], "렌치 상자 안",
     "통과", C_OK, C_OK_BG,
     "한 번 확정되면 그대로 유지한다."),
    ("다른 공구 상자 안", [("driver", "0.69", C_WARN)], "드라이버 상자 안",
     "오답 공구 안내", C_WARN, C_WARN_BG,
     "요구 공구 근거가 없을 때만 말한다."),
]
CW, CG, CY, CH = 430, 20, 250, 386
for i, (title, dets, tip, verdict, vcol, vbg, why) in enumerate(CASES):
    x = 70 + i * (CW + CG)
    d.box(x, CY, CW, CH, "#fff", "#D9E3EC", 16, 1.6)
    d.add(f'<rect x="{x}" y="{CY}" width="{CW}" height="62" rx="16" fill="{vbg}"/>')
    d.add(f'<rect x="{x}" y="{CY+40}" width="{CW}" height="22" fill="{vbg}"/>')
    d.add(f'<circle cx="{x+34}" cy="{CY+31}" r="17" fill="{vcol}"/>')
    d.txt(x + 34, CY + 39, str(i + 1), 19, "#fff", "bold", "middle")
    d.txt(x + 62, CY + 40, title, 23, C_DARK, "bold")

    d.txt(x + 22, CY + 100, "모델이 내놓은 것", 18, C_SUB)
    yy = CY + 116
    for name, score, col in dets:
        d.add(f'<rect x="{x+22}" y="{yy}" width="{CW-44}" height="46" rx="8" fill="#F7F9FB" '
              f'stroke="{col}" stroke-width="1.6"/>')
        d.add(f'<text x="{x+38}" y="{yy+31}" font-family="{MONO}" font-size="21" '
              f'fill="{col}" font-weight="bold">{name}</text>')
        d.add(f'<text x="{x+CW-38}" y="{yy+31}" font-family="{MONO}" font-size="21" '
              f'fill="{C_SUB}" text-anchor="end">{score}</text>')
        yy += 56
    hc, hb, ht = ((C_MID, "#EAF2FA", "검지 끝 — " + tip) if tip
                  else ("#A9B6C2", C_GRAY_BG, "손 — 화면에 없다"))
    d.add(f'<rect x="{x+22}" y="{yy}" width="{CW-44}" height="42" rx="21" fill="{hb}" '
          f'stroke="{hc}" stroke-width="1.4"/>')
    d.txt(x + CW / 2, yy + 28, ht, 18, hc if tip else "#7A8894", "bold", "middle")

    d.add(f'<line x1="{x+CW/2}" y1="{CY+242}" x2="{x+CW/2}" y2="{CY+266}" stroke="#9AA9B6" '
          f'stroke-width="2.4" marker-end="url(#arg)"/>')
    d.add(f'<rect x="{x+22}" y="{CY+278}" width="{CW-44}" height="56" rx="12" fill="{vbg}" '
          f'stroke="{vcol}" stroke-width="2"/>')
    d.txt(x + CW / 2, CY + 314, verdict, 24, vcol, "bold", "middle")
    for j, ln in enumerate(wrap(why, 19, CW - 48)):
        d.txt(x + 24, CY + 358 + j * 24, ln, 19, C_SUB)

# ══ 값 (가로 한 줄) ═════════════════════════════════
d.sect(70, 690, "값")
VALS = [("검출 임계", "0.65"), ("스캔 주기", "1 초에 한 번"),
        ("추론 1 회", "약 0.5 초"), ("도는 곳", "파이 CPU — NPU 안 씀")]
for i, (k, v) in enumerate(VALS):
    x = 70 + i * (CW + CG)
    d.box(x, 718, CW, 78, C_TINT, C_MID, 12, 1.5)
    d.txt(x + 24, 750, k, 19, C_SUB)
    d.txt(x + 24, 780, v, 23, C_DARK, "bold")

d.notes(70, 838, 1790, [
    "「공구가 안 보인다」로는 아무 판정도 하지 않는다 — 없는 것과 못 본 것은 구별되지 않는다.",
    "공구 지참 서브 작업 동안에만 돈다. 늘 돌리면 영상 처리와 자원을 다툰다.",
    "추론 0.5 초 사이에 손이 움직인다. 요청할 때의 손끝 좌표를 기억해 짝지어 판정한다.",
])

out = sys.argv[1] if len(sys.argv) > 1 else "."
h = os.path.join(out, "S30_공구확인.html"); d.save(h)
png = os.path.join(out, "S30_공구확인.png"); render(h, W, H, png); os.remove(h)
print("생성:", png)
