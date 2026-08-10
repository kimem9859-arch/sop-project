"""ARCAD 등 다클래스 YOLOv8 export를 지정 클래스만 남기고 인덱스 리맵.
없어진 라벨의 이미지는 기본적으로 네거티브(빈 라벨)로 유지한다.
drop_empty=True 면 남은 라벨이 하나도 없는 이미지(배경만)를 아예 제외한다."""
import os, re, shutil, glob

def _load_names(data_yaml):
    txt = open(data_yaml).read()
    m = re.search(r"names\s*:\s*(\[.*\])", txt, re.S)
    if m:
        items = re.findall(r"['\"]([^'\"]+)['\"]", m.group(1))
        return items
    # names 블록(list) 형식 대응
    names, cap = [], False
    for line in txt.splitlines():
        if line.strip().startswith("names:"):
            cap = True; continue
        if cap:
            mm = re.match(r"\s*-\s*(.+)\s*$", line)
            if mm: names.append(mm.group(1).strip().strip("'\""))
            else: break
    return names

def filter_dataset(src_dir, dst_dir, keep_names, new_names, drop_empty=False):
    if len(keep_names) != len(new_names):
        raise ValueError(f"keep_names and new_names must have same length: {len(keep_names)} vs {len(new_names)}")
    src_names = _load_names(os.path.join(src_dir, "data.yaml"))
    # 원본 인덱스 → 새 인덱스
    remap = {}
    for new_i, kn in enumerate(keep_names):
        if kn not in src_names:
            raise ValueError(f"keep class '{kn}' not in source names {src_names}")
        remap[src_names.index(kn)] = new_i
    kept = {n: 0 for n in new_names}
    n_img, n_empty = 0, 0
    has_test = False
    # Valid image extensions (case-insensitive)
    valid_exts = {'.jpg', '.jpeg', '.png', '.bmp', '.webp'}
    for split in ("train", "valid", "test"):
        img_dir = os.path.join(src_dir, split, "images")
        if not os.path.isdir(img_dir):
            continue
        for img in sorted(glob.glob(os.path.join(img_dir, "*"))):
            # Only process files with valid image extensions
            if os.path.splitext(img)[1].lower() not in valid_exts:
                continue
            base = os.path.splitext(os.path.basename(img))[0]
            src_lbl = os.path.join(src_dir, split, "labels", base + ".txt")
            out_lines = []
            if os.path.exists(src_lbl):
                for line in open(src_lbl):
                    parts = line.split()
                    if not parts:
                        continue
                    ci = int(parts[0])
                    if ci in remap:
                        ni = remap[ci]
                        out_lines.append(" ".join([str(ni)] + parts[1:]))
                        kept[new_names[ni]] += 1
            # 남은 라벨이 없으면 배경 이미지. drop_empty 면 제외, 아니면 네거티브로 유지.
            if not out_lines:
                n_empty += 1
                if drop_empty:
                    continue
            # 이미지·라벨 복제(라벨 없으면 빈 파일 = 네거티브)
            d_img = os.path.join(dst_dir, split, "images"); os.makedirs(d_img, exist_ok=True)
            d_lbl = os.path.join(dst_dir, split, "labels"); os.makedirs(d_lbl, exist_ok=True)
            shutil.copy(img, os.path.join(d_img, os.path.basename(img)))
            with open(os.path.join(d_lbl, base + ".txt"), "w") as f:
                f.write("\n".join(out_lines) + ("\n" if out_lines else ""))
            n_img += 1
            if split == "test":
                has_test = True
    # data.yaml 재작성 (Roboflow format: names before nc, correct path references)
    dst_abs = os.path.abspath(dst_dir)
    with open(os.path.join(dst_dir, "data.yaml"), "w") as f:
        f.write("names:\n")
        for n in new_names:
            f.write(f"- {n}\n")
        f.write(f"nc: {len(new_names)}\n")
        f.write(f"path: {dst_abs}\n")
        f.write("train: train/images\n")
        f.write("val: valid/images\n")
        if has_test:
            f.write("test: test/images\n")
    return {"kept": kept, "images": n_img, "empty": n_empty}
