#!/usr/bin/env bash
# 원본 → 검출용 사본: 긴 변 1280 · 30fps · 회전 표시를 픽셀에 반영(ffmpeg 기본 autorotate) · 소리 없음
# 사용: tools/proxy.sh <원본> <출력.mp4> [긴 변=1280] [crf=20]
#   고화질 사본(hq.mp4 · 최종 렌더 hq 용) = 긴 변 1920 · crf 16 — 같은 과정이라 프레임 시각이 사본과 같다
#   (원본을 그대로 쓰면 59 → 30fps 변환 차이로 사본보다 0.05초 앞선 장면이 나와 검출 표시와 어긋난다 · 10/13 실측)
set -euo pipefail
src="$(realpath "$1")"; out="$(realpath -m "$2")"; long="${3:-1280}"; crf="${4:-20}"
cd "$(dirname "$0")/.."
npx remotion ffmpeg -hide_banner -loglevel error -y -i "$src" \
  -vf "scale='if(gt(iw,ih),$long,-2)':'if(gt(iw,ih),-2,$long)'" -r 30 \
  -c:v libx264 -preset veryfast -crf "$crf" -pix_fmt yuv420p -an -movflags +faststart "$out"
npx remotion ffprobe -v error -select_streams v:0 \
  -show_entries stream=width,height,r_frame_rate,nb_frames:stream_side_data=rotation -of compact "$out"
