import os, textwrap
from filter_tool_classes import filter_dataset

def _write(p, s):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "w") as f:
        f.write(s)

def test_filter_keeps_and_remaps(tmp_path):
    """Test inline-list format data.yaml with train+valid splits (no test)."""
    src = tmp_path / "src"; dst = tmp_path / "dst"
    # 원본 5클래스: 0=Hammer 1=Adjustable Spanner 2=ScrewDriver 3=Wrench 4=Plier
    _write(str(src/"data.yaml"),
        "train: ../train/images\nval: ../valid/images\n"
        "nc: 5\nnames: ['Hammer','Adjustable Spanner','ScrewDriver','Wrench','Plier']\n")
    # img A: spanner(1) + hammer(0)  → spanner만 남고 new idx 0
    _write(str(src/"train/images/a.jpg"), "x")
    _write(str(src/"train/labels/a.txt"), "1 0.5 0.5 0.2 0.2\n0 0.1 0.1 0.1 0.1\n")
    # img B: plier(4)만 → 라벨 비워짐(네거티브)
    _write(str(src/"train/images/b.jpg"), "x")
    _write(str(src/"train/labels/b.txt"), "4 0.5 0.5 0.2 0.2\n")
    # img C(valid): driver(2)+wrench(3) → new idx 1,2
    _write(str(src/"valid/images/c.jpg"), "x")
    _write(str(src/"valid/labels/c.txt"), "2 0.4 0.4 0.1 0.1\n3 0.6 0.6 0.1 0.1\n")

    r = filter_dataset(str(src), str(dst),
                       keep_names=['Adjustable Spanner','ScrewDriver','Wrench'],
                       new_names=['spanner','driver','wrench'])

    # Verify data.yaml format (Roboflow: names block, path, correct paths, no test line)
    y = (dst/"data.yaml").read_text()
    assert "nc: 3" in y
    assert "- spanner" in y and "- driver" in y and "- wrench" in y
    assert f"path: {str(dst)}" in y
    assert "train: train/images" in y
    assert "val: valid/images" in y
    assert "test: test/images" not in y  # No test split copied

    # a.txt: spanner만, idx 0
    a = (dst/"train/labels/a.txt").read_text().strip().splitlines()
    assert a == ["0 0.5 0.5 0.2 0.2"]
    # b.txt: 빈 파일(네거티브 유지)
    assert (dst/"train/labels/b.txt").read_text().strip() == ""
    assert (dst/"train/images/b.jpg").exists()
    # c.txt: driver→1, wrench→2
    c = sorted((dst/"valid/labels/c.txt").read_text().strip().splitlines())
    assert c == ["1 0.4 0.4 0.1 0.1", "2 0.6 0.6 0.1 0.1"]
    assert r["kept"]["spanner"] == 1 and r["kept"]["driver"] == 1 and r["kept"]["wrench"] == 1
    assert r["empty"] == 1

def test_filter_block_list_format(tmp_path):
    """Test block-list format data.yaml with train+valid+test splits."""
    src = tmp_path / "src"; dst = tmp_path / "dst"
    # 원본 5클래스 in block format
    _write(str(src/"data.yaml"),
        "names:\n"
        "- Hammer\n"
        "- Adjustable Spanner\n"
        "- ScrewDriver\n"
        "- Wrench\n"
        "- Plier\n"
        "nc: 5\n")
    # Train: spanner(1) only
    _write(str(src/"train/images/train1.png"), "x")
    _write(str(src/"train/labels/train1.txt"), "1 0.5 0.5 0.3 0.3\n")
    # Valid: wrench(3) + driver(2)
    _write(str(src/"valid/images/valid1.jpeg"), "x")
    _write(str(src/"valid/labels/valid1.txt"), "3 0.4 0.6 0.2 0.2\n2 0.7 0.5 0.2 0.2\n")
    # Test: driver(2) only
    _write(str(src/"test/images/test1.bmp"), "x")
    _write(str(src/"test/labels/test1.txt"), "2 0.5 0.5 0.3 0.3\n")

    r = filter_dataset(str(src), str(dst),
                       keep_names=['Adjustable Spanner','ScrewDriver','Wrench'],
                       new_names=['spanner','driver','wrench'])

    # Verify data.yaml is in Roboflow format with all three splits
    y = (dst/"data.yaml").read_text()
    assert "names:" in y
    assert "- spanner" in y and "- driver" in y and "- wrench" in y
    assert "nc: 3" in y
    assert f"path: {str(dst)}" in y
    assert "train: train/images" in y
    assert "val: valid/images" in y
    assert "test: test/images" in y  # Test split WAS copied

    # Verify label remapping
    train_labels = (dst/"train/labels/train1.txt").read_text().strip()
    assert train_labels == "0 0.5 0.5 0.3 0.3"  # Adjusted Spanner→0

    valid_labels = sorted((dst/"valid/labels/valid1.txt").read_text().strip().splitlines())
    assert valid_labels == ["1 0.7 0.5 0.2 0.2", "2 0.4 0.6 0.2 0.2"]  # Wrench→2, Driver→1

    test_labels = (dst/"test/labels/test1.txt").read_text().strip()
    assert test_labels == "1 0.5 0.5 0.3 0.3"  # ScrewDriver→1

    # Verify counts
    assert r["kept"]["spanner"] == 1
    assert r["kept"]["driver"] == 2
    assert r["kept"]["wrench"] == 1
    assert r["images"] == 3
    assert r["empty"] == 0

def test_drop_empty_excludes_background_images(tmp_path):
    """drop_empty=True 면 남은 라벨이 없는 배경 이미지를 제외한다."""
    src = tmp_path / "src"; dst = tmp_path / "dst"
    _write(str(src/"data.yaml"),
        "nc: 5\nnames: ['Hammer','Adjustable Spanner','ScrewDriver','Wrench','Plier']\n")
    # A: spanner(1) → 유지
    _write(str(src/"train/images/a.jpg"), "x")
    _write(str(src/"train/labels/a.txt"), "1 0.5 0.5 0.2 0.2\n")
    # B: plier(4)만 → 배경 → drop_empty 로 제외
    _write(str(src/"train/images/b.jpg"), "x")
    _write(str(src/"train/labels/b.txt"), "4 0.5 0.5 0.2 0.2\n")
    # C: hammer(0)만 → 배경 → 제외
    _write(str(src/"train/images/c.jpg"), "x")
    _write(str(src/"train/labels/c.txt"), "0 0.3 0.3 0.1 0.1\n")

    r = filter_dataset(str(src), str(dst),
                       keep_names=['Adjustable Spanner','ScrewDriver','Wrench'],
                       new_names=['spanner','driver','wrench'],
                       drop_empty=True)

    # A만 남고 B·C 는 이미지·라벨 모두 제외
    assert (dst/"train/images/a.jpg").exists()
    assert not (dst/"train/images/b.jpg").exists()
    assert not (dst/"train/labels/b.txt").exists()
    assert not (dst/"train/images/c.jpg").exists()
    # 카운트: 쓰인 이미지 1, 배경 2 감지
    assert r["images"] == 1
    assert r["empty"] == 2
    assert r["kept"]["spanner"] == 1
