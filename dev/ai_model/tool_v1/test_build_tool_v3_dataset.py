import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from build_tool_v3_dataset import (
    NEW_NAMES,
    build_remap,
    pick_one_per_group,
    remap_label_lines,
    sample_negatives,
    scan_dataset,
    split_by_source,
)


def test_new_names_order_is_fixed():
    """🔴 클래스 순서는 recipe.json·학습·추론이 공유하는 계약이다."""
    assert NEW_NAMES == ['driver', 'wrench', 'pliers']


def test_build_remap_6tool():
    # ds_6tool: bolt-nut, hammer, other tool, plier, screwdriver, wrench
    src = ['bolt-nut', 'hammer', 'other tool', 'plier', 'screwdriver', 'wrench']
    assert build_remap(src) == {3: 2, 4: 0, 5: 1}


def test_build_remap_mech83():
    # ds_mech83: drill, hammer, pliers, screwdriver, wrench
    src = ['drill', 'hammer', 'pliers', 'screwdriver', 'wrench']
    assert build_remap(src) == {2: 2, 3: 0, 4: 1}


def test_build_remap_is_case_insensitive():
    assert build_remap(['ScrewDriver', 'Wrench', 'Plier']) == {0: 0, 1: 1, 2: 2}


def test_build_remap_ignores_unknown_names():
    assert build_remap(['hammer', 'drill', 'bolt-nut']) == {}


def test_remap_label_lines_keeps_and_renumbers():
    remap = {3: 2, 4: 0, 5: 1}
    lines = [
        '4 0.5 0.5 0.2 0.2',   # screwdriver -> driver(0)
        '1 0.1 0.1 0.1 0.1',   # hammer      -> 버림
        '3 0.7 0.7 0.3 0.3',   # plier       -> pliers(2)
    ]
    assert remap_label_lines(lines, remap) == [
        '0 0.5 0.5 0.2 0.2',
        '2 0.7 0.7 0.3 0.3',
    ]


def test_remap_label_lines_skips_blank_lines():
    assert remap_label_lines(['', '   ', '4 0.1 0.2 0.3 0.4'], {4: 0}) == [
        '0 0.1 0.2 0.3 0.4'
    ]


def _write(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w') as f:
        f.write(text)


def _make_6tool_like(root):
    """ds_6tool 을 닮은 합성 데이터셋.

    파일명 규칙은 Roboflow export 그대로: <원본>_jpg.rf.<해시>.jpg
    frame_00001 / frame_00002 는 **같은 영상의 이웃 프레임** = 같은 출처.
    """
    _write(os.path.join(root, 'data.yaml'),
           'names:\n- bolt-nut\n- hammer\n- other tool\n- plier\n'
           '- screwdriver\n- wrench\nnc: 6\n')
    # 같은 사진의 증강본 2벌 (같은 그룹) — screwdriver
    for h in ('aaa', 'bbb'):
        _write(os.path.join(root, 'train/images', f'shot1_jpg.rf.{h}.jpg'), 'x')
        _write(os.path.join(root, 'train/labels', f'shot1_jpg.rf.{h}.txt'),
               '4 0.5 0.5 0.2 0.2\n')
    # 같은 영상의 이웃 프레임 2장 (같은 출처, 다른 그룹) — wrench
    for n in ('00001', '00002'):
        _write(os.path.join(root, 'train/images', f'frame_{n}_jpg.rf.c{n}.jpg'), 'x')
        _write(os.path.join(root, 'train/labels', f'frame_{n}_jpg.rf.c{n}.txt'),
               '5 0.4 0.4 0.2 0.2\n')
    # 망치만 있는 이미지 → 네거티브 후보
    _write(os.path.join(root, 'valid/images', 'ham1_jpg.rf.ddd.jpg'), 'x')
    _write(os.path.join(root, 'valid/labels', 'ham1_jpg.rf.ddd.txt'),
           '1 0.5 0.5 0.2 0.2\n')
    # 라벨 파일이 아예 없는 이미지 → 네거티브 후보
    _write(os.path.join(root, 'valid/images', 'bare1_jpg.rf.eee.jpg'), 'x')


def test_scan_dataset_classifies_positive_and_negative(tmp_path):
    root = str(tmp_path / 'ds6')
    _make_6tool_like(root)

    items = scan_dataset(root, '6tool')

    assert len(items) == 6
    assert sum(1 for i in items if i.positive) == 4
    assert sum(1 for i in items if not i.positive) == 2


def test_scan_dataset_remaps_labels(tmp_path):
    root = str(tmp_path / 'ds6')
    _make_6tool_like(root)

    items = {os.path.basename(i.src_img): i for i in scan_dataset(root, '6tool')}

    # screwdriver(4) -> driver(0)
    assert items['shot1_jpg.rf.aaa.jpg'].lines == ['0 0.5 0.5 0.2 0.2']
    # wrench(5) -> wrench(1)
    assert items['frame_00001_jpg.rf.c00001.jpg'].lines == ['1 0.4 0.4 0.2 0.2']
    # hammer -> 라벨 없음
    assert items['ham1_jpg.rf.ddd.jpg'].lines == []


def test_scan_dataset_groups_augmented_copies(tmp_path):
    root = str(tmp_path / 'ds6')
    _make_6tool_like(root)

    items = {os.path.basename(i.src_img): i for i in scan_dataset(root, '6tool')}

    # 증강본 2벌은 같은 그룹
    assert items['shot1_jpg.rf.aaa.jpg'].group == items['shot1_jpg.rf.bbb.jpg'].group
    # 이웃 프레임 2장은 **다른 그룹, 같은 출처**  🔴 여기가 핵심이다
    a = items['frame_00001_jpg.rf.c00001.jpg']
    b = items['frame_00002_jpg.rf.c00002.jpg']
    assert a.group != b.group
    assert a.source == b.source


def test_scan_dataset_prefixes_keys_to_avoid_collision(tmp_path):
    """두 데이터셋에 같은 파일명이 있어도 출처가 섞이면 안 된다."""
    root_a = str(tmp_path / 'dsA')
    root_b = str(tmp_path / 'dsB')
    _make_6tool_like(root_a)
    _make_6tool_like(root_b)

    src_a = {i.source for i in scan_dataset(root_a, '6tool')}
    src_b = {i.source for i in scan_dataset(root_b, 'mech83')}

    assert src_a.isdisjoint(src_b)
    assert all(s.startswith('6tool_') for s in src_a)


def test_scan_dataset_is_deterministic(tmp_path):
    root = str(tmp_path / 'ds6')
    _make_6tool_like(root)

    first = [i.src_img for i in scan_dataset(root, '6tool')]
    second = [i.src_img for i in scan_dataset(root, '6tool')]

    assert first == second


def _item(group, source, img, positive=True):
    return __import__('build_tool_v3_dataset').Item(
        group=group, source=source, src_img=img,
        lines=['0 0.5 0.5 0.1 0.1'] if positive else [],
        positive=positive,
    )


def test_pick_one_per_group_keeps_exactly_one(tmp_path):
    root = str(tmp_path / 'ds6')
    _make_6tool_like(root)

    kept = pick_one_per_group(scan_dataset(root, '6tool'))

    # 증강본 2벌 → 1장. 나머지 4장은 각자 단독 그룹.
    assert len(kept) == 5
    assert len({i.group for i in kept}) == 5


def test_pick_one_per_group_is_deterministic(tmp_path):
    root = str(tmp_path / 'ds6')
    _make_6tool_like(root)
    items = scan_dataset(root, '6tool')

    first = [i.src_img for i in pick_one_per_group(items)]
    second = [i.src_img for i in pick_one_per_group(items)]

    assert first == second


def test_sample_negatives_caps_at_ratio():
    items = [_item(f'g{n}', f's{n}', f'/p/{n}.jpg') for n in range(20)]
    items += [_item(f'n{n}', f'ns{n}', f'/p/neg{n}.jpg', positive=False)
              for n in range(20)]

    out = sample_negatives(items, ratio=0.15, seed=0)

    assert sum(1 for i in out if i.positive) == 20      # 양성은 전부 살린다
    assert sum(1 for i in out if not i.positive) == 3   # round(20 * 0.15)


def test_sample_negatives_takes_all_when_scarce():
    items = [_item(f'g{n}', f's{n}', f'/p/{n}.jpg') for n in range(20)]
    items += [_item('n0', 'ns0', '/p/neg0.jpg', positive=False)]

    out = sample_negatives(items, ratio=0.15, seed=0)

    assert sum(1 for i in out if not i.positive) == 1


def test_sample_negatives_is_deterministic():
    items = [_item(f'g{n}', f's{n}', f'/p/{n}.jpg') for n in range(20)]
    items += [_item(f'n{n}', f'ns{n}', f'/p/neg{n}.jpg', positive=False)
              for n in range(20)]

    first = [i.src_img for i in sample_negatives(items, seed=0)]
    second = [i.src_img for i in sample_negatives(items, seed=0)]

    assert first == second


def test_split_by_source_never_splits_a_source():
    """🔴 이 테스트가 이 작업의 존재 이유다 — 누출은 눈으로 볼 수 없다."""
    items = []
    for s in range(50):
        for n in range(4):          # 한 출처당 4장(이웃 프레임)
            items.append(_item(f'g{s}_{n}', f'src{s}', f'/p/{s}_{n}.jpg'))

    assign = split_by_source(items, valid_ratio=0.10, seed=0)

    by_source_split = {}
    for it in items:
        by_source_split.setdefault(it.source, set()).add(assign[it.source])
    assert all(len(v) == 1 for v in by_source_split.values())


def test_split_by_source_hits_ratio_approximately():
    items = []
    for s in range(200):
        items.append(_item(f'g{s}', f'src{s}', f'/p/{s}.jpg'))

    assign = split_by_source(items, valid_ratio=0.10, seed=0)
    n_valid = sum(1 for i in items if assign[i.source] == 'valid')

    assert 15 <= n_valid <= 25          # 목표 20장 언저리


def test_split_by_source_sends_mega_source_to_train():
    """한 출처가 valid 를 뒤덮으면 ARCAD valid 와 같은 실패가 재현된다.

    valid 목표의 50% 를 넘는 출처는 train 으로 보낸다.
    """
    items = [_item('gbig', 'bigsrc', f'/p/big{n}.jpg') for n in range(60)]
    items += [_item(f'g{n}', f'src{n}', f'/p/{n}.jpg') for n in range(140)]

    assign = split_by_source(items, valid_ratio=0.10, seed=0)

    assert assign['bigsrc'] == 'train'   # 60장 > 목표 20장의 50%


def test_split_by_source_is_deterministic():
    items = [_item(f'g{n}', f'src{n}', f'/p/{n}.jpg') for n in range(200)]

    assert split_by_source(items, seed=0) == split_by_source(items, seed=0)


def test_split_by_source_changes_with_seed():
    items = [_item(f'g{n}', f'src{n}', f'/p/{n}.jpg') for n in range(200)]

    assert split_by_source(items, seed=0) != split_by_source(items, seed=1)
