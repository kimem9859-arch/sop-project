# -*- coding: utf-8 -*-
"""45쪽 개발 환경 ① — 개발 장비와 시연 장비에 올린 것이 다르다.

근거 = 개발보고서 Ⅱ-4 프로젝트 개발 환경 (버전 표기 그대로)
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from svgkit import *
from svg2png import render

MONO = "'DejaVu Sans Mono', Consolas, monospace"
d = Doc()

d.txt(70, 62, "개발 장비와 시연 장비에 올린 것이 다르다", 30, C_DARK, "bold")
d.txt(70, 96, "학습과 변환은 개발 PC 에서만 한다. 시연 장비에는 실행에 필요한 것만 올린다.", 21, C_SUB)
d.box(70, 118, 1780, 46, C_TINT, C_LINE, 10, 1.2)
for x, k, v in [(92, "런타임", "프로그램이 돌 때 필요한 부품"),
                (860, "변환", "학습한 모델을 NPU 가 읽는 형식으로 바꾸는 일")]:
    d.txt(x, 148, k, 20, C_DARK, "bold")
    d.txt(x + ew(k, 20) + 22, 148, "= " + v, 20, C_TEXT)


def group(x, y, w, h, title, sub, items, col, bg):
    d.box(x, y, w, h, "#fff", col, 14, 2)
    d.add(f'<rect x="{x}" y="{y}" width="{w}" height="62" rx="14" fill="{bg}"/>')
    d.add(f'<rect x="{x}" y="{y+40}" width="{w}" height="22" fill="{bg}"/>')
    d.txt(x + 20, y + 32, title, 23, col, "bold")
    d.txt(x + w - 20, y + 32, sub, 18, C_SUB, "normal", "end")
    yy = y + 88
    for it in items:
        d.add(f'<rect x="{x+18}" y="{yy-20}" width="{w-36}" height="29" rx="14" '
              f'fill="{bg}" fill-opacity="0.55"/>')
        d.add(f'<text x="{x+34}" y="{yy}" font-family="{MONO}" font-size="17" '
              f'fill="{C_TEXT}">{it}</text>')
        yy += 34


d.sect(70, 212, "개발 장비   —   학습과 변환에만 쓴다. 시연 장비에는 올리지 않는다")
MAKE = [("학습", "Google Colab · T4 GPU",
         ["Ultralytics YOLOv8 8.4.117", "PyTorch 2.13.0+cpu", "google-colab-cli"]),
        ("변환", "개발 PC",
         ["Hailo DFC 3.33.1", "hailo_model_zoo 2.18.0", "ONNX 1.22.0",
          "ONNX Runtime 1.21.1"]),
        ("데이터", "라벨링 · 관리",
         ["AnyLabeling", "Roboflow MCP", "draw.io MCP"]),
        ("코드 편집", "Ubuntu 24.04.4 on WSL2",
         ["Claude Code CLI", "VS Code 1.135.0", "arduino-cli 1.4.1"])]
for i, (t, s, items) in enumerate(MAKE):
    group(70 + i * 450, 242, 430, 268, t, s, items, "#8C98A4", "#F1F3F5")

d.sect(70, 566, "시연 장비   —   실행에 필요한 것만 올린다")
RUN = [(70, 700, "파이 1", "비전 · 판정",
        ["Raspberry Pi OS 64-bit · 커널 6.18", "Python 3.13",
         "HailoRT 4.23.0 · hailo_platform", "PyQt6 6.11.0",
         "OpenCV 4.10 · NumPy 2.2.4", "pySerial 3.5 · gpiozero 2.0.1"]),
       (790, 340, "파이 2", "음성",
        ["Ollama 0.32.13", "sherpa-onnx", "Python 3.13"]),
       (1150, 340, "아두이노 UNO R4", "인터락",
        ["renesas_uno core 1.6.0", "C / C++"]),
       (1510, 340, "글라스 ESP32", "영상 · 음성",
        ["ESP32 Arduino core 3.3.10", "WiFiManager 2.0.17", "C / C++"])]
for x, w, t, s, items in RUN:
    group(x, 596, w, 296, t, s, items, C_MID, "#EAF2FA")

d.notes(70, 916, 1790, [
    "Hailo DFC · PyTorch · ONNX 는 시연 장비에 올리지 않는다 — 모델을 만들 때만 쓴다.",
    "파이 1 과 파이 2 는 하는 일이 달라 올린 것도 다르다.",
])

out = sys.argv[1] if len(sys.argv) > 1 else "."
h = os.path.join(out, "S53_개발환경.html"); d.save(h)
png = os.path.join(out, "S53_개발환경.png"); render(h, W, H, png); os.remove(h)
print("생성:", png)
