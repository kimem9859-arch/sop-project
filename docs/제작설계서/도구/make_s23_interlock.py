# -*- coding: utf-8 -*-
"""23쪽 기능 처리도 ② 인터락 차단 — 차단이 성립하기까지."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from seqdraw import build, W, H
from seqhead import header, inject
from svg2png import render

P = [("작업자", None),
     ("순서 판정", "FSM"),
     ("인터락 송신부", "interlock.py"),
     ("제어 보드", "Arduino UNO R4"),
     ("릴레이 · 타워램프", None)]

M = [
    ("call", "작업자", "순서 판정", "오답 버튼 눌림 (GPIO)"),
    ("self", "순서 판정", "기대 단계 N 과 대조 — 오답 확정"),
    ("call", "순서 판정", "인터락 송신부", "차단 요청"),
    ("call", "인터락 송신부", "제어 보드", "BLOCK 명령 · 시리얼 115200"),
    ("call", "제어 보드", "릴레이 · 타워램프", "릴레이 구동 · 적색 점등 · 부저"),
    ("ret",  "제어 보드", "인터락 송신부", "ACK — 수신 확인"),
    ("ret",  "인터락 송신부", "순서 판정", "차단 성립"),
    ("ret",  "순서 판정", "작업자", "차단 표시 · 해제 버튼"),
    ("frag", "ACK 가 오지 않으면"),
    ("call", "인터락 송신부", "제어 보드", "BLOCK 재전송 — 최대 2회"),
    ("ret",  "인터락 송신부", "순서 판정", "차단 미확인 — 이상 알림"),
    ("div",  "통신이 다시 이어지면"),
    ("call", "인터락 송신부", "제어 보드", "마지막 명령 재송신 — 릴레이 상태를 판정부와 일치"),
    ("end",),
]

NOTE = "수신 확인까지 받아야 차단이 성립한다. 해제해도 기대 단계는 그대로다."

out = sys.argv[1] if len(sys.argv) > 1 else "."
h = os.path.join(out, "S23_인터락차단.html")
build(P, M, h, off=150, step=46, self_step=66, note=NOTE)
inject(h, header('차단이 성립하기까지', '명령을 보낸 것만으로는 차단이 아니다. 회신을 받아야 성립한다.', [(92, 'ACK', '제어 보드가 「받았다」고 보내는 회신 한 줄'), (900, '인터락', '오답 버튼을 눌러도 신호가 들어가지 않게 버튼 입력을 끊는 장치')]))
png = os.path.join(out, "S23_인터락차단.png")
render(h, W, H, png); os.remove(h)
print("생성:", png)
