#!/usr/bin/env python3
"""V4 결과 요약 — 여러 회차의 결과 JSON 을 합쳐 한 표로 본다.

수치 정본은 `docs/통합문서.md` §10.45 다. 이 도구는 **표를 만드는 도구**이지
정본이 아니다.

사용법:
    python3 summarize.py v4_result_raw.json v4_result2_raw.json \
        --cold v4_coldload_raw.json v4_coldload2_raw.json
    python3 summarize.py ... --responses      # 한국어 응답 품질 눈확인용
"""

import argparse
import json


def med(xs):
    xs = sorted(xs)
    return xs[len(xs) // 2] if xs else None


def load(paths):
    """뒤에 온 파일이 이긴다 — 같은 모델을 재측정했으면 나중 것이 유효하다."""
    by_name = {}
    for p in paths:
        for m in json.load(open(p))["models"]:
            by_name[m["model"]] = m
    return list(by_name.values())


def invalidate_empty(m):
    """🔴 응답이 전부 비어 있으면 측정이 무효다.

    thinking 모델을 `think` 를 끄지 않고 재면 생성 예산을 생각 과정이 다 먹고
    **답변이 0글자**로 나온다(gemma4:e2b 에서 실제로 물렸다). 속도표만 보면
    「빠른 모델」로 남으므로 여기서 걸러 낸다.
    """
    if m.get("runs") and all(not r["response"].strip() for r in m["runs"]):
        m["error"] = "응답 0글자 — thinking 소진 의심. 측정 무효(think 끄고 재측정할 것)"
    return m


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("results", nargs="+")
    ap.add_argument("--cold", nargs="*", default=[])
    ap.add_argument("--responses", action="store_true")
    args = ap.parse_args()

    models = [invalidate_empty(m) for m in load(args.results)]
    cold = {m["model"]: m for m in load(args.cold)} if args.cold else {}

    rows = []
    for m in models:
        if m.get("error") or not m["runs"]:
            rows.append((m["model"], None, None, None, None, None, m.get("error", "실행 실패")))
            continue
        runs = m["runs"]
        tps = [x["decode_tps"] for x in runs if x["decode_tps"]]
        c = cold.get(m["model"], {})
        rows.append((
            m["model"],
            med(tps),
            (min(tps), max(tps)),
            med([x["ttft_ms"] for x in runs]),
            med([x["est_ms_20tok"] for x in runs if x["est_ms_20tok"]]),
            c.get("load_ms_median"),
            None,
        ))

    rows.sort(key=lambda r: -(r[1] or 0))

    print(f"{'모델':32s} {'tok/s':>8s} {'(범위)':>16s} {'첫토큰ms':>9s} {'20토큰ms':>9s} {'콜드적재s':>10s}")
    print("-" * 92)
    for name, tps, rng, ttft, e20, cold_ms, err in rows:
        if err:
            print(f"{name:32s} {'—':>8s}   🔴 {err}")
            continue
        ld = f"{cold_ms/1000:.1f}" if cold_ms else "—"
        print(f"{name:32s} {tps:8.2f} {f'({rng[0]:.2f}~{rng[1]:.2f})':>16s} "
              f"{ttft:9.0f} {e20:9.0f} {ld:>10s}")
    print("\n🔴 조건 병기 필수 — sop-pi-2·Ollama CPU·num_ctx 2048·num_predict 40·temp 0·5회 중앙값")
    print("🔴 est_20토큰ms 는 실측이 아니라 `첫토큰 + 20÷tok/s` 환산값이다(길이 고정 비교용).")

    if args.responses:
        print("\n" + "=" * 92)
        print("한국어 응답 품질 눈확인 — 🔴 속도표로는 못 거른다. 반드시 사람이 읽는다.")
        print("=" * 92)
        pids = []
        for m in models:
            for r in m["runs"]:
                if r["prompt_id"] not in pids:
                    pids.append(r["prompt_id"])
        for pid in pids:
            print(f"\n### [{pid}]")
            for m in models:
                got = [r for r in m["runs"] if r["prompt_id"] == pid]
                if not got:
                    continue
                txt = got[0]["response"].replace("\n", " ")
                print(f"  {m['model']:32s} | {txt[:110]}")


if __name__ == "__main__":
    main()
