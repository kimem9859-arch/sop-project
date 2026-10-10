#!/bin/bash
# 파이2 측정 1차 — kss · Supertonic 2/3 원본(fp32). 한 번에 하나씩 · 시작/끝 온도와 스로틀 기록
cd ~/tts_probe/cmp-20261010
export KSS_DIR=~/tts_probe/vits-mimic3-ko_KO-kss_low ST_DIR=~/tts_probe/cmp-20261010/models HF_HUB_OFFLINE=1
P=.venv/bin/python
t() { echo "== $(date +%T) $(vcgencmd measure_temp) $(vcgencmd get_throttled) :: $*"; }
for NT in 2 4; do t kss $NT; $P -I bench_kss.py $NT; done
for cfg in "supertonic-3 8 2" "supertonic-3 4 2" "supertonic-3 2 2" "supertonic-3 8 4" "supertonic-2 8 2" "supertonic-2 4 2" "supertonic-2 2 2" "supertonic-2 8 4"; do
  set -- $cfg; t $cfg; $P -I bench_st.py $1 F1 $2 $3 2>&1 | grep -v -E "Synthesiz|Loading|it/s"
done
t 끝
