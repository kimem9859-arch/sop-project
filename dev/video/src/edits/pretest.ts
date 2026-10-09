import {CHECK_SEC, SCAN_HOLD_SEC} from "../lib/boot.ts";
import type {Clip} from "../lib/edit.ts";
import type {StagedPress} from "../lib/staged.ts";

// 시험 전 초안(2026-10-09 사용자 요청 「이 두 영상으로 시험 전 임시 영상」) — 장소1 · 시연 프로그램을 켜지 않고 정상 시나리오로 찍은 폰 영상 2개
// 🔴 측정 기록이 없다 — 상태 표시는 화면을 보고 정한 누름 시각으로 꾸민 연출 기록(lib/staged) · 박스·손·공구는 실제 검출(파이1 Hailo · --pad34)
// 노출 = 기본값(설계 D24 의 조정 안 함 · 사용자) · 틀린 공구·음성·막는 장면 없음(오답 시나리오 없음 · 사용자)
const G = "20261009_glasses", T = "20261009_pre";
export const PRETEST_SYNTH = "시험 전 초안 · 상태 표시는 영상을 보고 꾸민 연출(실제 기록 아님)";

// 누름 = 딸깍 소리 시작점(tools/sync 의 onsets) + 손가락 위치로 버튼 확인 · 렌치 = 검출이 처음 잡은 24.6초 · 쥠 = 그 2초 뒤(3번 연속 확인)
export const PRETEST_STAGED: Record<string, {start: number; presses: StagedPress[]}> = {
  [T]: {start: 1, presses: [
    {button: "B1", t: 6.44, sub: {label: "플라즈마 클린 진행", sec: 10}},
    {button: "B2", t: 19.52, sub: {label: "N2 퍼지", sec: 10}, tool: {want: "wrench", seen: 24.6, grasped: 26.6}},
    {button: "B3", t: 36.95, sub: {label: "전극 온도 하강", sec: 10}},
    {button: "B4", t: 50.98},
  ]},
};

// 10/9 초안 피드백 반영판 — 켜짐 = 점검 목록(영상 흐름) → 버튼 탐지(화면 정지·흐림) → 단계 목록 지지직
// 손 탐지 = 손이 처음 보인 3.23초 + 2.5초 여유(「2초에서 3초 정도 여유」) = 5.73초에 화면 정지 · 연출 1.3초 + 0.3초
// 배속 구간 경계 = 첫 대기 강조(2.2초)·단계 완료 안내(2.6초)가 보통 속도에서 다 보이게
const HAND_AT = 5.73, HAND_HOLD = 1.6;
export const PRETEST: Clip[] = [
  {take: G, file: "proxy.mp4", from: 27.6, to: 32.35, speed: 1, overlay: false},   // 오프닝 — 안경 테가 화면 가장자리를 감싸는 순간에서 본편으로
  {take: T, file: "proxy.mp4", from: 0, to: CHECK_SEC, speed: 1, overlay: true, boot: true,
    caption: "시험 전 초안 — 상태 표시는 영상을 보고 꾸민 연출입니다"},                   // 비전 감시 시작 · 점검 목록
  {take: T, file: "proxy.mp4", from: CHECK_SEC, to: CHECK_SEC, speed: 1, overlay: true, hold: SCAN_HOLD_SEC, intro: "buttons"},
  {take: T, file: "proxy.mp4", from: CHECK_SEC, to: HAND_AT, speed: 1, overlay: true},     // 단계 목록 지지직 · 손 보임(연출 전)
  {take: T, file: "proxy.mp4", from: HAND_AT, to: HAND_AT, speed: 1, overlay: true, hold: HAND_HOLD, intro: "hand"},
  {take: T, file: "proxy.mp4", from: HAND_AT, to: 8.8, speed: 1, overlay: true,
    caption: "AI 가 버튼과 손을 알아보고 순서를 확인합니다"},                               // B1 6.44 · 첫 대기 강조
  {take: T, file: "proxy.mp4", from: 8.8, to: 16.2, speed: 4, overlay: true, badge: "×4"}, // B1 대기
  {take: T, file: "proxy.mp4", from: 16.2, to: 21.4, speed: 1, overlay: true},            // 1단계 완료 16.44 · B2 19.52
  {take: T, file: "proxy.mp4", from: 21.4, to: 32.2, speed: 1, overlay: true,
    caption: "필요한 공구를 쥐었는지도 확인합니다"},                                        // 렌치 24.6~29.5 · 2단계 완료 29.52
  {take: T, file: "proxy.mp4", from: 32.2, to: 35.6, speed: 4, overlay: true, badge: "×4"},
  {take: T, file: "proxy.mp4", from: 35.6, to: 38.0, speed: 1, overlay: true},            // B3 36.95
  {take: T, file: "proxy.mp4", from: 38.0, to: 46.7, speed: 4, overlay: true, badge: "×4"}, // B3 대기
  {take: T, file: "proxy.mp4", from: 46.7, to: 54.0, speed: 1, overlay: true,
    caption: "순서대로 마치면 작업이 끝납니다"},                                            // 3단계 완료 46.95 · B4 50.98 → 모든 단계 완료
];
