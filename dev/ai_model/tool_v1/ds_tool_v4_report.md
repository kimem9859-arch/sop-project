# `ds_tool_v4` 빌드 리포트 (2026-09-04)

> 설계 = `docs/superpowers/specs/2026-09-03-공구-쥔상태-검출-design.md` §3
> 🔴 성능 수치가 아니라 **데이터셋 구성 기록**이다. 측정값 정본은 통합문서 §10.

## 생성

```
~/env/rfenv/bin/python dev/ai_model/tool_v1/build_tool_v3_dataset.py --scheme v4 \
    ~/data/ds_tool_v4 ~/data/ds_6tool:6tool ~/data/ds_mech83:mech83 ~/data/ds_inhand:inhand
```

| | |
|---|---|
| 이미지 | **33,757** (train 30,379 · valid 3,378) |
| 네거티브 | 4,403 |
| 출처 | 8,761 |
| **누출** | ✅ **0건** |
| **체크섬** | `4b1767f68e4bce65` ← Colab 과 일치해야 한다 |

## 클래스 (라벨 파일 직접 재집계)

| idx | 클래스 | 인스턴스 |
|---|---|---|
| 0 | `driver` | 27,231 |
| 1 | `wrench` | 14,230 |
| 2 | `pliers` | 10,715 |
| 3 | `driver-in-hand` | 1,043 |
| 4 | `wrench-in-hand` | **1,497** |
| 5 | `pliers-in-hand` | **354** |

- 범위 밖 인덱스 **0건**.
- `wrench-in-hand` 가 원본(910)보다 많은 것은 **`spanner-in-hand` 582장을 병합**했기 때문이다(§10.39-(6) — 우리 오픈엔드의 정답은 `wrench`).
- `hammer`·`drill`·`ratchet` 등은 `KNOWN_DISCARD` 로 **네거티브화**(25,586장 후보 → 15% 표집).

## 눈 확인 (🔴 생략 불가 — 인덱스 밀림은 사람 눈으로만 잡힌다)

- 무작위 24장 + in-hand 포함 6장을 그려서 확인.
- ✅ 클래스↔실물 일치(드라이버·렌치·플라이어 계열), **밀림 없음**.
- ✅ **in-hand 박스가 공구에만 붙는다** — 손·팔을 감싸지 않는다. 판정·화면 표시에 그대로 쓸 수 있다.
- ✅ 망치는 박스 없이 네거티브로 들어갔다.

## 알려진 위험 (관문 1, 2026-09-04)

🔴 **`pliers-in-hand` 는 배경 편중**이다 — 전 구간 16장 표본에서 약 60%가 **같은 나무 워크벤치·같은 사람**이었다. `wrench-in-hand` 는 5~6환경(최다 38%), `screwdriver-in-hand` 는 약 12환경으로 넉넉하다.
⚠️ **자동 다양성 지표는 1인칭 영상에서 부풀려진다** — 파일명 출처 723·dHash 809군집·색배치 350군집이 모두 실제 환경 수(5~6종)와 크게 어긋났다. 고개만 돌려도 프레임이 달라지기 때문이다. **환경 수는 눈으로 센다.**

## 라이선스 (CC BY 4.0 — 표시 의무 3가지)

| 데이터셋 | 저작자 | 라이선스 |
|---|---|---|
| `6-tool-dataset-bb0ug` v3 | `karthi-zqreo` | CC BY 4.0 |
| `mechanical-tools-83ynn` v2 | `ruri-binnw` | CC BY 4.0 |
| **`x-tool-in-hand-videox` v3** | `commontools` (Roboflow Universe) | CC BY 4.0 |

🔴 **변경 사실 표기 해당** — 병합·클래스 재매핑(`spanner-in-hand`→`wrench-in-hand`)·재분할·네거티브 표집을 했다.
