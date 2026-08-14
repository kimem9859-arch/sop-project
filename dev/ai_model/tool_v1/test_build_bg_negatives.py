"""배경 네거티브 샘플러 검증.

실행: ~/rfenv/bin/python test_build_bg_negatives.py

정본: ../../../docs/superpowers/specs/2026-08-14-네거티브보강-design.md §3.1·§5

⚠️ 임시 디렉터리에 가짜 세션을 만들어 시험한다 — 실제 2.6GB raw 를 건드리지 않는다.
"""

import glob
import json
import os
import shutil
import sys
import tempfile
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np
import cv2

from build_bg_negatives import pick_frames, build_to_dir

_fails = []


def check(cond, msg):
    print(("  ✅ " if cond else "  ❌ ") + msg)
    if not cond:
        _fails.append(msg)


SPLIT = {
    'train': ['sess_a', 'sess_b'],
    'holdout': ['sess_holdout'],
    'excluded': {'sess_tools': '공구 세션'},
}


def make_raw(tmp, sessions, n=10):
    """가짜 raw 트리 — 세션마다 n 장의 작은 png."""
    for s in sessions:
        d = os.path.join(tmp, s)
        os.makedirs(d, exist_ok=True)
        for i in range(n):
            cv2.imwrite(os.path.join(d, f'f{i:05d}.png'),
                        np.full((16, 16, 3), i * 10 % 256, dtype=np.uint8))
    return tmp


# ------------------------------------------------------- ① 홀드아웃·제외 격리
def test_홀드아웃은_안들어간다():
    """🔴 이게 무너지면 평가가 순환논리가 된다."""
    print("[1] 홀드아웃 세션이 학습 네거티브에 섞이지 않는다")
    tmp = tempfile.mkdtemp()
    try:
        make_raw(tmp, ['sess_a', 'sess_b', 'sess_holdout', 'sess_tools'])
        picked = pick_frames(tmp, SPLIT, per_session=2)
        sess = {p.split(os.sep)[-2] for p in picked}
        check('sess_holdout' not in sess, "홀드아웃 세션이 한 장도 없다")
        check(sess == {'sess_a', 'sess_b'}, f"학습 세션만 (실제 {sorted(sess)})")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def test_제외세션도_안들어간다():
    print("[2] 제외 세션(공구)도 빠진다")
    tmp = tempfile.mkdtemp()
    try:
        make_raw(tmp, ['sess_a', 'sess_b', 'sess_holdout', 'sess_tools'])
        picked = pick_frames(tmp, SPLIT, per_session=2)
        check(not any('sess_tools' in p for p in picked),
              "🔴 공구 세션 제외 — 틀린 네거티브는 없는 네거티브보다 해롭다")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


# ------------------------------------------------------- ② 라벨
def test_라벨은_전부_빈파일():
    print("[3] 라벨이 전부 빈 파일이다")
    tmp = tempfile.mkdtemp()
    out = tempfile.mkdtemp()
    try:
        make_raw(tmp, ['sess_a', 'sess_b'])
        build_to_dir(out, tmp, SPLIT, per_session=2)
        labels = glob.glob(os.path.join(out, 'train', 'labels', '*.txt'))
        check(len(labels) == 4, f"라벨 4개 (실제 {len(labels)})")
        check(all(os.path.getsize(p) == 0 for p in labels),
              "🔑 전부 빈 파일 — 이것이 네거티브다")
        imgs = glob.glob(os.path.join(out, 'train', 'images', '*'))
        check(len(imgs) == 4, f"이미지도 4개 (실제 {len(imgs)})")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
        shutil.rmtree(out, ignore_errors=True)


def test_파일명이_유일하다():
    """🔴 병합 도구가 이름 충돌을 검사한다 — 세션이 달라도 f00000.png 는 겹친다."""
    print("[4] 파일명이 세션을 포함해 유일하다")
    tmp = tempfile.mkdtemp()
    out = tempfile.mkdtemp()
    try:
        make_raw(tmp, ['sess_a', 'sess_b'])
        build_to_dir(out, tmp, SPLIT, per_session=2)
        names = [os.path.basename(p)
                 for p in glob.glob(os.path.join(out, 'train', 'images', '*'))]
        check(len(names) == len(set(names)), "중복 없음")
        check(all(n.startswith('bg_') for n in names), f"bg_ 접두어 (실제 {names[:2]})")
        check(any('sess_a' in n for n in names) and any('sess_b' in n for n in names),
              "세션명이 파일명에 들어간다")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
        shutil.rmtree(out, ignore_errors=True)


def test_data_yaml_이_생긴다():
    print("[5] data.yaml 이 3클래스로 생긴다")
    tmp = tempfile.mkdtemp()
    out = tempfile.mkdtemp()
    try:
        make_raw(tmp, ['sess_a'])
        build_to_dir(out, tmp, {'train': ['sess_a'], 'holdout': [], 'excluded': {}},
                     per_session=2)
        y = open(os.path.join(out, 'data.yaml')).read()
        for n in ('driver', 'wrench', 'pliers'):
            check(n in y, f"'{n}' 포함")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
        shutil.rmtree(out, ignore_errors=True)


# ------------------------------------------------------- ③ 재현성·분포
def test_결정적():
    """§10.40 이 파이·Colab 체크섬 일치로 실증한 재현성을 지킨다."""
    print("[6] 두 번 돌려도 같은 결과")
    tmp = tempfile.mkdtemp()
    try:
        make_raw(tmp, ['sess_a', 'sess_b'])
        a = pick_frames(tmp, SPLIT, per_session=3)
        b = pick_frames(tmp, SPLIT, per_session=3)
        check(a == b, "같은 입력 → 같은 출력")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def test_세션당_균등():
    print("[7] 세션마다 같은 수를 뽑는다")
    tmp = tempfile.mkdtemp()
    try:
        make_raw(tmp, ['sess_a', 'sess_b'])
        picked = pick_frames(tmp, SPLIT, per_session=3)
        from collections import Counter
        c = Counter(p.split(os.sep)[-2] for p in picked)
        check(set(c.values()) == {3}, f"세션마다 3장 (실제 {dict(c)})")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def test_균등간격으로_뽑는다():
    """랜덤이 아니라 균등 간격 — 세션 앞뒤가 고르게 담긴다."""
    print("[8] 세션 안에서 균등 간격")
    tmp = tempfile.mkdtemp()
    try:
        make_raw(tmp, ['sess_a'], n=10)
        picked = pick_frames(tmp, {'train': ['sess_a'], 'holdout': [], 'excluded': {}},
                             per_session=5)
        idx = [int(os.path.basename(p)[1:6]) for p in picked]
        gaps = {idx[i + 1] - idx[i] for i in range(len(idx) - 1)}
        check(len(gaps) <= 2, f"간격이 일정하다 (실제 {sorted(idx)})")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def test_프레임이_모자라면_있는만큼():
    print("[9] 요청보다 프레임이 적으면 있는 만큼")
    tmp = tempfile.mkdtemp()
    try:
        make_raw(tmp, ['sess_a'], n=3)
        picked = pick_frames(tmp, {'train': ['sess_a'], 'holdout': [], 'excluded': {}},
                             per_session=999)
        check(len(picked) == 3, f"예외 없이 3장 (실제 {len(picked)})")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def test_없는세션은_건너뛴다():
    print("[10] split 에 있지만 디스크에 없는 세션")
    tmp = tempfile.mkdtemp()
    try:
        make_raw(tmp, ['sess_a'])
        picked = pick_frames(tmp, SPLIT, per_session=2)   # sess_b 가 없다
        check(len(picked) == 2, f"있는 것만 (실제 {len(picked)})")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    t0 = time.time()
    test_홀드아웃은_안들어간다()
    test_제외세션도_안들어간다()
    test_라벨은_전부_빈파일()
    test_파일명이_유일하다()
    test_data_yaml_이_생긴다()
    test_결정적()
    test_세션당_균등()
    test_균등간격으로_뽑는다()
    test_프레임이_모자라면_있는만큼()
    test_없는세션은_건너뛴다()

    elapsed = time.time() - t0
    print()
    if _fails:
        print(f"❌ 실패 {len(_fails)}건")
        for m in _fails:
            print(f"   - {m}")
        sys.exit(1)
    print(f"✅ 배경 네거티브 샘플러 검증 통과 ({elapsed:.3f}s)")
