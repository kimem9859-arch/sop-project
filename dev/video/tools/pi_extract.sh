#!/usr/bin/env bash
# 폰 영상 검출을 파이1 에서 돌린다 — Rpi5 는 건드리지 않고 ~/lab/video-extract/<id>/ 에서만(설계 D20)
# 사용: tools/pi_extract.sh ~/data/시연영상/<촬영 id> [--pad34]
set -euo pipefail
take="$(cd "$1" && pwd)"; name="$(basename "$take")"
here="$(cd "$(dirname "$0")" && pwd)"
remote="lab/video-extract/$name"
busy=$(ssh -o BatchMode=yes pi1 'for p in /proc/[0-9]*; do ls -l "$p/fd" 2>/dev/null | grep -q hailo && echo "${p#/proc/} $(tr "\0" " " < "$p/cmdline" | cut -c1-80)"; done' || true)
if [ -n "$busy" ]; then echo "🛑 NPU 사용 중 — 기다린다(다른 프로세스를 끄지 않는다):"; echo "$busy"; exit 2; fi
free_kb=$(ssh -o BatchMode=yes pi1 'df -Pk ~ | tail -1 | awk "{print \$4}"')
need_kb=$(( $(stat -L -c %s "$take/proxy.mp4") / 1024 + 200000 ))
if [ "$free_kb" -lt "$need_kb" ]; then echo "🛑 파이1 공간 부족 — 여유 ${free_kb}KB < 필요 ${need_kb}KB"; exit 3; fi
ssh -o BatchMode=yes pi1 "mkdir -p ~/$remote"
scp -q "$here/pi/extract_phone.py" "$take/proxy.mp4" "pi1:$remote/"
ssh -o BatchMode=yes pi1 "cd ~/$remote && python3 extract_phone.py proxy.mp4 dets.json ${2:-}" \
  || echo "(종료 코드 $? — Hailo 종료 때 Bus error 가 나도 결과 파일로 판단한다)"
scp -q "pi1:$remote/dets.json" "$take/dets.json"
ssh -o BatchMode=yes pi1 "rm -f ~/$remote/proxy.mp4"
python3 -c "import json,sys; d=json.load(open(sys.argv[1])); print('rows', len(d['rows']), 'fps', d['fps'], 'size', d['w'], d['h'], 'pad34', d.get('pad34'))" "$take/dets.json"
