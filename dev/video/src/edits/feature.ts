import {CHECK_SEC, SCAN_HOLD_SEC} from "../lib/boot.ts";
import type {Clip} from "../lib/edit.ts";
import type {StagedEv, StagedPress} from "../lib/staged.ts";

// 기능 소개 영상 시안 4(2026-10-10 · 시안 3 피드백 14건) — 시안 3 「천천히 · 독립 제목 카드」 · 시안 2 「장 · 절」 · 사용자 「발표 자료에 넣을 기능 소개 영상 1개」
//   인트로(안경 → 가상 세계) → 01 객체 탐지(버튼 · 손 · 공구) → 02 판정 기준(정답 · 스침 · 경고 · 차단 · 타워램프) → 03 음성 비서(단계 · 공구 질문)
// 🔴 실제 기록이 없는 시안 — 상태 · 경고 · 음성 · 사실 카드 표시는 화면을 보고 꾸민 연출(lib/staged) · 박스 · 손 · 공구는 실제 검출
//   재료 = 10/9 정상 시나리오(T) · 10/8 시험 B 가로 띠(B34 — 스침 · 경고 · 차단) · 10/8 시험 B 세로(BP — 다른 공구 · 타워램프)
//   사실 카드 · 음성 알림 문장 = Rpi5/Demo/voice_card(build_card · alert_texts) 출력 그대로(카드는 줄을 골라 줄임)
// ⚠️ 실제 시스템과 다른 연출(사용자 결정 대기 — 보고 참조): 다른 공구 앞의 「공구 확인 중」(실제는 바로 경고) · 다른 공구 때 대기 시간 멈춤(실제는 순서 경고 때만)
const G = "20261009_glasses", T = "20261009_pre", B34 = "20261008_phoneB_land34", BP = "20261008_phoneB";
export const FEATURE_SYNTH = "시안 · 상태 · 경고 · 음성 표시는 영상을 보고 꾸민 연출(실제 기록 아님)";
const V = "voice" as const;

// T — 정상 시나리오 누름 · 렌치 = 공구 탐지 정지(25.4 · 찾는 중) 뒤 겹침 정지(25.45)부터 확인 → 1초마다 3번째(27.45)에 쥠
const T_PRESSES: StagedPress[] = [
  {button: "B1", t: 6.44, sub: {label: "플라즈마 클린 진행", sec: 10}},
  {button: "B2", t: 19.52, sub: {label: "N2 퍼지", sec: 10}, tool: {want: "wrench", seen: 25.45, grasped: 27.45}},
  {button: "B3", t: 36.95, sub: {label: "전극 온도 하강", sec: 10}},
  {button: "B4", t: 50.98},
];
// 음성 질의 — 호출 → (sttGap) 질문 · 사실 카드 → 「확인해 보겠습니다」(LLM 과 겹쳐 재생) → 카드가 말풍선에 들어간 뒤(질문 + 5초) 답
const ask = (wake: number, sttGap: number, q: string, card: string[], a: string, aEnd: number): StagedEv[] => [
  {t: wake, kind: "wake", d: {}, src: V},
  {t: wake + sttGap, kind: "stt", d: {text: q}, src: V},
  {t: wake + sttGap + 0.05, kind: "card", d: {lines: card}, src: V},
  {t: wake + sttGap + 0.3, kind: "play_start", d: {}, src: V},
  {t: wake + sttGap + 1.4, kind: "play_end", d: {what: "완료"}, src: V},
  {t: wake + sttGap + 5.0, kind: "answer", d: {src: "llm", text: a}, src: V},
  {t: wake + sttGap + 5.1, kind: "play_start", d: {}, src: V},
  {t: aEnd, kind: "play_end", d: {what: "완료"}, src: V},
];
const T_VOICE: StagedEv[] = [
  ...ask(20.7, 1.3, "지금 필요한 공구가 뭐야?", [
    "지금 할 일: 렌치를 찾아 쥔다 — 쥐고 약 8초가 지나면 자동으로 3단계로 넘어간다",
    "현재 진행 중인 단계: 2단계 「펌프/퍼지」 — 아직 끝나지 않음 · 이 단계의 버튼: B2",
    "2단계의 서브작업: N2 퍼지 10초 · 2단계에 필요한 공구 = 렌치",
    "공구 상황: 렌치를 찾아야 한다",
    "카메라에 지금 보이는 공구: 없음 (보고 있지만 아무 공구도 안 보인다)",
    "이 시스템이 모르는 것: 가스·압력·온도 같은 장비 센서 값 · 다른 작업자",
  ], "이 단계에는 렌치가 필요하니 렌치를 찾아 손으로 쥐세요.", 29.8),
  ...ask(38.3, 1.6, "다음 단계 뭐야?", [
    "지금 할 일: 기다린다 — 약 8초 뒤 자동으로 4단계로 넘어간다",
    "현재 진행 중인 단계: 3단계 「전극 냉각」 — 아직 끝나지 않음 · 이 단계의 버튼: B3",
    "끝난 단계: 1단계 「클린·가스차단」 · 2단계 「펌프/퍼지」",
    "순서 판정: 정상 (경고·차단 없음)",
    "그 다음에 올 단계: 4단계 「챔버 벤트」 · 버튼 B4 (현재 단계가 끝난 뒤에만 누른다)",
    "이 시스템이 모르는 것: 가스·압력·온도 같은 장비 센서 값 · 다른 작업자",
  ], "지금은 전극 온도를 낮추는 중이니 끝날 때까지 기다리세요.", 47.7),
];
// B34 — 차례 B1 · 스침(검지가 B4 상자에 6.17~6.24) · 경고(B3 상자 7.13~ — 화면을 멈추고 타이머를 채운 뒤 바로 경고) · 차단(B2 상자 7.88~ → 8.0 누름)
const B_GRAZE: StagedEv[] = [
  {t: 6.24, kind: "state", d: {old: "MONITOR", new: "PROCESS_RUN", expected: "B1", dwell_roi: "B4", dwell_start_ms: 6170}},
  {t: 6.6, kind: "state", d: {old: "PROCESS_RUN", new: "MONITOR", expected: "B1"}},
];
const B_WARN: StagedEv[] = [
  {t: 7.135, kind: "state", d: {old: "MONITOR", new: "WARNING", expected: "B1", dwell_roi: "B3", dwell_start_ms: 7130}},
  {t: 7.14, kind: "alert", d: {key: "alert_warn_B1", state: "WARNING"}, src: V},
  {t: 7.2, kind: "play_start", d: {}, src: V},
];
const B_BLOCK: StagedEv[] = [
  {t: 8.0, kind: "gpio_edge", d: {button: "B2", src: "edge"}},
  {t: 8.0, kind: "press", d: {button: "B2", source: "gpio", expected: "B1", state: "MONITOR"}},
  {t: 8.0, kind: "state", d: {old: "MONITOR", new: "BLOCK", expected: "B1", dwell_roi: "B2", dwell_start_ms: 7880}},
  {t: 8.03, kind: "alert", d: {key: "alert_block_B1", state: "BLOCK"}, src: V},
  {t: 8.1, kind: "play_start", d: {}, src: V},
];
// BP — 차례 B2(렌치 필요) · 손이 공구함으로(37.0~) → 드라이버(39.0~ 검출 · 탐지 정지 39.8) → 겹침 정지(39.85 확인 시작) → 40.35 다른 공구 · 대기 멈춤
const BP_TOOL: StagedEv[] = [
  ...[37.0, 38.0, 39.0].map((t): StagedEv => ({t, kind: "tool_scan", d: {hand: true, seen: [], tool: null, phase: "search", want: "wrench"}})),
  {t: 39.85, kind: "tool_scan", d: {hand: true, seen: ["driver"], tool: null, phase: "checking", want: "wrench"}},
  {t: 40.35, kind: "wrong_tool", d: {want: "wrench", got: "driver"}},
  {t: 40.35, kind: "sub", d: {what: "pause", button: "B2"}},
  {t: 50.0, kind: "sub", d: {what: "resume", button: "B2"}},      // 장면 밖에서 이어 감(멈춘 동안 남은 초가 그대로 보이게)
];
// BP — 타워램프(검지 B3 70.17~ → 경고 → 램프 황색 70.9) · 시험 촬영 때 고침(사용자)
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

const GLASSES_OFF = 32.75;                 // 안경 테가 화면에서 완전히 빠진 순간(32.73 · 흰 픽셀 0)
const BOOT_FROM = 3.24, BOOT_SPEED = BOOT_FROM / CHECK_SEC; // 가상 세계 + 점검 목록 + 단계 목록 = 손이 들어오기 전 3.24초를 느리게
const HAND_AT = 5.73, HAND_HOLD = 2.9;     // 손 첫 등장 3.23초 + 2.5초 여유 · 연출 2.6초 + 머묾
const TOOL_AT = 25.4, TOOL_HOLD = 1.8, OVERLAP_AT = 25.45, OVERLAP_HOLD = 2.2; // 렌치 첫 등장 24.6초 + 0.8초 여유
const CH = 2.8, SC = 2.2, SLOW = 0.4, GRAZE_SLOW = 0.25, DWELL_HOLD = 1.8, BLOCK_HOLD = 4.5;
// 제목 카드 = 다음 장면 첫 화면을 멈추고 어둡게 한 위에(card · HUD 도 함께 흐리게) — 장 · 절 따로
type Ch = NonNullable<Clip["chapter"]>;
type Sc = NonNullable<Clip["section"]>;
const chCard = (take: string, at: number, chapter: Ch, run?: string): Clip =>
  ({take, run, file: "proxy.mp4", from: at, to: at, speed: 1, overlay: true, hold: CH, card: "chapter", chapter});
const scCard = (take: string, at: number, section: Sc, run?: string): Clip =>
  ({take, run, file: "proxy.mp4", from: at, to: at, speed: 1, overlay: true, hold: SC, card: "section", section});
const hold = (take: string, at: number, sec: number, extra: Partial<Clip> = {}): Clip =>
  ({take, file: "proxy.mp4", from: at, to: at, speed: 1, overlay: true, hold: sec, ...extra});
const C01 = {no: "01", title: "객체 탐지", desc: "카메라 한 대로 버튼 · 손 · 공구를 함께"};
const C02 = {no: "02", title: "판정 기준", desc: "누르기 전에 경고하고, 누르면 막습니다"};
const C03 = {no: "03", title: "음성 비서", desc: "「가디언」으로 부르고 말로 묻습니다"};
// 타워램프 머리 자리(BP 사본 720×1280 · 색 밝기로 찾음) — 카메라가 돌아 오른쪽으로 흐른다
const LAMP: [number, number, number, number, number][] = [
  [69.6, 366, 18, 46, 150], [70.0, 382, 20, 46, 150], [70.3, 392, 24, 46, 146], [70.6, 404, 28, 44, 138],
  [70.8, 428, 32, 40, 128], [71.0, 460, 24, 40, 132], [71.2, 500, 16, 46, 140], [71.4, 552, 10, 50, 146],
];

export const FEATURE: Clip[] = [
  // 인트로 — 안경 쓰기 → 테가 빠진 직후 가상 세계 펼침(시험 촬영에서는 한 장면으로 이어진다) → 비전 감시 시작 · 점검 완료 → 단계 목록 「작업 시작」
  {take: G, file: "proxy.mp4", from: 27.6, to: GLASSES_OFF, speed: 1, overlay: false},
  {take: T, file: "proxy.mp4", from: 0, to: BOOT_FROM, speed: BOOT_SPEED, overlay: true, boot: true,
    caption: "시안 — 상태 · 경고 · 음성 표시는 영상을 보고 꾸민 연출입니다"},
  // 01 객체 탐지
  chCard(T, BOOT_FROM, C01),
  scCard(T, BOOT_FROM, {no: "1", title: "버튼", desc: "콘솔 버튼 5개를 차례로 찾습니다"}),
  hold(T, BOOT_FROM, SCAN_HOLD_SEC, {intro: "buttons"}),                       // 스캔 왕복 → 버튼 강조 B1 … EMO → 「감시 중」
  {take: T, file: "proxy.mp4", from: BOOT_FROM, to: HAND_AT, speed: 1, overlay: true},
  scCard(T, HAND_AT, {no: "2", title: "손", desc: "손가락 끝까지 21점을 따라갑니다"}),
  hold(T, HAND_AT, HAND_HOLD, {intro: "hand"}),
  {take: T, file: "proxy.mp4", from: HAND_AT, to: 6.3, speed: 1, overlay: true},
  scCard(T, 19.1, {no: "3", title: "공구", desc: "필요한 공구를 쥐었는지 확인합니다"}),  // 19.1 = 1단계 완료 안내(~19.04)가 끝난 뒤
  {take: T, file: "proxy.mp4", from: 19.1, to: TOOL_AT, speed: 1, overlay: true},    // B2 누름 19.52 → 렌치 찾는 중
  hold(T, TOOL_AT, TOOL_HOLD, {intro: "tool"}),
  hold(T, OVERLAP_AT, OVERLAP_HOLD, {intro: "overlap"}),                         // 손 구역 · 공구 겹침 → 공구 확인 중
  {take: T, file: "proxy.mp4", from: OVERLAP_AT, to: 28.8, speed: 1, overlay: true},  // 확인 1·2 → 27.45 렌치 확인 완료
  // 01 공구 — 다른 공구(손이 공구함으로 가는 순간부터 · 정답 공구와 같은 연출 → 빨강 오답 · 대기 멈춤)
  {take: BP, run: "tool", file: "proxy.mp4", from: 37.0, to: 39.8, speed: 1, overlay: true, caption: "필요하지 않은 공구를 쥐면 바로 경고합니다"},
  {...hold(BP, 39.8, TOOL_HOLD, {intro: "tool"}), run: "tool"},
  {...hold(BP, 39.85, OVERLAP_HOLD, {intro: "overlap"}), run: "tool"},
  {take: BP, run: "tool", file: "proxy.mp4", from: 39.85, to: 40.9, speed: 0.5, overlay: true, badge: "0.5×"}, // 40.35 다른 공구
  {...hold(BP, 40.9, 1.2), run: "tool"},
  // 02 판정 기준
  chCard(T, 35.2, C02),
  scCard(T, 35.2, {no: "1", title: "정답 버튼 입력", desc: "차례에 맞는 버튼은 그대로 진행"}),
  {take: T, file: "proxy.mp4", from: 35.2, to: 38.8, speed: 1, overlay: true},      // 손 없음 → B3 누름 36.95
  scCard(B34, 5.9, {no: "2", title: "스침", desc: "0.3초 안에 떠나면 경고하지 않습니다"}, "graze"),
  {take: B34, run: "graze", file: "proxy.mp4", from: 5.9, to: 6.9, speed: GRAZE_SLOW, overlay: true, badge: "0.25×"},
  scCard(B34, 6.8, {no: "3", title: "경고", desc: "오답 버튼에 0.3초 이상 머물면"}, "warn"),
  {take: B34, run: "warn", file: "proxy.mp4", from: 6.8, to: 7.13, speed: SLOW, overlay: true, badge: "0.4×"},
  {...hold(B34, 7.13, DWELL_HOLD, {intro: "dwell"}), run: "warn"},             // 손가락이 B3 에 닿은 순간 멈춤 · 0.3초 타이머
  {take: B34, run: "warn", file: "proxy.mp4", from: 7.13, to: 7.85, speed: SLOW, overlay: true, badge: "0.4×"}, // 경고 → 손이 움직임
  scCard(B34, 7.0, {no: "4", title: "차단", desc: "오답 버튼을 누르면 입력을 막습니다"}, "block"),
  {take: B34, run: "block", file: "proxy.mp4", from: 7.0, to: 8.05, speed: SLOW, overlay: true, badge: "0.4×"}, // B3 옆 → B2 상자 7.88 → 누름 8.0
  {...hold(B34, 8.05, BLOCK_HOLD), run: "block"},                                // 차단 — 화면 멈춤 · 차단 그래픽 · 음성 알림 · 해제 버튼
  scCard(BP, 69.9, {no: "5", title: "타워램프", desc: "경고와 차단을 램프로도 알립니다"}, "lamp"),
  {take: BP, run: "lamp", file: "proxy.mp4", from: 69.9, to: 71.5, speed: SLOW, overlay: true, badge: "0.4×",
    callout: {label: "타워램프", lines: [{text: "경고 → 황색", color: "warn"}, {text: "차단 → 적색 + 부저", color: "danger"}], keys: LAMP}},
  // 03 음성 비서 — 시작 = 앞 누름 파동이 끝난 뒤(B3 37.95 · B2 20.52) · 단계 질문은 3단계 완료 안내 뒤 2초 여유
  chCard(T, 38.0, C03, "voice"),
  scCard(T, 38.0, {no: "1", title: "단계 질문", desc: "지금 무엇을 해야 하는지 묻기"}, "voice"),
  {take: T, run: "voice", file: "proxy.mp4", from: 38.0, to: 49.4, speed: 1, overlay: true},
  scCard(T, 20.6, {no: "2", title: "공구 질문", desc: "이 단계에 필요한 공구를 묻기"}, "voice"),
  {take: T, run: "voice", file: "proxy.mp4", from: 20.6, to: 30.4, speed: 1, overlay: true},
];
