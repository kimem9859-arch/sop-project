# CLAUDE.md — SOP 가디언 작업 지침

> 데스크톱·라즈베리파이 양쪽 Claude Code가 자동 로드하는 **공유 두뇌**.
> 설계 사양은 여기서 정의하지 않는다 — 정본은 `docs/통합수행설계문서_전체_섹션1-15.md`.

## 프로젝트
1인칭(글래스) 비전으로 PECVD 정비(PM) SOP 순서 위반을 실시간 감시·차단하는 안전 시스템 PoC.

## 정본 (Source of Truth)
- **설계·사양·배경·SOP·하드웨어·KPI = `docs/통합수행설계문서_전체_섹션1-15.md`** (단일 정본). 작업 시 원문을 읽고 진행.
- 폴더 지도·실행법 = `README.md`. 트랙별 상세 = `dev/*/README.md`.
- 이 CLAUDE.md = "어떻게 일하나"(규칙·흐름·현황)만. 사양은 통합문서로 위임.

## 두 환경의 역할 (런타임 분리 / 지식 공유)
| | 🖥️ 데스크톱 | 🍓 라즈베리파이 |
|---|---|---|
| 역할 | 설계·통합문서 편집 · PoC(x86) · 발표 제작 | Rpi5 코드 실행·실HW 테스트·Hailo · 통합문서 편집 |
| 클론 | `sop-project` | `sop-project` + 그 안 `Rpi5/`(엄브렐러) |

## ⭐ 통합문서 = 단일 정본, 양방향 동기화
파이(개발·테스트 중 수정)와 데스크톱(발표 제작)에서 둘 다 편집·사용. **사본 금지**(병합 충돌).
- 파이: 수정 → `git commit && push` (sop-project)
- 데스크톱: `git pull` → 최신본으로 발표 제작

## Rpi5 = 별도 repo (파이 런타임 코드)
- `github.com/kimem9859-arch/Rpi5.git`, 작업 브랜치 **`feature/fsm-interlock`** (최신 본류). 구 브랜치 정리 완료.
- 파이 셋업(엄브렐러 재현):
  ```bash
  git clone https://github.com/kimem9859-arch/sop-project.git ~/sop-project
  cd ~/sop-project
  git clone -b feature/fsm-interlock https://github.com/kimem9859-arch/Rpi5.git Rpi5
  cd ~/sop-project && claude        # 통합문서 + 코드 한자리
  ```
- `Rpi5/`는 sop-project에서 gitignore(별도 repo). 런타임 맥락은 `Rpi5/CLAUDE.md`.

## 모델 (네이밍 규약 정본 §7.1, 3단계)
- `person_v1.pt` 초기 검증(mAP 0.96 완료) → **`console_v1`** 버튼검출 **1차 PoC**(5클래스 B1~B4+EMO, .hef 빌드완료·정확도 한정·실추론 미검증) → `console_v2` 최종(추후 재학습).
- 버튼 클래스맵·Pi 추론 규격(uint8 640·HailoRT NMS·4.x): `dev/ai_model/README.md`.

## PoC 실행 (Step1, 데스크톱)
루트에서: `./dev/poc/run.sh poc_data/clips/ --rois dev/poc/rois.json --out dev/poc/out`
- 머신별 차이는 `dev/poc/SETUP.md`. 환경자산 `.poc_venv`·`poc_data`·`.syslibs`는 gitignore → 머신마다 재구축.

## 작업·커밋 규칙
- 사양은 통합문서에만(README/CLAUDE 복붙 금지 → drift). 폴더·경로 바꾸면 README·CLAUDE 같이 갱신.
- **커밋 구분**: 코드 수정 → 해당 repo(파이 코드는 `Rpi5`로) / 통합문서·설계 → `sop-project`로.
- 커밋 끝에 `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. push는 사용자 요청 시.

## 현재 상태 · 다음 작업 (2026-06-11)
- ✅ Step1 PoC 완료(색 ROI, 정상 100%·스침 오탐 0).
- ✅ 폴더 정리·구조 재편·정본 모델 네이밍 3단계화.
- ✅ **console_v1.hef 빌드 완료**(버튼 5클래스, 학습 mAP 0.993[낙관]·level0 양자화). → `dev/ai_model/`.
- ✅ recipe.json 단계라벨 PM 시퀀스 동기화(Rpi5).
- ✅ **console_v1 파이 통합·실추론·벤치마크 완료** — B1·B2·B3·EMO 검출 동작 확인. ESP32 TCP ~13fps(하드웨어 상한). **B4 완전 미탐지 확인 → console_v2 재학습 확정**.
- ✅ `Rpi5/Demo/test/bench_detector.py` 작성 + 2회 실측(4종 CSV + 영상). test-artifacts 브랜치 보관.
- ✅ Hailo-8 드라이버 재빌드(kernel 6.18.29 대응). `/etc/modules-load.d/hailo.conf`로 자동로드 설정.
- ✅ MediaPipe 호환성 문제 확인: hailo_platform은 Python 3.13 전용, mediapipe는 aarch64/3.13 미지원 → **HOI 검증 보류**(PoC 단계 YOLO 탐지만 확인).
- **▶ 최우선 다음 = console_v2 재학습** — B4 미탐지 해결(더 많은 데이터·calibration 이미지·640 해상도 확정), GPU 환경에서 재학습·DFC 변환.
- 트랙 A 인터락(`dev/interlock/README`), Step3 통합 → 4 E2E → 5 데모·발표.

## 미해결
- **입력 해상도**: console_v1은 640 빌드·검증 완료. §7.1 "QVGA 320 기본" 정책은 console_v2 재학습 시 확정 필요(현재 잠정 640).
- **B4 미탐지**: level-0 DFC 양자화 + 검정 버튼 저대비 추정 → console_v2 재학습 및 B4 데이터 보강으로 해결 필요.
- **MediaPipe / HOI 검증**: Python 3.13 aarch64 미지원. hailo_platform과 공존 불가 → console_v2 단계에서 Python 버전 정책 재검토 필요.
- **FPS**: ESP32-S3 TCP ~13fps 상한. NFR-1 30fps 목표 미달 — 카메라 경로 변경(USB 웹캠→글래스 직접연결 등) 또는 목표 조정 필요.
- 페일세이프 표현 정정(§1 "능동형 Fail-Safe" 과장), §2.3 적합 사고사례 미발굴.

## 안전 용어
포카요케(실수방지)·인터락·안돈(타워램프 경고)·능동형 안전. ※풀프루프·페일세이프는 과장/조건부라 주의.
