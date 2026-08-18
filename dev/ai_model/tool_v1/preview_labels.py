"""라벨 눈확인 — 무작위 N장에 박스·클래스명을 그려 저장한다.

왜 있나: 클래스 인덱스가 한 칸 밀려도 테스트는 전부 통과한다. 드라이버에
`pliers` 박스가 붙은 것은 사람 눈으로만 잡힌다. 학습 전 마지막 관문.

사용: python preview_labels.py ~/data/ds_tool_v3 ~/lab/tool-detect/tool_v3_preview [20] [0]
"""
import glob
import os
import random
import sys

from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from build_tool_v3_dataset import NEW_NAMES  # noqa: E402

COLORS = {0: (255, 80, 80), 1: (80, 200, 255), 2: (140, 255, 140)}


def main(argv):
    if len(argv) < 3:
        sys.exit(__doc__)
    root = os.path.expanduser(argv[1])
    out = os.path.expanduser(argv[2])
    n = int(argv[3]) if len(argv) > 3 else 20
    seed = int(argv[4]) if len(argv) > 4 else 0
    os.makedirs(out, exist_ok=True)

    imgs = []
    for split in ('train', 'valid'):
        imgs += sorted(glob.glob(os.path.join(root, split, 'images', '*')))
    picked = random.Random(seed).sample(imgs, min(n, len(imgs)))

    counts = {name: 0 for name in NEW_NAMES}
    empty = 0
    for path in picked:
        split = path.split(os.sep)[-3]
        base = os.path.splitext(os.path.basename(path))[0]
        lbl = os.path.join(root, split, 'labels', base + '.txt')
        im = Image.open(path).convert('RGB')
        W, H = im.size
        draw = ImageDraw.Draw(im)
        has_box = False
        if os.path.exists(lbl):
            for line in open(lbl):
                p = line.split()
                if len(p) < 5:
                    continue
                ci = int(p[0])
                cx, cy, w, h = (float(v) for v in p[1:5])
                box = ((cx - w / 2) * W, (cy - h / 2) * H,
                       (cx + w / 2) * W, (cy + h / 2) * H)
                # 인덱스가 범위 밖이면(밀림 버그) 죽지 않고 `?<번호>`로 표시하고
                # 계속 진행한다 — 밀림을 잡으려고 만든 도구가 밀림 때문에
                # 죽으면 안 된다.
                label = NEW_NAMES[ci] if 0 <= ci < len(NEW_NAMES) else f'?{ci}'
                draw.rectangle(box, outline=COLORS.get(ci, (255, 255, 0)), width=3)
                draw.text((box[0] + 3, box[1] + 3), label,
                          fill=COLORS.get(ci, (255, 255, 0)))
                counts[label] = counts.get(label, 0) + 1
                has_box = True
        if not has_box:
            empty += 1
            draw.text((6, 6), 'NEGATIVE', fill=(255, 255, 0))
        im.save(os.path.join(out, f'{split}_{base}.jpg'), quality=92)

    print(f'{len(picked)}장 저장 → {out}')
    print(f'  박스: ' + ' · '.join(f'{k} {v}' for k, v in counts.items()))
    print(f'  네거티브: {empty}장')


if __name__ == '__main__':
    main(sys.argv)
