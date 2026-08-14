"""`test/raw` 세션을 학습 네거티브 / 🔒 홀드아웃 / 제외로 가른다.

정본: ../../../docs/superpowers/specs/2026-08-14-네거티브보강-design.md §5

실행: ~/rfenv/bin/python sessions_split.py > sessions_split.json

🔴 **이 판정은 자동이 아니다.** 아래 두 단계를 거쳐 사람이 확정한 결과를 박아 둔 것이며,
   스크립트는 그 결과를 JSON 으로 내보내는 일만 한다.

선별 절차 (2026-08-14 실시)
    ① 세션당 3장을 붙인 대조표를 만들어 눈으로 훑음(`~/neg_screening/`)
    ② `tool_falsepos.py` 로 **53세션 전량**을 `every 20`·conf 0.65 로 자동 스캔하고,
       걸린 프레임을 **전부 눈으로 확인**
       → 980장 중 5장만 검출(0.5%). 그중
          · `tools-baseline` 3장 = **진짜 공구**(그 세션의 촬영 대상)
          · `cleanroom-yellow` 2장 = **흰 장갑 낀 손**을 `driver` 로 오검출(공구 아님)
       → **`tools-baseline` 외 52세션에는 공구가 없다**가 확정됐다.

🔴 왜 눈확인이 필요했나: 자동 스캔은 **후보를 좁히는 용도**다. 판정 대상인 모델로
   "공구 있음"을 정하면 오검출이 그대로 섞인다. 실제로 걸린 5건 중 2건이 오검출이었다.
"""

import json
import os
import sys

RAW = os.path.expanduser('~/sop-project/Rpi5/Demo/test/raw')

# ---------------------------------------------------------------- 제외
# 🔴 공구가 찍혔는데 "아무것도 없다"고 가르치면 검출을 죽인다 —
#    *"틀린 라벨은 없는 라벨보다 해롭다"*(색 자동라벨러를 버린 것과 같은 이유).
EXCLUDED = {
    '20260810_154055_esp32_tools-baseline_console_v2':
        '🔴 공구 세션(촬영 대상이 공구다) — 재현율 평가용으로만 쓴다',
    # USB 웹캠 촬영 2세션 — 배경은 같으나 카메라가 다르다. 시연·오검출이 일어나는
    # 조건은 ESP32 이므로, 화질·색감이 다른 소스를 하드 네거티브에 섞지 않는다.
    '20260710_173711_usb': 'USB 웹캠 — 시연 카메라(ESP32)와 화질·색감이 다르다',
    '20260710_173727_usb': 'USB 웹캠 — 시연 카메라(ESP32)와 화질·색감이 다르다',
}

# ---------------------------------------------------------------- 🔒 홀드아웃
# 🔴 세션 단위로 뗀다(프레임 단위 랜덤 분할은 누출이다).
# 🔴 **오검출 대상이 양쪽에 다 들어가게** 나눈다 — 키보드가 학습에만 있고 홀드아웃에
#    없으면 "고쳤다"를 확인할 수 없고, 반대면 학습이 그 대상을 못 본다.
#    그래서 각 조건마다 **시리즈에서 하나씩만** 뗀다.
HOLDOUT = [
    # 넓은 구도(상하 팬) — 배경이 가장 많이 담긴다. 같은 시리즈의 좌우 팬 2개는 학습에.
    '20260806_163608_esp32_formax-pan-ud-upright_console_v2',
    # 클린룸 형광등 — 같은 조건 5세션 중 하나
    '20260720_155119_esp32_cleanroom-fluorescent_console_v2',
    # 클린룸 옐로우등 — 같은 조건 5세션 중 하나. 🔑 장갑 오검출이 이 조건에서 났다
    '20260720_160524_esp32_cleanroom-yellow_console_v2',
    # 🔑 §10.42 의 오검출 상황(모니터·키보드가 크게 잡힘)에 가장 가깝다.
    #    같은 upright 시리즈 3개는 학습에 남는다.
    '20260724_183221_esp32_upright-falsealarm_console_v2',
    # 실험실 모조 콘솔 근접 — 08-10 시리즈 4개 중 하나
    '20260810_133144_esp32_b3-only_console_v2',
]


def split():
    """디스크의 실제 세션 목록을 읽어 셋으로 가른다."""
    if not os.path.isdir(RAW):
        sys.exit(f'raw 경로가 없습니다: {RAW}')
    all_sessions = sorted(os.listdir(RAW))

    unknown = [s for s in list(EXCLUDED) + HOLDOUT if s not in all_sessions]
    if unknown:
        sys.exit(f'🔴 목록에 있으나 디스크에 없는 세션: {unknown}')

    banned = set(EXCLUDED) | set(HOLDOUT)
    train = [s for s in all_sessions if s not in banned]
    return {'train': train, 'holdout': HOLDOUT, 'excluded': EXCLUDED}


if __name__ == '__main__':
    d = split()
    t, h, e = set(d['train']), set(d['holdout']), set(d['excluded'])
    assert not (t & h) and not (t & e) and not (h & e), '세션이 두 곳에 들어갔다'
    print(json.dumps(d, ensure_ascii=False, indent=2))
    print(f'학습 {len(t)} · 홀드아웃 {len(h)} · 제외 {len(e)}', file=sys.stderr)
