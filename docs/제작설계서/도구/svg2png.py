# -*- coding: utf-8 -*-
"""HTML(인라인 SVG) → 정확한 크기의 PNG. 표준 라이브러리 + 헤드리스 크로미움만 쓴다.

왜 크롭이 필요한가:
    이 파이의 크로미움은 --window-size=W,H 를 줘도 뷰포트가 약 95px 짧게 잡혀
    캔버스 하단(범례 등)이 잘린다. 여유를 두고 렌더한 뒤 정확히 잘라낸다.

사용: python3 svg2png.py <in.html> <W> <H> <out.png>
"""
import os, struct, subprocess, sys, zlib

PAD = 240  # 뷰포트 부족분 여유


def _decode(path):
    d = open(path, "rb").read()
    pos, idat = 8, b""
    w = h = ct = None
    while pos < len(d):
        ln = struct.unpack(">I", d[pos:pos + 4])[0]
        typ = d[pos + 4:pos + 8]
        if typ == b"IHDR":
            w, h, _bd, ct = struct.unpack(">IIBB", d[pos + 8:pos + 18])
        elif typ == b"IDAT":
            idat += d[pos + 8:pos + 8 + ln]
        pos += 12 + ln
    raw = zlib.decompress(idat)
    bpp = 3 if ct == 2 else 4
    stride = w * bpp + 1
    prev, rows = bytearray(w * bpp), []
    for y in range(h):
        f = raw[y * stride]
        line = bytearray(raw[y * stride + 1:(y + 1) * stride])
        for i in range(len(line)):
            a = line[i - bpp] if i >= bpp else 0
            b = prev[i]
            c = prev[i - bpp] if i >= bpp else 0
            if f == 1:
                line[i] = (line[i] + a) & 255
            elif f == 2:
                line[i] = (line[i] + b) & 255
            elif f == 3:
                line[i] = (line[i] + (a + b) // 2) & 255
            elif f == 4:
                p = a + b - c
                pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                pr = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
                line[i] = (line[i] + pr) & 255
        rows.append(bytes(line))
        prev = line
    return w, h, bpp, rows


def _chunk(typ, data):
    return (struct.pack(">I", len(data)) + typ + data
            + struct.pack(">I", zlib.crc32(typ + data) & 0xFFFFFFFF))


def _encode(path, w, h, bpp, rows):
    ct = 2 if bpp == 3 else 6
    body = b"".join(b"\x00" + r for r in rows)
    open(path, "wb").write(
        b"\x89PNG\r\n\x1a\n"
        + _chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, ct, 0, 0, 0))
        + _chunk(b"IDAT", zlib.compress(body, 9))
        + _chunk(b"IEND", b""))


def render(html, w, h, out):
    tmp = out + ".raw.png"
    subprocess.run(
        ["chromium", "--headless", "--disable-gpu", "--no-sandbox",
         "--hide-scrollbars", "--force-device-scale-factor=1",
         f"--window-size={w},{h + PAD}", f"--screenshot={tmp}",
         "file://" + os.path.abspath(html)],
        check=True, capture_output=True)
    rw, rh, bpp, rows = _decode(tmp)
    if rh < h or rw < w:
        raise SystemExit(f"렌더 부족: {rw}x{rh} < {w}x{h} — PAD 를 늘릴 것")
    _encode(out, w, h, bpp, [r[:w * bpp] for r in rows[:h]])
    os.remove(tmp)
    return out


if __name__ == "__main__":
    html, w, h, out = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4]
    print("wrote", render(html, w, h, out))
