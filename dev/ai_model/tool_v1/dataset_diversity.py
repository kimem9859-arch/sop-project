"""데이터셋 다양성 진단 — 학습 전에 「장수」가 아니라 「출처 수」를 본다.

왜 있나 (2026-08-12):
    ARCAD(6,028장)로 학습한 tool_v1 이 우리 도메인에서 무너졌다(§10.37·§10.38).
    원인을 파보니 우리 3클래스가 **영상 7편**에서 나온 것이었다 — `wrench` 는
    사실상 영상 2편이 전부였다. 모델은 「공구」가 아니라 「그 장면」을 외웠다.

    🔑 **장수는 다양성을 대표하지 않는다.** 영상 1편에서 439프레임을 뽑으면
       439장이지만 실질은 한 장면이다. 그래서 학습에 착수하기 전에
       **이 진단을 관문으로 통과**시킨다.

무엇을 보나:
    ① 원본 그룹 수 — Roboflow 증강본(`<원본>.rf.<해시>`)을 하나로 묶은 것
    ② 출처 수 — 영상 프레임(`v_16_00004`)을 영상(`v_16`) 단위로 묶은 것
    ③ 클래스별 출처 분포 — 한 출처가 몇 %를 차지하는가(쏠림)
    ④ train/valid 누출 — 같은 그룹이 양쪽에 있는가

판정 기준(경험칙):
    🔴 클래스별 출처가 한 자릿수  → 위험. ARCAD 가 이랬다
    ⚠️ 한 출처가 그 클래스의 50% 이상 → 쏠림. 상한을 걸어야 한다
    ✅ 출처 수십~수백 개로 흩어짐   → 진행 가능

사용법:
    python3 dataset_diversity.py <데이터셋_루트> [클래스명 ...]
    예) python3 dataset_diversity.py ~/ds_hmqnl screwdriver wrench pliers
"""
import collections
import glob
import os
import re
import sys


def load_names(data_yaml):
    """data.yaml 의 names 를 순서대로 읽는다(인라인 리스트·블록 리스트 둘 다)."""
    txt = open(data_yaml).read()
    m = re.search(r"names:\s*(\[.*?\])", txt, re.S)
    if m:
        return re.findall(r"['\"]?([^'\",\[\]]+?)['\"]?\s*(?:,|\])", m.group(1))
    out, cap = [], False
    for line in txt.splitlines():
        if line.strip().startswith("names:"):
            cap = True
            continue
        if cap:
            mm = re.match(r"\s*-\s*(.+?)\s*$", line)
            if mm:
                out.append(mm.group(1).strip().strip("'\""))
            else:
                break
    return out


def group_key(filename):
    """증강본을 하나로 묶는 키. Roboflow 는 `<원본>.rf.<해시>.<확장자>` 로 내보낸다."""
    return filename.split('.rf.')[0] if '.rf.' in filename else os.path.splitext(filename)[0]


def source_key(gkey):
    """출처 키 — 영상에서 뽑은 연속 프레임을 **영상 단위로** 묶는다.

    🔴 이 단계가 핵심이다. `v_16_00004` 와 `v_16_00005` 는 이웃 프레임이라
       거의 같은 그림인데, 그룹 키로만 묶으면 서로 다른 것으로 세어져
       다양성이 실제보다 훨씬 크게 보인다.
    """
    b = re.sub(r'_(jpg|jpeg|png|JPG|PNG)$', '', gkey)
    m = re.match(r'^(v_\d+)_\d+$', b)          # v_16_00004 → v_16
    if m:
        return m.group(1)
    m = re.match(r'^(.*?)[-_]?\d{1,6}$', b)    # 뒤에 붙은 일련번호 제거
    if m and len(m.group(1)) >= 3:
        return m.group(1)
    return b


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    root = os.path.expanduser(sys.argv[1])
    want = [s.lower() for s in sys.argv[2:]]

    names = load_names(os.path.join(root, 'data.yaml'))
    keep = {i: n for i, n in enumerate(names)
            if not want or any(w in n.lower() for w in want)}
    print(f'데이터셋: {root}')
    print(f'대상 클래스: {list(keep.values()) or "(전체)"}\n')

    rows = []          # (split, gkey, {classes})
    for split in ('train', 'valid', 'test'):
        for lp in glob.glob(os.path.join(root, split, 'labels', '*.txt')):
            cls = {keep[int(p.split()[0])] for p in open(lp)
                   if p.split() and int(p.split()[0]) in keep}
            if cls:
                rows.append((split, group_key(os.path.basename(lp)), cls))
    if not rows:
        sys.exit('대상 클래스를 가진 라벨이 없습니다.')

    groups = collections.defaultdict(set)
    gsplit = collections.defaultdict(set)
    for s, k, cl in rows:
        groups[k] |= cl
        gsplit[k].add(s)
    srcs = collections.defaultdict(set)        # source -> classes
    src_n = collections.Counter()              # source -> 이미지 수
    for s, k, cl in rows:
        sk = source_key(k)
        srcs[sk] |= cl
        src_n[sk] += 1

    print(f'■ 이미지 {len(rows)} · 원본그룹 {len(groups)} · **출처 {len(srcs)}**')
    leak = [k for k, v in gsplit.items() if len(v) > 1]
    print(f'■ train/valid 양쪽에 걸친 그룹(누출): {len(leak)}건')
    print()

    print('■ 클래스별 다양성')
    print(f"   {'클래스':<16}{'이미지':>8}{'출처':>7}{'최대출처 점유':>13}")
    verdict = []
    for c in sorted({c for cl in groups.values() for c in cl}):
        imgs = sum(1 for _, _, cl in rows if c in cl)
        ss = {s for s, v in srcs.items() if c in v}
        top = max((sum(1 for _, k, cl in rows
                       if c in cl and source_key(k) == s) for s in ss), default=0)
        share = top / imgs * 100 if imgs else 0
        mark = '🔴' if len(ss) < 10 else ('⚠️' if share >= 50 else '✅')
        verdict.append(mark)
        print(f'   {c:<16}{imgs:>8}{len(ss):>7}{share:>11.0f}% {mark}')
    print()
    print('■ 상위 출처 10 (이미지 수)')
    for s, n in src_n.most_common(10):
        print(f'   {s[:34]:<34}{n:>6}  ({n/len(rows)*100:.1f}%)')
    print()
    if '🔴' in verdict:
        print('🔴 판정: 출처가 한 자릿수인 클래스가 있다 — ARCAD 와 같은 위험. 학습 전 재검토.')
    elif '⚠️' in verdict:
        print('⚠️ 판정: 특정 출처 쏠림이 있다 — 출처당 상한을 걸고 진행할 것.')
    else:
        print('✅ 판정: 출처가 충분히 흩어져 있다 — 진행 가능.')


if __name__ == '__main__':
    main()
