import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import pytest

from build_tool_v3_dataset import (
    NEW_NAMES,
    build,
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


def test_scan_dataset_groups_are_dataset_scoped_but_sources_are_not(tmp_path):
    """🔴 사용자 재정(2026-08-12) — 그룹과 출처는 접두어를 다르게 쓴다.

    그룹: 두 데이터셋에 우연히 같은 stem 이 있어도 서로 다른 사진이므로
    데이터셋별로 분리한다(1벌 감축이 엉뚱하게 한 장을 버리지 않게).
    출처: 접두어를 붙이지 않는다 — 산출물 파일명으로 다시 세는 감사
    (dataset_diversity.source_key)와 내부 판정이 어긋나면 안 된다.
    """
    root_a = str(tmp_path / 'dsA')
    root_b = str(tmp_path / 'dsB')
    _make_6tool_like(root_a)
    _make_6tool_like(root_b)

    items_a = scan_dataset(root_a, '6tool')
    items_b = scan_dataset(root_b, 'mech83')

    grp_a = {i.group for i in items_a}
    grp_b = {i.group for i in items_b}
    assert grp_a.isdisjoint(grp_b)
    assert all(g.startswith('6tool_') for g in grp_a)
    assert all(g.startswith('mech83_') for g in grp_b)

    # 같은 fixture 라 stem 이 똑같다 — 접두어가 없으므로 출처 키도 똑같다.
    src_a = {i.source for i in items_a}
    src_b = {i.source for i in items_b}
    assert src_a == src_b
    assert not any(s.startswith(('6tool_', 'mech83_')) for s in src_a)


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


def test_pick_one_per_group_prefers_max_labels():
    """같은 그룹의 증강본끼리 라벨 수가 다르면 **가장 많은 장**을 고른다.

    크롭 증강에서 물체가 화면 밖으로 나가면 라벨이 빠진다. 라벨 수가 적은
    판을 고르면 학습 신호를 잃으므로, 최대를 선택해야 한다.

    픽스처: 같은 그룹의 두 증강본을 정렬 순서상 라벨-적은 장이 먼저 오도록
    만들어야 한다. 그래야 "첫 장 고르기"와 "최대 고르기"가 다르다.
    """
    # 그룹은 같고(g1), 이미지 경로는 정렬상 aaa가 먼저, bbb가 나중
    items = [
        _item('g1', 's1', '/path/aaa.jpg', positive=True),  # 라벨 1개 (기본값)
        _item('g1', 's1', '/path/bbb.jpg', positive=True),  # 라벨 1개를 3개로 수정
    ]
    # bbb를 3개 라벨로 업데이트
    items = [
        items[0],
        items[1]._replace(lines=['0 0.5 0.5 0.1 0.1', '1 0.3 0.3 0.1 0.1', '2 0.7 0.7 0.1 0.1'])
    ]

    kept = pick_one_per_group(items)

    # 그룹이 하나만 남아야 한다
    assert len(kept) == 1
    assert len({i.group for i in kept}) == 1
    # 라벨이 3개인 bbb가 선택되어야 한다
    assert kept[0].src_img == '/path/bbb.jpg'
    assert len(kept[0].lines) == 3


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


def _make_mech83_like(root):
    """ds_mech83 을 닮은 합성 데이터셋 — 클래스 이름이 6tool 과 다르다(`pliers`)."""
    _write(os.path.join(root, 'data.yaml'),
           'names:\n- drill\n- hammer\n- pliers\n- screwdriver\n- wrench\nnc: 5\n')
    for n in range(6):
        _write(os.path.join(root, 'train/images', f'm{n}_jpg.rf.h{n}.jpg'), 'x')
        _write(os.path.join(root, 'train/labels', f'm{n}_jpg.rf.h{n}.txt'),
               '2 0.5 0.5 0.2 0.2\n')       # pliers -> 2
    _write(os.path.join(root, 'valid/images', 'mdrill_jpg.rf.z.jpg'), 'x')
    _write(os.path.join(root, 'valid/labels', 'mdrill_jpg.rf.z.txt'),
           '0 0.5 0.5 0.2 0.2\n')           # drill -> 네거티브


def test_build_writes_dataset(tmp_path):
    a, b = str(tmp_path / 'ds6'), str(tmp_path / 'dsm')
    out = str(tmp_path / 'out')
    _make_6tool_like(a)
    _make_mech83_like(b)

    report = build([(a, '6tool'), (b, 'mech83')], out, seed=0)

    assert os.path.isdir(os.path.join(out, 'train/images'))
    assert os.path.isdir(os.path.join(out, 'valid/images'))
    y = open(os.path.join(out, 'data.yaml')).read()
    assert 'nc: 3' in y
    assert '- driver\n- wrench\n- pliers\n' in y
    assert f'path: {os.path.abspath(out)}' in y
    assert report['images'] > 0
    assert report['leaks'] == 0


def test_build_has_no_source_leak(tmp_path):
    """🔴 산출물에서 직접 확인한다 — 같은 출처가 두 split 에 있으면 안 된다."""
    import sys as _sys
    _sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from dataset_diversity import group_key, source_key

    a, b = str(tmp_path / 'ds6'), str(tmp_path / 'dsm')
    out = str(tmp_path / 'out')
    _make_6tool_like(a)
    _make_mech83_like(b)

    build([(a, '6tool'), (b, 'mech83')], out, seed=0)

    seen = {}
    for split in ('train', 'valid'):
        for f in os.listdir(os.path.join(out, split, 'images')):
            s = source_key(group_key(f))
            seen.setdefault(s, set()).add(split)
    assert all(len(v) == 1 for v in seen.values())


def test_build_remaps_across_differing_class_names(tmp_path):
    """6tool 의 `plier` 와 mech83 의 `pliers` 가 같은 인덱스 2 로 모여야 한다."""
    a, b = str(tmp_path / 'ds6'), str(tmp_path / 'dsm')
    out = str(tmp_path / 'out')
    _make_6tool_like(a)
    _make_mech83_like(b)

    build([(a, '6tool'), (b, 'mech83')], out, seed=0)

    idxs = set()
    for split in ('train', 'valid'):
        for f in sorted(os.listdir(os.path.join(out, split, 'labels'))):
            # 새 규칙: 접두어는 `.rf.` 뒤에 붙는다 — mech83 의 mN 파일만 고른다.
            if not (f.startswith('m') and '.rf.mech83_' in f):
                continue
            for line in open(os.path.join(out, split, 'labels', f)):
                if line.split():
                    idxs.add(line.split()[0])
    assert idxs == {'2'}


def test_build_is_reproducible(tmp_path):
    a, b = str(tmp_path / 'ds6'), str(tmp_path / 'dsm')
    _make_6tool_like(a)
    _make_mech83_like(b)

    r1 = build([(a, '6tool'), (b, 'mech83')], str(tmp_path / 'o1'), seed=0)
    r2 = build([(a, '6tool'), (b, 'mech83')], str(tmp_path / 'o2'), seed=0)

    assert r1['checksum'] == r2['checksum']


def test_build_embeds_dataset_prefix_after_rf_marker(tmp_path):
    """🔴 사용자 재정(2026-08-12) — 접두어는 파일명 맨 앞이 아니라 `.rf.` 뒤에 붙는다.

    맨 앞에 붙이면 짧은 숫자 stem 과 합쳐져 source_key 의 일련번호 병합
    규칙을 건드려, 산출물 감사가 서로 다른 출처를 하나로 잘못 뭉갠다.
    """
    a, b = str(tmp_path / 'ds6'), str(tmp_path / 'dsm')
    out = str(tmp_path / 'out')
    _make_6tool_like(a)
    _make_mech83_like(b)

    build([(a, '6tool'), (b, 'mech83')], out, seed=0)

    names = []
    for split in ('train', 'valid'):
        names += os.listdir(os.path.join(out, split, 'images'))
    assert all(('.rf.6tool_' in n) or ('.rf.mech83_' in n) for n in names)


def test_build_keeps_all_copies_sharing_a_stem(tmp_path):
    """🔴 사용자 재정(2026-08-12) — `build()` 는 `pick_one_per_group` 을 쓰지 않는다.

    이 데이터셋들에선 같은 stem 이 "증강본"이 아니라 서로 다른 사진일 수
    있다고 실측으로 확인됐다(Roboflow README: 6tool 은 배수 2로 균일,
    mech83 은 증강 없음). 그래서 산출물은 `shot1` 의 두 벌(aaa·bbb)을
    모두 살려야 한다 — 하나만 남기면 진짜 사진을 지우는 셈이다.
    """
    a, b = str(tmp_path / 'ds6'), str(tmp_path / 'dsm')
    out = str(tmp_path / 'out')
    _make_6tool_like(a)
    _make_mech83_like(b)

    build([(a, '6tool'), (b, 'mech83')], out, seed=0)

    names = []
    for split in ('train', 'valid'):
        names += os.listdir(os.path.join(out, split, 'images'))
    shot_copies = [n for n in names if n.startswith('shot1_jpg.rf.')]
    assert len(shot_copies) == 2
    assert any('_aaa' in n for n in shot_copies)
    assert any('_bbb' in n for n in shot_copies)


def _make_numeric_like(root):
    """실데이터를 닮은 6자리 숫자 파일명 — 예: 000102_jpg.rf.<해시>.jpg.

    각 파일은 서로 다른 사진(다른 출처)이다. 접두어를 파일명 맨 앞에 붙이면
    이 숫자 stem 과 합쳐져 source_key 가 전부 하나로 뭉갠다 — 이번에 물린
    바로 그 함정이다.
    """
    _write(os.path.join(root, 'data.yaml'),
           'names:\n- screwdriver\n- wrench\n- plier\nnc: 3\n')
    for i in range(5):
        n = f'{i:06d}'
        _write(os.path.join(root, 'train/images', f'{n}_jpg.rf.h{i}.jpg'), 'x')
        _write(os.path.join(root, 'train/labels', f'{n}_jpg.rf.h{i}.txt'),
               '0 0.5 0.5 0.2 0.2\n')


def test_build_output_names_dont_collapse_numeric_sources(tmp_path):
    """🔴 회귀 — 접두어가 stem 과 합쳐져 서로 다른 출처가 하나로 뭉개지면 안 된다."""
    import sys as _sys
    _sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from dataset_diversity import group_key, source_key

    root = str(tmp_path / 'ds_numeric')
    out = str(tmp_path / 'out')
    _make_numeric_like(root)

    build([(root, 'realcam')], out, seed=0)

    sources = set()
    for split in ('train', 'valid'):
        img_dir = os.path.join(out, split, 'images')
        if not os.path.isdir(img_dir):
            continue
        for f in os.listdir(img_dir):
            sources.add(source_key(group_key(f)))
    assert len(sources) == 5


def test_build_raises_when_valid_is_empty(tmp_path):
    """모든 출처가 거대출처면 valid 가 0장이 될 수 있다 — 빈 시험지로 학습시키지 않는다.

    한 데이터셋에 출처가 하나뿐이고 이미지가 여러 장이면, 그 출처는
    valid 목표(전체 * valid_ratio)의 50% 를 넘어 통째로 train 으로 간다.
    """
    root = str(tmp_path / 'ds_onesource')
    out = str(tmp_path / 'out')
    _write(os.path.join(root, 'data.yaml'),
           'names:\n- screwdriver\n- wrench\n- plier\nnc: 3\n')
    for n in range(10):
        _write(os.path.join(root, 'train/images', f'shot_{n}_jpg.rf.h{n}.jpg'), 'x')
        _write(os.path.join(root, 'train/labels', f'shot_{n}_jpg.rf.h{n}.txt'),
               '0 0.5 0.5 0.2 0.2\n')

    with pytest.raises(ValueError):
        build([(root, 'one')], out, seed=0)
