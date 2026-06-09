#!/usr/bin/env bash
# PoC 실행 래퍼: venv + 로컬 추출 시스템 라이브러리(libGLESv2) 경로 설정
HERE="$(cd "$(dirname "$0")/../.." && pwd)"   # projects 루트 (dev/poc 기준 2단계 위)
export LD_LIBRARY_PATH="$HERE/.syslibs/extracted/usr/lib/x86_64-linux-gnu:$LD_LIBRARY_PATH"
exec "$HERE/.poc_venv/bin/python" "$HERE/dev/poc/roi_hover.py" "$@"
