import {BANNER_FROM, BTN_ORDER, CHECK_SEC, ROW_AT, ROW_CHECK, ROW_GAP, SCAN_HOLD_SEC, WORLD_SEC, btnIntroAge} from "../lib/boot.ts";
import type {Clip} from "../lib/edit.ts";
import type {StagedEv, StagedPress} from "../lib/staged.ts";
import {TTS_SEC} from "./ttsSec.ts";

// 기능 소개 영상 시안 16(2026-10-10 · 사용자 「F1 목소리로 발표 영상에」 → TTS = Supertonic 3 F1(tools/tts_supertonic.py) · 단계 질문 0.7초 · 효과음은 시안 14)
//   · 기능 소개 영상 시안 14(2026-10-10 · 사용자 「공구 확대 창 제거 · 추천 효과음 · 음성비서 답변 TTS」 → 효과음 sfx · TTS = 실제 시스템 합성기)
//   · 기능 소개 영상 시안 13(2026-10-10 · 사용자 「기존 자막을 제거하고 장면에 맞는 자막 · 문장 검토는 korean-skills」 → SUB 표 · 자막 트랙)
//   · 기능 소개 영상 시안 12(2026-10-10 · 사용자 「실제 본 영상이 시작할 때 페이드인」 → 안경 장면 처음 0.5초 검은 화면에서 나타남)
//   · 기능 소개 영상 시안 11(2026-10-10 · 사용자 「첨부 영상을 영상 맨 앞부분에 … 시간 상관 없이」 → 로고 인트로를 안경 장면 앞에 · 「뒷부분 2초만 잘라서」 = 0~8초 · 소리 그대로 · 끝 0.5초 검게)
//   · 기능 소개 영상 시안 10(2026-10-10 · 시안 9 효과 검토 — 장 전환 약하게 · 화면 질감과 상시 테두리 뺌 · 사실 카드 빛줄기 + 암호 풀림 · 탐지 확대 창 더함)
//   · 시안 9(시안 8 「테크적이고 화려하게」 → 추천 5개 — 장 전환 · 검지 끝 빛 꼬리 · 경고/차단 순간 · 듣는 중 파동)
//   · 시안 8(시안 7 피드백 「정답 입력 절을 빼고 공구 질문 절을 넣어 1분 30초로」 — 03 = 공구 질문 → 단계 질문(원본 시간 순))
//   · 시안 7(시안 6 피드백 「1분 30초 정도」 — 카드 · 정지 · 구간을 줄임) · 시안 4(시안 3 피드백 14건) — 시안 3 「천천히 · 독립 제목 카드」 · 시안 2 「장 · 절」 · 사용자 「발표 자료에 넣을 기능 소개 영상 1개」
//   인트로(안경 → 가상 세계) → 01 객체 탐지(버튼 · 손 · 공구) → 02 판정 기준(스침 · 경고 · 차단 · 타워램프) → 03 음성 비서(공구 · 단계 질문)
// 🔴 실제 기록이 없는 시안 — 상태 · 경고 · 음성 · 사실 카드 표시는 화면을 보고 꾸민 연출(lib/staged) · 박스 · 손 · 공구는 실제 검출
//   재료 = 10/9 정상 시나리오(T) · 10/8 시험 B 가로 띠(B34 — 스침 · 경고 · 차단) · 10/8 시험 B 세로(BP — 다른 공구 · 타워램프)
//   사실 카드 · 음성 알림 문장 = Rpi5/Demo/voice_card(build_card · alert_texts) 출력 그대로(카드는 줄을 골라 줄임)
// ⚠️ 실제 시스템과 다른 연출(사용자 결정 대기 — 보고 참조): 다른 공구 앞의 「공구 확인 중」(실제는 검지 끝이 그 공구 박스에 든 첫 검사에 바로 경고)
//   · 대기 시간은 멈추지 않는다 — 다른 공구 경고가 뜨면 화면을 멈추고 경고 연출만 이어 간 뒤 다음 장면(사용자 10/10)
const G = "20261009_glasses", T = "20261009_pre", B34 = "20261008_phoneB_land34", BP = "20261008_phoneB";
const LOGO = "intro_logo";   // 로고 인트로(사용자 제공 · 생성형 AI 영상 1280×720 24fps 10초 · 소리 있음)
export const FEATURE_SYNTH = "시안 · 상태 · 경고 · 음성 표시는 영상을 보고 꾸민 연출(실제 기록 아님)";
const V = "voice" as const;

// T — 정상 시나리오 누름 · 렌치 = 공구 탐지 정지(25.4 · 찾는 중) 뒤 겹침 정지(25.45)부터 확인 → 1초마다 3번째(27.45)에 쥠
const T_PRESSES: StagedPress[] = [
  {button: "B1", t: 6.44, sub: {label: "플라즈마 클린 진행", sec: 10}},
  {button: "B2", t: 19.52, sub: {label: "N2 퍼지", sec: 10}, tool: {want: "wrench", seen: 25.45, grasped: 27.45}},
  {button: "B3", t: 36.95, sub: {label: "전극 온도 하강", sec: 10}},
  {button: "B4", t: 50.98},
];
// 음성비서가 말하는 문장 — 화면 말풍선과 TTS 소리(tools/tts.py · 실제 시스템 합성기)가 같은 글을 쓴다(시안 14)
export const TTS_LINES = {
  ack: "확인해 보겠습니다.",
  tool: "이 단계에는 렌치가 필요하니 렌치를 찾아 손으로 쥐세요.",
  step: "지금은 전극 온도를 낮추는 중이니 끝날 때까지 기다리세요.",
};
// 음성 질의 — 호출 → (sttGap) 질문 · 사실 카드 → 「확인해 보겠습니다」(LLM 과 겹쳐 재생) → 카드가 말풍선에 들어간 뒤(질문 + 4.0초) 답
//   말 끝 = 재생 시작 + TTS 길이(ttsSec.ts — tools/tts.py 가 wav 를 재서 쓴다 · 손으로 옮기지 않는다)
export const ASK_ACK = 0.3, ASK_ANSWER = 4.0, ASK_PLAY = 4.1;   // 질문 뒤 「확인해 보겠습니다」 재생 · 답 · 답 재생
const ask = (wake: number, sttGap: number, q: string, card: string[], key: "tool" | "step"): StagedEv[] => [
  {t: wake, kind: "wake", d: {}, src: V},
  {t: wake + sttGap, kind: "stt", d: {text: q}, src: V},
  {t: wake + sttGap + 0.05, kind: "card", d: {lines: card}, src: V},
  {t: wake + sttGap + ASK_ACK, kind: "play_start", d: {}, src: V},
  {t: wake + sttGap + ASK_ACK + TTS_SEC.ack, kind: "play_end", d: {what: "완료"}, src: V},
  {t: wake + sttGap + ASK_ANSWER, kind: "answer", d: {src: "llm", text: TTS_LINES[key]}, src: V},
  {t: wake + sttGap + ASK_PLAY, kind: "play_start", d: {}, src: V},
  {t: wake + sttGap + ASK_PLAY + TTS_SEC[key], kind: "play_end", d: {what: "완료"}, src: V},
];
const T_VOICE: StagedEv[] = [
  ...ask(20.7, 1.3, "지금 필요한 공구가 뭐야?", [
    "지금 할 일: 렌치를 찾아 쥔다 — 쥐고 약 8초가 지나면 자동으로 3단계로 넘어간다",
    "현재 진행 중인 단계: 2단계 「펌프/퍼지」 — 아직 끝나지 않음 · 이 단계의 버튼: B2",
    "2단계의 서브작업: N2 퍼지 10초 · 2단계에 필요한 공구 = 렌치",
    "공구 상황: 렌치를 찾아야 한다",
    "카메라에 지금 보이는 공구: 없음 (보고 있지만 아무 공구도 안 보인다)",
    "이 시스템이 모르는 것: 가스·압력·온도 같은 장비 센서 값 · 다른 작업자",
  ], "tool"),
  ...ask(38.2, 0.7, "다음 단계 뭐야?", [   // 질문 0.7초 — 답 TTS(F1 3.92초)가 3단계 완료(46.95) 전에 끝나게(시험 sound.test)
    "지금 할 일: 기다린다 — 약 8초 뒤 자동으로 4단계로 넘어간다",
    "현재 진행 중인 단계: 3단계 「전극 냉각」 — 아직 끝나지 않음 · 이 단계의 버튼: B3",
    "끝난 단계: 1단계 「클린·가스차단」 · 2단계 「펌프/퍼지」",
    "순서 판정: 정상 (경고·차단 없음)",
    "그 다음에 올 단계: 4단계 「챔버 벤트」 · 버튼 B4 (현재 단계가 끝난 뒤에만 누른다)",
    "이 시스템이 모르는 것: 가스·압력·온도 같은 장비 센서 값 · 다른 작업자",
  ], "step"),
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
// BP — 차례 B2(렌치 필요) · 손이 공구함으로(37.0~) → 드라이버(39.0~ 검출 · 탐지 정지 39.8) → 겹침 정지(39.85 확인 시작) → 40.35 다른 공구 → 화면 정지
const BP_TOOL: StagedEv[] = [
  ...[37.0, 38.0, 39.0].map((t): StagedEv => ({t, kind: "tool_scan", d: {hand: true, seen: [], tool: null, phase: "search", want: "wrench"}})),
  {t: 39.85, kind: "tool_scan", d: {hand: true, seen: ["driver"], tool: null, phase: "checking", want: "wrench"}},
  {t: 40.35, kind: "wrong_tool", d: {want: "wrench", got: "driver"}},
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

const GLASSES_ON = 28.3, GLASSES_OFF = 32.75; // 안경을 들어 올리기 시작 · 테가 화면에서 완전히 빠진 순간(32.73 · 흰 픽셀 0)
const BOOT_FROM = 3.24, BOOT_SPEED = BOOT_FROM / CHECK_SEC; // 가상 세계 + 점검 목록 + 단계 목록 = 손이 들어오기 전 3.24초를 느리게
const HAND_AT = 5.73, HAND_HOLD = 3.2;     // 손 첫 등장 3.23초 + 2.5초 여유 · 연출 3.0초 + 머묾
const TOOL_AT = 25.4, TOOL_HOLD = 1.5, OVERLAP_AT = 25.45, OVERLAP_HOLD = 1.8; // 렌치 첫 등장 24.6초 + 0.8초 여유 · 겹침 = 훑는 선 왕복 1.6초
const WRONG_TOOL_HOLD = 1.1;               // 다른 공구 = 두 번째로 보는 공구 탐지라 짧게(박스 강조 1.0초)
const CH = 1.8, SC = 1.3, SLOW = 0.4, LAMP_SLOW = 0.5, GRAZE_SLOW = 0.25, DWELL_HOLD = 1.5, WRONG_HOLD = 2.0;
// 음성 알림(시안 14 — 경고 · 차단도 같은 합성기로) — 효과음이 끝난 뒤 말하고, 말이 끝나면 다음 장면(시안 3 피드백 「음성 알림이 끝나면 다음 영상」)
const WARN_VOICE = 0.45, BLOCK_VOICE = 0.55;                          // 경고음(0.4초) · 경보음(차단 뒤 0.63초) 뒤
const WARN_HOLD = TTS_SEC.warn - ((7.6 - 7.13) / SLOW - WARN_VOICE) + 0.3;   // 경고 구간(0.4×)이 끝난 뒤 말이 남은 만큼 + 0.3초
const BLOCK_HOLD = BLOCK_VOICE + TTS_SEC.block + 0.3;
// 제목 카드 = 다음 장면 첫 화면을 멈추고 어둡게 한 위에(card · HUD 도 함께 흐리게) — 장 · 절 따로
// tip = 검지 끝 빛 꼬리(02 판정 장면 — 실제 판정 기준 「검지 끝이 버튼 박스 안」 · 시안 8 「테크적이고 화려하게」 · 타워램프는 램프가 주인공이라 뺌)
type Ch = NonNullable<Clip["chapter"]>;
type Sc = NonNullable<Clip["section"]>;
const chCard = (take: string, at: number, chapter: Ch, run?: string): Clip =>
  ({take, run, file: "proxy.mp4", from: at, to: at, speed: 1, overlay: true, hold: CH, card: "chapter", chapter, sfx: [[0, "sfx_whoosh", 0.5]]});
const scCard = (take: string, at: number, section: Sc, run?: string): Clip =>
  ({take, run, file: "proxy.mp4", from: at, to: at, speed: 1, overlay: true, hold: SC, card: "section", section, sfx: [[0, "sfx_pop", 0.4]]});
const hold = (take: string, at: number, sec: number, extra: Partial<Clip> = {}): Clip =>
  ({take, file: "proxy.mp4", from: at, to: at, speed: 1, overlay: true, hold: sec, ...extra});
// 자막(시안 13 「기존 자막을 제거하고 장면에 맞는 자막」 · 문장 = korean-skills grammar-checker 검토) — 제목 카드와 겹치지 않게 그 장면에서 일어나는 일
//   🔑 실제 시스템과 맞춘다: 안경엔 화면이 없다(「안경 화면」 금지) · 21점엔 손목 포함 · 판정 기준 = 검지 끝 · 다른 공구 = 첫 확인에 경고
const SUB = {
  glasses: "카메라가 달린 안경을 쓰고 작업을 시작합니다",
  boot: "시스템을 점검하고 작업 순서(레시피)를 불러옵니다",
  buttons: "찾은 버튼마다 이름과 신뢰도를 표시합니다",
  hand: "21개 점 가운데 검지 끝이 버튼 판정의 기준입니다",
  reach: "2단계에 필요한 렌치를 공구함에서 꺼냅니다",
  found: "카메라가 렌치를 찾아냅니다",
  overlap: "손과 공구가 겹치면 쥐었는지 확인을 시작합니다",
  grasp: "1초마다 살펴 세 번 연속 확인되면 쥔 것으로 판정합니다",
  other: "이번에는 렌치 대신 드라이버를 집어 봅니다",
  wrong: "필요하지 않은 공구를 쥐면 첫 확인에서 바로 경고합니다",
  graze: "차례가 아닌 B4를 잠깐 스치기만 하면 경고하지 않습니다",
  warn: "검지 끝이 B3에 0.3초 머물면 누르기 전에 경고합니다",
  block: "차례가 아닌 B2를 누르면 입력을 막고 음성으로 알립니다",
  lamp: "경고가 뜨면 타워램프에도 황색 불이 켜집니다",
  call: "「가디언」이라고 부른 뒤 말로 묻습니다",
  card: "코드가 정한 지금 상황(사실 카드)을 LLM에 함께 보냅니다",
  answer: "LLM은 사실 카드를 바탕으로 답합니다",
  rule: "판단은 코드가 하고, LLM은 그 결과를 말로 전합니다",
  next: "단계가 끝나면 다음에 누를 버튼을 안내합니다",
};
// 효과음(시안 14 「추천하는 효과음」 · tools/sfx.py 합성 — 파일은 모두 최고점 -1 dBFS · 크기는 여기 음량으로만) · TTS 는 음량 1
//   [구간 안 화면 초, 이름, 음량] · 시각은 화면과 같은 상수 · 원본 사건 시각은 at(사건, 구간 시작, 배속)
type Sfx = [number, string, number?][];
const at = (src: number, from: number, speed: number) => (src - from) / speed;
const SFX_BOOT: Sfx = [[0, "sfx_boot", 0.4], ...[0, 1, 2, 3].map((i): Sfx[number] => [ROW_AT + i * ROW_GAP + ROW_CHECK, "sfx_tick", 0.3]),
  [BANNER_FROM, "sfx_ding", 0.3]];   // 가상 세계 → 점검 줄 「정상」 → 점검 완료
const SFX_BUTTONS: Sfx = [[0.1, "sfx_scan", 0.18], ...BTN_ORDER.map((n): Sfx[number] => [-(btnIntroAge(n, CHECK_SEC) ?? 0), "sfx_blip", 0.35])];
const SFX_FOUND: Sfx = [[0, "sfx_blip", 0.35]], SFX_CHECK: Sfx = [[0, "sfx_scan", 0.18]];   // 찾음 = 정지 첫 프레임(강조 연출과 같이)
// 음성 질의 — 호출 띠링 · 「확인해 보겠습니다」 · 사실 카드 나타남(CARD_IN 0.6) · 말풍선에 들어감(CARD_LAND 3.7 — hud/VoiceBubbles) · 답(TTS)
const sfxAsk = (wake: number, stt: number, key: "tool" | "step"): Sfx => [[wake, "sfx_chime", 0.5], [stt + ASK_ACK, "tts_ack"],
  [stt + 0.6, "sfx_card", 0.3], [stt + 3.7, "sfx_pop", 0.3], [stt + ASK_PLAY, `tts_${key}`]];
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
  {take: LOGO, file: "proxy.mp4", from: 0, to: 8, speed: 1, overlay: false, fadeOut: 0.5},    // 로고 인트로(뒤 2초 잘라 냄 · 사용자) → 검게 → 안경
  {take: G, file: "proxy.mp4", from: GLASSES_ON, to: GLASSES_OFF, speed: 1, overlay: false, fadeIn: 0.5, caption: SUB.glasses},   // 본 영상 = 검은 화면에서 나타남(사용자)
  {take: T, file: "proxy.mp4", from: 0, to: BOOT_FROM, speed: BOOT_SPEED, overlay: true, boot: true, subs: [[WORLD_SEC, CHECK_SEC, SUB.boot]], sfx: SFX_BOOT},
  // 01 객체 탐지
  chCard(T, BOOT_FROM, C01),
  scCard(T, BOOT_FROM, {no: "1", title: "버튼", desc: "콘솔 버튼 5개를 차례로 찾습니다"}),
  hold(T, BOOT_FROM, SCAN_HOLD_SEC, {intro: "buttons", caption: SUB.buttons, sfx: SFX_BUTTONS}),                       // 스캔 왕복 → 버튼 강조 B1 … EMO → 「감시 중」
  {take: T, file: "proxy.mp4", from: BOOT_FROM, to: 4.0, speed: 1, overlay: true, caption: SUB.buttons},          // 「감시 중」으로 바뀐 것을 잠깐 보이고 손 절로
  scCard(T, HAND_AT, {no: "2", title: "손", desc: "손가락 끝까지 21점을 따라갑니다"}),
  hold(T, HAND_AT, HAND_HOLD, {intro: "hand", caption: SUB.hand, sfx: [[0.3, "sfx_scan", 0.18], [2.4, "sfx_blip", 0.35]]}),   // 스캔 · 「손 추적 시작」
  {take: T, file: "proxy.mp4", from: HAND_AT, to: 6.1, speed: 1, overlay: true, caption: SUB.hand},
  scCard(T, 19.3, {no: "3", title: "공구", desc: "필요한 공구를 쥐었는지 확인합니다"}),  // 19.3 = 1단계 완료 안내(~19.04)가 끝난 뒤
  {take: T, file: "proxy.mp4", from: 19.3, to: 21.0, speed: 1, overlay: true, caption: SUB.reach, sfx: [[at(19.52, 19.3, 1), "sfx_tick", 0.4]]},   // B2 누름 19.52 → 렌치 찾는 중
  {take: T, file: "proxy.mp4", from: 21.0, to: TOOL_AT, speed: 2, overlay: true, badge: "2×", caption: SUB.reach}, // 공구함으로 손을 뻗는 동안 빨리
  hold(T, TOOL_AT, TOOL_HOLD, {intro: "tool", caption: SUB.found, sfx: SFX_FOUND}),
  hold(T, OVERLAP_AT, OVERLAP_HOLD, {intro: "overlap", caption: SUB.overlap, sfx: SFX_CHECK}),                         // 손 구역 · 공구 겹침 → 공구 확인 중
  {take: T, file: "proxy.mp4", from: OVERLAP_AT, to: 28.4, speed: 1, overlay: true, caption: SUB.grasp, sfx: [[at(27.45, OVERLAP_AT, 1), "sfx_ding", 0.4]]},   // 확인 1·2 → 27.45 렌치 확인 완료
  // 01 공구 — 다른 공구(손이 공구함으로 가는 순간부터 · 정답 공구와 같은 연출 → 빨강 오답 · 대기 멈춤)
  {take: BP, run: "tool", file: "proxy.mp4", from: 37.9, to: 39.8, speed: 1, overlay: true, caption: SUB.other},
  {...hold(BP, 39.8, WRONG_TOOL_HOLD, {intro: "tool", caption: SUB.other, sfx: SFX_FOUND}), run: "tool"},
  {...hold(BP, 39.85, OVERLAP_HOLD, {intro: "overlap", caption: SUB.other, sfx: SFX_CHECK}), run: "tool"},
  {take: BP, run: "tool", file: "proxy.mp4", from: 39.85, to: 40.36, speed: 0.5, overlay: true, badge: "0.5×", caption: SUB.wrong, sfx: [[at(40.35, 39.85, 0.5), "sfx_wrong", 0.4]]}, // 40.35 다른 공구
  {...hold(BP, 40.36, WRONG_HOLD, {caption: SUB.wrong}), run: "tool"},                                 // 다른 공구 경고 — 화면 정지 · 경고 연출은 이어 감 → 끝나면 다음 장면
  // 02 판정 기준 — 02-1 정답 버튼 입력은 시안 7 피드백으로 뺐다(T 35.8 → 38.3 · B3 누름 36.95)
  chCard(B34, 6.0, C02, "graze"),
  scCard(B34, 6.0, {no: "1", title: "스침", desc: "0.3초 안에 떠나면 경고하지 않습니다"}, "graze"),
  {take: B34, run: "graze", file: "proxy.mp4", from: 6.0, to: 6.8, speed: GRAZE_SLOW, overlay: true, badge: "0.25×", tip: true, caption: SUB.graze, sfx: [[0.7, "sfx_tick", 0.3]]},   // 6.17 판정 구역에 들어감(화면 첫 프레임 = 0.7초)
  scCard(B34, 6.8, {no: "2", title: "경고", desc: "오답 버튼에 0.3초 이상 머물면"}, "warn"),
  {take: B34, run: "warn", file: "proxy.mp4", from: 6.8, to: 7.13, speed: SLOW, overlay: true, badge: "0.4×", tip: true, caption: SUB.warn},
  {...hold(B34, 7.13, DWELL_HOLD, {intro: "dwell", tip: true, caption: SUB.warn, sfx: [[0, "sfx_scan", 0.2]]}), run: "warn"},   // 손가락이 B3 에 닿은 순간 멈춤 · 0.3초 타이머가 차는 동안
  {take: B34, run: "warn", file: "proxy.mp4", from: 7.13, to: 7.6, speed: SLOW, overlay: true, badge: "0.4×", tip: true, caption: SUB.warn,
    sfx: [[at(7.135, 7.13, SLOW), "sfx_warn", 0.45], [WARN_VOICE, "tts_warn"]]},   // 경고 7.135 → 경고음 → 음성 알림 · 손이 움직임
  {...hold(B34, 7.6, WARN_HOLD, {tip: true, caption: SUB.warn}), run: "warn"},     // 음성 알림이 끝날 때까지 정지(경고 연출은 이어 감)
  scCard(B34, 7.3, {no: "3", title: "차단", desc: "오답 버튼을 누르면 입력을 막습니다"}, "block"),
  {take: B34, run: "block", file: "proxy.mp4", from: 7.3, to: 8.05, speed: SLOW, overlay: true, badge: "0.4×", tip: true, caption: SUB.block, sfx: [[at(8.0, 7.3, SLOW), "sfx_alarm", 0.5]]},   // B3 옆 → B2 상자 7.88 → 누름 8.0
  {...hold(B34, 8.05, BLOCK_HOLD, {tip: true, caption: SUB.block, sfx: [[0.12, "sfx_lock", 0.5], [BLOCK_VOICE, "tts_block"]]}), run: "block"},
  // ↑ 차단 — 화면 멈춤 · 차단 그래픽 · 해제 버튼 · 자물쇠 찰칵 = 차단 뒤 0.24초(정지 구간 시작이 이미 차단 뒤 0.117초라 0.12) · 경보음 뒤 음성 알림 → 끝나면 다음
  scCard(BP, 70.0, {no: "4", title: "타워램프", desc: "경고와 차단을 램프로도 알립니다"}, "lamp"),
  {take: BP, run: "lamp", file: "proxy.mp4", from: 70.0, to: 71.3, speed: LAMP_SLOW, overlay: true, badge: "0.5×", caption: SUB.lamp, sfx: [[0.96, "sfx_warn", 0.4]],   // 경고 70.47(화면 첫 프레임 = 0.96초 · 음성 알림은 구간이 짧아 뺌)
    callout: {label: "타워램프", lines: [{text: "경고 → 황색", color: "warn"}, {text: "차단 → 적색 + 부저", color: "danger"}], keys: LAMP}},
  // 03 음성 비서 — 원본 시간 순(공구 질문 = 2단계 → 단계 질문 = 3단계 · 단계 목록이 거꾸로 돌아가지 않게)
  //   시작 = 앞 누름 파동이 끝난 뒤(B2 20.52 · B3 37.95) · 영상 끝 = 3단계 완료 안내 뒤 2초 여유(시안 3 피드백)
  chCard(T, 20.6, C03, "voice"),
  scCard(T, 20.6, {no: "1", title: "공구 질문", desc: "이 단계에 필요한 공구를 묻기"}, "voice"),
  {take: T, run: "voice", file: "proxy.mp4", from: 20.6, to: 30.2, speed: 1, overlay: true,   // 호출 20.7 · 질문 22.0 · 답 26.0(구간 0.1 · 1.4 · 5.4초)
    subs: [[0, 1.8, SUB.call], [1.8, 5.4, SUB.card], [5.4, 9.6, SUB.answer]], sfx: sfxAsk(at(20.7, 20.6, 1), at(22.0, 20.6, 1), "tool")},
  scCard(T, 38.0, {no: "2", title: "단계 질문", desc: "지금 무엇을 해야 하는지 묻기"}, "voice"),
  {take: T, run: "voice", file: "proxy.mp4", from: 38.0, to: 48.95, speed: 1, overlay: true,   // 3단계 완료 46.95 = 구간 8.95초
    subs: [[0, 8.9, SUB.rule], [8.9, 10.95, SUB.next]],
    sfx: [...sfxAsk(at(38.2, 38.0, 1), at(38.9, 38.0, 1), "step"), [at(46.95, 38.0, 1), "sfx_ding", 0.4]]},   // 호출 38.2 · 질문 38.9 · 3단계 완료 46.95
];
