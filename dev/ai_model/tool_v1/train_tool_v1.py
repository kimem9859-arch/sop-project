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
RUN_NAME     = "tool_v2"   # 1차(tool_v1) 산출물을 덮어쓰지 않는다 — 비교하려면 둘 다 있어야 한다

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
        # ── 공구 증강: 색 ON(console과 반대) ──
        # ⚠️ 2026-08-11 축소(§10.37-(6)①). 1차는 degrees=30·flipud=0.5 였는데
        #    ARCAD v9 자체가 이미 3x 증강(rotate 10° 포함)이 구워진 버전이라
        #    그 위에 또 얹은 꼴이었다. mAP50-95 0.251(박스 헐렁) 과 정합.
        hsv_h=0.015, hsv_s=0.7, hsv_v=0.4,   # 색 흔들기 허용 (공구는 색이 제각각)
        degrees=10.0,                         # v9 가 이미 rotate 10° 를 구웠다
        fliplr=0.5,                           # 좌우는 실제로 일어난다(왼손/오른손)
        flipud=0.0,                           # 🔴 상하뒤집기 끔 — 1인칭 착용 카메라에서
                                              #    공구가 위아래로 뒤집혀 보일 일이 없다
        mosaic=1.0,
        deterministic=True, seed=0,           # 1차와 같게 — 증강 변경 효과만 보려면 필수
        project="runs", name=RUN_NAME,
    )
    # ARCAD valid 자동 mAP는 학습 종료 시 출력·runs/<RUN_NAME>/에 저장된다.
    # 🔴 valid 는 115장·2종(wrench 0장)이라 시험지 구실을 못 한다(§10.37-(6)④).
    #    이 mAP 로 1차와 우열을 가리지 말 것 — 진짜 판정은 파이 눈확인이다.
    print("[done] best =", f"runs/{RUN_NAME}/weights/best.pt")
    print("[!] best.pt 를 즉시 Drive 로 저장할 것 — /content 는 런타임 리셋 시 소멸")

if __name__ == "__main__":
    main()
