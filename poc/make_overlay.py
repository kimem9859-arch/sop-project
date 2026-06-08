#!/usr/bin/env python3
"""테스트 영상에 버튼 ROI + MediaPipe 손 랜드마크 + dwell 도달 표시를 그려 시각화.

오버레이 요소:
  - 버튼 ROI 박스 (B1 노랑 / B2 하양, 손끝 들어가면 빨강)
  - MediaPipe 손 21점 스켈레톤 + 검지끝 강조
  - 좌상단 ON: 현재 조준 버튼 + dwell 진행바
  - dwell 임계 도달 순간 "✓ Bx DWELL" 플래시 + 하단 확정 순서열
"""
import argparse
import os
import sys

import cv2
import mediapipe as mp

sys.path.insert(0, os.path.dirname(__file__))
from roi_hover import detect_color_rois, make_landmarker, DEFAULT_MODEL, INDEX_TIP

CONN = [(0, 1), (1, 2), (2, 3), (3, 4), (0, 5), (5, 6), (6, 7), (7, 8),
        (5, 9), (9, 10), (10, 11), (11, 12), (9, 13), (13, 14), (14, 15), (15, 16),
        (13, 17), (17, 18), (18, 19), (19, 20), (0, 17)]
F = cv2.FONT_HERSHEY_SIMPLEX


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("--out", required=True)
    ap.add_argument("--scale", type=float, default=0.667)
    ap.add_argument("--dwell", type=float, default=0.5)
    ap.add_argument("--bridge", type=float, default=0.3)
    ap.add_argument("--model", default=DEFAULT_MODEL)
    a = ap.parse_args()

    cap = cv2.VideoCapture(a.video)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    W = int(cap.get(3) * a.scale); H = int(cap.get(4) * a.scale)
    vw = cv2.VideoWriter(a.out, cv2.VideoWriter_fourcc(*"mp4v"), fps, (W, H))
    lm = make_landmarker(a.model, 2)
    DW = max(1, round(a.dwell * fps))
    GAP = max(1, round(a.bridge * fps))

    held, cnt, gapc, dwelled, flash, seq = None, 0, 0, False, 0, []
    fidx, lastts = 0, -1
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        h, w = frame.shape[:2]
        ts = int(round(fidx * 1000.0 / fps)); ts = max(ts, lastts + 1); lastts = ts
        res = lm.detect_for_video(
            mp.Image(image_format=mp.ImageFormat.SRGB,
                     data=cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)), ts)
        rois = detect_color_rois(frame)

        # 손 + 검지끝
        ft = None
        if res.hand_landmarks:
            pts = [(int(p.x * w), int(p.y * h)) for p in res.hand_landmarks[0]]
            for i, j in CONN:
                cv2.line(frame, pts[i], pts[j], (0, 255, 0), 3)
            for p in pts:
                cv2.circle(frame, p, 5, (0, 200, 255), -1)
            ft = pts[INDEX_TIP]
            cv2.circle(frame, ft, 16, (0, 0, 255), 3)

        # 현재 손끝이 든 ROI
        cur = None
        for rid, (x1, y1, x2, y2) in rois:
            inside = ft is not None and x1 <= ft[0] <= x2 and y1 <= ft[1] <= y2
            col = (0, 255, 255) if rid == "B1" else (255, 255, 255)
            if inside:
                col = (0, 0, 255); cur = rid
            cv2.rectangle(frame, (x1, y1), (x2, y2), col, 5 if inside else 2)
            cv2.putText(frame, rid, (x1, y1 - 12), F, 1.3, col, 3)

        # dwell 상태머신 (채점기와 동일: 같은 버튼으로 '복귀'할 때만 갭 프레임 인정)
        if cur is not None:
            if cur == held:
                cnt += 1 + gapc      # 복귀 → 브리지된 갭 프레임도 합산
            else:
                held, cnt, dwelled = cur, 1, False
            gapc = 0
            if not dwelled and cnt >= DW:   # 손끝이 버튼에 실제로 있을 때만 완성
                dwelled = True; flash = int(0.6 * fps); seq.append(held)
        else:
            if held is not None and gapc < GAP:
                gapc += 1            # 갭: 보류만 (cnt 증가 안 함 → 스침은 완성 못함)
            else:
                held, cnt, gapc, dwelled = None, 0, 0, False

        # 좌상단 ON + 진행바
        cv2.rectangle(frame, (0, 0), (430, 110), (0, 0, 0), -1)
        cv2.putText(frame, f"ON: {cur}" if cur else "ON: -", (15, 50), F, 1.4,
                    (0, 0, 255) if cur else (170, 170, 170), 4)
        if held is not None:
            p = min(1.0, cnt / DW)
            cv2.rectangle(frame, (15, 75), (415, 100), (60, 60, 60), -1)
            barcol = (0, 255, 0) if dwelled else (0, 200, 255)
            cv2.rectangle(frame, (15, 75), (15 + int(400 * p), 100), barcol, -1)
            cv2.putText(frame, "dwell", (170, 95), F, 0.7, (255, 255, 255), 2)

        # dwell 도달 플래시
        if flash > 0:
            flash -= 1
            t = f"{held} DWELL!"
            (tw, th), _ = cv2.getTextSize(t, F, 2.2, 5)
            cx = (w - tw) // 2
            cv2.rectangle(frame, (cx - 20, h // 2 - 60), (cx + tw + 20, h // 2 + 20),
                          (0, 150, 0), -1)
            cv2.putText(frame, t, (cx, h // 2), F, 2.2, (255, 255, 255), 5)

        # 하단 확정 순서열 (최근 10개)
        if seq:
            s = " > ".join(seq[-10:])
            if len(seq) > 10:
                s = f"...({len(seq)}) " + s
            cv2.rectangle(frame, (0, h - 50), (w, h), (0, 0, 0), -1)
            cv2.putText(frame, "Seq: " + s, (15, h - 16), F, 1.0, (0, 255, 0), 2)

        vw.write(cv2.resize(frame, (W, H)))
        fidx += 1

    cap.release(); lm.close(); vw.release()
    print("저장:", a.out, f"({W}x{H}, {fps:.0f}fps, dwell {DW}f)")


if __name__ == "__main__":
    main()
