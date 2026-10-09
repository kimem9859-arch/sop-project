import {CHECK_SEC, SCAN_HOLD_SEC} from "../lib/boot.ts";
import type {Clip} from "../lib/edit.ts";
import type {StagedEv, StagedPress} from "../lib/staged.ts";

// 기능 소개 영상 시안 2(2026-10-09) — 사용자 「시나리오 흐름보다 기능적 소개 영상 흐름」 · 발표 자료에 넣을 영상 1개 · 시안 1 피드백 반영
//   오프닝 → 01 객체 탐지(버튼 · 손 · 공구) → 02 판정 기준(정답 · 스침 · 경고 · 차단 · 타워램프) → 03 음성 비서(단계 질문 · 공구 질문) · 끝맺음 뺌
// 🔴 실제 기록이 없는 시안 — 상태 · 경고 · 음성 · 사실 카드 표시는 화면을 보고 꾸민 연출(lib/staged) · 박스 · 손 · 공구는 실제 검출
//   재료 = 10/9 정상 시나리오(T) · 10/8 시험 B 가로 띠(B34 — 스침 · 경고 · 차단) · 10/8 시험 B 세로(BP — 다른 공구 · 타워램프)
//   사실 카드 · 음성 알림 문장 = Rpi5/Demo/voice_card(build_card · alert_texts) 출력 그대로(카드는 줄을 골라 줄임)
const G = "20261009_glasses", T = "20261009_pre", B34 = "20261008_phoneB_land34", BP = "20261008_phoneB";
export const FEATURE_SYNTH = "시안 · 상태 · 경고 · 음성 표시는 영상을 보고 꾸민 연출(실제 기록 아님)";
const V = "voice" as const;

// T — 정상 시나리오 누름 · 렌치 = 공구 탐지 연출(25.4) 뒤 확인 시작 → 1초마다 3번째(27.4)에 쥠
const T_PRESSES: StagedPress[] = [
  {button: "B1", t: 6.44, sub: {label: "플라즈마 클린 진행", sec: 10}},
  {button: "B2", t: 19.52, sub: {label: "N2 퍼지", sec: 10}, tool: {want: "wrench", seen: 25.4, grasped: 27.4}},
  {button: "B3", t: 36.95, sub: {label: "전극 온도 하강", sec: 10}},
  {button: "B4", t: 50.98},
];
const ask = (wake: number, q: string, card: string[], a: string, aAt: number, aEnd: number): StagedEv[] => [
  {t: wake, kind: "wake", d: {}, src: V},
  {t: wake + 1.3, kind: "stt", d: {text: q}, src: V},
  {t: wake + 1.35, kind: "card", d: {lines: card}, src: V},
  {t: wake + 1.6, kind: "play_start", d: {}, src: V},                 // 「확인해 보겠습니다」(실제 = LLM 과 겹쳐 재생)
  {t: wake + 2.7, kind: "play_end", d: {what: "완료"}, src: V},
  {t: aAt, kind: "answer", d: {src: "llm", text: a}, src: V},
  {t: aAt + 0.1, kind: "play_start", d: {}, src: V},
  {t: aEnd, kind: "play_end", d: {what: "완료"}, src: V},
];
const T_VOICE: StagedEv[] = [
  ...ask(20.6, "지금 필요한 공구가 뭐야?", [
    "지금 할 일: 렌치를 찾아 쥔다 — 쥐고 약 8초가 지나면 자동으로 3단계로 넘어간다",
    "현재 진행 중인 단계: 2단계 「펌프/퍼지」 — 아직 끝나지 않음 · 이 단계의 버튼: B2",
    "2단계의 서브작업: N2 퍼지 10초 · 2단계에 필요한 공구 = 렌치",
    "공구 상황: 렌치를 찾아야 한다",
    "카메라에 지금 보이는 공구: 없음 (보고 있지만 아무 공구도 안 보인다)",
    "이 시스템이 모르는 것: 가스·압력·온도 같은 장비 센서 값 · 다른 작업자",
  ], "이 단계에는 렌치가 필요하니 렌치를 찾아 손으로 쥐세요.", 25.4, 28.2),
  ...ask(38.1, "다음 단계 뭐야?", [
    "지금 할 일: 기다린다 — 약 8초 뒤 자동으로 4단계로 넘어간다",
    "현재 진행 중인 단계: 3단계 「전극 냉각」 — 아직 끝나지 않음 · 이 단계의 버튼: B3",
    "끝난 단계: 1단계 「클린·가스차단」 · 2단계 「펌프/퍼지」",
    "순서 판정: 정상 (경고·차단 없음)",
    "그 다음에 올 단계: 4단계 「챔버 벤트」 · 버튼 B4 (현재 단계가 끝난 뒤에만 누른다)",
    "이 시스템이 모르는 것: 가스·압력·온도 같은 장비 센서 값 · 다른 작업자",
  ], "지금은 전극 온도를 낮추는 중이니 끝날 때까지 기다리세요.", 42.9, 45.6),
];
// B34 — 차례 B1 · 스침(검지가 B4 상자에 6.17~6.24) · 경고(B3 상자 7.13~ → 0.3초 뒤) · 차단(B2 누름 8.0) — 절마다 따로 꾸민다
const B_GRAZE: StagedEv[] = [
  {t: 6.24, kind: "state", d: {old: "MONITOR", new: "PROCESS_RUN", expected: "B1", dwell_roi: "B4", dwell_start_ms: 6170}},
  {t: 6.6, kind: "state", d: {old: "PROCESS_RUN", new: "MONITOR", expected: "B1"}},
];
const B_WARN: StagedEv[] = [
  {t: 7.43, kind: "state", d: {old: "MONITOR", new: "WARNING", expected: "B1", dwell_roi: "B3", dwell_start_ms: 7130}},
  {t: 7.46, kind: "alert", d: {key: "alert_warn_B1", state: "WARNING"}, src: V},
  {t: 7.55, kind: "play_start", d: {}, src: V},
];
const B_BLOCK: StagedEv[] = [
  {t: 8.0, kind: "gpio_edge", d: {button: "B2", src: "edge"}},
  {t: 8.0, kind: "press", d: {button: "B2", source: "gpio", expected: "B1", state: "MONITOR"}},
  {t: 8.0, kind: "state", d: {old: "MONITOR", new: "BLOCK", expected: "B1"}},
  {t: 8.03, kind: "alert", d: {key: "alert_block_B1", state: "BLOCK"}, src: V},
  {t: 8.1, kind: "play_start", d: {}, src: V},
];
// BP — 차례 B2(렌치 필요) 중 드라이버를 쥠(검출이 이어지는 42.0~ · 다른 공구는 바로 경고 — tool_state) · 타워램프(검지 B3 70.17~ → 경고 → 램프 황색 70.9)
const BP_TOOL: StagedEv[] = [
  {t: 42.2, kind: "wrong_tool", d: {want: "wrench", got: "driver"}},
  ...[42.4, 43.4, 44.4, 45.4, 46.4].map((t): StagedEv => ({t, kind: "tool_scan", d: {hand: true, seen: ["driver"], tool: null, phase: "search", want: "wrench"}})),
];
const BP_LAMP: StagedEv[] = [
  {t: 70.47, kind: "state", d: {old: "MONITOR", new: "WARNING", expected: "B1", dwell_roi: "B3", dwell_start_ms: 70170}},
  {t: 70.5, kind: "alert", d: {key: "alert_warn_B1", state: "WARNING"}, src: V},
  {t: 70.6, kind: "play_start", d: {}, src: V},
];
export const FEATURE_STAGED = {
  [T]: {start: 1, presses: T_PRESSES},
  [`${T}#voice`]: {start: 1, presses: T_PRESSES, extra: T_VOICE},
  [`${B34}#graze`]: {start: 3, presses: [], first: "B1", extra: B_GRAZE},
  [`${B34}#warn`]: {start: 3, presses: [], first: "B1", extra: B_WARN},
  [`${B34}#block`]: {start: 3, presses: [], first: "B1", extra: B_BLOCK},
  [`${BP}#tool`]: {start: 30, presses: [{button: "B1", t: 31, sub: {label: "플라즈마 클린 진행", sec: 1}}, {button: "B2", t: 36.5, sub: {label: "N2 퍼지", sec: 20}},
    {button: "B3", t: 70}], extra: BP_TOOL},                       // B3 = B2 가 판의 마지막 누름(완주)으로 읽히지 않게
  [`${BP}#lamp`]: {start: 60, presses: [], first: "B1", extra: BP_LAMP},
};

const HAND_AT = 5.73, HAND_HOLD = 1.6;   // 손 첫 등장 3.23초 + 2.5초 여유
const TOOL_AT = 25.4, TOOL_HOLD = 1.4, OVERLAP_HOLD = 1.6; // 렌치 첫 등장 24.6초 + 0.8초 여유
// 타워램프 머리 자리(BP 사본 720×1280 · 색 밝기로 찾음) — 카메라가 돌아 오른쪽으로 흐른다
const LAMP: [number, number, number, number, number][] = [
  [69.6, 366, 18, 46, 150], [70.0, 382, 20, 46, 150], [70.3, 392, 24, 46, 146], [70.6, 404, 28, 44, 138],
  [70.8, 428, 32, 40, 128], [71.0, 460, 24, 40, 132], [71.2, 500, 16, 46, 140], [71.4, 552, 10, 50, 146],
];

export const FEATURE: Clip[] = [
  // 오프닝 — 안경 → 비전 감시 시작 점검 → 점검 완료
  {take: G, file: "proxy.mp4", from: 27.6, to: 32.35, speed: 1, overlay: false},
  {take: T, file: "proxy.mp4", from: 0, to: CHECK_SEC, speed: 1, overlay: true, boot: true,
    caption: "시안 — 상태 · 경고 · 음성 표시는 영상을 보고 꾸민 연출입니다"},
  // 01 객체 탐지
  {take: T, file: "proxy.mp4", from: CHECK_SEC, to: CHECK_SEC, speed: 1, overlay: true, hold: SCAN_HOLD_SEC, intro: "buttons",
    chapter: {no: "01", title: "객체 탐지", desc: "카메라 한 대로 버튼 · 손 · 공구를 함께"},
    section: {no: "1", title: "버튼", desc: "콘솔 버튼 5개를 찾습니다"}},
  {take: T, file: "proxy.mp4", from: CHECK_SEC, to: HAND_AT, speed: 1, overlay: true},
  {take: T, file: "proxy.mp4", from: HAND_AT, to: HAND_AT, speed: 1, overlay: true, hold: HAND_HOLD, intro: "hand",
    section: {no: "2", title: "손", desc: "손가락 끝까지 21점을 따라갑니다"}},
  {take: T, file: "proxy.mp4", from: 19.0, to: TOOL_AT, speed: 1, overlay: true,
    section: {no: "3", title: "공구", desc: "필요한 공구를 쥐었는지 확인합니다"}},                     // B2 누름 19.52 → 렌치 찾는 중
  {take: T, file: "proxy.mp4", from: TOOL_AT, to: TOOL_AT, speed: 1, overlay: true, hold: TOOL_HOLD, intro: "tool"},
  {take: T, file: "proxy.mp4", from: TOOL_AT, to: TOOL_AT, speed: 1, overlay: true, hold: OVERLAP_HOLD, intro: "overlap"},
  {take: T, file: "proxy.mp4", from: TOOL_AT, to: 28.6, speed: 1, overlay: true},                  // 확인 1·2 → 27.4 쥠 확인
  {take: BP, run: "tool", file: "proxy.mp4", from: 42.0, to: 46.5, speed: 1, overlay: true,
    caption: "필요하지 않은 공구를 쥐면 바로 경고합니다"},
  // 02 판정 기준
  {take: T, file: "proxy.mp4", from: 5.9, to: 8.6, speed: 1, overlay: true,
    chapter: {no: "02", title: "판정 기준", desc: "누르기 전에 경고하고, 누르면 막습니다"},
    section: {no: "1", title: "정답 버튼 입력", desc: "차례에 맞는 버튼은 그대로 진행"}},          // B1 6.44
  {take: B34, run: "graze", file: "proxy.mp4", from: 5.9, to: 6.9, speed: 0.5, overlay: true, badge: "0.5×",
    section: {no: "2", title: "스침", desc: "0.3초 안에 떠나면 경고하지 않습니다"}},
  {take: B34, run: "warn", file: "proxy.mp4", from: 6.8, to: 7.8, speed: 0.5, overlay: true, badge: "0.5×",
    section: {no: "3", title: "경고", desc: "오답 버튼에 0.3초 이상 머물면"}},                      // 머묾 7.13 → 경고 7.43
  {take: B34, run: "warn", file: "proxy.mp4", from: 7.8, to: 7.8, speed: 1, overlay: true, hold: 1.8, badge: "일시 정지"},
  {take: B34, run: "block", file: "proxy.mp4", from: 7.7, to: 8.4, speed: 0.5, overlay: true, badge: "0.5×",
    section: {no: "4", title: "차단", desc: "오답 버튼을 누르면 입력을 막습니다"}},                   // B2 누름 8.0
  {take: B34, run: "block", file: "proxy.mp4", from: 8.4, to: 10.4, speed: 1, overlay: true},          // 모니터에도 차단 화면
  {take: BP, run: "lamp", file: "proxy.mp4", from: 69.9, to: 71.5, speed: 0.5, overlay: true, badge: "0.5×",
    section: {no: "5", title: "타워램프", desc: "경고와 차단을 램프로도 알립니다"},
    callout: {label: "타워램프", lines: [{text: "경고 → 황색", color: "warn"}, {text: "차단 → 적색 + 부저", color: "danger"}], keys: LAMP}},
  // 03 음성 비서
  {take: T, run: "voice", file: "proxy.mp4", from: 37.6, to: 46.6, speed: 1, overlay: true,
    chapter: {no: "03", title: "음성 비서", desc: "「가디언」으로 부르고 말로 묻습니다"},
    section: {no: "1", title: "단계 질문", desc: "지금 무엇을 해야 하는지"}},
  {take: T, run: "voice", file: "proxy.mp4", from: 20.2, to: 29.6, speed: 1, overlay: true,
    section: {no: "2", title: "공구 질문", desc: "이 단계에 필요한 공구"}},
];
