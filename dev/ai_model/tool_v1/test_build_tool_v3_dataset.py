import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from build_tool_v3_dataset import (
    NEW_NAMES,
    build_remap,
    remap_label_lines,
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
