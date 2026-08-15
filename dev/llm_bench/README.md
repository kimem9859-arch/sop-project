# V4 · sop-pi-2 LLM 성능 측정 도구

설계 = `docs/superpowers/specs/2026-08-13-음성비서-design.md` §6 V4
결과 = **`docs/통합문서.md` §10.45** (수치 정본은 그쪽. 여기 복제하지 않는다)

## 파일

| 파일 | 역할 |
|---|---|
| `bench_llm.py` | 본 측정 — 모델×프롬프트별 토큰속도·첫토큰지연·완료시간 |
| `bench_coldload.py` | 보조 측정 — 콜드 적재시간(캐시 비움)·적재 메모리 |
| `v4_result_raw.json` | 본 측정 원시 결과 (2026-08-15) |
| `v4_coldload_raw.json` | 콜드 적재 원시 결과 (2026-08-15) |

## 실행법

pi2 에는 repo 를 클론하지 않는다. 스크립트만 보내 실행하고 결과를 회수한다.

```bash
scp dev/llm_bench/bench_llm.py dev/llm_bench/bench_coldload.py pi2:~/
ssh pi2 'cd ~ && python3 bench_llm.py --out ~/v4_result.json'
ssh pi2 'cd ~ && python3 bench_coldload.py'
scp pi2:~/v4_result.json pi2:~/v4_coldload.json dev/llm_bench/
```

의존성 없음(표준 라이브러리만) — pi2 에 pip 패키지를 깔지 않기 위해서다.

## 🔴 재사용 시 주의

- **지표 이름을 섞지 말 것** — `prefill_ms` / `ttft_ms` / `decode_tps` / `complete_ms` / `load_ms` 는 서로 다른 것을 잰다.
- **`complete_ms` 를 모델 간 직접 비교하지 말 것** — 생성 길이가 다르다. `est_ms_20tok`·`est_ms_40tok`(파생 환산값)을 쓴다.
- **콜드 적재를 잴 땐 페이지 캐시부터 비울 것** — 안 비우면 5배 빠르게 나온다(실제로 물렸다, §10.45-(6)).
- **조건이 바뀌면 `num_ctx`·`num_predict`·양자화를 결과에 다시 병기할 것.**
