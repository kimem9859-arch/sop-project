# -*- coding: utf-8 -*-
"""22쪽 기능 처리도 ① 한 프레임 처리 — 23쪽과 같은 형식으로 다시 그린다."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from seqdraw import build, W, H
from seqhead import header, inject
from svg2png import render

P = [("작업자", None),
     ("프레임 루프", None),
     ("버튼 검출", "YOLOv8n"),
     ("손 추적", "21점 모델"),
     ("순서 판정", "FSM")]

M = [
    ("call", "작업자", "프레임 루프", "1인칭 프레임 · WiFi (TCP)"),
    ("call", "프레임 루프", "버튼 검출", "detect(frame)"),
    ("self", "버튼 검출", "한 번의 순전파 — 박스 · 클래스 동시 예측"),
    ("ret",  "버튼 검출", "프레임 루프", "버튼 위치"),
    ("call", "프레임 루프", "손 추적", "track(frame)"),
    ("self", "손 추적", "손바닥 검출 → 21점 관절 회귀"),
    ("ret",  "손 추적", "프레임 루프", "손끝 좌표"),
    ("call", "프레임 루프", "순서 판정", "구역 · 체류 갱신"),
    ("self", "순서 판정", "기대 단계 N 과 대조 · 체류 임계 확인"),
    ("ret",  "순서 판정", "프레임 루프", "상태 — 감시 · 경고"),
    ("ret",  "프레임 루프", "작업자", "화면 갱신 — 검출 오버레이 · 단계 안내 · 경고"),
]

NOTE = "구역 · 체류 갱신은 눌림 없이 매 프레임 돈다. 눌린 뒤의 차단은 기능 처리도 ②."

out = sys.argv[1] if len(sys.argv) > 1 else "."
h = os.path.join(out, "S22_한프레임처리.html")
build(P, M, h, off=150, note=NOTE, step=44, self_step=62)
inject(h, header('영상 한 장이 판정까지 가는 길', '인식과 판정이 한 프레임 안에서 끝난다. 다음 장이 오기 전에 결론이 난다.', [(92, 'FSM', '지금 어느 상황인지 몇 가지로 나눠 두고 정해진 조건에서만 넘어가는 방식'), (1180, '구역 · 체류', '버튼 둘레의 판정 범위 · 그 안에 머문 시간')]))
png = os.path.join(out, "S22_한프레임처리.png")
render(h, W, H, png); os.remove(h)
print("생성:", png)
