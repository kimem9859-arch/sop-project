# -*- coding: utf-8 -*-
"""37쪽 하드웨어 설계도 — 핀 배정표 (라즈베리파이 + 아두이노).

근거 = dev/interlock/결선도_초안.md §3.1·§3.2 ·
       Rpi5/arduino/console_interlock/console_interlock.ino:11-16
    Pi   GPIO5(29) B1 · GPIO6(31) B2 · GPIO13(33) B3 · GPIO19(35) B4 · GPIO26(37) EMO
    Ard  D7→IN1 적 · D6→IN2 황 · D5→IN3 녹 · D4→IN4 부저 · D3→IN5 버튼 공통 GND 차단
🔴 뺀 것 — 「GPIO 외 연결」(14쪽 하드웨어/센서 구성도와 중복) · 내부 문서 경로 표기
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from svgkit import *
from svg2png import render

MONO = "'DejaVu Sans Mono', Consolas, monospace"
d = Doc()
d.add('<defs><marker id="aw2" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">'
      f'<path d="M0,0 L10,4 L0,8 Z" fill="{C_SUB}"/></marker></defs>')

d.txt(70, 62, "어느 핀에 무엇이 물리나", 30, C_DARK, "bold")
d.txt(70, 96, "버튼은 파이의 GPIO 로 들어오고, 램프와 차단은 아두이노의 디지털 핀에서 나간다.", 21, C_SUB)
d.box(70, 118, 1780, 46, C_TINT, C_LINE, 10, 1.2)
for x, k, v in [(92, "INPUT_PULLUP", "평소 HIGH 로 띄워 두고 눌리면 LOW 가 되는 입력 방식"),
                (1080, "NC 쌍", "평소 붙어 있는 접점 — 선이 끊겨도 비상으로 본다")]:
    d.txt(x, 148, k, 20, C_DARK, "bold")
    d.txt(x + ew(k, 20) + 22, 148, "= " + v, 20, C_TEXT)

# ══ 열 1 — 모조 콘솔 입력부 · 결선 규칙 ══════════════
d.sect(70, 212, "콘솔 입력부")
BTN = [("B1", "#F2C744", "클린 · 가스차단", "GPIO5", "29"),
       ("B2", "#F0F0F0", "펌프 / 퍼지", "GPIO6", "31"),
       ("B3", "#EE9BB5", "전극 냉각", "GPIO13", "33"),
       ("B4", "#2E3338", "챔버 벤트", "GPIO19", "35"),
       ("EMO", "#C0504D", "비상정지", "GPIO26", "37")]
for i, (n, c, name, gp, phys) in enumerate(BTN):
    y = 240 + i * 58
    col = C_STOP if n == "EMO" else C_MID
    d.box(70, y, 490, 50, "#fff", col, 10, 1.6)
    d.add(f'<circle cx="98" cy="{y+25}" r="13" fill="{c}" stroke="#9AA9B6" stroke-width="1.4"/>')
    d.txt(122, y + 32, n, 20, col, "bold")
    d.txt(180, y + 32, name, 19, C_SUB)
    d.add(f'<text x="378" y="{y+32}" font-family="{MONO}" font-size="19" fill="{C_DARK}" '
          f'font-weight="bold">{gp}</text>')
    d.txt(544, y + 32, f"물리 {phys}", 18, C_SUB, "normal", "end")
d.txt(70, 556, "B4 는 검정 버튼에 파랑 원 스티커 — 색으로 구분한다", 18, C_SUB)

d.sect(70, 620, "결선 규칙")
RULE = [("버튼 · EMO", "한쪽 → GPIO, 반대쪽 → 공통 GND"),
        ("입력 방식", "INPUT_PULLUP · 눌림 = LOW"),
        ("EMO 접점", "NC 쌍 — 누름 · 단선 = HIGH (fail-safe)"),
        ("공통 GND", "버튼 4 개를 한 가닥으로 묶어 물리 25 번으로"),
        ("절연", "3.3V 로직과 12V 부하는 릴레이 접점으로 분리"),
        ("EMO GND", "버튼과 묶지 않는다 — 차단 중에도 산다")]
for i, (k, v) in enumerate(RULE):
    y = 650 + i * 40
    d.add(f'<rect x="70" y="{y}" width="490" height="34" fill="{"#fff" if i%2 else C_TINT}"/>')
    d.txt(86, y + 24, k, 18, C_DARK, "bold")
    d.txt(206, y + 24, v, 17, C_SUB)

# ══ 열 2 — 라즈베리파이 40핀 헤더 ════════════════════
d.sect(620, 212, "라즈베리파이 5 — 40 핀 헤더")
d.txt(620, 244, "GPIO 28 개 가운데 5 개만 쓴다 · 23 개는 확장 여유", 19, C_SUB)
PINS = [("3V3","5V"),("GPIO2","5V"),("GPIO3","GND"),("GPIO4","GPIO14"),("GND","GPIO15"),
        ("GPIO17","GPIO18"),("GPIO27","GND"),("GPIO22","GPIO23"),("3V3","GPIO24"),
        ("GPIO10","GND"),("GPIO9","GPIO25"),("GPIO11","GPIO8"),("GND","GPIO7"),
        ("ID_SD","ID_SC"),("GPIO5","GND"),("GPIO6","GPIO12"),("GPIO13","GND"),
        ("GPIO19","GPIO16"),("GPIO26","GPIO20"),("GND","GPIO21")]
USE = {29: ("B1", C_MID), 31: ("B2", C_MID), 33: ("B3", C_MID),
       35: ("B4", C_MID), 37: ("EMO", C_STOP), 25: ("공통 GND", C_OK)}
PY_, RH = 274, 26
CXL, CXR = 918, 950
for r, (lp, rp) in enumerate(PINS):
    y = PY_ + r * RH
    for side, name, n in ((0, lp, r*2+1), (1, rp, r*2+2)):
        used = USE.get(n)
        gnd = name == "GND"
        pwr = name in ("3V3", "5V")
        bg = ("#EEF6EA" if (used and used[1] == C_OK) else
              ("#EAF2FA" if used else ("#E9EDF1" if gnd else ("#FDF0E4" if pwr else "#F8F9FA"))))
        bc = (used[1] if used else "#DDE3E9")
        x0 = 620 if side == 0 else 982
        d.add(f'<rect x="{x0}" y="{y}" width="282" height="22" rx="4" fill="{bg}" '
              f'stroke="{bc}" stroke-width="{1.6 if used else 0.8}"/>')
        tx = x0 + 270 if side == 0 else x0 + 12
        d.add(f'<text x="{tx}" y="{y+16}" font-family="{MONO}" font-size="14" '
              f'fill="{bc if used else ("#9AA9B6" if not (gnd or pwr) else C_SUB)}" '
              f'text-anchor="{"end" if side==0 else "start"}" '
              f'font-weight="{"bold" if used else "normal"}">{name}</text>')
        if used:
            lx = x0 + 12 if side == 0 else x0 + 270
            d.add(f'<text x="{lx}" y="{y+16}" font-family="{MONO}" font-size="14" '
                  f'fill="{used[1]}" text-anchor="{"start" if side==0 else "end"}" '
                  f'font-weight="bold">{used[0]}</text>')
        cx = CXL if side == 0 else CXR
        d.add(f'<circle cx="{cx}" cy="{y+11}" r="10" fill="{"#33455A" if used else "#C8D0D8"}"/>')
        d.add(f'<text x="{cx}" y="{y+15}" font-family="{MONO}" font-size="11" fill="#fff" '
              f'text-anchor="middle">{n}</text>')
for i, (c, t) in enumerate([("#EAF2FA", "버튼 · EMO"), ("#EEF6EA", "공통 GND"),
                            ("#FDF0E4", "전원"), ("#E9EDF1", "남는 GND"), ("#F8F9FA", "미사용")]):
    x = 620 + i * 130
    d.add(f'<rect x="{x}" y="{808}" width="20" height="20" rx="4" fill="{c}" stroke="#C8D0D8"/>')
    d.txt(x + 28, 824, t, 17, C_SUB)
d.box(620, 848, 644, 164, C_TINT, C_LINE, 12, 1.4)
d.txt(644, 880, "40 핀은 이렇게 나뉜다", 20, C_DARK, "bold")
for i, (k, v, hl) in enumerate([("공정 버튼", "4", True), ("비상정지", "1", True),
                                ("공통 GND 리턴", "1", True), ("남는 GND", "7", False),
                                ("전원 3V3 · 5V", "4", False), ("쓰지 않는 GPIO", "23", False)]):
    x = 644 + (i % 2) * 320
    y = 914 + (i // 2) * 32
    d.txt(x, y, k, 18, C_DARK if hl else C_SUB, "bold" if hl else "normal")
    d.txt(x + 258, y, f"{v} 핀", 19, C_DARK if hl else C_SUB, "bold", "end")
d.txt(644, 1006, "4 + 1 + 1 + 7 + 4 + 23 = 40", 17, C_SUB)

# ══ 열 3 — 아두이노 UNO R4 ══════════════════════════
d.sect(1320, 212, "아두이노 UNO R4 — 릴레이 5 채널")
d.txt(1320, 244, "핀 LOW = 채널 ON (active LOW) · 부팅 초기값은 정상(녹)", 19, C_SUB)
ARD = [("D7", "IN1", "타워램프 적", "차단", C_STOP),
       ("D6", "IN2", "타워램프 황", "경고", C_WARN),
       ("D5", "IN3", "타워램프 녹", "정상", C_OK),
       ("D4", "IN4", "부저", "차단", C_STOP),
       ("D3", "IN5", "버튼 GND 차단", "차단", C_STOP)]
for i, (pin, ch, load, when, col) in enumerate(ARD):
    y = 280 + i * 74
    d.box(1320, y, 96, 54, "#EAF2FA", C_DARK, 10, 1.8)
    d.add(f'<text x="1368" y="{y+34}" font-family="{MONO}" font-size="22" fill="{C_DARK}" '
          f'font-weight="bold" text-anchor="middle">{pin}</text>')
    d.add(f'<line x1="1420" y1="{y+27}" x2="1450" y2="{y+27}" stroke="{C_SUB}" '
          f'stroke-width="2" marker-end="url(#aw2)"/>')
    d.box(1456, y, 90, 54, "#fff", C_SUB, 10, 1.4)
    d.add(f'<text x="1501" y="{y+34}" font-family="{MONO}" font-size="20" fill="{C_SUB}" '
          f'font-weight="bold" text-anchor="middle">{ch}</text>')
    d.add(f'<line x1="1550" y1="{y+27}" x2="1580" y2="{y+27}" stroke="{col}" '
          f'stroke-width="2" marker-end="url(#ar)"/>')
    d.box(1586, y, 264, 54, "#fff", col, 10, 1.8)
    d.txt(1606, y + 34, load, 20, col, "bold")
    d.add(f'<rect x="{1830-ew(when,16)-16}" y="{y+8}" width="{ew(when,16)+16}" height="22" rx="11" '
          f'fill="{col}" fill-opacity="0.14"/>')
    d.txt(1822, y + 24, when, 16, col, "bold", "end")
d.box(1320, 660, 530, 60, C_TINT, C_LINE, 10, 1.4)
d.txt(1344, 696, "릴레이 코일 전원", 19, C_SUB)
d.add(f'<text x="1826" y="696" font-family="{MONO}" font-size="19" fill="{C_DARK}" '
      f'font-weight="bold" text-anchor="end">Arduino 5V · GND</text>')
d.box(1320, 736, 530, 60, C_TINT, C_LINE, 10, 1.4)
d.txt(1344, 772, "남는 채널", 19, C_SUB)
d.add(f'<text x="1826" y="772" font-family="{MONO}" font-size="19" fill="{C_DARK}" '
      f'font-weight="bold" text-anchor="end">IN6 ~ IN8</text>')
d.box(1320, 812, 530, 200, C_STOP_BG, C_STOP, 12, 1.8)
d.txt(1344, 848, "CH5 만 성격이 다르다", 21, C_STOP, "bold")
for i, ln in enumerate(wrap("CH1~CH4 는 12V 타워램프를 켜고 끈다. CH5 는 버튼 4 개의 공통 GND 를 "
                            "끊어 눌러도 신호가 파이에 닿지 않게 한다.", 19, 480)):
    d.txt(1344, 884 + i * 26, ln, 19, C_SUB)

out = sys.argv[1] if len(sys.argv) > 1 else "."
h = os.path.join(out, "S37_핀배정표.html"); d.save(h)
png = os.path.join(out, "S37_핀배정표.png"); render(h, W, H, png); os.remove(h)
print("생성:", png)
