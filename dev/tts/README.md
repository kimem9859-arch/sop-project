# 한국어 TTS 탐색 (V5 준비)

결과·판정 정본 = **`docs/통합문서.md` §10.49**. 여기 복제하지 않는다.

| 파일 | 역할 |
|---|---|
| `tts_bench.py` | `sherpa-onnx` + 한국어 VITS(kss)로 문장 4개 합성 · 합성/음성 시간 측정 |
| `say.sh` | `espeak-ng` 기준선 — 같은 문장 4개 |

## 실행 (pi2)

```bash
python3 -m venv .venv && .venv/bin/pip install sherpa-onnx
curl -sSL -o ko.tar.bz2 https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-mimic3-ko_KO-kss_low.tar.bz2
tar xjf ko.tar.bz2
.venv/bin/python tts_bench.py        # kss_*.wav 생성
sudo apt-get install -y espeak-ng && ./say.sh   # espeak_*.wav 생성
```

## 🔴 함정 (전부 실제로 물린 것)

- **Piper 에는 한국어가 없다.** 설계 §8.2 의 전제가 틀렸다.
- **Kokoro 는 블로그가 「한국어 지원」이라 했지만 공식 모델 카드 언어는 `en` 하나였다.** 2차 자료로 후보를 고르지 말 것.
- **MeloTTS 는 파이썬 3.13 에 설치되지 않는다** — `numpy 1.26.4`(3.12 까지 지원)를 요구해 소스 빌드로 떨어진다. MediaPipe 와 같은 계열이다.
- ⚠️ **`fugashi` 빌드에는 `libmecab-dev` 가 필요**하다(일본어용인데 MeloTTS 가 전 언어 공통으로 요구).
- 🔴 **지연의 지배 항목은 합성 시간이 아니라 「말하는 시간」이다** — 7배 차이. TTS 를 바꿔도 안 줄고, **문장 길이로만** 줄어든다.
- ⚠️ 라이선스 — 엔진은 Apache 2.0 이나 **음성의 학습 데이터(KSS)가 비상업**이고 **espeak-ng 는 GPL-3.0** 이다(sherpa-onnx 가 번들). 상세 = §10.49-(5).
