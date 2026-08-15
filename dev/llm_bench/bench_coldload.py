#!/usr/bin/env python3
"""V4 보조 측정 — ⑤ 콜드 적재 시간과 ④ 적재 메모리만 정확히 다시 잰다.

1차 측정에서 두 값이 못 쓰게 나왔다:
  - ⑤ 1B 의 콜드값이 **페이지 캐시에 남아 오염**됐다(스모크 테스트 직후라 2.7초).
    → 매 측정 전 `drop_caches` 로 캐시를 비워 **SD카드에서 실제로 읽는 시간**을 잰다.
  - ④ `ollama ps` 가 빈 값이었다(HOME 누락).
    → 여기서는 정상 환경에서 부른다.

모델 상주 여부(=적재 시간을 매번 낼 것인가)를 판단하는 숫자이므로 따로 잰다.
"""

import json
import subprocess
import sys
import time
import urllib.request

sys.path.insert(0, "/home/pi")
from bench_llm import HOST, MODELS, OPTIONS, PROMPTS, SYSTEM, _post, _sh, unload

# ⚠️ 여기서는 `think` 를 끄지 않는다 — 재는 값이 `load_duration`(적재 시간)뿐이고
#    thinking 여부는 적재 시간에 영향을 주지 않는다.

REPEATS = 3  # 🔴 단일 값 금지


def drop_caches():
    subprocess.run("sync && sudo sysctl -q -w vm.drop_caches=3", shell=True, check=False)
    time.sleep(2)


def cold_load(model):
    """캐시를 비운 뒤 첫 요청 — load_duration 이 SD카드 읽기를 포함한 진짜 적재 시간."""
    unload(model)
    drop_caches()
    t0 = time.time()
    r = _post("/api/generate", {
        "model": model, "system": SYSTEM, "prompt": PROMPTS["qa"],
        "stream": False, "options": OPTIONS,
    })
    wall_ms = (time.time() - t0) * 1000
    return {
        "load_ms": round(r.get("load_duration", 0) / 1e6, 1),
        "wall_ms": round(wall_ms, 1),
    }


def main():
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--models", nargs="*", default=MODELS)
    ap.add_argument("--out", default="/home/pi/v4_coldload.json")
    a = ap.parse_args()
    out = {"measured_at": time.strftime("%Y-%m-%dT%H:%M:%S%z"), "models": []}
    for m in a.models:
        print(f"\n### {m}", flush=True)
        rec = {"model": m, "cold_loads": []}
        for i in range(REPEATS):
            c = cold_load(m)
            rec["cold_loads"].append(c)
            print(f"  콜드#{i+1} load_ms={c['load_ms']} wall_ms={c['wall_ms']}", flush=True)
        rec["ps"] = _sh("ollama ps")
        mem = _sh("free -b | awk '/^Mem/{print $7}'")
        rec["mem_available_while_loaded_b"] = int(mem) if mem.isdigit() else None
        print(f"  ollama ps: {rec['ps']}", flush=True)
        loads = sorted(c["load_ms"] for c in rec["cold_loads"])
        rec["load_ms_median"] = loads[len(loads) // 2]
        rec["load_ms_range"] = [loads[0], loads[-1]]
        print(f"  → 적재 중앙={rec['load_ms_median']}ms 범위={rec['load_ms_range']}", flush=True)
        unload(m)
        out["models"].append(rec)

    with open(a.out, "w") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print(f"\n저장: {a.out}", flush=True)


if __name__ == "__main__":
    main()
