"""우리 작업환경 배경 → 빈 라벨 네거티브 데이터셋.

정본: ../../../docs/superpowers/specs/2026-08-14-네거티브보강-design.md §3·§5

무엇을 하나:
    `Rpi5/Demo/test/raw/` 의 실촬영 세션에서 프레임을 균등하게 뽑아
    **빈 라벨(.txt 0바이트)** 과 함께 YOLO 데이터셋 모양으로 만든다.
    그 결과를 `build_tool_v3_dataset.py` 에 **소스 하나로** 넘긴다.

왜 필요한가:
    §10.42 의 배경 오검출(키보드→wrench 0.79 등)의 원인은 §10.40 의 네거티브가
    **전부 공개 데이터셋의 다른 공구**(망치·드릴·볼트)이고 **우리 작업환경 배경은
    한 장도 없기** 때문이다. 모델이 "공구가 아닌 일상 배경"을 본 적이 거의 없다.

🔴 **라벨링 작업이 없다.** 네거티브는 빈 파일이 정답이다. 대신 **선별**이 중요하다 —
   공구가 찍힌 프레임이 섞이면 "공구가 있는데 없다고" 가르치는 것이라 검출을
   죽인다(*"틀린 라벨은 없는 라벨보다 해롭다"* — 색 자동라벨러를 버린 이유).
   선별 결과는 `sessions_split.json` 이 정본이며 이 스크립트는 그것을 따를 뿐이다.

🔴 **홀드아웃 세션은 한 장도 넣지 않는다.** 넣으면 평가가 순환논리가 된다.

⚠️ **결정적이다** — 정렬 + 균등 간격. 랜덤을 쓰지 않아 seed 조차 필요 없다.
   §10.40 이 파이·Colab 체크섬 일치로 실증한 재현성을 같은 방식으로 지킨다.

사용법:
    ~/rfenv/bin/python build_bg_negatives.py <출력경로> <raw루트> <split.json> \
        [--per-session 38]
"""

import argparse
import glob
import hashlib
import json
import os
import shutil
import sys

NAMES = ['driver', 'wrench', 'pliers']   # 🔴 build_tool_v3_dataset.NEW_NAMES 와 같은 순서


def pick_frames(raw_root, split, per_session):
    """학습용 세션에서 프레임을 균등 간격으로 뽑는다.

    split = {"train": [세션명...], "holdout": [...], "excluded": {세션명: 사유}}
    반환 = 이미지 경로 목록(정렬됨). **holdout·excluded 는 한 장도 포함하지 않는다.**

    균등 간격을 쓰는 이유: 랜덤이면 세션 앞부분에 몰릴 수 있다. 촬영 중 구도·조명이
    조금씩 바뀌므로 앞뒤가 고르게 담기는 편이 배경 다양성에 낫다.
    """
    banned = set(split.get('holdout', [])) | set(split.get('excluded', {}))
    out = []
    for sess in sorted(split.get('train', [])):
        if sess in banned:                       # 방어 — split 이 모순이면 넣지 않는다
            continue
        d = os.path.join(raw_root, sess)
        imgs = sorted(glob.glob(os.path.join(d, '*.png')))
        if not imgs:
            continue
        n = min(per_session, len(imgs))
        if n == len(imgs):
            out.extend(imgs)
            continue
        step = len(imgs) / n
        out.extend(imgs[int(i * step)] for i in range(n))
    return out


def build_to_dir(out_dir, raw_root, split, per_session):
    """뽑은 프레임을 데이터셋 모양으로 쓴다. 반환 = 쓴 이미지 경로 목록."""
    img_dir = os.path.join(out_dir, 'train', 'images')
    lbl_dir = os.path.join(out_dir, 'train', 'labels')
    os.makedirs(img_dir, exist_ok=True)
    os.makedirs(lbl_dir, exist_ok=True)

    picked = pick_frames(raw_root, split, per_session)
    written = []
    for src in picked:
        sess = os.path.basename(os.path.dirname(src))
        # 🔴 세션이 달라도 f00000.png 는 겹친다 — 병합 도구가 이름 충돌을 검사하므로
        #    세션명을 파일명에 넣어 유일하게 만든다.
        name = f'bg_{sess}_{os.path.basename(src)}'
        shutil.copy(src, os.path.join(img_dir, name))
        # 🔑 빈 라벨 = "이 이미지에 찾을 물체가 없다"
        open(os.path.join(lbl_dir, os.path.splitext(name)[0] + '.txt'), 'w').close()
        written.append(os.path.join(img_dir, name))

    with open(os.path.join(out_dir, 'data.yaml'), 'w') as f:
        f.write('names:\n')
        for n in NAMES:
            f.write(f'- {n}\n')
        f.write(f'nc: {len(NAMES)}\n')
        f.write(f'path: {os.path.abspath(out_dir)}\n')
        f.write('train: train/images\n')
        f.write('val: train/images\n')   # 네거티브 전용이라 valid 를 따로 두지 않는다

    return written


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('out_dir')
    ap.add_argument('raw_root')
    ap.add_argument('split_json')
    ap.add_argument('--per-session', type=int, default=38,
                    help='세션당 몇 장 (기본 38 ≈ 52세션 × 38 ≈ 2,000장)')
    a = ap.parse_args(argv)

    out_dir = os.path.expanduser(a.out_dir)
    raw_root = os.path.expanduser(a.raw_root)
    with open(os.path.expanduser(a.split_json)) as f:
        split = json.load(f)

    if os.path.exists(out_dir):
        sys.exit(f'🔴 이미 있습니다: {out_dir} — 지우고 다시 돌리세요(섞이면 안 됩니다)')

    written = build_to_dir(out_dir, raw_root, split, a.per_session)

    sessions = sorted({os.path.basename(p).split('_f')[0] for p in written})
    h = hashlib.sha256()
    for p in sorted(os.path.basename(x) for x in written):
        h.update(p.encode())

    print(f'■ 세션 {len(sessions)} · 총 {len(written)}장 · 세션당 {a.per_session}')
    print(f'■ 제외 {len(split.get("excluded", {}))} · 홀드아웃 {len(split.get("holdout", []))} '
          f'(둘 다 한 장도 안 들어감)')
    print(f'■ 체크섬 {h.hexdigest()[:16]}')
    print(f'■ 출력 {out_dir}')
    print('\n다음: build_tool_v3_dataset.py 에 소스로 넘긴다')
    print(f'  ~/rfenv/bin/python build_tool_v3_dataset.py ~/ds_tool_v4 \\')
    print(f'      ~/ds_6tool:6tool ~/ds_mech83:mech83 {out_dir}:bg --keep-all bg')
    return 0


if __name__ == '__main__':
    sys.exit(main())
