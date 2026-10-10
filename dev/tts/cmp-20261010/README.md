# 한국어 TTS 후보 비교 — 파이2 합성 시간 · 받아쓰기 오류율 (2026-10-10)

결과·판정 정본 = **`docs/성능검증-저널.md` §12.94**(확정값 = 통합문서 §12 `[CURRENT]` 「성능 (음성 비서 TTS)」). 여기 복제하지 않는다.

| 파일 | 역할 |
|---|---|
| `sentences.json` | 문장 10개 — `cal_*` 4개 = §12.49 와 같은 문장(보정용) · 나머지 6개 = 파이 고정 문장(`make_answers.py` · `voice_card.alert_texts()`) |
| `common.py` | 공통 — 데우기 1회 뒤 문장마다 3회 재서 가운데 값 · 말소리 길이(앞뒤 무음 = 최고점 2% 미만 뺌) · 최대 RSS |
| `bench_kss.py` | 지금 파이 목소리 `vits-mimic3-ko_KO-kss_low`(sherpa-onnx) — `KSS_DIR` 로 모델 폴더 |
| `bench_st.py` | Supertonic 원본(`supertonic` 패키지 · onnxruntime) — 인자 `모델 목소리 단계 스레드` · `ST_DIR` 로 모델 폴더 · `SPEED` 로 빠르기(기본 1.05) |
| `bench_sst.py` | Supertonic INT8(sherpa-onnx 판) — sid 0 = F1(`voice.bin` 을 F1.json 과 대조 · 순서 F1~F5 · M1~M5) |
| `bench_piper.py` | Piper `ko_KR-kss-medium`(`piper-tts` 1.8.0 · 스레드를 정하려고 세션을 다시 만든다) |
| `run_pi_a.sh` · `run_pi_b.sh` | 파이2 실행 순서(1차 = kss · Supertonic 원본 / 2차 = INT8 · Piper) · 시작마다 온도 · 스로틀 기록 |
| `run_a.log` · `run_b.log` | 파이2 출력 그대로 |
| `stt_cer.py` | 받아쓰기 오류율 — 파이와 같은 STT(`sherpa-onnx-zipformer-korean-2024-06-24` int8 · modified_beam_search · **핫워드 없음**) · 영문 없는 7문장 |
| `결과_pi2.json` | 설정마다 합성 시간 · 말 빠르기 · 최대 RSS · 받아쓰기 오류율 · 문장별 값(빠르기 1.15 · 1.20 · 1.25 판은 `SPEED=… bench_st.py supertonic-2 F1 4 2` 로 따로 돌림) |
| `concat.py` | 후보 하나의 문장 7개를 0.7초 쉼으로 이어 듣기 파일 하나로 |
| `big_cpu.py` · `big_cpu_desktop.log` | Qwen3-TTS 1.7B · Chatterbox 다국어를 **데스크톱 CPU 4스레드**로 한 문장씩(파이 가능성 가늠 · 파이에서는 안 돌림) |

## 실행 (파이2 `~/tts_probe/cmp-20261010/`)

```bash
python3 -m venv .venv && .venv/bin/pip install supertonic==1.3.1 sherpa-onnx==1.13.6 piper-tts==1.8.0
# 모델 = models/{supertonic-2,supertonic-3,sherpa-onnx-supertonic-*-int8-*,piper-kss-medium} (데스크톱에서 복사)
./run_pi_a.sh > run_a.log 2>&1; ./run_pi_b.sh > run_b.log 2>&1
```

받아쓰기 채점 · 듣기 파일은 데스크톱에서 — `python -I stt_cer.py <out 폴더>` · `python -I concat.py <out/이름> <저장 경로>`.

## 🔴 함정

- **Supertonic 3 는 2단계에서 소리가 무너진다**(받아쓰기 오류율 82~87%) — Supertonic 2 는 2단계도 버틴다.
- **문장마다 빠르기를 평균하면 틀린다** — 짧은 문장의 빠르기가 크게 잡혀 F1 을 9.2자/초로 봤다. 전체 글자 ÷ 전체 말소리 길이로 재면 8.6자/초다(그래서 「빠르기 1.25 = F1 과 같음」이라고 잘못 소개했다).
- 오류율은 문장 7개를 한 번씩 만든 값이라 같은 kss 도 17.7 · 21.1% 로 흔들린다 — **몇 %p 차이는 의미가 없다.**
- 모델 공급사(수퍼톤)는 2026-07 해산 · 청산 결의 · GitHub 보관(2026-09-09) — **우리 사본이 정본**(데스크톱 `~/env/tts/supertonic-2` · `SHA256SUMS`).
