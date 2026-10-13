import {BANNER_FROM, BTN_ORDER, CHECK_SEC, HEAD_AT, ROW_AT, ROW_CHECK, ROW_GAP, SCAN_HOLD_SEC, btnIntroAge} from "../lib/boot.ts";
import type {Clip} from "../lib/edit.ts";
import type {StagedEv, StagedPress} from "../lib/staged.ts";
import type {ViewKey} from "../lib/view.ts";
import {CARD_IN, CARD_LAND} from "../lib/uiState.ts";
import {ASK_ACK} from "./feature.ts";
import {TTS_SEC} from "./ttsSec.ts";

// 기능 소개 영상 시안 17(2026-10-11 · 사용자 「이전 시안대로 효과 · 그래픽 · 자막 · 효과음 … 타워램프는 제외 · 음성비서는 현재 영상으로」)
//   · 시안 17 피드백 19건(같은 날) — 로고 5초 · 켜짐 한 장면 · 탐지 연출은 재생 중 · 공구 장면 시작 · 음성비서 정지/재생 · 단계 질문 = 버튼 입력 장면 등
//   · 수정 19(10/13 · 사용자 「단계 명칭으로 영상을 수정」) — 단계 = 공정 정지 · 냉각 · 가스 퍼지 · 챔버 벤트(hud/theme STEPS) · 서브 작업 = 플라즈마 정지 · 전극 온도 하강 · N2 퍼지
//   · 수정 17(10/13 · 사용자 「프로젝트-최종정리.md 내용을 확인하여 반영」) — 공구 질문 = 즉답(LLM 없이) · 경고 · 스침 자막 = 판정 기준 안 B · 서브작업 대기 = 레시피 10초
//   촬영 = 10/11 폰(4K 60fps) — 안경 쓰기 ③(174802) · 행동 영상(174335 · 94.7초) · 안경 벗기(174621) · 검출 = 파이1(--pad34)
//   장면 고르기 = 프레임 6,656장 판정(문 · 디스플레이 비침 = 뺌) + 소리의 딸깍(누름) · 검지 끝이 버튼 박스에 든 시각(검출)
//   🔑 문 · 디스플레이 비침이 보이는 순간은 자르지 않고 확대해 화면 밖으로(VIEWS · 사용자 「공구를 가져올 때 끊기지 않게」)
//   배경음악은 아직 없음(사용자 「후보 10곡 중 내가 골라 다운로드」)
// 🔴 실제 기록이 없는 시안 — 상태 · 경고 · 음성 · 사실 카드 표시는 화면을 보고 꾸민 연출(lib/staged) · 박스 · 손 · 공구는 실제 검출
// 오른쪽 아래 표기 — 실제(검출) · 연출(상태 · 경고 · 음성 표시) 구분 + 목소리는 AI 합성(Supertonic 모델 라이선스 부속서 A (e)
//   「기계가 만든 것임을 밝힘」 · 제미나이 음성도 함께) · 최종본(10/13 사용자 「현재 문구는 뭔 내용인지 잘 모르겠어」)에서 알아보기 쉽게 바꿈(뜻은 같음)
export const FEATURE17_SYNTH = "버튼·손·공구 인식은 실제 결과 · 경고·음성 화면은 실제 동작을 바탕으로 꾸민 연출 · 목소리는 AI 합성";
const LOGO = "intro_logo", G = "20261011_glasses3", M = "20261011_main", GO = "20261011_glassesoff";
const V = "voice" as const;

// 화면 보기(lib/view) — [원본 초, 배율, 중심 x, y]
//   안경 ③ = 1.068배(안경 끝 269번 프레임 ↔ 행동 영상 29번 프레임 버튼 자리가 겹치게 · 버튼 3개로 맞춤)
//   행동 영상 = 비침 · 문이 보이는 장면만 장면 내내 같은 배율(시안 17 4차 피드백 「공구를 줌했다가 확대되는 것 같아 — 확대 효과 제거」 →
//     장면 안에서 확대 · 축소가 일어나지 않게 · 바뀌는 곳은 편집에 쓰지 않는 원본 구간)
//   W = 1.3배 · 창 가로 0.115~0.885 · 세로 0.23~1.00 — 디스플레이(위 0.21 안쪽) · 문(왼쪽 끝 0.10 안쪽)이 창 밖 · 렌치 머리는 창 안
//     (2차 판 1.43배는 렌치 머리를 잘라 비침 구간에서만 썼고, 그 경계에서 확대 · 축소가 보였다)
//   공구 질문 장면(61.05~67.8 · 비침 64.09~64.78 · 66.51~67.58) = W · 드라이버 장면은 비침이 끝난 82.98 부터라 원래 화면
//   렌치 장면만 2차 판 방식(Z = 1.43배 · 비침 · 문이 끝나는 49.21 뒤 0.54초에 걸쳐 원래 화면)으로 되돌림(시안 17 5차 피드백 —
//     W 고정이면 렌치 박스 위 이름표가 화면 위에서 잘림 · 「이전 확대 방식으로 롤백」 · 인식 정지는 확대가 풀리는 중간)
const W: [number, number, number] = [1.3, 0.5, 0.615], Z: [number, number, number] = [1 / 0.7, 0.47, 0.65], I: [number, number, number] = [1, 0.5, 0.5];
const k = (t: number, v: [number, number, number]): ViewKey => [t, ...v];
export const FEATURE17_VIEWS: Record<string, ViewKey[]> = {
  [G]: [[0, 1.068, 0.5315, 0.5291]],
  [M]: [k(43.827, I), k(44.367, Z), k(49.208, Z), k(49.748, I), k(60.4, I), k(60.9, W), k(68.0, W), k(68.5, I)],
};

// 시각(원본 초 · 행동 영상) — 검출(dets) · 소리 · 프레임 판정에서
const BOOT_FROM = 0.47, BOOT_TO = 1.12;   // 안경 끝과 이어지는 29번 프레임 · 손이 들어오기 직전(손 화면 등장 1.23 · 검출 1.37)
const HAND_IN = 1.57;   // 손이 다 펴진 순간(#94)
// 손 — 들어올 때 손등 → 2.6~2.8 뒤집혀 손바닥(2.9~3.7) → 3.8~4.1 다시 뒤집혀 손등이 다 펴짐(#259 4.35) · 4.85 부터 화면 밖으로
//   시안 17 3차 피드백 「손바닥이 보인 다음 손등이 보일 때까지 손 인식 · 정지한 다음 손 추적 시작과 21점」 → 인식(재생) 1.57~4.35 · 4.35 에서 정지
const HAND_FLIP = 4.35, HAND_HOLD = 1.6;
const WR_AT = 48.0, TOOL_AT = 49.5, OVER_AT = 51.0, GRASP = 53.0, WR_TO = 53.5;   // 렌치를 쥐고 공구함 앞에서 꺼냄(#2849) → 전체가 보임 → 겹침 → 3번째 확인 → 0.5초(5차 1.0 → 0.5)
// 공구 인식 · 쥠 확인 · 다른 공구는 멈춘 화면에서 · 쥠 판정(스캔)은 재생 중(시안 17 3차 피드백)
const TOOL_HOLD = 1.0, GRASP_HOLD = 1.0, WRONG_HOLD = 1.3;   // 5차 분량 줄이기(1.5 · 1.5 · 1.8 → 효과는 1초 안에 끝남)
const B2_AT = WR_AT - 0.25;               // 렌치 장면 시작에 「렌치 찾는 중」이 지지직하며 나오게(찾기 시작 = 누름 + 0.2)
// 드라이버 — 쥔 손이 공구함 밖 · 비침이 끝난 첫 프레임(#4921) → 다 들어와 멈춘 83.9 에 인식(시안 17 4차 「인식 시작이 너무 빨라 조금만 늦춰」 83.3 → 83.9)
const DRV_FROM = 82.98, DRV_AT = 83.9, DRV_OVER = 84.4, DRV_WRONG = 85.9, DRV_TO = 86.6;   // 경고 뒤 0.7초(5차 1.35 → 0.7)
const GRAZE_IN = 12.767, GRAZE_OUT = 12.833;   // 검지 끝이 B1 박스에(0.07초)
// 경고 · 차단 = 느린 손끝 경고(판정 기준 안 B · 수정 18 · 사용자 「버튼으로 빨리 가다가 멈추는 연출로 손 속도도 판정 기준」)
//   B2 에서 B3 로 빠르게(600~670 사본 px/s) 와서 B3 상자 안에서 기준 아래로 느려진 순간 바로 경고 — 시각은 촬영 검출로 계산(lib/speed enterAt ·
//   slowAt · 시험이 지킴) · 0.3초 체류 타이머는 이 장면에서 쓰지 않는다(이 손은 0.3초가 차기 전에 속도로 경고된다)
const WARN_FROM = 14.3, WARN_IN = 14.767, WARN_SLOW = 14.867;   // 손이 B2 를 떠남 · B3 상자에 듦 · 느려짐(0.63초 머묾 · 딸깍 없음 = 누르지 않음)
//   차단 = 경고 → 무시하고 누름 → 차단(수정 18 — 2차 피드백의 「게이지가 차기 전에 눌러 차단」을 바꿈 · 실제 FSM 「WARNING 에서 오답 누름 → BLOCK」)
//   경고 음성은 넣지 않는다 — 경고 뒤 0.47초에 눌러, 음성 알림 지연(중앙 0.835초 · 최종 정리 9.1)보다 먼저 차단이 온다
const BLOCK_FROM = 20.2, BLOCK_IN = 20.367, BLOCK_SLOW = 20.467, BLOCK_PRESS = 20.94;   // 다가옴 · B3 에 듦 · 느려짐(경고) · 딸깍(누름)
// 누름 → 차단을 화면에서 나눠 보인다(시안 17 3차 피드백 「파동이 누름 효과인지 차단 효과인지 구분이 안 돼」) — 누른 순간 버튼 색 파동 · 누름 소리 →
//   0.05초 뒤 프레임에서 멈추고(HUD 시계는 흐름) BLOCK_GAP 뒤 차단(빨강 번쩍 · 흔들림 · 자물쇠 · 경보) · 경고 구역은 차단 순간 사라짐(lib/judge)
const BLOCK_FRAME = BLOCK_PRESS + 0.05, BLOCK_GAP = 0.35, BLOCK_AT = BLOCK_FRAME + BLOCK_GAP;
// 음성 질의 — 작업자 「가디언」(남성 TTS) → 호출 띠링 → 질문 → 받아쓰기 · 시각 = HUD 기록 시계
//   말풍선 글자는 목소리와 함께 써진다(utter 사건 · 시안 17 3차 피드백 「남자 목소리와 UI가 맞지 않아」)
//   LLM 답 = 사실 카드가 말풍선에 들어가(CARD_LAND 3.9 — 그때까지 「코드 판정 중」) 「LLM 생각 중」을 LLM_THINK 초 보인 뒤
//   (시안 17 4차 피드백 「사실 카드가 들어가면 LLM 생각 중 · 그 시간을 좀 두어 — 바로 답 말풍선이 나오지 않게」 · 3차 판은 0.3초)
//   즉답 = 상태 질문 7종은 LLM · 「확인해 보겠습니다」 · 사실 카드 없이 코드가 바로 답한다(수정 17 · 최종 정리 5.6 · Rpi5 bfba16f
//   voice_card.quick_answer — 시연 런처 기본 켬) · QUICK_ANSWER = 받아쓰기 뒤 답(「코드 판정 중」이 잠깐 보임)
const LLM_THINK = 1.2, QUICK_ANSWER = 1.1;   // 즉답 1.1 = 「코드 판정 중」 0.6초(0.8 은 9프레임 깜빡임 · 리뷰) · 실제 합성 · 재생 지연 0.5~1.5초 안
export const ANSWER = CARD_LAND + LLM_THINK;   // 질문 뒤 LLM 답
const say = (w: number, wake: number, ask: number, sec: number, after = ANSWER) => {
  const call = w + wake + 0.04, q = call + 0.35, stt = q + ask + 0.1;   // 「가디언」 시작 → 호출 · 질문 시작 → 받아쓰기
  return {w, call, q, stt, ask, ack: stt + ASK_ACK, ans: stt + after, play: stt + after + 0.1, done: stt + after + 0.1 + sec};   // done = 답 재생 끝
};
type Say = ReturnType<typeof say>;
// 03-1 공구 질문(둘째 렌치) = 즉답(「필요공구」) — 질문을 받아쓴 순간 화면 정지(HUD 는 흐름) → 답을 다 들은 뒤 재생 → 렌치를 쥘 때까지
//   (시안 17 3차 피드백 「음성비서가 답하기도 전에 손이 공구로 향하고 있어 — 답을 받고 행동이 시작」 → 답 재생 끝 + 0.2초에 재생)
//   패널이 가만히 있는 63.65초까지를 질문이 끝날 때까지로 살짝 늘림(0.97배 · HUD 는 제 속도)
//   답 뒤 재생은 손이 공구함에서 렌치를 잡는 순간(주먹이 공구함 안 · 65.05~)까지(5차 분량 줄이기 67.8 → 65.95 · 꺼내 드는 모습은 뺌)
//   2단계(전극 온도 하강 10초) 시작 = 장면 1초 전 — 누름 파동(0.9초)이 장면 첫 화면에 남지 않고, 10초 대기가 장면 끝(HUD 약 69.8)까지 끝나지 않게
const V1_FROM = 61.05, V1_FREEZE = 63.65, V1_TO = 65.95, V1_B2 = V1_FROM - 1.0;
const A1 = say(V1_FROM + 0.05, TTS_SEC.w_wake, TTS_SEC.w_tool, TTS_SEC.tool_quick, QUICK_ANSWER);
const V1_GO = A1.done + 0.2;
// 03-2 단계 질문(B1 누름 장면) = LLM — B1 누름(딸깍 9.54) → 손을 떼며 호출 → 질문 → 손이 다시 들어오기(12.37) 전 12.3초에서 정지(HUD 는 흐름)
//   1단계 서브작업(레시피 10초)이 끝나 2단계 안내 — 답이 그 전에 끝난다(수정 17 — 영상에서만 12초였던 것을 레시피대로 · 답 문장을 줄여 맞춤)
const STEP1_SEC = 10;
//   시작 = B1 누르기 약 1초 전(5차 분량 줄이기 7.9 → 8.6) · 끝 「다음에 누를 버튼」 안내 1.6 → 1.2초
const V2_FROM = 8.6, V2_FREEZE = 12.3, STEP1_DONE = 9.54 + STEP1_SEC, V2_END = STEP1_DONE + 1.2, A2 = say(9.65, TTS_SEC.w_wake, TTS_SEC.w_step, TTS_SEC.step1);

const done1: StagedEv = {t: 0, kind: "step_done", d: {order: 1, button: "B1"}};
const at0 = (t: number, e: StagedEv): StagedEv => ({...e, t});
const search = (t: number): StagedEv => ({t, kind: "tool_scan", d: {hand: true, seen: [], tool: null, phase: "search", want: "wrench"}});
// 음성 질의 — 호출 → 질문 → (LLM = 사실 카드 · 「확인해 보겠습니다」 →) 답 · 시각 = HUD 기록 시계
//   card 가 없으면 즉답(LLM · 「확인해 보겠습니다」 없음 — voice_assistant 「LLM 도 「확인 중」도 없이 상태로 한 문장」)
//   + 작업자 말(utter — 말풍선이 목소리와 함께 써짐 · 「가디언」 = 새 대화의 첫 말)
const ask = (a: Say, q: string, answer: string, card?: string[]): StagedEv[] => [
  {t: a.w, kind: "utter", d: {text: WORKER_LINES.w_wake, dur: TTS_SEC.w_wake, first: true}, src: V},
  {t: a.call, kind: "wake", d: {}, src: V},
  {t: a.q, kind: "utter", d: {text: q, dur: a.ask}, src: V},
  {t: a.stt, kind: "stt", d: {text: q}, src: V},
  ...(card ? [
    {t: a.stt + 0.05, kind: "card", d: {lines: card}, src: V},
    {t: a.ack, kind: "play_start", d: {}, src: V},
    {t: a.ack + TTS_SEC.ack, kind: "play_end", d: {what: "완료"}, src: V},
  ] satisfies StagedEv[] : []),
  {t: a.ans, kind: "answer", d: {src: card ? "llm" : "quick", text: answer}, src: V},
  {t: a.play, kind: "play_start", d: {}, src: V},
  {t: a.done, kind: "play_end", d: {what: "완료"}, src: V},
];
// 답 문장 · tools/tts_lines.ts 가 읽어 TTS 로(tts_<이름>.wav)
//   step1 = 단계 질문 LLM 답(1단계 대기 중) — 1단계 완료(누름 + 10초) 전에 끝나도록 줄임(수정 17 · 3.9 → 2.0초)
//   tool_quick = 공구 질문 즉답 — Rpi5 bfba16f voice_card.quick_answer 「필요공구」 문장 그대로({현재단계}단계에 필요한 공구는 {공구}입니다.)
export const TTS17_LINES = {step1: "플라즈마 정지 중이니 기다리세요.", tool_quick: "2단계에 필요한 공구는 렌치입니다."};   // step1 = 수정 19(「플라즈마 정지가 끝날 때까지 …」는 2.8초로 1단계 안에 못 끝남)
// 작업자 말(시안 17 피드백 「호출 음성과 질문을 남성 TTS 로」 — 촬영 때 녹음하지 않음) · tools/tts_gemini.py(제미나이 남성)가 w_* 를 만든다
export const WORKER_LINES = {w_wake: "가디언", w_tool: "지금 필요한 공구가 뭐야?", w_step: "다음 단계 뭐야?"};
const CARD_STEP1 = [
  `지금 할 일: 기다린다 — 약 ${Math.round(STEP1_DONE - A2.stt)}초 뒤 자동으로 2단계로 넘어간다`,
  "현재 진행 중인 단계: 1단계 「공정 정지」 — 아직 끝나지 않음 · 이 단계의 버튼: B1",
  "1단계의 서브작업: 플라즈마 정지",
  "순서 판정: 정상 (경고·차단 없음)",
  "그 다음에 올 단계: 2단계 「냉각」 · 버튼 B2 (현재 단계가 끝난 뒤에만 누른다)",
  "이 시스템이 모르는 것: 가스·압력·온도 같은 장비 센서 값 · 다른 작업자",
];
export const ASK = {A1, A2, V1_FROM, V1_FREEZE, V1_TO, V1_GO, V2_FROM, V2_FREEZE, STEP1_DONE, V2_END};

// 연출 기록(run 마다) — 누름은 장면 밖(화면에 누름 파동이 안 보이게) · 1단계 완료 안내는 장면보다 충분히 앞
// 서브작업 대기 = 레시피 10초(수정 17 · 최종 정리 3.1) — 2단계 전극 온도 하강은 장면이 끝날 때까지 대기가 끝나지 않는 자리에서 누른다
//   (연출 기록은 공구를 쥐지 않아도 시간이 차면 단계를 끝낸다 — 실제 시스템은 렌치를 쥘 때까지 기다림)
//   pB1 = 장면 앞(화면 밖)에서 1단계를 끝내 두는 준비 누름
const P1: StagedPress = {button: "B1", t: 9.54, sub: {label: "플라즈마 정지", sec: STEP1_SEC}};   // 실제 누름(딸깍 9.54)
const pB1 = (t: number): StagedPress => ({button: "B1", t, sub: {label: "플라즈마 정지", sec: 1}});
export const SUB2 = {label: "전극 온도 하강", sec: 10};   // 2단계(냉각) 서브 작업 — 렌치 필요
export const FEATURE17_STAGED = {
  [M]: {start: 0.3, presses: [P1, {button: "B2", t: 40}]},
  [`${M}#tool`]: {start: 26, presses: [pB1(28), {button: "B2", t: B2_AT, sub: SUB2, tool: {want: "wrench", seen: OVER_AT, grasped: GRASP}},
    {button: "B3", t: 80}]},
  [`${M}#other`]: {start: 60, presses: [pB1(62), {button: "B2", t: 80, sub: SUB2}, {button: "B3", t: 120}],
    extra: [...[DRV_FROM + 0.05, DRV_FROM + 1.05].map(search),
      {t: DRV_OVER, kind: "tool_scan", d: {hand: true, seen: ["driver"], tool: null, phase: "checking", want: "wrench"}},
      {t: DRV_WRONG, kind: "wrong_tool", d: {want: "wrench", got: "driver"}}]},
  // 02 — 차례 B2(1단계 끝남) · 스침 = B1 · 경고 · 차단 = B3
  [`${M}#graze`]: {start: 6, presses: [], first: "B2", extra: [at0(6, done1),
    {t: GRAZE_OUT, kind: "state", d: {old: "MONITOR", new: "PROCESS_RUN", expected: "B2", dwell_roi: "B1", dwell_start_ms: GRAZE_IN * 1000}},
    {t: GRAZE_OUT + 0.36, kind: "state", d: {old: "PROCESS_RUN", new: "MONITOR", expected: "B2"}}]},
  [`${M}#warn`]: {start: 8, presses: [], first: "B2", extra: [at0(8, done1),
    //   경고 = 느려진 장 바로 앞(정지 화면의 기록 시각에서 이미 경고) · reason "slow" = 느린 손끝(Rpi5 fsm last_warn_reason)
    {t: WARN_SLOW - 0.001, kind: "state", d: {old: "MONITOR", new: "WARNING", expected: "B2", dwell_roi: "B3", dwell_start_ms: WARN_IN * 1000, reason: "slow"}},
    {t: WARN_SLOW + 0.01, kind: "alert", d: {key: "alert_warn_B2", state: "WARNING"}, src: V},
    {t: WARN_SLOW + 0.07, kind: "play_start", d: {}, src: V}]},
  [`${M}#block`]: {start: 13, presses: [], first: "B2", extra: [at0(13, done1),
    {t: BLOCK_SLOW, kind: "state", d: {old: "MONITOR", new: "WARNING", expected: "B2", dwell_roi: "B3", dwell_start_ms: BLOCK_IN * 1000, reason: "slow"}},
    {t: BLOCK_PRESS, kind: "gpio_edge", d: {button: "B3", src: "edge"}},
    {t: BLOCK_PRESS, kind: "press", d: {button: "B3", source: "gpio", expected: "B2", state: "WARNING"}},
    {t: BLOCK_AT, kind: "state", d: {old: "WARNING", new: "BLOCK", expected: "B2"}},
    {t: BLOCK_AT + 0.03, kind: "alert", d: {key: "alert_block_B2", state: "BLOCK"}, src: V},
    {t: BLOCK_AT + 0.1, kind: "play_start", d: {}, src: V}]},
  // 03 — 공구 질문 = 2단계 렌치 찾는 중(오른쪽 위 카드만 · 공구 탐지 연출 없음) · 즉답 / 단계 질문 = B1 을 누른 뒤 1단계 대기 · LLM
  [`${M}#voice1`]: {start: 48, presses: [pB1(50), {button: "B2", t: V1_B2, sub: SUB2}, {button: "B3", t: 100}],
    extra: [...Array.from({length: 20}, (_, k) => search(V1_B2 + 0.2 + k)), ...ask(A1, WORKER_LINES.w_tool, TTS17_LINES.tool_quick)]},
  [`${M}#voice2`]: {start: 5, presses: [P1, {button: "B2", t: 40}],
    extra: ask(A2, WORKER_LINES.w_step, TTS17_LINES.step1, CARD_STEP1)},
};

// 분량 줄이기(시안 17 5차 — 목표 1분 30초 ~ 1분 40초 · 사용자 「추천대로」) — 장 카드 1.8 → 1.5 · 절 카드 1.3 → 1.0 · 스침 0.25 → 0.3배
const CH = 1.5, SC = 1.0, SLOW = 0.4, GRAZE_SLOW = 0.3, SLOW_HOLD = 1.2;   // SLOW_HOLD = 느려진 순간 정지(계기가 주황 · 경고가 뜸 · 수정 18)
const WARN_VOICE = 0.45, BLOCK_VOICE = 0.55;
const WARN_TO = 15.25;
const WARN_HOLD = TTS_SEC.warn2 - ((WARN_TO - WARN_SLOW) / SLOW - WARN_VOICE) + 0.3;
const BLOCK_HOLD = BLOCK_VOICE + TTS_SEC.block2 + 0.3;
type Ch = NonNullable<Clip["chapter"]>;
type Sc = NonNullable<Clip["section"]>;
const chCard = (take: string, at: number, chapter: Ch, run?: string): Clip =>
  ({take, run, file: "proxy.mp4", from: at, to: at, speed: 1, overlay: true, hold: CH, card: "chapter", chapter, sfx: [[0, "sfx_whoosh", 0.5]]});
const scCard = (take: string, at: number, section: Sc, run?: string): Clip =>
  ({take, run, file: "proxy.mp4", from: at, to: at, speed: 1, overlay: true, hold: SC, card: "section", section, sfx: [[0, "sfx_pop", 0.4]]});
const hold = (take: string, at: number, sec: number, extra: Partial<Clip> = {}): Clip =>
  ({take, file: "proxy.mp4", from: at, to: at, speed: 1, overlay: true, hold: sec, ...extra});
const play = (from: number, to: number, extra: Partial<Clip> = {}): Clip =>
  ({take: M, file: "proxy.mp4", from, to, speed: 1, overlay: true, ...extra});
// 자막 — 시안 16 문장 그대로(사실과 맞춤) · 바뀐 곳 = 안경(시안 17 피드백) · 스침 B1 · 차단(경고 뒤에도 B3 누름) · 「검지 끝」 → 「손끝」(시안 17 피드백)
const SUB = {
  glasses: "작업 전 스마트 안경을 착용하고 시작합니다",
  boot: "시스템을 점검하고 작업 순서(레시피)를 불러옵니다",
  buttons: "찾은 버튼마다 이름과 신뢰도를 표시합니다",
  hand: "21개 점 가운데 손끝이 버튼 판정의 기준입니다",
  reach: "2단계에 필요한 렌치를 공구함에서 꺼냅니다",
  found: "카메라가 렌치를 찾아냅니다",
  overlap: "손과 공구가 겹치면 쥐었는지 확인을 시작합니다",
  grasp: "1초마다 살펴 세 번 연속 확인되면 쥔 것으로 판정합니다",
  other: "이번에는 렌치 대신 드라이버를 집어 봅니다",
  wrong: "필요하지 않은 공구를 쥐면 첫 확인에서 바로 경고합니다",
  //   스침 · 경고 = 판정 기준 안 B(수정 17 · 최종 정리 5.2) — 느린 손끝은 바로 경고 · 아니면 0.3초 체류 · 빠르게 0.3초 안에 빠지면 통과
  graze: "차례가 아닌 B1을 빠르게 스치기만 하면 경고하지 않습니다",
  warn: "빠르게 오다가 B3 위에서 느려지면 누르기 전에 바로 경고합니다",   // 수정 18 — 속도가 판정 기준임을 보인다(0.3초는 절 카드)
  block: "경고를 무시하고 B3를 누르면 입력을 막고 음성으로 알립니다",
  press1: "B1을 누르면 1단계 서브작업이 시작됩니다",
  call: "「가디언」이라고 부른 뒤 말로 묻습니다",
  quick: "정해진 상태 질문은 LLM 없이 코드가 바로 답합니다",   // 공구 질문 = 즉답(수정 17)
  card: "코드가 정한 지금 상황(사실 카드)을 LLM에 함께 보냅니다",   // card · rule = 단계 질문(LLM · 수정 17 에 공구 질문에서 옮김)
  rule: "판단은 코드가 하고, LLM은 그 결과를 말로 전합니다",
  next: "단계가 끝나면 다음에 누를 버튼을 안내합니다",
};
type Sfx = [number, string, number?][];
const at = (src: number, from: number, speed: number) => (src - from) / speed;
const SFX_BOOT: Sfx = [[0, "sfx_boot", 0.4], ...[0, 1, 2, 3].map((i): Sfx[number] => [ROW_AT + i * ROW_GAP + ROW_CHECK, "sfx_tick", 0.3]),
  [BANNER_FROM, "sfx_ding", 0.3]];
const SFX_BUTTONS: Sfx = [[0.1, "sfx_scan", 0.18], ...BTN_ORDER.map((n): Sfx[number] => [-(btnIntroAge(n, CHECK_SEC) ?? 0), "sfx_blip", 0.35])];
const SFX_FOUND: Sfx = [[0, "sfx_blip", 0.35]], SFX_CHECK: Sfx = [[0, "sfx_scan", 0.18]];
const C01 = {no: "01", title: "객체 탐지", desc: "카메라 한 대로 버튼 · 손 · 공구를 함께"};
const C02 = {no: "02", title: "판정 기준", desc: "누르기 전에 경고하고, 누르면 막습니다"};
const C03 = {no: "03", title: "음성 비서", desc: "「가디언」으로 부르고 말로 묻습니다"};
const FADE = 0.45;   // 단계 질문 → 안경 벗기(종료) 사이 검게 사라졌다 나타나는 초
const NO_EMO = ["EMO"];   // 공구함의 빨간 손잡이(플라이어)가 EMO 로 잡힘 — 공구 장면에서는 EMO 상자를 그리지 않는다(시안 17 피드백)
const NO_BTN = BTN_ORDER;  // 손 · 공구 절은 버튼 상자를 모두 끔(시안 17 3차 피드백 「손 인식 손 추적 중 · 공구 탐지 중에는 버튼 추적을 꺼줘」)
// 음성 질의 소리(HUD 기록 시계) — 작업자 「가디언」 · 호출 띠링 · 작업자 질문 · (LLM 만) 「확인해 보겠습니다」 · 사실 카드 · 카드가 말풍선에 들어감
const voiceSfx = (a: Say, w: string, llm = true): [number, string, number?][] => [[a.w, "tts_w_wake"], [a.call, "sfx_chime", 0.5], [a.q, w],
  ...(llm ? [[a.ack, "tts_ack"], [a.stt + CARD_IN, "sfx_card", 0.3], [a.stt + CARD_LAND, "sfx_pop", 0.3]] satisfies [number, string, number?][] : [])];
// HUD 시각 소리를 두 구간(재생 → 정지)에 나눠 담는다 — 앞 구간의 HUD 시작 · 길이(화면 초)
//   경계 = 앞 구간 끝 1프레임 전(구간 길이가 1/30초로 반올림돼 경계의 소리가 버려지지 않게)
const split = (xs: [number, string, number?][], hud0: number, len: number, hud1: number) => {
  const cut = hud0 + len - 1 / 30;
  return [xs.filter(([t]) => t < cut).map(([t, n, v]): [number, string, number?] => [t - hud0, n, v]),
    xs.filter(([t]) => t >= cut).map(([t, n, v]): [number, string, number?] => [Math.max(0, t - hud1), n, v])];
};
const V1_LEN = A1.stt - V1_FROM, V1_SFX = split(voiceSfx(A1, "tts_w_tool", false), V1_FROM, V1_LEN, A1.stt);
const V2_LEN = V2_FREEZE - V2_FROM, V2_SFX = split([...voiceSfx(A2, "tts_w_step"), [STEP1_DONE, "sfx_ding", 0.4]], V2_FROM, V2_LEN, V2_FREEZE);

export const FEATURE17: Clip[] = [
  // 인트로 — 로고(5초 · 14차) → 안경 쓰기 ③ → 켜짐 한 장면
  //   14차 「5초로 · 그래도 8초 영상과 비슷하게」 — 2차 판은 8초 전체를 1.6배로 빨리 돌려 모든 움직임이 급했다 → 움직이는 부분은 거의 제 속도로 두고
  //   멈춘 앞뒤를 잘라 냄: 앞 0~0.8(완성 로고가 사라지며 윤곽선으로) · 뒤 6.1~(멈춘 로고 · 소리가 잦아듦) → 윤곽선 · 색 띠 · 채워짐 · 빛 훑기 0.8~6.1 을
  //   1.06배(5.3 → 5.0초) · 소리는 음높이 그대로(sound) · 끝 0.5초에 화면과 소리가 함께 사라짐(Cut 의 볼륨 = 페이드)
  {take: LOGO, file: "proxy.mp4", from: 0.8, to: 6.1, speed: 5.3 / 5, overlay: false, sound: true, fadeIn: 0.3, fadeOut: 0.5},
  {take: G, file: "proxy.mp4", from: 0.5, to: 4.53, speed: 1, overlay: false, fadeIn: 0.5, caption: SUB.glasses},   // 앞 0.5초 = 안경이 들어오기 전 빈 패널(5차 분량 줄이기)
  {take: M, file: "proxy.mp4", from: BOOT_FROM, to: BOOT_TO, speed: (BOOT_TO - BOOT_FROM) / CHECK_SEC, overlay: true, boot: true,
    subs: [[HEAD_AT, CHECK_SEC, SUB.boot]], sfx: SFX_BOOT},
  // 01 객체 탐지 — 버튼(정지 그대로 다음 장면으로 · 손이 보이지 않게) → 손(손이 없는 장면부터 · 다 펴지면 재생 중 손 인식)
  chCard(M, BOOT_TO, C01),
  scCard(M, BOOT_TO, {no: "1", title: "버튼", desc: "콘솔 버튼 5개를 차례로 찾습니다"}),
  hold(M, BOOT_TO, SCAN_HOLD_SEC, {intro: "buttons", caption: SUB.buttons, sfx: SFX_BUTTONS}),
  hold(M, BOOT_TO, 0.2, {caption: SUB.buttons}),   // 5차 분량 줄이기 0.5 → 0.2
  // 손 — 인식(꺾쇠 · 스캔)은 재생 중 손이 뒤집혀 손등이 다 보일 때까지 → 그 프레임에서 멈추고 뼈대 21점 · 「손 추적 시작」 → 멈춘 채로 절이 끝남
  //   (시안 17 5차 피드백 「손 추적이 끝난 배경 정지 상태에서 끝나는 것으로」 — 정지 뒤 손이 나가는 재생 4.35~5.5 는 뺌)
  {...scCard(M, BOOT_TO, {no: "2", title: "손", desc: "손가락 끝까지 21점을 따라갑니다"}), hideBtn: NO_BTN},
  play(BOOT_TO, HAND_IN, {caption: SUB.hand, hideBtn: NO_BTN}),
  play(HAND_IN, HAND_FLIP, {intro: "hand", caption: SUB.hand, sfx: [[0.3, "sfx_scan", 0.18]], hideBtn: NO_BTN}),
  hold(M, HAND_FLIP, HAND_HOLD, {intro: "hand", caption: SUB.hand, sfx: [[0.7, "sfx_blip", 0.35]], hideBtn: NO_BTN}),
  // 01-3 공구 — 렌치를 쥐고 공구함 앞에서 꺼냄 → 전체가 보이면 멈추고 인식 → 재생 · 겹침 · 쥠 판정(스캔) → 멈추고 쥠 확인 → 재생
  //   공구 인식부터 드라이버 장면 끝까지 단계 목록 · 대기 시간을 끈 채로(quiet · 시안 17 3차) · 버튼 상자는 절 전체에서 끔
  //   멈춘 뒤 이어지는 재생은 HUD 시계를 멈춘 만큼 이어 간다(hud — 「렌치 확인 완료」 · 다른 공구 효과가 두 번 나오지 않게)
  {...scCard(M, WR_AT, {no: "3", title: "공구", desc: "필요한 공구를 쥐었는지 확인합니다"}, "tool"), hideBtn: NO_BTN},
  //   자막은 장면 경계와 따로 고르게 나눔(5차 분량 줄이기로 구간이 짧아져 — 꺼냄 1.8 · 찾음 1.2 · 겹침 2.2 · 쥠 판정 2.3초)
  play(WR_AT, TOOL_AT, {run: "tool", caption: SUB.reach, hideBtn: NO_BTN}),
  {...hold(M, TOOL_AT, TOOL_HOLD, {intro: "tool", quiet: true, subs: [[0, 0.3, SUB.reach], [0.3, TOOL_HOLD, SUB.found]], sfx: SFX_FOUND, hideBtn: NO_BTN}), run: "tool"},
  play(TOOL_AT, OVER_AT, {run: "tool", focus: "overlap", quiet: true, subs: [[0, 0.5, SUB.found], [0.5, OVER_AT - TOOL_AT, SUB.overlap]], hideBtn: NO_BTN}),
  play(OVER_AT, GRASP, {run: "tool", intro: "overlap", quiet: true, subs: [[0, 1.2, SUB.overlap], [1.2, GRASP - OVER_AT, SUB.grasp]], sfx: SFX_CHECK, hideBtn: NO_BTN}),
  {...hold(M, GRASP, GRASP_HOLD, {focus: "overlap", quiet: true, caption: SUB.grasp, sfx: [[0, "sfx_ding", 0.4]], hideBtn: NO_BTN}), run: "tool"},
  play(GRASP, WR_TO, {run: "tool", hud: GRASP + GRASP_HOLD, focus: "overlap", quiet: true, caption: SUB.grasp, hideBtn: NO_BTN}),
  // 01-3 다른 공구 — 드라이버를 쥔 손이 공구함 밖에서부터 · 멈추고 인식 → 재생 · 겹침 · 판정 → 멈추고 다른 공구(✕ 없음 · 화면 테두리 경고) → 재생
  play(DRV_FROM, DRV_AT, {run: "other", quiet: true, caption: SUB.other, hideBtn: NO_BTN}),
  {...hold(M, DRV_AT, TOOL_HOLD, {intro: "tool", quiet: true, caption: SUB.other, sfx: SFX_FOUND, hideBtn: NO_BTN}), run: "other"},
  play(DRV_AT, DRV_OVER, {run: "other", focus: "overlap", quiet: true, caption: SUB.other, hideBtn: NO_BTN}),
  //   「필요하지 않은 공구를 쥐면 …」은 쥠 판정(겹침)부터(5차 — 경고 뒤 2.0초로는 짧아 3.5초로)
  play(DRV_OVER, DRV_WRONG, {run: "other", intro: "overlap", quiet: true, caption: SUB.wrong, sfx: SFX_CHECK, hideBtn: NO_BTN}),
  {...hold(M, DRV_WRONG, WRONG_HOLD, {focus: "overlap", quiet: true, caption: SUB.wrong, sfx: [[0, "sfx_wrong", 0.4]], hideBtn: NO_BTN}), run: "other"},
  play(DRV_WRONG, DRV_TO, {run: "other", hud: DRV_WRONG + WRONG_HOLD, focus: "overlap", quiet: true, caption: SUB.wrong, hideBtn: NO_BTN}),
  // 02 판정 기준 — 스침(B1 0.07초 · 빠름) · 경고(B3 로 빠르게 와서 느려짐 · 누르지 않음) · 차단(B3 느려짐 → 경고 → 누름)
  //   스침 · 경고 = 손끝 확대 창 + 속도 계기(meter · 수정 18) — 스침은 「빠르게 지나감 → 경고 없음」 · 경고는 「빠름 → 느려짐 → 바로 경고」
  chCard(M, 12.55, C02, "graze"),
  scCard(M, 12.55, {no: "1", title: "스침", desc: "빠르게 0.3초 안에 떠나면 경고하지 않습니다"}, "graze"),
  {take: M, run: "graze", file: "proxy.mp4", from: 12.55, to: 13.35, speed: GRAZE_SLOW, overlay: true, badge: "0.3×", tip: true, spot: "B1", meter: true, caption: SUB.graze,
    sfx: [[at(GRAZE_IN, 12.55, GRAZE_SLOW), "sfx_tick", 0.3]]},
  //   경고 — 손이 B2 를 떠나 빠르게(계기 파랑) → B3 상자 안에서 느려진 순간 정지(계기 주황 · 경고 · 경고음) → 재생 · 음성 알림 → 정지
  scCard(M, WARN_FROM, {no: "2", title: "경고", desc: "오답 버튼에서 느려지거나 0.3초 이상 머물면"}, "warn"),
  {take: M, run: "warn", file: "proxy.mp4", from: WARN_FROM, to: WARN_SLOW, speed: SLOW, overlay: true, badge: "0.4×", tip: true, spot: "B3", meter: true, caption: SUB.warn},
  {...hold(M, WARN_SLOW, SLOW_HOLD, {tip: true, spot: "B3", meter: true, caption: SUB.warn, sfx: [[0, "sfx_warn", 0.45]]}), run: "warn"},
  {take: M, run: "warn", file: "proxy.mp4", from: WARN_SLOW, to: WARN_TO, speed: SLOW, overlay: true, badge: "0.4×", tip: true, spot: "B3", meter: true, caption: SUB.warn,
    sfx: [[WARN_VOICE, "tts_warn2"]]},
  {...hold(M, WARN_TO, WARN_HOLD, {tip: true, spot: "B3", meter: true, caption: SUB.warn}), run: "warn"},
  // 차단 — B3 로 와서 느려짐 → 경고(경고음) → 무시하고 눌러 → 누른 순간 버튼 색 파동 · 누름 소리 → 멈춘 화면에서 BLOCK_GAP 뒤 차단 · 경보(수정 18)
  scCard(M, BLOCK_FROM, {no: "3", title: "차단", desc: "오답 버튼을 누르면 입력을 막습니다"}, "block"),
  {take: M, run: "block", file: "proxy.mp4", from: BLOCK_FROM, to: BLOCK_FRAME, speed: SLOW, overlay: true, badge: "0.4×", tip: true, spot: "B3", caption: SUB.block,
    sfx: [[at(BLOCK_SLOW, BLOCK_FROM, SLOW), "sfx_warn", 0.45], [at(BLOCK_PRESS, BLOCK_FROM, SLOW), "sfx_press", 0.7]]},
  // ↓ HUD 시계가 흐르는 정지(hud) — 차단 · 경보 · 자물쇠 찰칵(자물쇠가 닫히는 0.24초) · 음성 알림
  {...hold(M, BLOCK_FRAME, BLOCK_GAP + BLOCK_HOLD, {hud: BLOCK_FRAME, tip: true, spot: "B3", caption: SUB.block,
    sfx: [[BLOCK_GAP, "sfx_alarm", 0.5], [BLOCK_GAP + 0.24, "sfx_lock", 0.35], [BLOCK_GAP + BLOCK_VOICE, "tts_block2"]]}), run: "block"},
  // 03-1 공구 질문(즉답) — 작업자 「가디언」 · 질문(남성 TTS) → 받아쓴 순간 정지(HUD 는 흐름) → 코드가 바로 답 → 답을 다 들은 뒤 재생 → 렌치를 쥘 때까지
  //   호출부터 답 직전까지 영상 전체를 흐리고 어둡게(dim · 음성 UI 는 위라 선명) · 공구 탐지 연출 없음 · 오른쪽 위 카드 유지
  chCard(M, V1_FROM, C03, "voice1"),
  scCard(M, V1_FROM, {no: "1", title: "공구 질문", desc: "이 단계에 필요한 공구를 묻기"}, "voice1"),
  {take: M, run: "voice1", file: "proxy.mp4", from: V1_FROM, to: V1_FREEZE, speed: (V1_FREEZE - V1_FROM) / V1_LEN, overlay: true, hud: V1_FROM, noTool: true,
    caption: SUB.call, dim: [A1.call - V1_FROM, V1_LEN], sfx: V1_SFX[0]},
  //   정지 = 「코드 판정 중」(잠깐) → 답을 끝까지 들음 → 재생 · 사실 카드 · 「확인해 보겠습니다」 없음(즉답)
  {...hold(M, V1_FREEZE, V1_GO - A1.stt, {hud: A1.stt, noTool: true, caption: SUB.quick,
    dim: [0, A1.ans - A1.stt], sfx: [...V1_SFX[1], [A1.play - A1.stt, "tts_tool_quick"]]}), run: "voice1"},
  play(V1_FREEZE, V1_TO, {run: "voice1", hud: V1_GO, noTool: true, hideBtn: NO_EMO, caption: SUB.quick}),
  // 03-2 단계 질문(LLM) — B1 누름(1단계 시작) → 손을 떼며 「가디언」 → 질문 → 정지(HUD 는 흐름) · 사실 카드 · 답 · 1단계 완료 → 2단계 안내
  scCard(M, V2_FROM, {no: "2", title: "단계 질문", desc: "지금 무엇을 해야 하는지 묻기"}, "voice2"),
  //   자막 = 재생 내내 「B1을 누르면 …」(시작을 늦춰 호출 전까지 1초뿐이라 · 「가디언이라고 부른 뒤 …」는 공구 질문과 같은 문장이라 여기서는 뺌)
  play(V2_FROM, V2_FREEZE, {run: "voice2", caption: SUB.press1,
    dim: [A2.call - V2_FROM, V2_LEN], sfx: V2_SFX[0]}),
  {...hold(M, V2_FREEZE, V2_END - V2_FREEZE, {hud: V2_FREEZE, factGauge: true,
    //   사실 카드가 말풍선에 들어갈 때까지 「코드가 정한 …」 → 답이 끝날 때까지 「판단은 코드가 …」(수정 17 — 공구 질문이 즉답이 되어 여기로)
    //   「단계가 끝나면 …」은 답이 끝날 때부터(5차 — 1단계 완료 뒤 1.2초로는 짧아 1.8초로)
    subs: [[0, A2.stt + CARD_LAND - V2_FREEZE, SUB.card], [A2.stt + CARD_LAND - V2_FREEZE, A2.done - V2_FREEZE, SUB.rule],
      [A2.done - V2_FREEZE, V2_END - V2_FREEZE, SUB.next]],
    dim: [0, A2.ans - V2_FREEZE], sfx: [...V2_SFX[1], [A2.play - V2_FREEZE, "tts_step1"]], fadeOut: FADE}), run: "voice2"},
  // 끝 — 안경 벗기(연결 작업은 나중 · 사용자) · 검게 사라짐
  //   벗기 시작에 HUD 꺼짐(시안 17 4차 「시스템 종료 연출 · 분량은 길지 않게」 — 1.4초 · 벗는 영상 위에 겹침)
  //   단계 질문 끝에서 검게 사라졌다가 나타남(시안 17 5차 「갑자기 넘어가서 페이드 인 · 아웃」) · 꺼짐은 페이드 인이 거의 끝난 뒤
  //   12차 「종료할 때 검정 화면으로」 — 안경이 화면 밖으로 다 빠진 1.1초쯤 화면 전체가 한 줄 → 점 → 검정(1.75) · 꺼지는 소리도 그때
  //   · 검정은 0.5초만 두고 끝(2.73 → 2.25 · 그 뒤는 빈 패널이었다)
  {take: GO, file: "proxy.mp4", from: 0, to: 2.25, speed: 1, overlay: false, fadeIn: FADE, shutdown: FADE - 0.1,
    sfx: [[FADE - 0.1 + 0.7, "sfx_off", 0.45]]},
];
