"""console_v2 학습 (데스크톱 RTX 5060 + WSL2)

  python train_console_v2.py --smoke    # 1 epoch 연기테스트 (증강이 먹는지 확인)
  python train_console_v2.py            # 본 학습 (200 epoch)

증강 근거·스펙 = Rpi5/Demo/augmentation_plan.md  (저조도 주력 · 정반사 보험 · Hue 금지)
절차·주의     = dev/ai_model/console_v2_학습가이드.md
※ 측정 수치 정본은 통합문서 §10 — 결과 수치를 이 파일에 적지 말 것.
"""
import argparse
from pathlib import Path

import albumentations as A
from ultralytics import YOLO

HERE = Path(__file__).resolve().parent
DATA = HERE / "console_v2-1" / "data.yaml"

# 색 손실 방어용 커스텀 증강.
# Ultralytics 기본값은 Blur/MedianBlur/ToGray/CLAHE가 p=0.01, 밝기·압축은 p=0.0(사실상 없음)
# → 우리가 필요한 저조도(밝기·채도↓)가 아예 없어서 직접 넘긴다.
# `augmentations=`는 Ultralytics가 공식 허용하는 커스텀 키(cfg/__init__.py: allowed_custom_keys).
# ⚠️ albumentations 2.x 인자명 필수 — 1.x 이름(var_limit·quality_lower·scale_min)은
#    에러 없이 경고만 뜨고 조용히 무시된 뒤 기본값이 적용된다.
AUGS = [
    # 주력: 저조도 (§10.13 저조도 세션에서 B3 사멸 — 유일한 실측 실패)
    A.RandomBrightnessContrast(brightness_limit=(-0.5, 0.1), contrast_limit=0.2, p=0.5),
    A.HueSaturationValue(hue_shift_limit=0, sat_shift_limit=(-40, 10), val_shift_limit=(-40, 10), p=0.4),
    A.GaussNoise(std_range=(0.012, 0.031), p=0.3),          # 1.x var_limit(10,60) 환산 = sqrt(var)/255
    # 보험(소량): 정반사·글레어 — AE가 막아줘서 조건부 위험
    A.RandomSunFlare(flare_roi=(0, 0, 1, 1), src_radius=80, p=0.1),
    # 강등: 파랑 스티커는 블러·JPEG·저해상도에 무손상(§10.12) → 일반 견고성 정도만
    A.ImageCompression(quality_range=(60, 100), p=0.2),
    A.Downscale(scale_range=(0.5, 0.9), p=0.1),
    # ❌ ToGray / CLAHE / Hue 변경 금지 — 색이 곧 클래스 정의
]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--smoke", action="store_true", help="1 epoch만 돌려 설정이 먹는지 확인")
    ap.add_argument("--model", default="yolov8n.pt", help="베이스 가중치")
    # WSL2는 page-locked(pinned) 메모리가 빠듯해 기본 workers=8이면
    # pin memory 스레드에서 CUDA OOM이 난다(모델 자체는 1.9GB밖에 안 씀). 2가 안전.
    ap.add_argument("--workers", type=int, default=2, help="dataloader 워커 수 (WSL2는 낮게)")
    args = ap.parse_args()

    if not DATA.exists():
        raise SystemExit(f"데이터셋 없음: {DATA}\n먼저:  python download_dataset.py")

    model = YOLO(args.model)
    model.train(
        data=str(DATA),
        epochs=1 if args.smoke else 200,
        patience=40,
        imgsz=640,              # Roboflow에서 Stretch 640으로 구움 → letterbox 왜곡 없음
        batch=16,
        device=0,
        workers=args.workers,
        # --- 네이티브 하이퍼파라미터 (augmentation_plan.md §3-C) ---
        hsv_h=0.0,              # 🔴 필수: 색이 클래스 정의 (파랑↔B3핑크↔EMO빨강 혼동 방지)
        hsv_s=0.3,
        hsv_v=0.4,              # 저조도 대비 일부 담당
        degrees=12,             # 헤드캠 기울기. 180° 뒤집기 금지
        translate=0.1,
        scale=0.5,
        fliplr=0.5,
        flipud=0.0,             # 상하 뒤집기 금지(정립 배포)
        mosaic=1.0,
        close_mosaic=10,
        # --- 커스텀 albumentations (공식 통로) ---
        augmentations=AUGS,
        project="runs",
        name="console_v2_smoke" if args.smoke else "console_v2",
        exist_ok=True,
        seed=0,
    )


if __name__ == "__main__":
    main()
