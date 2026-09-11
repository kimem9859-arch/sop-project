# -*- coding: utf-8 -*-
"""제작설계서 핵심 소스코드 이미지(S43~S49) 생성.

사용: python3 make_code_images.py [출력폴더]
코드가 바뀌면 이 스크립트만 다시 돌리면 된다 — 줄 번호도 자동으로 맞는다.

🔴 범위를 바꿀 때 확인할 것:
    발췌 범위에 「비목표·미구현·별도 과제」 같은 주석이 들어가면 안 된다.
    제출문서는 기능 완성을 가정해 쓴다. ino 114-115 를 생략한 이유가 그것이다.
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from codeshot import build
from svg2png import render

REPO = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "Rpi5")

JOBS = [
    ("S43", "Demo/recipe.json", [(1, 28)], "json",
     "Demo/recipe.json  (파일 전체 · 28줄)",
     "작업 절차서 — 정답 순서를 코드가 아닌 데이터로 관리한다"),
    ("S44", "Demo/roi_zones.py", [(26, 56)], "py",
     "Demo/roi_zones.py : 26-56",
     "2단 구역 판정 — 검출된 버튼 상자 자체가 판정 구역이 된다"),
    ("S45", "Demo/fsm.py", [(185, 214)], "py",
     "Demo/fsm.py : 185-214",
     "비전 갱신 — 체류 임계와 「박스 안」이 함께 성립할 때만 경고로 전이한다"),
    ("S46", "Demo/fsm.py", [(216, 246)], "py",
     "Demo/fsm.py : 216-246",
     "눌림 처리 — 오답은 즉시 차단하고 단계를 진전시키지 않는다"),
    ("S47", "Demo/interlock.py", [(224, 249)], "py",
     "Demo/interlock.py : 224-249",
     "차단 명령 — 수신 확인(ACK)까지 받아야 차단이 성립한다"),
    ("S48", "arduino/console_interlock/console_interlock.ino",
     [(68, 87), (109, 113), (116, 123)], "c",
     "console_interlock.ino : 68-87, 109-123",
     "릴레이 5채널 제어 — 경고에서는 끊지 않고 차단에서만 버튼 신호를 끊는다"),
    ("S49", "Demo/safety_console.py", [(1342, 1359)], "py",
     "Demo/safety_console.py : 1342-1359",
     "해제 거부 — 비상정지가 물리적으로 복귀해야 차단이 풀린다"),
]


def segment(path, ranges):
    src = open(os.path.join(REPO, path), encoding="utf-8").read().split("\n")
    lines, nums = [], []
    for a, b in ranges:
        lines += src[a - 1:b]
        nums += list(range(a, b + 1))
    return lines, nums


def main(out_dir="code_out"):
    os.makedirs(out_dir, exist_ok=True)
    for sid, path, ranges, lang, title, sub in JOBS:
        lines, nums = segment(path, ranges)
        html = os.path.join(out_dir, sid + ".html")
        ncol, fs = build(lines, nums, lang, title, sub, html)
        render(html, 1920, 1080, os.path.join(out_dir, sid + ".png"))
        os.remove(html)
        print(f"{sid}  {ncol}단 · {fs}px  · {len(nums)}줄")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "code_out")
