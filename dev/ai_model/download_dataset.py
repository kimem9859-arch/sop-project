"""console_v2 데이터셋 다운로드 (Roboflow → YOLOv8 포맷)

실행: python download_dataset.py
- API 키는 이 파일에 넣지 않는다(커밋 사고 방지).
  ① 환경변수 ROBOFLOW_API_KEY 가 있으면 그걸 쓰고,
  ② 없으면 gitignore된 Dataset_API_Key/api_key 파일에서 키를 뽑아 쓴다.
- 학습 가이드: dev/ai_model/console_v2_학습가이드.md (② 데이터셋 download)
"""
import os
import re
from pathlib import Path

# --- 프로젝트 좌표 (비밀 아님) ---
WORKSPACE = "eung-min"
PROJECT   = "console_v2-mjefr"
VERSION   = 1          # Roboflow Versions 탭의 버전 번호
FORMAT    = "yolov8"

HERE = Path(__file__).resolve().parent
KEY_FILE = HERE / "Dataset_API_Key" / "api_key"   # gitignore됨


def load_api_key() -> str:
    """환경변수 우선, 없으면 키 파일에서 20자 영숫자 키를 추출."""
    env = os.environ.get("ROBOFLOW_API_KEY")
    if env:
        return env.strip()
    if KEY_FILE.exists():
        text = KEY_FILE.read_text(encoding="utf-8")
        m = re.search(r'api_key\s*=\s*["\']([^"\']+)["\']', text)   # snippet 형태
        if m:
            return m.group(1)
        m = re.search(r'\b[A-Za-z0-9]{16,}\b', text)                # 키만 있는 형태
        if m:
            return m.group(0)
    raise SystemExit(
        "API 키를 못 찾음. 환경변수 ROBOFLOW_API_KEY 를 설정하거나\n"
        f"{KEY_FILE} 에 키를 넣어라."
    )


def main():
    try:
        from roboflow import Roboflow
    except ImportError:
        raise SystemExit("roboflow 미설치 → 먼저:  pip install roboflow")

    rf = Roboflow(api_key=load_api_key())
    project = rf.workspace(WORKSPACE).project(PROJECT)
    dataset = project.version(VERSION).download(FORMAT)

    print(f"\n✅ 다운로드 완료: {dataset.location}")
    print("   data.yaml 확인 사항:")
    print("   - names: ['B1','B2','B3','B4','EMO']  (숫자 '0'..'4' 아님)")
    print("   - train ≈ 522 / valid ≈ 130 / test 0")


if __name__ == "__main__":
    main()
