"""공구 데이터셋 병합 — 3클래스(driver·wrench·pliers) tool_v3 학습 데이터 생성.

왜 있나 (2026-08-12):
    ARCAD 로 학습한 tool_v1·tool_v2 가 우리 도메인에서 무너진 원인이
    **출처 다양성 부족**으로 확정됐다(§10.39). 교재를 바꾼다 —
    다양성 1·2위 데이터셋 두 개를 병합해 새 학습 데이터를 만든다.

무엇을 하나:
    ① 클래스 3종으로 매핑·리맵  ② 증강본 1벌만  ③ 네거티브 15% 섞기
    ④ **출처 단위** 재분할(누출 원천 차단)  ⑤ 복사·data.yaml·리포트

설계 정본: docs/superpowers/specs/2026-08-12-데이터셋병합-tool_v3-design.md
"""
import collections
import glob
import os
import random
import shutil
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dataset_diversity import group_key, load_names, source_key  # noqa: E402

# 🔴 이 순서가 계약이다 — 학습·추론·recipe.json 이 공유한다. 바꾸지 말 것.
NEW_NAMES = ['driver', 'wrench', 'pliers']

# 원본 클래스명(소문자) → 새 클래스명.
# 버려지는 것: hammer · drill · bolt-nut · other tool (→ 네거티브 후보로 넘어간다)
CLASS_MAP = {
    'screwdriver': 'driver',
    'wrench': 'wrench',
    'plier': 'pliers',
    'pliers': 'pliers',
}


def build_remap(src_names):
    """원본 인덱스 → 새 인덱스. 매핑에 없는 클래스는 아예 빠진다."""
    remap = {}
    for i, name in enumerate(src_names):
        new_name = CLASS_MAP.get(name.strip().lower())
        if new_name is not None:
            remap[i] = NEW_NAMES.index(new_name)
    return remap


def remap_label_lines(lines, remap):
    """YOLO 라벨 줄들을 새 인덱스로 갈아끼운다. 대상 밖 줄은 버린다."""
    out = []
    for line in lines:
        parts = line.split()
        if not parts:
            continue
        ci = int(parts[0])
        if ci in remap:
            out.append(' '.join([str(remap[ci])] + parts[1:]))
    return out


IMAGE_EXTS = {'.jpg', '.jpeg', '.png', '.bmp', '.webp'}

Item = collections.namedtuple('Item', 'group source src_img lines positive')


def scan_dataset(root, prefix):
    """데이터셋 하나를 훑어 Item 목록으로 만든다(기존 split 은 무시 — 어차피 재분할한다).

    prefix 를 그룹·출처 키 앞에 붙인다. 두 데이터셋에 같은 파일명이 있어도
    출처가 뒤섞이지 않게 하는 장치다. 접두어는 상수라 묶음 관계는 그대로다.
    """
    remap = build_remap(load_names(os.path.join(root, 'data.yaml')))
    items = []
    for split in ('train', 'valid', 'test'):
        img_dir = os.path.join(root, split, 'images')
        if not os.path.isdir(img_dir):
            continue
        for img in sorted(glob.glob(os.path.join(img_dir, '*'))):
            if os.path.splitext(img)[1].lower() not in IMAGE_EXTS:
                continue
            fname = os.path.basename(img)
            base = os.path.splitext(fname)[0]
            lbl = os.path.join(root, split, 'labels', base + '.txt')
            lines = []
            if os.path.exists(lbl):
                with open(lbl) as f:
                    lines = remap_label_lines(f.read().splitlines(), remap)
            gkey = group_key(fname)
            items.append(Item(
                group=f'{prefix}_{gkey}',
                source=f'{prefix}_{source_key(gkey)}',
                src_img=img,
                lines=lines,
                positive=bool(lines),
            ))
    return items
