#!/usr/bin/env python3
"""PoC Step 1 — 손끝 hover ROI + dwell 판정 (버튼 검출 모델 없이, 수동 ROI).

핵심 질문(재정의): 실제 시스템에서 '누름'은 하드웨어 신호이고 비전의 역할은
**누르기 직전 손이 어느 버튼 ROI 위에 있는가(hover/lock-on)** 를 잡아 사전 경고하는 것.
따라서 이 PoC가 측정할 진짜 지표는 "가림 도중 추적"이 아니라
**'가림(누름) 직전 lock-on ROI 식별 정확도'** 다. (가림=검출0이 되는 자기모순 회피)

카메라 (거의) 고정 가정으로 손 쪽 로직만 분리 검증. 버튼 자동 검출(YOLO)은 Step 2.

산출:
  - <clip>.frames.csv : frame, t, hand, hand_score, handed, in_frame, fx, fy, roi
  - <clip>.events.csv : roi, t_start, t_end, dur_sec, n_frames, dwelled
  - 콘솔: 클립별 요약 + 마지막에 전체 종합표
(채점기 score.py / 구간 GT / 성공기준은 별도 단계 — 본 하니스는 '계측'만 담당)
"""
import argparse
import csv
import glob
import json
import math
import os

import cv2
import numpy as np
import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision

INDEX_TIP = 8  # MediaPipe 검지 끝
DEFAULT_DWELL_SEC = 1.0  # 통합문서 §9.4: 0.8~1.0초
DEFAULT_MODEL = os.path.join(os.path.dirname(__file__), "hand_landmarker.task")

# --- 색 기반 동적 ROI (핸드헬드/이동 카메라용). 버튼이 뚜렷한 색일 때. ---
COLOR_SPECS = [  # (이름, HSV 하한, HSV 상한)
    ("yellow", (18, 90, 90), (40, 255, 255)),
    ("white",  (0, 0, 185), (180, 50, 255)),
]
COLOR_MIN_AREA = 1500


def detect_color_rois(frame, pad=0.10):
    """프레임에서 색 버튼 블롭 검출 → x좌표 순으로 B1,B2.. 라벨 (동적 ROI).
    카메라가 움직여도 매 프레임 위치를 다시 찾으므로 고정 ROI의 흔들림 문제를 회피."""
    h, w = frame.shape[:2]
    hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
    found = []
    for _, lo, hi in COLOR_SPECS:
        m = cv2.inRange(hsv, np.array(lo, np.uint8), np.array(hi, np.uint8))
        m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
        cnts, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        cnts = [c for c in cnts if cv2.contourArea(c) > COLOR_MIN_AREA]
        if not cnts:
            continue
        x, y, bw, bh = cv2.boundingRect(max(cnts, key=cv2.contourArea))
        px, py = int(bw * pad), int(bh * pad)
        box = (max(0, x - px), max(0, y - py), min(w - 1, x + bw + px), min(h - 1, y + bh + py))
        found.append((x + bw / 2, box))
    found.sort(key=lambda c: c[0])  # 왼→오 = B1,B2,..
    return [(f"B{i+1}", b) for i, (_, b) in enumerate(found)]


def sane_fps(cap):
    """비정상 fps(0/음수/NaN/Inf/과대)를 30으로 폴백. (C2)"""
    fps = cap.get(cv2.CAP_PROP_FPS)
    if not fps or fps <= 0 or math.isnan(fps) or math.isinf(fps) or fps > 1000:
        return 30.0
    return fps


def load_rois(rois_path, clip_name):
    """rois.json 에서 ROI 목록 로드 + 검증/정규화. (M1)
    키 우선순위: 정확한 파일명 → 확장자 뺀 이름 → 'default'."""
    if not rois_path or not os.path.exists(rois_path):
        return None
    with open(rois_path, encoding="utf-8") as f:
        data = json.load(f)
    stem = os.path.splitext(clip_name)[0]
    raw = data.get(clip_name) or data.get(stem) or data.get("default")
    if not raw:
        return None
    rois, seen = [], set()
    for r in raw:
        try:
            rid = r["id"]
            x1, y1, x2, y2 = map(int, r["box"])
        except (KeyError, TypeError, ValueError):
            print(f"  [경고] ROI 형식 오류 무시: {r}")
            continue
        x1, x2 = min(x1, x2), max(x1, x2)  # 좌표 정규화 (x1>x2 방지)
        y1, y2 = min(y1, y2), max(y1, y2)
        if x2 - x1 < 2 or y2 - y1 < 2:     # [0,0,0,0] 같은 빈 박스 제외
            print(f"  [경고] 빈/초소형 ROI 무시: {rid} {(x1, y1, x2, y2)}")
            continue
        if rid in seen:
            print(f"  [경고] 중복 ROI id: {rid}")
        seen.add(rid)
        rois.append((rid, (x1, y1, x2, y2)))
    return rois or None


def roi_at_point(x, y, rois):
    for rid, (x1, y1, x2, y2) in rois:
        if x1 <= x <= x2 and y1 <= y <= y2:
            return rid
    return None


def make_landmarker(model_path, num_hands):
    opts = vision.HandLandmarkerOptions(
        base_options=mp_python.BaseOptions(model_asset_path=model_path),
        running_mode=vision.RunningMode.VIDEO, num_hands=num_hands,
        min_hand_detection_confidence=0.5, min_tracking_confidence=0.5,
    )
    return vision.HandLandmarker.create_from_options(opts)


def pick_hand(res, rois, w, h):
    """검출된 손들 중 작업 손 1개 선택: ROI 안에 든 손 우선, 없으면 점수 최고. (M-1)
    반환: (fx, fy, score, handed, in_frame, roi) 또는 None."""
    if not res.hand_landmarks:
        return None
    cands = []
    for i, lms in enumerate(res.hand_landmarks):
        lm = lms[INDEX_TIP]
        score = res.handedness[i][0].score if res.handedness else 0.0
        handed = res.handedness[i][0].category_name if res.handedness else "?"
        in_frame = 0.0 <= lm.x <= 1.0 and 0.0 <= lm.y <= 1.0
        fx = min(max(int(lm.x * w), 0), w - 1)   # 프레임 안으로 클램프 (C4)
        fy = min(max(int(lm.y * h), 0), h - 1)
        roi = roi_at_point(fx, fy, rois) if in_frame else None
        cands.append((roi, score, fx, fy, handed, in_frame))
    cands.sort(key=lambda c: (c[0] is not None, c[1]), reverse=True)  # ROI 우선, 점수순
    roi, score, fx, fy, handed, in_frame = cands[0]
    return fx, fy, round(score, 3), handed, int(in_frame), (roi or "")


def analyze(video_path, rois, dwell_sec, out_dir, model_path, num_hands, used_names,
            color_mode=False):
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"  [에러] 영상 열기 실패: {video_path}")
        return None
    fps = sane_fps(cap)
    dwell_frames = max(1, round(dwell_sec * fps))  # 프레임 수 기반 dwell (C1/C3)

    # 출력 이름 충돌 회피 (M3)
    base = os.path.splitext(os.path.basename(video_path))[0]
    name, k = base, 2
    while name in used_names:
        name = f"{base}_{k}"; k += 1
    used_names.add(name)

    landmarker = make_landmarker(model_path, num_hands)
    frames = []   # (idx, t, hand, score, handed, in_frame, fx, fy, roi)
    fidx, last_ts = 0, -1
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        h, w = frame.shape[:2]
        ts = int(round(fidx * 1000.0 / fps))
        if ts <= last_ts:           # 타임스탬프 단조 증가 보장 (C3)
            ts = last_ts + 1
        last_ts = ts
        if color_mode:                       # 매 프레임 버튼 위치 재검출 (동적 ROI)
            rois = detect_color_rois(frame)
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        res = landmarker.detect_for_video(
            mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb), ts)
        picked = pick_hand(res, rois, w, h)
        t = round(fidx / fps, 3)
        if picked:
            fx, fy, score, handed, in_frame, roi = picked
            frames.append((fidx, t, 1, score, handed, in_frame, fx, fy, roi))
        else:
            frames.append((fidx, t, 0, "", "", 0, "", "", ""))
        fidx += 1
    cap.release()
    landmarker.close()

    if not frames:
        print(f"  [에러] 프레임 0개: {video_path}")
        return None

    # --- hover 구간 추출 (연속 동일 ROI, 프레임 수 기준 dwell) ---
    events = []
    cur, start_t, count = None, None, 0
    for row in frames:
        t, roi = row[1], (row[8] or None)
        if roi != cur:
            if cur is not None:
                dur = round(prev_t - start_t + 1.0 / fps, 3)  # 마지막 프레임 포함 (C1)
                events.append((cur, start_t, prev_t, dur, count, count >= dwell_frames))
            cur, start_t, count = roi, t, 0
        count += 1
        prev_t = t
    if cur is not None:
        dur = round(prev_t - start_t + 1.0 / fps, 3)
        events.append((cur, start_t, prev_t, dur, count, count >= dwell_frames))

    # --- 저장 ---
    os.makedirs(out_dir, exist_ok=True)
    with open(os.path.join(out_dir, f"{name}.frames.csv"), "w", newline="", encoding="utf-8") as f:
        wr = csv.writer(f)
        wr.writerow(["frame", "t", "hand", "hand_score", "handed", "in_frame", "fx", "fy", "roi"])
        wr.writerows(frames)
    with open(os.path.join(out_dir, f"{name}.events.csv"), "w", newline="", encoding="utf-8") as f:
        wr = csv.writer(f)
        wr.writerow(["roi", "t_start", "t_end", "dur_sec", "n_frames", "dwelled"])
        wr.writerows(events)

    # --- 요약 ---
    n = len(frames)
    det = sum(r[2] for r in frames)
    det_inframe = sum(1 for r in frames if r[2] and r[5])  # 프레임 안 손끝만
    dwell_seq = [e[0] for e in events if e[0] and e[5]]
    det_rate = det / n
    print(f"\n▶ {name}  ({n} frames @ {fps:.1f}fps, {n/fps:.1f}s, dwell≥{dwell_frames}f)")
    print(f"  손 검출률: {100*det/n:.1f}%  (프레임 내: {100*det_inframe/n:.1f}%)")
    print(f"  hover 구간: {len([e for e in events if e[0]])} | dwell 도달: {len(dwell_seq)}")
    print(f"  ▶ dwell ROI 순서열: {' > '.join(dwell_seq) or '(없음)'}")
    return {"name": name, "frames": n, "fps": round(fps, 1),
            "det_rate": round(det_rate, 3), "dwell_seq": dwell_seq}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("path", help="영상 파일 또는 폴더")
    ap.add_argument("--rois", help="rois.json 경로")
    ap.add_argument("--dump-frame0", help="첫 프레임 png 저장 후 종료 (ROI 좌표용)")
    ap.add_argument("--dwell", type=float, default=DEFAULT_DWELL_SEC)
    ap.add_argument("--color", action="store_true",
                    help="색 기반 동적 ROI (핸드헬드/이동 카메라용, rois.json 불필요)")
    ap.add_argument("--hands", type=int, default=2, help="최대 손 개수 (기본 2)")
    ap.add_argument("--model", default=DEFAULT_MODEL)
    ap.add_argument("--out", default="out")
    args = ap.parse_args()

    exts = ("*.mp4", "*.MP4", "*.mov", "*.MOV", "*.avi", "*.AVI", "*.mkv")
    if os.path.isfile(args.path):
        vids = [args.path]
    else:
        vids = sorted(p for e in exts for p in glob.glob(os.path.join(args.path, e)))
    if not vids:
        print("영상을 못 찾음:", args.path); return

    if args.dump_frame0:
        cap = cv2.VideoCapture(vids[0])
        ok, frame = (cap.read() if cap.isOpened() else (False, None))
        cap.release()
        if ok:
            cv2.imwrite(args.dump_frame0, frame)
            print(f"첫 프레임 저장: {args.dump_frame0} ({frame.shape[1]}x{frame.shape[0]})")
        else:
            print("첫 프레임 읽기 실패 (영상 손상/형식?)")
        return

    used_names, summaries = set(), []
    for v in vids:
        if args.color:
            rois = []  # 매 프레임 동적 검출 (analyze 내부)
        else:
            rois = load_rois(args.rois, os.path.basename(v))
            if not rois:
                print(f"\n[건너뜀] {os.path.basename(v)}: 유효 ROI 없음 (--rois 또는 --color)")
                continue
        s = analyze(v, rois, args.dwell, args.out, args.model, args.hands,
                    used_names, color_mode=args.color)
        if s:
            summaries.append(s)

    # --- 종합표 (M3) ---
    if summaries:
        print("\n" + "=" * 60 + "\n[종합]")
        print(f"{'clip':<16}{'frames':>7}{'fps':>6}{'검출률':>8}  dwell순서열")
        for s in summaries:
            print(f"{s['name']:<16}{s['frames']:>7}{s['fps']:>6}{s['det_rate']*100:>7.1f}%  "
                  f"{' > '.join(s['dwell_seq']) or '(없음)'}")


if __name__ == "__main__":
    main()
