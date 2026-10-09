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


BELL = (1.0, 0.25, 0.08)   # 시안 15 「차분하게 … 낮고 연하게」 — 배음을 줄여 둥글게
# 시안 15 — 화면이 강렬해 효과음은 낮고 연하게(사용자): 높은 음은 한 옥타브쯤 내림 · 사각파(버저)는 사인파로 · 시작을 느리게(딱 소리 없앰) · 쉭은 어둡게
SOUNDS = {
    # 켜짐 — 낮게 올라가는 전원음 + 옅은 바람
    "boot": mix((0, sweep(110, 440, 1.3, 0.45, 0.25, 0.5, (1.0, 0.15))), (0, noise(1.3, 0.12, 0.01, 0.1, 0.4, 0.5, seed=1))),
    "tick": tone(1200, 0.05, 0.35, a=0.004, r=0.035),                                      # 점검 줄 「정상」 · 버튼 누름
    "whoosh": noise(0.6, 0.5, 0.01, 0.12, 0.15, 0.3, seed=2),                              # 장 전환(어두운 쉭)
    "pop": tone(lambda t: 440 + 2200 * t, 0.1, 0.35, a=0.01, r=0.06),                     # 절 카드 · 카드 들어감(440 → 660)
    "scan": sweep(220, 660, 1.5, 0.22, 0.2, 0.4, (1.0, 0.08)),                             # 스캔 · 판정 타이머가 차는 동안
    "blip": mix((0, tone(880, 0.07, 0.4, a=0.008, r=0.04)), (0.1, tone(1175, 0.08, 0.4, a=0.008, r=0.05))),   # 찾음 「삐빅」(낮게)
    "ding": tone(880, 1.0, 0.5, decay=3.5, a=0.006, r=0.35, harm=BELL),                   # 확인 완료 · 단계 완료
    "wrong": mix((0, tone(196, 0.2, 0.5, a=0.02, r=0.08, harm=(1, 0.2))), (0.24, tone(165, 0.26, 0.5, a=0.02, r=0.1, harm=(1, 0.2)))),  # 다른 공구 「붕-붕」
    "warn": mix((0, tone(659, 0.18, 0.5, a=0.015, r=0.06)), (0.22, tone(523, 0.24, 0.5, a=0.015, r=0.08))),    # 경고 「띠-도」
    # 차단 — 부드러운 쿵 + 낮은 두 음 두 번
    "alarm": mix((0, sweep(100, 50, 0.3, 0.6, 0.01, 0.2)),
                 *[(0.08 + 0.2 * k, tone(392 if k % 2 == 0 else 330, 0.17, 0.4, a=0.02, r=0.06, harm=(1, 0.15))) for k in range(4)]),
    "lock": mix((0, noise(0.03, 0.5, 0.2, 0.4, 0.003, 0.02, seed=3)), (0.012, tone(600, 0.05, 0.35, a=0.004, r=0.04))),  # 찰칵(작게)
    "chime": mix((0, tone(659, 0.3, 0.45, decay=4.5, a=0.008, r=0.12, harm=BELL)),       # 띠링(호출 · 한 옥타브 낮게)
                 (0.17, tone(880, 0.35, 0.45, decay=4.5, a=0.008, r=0.15, harm=BELL))),
    "card": sweep(400, 1200, 0.4, 0.25, 0.05, 0.2, (1.0, 0.2)),                            # 사실 카드 나타남
}

if __name__ == "__main__":
    import os
    out = sys.argv[1]
    os.makedirs(out, exist_ok=True)
    for name, s in SOUNDS.items():
        save(f"{out}/sfx_{name}.wav", s)
        print(f"sfx_{name}.wav {len(s) / R:.2f}s")
