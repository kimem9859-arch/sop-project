#!/usr/bin/env bash
# 원본 → 검출용 사본: 긴 변 1280 · 30fps · 회전 표시를 픽셀에 반영(ffmpeg 기본 autorotate) · 소리 없음
# 사용: tools/proxy.sh <원본> <출력.mp4>
set -euo pipefail
src="$(realpath "$1")"; out="$(realpath -m "$2")"
cd "$(dirname "$0")/.."
npx remotion ffmpeg -hide_banner -loglevel error -y -i "$src" \
  -vf "scale='if(gt(iw,ih),1280,-2)':'if(gt(iw,ih),-2,1280)'" -r 30 \
  -c:v libx264 -preset veryfast -crf 20 -pix_fmt yuv420p -an -movflags +faststart "$out"
npx remotion ffprobe -v error -select_streams v:0 \
  -show_entries stream=width,height,r_frame_rate,nb_frames:stream_side_data=rotation -of compact "$out"
