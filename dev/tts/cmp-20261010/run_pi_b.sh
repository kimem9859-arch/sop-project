#!/bin/bash
# 파이2 측정 2차 — sherpa 판 Supertonic INT8 · Piper kss-medium. 1차가 끝나길 기다렸다가 돈다
cd ~/tts_probe/cmp-20261010
while pgrep -f run_pi_a.sh >/dev/null; do sleep 10; done
P=.venv/bin/python; M=models
t() { echo "== $(date +%T) $(vcgencmd measure_temp) $(vcgencmd get_throttled) :: $*"; }
for cfg in "sherpa-onnx-supertonic-tts-int8-2026-03-06 sst2int8 8 2" "sherpa-onnx-supertonic-tts-int8-2026-03-06 sst2int8 5 2" "sherpa-onnx-supertonic-tts-int8-2026-03-06 sst2int8 2 2" "sherpa-onnx-supertonic-tts-int8-2026-03-06 sst2int8 8 4" \
           "sherpa-onnx-supertonic-3-tts-int8-2026-05-11 sst3int8 8 2" "sherpa-onnx-supertonic-3-tts-int8-2026-05-11 sst3int8 4 2" "sherpa-onnx-supertonic-3-tts-int8-2026-05-11 sst3int8 2 2" "sherpa-onnx-supertonic-3-tts-int8-2026-05-11 sst3int8 8 4"; do
  set -- $cfg; t $2 $3 $4; $P -I bench_sst.py $M/$1 $2 $3 $4
done
for NT in 2 4; do t piper $NT; $P -I bench_piper.py $M/piper-kss-medium/ko_KR-kss-medium.onnx piper_kss_medium $NT; done
t 끝
