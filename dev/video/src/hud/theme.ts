// 색 = 시연 프로그램 다크 테마(`Rpi5/Demo/theme.py` THEMES["dark"])에서 옮김 · 버튼 색 = 콘솔 실물 — 시안(G3)에서 다듬는다
export const C = {
  text: "#e6e8ea", label: "#c3c9cf", done: "#7dffa8", current: "#ffd75c",
  warn: "#ff8f2e", danger: "#ff5252", info: "#5aa8ff",
  panel: "rgba(0,0,0,0.60)", edge: "rgba(255,255,255,0.22)", gaugeFrom: "#e8a000", gaugeTo: "#ffd75c",
};
export const BTN: Record<string, string> = {B1: "#ffd23f", B2: "#f2f4f5", B3: "#ff6fae", B4: "#4c9bff", EMO: "#ff5252"};
export const FONT = "'NanumBarunGothic', sans-serif";
// 정본 = Rpi5/Demo/recipe.json(2026-10-09 사본) — 단계 이름이 바뀌면 여기도
export const STEPS = [
  {button: "B1", name: "클린·가스차단"}, {button: "B2", name: "펌프/퍼지"},
  {button: "B3", name: "전극 냉각"}, {button: "B4", name: "챔버 벤트"},
];
export const TOOL_KO: Record<string, string> = {driver: "드라이버", wrench: "렌치", pliers: "플라이어"};
export type Fit = {s: number; x: number; y: number};
