"""폰 영상(검출용 사본) → 프레임별 버튼·공구·손 21점 JSON. 파이1 임시 폴더에서 돈다(데스크톱 dev/video 소유 · Rpi5 미수정).

python3 extract_phone.py <proxy.mp4> <out.json> [--pad34]
--pad34 = 가로 화면 위아래에 검은 띠를 덧대 3:4 로 만든 뒤 검출(학습 사진 = 안경 세로 3:4 와 같은 모양으로 640×640 에 눌리게) · 좌표는 띠를 뺀 원래 화면 기준
검출·추적은 시연 런타임 모듈 그대로: detector.HailoDetector · camera_thread 추적 함수(소스에서 꺼냄) · hand_tracker.
문턱 = config 그대로(TOOL_CONF · YOLO_*) — 바꾸지 않는다(계획서 🔒).
"""
import ast
import json
import os
import sys

DEMO = os.environ.get("SOP_DEMO", "/home/pi/sop-project/Rpi5/Demo")
src, out = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2])   # 🔑 chdir 전에 절대 경로로
pad34 = "--pad34" in sys.argv[3:]
sys.path.insert(0, DEMO)
os.chdir(DEMO)

import cv2  # noqa: E402

import config  # noqa: E402
from detector import HailoDetector  # noqa: E402
from hand_tracker import HandTracker  # noqa: E402

# 🔴 camera_thread 를 import 하면 새로 만든 HailoDetector 의 첫 추론이 멈춘다(2026-10-09 실측) — 추적 함수만 꺼낸다
_src = open(os.path.join(DEMO, "camera_thread.py"), encoding="utf-8").read()
_want = {"_iou", "_update_tracks", "_one_per_class"}
_mod = ast.Module(body=[n for n in ast.parse(_src).body if isinstance(n, ast.FunctionDef) and n.name in _want],
                  type_ignores=[])
ct = {k: getattr(config, k) for k in ("YOLO_IOU_MATCH", "YOLO_CONF_HIGH", "YOLO_CONFIRM_HITS", "YOLO_MAX_MISS")}
exec(compile(_mod, "camera_thread.py", "exec"), ct)

cap = cv2.VideoCapture(src)
w, h = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)), int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
fps = cap.get(cv2.CAP_PROP_FPS)
btn_det = HailoDetector()
hand = HandTracker()
# 🔴 공구 검출기를 손보다 먼저 올리면 공구 추론이 멈춘다(2026-10-09 실측) — 버튼 → 손 → 공구 순서
tool_det = HailoDetector(config.TOOL_HEF_PATH, dict(enumerate(config.TOOL_NAMES)))
top = max(0, (round(w * 4 / 3) - h) // 2) if pad34 else 0
bottom = max(0, round(w * 4 / 3) - h - top) if pad34 else 0
print("size", w, h, "fps", fps, "pad34", pad34, "top", top, "hand", hand.available, hand.reason, flush=True)

tracks, rows, f = [], [], 0
while True:
    ok, fr = cap.read()
    if not ok:
        break
    if pad34:
        fr = cv2.copyMakeBorder(fr, top, bottom, 0, 0, cv2.BORDER_CONSTANT, value=(0, 0, 0))
    tracks = ct["_update_tracks"](tracks, btn_det.detect(fr))
    btn = [[btn_det.class_name(t["cls"]), round(float(t["score"]), 3),
            int(t["box"][0]), int(t["box"][1]) - top, int(t["box"][2]), int(t["box"][3]) - top]
           for t in tracks if t["confirmed"]]
    tools = [[tool_det.class_name(c), round(float(s), 3), int(x1), int(y1) - top, int(x2), int(y2) - top]
             for c, s, x1, y1, x2, y2 in tool_det.detect(fr) if s >= config.TOOL_CONF]
    hand.detect(fr)
    lm = None if hand.last_landmarks is None else [[round(float(x), 1), round(float(y) - top, 1)]
                                                    for x, y, _z in hand.last_landmarks]
    rows.append({"f": f, "btn": btn, "tool": tools, "hand": lm})
    if f % 150 == 0:
        print(f, len(btn), len(tools), lm is not None, flush=True)
    f += 1

json.dump({"src": src, "fps": fps, "w": w, "h": h, "pad34": pad34, "rows": rows}, open(out, "w"))
print("done", len(rows), flush=True)
