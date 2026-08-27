# V4 · sop-pi-2 LLM 성능 측정 도구

설계 = `docs/superpowers/specs/2026-08-13-음성비서-design.md` §6 V4
결과 = **`docs/통합문서.md` §10.45(1차)·§10.46(2차·6종 비교)** — 수치 정본은 그쪽이다. 여기 복제하지 않는다

## 파일

| 파일 | 역할 |
|---|---|
| `bench_llm.py` | 본 측정 — 모델×프롬프트별 토큰속도·첫토큰지연·완료시간 |
| `bench_coldload.py` | 보조 측정 — 콜드 적재시간(캐시 비움)·적재 메모리 |
| `summarize.py` | 여러 회차 결과를 합쳐 한 표로 + 한국어 응답 나란히 보기(`--responses`) |
| `v4_result_raw.json` · `v4_coldload_raw.json` | 1차(Gemma 3종) 원시 결과 (2026-08-15) |
| `v4_result2_raw.json` · `v4_coldload2_raw.json` | 2차(LFM2.5·Qwen3.5) 원시 결과 (2026-08-16) |
| `v4_result3_raw.json` | `gemma4:e2b` thinking 끄고 재측정 (2026-08-16) |

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
- 🔴 **thinking 모델은 반드시 끄고 잴 것** — 안 끄면 생성 예산을 생각 과정이 다 먹어 **답변이 0글자**로 나오는데, 속도표에는 정상처럼 찍힌다(`gemma4:e2b` 에서 실제로 물렸다, §10.46-(4)). `bench_llm.py` 가 `think:false` 를 붙이고, 거부하는 모델은 자동으로 뺀다. `summarize.py` 는 응답이 전부 비면 **「측정 무효」** 로 표시한다.
- 🔴 **속도표만 보고 고르지 말 것** — `--responses` 로 한국어 답변을 반드시 사람이 읽는다. 그럴듯한 오답은 속도표에 안 나타난다.

## 라이선스 사본 — `licenses/`

🔴 **Ollama 배포본에는 라이선스 원문이 들어 있지 않다**(`ollama show --license` 가 빈 값). 그래서 원문을 여기 따로 받아 둔다.

- `licenses/LFM-Open-License-v1.0.txt` — 최우선 후보 `LiquidAI/lfm2.5-1.2b-instruct` 의 라이선스. 출처 = HuggingFace `LiquidAI/LFM2.5-1.2B-Instruct/raw/main/LICENSE`(2026-08-27 수신).
- **판정 정본은 통합문서 §10.46-(7)** — 결론만: Apache 2.0 기반 + **매출 $10M 미만이면 상업적 사용까지 허용**이라 우리 조건에서는 걸리지 않는다. **모델 파일을 남에게 넘길 때만** 사본 동봉 등 §4 조건이 발동한다.

## 품질 채점 (V4)

| 파일 | 역할 |
|---|---|
| `quality_probe.py` | 응답 수집(`run`) + 마크다운 블라인드 채점표(`sheet`) |
| `quality_form.py` | **링크 공유형 설문 페이지** 생성 — 여러 명이 채점해 제출 |
| `v4_quality_raw.json` | 응답 원자료 (3종 × 8프롬프트 = 24개, 2026-08-27) |
| `v4_quality_sheet.md` · `v4_quality_form.html` | 채점표 두 형태 (같은 A/B/C 배치) |
| `v4_quality_key.json` | 🔴 **매핑 키 — 채점이 끝나기 전에는 열지 말 것** |

- 🔴 **A/B/C 배치는 `blind_items()` 하나에서 온다** — 마크다운과 폼이 같은 함수를 쓴다. 따로 섞으면 매핑 키로 둘 다 복원할 수 없다.
- 🔴 **설문 페이지에는 집계 화면이 없다** — 채점자가 남의 점수에 끌려가지 않게 **숨긴 것이 아니라 만들지 않았다**(2026-08-27 사용자 결정). 종합은 관리자가 원자료를 읽어서 한다.
- ⚠️ **팀원에게 「편집 가능」으로 공유해야 제출이 저장된다.** 보기 전용으로 열리면 페이지가 옮겨 적을 텍스트를 대신 보여준다.
- 🔴 **품질은 `num_predict` 80 조건이다** — 속도표(§10.46)의 40 과 다르다. 섞어 인용하지 말 것.

### 채점 링크 (2026-08-27 · 수집 중)

| | 링크 |
|---|---|
| 팀원용 응답 폼 | https://docs.google.com/forms/d/e/1FAIpQLSdu1_nEHuinnkmfaHKYcHrBE4YeR36tH5Cnj2wwzy-HnhlR_A/viewform |
| 응답 시트 (관리자) | https://docs.google.com/spreadsheets/d/1B8KaYXD0Swega4lVzIE-ZcGYn5UnnwzG6qrOLu8DEiw/edit |
| 아티팩트 채점 페이지 (폐기) | https://claude.ai/code/artifact/7cc07cfe-598c-4375-ade1-025b1d05b242 |

- ⚠️ **21:44 에 만든 첫 폼·시트는 폐기**했다(열 이름이 문항별로 구분되지 않았다). 위 링크가 정본이다.
- 🔴 **아티팩트 페이지로는 수집하지 않는다** — 공유 설정에 편집 권한이 없어 제출이 저장되지 않고, 설령 저장되더라도 공유 링크의 **버전 고정** 때문에 뒤에 제출한 사람이 앞사람 채점을 지운다(2026-08-27 실물 확인). 채점 화면 자체는 멀쩡해 참고용으로 남긴다.
- 응답 시트는 **Claude 가 직접 읽는다**(드라이브 연결 확인함) — CSV 를 따로 내려받을 필요가 없다.
