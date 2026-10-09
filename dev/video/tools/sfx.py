"""효과음 합성 — 표준 라이브러리만(시드 고정 · 몇 번을 돌려도 같은 파일) · 저작권 걱정 없는 직접 합성.

쓰임: python3 -I tools/sfx.py public/audio
시안 14(2026-10-10 · 사용자 「효과음 … 추천하는 효과음」) — 편집표(edits/feature.ts)의 sfx 가 이름으로 부른다.
띠링 · 닫힘음은 실제 시스템에선 안경 펌웨어가 낸다(소리 파일 없음) → 비슷한 두 음으로 만든다.
"""
import math
import random
import struct
import sys
import wave

R = 48000


def env(n, a=0.005, r=0.05):
    """앞 a 초 올라가고 끝 r 초 내려가는 덮개."""
    A, Rl = max(1, int(a * R)), max(1, int(r * R))
    return [min(1.0, i / A, (n - i) / Rl) for i in range(n)]


def tone(freq, sec, vol=0.5, decay=0.0, a=0.005, r=0.05, harm=(1.0,)):
    """고정 음(freq 숫자) 또는 바뀌는 음(freq(t) 함수) — 위상을 누적한다(함수일 때 f(t)·t 로 쓰면 기울기가 두 배가 된다 · 리뷰)."""
    n = int(sec * R)
    e = env(n, a, r)
    ph, out = 0.0, []
    for i in range(n):
        t = i / R
        ph += 2 * math.pi * (freq(t) if callable(freq) else freq) / R
        s = sum(h * math.sin(ph * k) for k, h in enumerate(harm, 1))
        out.append(vol * e[i] * s * (math.exp(-decay * t) if decay else 1.0))
    return out


def sweep(f0, f1, sec, vol=0.4, a=0.02, r=0.15, harm=(1.0,)):
    """f0 → f1 으로 올라가는(내려가는) 음 — 위상을 누적해 끊김 없이."""
    n = int(sec * R)
    e = env(n, a, r)
    ph, out = 0.0, []
    for i in range(n):
        u = i / n
        f = f0 * (f1 / f0) ** u
        ph += 2 * math.pi * f / R
        out.append(vol * e[i] * sum(h * math.sin(ph * k) for k, h in enumerate(harm, 1)))
    return out


def noise(sec, vol=0.4, lp0=0.02, lp1=0.4, a=0.05, r=0.2, seed=7):
    """거른 잡음 — 저역 통과 계수가 lp0 → lp1 → lp0 로(쉭) · 소리마다 시드(다른 소리를 더하거나 바꿔도 이 소리는 그대로 · 리뷰)."""
    rng = random.Random(seed)
    n = int(sec * R)
    e = env(n, a, r)
    y, out = 0.0, []
    for i in range(n):
        u = i / n
        k = lp0 + (lp1 - lp0) * math.sin(math.pi * u)
        y += k * (rng.uniform(-1, 1) - y)
        out.append(vol * e[i] * y * 2.2)
    return out


def mix(*parts):
    """(시작 초, 소리) 들을 겹친다."""
    n = max(int(at * R) + len(p) for at, p in parts)
    out = [0.0] * n
    for at, p in parts:
        o = int(at * R)
        for i, v in enumerate(p):
            out[o + i] += v
    return out


def square(freq, sec, vol=0.3, a=0.004, r=0.03):
    n = int(sec * R)
    e = env(n, a, r)
    return [vol * e[i] * (1 if math.sin(2 * math.pi * freq * i / R) >= 0 else -1) * 0.6 for i in range(n)]


def save(path, s):
    peak = max(1e-9, max(abs(v) for v in s))
    g = 0.89 / peak                            # 모든 파일 최고점 -1 dBFS — 크기는 편집표 음량으로만 정한다(리뷰 — 파일마다 0.30~0.89 로 들쭉날쭉)
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(R)
        w.writeframes(b"".join(struct.pack("<h", int(max(-1, min(1, v * g)) * 32767)) for v in s))


BELL = (1.0, 0.45, 0.2, 0.08)
SOUNDS = {
    # 켜짐 — 가상 세계가 펼쳐질 때 올라가는 전원음 + 쉭
    "boot": mix((0, sweep(110, 880, 1.3, 0.45, 0.05, 0.4, (1.0, 0.3, 0.15))), (0, noise(1.3, 0.25, 0.01, 0.25, 0.3, 0.5, seed=1))),
    "tick": tone(2600, 0.03, 0.35, a=0.001, r=0.02),                                       # 점검 줄 「정상」 · 버튼 누름
    "whoosh": noise(0.55, 0.55, 0.01, 0.35, 0.08, 0.25, seed=2),                                   # 장 전환
    "pop": mix((0, tone(lambda t: 660 + 900 * t / 0.08, 0.08, 0.35, a=0.002, r=0.05))),   # 절 카드 · 카드 들어감
    "scan": sweep(320, 1400, 1.5, 0.22, 0.1, 0.3, (1.0, 0.25)),                            # 스캔 · 판정 타이머가 차는 동안
    "blip": mix((0, tone(1760, 0.05, 0.4, a=0.002, r=0.02)), (0.08, tone(2349, 0.06, 0.4, a=0.002, r=0.03))),  # 찾음 「삐빅」
    "ding": tone(1318.5, 0.9, 0.5, decay=4.5, a=0.002, r=0.3, harm=BELL),                 # 확인 완료 · 단계 완료
    "wrong": mix((0, square(196, 0.16, 0.5)), (0.2, square(185, 0.22, 0.5))),             # 다른 공구 「삑-」
    "warn": mix((0, tone(988, 0.16, 0.5, a=0.004, r=0.03, harm=(1, 0.3))), (0.2, tone(784, 0.2, 0.5, a=0.004, r=0.05, harm=(1, 0.3)))),
    # 차단 — 쿵 + 경보 네 번
    "alarm": mix((0, sweep(120, 45, 0.25, 0.9, 0.003, 0.15)),
                 *[(0.05 + 0.15 * k, square(660 if k % 2 == 0 else 494, 0.13, 0.45)) for k in range(4)]),
    "lock": mix((0, noise(0.02, 0.8, 0.6, 0.9, 0.001, 0.01, seed=3)), (0.012, tone(1200, 0.04, 0.4, a=0.001, r=0.03))),  # 찰칵
    "chime": mix((0, tone(1318.5, 0.25, 0.45, decay=6, a=0.003, r=0.1, harm=BELL)),       # 띠링(호출)
                 (0.16, tone(1760, 0.3, 0.45, decay=6, a=0.003, r=0.12, harm=BELL))),
    "card": sweep(600, 2400, 0.35, 0.25, 0.02, 0.15, (1.0, 0.5, 0.25)),                    # 사실 카드 나타남
}

if __name__ == "__main__":
    import os
    out = sys.argv[1]
    os.makedirs(out, exist_ok=True)
    for name, s in SOUNDS.items():
        save(f"{out}/sfx_{name}.wav", s)
        print(f"sfx_{name}.wav {len(s) / R:.2f}s")
