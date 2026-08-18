"""공구 모델의 오검출·검출 프레임률 측정 — 네거티브 보강의 **두 축을 재는 단일 도구**.

정본: ../../../docs/superpowers/specs/2026-08-14-네거티브보강-design.md §4

🔑 **한 도구가 두 축을 다 잰다. 지표 정의가 하나뿐이다.**
    · 공구가 **없는** 세션(콘솔 촬영)에 돌리면 → 그 비율이 곧 **오검출률**
    · 공구가 **있는** 세션(tools-baseline)에 돌리면 → **검출 프레임률**
    정의를 둘로 나누면 인용할 때 섞인다(§10.23 에서 도구 기본값이 config 를
    안 따라 네 번 물린 것과 같은 계열의 사고).

⚠️ **`replay_raw.py` 를 쓰지 않는다** — 그건 `.hef`(버튼 5클래스 모델) 전용이다.
   공구 모델은 `rfenv` + `ultralytics` 경로이므로 `tool_live.py`·`tool_worker.py`
   와 같은 스택으로 만든다.

⚠️ **실행 환경** — 파이 기본 Python 3.13 에는 ultralytics 가 없다. `~/env/rfenv` 로 돌린다:
       ~/env/rfenv/bin/python tool_falsepos.py --model <pt> --conf 0.65 <세션경로...>

🔴 **임계는 인자로 받는다.** 하드코딩하면 config 가 바뀌어도 도구가 안 따라간다.

사용 예:
    ~/env/rfenv/bin/python tool_falsepos.py \
        --model ~/sop-project/Rpi5/Demo/models/tool_v3.pt --conf 0.65 \
        --every 20 --out ~/baseline.csv \
        ~/sop-project/Rpi5/Demo/test/raw/2026*_esp32_*
"""

import argparse
import collections
import csv
import glob
import os
import sys


# ---------------------------------------------------------------- 집계 (순수)
def frame_rate(results, conf):
    """공구가 **하나라도** 잡힌 프레임의 비율.

    results = [[(클래스명, 점수), ...], ...]  — 프레임마다 검출 목록
    반환 = (걸린 프레임 수, 전체 프레임 수, 비율)

    🔑 **박스 수가 아니라 프레임 수**를 센다. 한 프레임에 셋이 잡혀도 1이다 —
       "이 프레임에서 공구를 봤는가"가 판정 단위이기 때문이다.
    """
    total = len(results)
    if total == 0:
        return 0, 0, 0.0
    hit = sum(1 for dets in results if any(s >= conf for _n, s in dets))
    return hit, total, hit / total


def per_class(results, conf):
    """클래스별 **박스 수**. 어떤 클래스로 잘못 보는지 알려준다.

    프레임률과 달리 여기서는 박스를 전부 센다 — 오검출의 성격을 보는 용도다.
    """
    c = collections.Counter()
    for dets in results:
        for name, score in dets:
            if score >= conf:
                c[name] += 1
    return dict(c)


# ---------------------------------------------------------------- 추론
def run_session(model, session_dir, every, imgsz=640):
    """한 세션을 훑어 프레임별 검출 목록을 낸다.

    every = 몇 장에 하나를 볼 것인가(1이면 전부). 🔴 세션 간 비교를 하려면
            **모든 세션에 같은 값**을 써야 한다.

    ⚠️ 추론 임계는 여기서 걸지 않는다 — 낮게 뽑아 두고 집계에서 자른다.
       그래야 같은 추론 결과로 여러 임계를 볼 수 있다.
       🔴 다만 0.01 처럼 극단으로 낮추지 않는다 — 가중 NMS 가 저점수 앵커를
          섞어 점수를 끌어내려 반대 결론이 난 전례가 있다(통합문서 §5 함정).
    """
    imgs = sorted(glob.glob(os.path.join(session_dir, '*.png')))
    imgs += sorted(glob.glob(os.path.join(session_dir, '*.jpg')))
    imgs = sorted(imgs)[::max(1, every)]
    out = []
    for p in imgs:
        res = model.predict(p, conf=0.25, imgsz=imgsz, verbose=False)[0]
        out.append([(res.names[int(b.cls[0])], float(b.conf[0])) for b in res.boxes])
    return out, len(imgs)


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('sessions', nargs='+', help='세션 디렉터리들')
    ap.add_argument('--model', required=True, help='.pt 경로')
    ap.add_argument('--conf', type=float, default=0.65,
                    help='판정 임계 (기본 0.65 = 운용 임계)')
    ap.add_argument('--every', type=int, default=20,
                    help='몇 장에 하나를 볼 것인가 (기본 20). '
                         '🔴 세션 간 비교 시 같은 값을 쓸 것')
    ap.add_argument('--out', default=None, help='세션별 결과 CSV 경로')
    ap.add_argument('--hits', default=None,
                    help='검출된 프레임 경로를 이 파일에 적는다(눈확인용)')
    a = ap.parse_args(argv)

    from ultralytics import YOLO
    model = YOLO(os.path.expanduser(a.model))

    rows = []
    all_results = []
    hit_paths = []
    for d in a.sessions:
        d = os.path.expanduser(d.rstrip('/'))
        if not os.path.isdir(d):
            print(f'⚠️ 건너뜀(디렉터리 아님): {d}', file=sys.stderr)
            continue
        results, n = run_session(model, d, a.every)
        hit, tot, ratio = frame_rate(results, a.conf)
        cls = per_class(results, a.conf)
        rows.append({
            'session': os.path.basename(d), 'frames': tot, 'hit': hit,
            'ratio': round(ratio, 4),
            'classes': ' '.join(f'{k}:{v}' for k, v in sorted(cls.items())),
        })
        all_results.extend(results)

        if a.hits:
            imgs = sorted(glob.glob(os.path.join(d, '*.png')))[::max(1, a.every)]
            for p, dets in zip(imgs, results):
                top = [(n_, s) for n_, s in dets if s >= a.conf]
                if top:
                    hit_paths.append((p, ' '.join(f'{n_}:{s:.2f}' for n_, s in top)))

        print(f'{os.path.basename(d):<58} {hit:>4}/{tot:<4} '
              f'{ratio*100:>5.1f}%  {rows[-1]["classes"]}')

    hit, tot, ratio = frame_rate(all_results, a.conf)
    print('-' * 92)
    print(f'{"합계":<58} {hit:>4}/{tot:<4} {ratio*100:>5.1f}%  '
          f'{per_class(all_results, a.conf)}')
    print(f'조건: model={os.path.basename(a.model)} conf={a.conf} every={a.every}')

    if a.out:
        with open(os.path.expanduser(a.out), 'w', newline='') as f:
            w = csv.DictWriter(f, fieldnames=['session', 'frames', 'hit', 'ratio', 'classes'])
            w.writeheader()
            w.writerows(rows)
        print(f'CSV: {a.out}')

    if a.hits:
        with open(os.path.expanduser(a.hits), 'w') as f:
            for p, why in hit_paths:
                f.write(f'{p}\t{why}\n')
        print(f'검출 프레임 {len(hit_paths)}건 → {a.hits}')

    return 0


if __name__ == '__main__':
    sys.exit(main())
