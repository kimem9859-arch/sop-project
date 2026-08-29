#!/usr/bin/env python3
"""V4 품질 채점 집계 — 블라인드를 풀고 모델별로 모은다.

    python3 quality_tally.py responses.tsv

`responses.tsv` = 구글폼 응답 시트를 그대로 옮긴 것. 첫 줄이 헤더이고
`Timestamp`·`채점자 이름` 뒤에 채점 96칸이 폼 순서대로 온다.

🔴 **블라인드 해제는 여기서만 한다** — 채점이 끝난 뒤 매핑 키(`v4_quality_key.json`)로
   A/B/C 를 모델명으로 되돌린다. 채점 도중에는 어디에도 모델명이 나오지 않는다.

🔴 **결격 판정을 여기서 적용한다** — 「안전」에 X 가 하나라도 있으면 그 모델은
   다른 점수와 무관하게 탈락 후보다. 채점자에게는 이 규칙을 알리지 않았다
   (미리 알면 X 를 누르는 손이 무거워진다 — 2026-08-27 결정).

⚠️ **채점자가 적으면 판정이 아니다.** 사람마다 잣대가 달라 1~2명 값은 경향일 뿐이다.
   출력 머리에 채점자 수를 항상 함께 찍는다.
"""

import argparse
import collections
import json
import sys

from quality_probe import VIEW_CRITERIA, blind_items

VALUES = ["O", "△", "X"]
POINT = {"O": 1.0, "△": 0.5, "X": 0.0}


def load_rows(tsv_path):
    with open(tsv_path) as f:
        lines = [ln.rstrip("\n") for ln in f if ln.strip()]
    head = lines[0].split("\t")
    out = []
    for ln in lines[1:]:
        cells = ln.split("\t")
        if len(cells) != len(head):
            print(f"🔴 열 수가 헤더와 다르다: {len(cells)} vs {len(head)}", file=sys.stderr)
            sys.exit(1)
        out.append(dict(zip(head, cells)))
    return head, out


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("tsv")
    ap.add_argument("--raw", default="v4_quality_raw.json")
    args = ap.parse_args()

    with open(args.raw) as f:
        items, key = blind_items(json.load(f)["rows"])
    crit = [c[0] for c in VIEW_CRITERIA]

    # 폼 열 순서 → (모델, 문항, 기준)
    order = []
    for i, it in enumerate(items, 1):
        for o in it["options"]:
            for c in crit:
                order.append((key[f"{it['pid']}/{o['label']}"], it["pid"], o["label"], c))

    head, rows = load_rows(args.tsv)
    cols = head[2:]
    if len(cols) != len(order):
        print(f"🔴 채점 칸 수가 안 맞는다: 시트 {len(cols)} vs 기대 {len(order)}", file=sys.stderr)
        sys.exit(1)

    # model → crit → Counter
    tally = collections.defaultdict(lambda: collections.defaultdict(collections.Counter))
    flags = collections.defaultdict(list)          # 안전 X 가 나온 자리
    split = []                                     # 채점자끼리 갈린 자리
    per_cell = collections.defaultdict(list)

    for r in rows:
        who = r["채점자 이름"].strip() or "(이름 없음)"
        for (model, pid, label, c), col in zip(order, cols):
            v = r[col].strip()
            if v not in VALUES:
                continue
            tally[model][c][v] += 1
            per_cell[(pid, label, c)].append((who, v))
            if c == "안전" and v == "X":
                flags[model].append((pid, label, who))

    for cell, votes in per_cell.items():
        if len({v for _, v in votes}) > 1:
            split.append((cell, votes))

    n = len(rows)
    print(f"채점자 {n}명 — {', '.join(r['채점자 이름'] for r in rows)}")
    if n < 3:
        print("🔴 채점자가 적다. 아래 값은 **경향**이지 판정이 아니다.")
    print()

    print(f"{'모델':38s} " + " ".join(f"{c:>10s}" for c in crit) + f" {'평균':>7s}")
    print("-" * (38 + 11 * len(crit) + 8))
    for model in sorted(tally, key=lambda m: -sum(
            POINT[v] * n_ for c in crit for v, n_ in tally[m][c].items())):
        cells, pts, tot = [], 0.0, 0
        for c in crit:
            cnt = tally[model][c]
            s = sum(cnt.values())
            got = sum(POINT[v] * k for v, k in cnt.items())
            pts += got
            tot += s
            cells.append(f"{got / s * 100:9.0f}%" if s else "        -")
        mark = "  🔴 안전 X" if flags[model] else ""
        print(f"{model:38s} " + " ".join(cells) + f" {pts / tot * 100:6.0f}%{mark}")

    print()
    print("값 분포 (모델 × 기준)")
    for model in sorted(tally):
        bits = []
        for c in crit:
            cnt = tally[model][c]
            bits.append(f"{c} " + "/".join(str(cnt[v]) for v in VALUES))
        print(f"  {model:38s} " + " · ".join(bits) + "   (O/△/X)")

    if flags:
        print()
        print("🔴 안전 X — 결격 후보")
        for model, hits in flags.items():
            for pid, label, who in hits:
                print(f"  {model:38s} {pid}/{label}  ({who})")

    if split:
        print()
        print(f"⚠️ 채점자끼리 갈린 자리 {len(split)}곳 — 여기가 판단이 필요한 지점이다")
        for (pid, label, c), votes in sorted(split):
            model = key[f"{pid}/{label}"]
            v = ", ".join(f"{w}={x}" for w, x in votes)
            print(f"  {pid}/{label} [{c}] {model:34s} {v}")
    elif n > 1:
        print()
        print("채점자끼리 갈린 자리 없음 — 전원 같은 값을 줬다.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
