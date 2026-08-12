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
import hashlib
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

Item = collections.namedtuple('Item', 'group source src_img lines positive dataset',
                               defaults=(None,))


def scan_dataset(root, prefix):
    """데이터셋 하나를 훑어 Item 목록으로 만든다(기존 split 은 무시 — 어차피 재분할한다).

    🔴 그룹·출처에 접두어를 다르게 쓴다(사용자 재정 2026-08-12) —
    산출물 감사(Task 6 관문 `dataset_diversity.py`)가 최종 파일명으로
    출처를 다시 세기 때문에, 내부 판정과 감사 결과가 반드시 일치해야 한다.
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
                # 그룹에 접두어를 남긴다 — 두 데이터셋에 우연히 같은 stem 이
                # 있어도 서로 다른 사진이므로 1벌 감축(pick_one_per_group)이
                # 엉뚱하게 한 장을 버리지 않게 한다.
                group=f'{prefix}_{gkey}',
                # 출처는 접두어 없이 둔다 — source_key 는 "뒤 일련번호를 떼되
                # 남는 부분이 3글자 이상일 때만" 병합하므로, 앞에 접두어가
                # 붙으면 판정이 달라진다(예: mech83_m0/m1 이 mech83_m 하나로
                # 뭉개짐). 산출물 파일명으로 다시 세는 감사와 어긋나면 안 된다.
                source=source_key(gkey),
                src_img=img,
                lines=lines,
                positive=bool(lines),
                dataset=prefix,
            ))
    return items


def pick_one_per_group(items):
    """같은 사진의 증강본 여러 벌 중 **한 장만** 남긴다.

    Roboflow 고정 증강은 ultralytics 의 매-epoch 증강과 겹치고, 증강본이 많은
    사진의 가중치만 키운다(ARCAD 와 같은 구조). 출처 수는 줄지 않는다.

    ⚠️ 어느 벌이 '원본'인지는 파일명으로 알 수 없다(Roboflow 가 원본·변형을
       같은 형식으로 내보낸다). 대신 **라벨이 가장 많은 장**을 고른다.
       회전·크롭 증강 시 물체가 화면 밖으로 나가면 라벨이 빠지므로, 라벨
       적은 판을 피해야 한다. 동점은 정렬 첫 장.
    """
    best = {}
    for it in sorted(items, key=lambda i: i.src_img):
        group_item = best.get(it.group)
        if group_item is None or len(it.lines) > len(group_item.lines):
            best[it.group] = it
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
       valid 가 단일 장면으로 뒤덮여 ARCAD valid 와 같은 실패가 재현된다.

    ⚠️ 기준에 `max(1, ...)` 하한을 둔다 — 작은 데이터셋에서는 target*0.5 가
       1 미만으로 내려가 1장짜리 출처조차 못 들어가 valid 가 통째로 비는
       사고가 난다(사용자 재정 2026-08-12). 715장 규모의 실데이터에서는
       하한이 걸리지 않아 원래 의도(거대출처 배제)는 그대로다.
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
        if n_valid < target and size <= max(1, target * 0.5):
            assign[s] = 'valid'
            n_valid += size
        else:
            assign[s] = 'train'
    return assign


def build(roots, out_dir, neg_ratio=0.15, valid_ratio=0.10, seed=0):
    """전 과정을 조립해 병합 데이터셋을 디스크에 쓴다.

    roots = [(데이터셋_루트, 접두어), ...]

    🔴 사용자 재정(2026-08-12) — `pick_one_per_group` 을 여기서 쓰지 않는다.
    계획서는 stem(`.rf.` 앞)이 "같은 사진의 증강본 묶음"이라고 전제했는데,
    이 두 데이터셋에선 거짓이었다: 실사진을 직접 확인하니 같은 stem 아래
    완전히 다른 사진들이 섞여 있었다(흔한 파일명을 여러 사람이 올려 Roboflow
    가 해시로만 구분). Roboflow README 실물도 이를 뒷받침한다 —
    6-tool v3 = "2 versions of each source image"(배수가 2로 균일이라
    가중치 왜곡이 없다) / mech83 v2 = "No image augmentation techniques were
    applied"(증강 자체가 없다 — 전부 다른 사진). 그래서 이름 기반 1벌
    감축은 없는 문제를 풀면서 진짜 사진을 지우고 있었다(mech83 3종에서만
    5,324 → 4,026, 사진 1,298장 소멸). `pick_one_per_group` 함수 자체는
    남긴다 — 다른 데이터셋에선 전제가 성립할 수 있다.

    누출 방어는 여전히 유효하다 — 한 사진의 모든 복사본은 같은 stem 을
    공유하므로 `source_key` 아래 반드시 같은 split 으로 간다. 서로 다른
    사진이 stem 을 공유해 함께 묶이는 것은 보수적일 뿐(그 사진들이 어느
    split 에 갈지 함께 결정될 뿐) 누출이 아니다.
    """
    items = []
    for root, prefix in roots:
        items.extend(scan_dataset(os.path.expanduser(root), prefix))

    items = sample_negatives(items, ratio=neg_ratio, seed=seed)
    assign = split_by_source(items, valid_ratio=valid_ratio, seed=seed)

    # 🔴 디스크에 아무것도 쓰기 전에 확인한다 — 나중에 검사하면 가드가
    # 터졌을 때 절반만 복사된 산출물이 out_dir 에 남아 재시도를 오염시킨다.
    if sum(1 for it in items if assign[it.source] == 'valid') == 0:
        raise ValueError(
            'valid 가 0장이다 — 거대출처 규칙(valid 목표의 50% 초과 출처는 '
            'train 행) 때문에 모든 출처가 train 으로 갔을 수 있다. '
            'roots 구성(출처 다양성)을 늘리거나 valid_ratio 를 조정할 것.'
        )

    for split in ('train', 'valid'):
        os.makedirs(os.path.join(out_dir, split, 'images'), exist_ok=True)
        os.makedirs(os.path.join(out_dir, split, 'labels'), exist_ok=True)

    instances = {n: 0 for n in NEW_NAMES}
    class_images = {n: 0 for n in NEW_NAMES}
    splits = {'train': 0, 'valid': 0}
    negatives = 0
    manifest = []

    for it in items:
        split = assign[it.source]
        # 🔴 접두어를 파일명 맨 앞이 아니라 `.rf.` 뒤에 넣는다(사용자 재정
        # 2026-08-12). 맨 앞에 붙이면 짧은 숫자 파일명과 합쳐져(예: m0 →
        # mech83_m0) source_key 의 일련번호 병합 규칙을 건드려, 산출물 감사가
        # 서로 다른 출처를 하나로 잘못 뭉갠다. `.rf.` 뒤에 두면 group_key 가
        # 보는 stem(‥`.rf.` 앞부분)이 그대로 보존돼 감사 결과가 왜곡되지 않는다.
        fname = os.path.basename(it.src_img)
        if '.rf.' in fname:
            stem, rest = fname.split('.rf.', 1)
            out_name = f'{stem}.rf.{it.dataset}_{rest}'
        else:
            stem, ext = os.path.splitext(fname)
            out_name = f'{stem}.rf.{it.dataset}_0{ext}'
        base = os.path.splitext(out_name)[0]
        shutil.copy(it.src_img, os.path.join(out_dir, split, 'images', out_name))
        with open(os.path.join(out_dir, split, 'labels', base + '.txt'), 'w') as f:
            f.write('\n'.join(it.lines) + ('\n' if it.lines else ''))

        splits[split] += 1
        if it.positive:
            present = set()
            for line in it.lines:
                name = NEW_NAMES[int(line.split()[0])]
                instances[name] += 1
                present.add(name)
            for name in present:
                class_images[name] += 1
        else:
            negatives += 1
        manifest.append(f'{split}/{out_name}')

    out_abs = os.path.abspath(out_dir)
    with open(os.path.join(out_dir, 'data.yaml'), 'w') as f:
        f.write('names:\n')
        for n in NEW_NAMES:
            f.write(f'- {n}\n')
        f.write(f'nc: {len(NEW_NAMES)}\n')
        f.write(f'path: {out_abs}\n')
        f.write('train: train/images\n')
        f.write('val: valid/images\n')

    # 누출 재확인 — 설계상 0 이어야 하지만 `assign` 을 다시 읽는 건 무의미하다
    # (dict 라 값이 구조적으로 하나뿐이라 절대 안 걸린다). 복사·명명 경로의
    # 진짜 버그를 잡으려면 디스크에 실제로 쓰인 파일명으로 출처를 다시
    # 계산해야 한다 — test_build_has_no_source_leak 이 하는 것과 같은 방식.
    seen = collections.defaultdict(set)
    for split in ('train', 'valid'):
        for f in os.listdir(os.path.join(out_dir, split, 'images')):
            seen[source_key(group_key(f))].add(split)
    leaks = sum(1 for v in seen.values() if len(v) > 1)

    checksum = hashlib.sha256('\n'.join(sorted(manifest)).encode()).hexdigest()[:16]
    return {
        'images': len(items),
        'splits': splits,
        'instances': instances,
        'class_images': class_images,
        'negatives': negatives,
        'sources': len(seen),
        'leaks': leaks,
        'checksum': checksum,
    }


def main(argv):
    if len(argv) < 3:
        sys.exit('사용: python build_tool_v3_dataset.py <출력경로> <데이터셋:접두어> ...\n'
                 '예)  python build_tool_v3_dataset.py ~/ds_tool_v3 '
                 '~/ds_6tool:6tool ~/ds_mech83:mech83')
    out_dir = os.path.expanduser(argv[1])
    roots = []
    for spec in argv[2:]:
        path, _, prefix = spec.rpartition(':')
        if not path:
            sys.exit(f'형식이 <경로:접두어> 가 아닙니다: {spec}')
        roots.append((path, prefix))

    report = build(roots, out_dir)
    print(f"■ 이미지 {report['images']} "
          f"(train {report['splits']['train']} · valid {report['splits']['valid']})")
    print(f"■ 네거티브 {report['negatives']} · 출처 {report['sources']} "
          f"· 누출 {report['leaks']}건")
    print(f"   {'클래스':<10}{'이미지':>8}{'인스턴스':>10}")
    for n in NEW_NAMES:
        print(f'   {n:<10}{report["class_images"][n]:>8}{report["instances"][n]:>10}')
    print(f"■ 체크섬 {report['checksum']}  ← 파이·Colab 에서 같아야 한다")
    if report['leaks']:
        sys.exit('🔴 누출이 있다 — 분할 로직을 확인할 것.')


if __name__ == '__main__':
    main(sys.argv)
