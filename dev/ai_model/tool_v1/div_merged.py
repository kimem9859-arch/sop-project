"""3종으로 **병합한 뒤** 다양성을 본다 — 세분화된 데이터셋용 (dataset_diversity.py 보조).

왜 별도인가:
    `tools-vsisj` 는 164 클래스로 과세분화돼 있어(`wrench Double ended 18 19` 등
    1장짜리 다수) 클래스별로 재면 전부 🔴 가 뜬다. 우리는 어차피 3종으로 병합하므로
    **병합한 뒤의 다양성**을 봐야 실제 학습 조건을 대표한다.

사용: python3 div_merged.py <데이터셋_루트>
"""
import sys, os, re, glob, collections
sys.path.insert(0,'/home/pi/sop-project/dev/ai_model/tool_v1')
from dataset_diversity import load_names, group_key, source_key
CONCEPT=[('driver', r'screw\s*driver|screwdriver|phillips|pozidriv|flat\s*head|precision screwdriver|interchangeable'),
         ('wrench', r'wrench|spanner'),
         ('pliers', r'plier|nose pliers|vise\s*grip|channel|crimp')]
root=os.path.expanduser(sys.argv[1])
names=load_names(os.path.join(root,'data.yaml'))
idx2c={}
for i,n in enumerate(names):
    low=n.lower()
    if re.search(r'allen|alen|hex', low): continue        # 육각렌치는 제외(별개 공구)
    for c,p in CONCEPT:
        if re.search(p, low): idx2c[i]=c; break
rows=[]
for split in ('train','valid','test'):
    for lp in glob.glob(os.path.join(root,split,'labels','*.txt')):
        cs={idx2c[int(x.split()[0])] for x in open(lp) if x.split() and int(x.split()[0]) in idx2c}
        if cs: rows.append((split, group_key(os.path.basename(lp)), cs))
srcs=collections.defaultdict(set); src_n=collections.Counter()
gsplit=collections.defaultdict(set)
for s,k,cs in rows:
    sk=source_key(k); srcs[sk]|=cs; src_n[sk]+=1; gsplit[k].add(s)
print(f'  원본클래스 {len(names)}개 → 3종으로 병합 (매핑된 클래스 {len(idx2c)}개)')
print(f'  이미지 {len(rows)} · 그룹 {len({k for _,k,_ in rows})} · **출처 {len(srcs)}**')
print(f'  train/valid 누출 그룹: {len([k for k,v in gsplit.items() if len(v)>1])}건\n')
print(f"  {'개념':<10}{'이미지':>8}{'출처':>7}{'최대점유':>10}")
for c in ('driver','wrench','pliers'):
    imgs=sum(1 for _,_,cs in rows if c in cs)
    ss={s for s,v in srcs.items() if c in v}
    top=max((sum(1 for _,k,cs in rows if c in cs and source_key(k)==s) for s in ss), default=0)
    sh=top/imgs*100 if imgs else 0
    mark='🔴' if len(ss)<10 else ('⚠️' if sh>=50 else '✅')
    print(f'  {c:<10}{imgs:>8}{len(ss):>7}{sh:>9.0f}% {mark}')
print(f"\n  상위출처: " + ' · '.join(f'{s}({n})' for s,n in src_n.most_common(5)))
