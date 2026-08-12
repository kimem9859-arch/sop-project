"""Colab T4 에서 tool_v3 학습 — 6-tool + mech83 병합 데이터.

실행 (파이 터미널에서, 브라우저 불필요):
    colab run --gpu T4 --keep --timeout 21600 -s v3 train_tool_v3.py
    colab download -s v3 /content/runs/tool_v3/weights/best.pt \\
        Rpi5/Demo/models/tool_v3.pt
    colab stop -s v3

⚠️ --keep 없으면 스크립트 종료 즉시 VM 이 반납돼 best.pt 를 못 가져온다.
⚠️ --timeout 기본값은 30초다. 반드시 크게 줄 것.
⚠️ colab stop 을 빠뜨리면 VM 이 계속 켜져 크레딧을 태운다.

주의: colab run 은 스크립트 한 파일의 내용만 VM 으로 보낸다. 옆 모듈(build_tool_v3_dataset.py)
      은 따라오지 않으므로, 이 스크립트가 실행 중에 repo 를 직접 clone 해야 한다.
"""
import os
import shutil
import subprocess
import sys

if 'ROBOFLOW_API_KEY' not in os.environ:
    sys.exit('ROBOFLOW_API_KEY 환경변수가 없습니다 — export 후 다시 실행할 것.')
RF_API_KEY = os.environ['ROBOFLOW_API_KEY']
DATASETS = [
    # (workspace, project, version, 접두어)
    ('karthi-zqreo', '6-tool-dataset-bb0ug', 3, '6tool'),
    ('ruri-binnw', 'mechanical-tools-83ynn', 2, 'mech83'),
]
OUT_DIR = '/content/ds_tool_v3'
RUN_NAME = 'tool_v3'


def main():
    subprocess.run([sys.executable, '-m', 'pip', 'install', '-q',
                    'roboflow', 'ultralytics'], check=True)

    # colab run 은 스크립트 파일만 VM 으로 전송되므로, repo 를 직접 clone 해 병합 모듈을 받는다.
    # 🔴 매번 새로 받는다 — `--keep` 재사용 시 존재 검사만 하면 이미 clone 된
    # 옛 코드를 조용히 재사용해, repo 를 고치고 재실행해도 옛 코드로 학습하게 된다.
    # repo_path 는 이 스크립트가 만든 것이므로 지워도 안전하다.
    repo_path = '/tmp/sop-project'
    if os.path.exists(repo_path):
        shutil.rmtree(repo_path)
    subprocess.run(['git', 'clone', '--depth', '1',
                    'https://github.com/kimem9859-arch/sop-project.git', repo_path],
                   check=True)

    # clone 한 절대경로를 sys.path 에 추가 (__file__ 은 믿을 수 없음)
    sys.path.insert(0, os.path.join(repo_path, 'dev/ai_model/tool_v1'))
    from build_tool_v3_dataset import build

    from roboflow import Roboflow
    rf = Roboflow(api_key=RF_API_KEY)
    roots = []
    for ws, proj, ver, prefix in DATASETS:
        ds = rf.workspace(ws).project(proj).version(ver).download('yolov8')
        roots.append((ds.location, prefix))

    report = build(roots, OUT_DIR)
    print('[merge]', report)
    # ⚠️ 체크섬 산식(파일명+라벨 내용 해시)이 바뀌면 이 기록값도 갱신해야 한다.
    print('[merge] 체크섬', report['checksum'], '← 파이 값과 같아야 한다 (π: 89a178c6c0d0e1ec)')
    if report['leaks']:
        sys.exit('🔴 누출 발생 — 학습 중단')

    from ultralytics import YOLO
    model = YOLO('yolov8n.pt')
    model.train(
        data=os.path.join(OUT_DIR, 'data.yaml'),
        imgsz=640, epochs=100, patience=20, batch=16, workers=2,
        # ── 🔴 tool_v1 과 동일한 값. 바꾸지 말 것 ──
        #    바뀌는 변수는 데이터 하나여야 "다양성이 원인인가"에 답이 된다.
        #    tool_v2(degrees=10·flipud=0)는 우리 도메인에서 전면 악화해 폐기됐다(§10.38).
        hsv_h=0.015, hsv_s=0.7, hsv_v=0.4,   # 색 흔들기 (공구는 색이 제각각)
        degrees=30.0,
        fliplr=0.5,                           # 좌우는 실제로 일어난다(왼손/오른손)
        flipud=0.5,
        mosaic=1.0,
        deterministic=True, seed=0,
        project='runs', name=RUN_NAME,
    )
    print('[done] best =', f'runs/{RUN_NAME}/weights/best.pt')
    # 🔴 여기 나오는 valid mAP 로 우열을 가리지 말 것 — 우리 도메인 값이 아니다.
    #    진짜 판정은 파이 실시간 눈확인(tool_live.py)이다(§10.38-(1)).


if __name__ == '__main__':
    main()
