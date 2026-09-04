"""Colab T4 에서 tool_v4 학습 — 6클래스(3종 + 각 「쥔 상태」).

왜 v4 인가:
    **공구를 쥐면 손이 공구를 가려 검출이 무너진다**(통합문서 §10.54 — 놓으면 73%,
    쥐면 2%). 그래서 「쥔 공구」를 별도 클래스로 배우게 하고, 그 클래스를 서브작업
    완료의 주 근거로 쓴다. 설계 = `docs/superpowers/specs/2026-09-03-공구-쥔상태-검출-design.md`

실행 (파이 터미널에서, 브라우저 불필요):
    colab new -s v4 --gpu T4
    colab exec -s v4 -f train_tool_v4.py --timeout 25200
    colab download -s v4 \\
        /content/runs/detect/runs/tool_v4/weights/best.pt Rpi5/Demo/models/tool_v4.pt
    colab stop -s v4

🔴 **함정은 v3 과 똑같다** — 아래는 `train_tool_v3.py` 에서 실측으로 확인된 것들이다.
   · 저장 경로: ultralytics 가 `project='runs'` 앞에 `runs/detect/` 를 덧붙인다.
     실제 위치는 `/content/runs/detect/runs/tool_v4/` 다.
   · 1시간 넘는 학습이면 `colab run` 대신 `new`+`exec` — `run` 은 환경변수를 못 넘긴다.
   · 프록시 토큰은 1시간짜리다. 만료되면 `ls`·`download` 가 404 를 받는다(커널이 바쁜 게 아니다).
   · `--timeout` 기본값 30초. 반드시 크게 줄 것.
   · `colab stop` 을 빠뜨리면 VM 이 켜진 채 크레딧을 태운다.

🔴 **바뀌는 변수는 데이터 하나여야 한다.** 하이퍼파라미터·모델(yolov8n)·증강은 v3 과
   같은 값을 쓴다. 그래야 「쥔 상태 데이터를 넣은 것」이 원인인지에 답이 된다.
   (tool_v2 가 증강만 바꿔 우리 도메인에서 전면 악화한 전례 = §10.38)

🔴 **여기 나오는 valid mAP 로 우열을 가리지 말 것** — 우리 도메인 값이 아니다.
   판정은 **우리 ESP32 홀드아웃**의 클래스별 채점이다(설계 §4 관문 3).
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
    # 🆕 「손에 쥔 공구」 — in-hand 클래스의 유일한 재료(2026-09-04 조사: Universe
    #    데이터셋 190여 개 중 `-in-hand` 라벨을 가진 것은 이 하나뿐이었다).
    ('commontools', 'x-tool-in-hand-videox', 3, 'inhand'),
]
OUT_DIR = '/content/ds_tool_v4'
RUN_NAME = 'tool_v4'
PI_CHECKSUM = '4b1767f68e4bce65'      # 파이에서 만든 값 — 여기서도 같아야 한다


def main():
    subprocess.run([sys.executable, '-m', 'pip', 'install', '-q',
                    'roboflow', 'ultralytics'], check=True)

    # colab exec 은 스크립트 파일만 VM 으로 보낸다 — 병합 모듈은 repo 에서 받는다.
    # 🔴 매번 새로 clone 한다. 재사용하면 repo 를 고치고 재실행해도 옛 코드로 학습한다.
    repo_path = '/tmp/sop-project'
    if os.path.exists(repo_path):
        shutil.rmtree(repo_path)
    subprocess.run(['git', 'clone', '--depth', '1',
                    'https://github.com/kimem9859-arch/sop-project.git', repo_path],
                   check=True)
    sys.path.insert(0, os.path.join(repo_path, 'dev/ai_model/tool_v1'))

    import build_tool_v3_dataset as B
    B.use_scheme('v4')                       # 🔑 6클래스 — 이 한 줄이 v3 과의 차이다
    print('[scheme] v4', B.NEW_NAMES)

    from roboflow import Roboflow
    rf = Roboflow(api_key=RF_API_KEY)
    roots = []
    for ws, proj, ver, prefix in DATASETS:
        ds = rf.workspace(ws).project(proj).version(ver).download('yolov8')
        roots.append((ds.location, prefix))

    # 🔴 휘발성 VM 위의 산출물이라 지워도 안전하다(파이 쪽 사용자 데이터 보호
    #    가드는 그대로 둔다 — 여기서만 지운다).
    shutil.rmtree(OUT_DIR, ignore_errors=True)
    report = B.build(roots, OUT_DIR)
    print('[merge]', report)
    print('[merge] 체크섬', report['checksum'], f'← 파이 값과 같아야 한다 (π: {PI_CHECKSUM})')
    if report['checksum'] != PI_CHECKSUM:
        print('🔴 체크섬 불일치 — 데이터가 파이와 다르다. 그대로 학습하면 비교가 성립하지 않는다.')
    if report['leaks']:
        sys.exit('🔴 누출 발생 — 학습 중단')

    from ultralytics import YOLO
    model = YOLO('yolov8n.pt')
    model.train(
        data=os.path.join(OUT_DIR, 'data.yaml'),
        imgsz=640, epochs=100, patience=20, batch=16, workers=2,
        # ── 🔴 v1·v3 과 동일한 값. 바꾸지 말 것(변수는 데이터 하나여야 한다) ──
        hsv_h=0.015, hsv_s=0.7, hsv_v=0.4,
        degrees=30.0,
        fliplr=0.5,
        flipud=0.5,
        mosaic=1.0,
        deterministic=True, seed=0,
        project='runs', name=RUN_NAME,
    )
    print('[done] best =', f'runs/{RUN_NAME}/weights/best.pt')


if __name__ == '__main__':
    main()
