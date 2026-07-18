# fsm — 순서위반 상태머신

> **정본 코드는 별도 git repo `Rpi5/Demo/fsm.py`** (현 repo에선 gitignore된 `../../Rpi5/`).
> 이 폴더는 통합 시 연동 지점·메모를 둔다. 설계 정본은
> [`docs/통합수행설계문서_전체_섹션1-15.md`](../../docs/통합수행설계문서_전체_섹션1-15.md) §9.

## 현황 (Rpi5/Demo/fsm.py) — 2026-07-18 현행화
- 6상태: IDLE / READY / PROCESS_RUN / MONITOR / WARNING / BLOCK.
- **오답 ROI → 타이머 → WARNING/BLOCK**(단계적) / **EMO → 즉시 BLOCK**(해제 시 기대단계=1 리셋). ※구판의 "오답 → 즉시 BLOCK" 서술은 오기 — 즉시 BLOCK은 EMO뿐(정본 §9·Rpi5/CLAUDE.md).
- **완성·단위테스트(`test_fsm.py`) + 실HW E2E 검증 완료(2026-07-15, §12)** — 실물 버튼 GPIO·릴레이·타워램프로 정상/위반/EMO/폴트 3종 통과. EMO 비상 유지 중 BLOCK 해제 거부(`emo_active()` 레벨 체크)도 반영됨.
- `on_interlock(bool)` 콜백 → [`../interlock`](../interlock) 실배선 연결 완료.
- 추론 백엔드: **`console_v2.hef` 배포·`config.HEF_MODEL_PATH` v2 전환됨**(2026-07-16, B4 판정은 §10.16). ※구판의 "FakeDetector 사용"은 2026-06-11 console_v1 통합으로 해소된 옛 기록.

## 입력
- 비전 파이프라인(§7) 출력 = 손-버튼 ROI 접촉 이벤트 → §8 → FSM 입력.
- 버튼 동적검출(console_v1→v2)은 [`../ai_model`](../ai_model) 트랙 B에서 학습.
