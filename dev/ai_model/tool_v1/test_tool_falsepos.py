"""오검출·검출 프레임률 측정 도구 검증.

실행: ~/rfenv/bin/python test_tool_falsepos.py

정본: ../../../docs/superpowers/specs/2026-08-14-네거티브보강-design.md §4

⚠️ **모델을 올리지 않는다** — 순수 집계 함수만 검증한다. 여기서 모델을 로드하면
   테스트가 수십 초로 늘어나 아무도 안 돌린다. 추론 자체는 tool_worker.py 단독
   검증에서 이미 확인됐다.
"""

import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from tool_falsepos import frame_rate, per_class

_fails = []


def check(cond, msg):
    print(("  ✅ " if cond else "  ❌ ") + msg)
    if not cond:
        _fails.append(msg)


# 한 프레임의 검출 = [(클래스명, 점수), ...]. 세션 = 프레임의 리스트.
def test_임계미만은_안센다():
    print("[1] 임계 미만은 세지 않는다")
    res = [[('wrench', 0.60)], [('driver', 0.70)], []]
    hit, tot, ratio = frame_rate(res, conf=0.65)
    check((hit, tot) == (1, 3), f"0.60 은 빠지고 0.70 만 센다 (실제 {hit}/{tot})")
    check(abs(ratio - 1 / 3) < 1e-9, "비율 = 1/3")


def test_경계값은_포함():
    print("[2] 임계와 같으면 포함한다")
    hit, _, _ = frame_rate([[('wrench', 0.65)]], conf=0.65)
    check(hit == 1, "conf >= 임계 (초과가 아니라 이상)")


def test_한프레임에_여러개여도_한번():
    print("[3] 프레임 단위로 센다")
    res = [[('wrench', 0.8), ('driver', 0.9)]]
    hit, tot, _ = frame_rate(res, conf=0.65)
    check((hit, tot) == (1, 1), "박스 수가 아니라 프레임 수다")


def test_빈세션은_0으로_나누지_않는다():
    print("[4] 빈 입력에 예외가 없다")
    hit, tot, ratio = frame_rate([], conf=0.65)
    check((hit, tot, ratio) == (0, 0, 0.0), "0/0 에서 죽지 않는다")


def test_전부_미검출():
    print("[5] 아무것도 안 잡히면 0")
    hit, tot, ratio = frame_rate([[], [], []], conf=0.65)
    check((hit, tot, ratio) == (0, 3, 0.0), "🔑 네거티브 세션의 이상적 결과")


def test_클래스별_박스수():
    print("[6] 클래스별 박스 수")
    res = [[('wrench', 0.8), ('wrench', 0.7), ('driver', 0.6)]]
    d = per_class(res, conf=0.65)
    check(d == {'wrench': 2}, f"임계 미만 driver 는 빠진다 (실제 {d})")


def test_클래스별_여러프레임_합산():
    print("[7] 클래스별은 프레임을 넘어 합산한다")
    res = [[('wrench', 0.8)], [('wrench', 0.9), ('pliers', 0.7)]]
    d = per_class(res, conf=0.65)
    check(d == {'wrench': 2, 'pliers': 1}, f"실제 {d}")


def test_임계를_바꾸면_결과가_바뀐다():
    """🔴 도구가 임계를 인자로 받는지 — 하드코딩되어 있으면 여기서 걸린다."""
    print("[8] 임계가 실제로 인자로 동작한다")
    res = [[('wrench', 0.50)]]
    check(frame_rate(res, conf=0.65)[0] == 0, "0.65 에서는 안 잡힘")
    check(frame_rate(res, conf=0.40)[0] == 1, "0.40 에서는 잡힘")


if __name__ == "__main__":
    t0 = time.time()
    test_임계미만은_안센다()
    test_경계값은_포함()
    test_한프레임에_여러개여도_한번()
    test_빈세션은_0으로_나누지_않는다()
    test_전부_미검출()
    test_클래스별_박스수()
    test_클래스별_여러프레임_합산()
    test_임계를_바꾸면_결과가_바뀐다()

    elapsed = time.time() - t0
    print()
    if _fails:
        print(f"❌ 실패 {len(_fails)}건")
        for m in _fails:
            print(f"   - {m}")
        sys.exit(1)
    if elapsed > 1.0:
        print(f"❌ 느림 {elapsed:.1f}s — 모델을 올리고 있는 것 아닌가")
        sys.exit(1)
    print(f"✅ 측정 도구 검증 통과 ({elapsed:.3f}s)")
