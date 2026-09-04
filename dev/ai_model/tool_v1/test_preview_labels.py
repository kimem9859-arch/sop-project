import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from PIL import Image

import preview_labels


def _write(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w') as f:
        f.write(text)


def test_preview_labels_handles_out_of_range_index(tmp_path):
    """🔴 인덱스 밀림을 잡으려고 만든 도구가 밀림 때문에 죽으면 안 된다.

    `NEW_NAMES[ci]` 가 범위 밖이면 IndexError 로 죽던 것을, `?<번호>` 로
    표시하고 계속 진행하도록 고쳤다.
    """
    root = str(tmp_path / 'ds')
    out = str(tmp_path / 'out')
    img_dir = os.path.join(root, 'train', 'images')
    lbl_dir = os.path.join(root, 'train', 'labels')
    os.makedirs(img_dir)
    os.makedirs(lbl_dir)

    Image.new('RGB', (100, 100), color=(10, 10, 10)).save(
        os.path.join(img_dir, 'a.jpg'))
    _write(os.path.join(lbl_dir, 'a.txt'), '9 0.5 0.5 0.2 0.2\n')  # 범위 밖 인덱스

    # 죽지 않고 끝까지 실행돼야 한다.
    preview_labels.main(['prog', root, out, '1', '0'])

    assert len(os.listdir(out)) == 1


def test_names_come_from_dataset_yaml(tmp_path):
    """🔑 클래스 이름은 **그 데이터셋의 data.yaml** 에서 온다(v3/v4 스키마 혼동 방지)."""
    root = str(tmp_path / 'ds6')
    os.makedirs(os.path.join(root, 'train', 'images'))
    _write(os.path.join(root, 'data.yaml'),
           "names:\n- driver\n- wrench\n- pliers\n"
           "- driver-in-hand\n- wrench-in-hand\n- pliers-in-hand\nnc: 6\n")
    assert preview_labels.load_names(root) == [
        'driver', 'wrench', 'pliers',
        'driver-in-hand', 'wrench-in-hand', 'pliers-in-hand']


def test_names_missing_yaml_does_not_die(tmp_path):
    root = str(tmp_path / 'noyaml')
    os.makedirs(root)
    assert preview_labels.load_names(root) == []
