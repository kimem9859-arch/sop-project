import os, textwrap
from filter_tool_classes import filter_dataset

def _write(p, s):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "w") as f:
        f.write(s)

def test_filter_keeps_and_remaps(tmp_path):
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

    # data.yaml 재작성
    y = (dst/"data.yaml").read_text()
    assert "nc: 3" in y
    assert "['spanner', 'driver', 'wrench']" in y or '["spanner", "driver", "wrench"]' in y
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
