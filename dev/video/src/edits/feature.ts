import {CHECK_SEC, SCAN_HOLD_SEC} from "../lib/boot.ts";
import type {Clip} from "../lib/edit.ts";
import type {StagedEv, StagedPress} from "../lib/staged.ts";

// 기능 소개 영상 시안(2026-10-09 사용자 「시나리오 중심이 아닌 객체 탐지 … 판정기준(경고, 차단), 음성비서에 대한 기능적인 영상」
//   · 「발표 자료에 넣을 영상」 · 형태 = 영상 1개 · 구성 = 장 나누기(추천안 A) · 「일단 추천대로 시안을 만들어줘」)
// 오프닝 → 01 객체 탐지 → 02 판정 기준 → 03 음성 비서 → 끝맺음 · 연출·효과는 시험 전 초안 그대로
// 🔴 실제 기록이 없는 시안 — 상태·경고·차단·음성 표시는 화면을 보고 꾸민 연출(lib/staged) · 박스·손·공구는 실제 검출
//   · 02 경고·차단 = 10/8 시험 촬영(B 가로 띠 · 그때 차단 화면이 모니터에 뜬 장면) · 03 음성 = 소리 없는 꾸민 질문·답
const G = "20261009_glasses", T = "20261009_pre", B = "20261008_phoneB_land34";
export const FEATURE_SYNTH = "시안 · 상태 · 경고 · 음성 표시는 영상을 보고 꾸민 연출(실제 기록 아님)";

const V = "voice" as const;
// 10/9 정상 시나리오 영상(T) — 시험 전 초안과 같은 누름 + 03 음성 질의응답(B3 대기 중 · 둘러보는 장면)
const T_PRESSES: StagedPress[] = [
  {button: "B1", t: 6.44, sub: {label: "플라즈마 클린 진행", sec: 10}},
  {button: "B2", t: 19.52, sub: {label: "N2 퍼지", sec: 10}, tool: {want: "wrench", seen: 24.6, grasped: 26.6}},
  {button: "B3", t: 36.95, sub: {label: "전극 온도 하강", sec: 10}},
  {button: "B4", t: 50.98},
];
const T_VOICE: StagedEv[] = [
  {t: 38.6, kind: "wake", d: {}, src: V},
  {t: 40.1, kind: "stt", d: {text: "다음 단계 뭐야?"}, src: V},
  {t: 41.2, kind: "answer", d: {text: "지금은 전극 온도를 낮추는 중입니다. 끝나면 B4 챔버 벤트 버튼을 누르세요."}, src: V},
  {t: 41.3, kind: "play_start", d: {}, src: V},
  {t: 45.0, kind: "play_end", d: {what: "답"}, src: V},
];
// 10/8 B 가로 띠 — 검지가 B4 를 스침(6.2초 · 0.3초 안) → B3 상자에 머묾(7.13~) → 0.3초 뒤 경고 · 음성 알림 → B2 누름 = 차단
// (차례 = B1 — 검지 끝 위치는 검출 dets 로 확인 · 누름 시각은 손가락이 B2 상자 안에 든 7.9~8.1초의 가운데)
const B_EXTRA: StagedEv[] = [
  {t: 7.43, kind: "state", d: {old: "MONITOR", new: "WARNING", expected: "B1", dwell_roi: "B3", dwell_start_ms: 7130}},
  {t: 7.46, kind: "alert", d: {key: "alert_warn_B1", state: "WARNING"}, src: V},
  {t: 7.55, kind: "play_start", d: {}, src: V},
  {t: 8.0, kind: "gpio_edge", d: {button: "B2", src: "edge"}},
  {t: 8.0, kind: "press", d: {button: "B2", source: "gpio", expected: "B1", state: "WARNING"}},
  {t: 8.0, kind: "state", d: {old: "WARNING", new: "BLOCK", expected: "B1"}},
  {t: 8.03, kind: "alert", d: {key: "alert_block_B1", state: "BLOCK"}, src: V},
];
export const FEATURE_STAGED = {
  [T]: {start: 1, presses: T_PRESSES, extra: T_VOICE},
  [B]: {start: 3, presses: [], first: "B1", extra: B_EXTRA},
};

const HAND_AT = 5.73, HAND_HOLD = 1.6; // 손 첫 등장 3.23초 + 2.5초 여유
export const FEATURE: Clip[] = [
  // 오프닝 — 안경 → 비전 감시 시작 점검
  {take: G, file: "proxy.mp4", from: 27.6, to: 32.35, speed: 1, overlay: false},
  {take: T, file: "proxy.mp4", from: 0, to: CHECK_SEC, speed: 1, overlay: true, boot: true,
    caption: "시안 — 상태 · 경고 · 음성 표시는 영상을 보고 꾸민 연출입니다"},
  // 01 객체 탐지 — 버튼(정지) → 손(정지) → 공구 쥠 판정
  {take: T, file: "proxy.mp4", from: CHECK_SEC, to: CHECK_SEC, speed: 1, overlay: true, hold: SCAN_HOLD_SEC, intro: "buttons",
    chapter: {no: "01", title: "객체 탐지", desc: "버튼 · 손 · 공구를 한 화면에서"}},
  {take: T, file: "proxy.mp4", from: CHECK_SEC, to: HAND_AT, speed: 1, overlay: true,
    caption: "카메라 한 대로 버튼 · 손 · 공구를 함께 찾습니다"},
  {take: T, file: "proxy.mp4", from: HAND_AT, to: HAND_AT, speed: 1, overlay: true, hold: HAND_HOLD, intro: "hand"},
  {take: T, file: "proxy.mp4", from: 23.6, to: 28.4, speed: 1, overlay: true,
    caption: "쥔 공구가 맞는지 연속으로 확인합니다"},                                   // 렌치 확인 중 24.6 → 쥠 26.6
  // 02 판정 기준 — 정답 누름 → (10/8) 오답 버튼 0.3초 머묾 → 경고 → 오답 누름 → 차단
  {take: T, file: "proxy.mp4", from: 5.9, to: 8.6, speed: 1, overlay: true,
    chapter: {no: "02", title: "판정 기준", desc: "정답은 진행, 오답은 경고와 차단"},
    caption: "정답 버튼을 누르면 다음 단계로 넘어갑니다"},                              // B1 6.44
  {take: B, file: "proxy.mp4", from: 6.3, to: 8.4, speed: 0.5, overlay: true, badge: "0.5×",
    caption: "누르기 전에 경고하고, 그래도 누르면 막습니다"},                            // 머묾 7.13 → 경고 7.43 → B2 누름 8.0 = 차단
  {take: B, file: "proxy.mp4", from: 8.4, to: 10.4, speed: 1, overlay: true},              // 모니터에도 차단 화면
  // 03 음성 비서 — 호출 → 질문 → 답(B3 대기 중)
  {take: T, file: "proxy.mp4", from: 37.8, to: 45.6, speed: 1, overlay: true,
    chapter: {no: "03", title: "음성 비서", desc: "손을 쓰지 않고 묻고 듣기"},
    caption: "「가디언」이라고 부르고 말로 묻습니다"},
  // 끝맺음 — 마지막 화면을 멈추고 세 기능 요약
  {take: T, file: "proxy.mp4", from: 45.6, to: 45.6, speed: 1, overlay: true, hold: 3.6, intro: "end"},
];
