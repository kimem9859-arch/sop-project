"""Colab T4에서 tool_v1 학습. 사용 전 sop-project를 clone 하고 아래 상수를 채운다.
데이터는 우리 Roboflow 프로젝트 버전에서 받아 3클래스로 필터 후 학습한다."""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from filter_tool_classes import filter_dataset

# ── ARCAD 공개 데이터셋 직접 다운로드 (fork 없음, Task 1 참조) ──
RF_API_KEY   = os.environ["ROBOFLOW_API_KEY"]   # Colab secret (아무 유효 키)
RF_WORKSPACE = "arcad"
RF_PROJECT   = "tools-detection-b2xjk"
RF_VERSION   = 9

def main():
    from roboflow import Roboflow
    rf = Roboflow(api_key=RF_API_KEY)
    ds = rf.workspace(RF_WORKSPACE).project(RF_PROJECT).version(RF_VERSION).download("yolov8")
    src = ds.location            # 12클래스 export 루트
    dst = "/content/tool_v1_data"
    stat = filter_dataset(src, dst,
        keep_names=['Adjustable Spanner', 'ScrewDriver', 'Wrench'],
        new_names=['spanner', 'driver', 'wrench'],
        drop_empty=True)   # 배경만 있는 이미지(다른 공구) 제외 — 92% 배경 방지
    print("[filter]", stat)

    from ultralytics import YOLO
    model = YOLO("yolov8n.pt")
    model.train(
        data=os.path.join(dst, "data.yaml"),
        imgsz=640, epochs=100, patience=20, batch=16, workers=2,
        # ── 공구 증강: 색 ON(console과 반대) + 방향 자유 ──
        hsv_h=0.015, hsv_s=0.7, hsv_v=0.4,   # 색 흔들기 허용
        degrees=30.0,                         # 회전 넓게
        fliplr=0.5, flipud=0.5,               # 상하뒤집기까지
        mosaic=1.0,
        project="runs", name="tool_v1",
    )
    # ARCAD valid 자동 mAP는 학습 종료 시 출력·runs/tool_v1/에 저장된다.
    print("[done] best =", "runs/tool_v1/weights/best.pt")

if __name__ == "__main__":
    main()
