#!/usr/bin/env python3
"""V4 · sop-pi-2 LLM 성능 측정.

설계 = docs/superpowers/specs/2026-08-13-음성비서-design.md §6 V4.
Ollama HTTP API 로 재며, 지연·토큰수는 **런타임이 돌려준 값**을 쓴다(자체 추정 금지).

🔴 지표 이름을 섞지 않는다 (CLAUDE.md §5):
  - prefill_ms      = 프롬프트 처리 시간 (ollama `prompt_eval_duration`)
  - ttft_ms         = 첫 토큰까지 = load_duration + prefill
  - decode_tps      = 초당 생성 토큰 수 = eval_count / eval_duration
  - complete_ms     = 요청 전체 소요 (ollama `total_duration`)
  - load_ms         = 모델 적재 시간 (ollama `load_duration`)

의존성 없음 — 표준 라이브러리만 쓴다(pi2에 pip 패키지를 깔지 않기 위해).
"""

import argparse
import json
import subprocess
import sys
import time
import urllib.error
import urllib.request

# ── 측정 조건 (전부 결과에 함께 기록된다) ──────────────────────────────
HOST = "http://127.0.0.1:11434"

MODELS = [
    # 1차 (2026-08-15) — Gemma 계열, 전부 QAT 양자화로 통일
    "gemma3:1b-it-qat",
    "gemma3:4b-it-qat",
    "gemma4:e2b-it-qat",
    # 2차 (2026-08-16) — 온디바이스 설계 모델로 후보 확대
    "LiquidAI/lfm2.5-1.2b-instruct",
    "qwen3.5:0.8b",
    "qwen3.5:2b",
]

# num_ctx 를 기본값(128K)으로 두면 KV 캐시가 RAM 을 삼켜 OOM 이 난다.
# pi2 는 스왑이 없어 실패가 느려짐이 아니라 즉사다.
OPTIONS = {
    "num_ctx": 2048,
    "num_predict": 40,   # 설계문서 ② "짧은 문장(20~40토큰)"
    "temperature": 0.0,  # 재현성 — 편차에서 샘플링 요동을 뺀다
    "seed": 42,
}

SYSTEM = (
    "너는 반도체 PECVD 장비 정비(PM) 작업자를 돕는 음성 비서다. "
    "작업자는 장갑을 끼고 화면을 보지 않는다. 반드시 한국어로, 한두 문장으로 짧게 답한다."
)

# §8.4 기능 후보를 그대로 프롬프트로 만든다 — 남의 벤치마크가 아니라 우리 문장으로 잰다.
PROMPTS = {
    "violation": "지금 3번 밸브를 잠그지 않고 챔버 도어를 열려고 했다. 왜 안 되는지 설명해라.",
    "tool": "챔버 상부 플랜지 볼트를 푸는 데 필요한 공구를 알려줘.",
    "summary": "오늘 PM 작업에서 챔버 청소, 샤워헤드 교체, 리크 체크를 마쳤다. 작업 종료 요약을 말해줘.",
    "qa": "가디언, 지금 다음 순서가 뭐야?",
}

WARMUP = 1   # 버림
REPEATS = 5  # 🔴 단일 실행 값 금지 (CLAUDE.md §5) — 중앙값과 범위를 함께 남긴다


# ── 유틸 ──────────────────────────────────────────────────────────────
def _post(path, payload, timeout=600):
    req = urllib.request.Request(
        HOST + path,
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read())


def _sh(cmd):
    # ⚠️ pi2 는 로케일이 ko_KR 이라 `free` 가 "메모리:" 로 찍힌다.
    #    영문 헤더를 전제로 파싱하므로 LC_ALL=C 를 강제한다.
    try:
        return subprocess.run(
            cmd, shell=True, capture_output=True, text=True, timeout=10,
            # ⚠️ HOME 을 빼면 `ollama ps` 가 조용히 빈 값을 낸다(1차 측정에서 물림).
            env={"LC_ALL": "C", "PATH": "/usr/local/bin:/usr/bin:/bin",
                 "HOME": "/home/pi"},
        ).stdout.strip()
    except Exception:
        return ""


def system_state():
    """자원 사용률·발열. 🔴 느릴 때 원인을 단정하지 않기 위해 매번 같이 남긴다."""
    mem = _sh("free -b | awk '/^Mem/{print $2, $3, $7}'").split()
    return {
        "mem_total_b": int(mem[0]) if len(mem) == 3 else None,
        "mem_used_b": int(mem[1]) if len(mem) == 3 else None,
        "mem_available_b": int(mem[2]) if len(mem) == 3 else None,
        "throttled": _sh("vcgencmd get_throttled"),
        "temp": _sh("vcgencmd measure_temp"),
        "cpu_mhz": _sh("vcgencmd measure_clock arm"),
        "loadavg": _sh("cut -d' ' -f1-3 /proc/loadavg"),
    }


def unload(model):
    """모델을 내려 콜드 상태로 만든다 — 적재 시간(⑤)을 재기 위해."""
    try:
        _post("/api/generate", {"model": model, "keep_alive": 0}, timeout=120)
    except Exception:
        pass
    time.sleep(3)


# 🔴 Qwen3.5 등은 「thinking」(추론 과정을 토큰으로 뱉는) 모드가 기본이다.
#    켜두면 생각 과정이 생성 토큰에 섞여 **다른 모델과 비교가 성립하지 않는다**
#    (토큰 수·완료 시간이 몇 배로 뛴다). 끄고 잰다.
#    thinking 을 모르는 모델은 이 필드를 거부하므로, 거부하면 빼고 재시도한다.
_NO_THINK_FIELD = set()


def generate(model, prompt):
    ns = 1_000_000.0  # ns → ms
    body = {
        "model": model,
        "system": SYSTEM,
        "prompt": prompt,
        "stream": False,
        "options": OPTIONS,
    }
    if model not in _NO_THINK_FIELD:
        body["think"] = False
    try:
        r = _post("/api/generate", body)
    except urllib.error.HTTPError:
        # 이 모델은 think 필드를 모른다 — 빼고 재시도하고, 이후로는 안 붙인다.
        _NO_THINK_FIELD.add(model)
        body.pop("think", None)
        r = _post("/api/generate", body)
    load_ms = r.get("load_duration", 0) / ns
    prefill_ms = r.get("prompt_eval_duration", 0) / ns
    eval_ms = r.get("eval_duration", 0) / ns
    eval_n = r.get("eval_count", 0)
    tps = eval_n / (eval_ms / 1000.0) if eval_ms > 0 else None
    ttft = load_ms + prefill_ms
    out = {
        "load_ms": round(load_ms, 1),
        "prefill_ms": round(prefill_ms, 1),
        "ttft_ms": round(ttft, 1),
        "decode_ms": round(eval_ms, 1),
        "decode_tokens": eval_n,
        "decode_tps": round(tps, 2) if tps else None,
        "prompt_tokens": r.get("prompt_eval_count", 0),
        "complete_ms": round(r.get("total_duration", 0) / ns, 1),
        "response": r.get("response", "").strip(),
        # 🔴 잘림 판별용 — `length` 면 생성 예산이 모자라 답이 끊긴 것이다
        #    (§10.46-(4) 의 thinking 함정이 정확히 이 값으로 드러났다).
        "done_reason": r.get("done_reason"),
    }
    # ⚠️ 모델마다 답변 길이가 달라 complete_ms 를 바로 비교하면 안 된다.
    #    설계문서 ②「20~40토큰 완료 시간」은 길이를 고정해야 비교가 성립하므로
    #    ttft + n/decode_tps 로 **환산**한다. 실측이 아니라 파생값임을 이름에 박는다.
    for n in (20, 40):
        out[f"est_ms_{n}tok"] = round(ttft + n / tps * 1000.0, 1) if tps else None
    return out


def ps_mem(model):
    """적재된 모델이 실제로 쓰는 메모리(④)."""
    out = _sh("ollama ps")
    for line in out.splitlines():
        if line.startswith(model.split(":")[0]):
            return line.strip()
    return out.strip()


# ── 본체 ──────────────────────────────────────────────────────────────
def run_model(model):
    print(f"\n{'='*60}\n### {model}\n{'='*60}", flush=True)
    rec = {"model": model, "cold": None, "runs": [], "mem": None, "error": None}

    rec["state_before"] = system_state()

    # ⑤ 콜드 적재 — 모델을 내린 뒤 첫 요청 1회
    unload(model)
    try:
        cold = generate(model, PROMPTS["qa"])
    except (urllib.error.URLError, OSError) as e:
        rec["error"] = f"콜드 실행 실패: {e}"
        print(f"  🔴 {rec['error']}", flush=True)
        return rec
    rec["cold"] = cold
    print(f"  콜드 적재 load_ms={cold['load_ms']} ttft_ms={cold['ttft_ms']}", flush=True)

    rec["mem"] = ps_mem(model)
    print(f"  적재 메모리: {rec['mem']}", flush=True)

    for pid, prompt in PROMPTS.items():
        for i in range(WARMUP + REPEATS):
            try:
                r = generate(model, prompt)
            except (urllib.error.URLError, OSError) as e:
                rec["error"] = f"{pid} 실행 실패: {e}"
                print(f"  🔴 {rec['error']}", flush=True)
                return rec
            if i < WARMUP:
                continue  # 워밍업은 버린다
            r["prompt_id"] = pid
            r["state"] = system_state()
            rec["runs"].append(r)
        got = [x for x in rec["runs"] if x["prompt_id"] == pid]
        tps = sorted(x["decode_tps"] for x in got if x["decode_tps"])
        comp = sorted(x["complete_ms"] for x in got)
        print(
            f"  {pid:10s} decode_tps 중앙={tps[len(tps)//2]:.2f} "
            f"({tps[0]:.2f}~{tps[-1]:.2f})  "
            f"complete_ms 중앙={comp[len(comp)//2]:.0f} ({comp[0]:.0f}~{comp[-1]:.0f})",
            flush=True,
        )

    rec["state_after"] = system_state()
    unload(model)
    return rec


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="v4_result.json")
    ap.add_argument("--models", nargs="*", default=MODELS)
    args = ap.parse_args()

    result = {
        "measured_at": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
        "host": _sh("hostname"),
        "conditions": {
            "options": OPTIONS,
            "warmup": WARMUP,
            "repeats": REPEATS,
            "system_prompt": SYSTEM,
            "prompts": PROMPTS,
            "ollama_version": _sh("ollama --version"),
            "kernel": _sh("uname -r"),
            "cpu_cores": _sh("nproc"),
            # 🔴 절대경로로 부른다 — `swapon` 은 `/sbin` 에 있고 사용자 PATH 에 없다.
            #    상대경로로 부르던 1·2차 회차는 "명령 없음"을 **「스왑 없음」으로 기록**했다
            #    (2026-08-27 발견 — 실제로는 zram 2GB 가 있었다).
            "swap": _sh("/sbin/swapon --show") or _sh("free -h | grep -i swap") or "확인 실패",
        },
        "models": [],
    }

    for m in args.models:
        result["models"].append(run_model(m))

    with open(args.out, "w") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    print(f"\n결과 저장: {args.out}", flush=True)

    fails = [m["model"] for m in result["models"] if m["error"]]
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
