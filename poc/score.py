#!/usr/bin/env python3
"""PoC Step 1 채점기 — roi_hover.py의 frames.csv ↔ 구간 GT 비교 → 정량 지표.

핵심 지표(성공기준과 1:1):
  1) lock-on 정확도  : 각 '의도적 누름' 직전 창에서 검출 ROI == 정답 ROI 비율 (C-1 재정의)
  2) 스침 오탐율     : graze 구간이 dwell을 잘못 유발한 비율
  3) dwell 순서 일치 : 검출 dwell ROI 순서열 vs GT 의도 누름 순서열 (정확일치 + 편집거리)
  4) 프레임 ROI 정확도 + 혼동행렬 (가림 구간 제외/포함 둘 다)
  5) dwell 임계 sweep: 0.3~1.5초에서 recall/오탐 변화 → 최적 임계 확인

사용:
  python score.py --frames out/ --gt ../poc_data/ground_truth_segments.csv
  python score.py --frames out/정상01.frames.csv --gt ../poc_data/ground_truth_segments.csv --sweep
"""
import argparse
import csv
import glob
import os
import statistics

LOCKON_WINDOW = 0.4   # 누름 직전 lock-on 판정 창 (초)
MATCH_TOL = 0.3       # dwell↔press 시간 매칭 허용 오차 (초)


# ----------------------------------------------------------------- 입력 로드
def load_frames(path):
    """frames.csv → (fps, [(t, roi_or_none, detected)])."""
    rows = []
    with open(path, encoding="utf-8") as f:
        for r in csv.DictReader(f):
            rows.append((float(r["t"]), r["roi"] or None, int(r["hand"])))
    dts = [b[0] - a[0] for a, b in zip(rows, rows[1:]) if b[0] > a[0]]
    dt = statistics.median(dts) if dts else 1 / 30
    return (1 / dt if dt else 30.0), rows


def load_gt(path):
    """구간 GT → {clip: [seg dict]}. seg: t_start,t_end,gt_roi,action,intent."""
    gt = {}
    with open(path, encoding="utf-8") as f:
        for r in csv.DictReader(f):
            if not r.get("clip") or r["clip"].startswith("#"):
                continue
            gt.setdefault(r["clip"], []).append({
                "t0": float(r["t_start"]), "t1": float(r["t_end"]),
                "roi": (r["gt_roi"] or None), "action": r["action"].strip(),
                "intent": r["intent"].strip(),
            })
    return gt


# ------------------------------------------------------------- 보조 계산
def gt_region_at(t, segs):
    """시각 t를 덮는 GT 구간의 (roi, action). 없으면 (None,'none')."""
    for s in segs:
        if s["t0"] <= t <= s["t1"]:
            return s["roi"], s["action"]
    return None, "none"


def dwell_events(frames, fps, thr, bridge_sec=0.0):
    """연속 동일 ROI 구간 중 길이≥thr 인 것 → [(roi, t0, t1)].
    bridge_sec>0 이면 같은 ROI 사이의 짧은 끊김(none, ≤bridge)을 이어붙여 채터 제거."""
    ts = [t for t, _, _ in frames]
    rois = [roi for _, roi, _ in frames]
    if bridge_sec > 0:                      # 갭 메우기 (hysteresis)
        g = max(1, round(bridge_sec * fps))
        i, n = 0, len(rois)
        while i < n:
            if rois[i] is None:
                j = i
                while j < n and rois[j] is None:
                    j += 1
                left = rois[i - 1] if i > 0 else None
                right = rois[j] if j < n else None
                if (j - i) <= g and left is not None and left == right:
                    for k in range(i, j):
                        rois[k] = left
                i = j
            else:
                i += 1
    min_f = max(1, round(thr * fps))
    out, cur, t0, cnt, prev = [], None, None, 0, None
    for t, roi in zip(ts, rois):
        if roi != cur:
            if cur is not None and cnt >= min_f:
                out.append((cur, t0, prev))
            cur, t0, cnt = roi, t, 0
        cnt += 1; prev = t
    if cur is not None and cnt >= min_f:
        out.append((cur, t0, prev))
    return out


def overlaps(a0, a1, b0, b1):
    return a0 <= b1 and b0 <= a1


def levenshtein(a, b):
    d = list(range(len(b) + 1))
    for i, x in enumerate(a, 1):
        prev, d[0] = d[0], i
        for j, y in enumerate(b, 1):
            prev, d[j] = d[j], min(d[j] + 1, d[j - 1] + 1, prev + (x != y))
    return d[-1]


# ------------------------------------------------------------- 클립 채점
def score_clip(frames, fps, segs, thr, bridge_sec=0.0):
    presses = [s for s in segs if s["intent"] == "intent"]
    reachable = [s for s in presses if s["action"] != "occluded"]  # 비전이 잡을 수 있는 누름
    grazes = [s for s in segs if s["action"] == "graze"]
    evs = dwell_events(frames, fps, thr, bridge_sec)

    # 1) lock-on: 각 press 직전 창의 '마지막 검출 ROI'가 정답인가
    lock_ok = lock_nodet = 0
    for p in presses:
        win = [roi for t, roi, _ in frames
               if p["t0"] - LOCKON_WINDOW <= t < p["t0"] and roi]
        if not win:
            lock_nodet += 1
        elif win[-1] == p["roi"]:
            lock_ok += 1
    lockon_acc = lock_ok / len(presses) if presses else None

    # 2) dwell recall/precision + 3) 스침 오탐
    def matched(p):
        return any(e[0] == p["roi"] and overlaps(e[1], e[2],
                   p["t0"] - MATCH_TOL, p["t1"] + MATCH_TOL) for e in evs)
    matched_ev = sum(any(e[0] == p["roi"] and overlaps(e[1], e[2],
                     p["t0"] - MATCH_TOL, p["t1"] + MATCH_TOL) for p in presses)
                     for e in evs)
    recall = sum(matched(p) for p in presses) / len(presses) if presses else None
    recall_reach = (sum(matched(p) for p in reachable) / len(reachable)
                    if reachable else None)   # 가림 제외 (비전 도달 가능 누름만)
    precision = matched_ev / len(evs) if evs else None
    graze_trig = sum(any(e[0] == g["roi"] and overlaps(e[1], e[2], g["t0"], g["t1"])
                     for e in evs) for g in grazes)
    false_trig = graze_trig / len(grazes) if grazes else None

    # 4) 순서 일치
    det_seq = [e[0] for e in evs]
    gt_seq = [p["roi"] for p in sorted(presses, key=lambda s: s["t0"])]
    order_exact = (det_seq == gt_seq) if gt_seq else None
    order_edit = levenshtein(det_seq, gt_seq) if gt_seq else None

    # 5) 프레임 ROI 정확도 (가림 포함/제외)
    labels = sorted({s["roi"] for s in segs if s["roi"]} |
                    {roi for _, roi, _ in frames if roi} | {"none"})
    conf = {a: {b: 0 for b in labels} for a in labels}
    acc_all = acc_ex = tot_all = tot_ex = 0
    for t, pred_roi, _ in frames:
        gr, act = gt_region_at(t, segs)
        gt_lab, pred = (gr or "none"), (pred_roi or "none")
        conf[gt_lab][pred] += 1
        tot_all += 1; acc_all += (gt_lab == pred)
        if act != "occluded":               # 가림 구간 제외 정확도
            tot_ex += 1; acc_ex += (gt_lab == pred)

    return {
        "presses": len(presses), "reachable": len(reachable),
        "grazes": len(grazes), "dwells": len(evs),
        "lockon_acc": lockon_acc, "lock_nodet": lock_nodet,
        "recall": recall, "recall_reach": recall_reach,
        "precision": precision, "false_trig": false_trig,
        "order_exact": order_exact, "order_edit": order_edit,
        "det_seq": det_seq, "gt_seq": gt_seq,
        "frame_acc_all": acc_all / tot_all if tot_all else None,
        "frame_acc_exocc": acc_ex / tot_ex if tot_ex else None,
        "conf": conf, "labels": labels,
    }


def pct(x):
    return "n/a" if x is None else f"{100*x:.1f}%"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--frames", required=True, help="frames.csv 파일 또는 out 폴더")
    ap.add_argument("--gt", required=True, help="ground_truth_segments.csv")
    ap.add_argument("--dwell", type=float, default=1.0)
    ap.add_argument("--bridge", type=float, default=0.0, help="갭 메우기 초 (채터 제거, 예 0.3)")
    ap.add_argument("--sweep", action="store_true", help="dwell 임계 0.3~1.5 sweep")
    args = ap.parse_args()

    gt = load_gt(args.gt)
    files = ([args.frames] if os.path.isfile(args.frames)
             else sorted(glob.glob(os.path.join(args.frames, "*.frames.csv"))))

    agg = []
    for fp in files:
        clip = os.path.basename(fp).replace(".frames.csv", "")
        segs = gt.get(clip) or gt.get(clip + ".mp4")
        if not segs:
            print(f"[건너뜀] {clip}: GT 없음 (ground_truth_segments.csv 에 clip='{clip}')")
            continue
        fps, frames = load_frames(fp)
        r = score_clip(frames, fps, segs, args.dwell, args.bridge)
        agg.append((clip, r))
        bridge_note = f", 갭메우기 {args.bridge}s" if args.bridge else ""
        print(f"\n▶ {clip}  (press {r['presses']}/가림제외 {r['reachable']}, "
              f"graze {r['grazes']}, dwell {r['dwells']}{bridge_note})")
        print(f"  ① lock-on 정확도 : {pct(r['lockon_acc'])}  (직전 미검출 {r['lock_nodet']})")
        print(f"  ② 스침 오탐율    : {pct(r['false_trig'])}")
        print(f"  ③ 순서 일치      : {'정확일치' if r['order_exact'] else '불일치'}  "
              f"(편집거리 {r['order_edit']})  검출:{r['det_seq']} / 정답:{r['gt_seq']}")
        print(f"  · dwell recall(전체/가림제외): {pct(r['recall'])} / {pct(r['recall_reach'])}  "
              f"| precision {pct(r['precision'])}")
        print(f"  · 프레임 ROI 정확도(가림제외/포함): {pct(r['frame_acc_exocc'])} / {pct(r['frame_acc_all'])}")

        if args.sweep:
            print("  · dwell 임계 sweep (thr: recall_가림제외 / 오탐):")
            for thr in [0.3, 0.5, 0.7, 0.8, 1.0, 1.2, 1.5]:
                rr = score_clip(frames, fps, segs, thr, args.bridge)
                print(f"      {thr:>4.1f}s : {pct(rr['recall_reach'])} / {pct(rr['false_trig'])}")

    # 종합 (정상 클립 위주 풀링)
    if len(agg) > 1:
        def avg(key):
            vals = [r[key] for _, r in agg if r[key] is not None]
            return statistics.mean(vals) if vals else None
        print("\n" + "=" * 56 + "\n[종합 평균]")
        print(f"  lock-on {pct(avg('lockon_acc'))} | 스침오탐 {pct(avg('false_trig'))} | "
              f"순서정확일치 {sum(1 for _,r in agg if r['order_exact'])}/{len(agg)}")


if __name__ == "__main__":
    main()
