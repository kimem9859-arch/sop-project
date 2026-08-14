import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import pytest

from build_tool_v3_dataset import (
    NEW_NAMES,
    build,
    build_remap,
    main,
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
    remap, unmapped = build_remap(src)
    assert remap == {3: 2, 4: 0, 5: 1}
    assert unmapped == ['bolt-nut', 'hammer', 'other tool']


def test_build_remap_mech83():
    # ds_mech83: drill, hammer, pliers, screwdriver, wrench
    src = ['drill', 'hammer', 'pliers', 'screwdriver', 'wrench']
    remap, unmapped = build_remap(src)
    assert remap == {2: 2, 3: 0, 4: 1}
    assert unmapped == ['drill', 'hammer']


def test_build_remap_is_case_insensitive():
    remap, unmapped = build_remap(['ScrewDriver', 'Wrench', 'Plier'])
    assert remap == {0: 0, 1: 1, 2: 2}
    assert unmapped == []


def test_build_remap_raises_when_nothing_maps():
    """🔴 한 클래스도 못 붙이면(빈 dict) 조용히 넘기지 않고 바로 ValueError."""
    with pytest.raises(ValueError):
        build_remap(['hammer', 'drill', 'bolt-nut'])


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

    items, _report = scan_dataset(root, '6tool')

    assert len(items) == 6
    assert sum(1 for i in items if i.positive) == 4
    assert sum(1 for i in items if not i.positive) == 2


def test_scan_dataset_remaps_labels(tmp_path):
    root = str(tmp_path / 'ds6')
    _make_6tool_like(root)

    items, _report = scan_dataset(root, '6tool')
    items = {os.path.basename(i.src_img): i for i in items}

    # screwdriver(4) -> driver(0)
    assert items['shot1_jpg.rf.aaa.jpg'].lines == ['0 0.5 0.5 0.2 0.2']
    # wrench(5) -> wrench(1)
    assert items['frame_00001_jpg.rf.c00001.jpg'].lines == ['1 0.4 0.4 0.2 0.2']
    # hammer -> 라벨 없음
    assert items['ham1_jpg.rf.ddd.jpg'].lines == []


def test_scan_dataset_groups_augmented_copies(tmp_path):
    root = str(tmp_path / 'ds6')
    _make_6tool_like(root)

    items, _report = scan_dataset(root, '6tool')
    items = {os.path.basename(i.src_img): i for i in items}

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

    items_a, _report_a = scan_dataset(root_a, '6tool')
    items_b, _report_b = scan_dataset(root_b, 'mech83')

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

    first = [i.src_img for i in scan_dataset(root, '6tool')[0]]
    second = [i.src_img for i in scan_dataset(root, '6tool')[0]]

    assert first == second


def _item(group, source, img, positive=True, dataset=None):
    return __import__('build_tool_v3_dataset').Item(
        group=group, source=source, src_img=img,
        lines=['0 0.5 0.5 0.1 0.1'] if positive else [],
        positive=positive, dataset=dataset,
    )


# --------------------------------------------------------- keep_all_prefixes
# 🆕 2026-08-14 — 우리 배경 하드 네거티브(A-2 후속). 설계 =
#    ../../../docs/superpowers/specs/2026-08-14-네거티브보강-design.md
def test_keep_all_은_그_소스를_샘플링에서_뺀다():
    """🔴 우리 배경이 공개 네거티브 풀에 섞여 잘리면 안 된다.

    현재 네거티브 3,888장은 round(양성×0.15) 상한에 정확히 걸린 값이라
    **공개 데이터셋 네거티브 후보가 그보다 많다**(2026-08-14 확인). 그래서
    ratio 만 올리면 우리 배경이 그 풀에 섞여 원하는 만큼 안 들어간다.
    """
    items = [_item(f'g{n}', f's{n}', f'/p/{n}.jpg', dataset='6tool')
             for n in range(100)]
    items += [_item(f'n{n}', f'ns{n}', f'/p/neg{n}.jpg', positive=False,
                    dataset='6tool') for n in range(50)]
    items += [_item(f'b{n}', f'bs{n}', f'/p/bg{n}.jpg', positive=False,
                    dataset='bg') for n in range(30)]

    out = sample_negatives(items, ratio=0.15, seed=0, keep_all_prefixes=('bg',))

    assert sum(1 for i in out if i.dataset == 'bg') == 30, 'bg 는 30장 전량 유지'
    assert sum(1 for i in out if i.dataset == '6tool' and not i.positive) == 15, \
        '나머지는 종전대로 round(100 × 0.15) = 15'
    assert sum(1 for i in out if i.positive) == 100, '양성은 전부'


def test_keep_all_없으면_종전과_한장도_다르지_않다():
    """회귀 방지 — 옵션을 안 주면 지금 동작 그대로여야 한다."""
    items = [_item(f'g{n}', f's{n}', f'/p/{n}.jpg', dataset='6tool')
             for n in range(20)]
    items += [_item(f'n{n}', f'ns{n}', f'/p/neg{n}.jpg', positive=False,
                    dataset='6tool') for n in range(20)]

    before = [i.src_img for i in sample_negatives(items, ratio=0.15, seed=0)]
    after = [i.src_img for i in sample_negatives(items, ratio=0.15, seed=0,
                                                 keep_all_prefixes=())]
    assert before == after


def test_keep_all_은_양성을_건드리지_않는다():
    """bg 소스에 양성이 섞여 들어와도 네거티브 취급을 하지 않는다."""
    items = [_item('g', 's', '/p/pos.jpg', dataset='bg'),
             _item('n', 'ns', '/p/neg.jpg', positive=False, dataset='bg')]
    out = sample_negatives(items, ratio=0.15, seed=0, keep_all_prefixes=('bg',))
    assert len(out) == 2
    assert sum(1 for i in out if i.positive) == 1


def test_keep_all_결과도_결정적():
    items = [_item(f'g{n}', f's{n}', f'/p/{n}.jpg', dataset='6tool')
             for n in range(40)]
    items += [_item(f'n{n}', f'ns{n}', f'/p/neg{n}.jpg', positive=False,
                    dataset='6tool') for n in range(40)]
    items += [_item(f'b{n}', f'bs{n}', f'/p/bg{n}.jpg', positive=False,
                    dataset='bg') for n in range(10)]

    a = [i.src_img for i in sample_negatives(items, 0.15, 0, ('bg',))]
    b = [i.src_img for i in sample_negatives(items, 0.15, 0, ('bg',))]
    assert a == b


def test_pick_one_per_group_keeps_exactly_one(tmp_path):
    root = str(tmp_path / 'ds6')
    _make_6tool_like(root)

    kept = pick_one_per_group(scan_dataset(root, '6tool')[0])

    # 증강본 2벌 → 1장. 나머지 4장은 각자 단독 그룹.
    assert len(kept) == 5
    assert len({i.group for i in kept}) == 5


def test_pick_one_per_group_is_deterministic(tmp_path):
    root = str(tmp_path / 'ds6')
    _make_6tool_like(root)
    items, _report = scan_dataset(root, '6tool')

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


def _make_partial_unmapped_dataset(root):
    """일부 클래스만 매핑되는 데이터셋 — spanner 처럼 CLASS_MAP 밖 이름만 있는
    이미지는 라벨이 통째로 빠져 조용히 네거티브가 된다."""
    _write(os.path.join(root, 'data.yaml'),
           'names:\n- screwdriver\n- spanner\nnc: 2\n')
    _write(os.path.join(root, 'train/images', 'a_jpg.rf.aaa.jpg'), 'x')
    _write(os.path.join(root, 'train/labels', 'a_jpg.rf.aaa.txt'),
           '0 0.5 0.5 0.2 0.2\n')          # screwdriver -> driver, 매핑됨
    _write(os.path.join(root, 'train/images', 'b_jpg.rf.bbb.jpg'), 'x')
    _write(os.path.join(root, 'train/labels', 'b_jpg.rf.bbb.txt'),
           '1 0.5 0.5 0.2 0.2\n')          # spanner -> 매핑 없음, 조용히 네거티브화


def test_scan_dataset_reports_unmapped_classes_and_negatives(tmp_path):
    root = str(tmp_path / 'ds_partial')
    _make_partial_unmapped_dataset(root)

    items, report = scan_dataset(root, 'p')

    assert report['unmapped'] == ['spanner']
    assert report['unmapped_negatives'] == 1
    by_name = {os.path.basename(i.src_img): i for i in items}
    assert by_name['a_jpg.rf.aaa.jpg'].positive
    assert not by_name['b_jpg.rf.bbb.jpg'].positive


def _make_6tool_like_with_unmapped(root):
    """`_make_6tool_like` 에 매핑 안 되는 클래스(spanner) 이미지를 하나 더한다."""
    _make_6tool_like(root)
    _write(os.path.join(root, 'data.yaml'),
           'names:\n- bolt-nut\n- hammer\n- other tool\n- plier\n'
           '- screwdriver\n- wrench\n- spanner\nnc: 7\n')
    _write(os.path.join(root, 'train/images', 'span1_jpg.rf.fff.jpg'), 'x')
    _write(os.path.join(root, 'train/labels', 'span1_jpg.rf.fff.txt'),
           '6 0.5 0.5 0.2 0.2\n')


def test_build_reports_unmapped_classes_per_dataset(tmp_path):
    """🔴 Important 1 — spanner 같은 매핑 밖 이름이 조용히 네거티브가 되는 걸
    build() 리포트로 드러낸다(데이터셋별로 구분)."""
    a, b = str(tmp_path / 'ds6'), str(tmp_path / 'dsm')
    out = str(tmp_path / 'out')
    _make_6tool_like_with_unmapped(a)
    _make_mech83_like(b)

    report = build([(a, '6tool'), (b, 'mech83')], out, seed=0)

    assert report['unmapped']['6tool']['unmapped'] == [
        'bolt-nut', 'hammer', 'other tool', 'spanner']
    # ham1(hammer 단독) + span1(spanner 단독) = 2장이 매핑 실패로 네거티브화
    assert report['unmapped']['6tool']['unmapped_negatives'] == 2
    # mech83 도 drill·hammer 가 안 붙는다(mdrill 1장이 네거티브화)
    assert report['unmapped']['mech83']['unmapped'] == ['drill', 'hammer']
    assert report['unmapped']['mech83']['unmapped_negatives'] == 1


def test_build_stays_quiet_when_only_known_discards_are_unmapped(tmp_path):
    """🔴 회귀 방지 — 6tool·mech83 조합(정상 실사용)에서는 KNOWN_DISCARD 밖
    이름이 하나도 없으므로 `unknown_unmapped` 가 비어야 한다. 매번 뜨는
    경고에 운영자가 무뎌지면 진짜 미지의 이름을 놓친다."""
    a, b = str(tmp_path / 'ds6'), str(tmp_path / 'dsm')
    out = str(tmp_path / 'out')
    _make_6tool_like(a)
    _make_mech83_like(b)

    report = build([(a, '6tool'), (b, 'mech83')], out, seed=0)

    # bolt-nut·hammer·other tool·drill 은 전부 KNOWN_DISCARD 안이다.
    assert report['unmapped']            # 예상된 버림은 여전히 기록된다
    assert report['unknown_unmapped'] == {}


def test_build_flags_unknown_class_name_not_in_known_discard(tmp_path):
    """🔴 Important 2 핵심 — spanner 처럼 KNOWN_DISCARD 밖 이름은 눈에 띄게
    분리돼야 한다(예상된 버림과 섞이면 안 됨)."""
    a, b = str(tmp_path / 'ds6'), str(tmp_path / 'dsm')
    out = str(tmp_path / 'out')
    _make_6tool_like_with_unmapped(a)   # spanner 이미지 포함
    _make_mech83_like(b)

    report = build([(a, '6tool'), (b, 'mech83')], out, seed=0)

    assert report['unknown_unmapped'] == {
        '6tool': {'names': ['spanner'], 'unmapped_negatives': 2},
    }
    # mech83 은 drill·hammer 뿐이라(둘 다 KNOWN_DISCARD) unknown_unmapped 에 없다.
    assert 'mech83' not in report['unknown_unmapped']


def test_main_prints_alert_only_for_unknown_names(tmp_path, capsys):
    """`main()` CLI — 예상된 버림뿐이면 조용히(🔴 표시 없이), 미지의 이름이
    섞이면 🔴 로 눈에 띄게 출력한다."""
    a, b = str(tmp_path / 'ds6'), str(tmp_path / 'dsm')
    _make_6tool_like(a)
    _make_mech83_like(b)

    main(['prog', str(tmp_path / 'out_normal'), f'{a}:6tool', f'{b}:mech83'])
    normal_out = capsys.readouterr().out
    assert '🔴 매핑 안 된 미지의 클래스명' not in normal_out

    a2, b2 = str(tmp_path / 'ds6_spanner'), str(tmp_path / 'dsm2')
    _make_6tool_like_with_unmapped(a2)
    _make_mech83_like(b2)

    main(['prog', str(tmp_path / 'out_spanner'), f'{a2}:6tool', f'{b2}:mech83'])
    spanner_out = capsys.readouterr().out
    assert '🔴 매핑 안 된 미지의 클래스명' in spanner_out
    assert 'spanner' in spanner_out


def test_build_remap_used_alone_raises_for_fully_unmapped_dataset(tmp_path):
    """단일 데이터셋에서 클래스가 하나도 안 붙으면 "valid 0장" 이 아니라
    매핑 실패 메시지로 즉시 죽어야 한다 — 원인을 오도하지 않기 위해."""
    root = str(tmp_path / 'ds_none')
    out = str(tmp_path / 'out')
    _write(os.path.join(root, 'data.yaml'),
           'names:\n- spanner\nnc: 1\n')
    _write(os.path.join(root, 'train/images', 'a_jpg.rf.aaa.jpg'), 'x')
    _write(os.path.join(root, 'train/labels', 'a_jpg.rf.aaa.txt'),
           '0 0.5 0.5 0.2 0.2\n')

    with pytest.raises(ValueError, match='클래스 매핑이 하나도 없습니다'):
        build([(root, 'p')], out, seed=0)


def test_build_raises_on_output_name_collision(tmp_path):
    """🔴 Important 2 — 서로 다른 split 에 같은 basename 이 있으면 출력명이
    겹쳐 뒤엣것이 앞엣것을 조용히 덮어쓴다. 쓰기 전에 잡아야 한다."""
    root = str(tmp_path / 'ds_dup')
    out = str(tmp_path / 'out')
    _write(os.path.join(root, 'data.yaml'),
           'names:\n- screwdriver\n- wrench\n- plier\nnc: 3\n')
    # 서로 다른 출처의 이미지를 넉넉히 섞는다 — valid 0장 가드보다 먼저
    # 충돌 가드에 걸리는지 보려면 valid 배정 자체는 문제없이 되어야 한다.
    for n in range(20):
        _write(os.path.join(root, 'train/images', f's{n}_jpg.rf.h{n}.jpg'), 'x')
        _write(os.path.join(root, 'train/labels', f's{n}_jpg.rf.h{n}.txt'),
               '0 0.5 0.5 0.2 0.2\n')
    # 소스의 서로 다른 split 에 같은 basename — 같은 출처라 항상 같은
    # split 으로 함께 가므로, 출력명도 같아져 충돌한다.
    for split in ('train', 'valid'):
        _write(os.path.join(root, split, 'images', 'dup_jpg.rf.xxx.jpg'), 'x')
        _write(os.path.join(root, split, 'labels', 'dup_jpg.rf.xxx.txt'),
               '0 0.5 0.5 0.2 0.2\n')

    with pytest.raises(ValueError, match='충돌'):
        build([(root, 'one')], out, seed=0)


def test_build_rejects_nonempty_out_dir(tmp_path):
    """🔴 Important 2 둘째 증상 — 이전 실행 잔존물과 섞이면 리포트와 디스크가
    어긋난다. 자동 삭제하지 않고 거부한다."""
    a, b = str(tmp_path / 'ds6'), str(tmp_path / 'dsm')
    out = str(tmp_path / 'out')
    _make_6tool_like(a)
    _make_mech83_like(b)
    os.makedirs(out)
    _write(os.path.join(out, 'leftover.txt'), 'x')

    with pytest.raises(ValueError, match='비어 있지 않습니다'):
        build([(a, '6tool'), (b, 'mech83')], out, seed=0)


def test_checksum_changes_when_label_content_changes(tmp_path):
    """🔴 Important 3 — 체크섬은 파일명뿐 아니라 라벨 내용까지 반영해야 한다.
    리맵 버그는 파일명을 바꾸지 않으므로, 내용이 안 들어가면 "체크섬 일치"가
    실제 보증이 되지 못한다."""
    a, b = str(tmp_path / 'ds6'), str(tmp_path / 'dsm')
    _make_6tool_like(a)
    _make_mech83_like(b)

    r1 = build([(a, '6tool'), (b, 'mech83')], str(tmp_path / 'out1'), seed=0)

    # 파일명은 그대로 두고 라벨 좌표만 바꾼다.
    _write(os.path.join(a, 'train/labels', 'shot1_jpg.rf.aaa.txt'),
           '4 0.1 0.1 0.1 0.1\n')

    r2 = build([(a, '6tool'), (b, 'mech83')], str(tmp_path / 'out2'), seed=0)

    assert r1['checksum'] != r2['checksum']


def test_main_rejects_empty_prefix():
    """`main()` CLI — 접두어가 빈 문자열(`~/ds:`)이면 거부한다."""
    with pytest.raises(SystemExit):
        main(['prog', '/tmp/whatever_out', '/tmp/whatever_ds:'])


def test_main_exits_cleanly_on_build_value_error(tmp_path):
    """`main()` 이 `build()` 의 `ValueError` 를 raw traceback 대신
    `sys.exit(str(e))` 로 낸다 — 다른 CLI 오류와 형식을 맞춘다."""
    a, b = str(tmp_path / 'ds6'), str(tmp_path / 'dsm')
    out = str(tmp_path / 'out')
    _make_6tool_like(a)
    _make_mech83_like(b)
    os.makedirs(out)
    _write(os.path.join(out, 'leftover.txt'), 'x')

    with pytest.raises(SystemExit) as exc_info:
        main(['prog', out, f'{a}:6tool', f'{b}:mech83'])
    assert isinstance(exc_info.value.code, str)
    assert '비어 있지 않습니다' in exc_info.value.code


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
