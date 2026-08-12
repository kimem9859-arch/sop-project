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


def pick_one_per_group(items):
    """같은 사진의 증강본 여러 벌 중 **한 장만** 남긴다.

    Roboflow 고정 증강은 ultralytics 의 매-epoch 증강과 겹치고, 증강본이 많은
    사진의 가중치만 키운다(ARCAD 와 같은 구조). 출처 수는 줄지 않는다.

    ⚠️ 어느 벌이 '원본'인지는 파일명으로 알 수 없다(Roboflow 가 원본·변형을
       같은 형식으로 내보낸다). 정렬 첫 장을 쓴다 — 어차피 다시 증강된다.
    """
    best = {}
    for it in sorted(items, key=lambda i: i.src_img):
        best.setdefault(it.group, it)
    return sorted(best.values(), key=lambda i: i.src_img)


def sample_negatives(items, ratio=0.15, seed=0):
    """양성은 전부, 네거티브는 양성 수의 ratio 만큼만 남긴다.

    왜 섞나: tool_v2 가 **빈 바닥을 conf 0.78 로 오검출**했다(§10.38-(4)).
    왜 상한: 네거티브가 과반이면 모델이 보수적으로 변해 재현율이 떨어진다.
    """
    positives = [i for i in items if i.positive]
    negatives = sorted((i for i in items if not i.positive),
                       key=lambda i: i.src_img)
    k = min(round(len(positives) * ratio), len(negatives))
    chosen = random.Random(seed).sample(negatives, k) if k else []
    return sorted(positives + chosen, key=lambda i: i.src_img)


def split_by_source(items, valid_ratio=0.10, seed=0):
    """**출처 단위로** train/valid 를 가른다 — 한 출처는 절대 갈라지지 않는다.

    🔴 무작위(이미지 단위) 분할을 쓰면 같은 사진의 증강본·같은 영상의 이웃
       프레임이 양쪽에 걸려 valid 점수가 거짓 상승한다. ARCAD 에서 물린 것이다.

    ⚠️ valid 목표의 50% 를 넘는 거대 출처는 train 으로 보낸다. 안 그러면
       valid 가 단일 장면으로 뒤덮혀 ARCAD valid 와 같은 실패가 재현된다.
    """
    by_source = collections.defaultdict(list)
    for it in items:
        by_source[it.source].append(it)

    target = len(items) * valid_ratio
    sources = sorted(by_source)
    random.Random(seed).shuffle(sources)

    assign, n_valid = {}, 0
    for s in sources:
        size = len(by_source[s])
        if n_valid < target and size <= target * 0.5:
            assign[s] = 'valid'
            n_valid += size
        else:
            assign[s] = 'train'
    return assign
