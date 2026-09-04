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
NEW_NAMES_V3 = ['driver', 'wrench', 'pliers']

# 원본 클래스명(소문자) → 새 클래스명.
# 버려지는 것: hammer · drill · bolt-nut · other tool (→ 네거티브 후보로 넘어간다)
CLASS_MAP_V3 = {
    'screwdriver': 'driver',
    'wrench': 'wrench',
    'plier': 'pliers',
    'pliers': 'pliers',
}

# 🆕 v4 (2026-09-03) — 「손에 쥔 공구」를 **별도 클래스**로 배운다.
#    왜 = 쥐면 손이 공구를 가려 검출이 무너졌다(통합문서 §10.54). 설계 =
#    ../../../docs/superpowers/specs/2026-09-03-공구-쥔상태-검출-design.md §3
#    🔴 앞 3개의 순서·이름은 v3 과 같게 두고 **뒤에 덧붙인다** — 그래야 두 스키마의
#       인덱스가 앞부분에서 일치해 비교·디버깅이 쉽다.
NEW_NAMES_V4 = NEW_NAMES_V3 + ['driver-in-hand', 'wrench-in-hand', 'pliers-in-hand']

# 🔑 `spanner` 계열은 `wrench` 로 병합한다 — 우리 오픈엔드의 정답이 `wrench` 이고
#    큰 데이터셋들이 모든 렌치를 하나로 묶는다(§10.39-(6)).
#    ⚠️ v3 소스(6tool·mech83)에는 `spanner` 클래스가 없으므로 이 매핑은 **in-hand
#       소스에만** 영향을 준다. v3 스키마에서는 종전대로 「모르는 이름」으로 경고된다.
CLASS_MAP_V4 = dict(CLASS_MAP_V3)
CLASS_MAP_V4.update({
    'spanner': 'wrench',
    'screwdriver-in-hand': 'driver-in-hand',
    'wrench-in-hand': 'wrench-in-hand',
    'spanner-in-hand': 'wrench-in-hand',
    'plier-in-hand': 'pliers-in-hand',
    'pliers-in-hand': 'pliers-in-hand',
})

# 현재 스키마 — `use_scheme()` 이 갈아끼운다. 기본값은 **v3**(종전 동작 보존).
NEW_NAMES = NEW_NAMES_V3
CLASS_MAP = CLASS_MAP_V3

# 🔴 CLASS_MAP 에 넣지 않는다 — 이건 매핑이 아니라 "안다·예상했다"는 표시다.
# 6tool·mech83 두 데이터셋이 담고 있지만 우리 3종(driver·wrench·pliers)이
# 아닌 공구들 — 이 이름들이 매핑에서 빠지는 건 의도된 것이라 경고가 아니다.
# 매번 뜨는 경고는 운영자를 무디게 만들어, `spanner` 같은 **진짜 모르는
# 이름**이 그 안에 묻히게 한다(이번 작업이 막으려던 실패 유형).
KNOWN_DISCARD_V3 = {'bolt-nut', 'hammer', 'other tool', 'drill'}

# v4 는 in-hand 소스가 들어오면서 「우리 3종이 아닌」 이름이 늘어난다. 이것들이
# 매번 🔴 경고로 뜨면 운영자가 무뎌져 **진짜 모르는 이름**이 그 안에 묻힌다.
KNOWN_DISCARD_V4 = KNOWN_DISCARD_V3 | {
    'ratchet', 'scissors', 'scissors-in-hand', 'hammer-in-hand', 'screw',
    'human', 'sl', 'power drill',
}

KNOWN_DISCARD = KNOWN_DISCARD_V3

_SCHEMES = {
    'v3': (NEW_NAMES_V3, CLASS_MAP_V3, KNOWN_DISCARD_V3),
    'v4': (NEW_NAMES_V4, CLASS_MAP_V4, KNOWN_DISCARD_V4),
}


def class_scheme(name):
    """스키마 이름 → (클래스 순서, 클래스 매핑). 모르는 이름이면 ValueError."""
    if name not in _SCHEMES:
        raise ValueError(f'모르는 스키마: {name!r} (아는 것: {sorted(_SCHEMES)})')
    names, cmap, _discard = _SCHEMES[name]
    return names, cmap


def use_scheme(name):
    """모듈 전역을 그 스키마로 갈아끼운다.

    🔑 전역을 바꾸는 이유 — `build_remap`·`scan_dataset`·`write_yaml` 등이 전부
       이 전역을 읽는다. 인자로 흘리려면 함수 대여섯 개의 시그니처를 바꿔야 하고,
       그것은 검증된 코드를 건드리는 일이다(기존 테스트 46개가 그 계약이다).
    """
    global NEW_NAMES, CLASS_MAP, KNOWN_DISCARD
    NEW_NAMES, CLASS_MAP, KNOWN_DISCARD = _SCHEMES[name] if name in _SCHEMES else \
        _raise_scheme(name)


def _raise_scheme(name):
    raise ValueError(f'모르는 스키마: {name!r} (아는 것: {sorted(_SCHEMES)})')


def build_remap(src_names):
    """원본 인덱스 → 새 인덱스, 그리고 매핑에 없던 원본 이름 목록.

    반환: (remap, unmapped_names). 매핑에 없는 클래스는 remap 에서 빠지고
    unmapped_names 에 담긴다 — 호출부(scan_dataset)가 이걸로 "그 클래스만
    있던 이미지가 조용히 네거티브가 됐다"를 알 수 있게 한다.

    🔴 한 클래스도 못 붙이면(remap 이 통째로 빈다) 이 데이터셋은 애초에
    쓸 수 없다는 뜻이므로 여기서 바로 ValueError 를 올린다 — "우연히 valid
    0장 가드에 걸려 멈추는" 식으로 원인을 오도하지 않기 위해서다.
    """
    remap = {}
    unmapped = []
    for i, name in enumerate(src_names):
        new_name = CLASS_MAP.get(name.strip().lower())
        if new_name is not None:
            remap[i] = NEW_NAMES.index(new_name)
        else:
            unmapped.append(name)
    if not remap:
        raise ValueError(
            f'클래스 매핑이 하나도 없습니다 — 이 데이터셋의 클래스: {src_names}. '
            f'CLASS_MAP 이 아는 이름: {sorted(CLASS_MAP)}. '
            'data.yaml 의 names 표기(철자·대소문자)를 확인할 것.'
        )
    return remap, unmapped


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

    반환: (items, report). report = {'unmapped': [원본 클래스명, ...],
    'unmapped_negatives': 그것 때문에 라벨이 통째로 빠져 네거티브가 된 장수}.
    "매핑에 없는 클래스명이 조용히 네거티브가 되는" 상황을 호출부가 알 수
    있게 한다 — 매핑 자체가 통째로 빈 경우는 build_remap 이 이미 ValueError
    로 막으므로, 여기서 다루는 건 "일부만 안 맞는" 부분 실패다.
    """
    remap, unmapped = build_remap(load_names(os.path.join(root, 'data.yaml')))
    items = []
    unmapped_negatives = 0
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
            raw_lines = []
            if os.path.exists(lbl):
                with open(lbl) as f:
                    raw_lines = f.read().splitlines()
            lines = remap_label_lines(raw_lines, remap)
            if any(line.split() for line in raw_lines) and not lines:
                unmapped_negatives += 1
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
    return items, {'unmapped': unmapped, 'unmapped_negatives': unmapped_negatives}


def pick_one_per_group(items):
    """현재 `build()` 에서 미사용 — 사유는 `build()` docstring 참조.

    같은 사진의 증강본 여러 벌 중 **한 장만** 남긴다.

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


def sample_negatives(items, ratio=0.15, seed=0, keep_all_prefixes=()):
    """양성은 전부, 네거티브는 양성 수의 ratio 만큼만 남긴다.

    왜 섞나: tool_v2 가 **빈 바닥을 conf 0.78 로 오검출**했다(§10.38-(4)).
    왜 상한: 네거티브가 과반이면 모델이 보수적으로 변해 재현율이 떨어진다.

    🆕 `keep_all_prefixes`(2026-08-14) — 그 `dataset` 접두어의 네거티브는
       **샘플링에서 빼고 전량 유지**한다.

       왜 필요한가: 우리 작업환경 배경을 하드 네거티브로 넣으려는데, 그냥 소스로
       추가하면 공개 데이터셋 네거티브와 **한 풀에 섞여 비율만큼만 뽑힌다.**
       현재 네거티브 3,888장은 `round(양성×0.15)` 상한에 정확히 걸린 값이라
       **공개 네거티브 후보가 그보다 많고**(2026-08-14 확인), 따라서 ratio 만
       올려서는 우리 배경이 원하는 만큼 들어가지 않는다.
       설계 = ../../../docs/superpowers/specs/2026-08-14-네거티브보강-design.md

       ⚠️ 이 소스의 네거티브는 상한 계산에서도 빠진다 — 전량 유지가 목적이므로
          k 를 그만큼 줄이지 않는다. 총 네거티브 비율이 ratio 를 넘게 되며,
          그것이 의도다.
    """
    keep = set(keep_all_prefixes)
    positives = [i for i in items if i.positive]
    kept = sorted((i for i in items if not i.positive and i.dataset in keep),
                  key=lambda i: i.src_img)
    pool = sorted((i for i in items if not i.positive and i.dataset not in keep),
                  key=lambda i: i.src_img)
    k = min(round(len(positives) * ratio), len(pool))
    chosen = random.Random(seed).sample(pool, k) if k else []
    return sorted(positives + kept + chosen, key=lambda i: i.src_img)


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


def build(roots, out_dir, neg_ratio=0.15, valid_ratio=0.10, seed=0,
          keep_all_prefixes=()):
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
    # 🔴 이전 실행 잔존물과 섞이면 "리포트 장수 == 디스크 장수" 계약이
    # 깨진다(출력명 충돌 없이도 헌 파일이 남는다). 자동 삭제는 하지 않는다
    # — 사용자 데이터를 지우는 건 이 도구의 권한이 아니다.
    if os.path.isdir(out_dir) and os.listdir(out_dir):
        raise ValueError(
            f'{out_dir} 가 비어 있지 않습니다 — 이전 실행 산출물이 섞일 수 '
            '있어 거부합니다. 디렉터리를 비우고 다시 실행할 것.'
        )

    items = []
    unmapped_report = {}
    for root, prefix in roots:
        ds_items, ds_report = scan_dataset(os.path.expanduser(root), prefix)
        items.extend(ds_items)
        if ds_report['unmapped']:
            unmapped_report[prefix] = ds_report

    # 「예상된 버림」(KNOWN_DISCARD)과 「🔴 모르는 이름」을 가른다 — 매번
    # 뜨는 경고에 운영자가 무뎌지면 spanner 같은 진짜 신호를 놓친다.
    unknown_unmapped = {}
    for prefix, info in unmapped_report.items():
        unknown_names = sorted({
            n for n in info['unmapped']
            if n.strip().lower() not in KNOWN_DISCARD
        })
        if unknown_names:
            unknown_unmapped[prefix] = {
                'names': unknown_names,
                'unmapped_negatives': info['unmapped_negatives'],
            }

    items = sample_negatives(items, ratio=neg_ratio, seed=seed,
                             keep_all_prefixes=keep_all_prefixes)
    assign = split_by_source(items, valid_ratio=valid_ratio, seed=seed)

    # 🔴 디스크에 아무것도 쓰기 전에 확인한다 — 나중에 검사하면 가드가
    # 터졌을 때 절반만 복사된 산출물이 out_dir 에 남아 재시도를 오염시킨다.
    if sum(1 for it in items if assign[it.source] == 'valid') == 0:
        raise ValueError(
            'valid 가 0장이다 — 거대출처 규칙(valid 목표의 50% 초과 출처는 '
            'train 행) 때문에 모든 출처가 train 으로 갔을 수 있다. '
            'roots 구성(출처 다양성)을 늘리거나 valid_ratio 를 조정할 것.'
        )

    # 출력명을 미리 계산해 충돌을 검사한다(디스크에 쓰기 전에) — 서로 다른
    # split 출신인데 같은 basename 을 쓰면 이름이 같아져 뒤엣것이 앞엣것을
    # 조용히 덮어쓴다. `shutil.copy` 를 부르기 전에 잡아야 산출물이
    # 오염되지 않는다.
    planned = []
    seen_names = {}
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
        key = (split, out_name)
        if key in seen_names:
            other = seen_names[key]
            raise ValueError(
                f'출력 파일명이 충돌합니다: {split}/{out_name} — '
                f'{other.src_img} 와 {it.src_img} 가 같은 이름으로 씁니다. '
                '접두어·소스 데이터를 확인할 것.'
            )
        seen_names[key] = it
        planned.append((it, split, out_name))

    for split in ('train', 'valid'):
        os.makedirs(os.path.join(out_dir, split, 'images'), exist_ok=True)
        os.makedirs(os.path.join(out_dir, split, 'labels'), exist_ok=True)

    instances = {n: 0 for n in NEW_NAMES}
    class_images = {n: 0 for n in NEW_NAMES}
    splits = {'train': 0, 'valid': 0}
    negatives = 0
    manifest = []

    for it, split, out_name in planned:
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
        # 체크섬은 파일명뿐 아니라 라벨 내용도 포함한다 — 리맵 버그는
        # 파일명을 바꾸지 않으므로, 내용이 빠지면 "체크섬이 같다"가 실제
        # 보증이 되지 못한다.
        manifest.append(f"{split}/{out_name}\n" + '\n'.join(it.lines))

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
        'unmapped': unmapped_report,
        'unknown_unmapped': unknown_unmapped,
    }


def main(argv):
    # 🆕 --scheme v4 : 6클래스(3종 + 각 in-hand). 없으면 종전 v3 그대로.
    argv = list(argv)
    scheme = 'v3'
    if '--scheme' in argv:
        i = argv.index('--scheme')
        if i + 1 >= len(argv):
            sys.exit('--scheme 뒤에 스키마 이름이 필요합니다 (v3 | v4)')
        scheme = argv[i + 1]
        del argv[i:i + 2]
    use_scheme(scheme)
    print(f'[스키마] {scheme} — 클래스 {NEW_NAMES}')

    if len(argv) < 3:
        sys.exit('사용: python build_tool_v3_dataset.py <출력경로> <데이터셋:접두어> ... '
                 '[--keep-all <접두어>]\n'
                 '예)  python build_tool_v3_dataset.py ~/data/ds_tool_v3 '
                 '~/data/ds_6tool:6tool ~/data/ds_mech83:mech83\n'
                 '     python build_tool_v3_dataset.py ~/data/ds_tool_v4 '
                 '~/data/ds_6tool:6tool ~/data/ds_mech83:mech83 ~/data/ds_bg_neg:bg --keep-all bg\n'
                 '     python build_tool_v3_dataset.py --scheme v4 ~/data/ds_tool_v4 '
                 '~/data/ds_6tool:6tool ~/data/ds_mech83:mech83 ~/data/ds_inhand:inhand\n'
                 '\n--scheme v3|v4   : 클래스 체계. v4 = 3종 + 각 「쥔 상태」(§10.54). 기본 v3.\n'
                 '\n--keep-all <접두어> : 그 소스의 네거티브를 샘플링 없이 전량 넣는다.\n'
                 '                      (하드 네거티브용 — 사유는 sample_negatives docstring)')
    out_dir = os.path.expanduser(argv[1])
    roots = []
    keep_all = []
    rest = list(argv[2:])
    # 🆕 --keep-all <접두어> — 그 소스의 네거티브를 샘플링 없이 전량 넣는다.
    #    (우리 배경 하드 네거티브용. 사유는 sample_negatives docstring)
    while '--keep-all' in rest:
        i = rest.index('--keep-all')
        if i + 1 >= len(rest):
            sys.exit('--keep-all 뒤에 접두어가 필요합니다')
        keep_all.append(rest[i + 1])
        del rest[i:i + 2]

    for spec in rest:
        path, _, prefix = spec.rpartition(':')
        if not path or not prefix:
            sys.exit(f'형식이 <경로:접두어> 가 아닙니다(접두어는 비울 수 없음): {spec}')
        roots.append((path, prefix))

    unknown = [p for p in keep_all if p not in {pr for _pa, pr in roots}]
    if unknown:
        sys.exit(f'🔴 --keep-all 접두어가 소스에 없습니다: {unknown} '
                 f'(소스 접두어: {sorted(pr for _pa, pr in roots)})')

    try:
        report = build(roots, out_dir, keep_all_prefixes=tuple(keep_all))
    except ValueError as e:
        sys.exit(str(e))

    print(f"■ 이미지 {report['images']} "
          f"(train {report['splits']['train']} · valid {report['splits']['valid']})")
    print(f"■ 네거티브 {report['negatives']} · 출처 {report['sources']} "
          f"· 누출 {report['leaks']}건")
    print(f"   {'클래스':<10}{'이미지':>8}{'인스턴스':>10}")
    for n in NEW_NAMES:
        print(f'   {n:<10}{report["class_images"][n]:>8}{report["instances"][n]:>10}')
    if report['unknown_unmapped']:
        # 🔴 모르는 이름 — 눈에 띄게. spanner 처럼 KNOWN_DISCARD 밖의
        # 클래스명이 있으면 그 클래스만 있던 이미지가 조용히 네거티브로 들어간다.
        print('🔴 매핑 안 된 미지의 클래스명이 있습니다(CLASS_MAP·KNOWN_DISCARD 둘 다 밖):')
        for prefix, info in report['unknown_unmapped'].items():
            print(f"   {prefix}: {info['names']} "
                  f"→ 해당 데이터셋 매핑실패 네거티브화 {info['unmapped_negatives']}장(예상+미지 합산)")
    elif report['unmapped']:
        # 예상된 버림(KNOWN_DISCARD)뿐이면 조용히 한 줄 요약만 낸다 —
        # 매번 뜨는 경고에 무뎌지면 진짜 신호(미지의 이름)를 놓친다.
        total_neg = sum(info['unmapped_negatives'] for info in report['unmapped'].values())
        print(f'ℹ️ 예상된 버림(우리 3종 아님) 네거티브화 {total_neg}장 — KNOWN_DISCARD 참조')
    print(f"■ 체크섬 {report['checksum']}  ← 파이·Colab 에서 같아야 한다")
    if report['leaks']:
        sys.exit('🔴 누출이 있다 — 분할 로직을 확인할 것.')


if __name__ == '__main__':
    main(sys.argv)
