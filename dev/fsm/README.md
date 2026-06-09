# fsm — 순서위반 상태머신

> **정본 코드는 별도 git repo `Rpi5/Demo/fsm.py`** (현 repo에선 gitignore된 `../../Rpi5/`).
> 이 폴더는 통합 시 연동 지점·메모를 둔다. 설계 정본은
> [`docs/통합수행설계문서_전체_섹션1-15.md`](../../docs/통합수행설계문서_전체_섹션1-15.md) §9.

## 현황 (Rpi5/Demo/fsm.py)
- 6상태: IDLE / READY / PROCESS_RUN / MONITOR / WARNING / BLOCK.
- 오답 → 즉시 BLOCK, EMO 처리. **완성·단위테스트됨.**
- `on_interlock(bool)` 콜백 구현됨 → [`../interlock`](../interlock)와 연결(Step3).
- detector / camera_thread / safety_console 존재. 단 실제 버튼검출모델 `console_v1` 없음(FakeDetector 사용).

## 입력
- 비전 파이프라인(§7) 출력 = 손-버튼 ROI 접촉 이벤트 → §8 → FSM 입력.
- 버튼 동적검출(console_v1)은 [`../ai_model`](../ai_model) 트랙 B에서 학습.
