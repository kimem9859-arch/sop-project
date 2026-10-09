# dev/video — 시연 영상 합성 (Remotion)

> 설계 = `docs/superpowers/specs/2026-10-09-시연영상-합성-design.md` · 계획 = `docs/superpowers/plans/2026-10-09-시연영상-합성.md`
> 폰으로 찍은 1인칭 영상 위에 **실제 시스템 기록**(측정 기록)과 **같은 모델로 다시 검출한 결과**로 HUD 를 합성한다. 연출은 보여 주는 방식만 바꾼다(박스 위치·경고 시각·차단 여부는 기록 그대로 · 배속은 반드시 표기).

## 자리

| 무엇 | 어디 |
| --- | --- |
| 촬영 원본·사본·검출·기록 | 데스크톱 `~/data/시연영상/<촬영 id>/` — `original.mp4` · `proxy.mp4` · `dets.json` · `measure/` · `timeline.json` · `sync.json` (git 밖) |
| Remotion 에서 여는 길 | `public/footage` → `~/data/시연영상` 바로가기(렌더 때 복사되지 않고 그대로 넘어간다) |
| 렌더 결과 | `out/` (git 밖) |
| 폰 원본 받는 곳 | Windows `C:\퀵쉐어\`(Quick Share) 또는 USB 로 옮긴 폴더 → `~/data/시연영상/<id>/original.mp4` 로 **복사** |

촬영 id = `<날짜>_<장소>_<장면>` **영문·숫자만**(예 `20261008_phoneA` · `20261009_p1_main1`) — Remotion 파일 주소에 한글이 들어가지 않게.

## 순서

```bash
export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"          # Node 24 (nvm)
cd ~/projects/dev/video
T=~/data/시연영상/<id>
tools/proxy.sh $T/original.mp4 $T/proxy.mp4                # 검출용 사본(긴 변 1280 · 30fps · 회전 반영)
tools/pi_extract.sh $T [--pad34]                           # 파이1 임시 폴더에서 검출 → dets.json (NPU 사용 중이면 종료 2 · 공간 부족 종료 3)
node tools/build_timeline.ts $T/measure <판> $T/timeline.json
node tools/sync.ts $T/original.mp4 $T/timeline.json $T/sync.json   # 누름 소리 ↔ GPIO 누름 기록 → 영상 0초의 기록 시각
node tools/cuts.ts $T/timeline.json $T/sync.json           # 편집표를 쓰기 위한 사건 시각표(영상 초)
npm run dev                                                # Studio — 노트북 원격이면 http://100.107.89.123:3000
npm test                                                   # 계산 함수 시험(node:test)
```

- 🔴 **파이 코드(`Rpi5/`)는 고치지 않는다** — 검출 스크립트는 `tools/pi/extract_phone.py` 를 파이1 `~/lab/video-extract/<id>/` 로 복사해 돈다.
- 🔴 파이1 NPU 는 하나다 — 시연·측정·학습이 돌고 있으면 `pi_extract.sh` 가 멈춘다(남의 프로세스를 끄지 않는다).
- 원본·사본·렌더 결과는 git 에 넣지 않는다.
- Remotion 공식 스킬(12개)은 git 에 넣지 않는다 — 설치 목록 `skills-lock.json` 만 올린다 · 새 기기에서는 `npx remotion skills add`(`.agents/skills` + `.claude/skills` 바로가기).
