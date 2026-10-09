import type {Clip} from "../lib/edit.ts";

// 제작 흐름 뼈대 시험(설계 §7 순서 2) — 10/8 B 가로 띠 영상 + 10/9 Task 9 견본 기록 판 1(짝 아님 · 화면 표기)
// 시각 맞춤 = 가짜: 영상 3초 = 판 시작(`sync.json` offsetMs = runStart − 3000) — 실제 시각 맞춤은 촬영 뒤 tools/sync.ts
const T = "20261008_phoneB_land34";
export const SKELETON: Clip[] = [
  {take: T, file: "proxy.mp4", from: 0, to: 3, speed: 1, overlay: false},                       // 오프닝 자리
  {take: T, file: "proxy.mp4", from: 3.17, to: 9.5, speed: 1, overlay: true, boot: true,
    caption: "화면 표시는 실제 시스템 기록을 바탕으로 다시 그린 합성입니다"},
  {take: T, file: "proxy.mp4", from: 9.5, to: 16.5, speed: 4, overlay: true, badge: "×4",
    caption: "AI 가 버튼과 손을 알아보고 순서를 확인합니다"},
];
