# 한국어 TTS 탐색 (V5 준비)

결과·판정 정본 = **`docs/성능검증-저널.md` §12.49**(2026-08-30 첫 탐색) · **§12.94**(2026-10-10 재탐색 · 파이2 비교 = `cmp-20261010/`). 여기 복제하지 않는다.

| 파일 | 역할 |
|---|---|
| `tts_bench.py` | `sherpa-onnx` + 한국어 VITS(kss)로 문장 4개 합성 · 합성/음성 시간 측정 |
| `say.sh` | `espeak-ng` 기준선 — 같은 문장 4개 |
| `cmp-20261010/` | 재탐색 — kss · Piper kss-medium · Supertonic 2/3(원본 · INT8)을 파이2 에서 합성 시간 · 받아쓰기 오류율로 비교(설명 = 그 폴더 README) |

## 실행 (pi2)

```bash
python3 -m venv .venv && .venv/bin/pip install sherpa-onnx
curl -sSL -o ko.tar.bz2 https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-mimic3-ko_KO-kss_low.tar.bz2
tar xjf ko.tar.bz2
.venv/bin/python tts_bench.py        # kss_*.wav 생성
sudo apt-get install -y espeak-ng && ./say.sh   # espeak_*.wav 생성
```

## 🔴 함정 (전부 실제로 물린 것)

- ~~**Piper 에는 한국어가 없다.**~~ ⛔ **틀렸다(2026-10-10 확인)** — 공식 `rhasspy/piper-voices` 에 `ko_KR-kss-medium` 이 **2026-07-23** 에 올라와 있었다(8/30 탐색 5주 전 · 커밋 「Add ko, he, mr voices」). 다만 학습 데이터가 같은 KSS(비상업)이고 발음 변환도 espeak 라 지금 kss 의 문제가 그대로다(§12.94).
- 🔴 **후보는 엔진의 공식 모델 목록(`sherpa-onnx` `tts-models` 릴리스)과 한국어 검색으로도 찾는다** — 8/30 에는 영어권에서 유명한 도구(Piper · Kokoro · Melo)만 봐서, 이미 한국어를 지원하던 Supertonic 2(2026-01-06) · 3(2026-04-29)을 놓쳤다(§12.94).
- 🔴 **설치 실패 ≠ 탈락** — MeloTTS 는 모델이 아니라 파이썬 버전 문제였다. 다른 버전 가상환경으로 시험할 수 있으면 「설치 실패(환경)」로 따로 적는다.
- **Kokoro 는 블로그가 「한국어 지원」이라 했지만 공식 모델 카드 언어는 `en` 하나였다.** 2차 자료로 후보를 고르지 말 것.
- **MeloTTS 는 파이썬 3.13 에 설치되지 않는다** — `numpy 1.26.4`(3.12 까지 지원)를 요구해 소스 빌드로 떨어진다. MediaPipe 와 같은 계열이다.
- ⚠️ **`fugashi` 빌드에는 `libmecab-dev` 가 필요**하다(일본어용인데 MeloTTS 가 전 언어 공통으로 요구).
- 🔴 **지연의 지배 항목은 합성 시간이 아니라 「말하는 시간」이다** — 7배 차이. TTS 를 바꿔도 안 줄고, **문장 길이로만** 줄어든다.
- 🔴 **Supertonic 3 는 단계를 2 로 줄이면 소리가 무너진다**(받아쓰기 오류율 82~87%) · 문장마다 빠르기를 평균하면 짧은 문장이 크게 잡힌다 — 전체 글자 ÷ 전체 말소리 길이로 잰다(`cmp-20261010/README.md`).
- ⚠️ 라이선스 — 엔진은 Apache 2.0 이나 **음성의 학습 데이터(KSS)가 비상업**이고 **espeak-ng 는 GPL-3.0** 이다(sherpa-onnx 가 번들). 상세 = 저널 §12.49-(5).
