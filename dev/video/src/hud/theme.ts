// 색 = 시연 프로그램 다크 테마(`Rpi5/Demo/theme.py` THEMES["dark"])에서 옮김 · 버튼 색 = 콘솔 실물
export const C = {
  text: "#e6e8ea", label: "#c3c9cf", done: "#7dffa8", current: "#ffd75c",
  warn: "#ff8f2e", danger: "#ff5252", info: "#5aa8ff",
  panel: "rgba(10,12,14,0.62)", edge: "rgba(255,255,255,0.18)", gaugeFrom: "#e8a000", gaugeTo: "#ffd75c",
};
export const BTN: Record<string, string> = {B1: "#ffd23f", B2: "#f2f4f5", B3: "#ff6fae", B4: "#4c9bff", EMO: "#ff5252"};
export const FONT = "Pretendard, 'NanumBarunGothic', sans-serif";
// 움직이는 영상 위에서 글자를 읽히게 하는 유리 패널(흐림은 장식이 아니라 가독성) · 그림자 = 아래로 떨어지는 부드러운 그늘
export const GLASS: React.CSSProperties = {
  background: C.panel, border: `1px solid ${C.edge}`, backdropFilter: "blur(14px) saturate(1.15)",
  boxShadow: "0 10px 28px rgba(0,0,0,0.45)", borderRadius: 18, fontFamily: FONT, color: C.text,
};
// 정본 = Rpi5/Demo/recipe.json(2026-10-09 사본) — 단계 이름이 바뀌면 여기도
export const STEPS = [
  {button: "B1", name: "클린·가스차단"}, {button: "B2", name: "펌프/퍼지"},
  {button: "B3", name: "전극 냉각"}, {button: "B4", name: "챔버 벤트"},
];
export const TOOL_KO: Record<string, string> = {driver: "드라이버", wrench: "렌치", pliers: "플라이어"};
export type Fit = {s: number; x: number; y: number};
// 빠르게 시작해 부드럽게 멈춤(지수 감속) · 0~1
export const easeOut = (x: number) => (x >= 1 ? 1 : x <= 0 ? 0 : 1 - Math.pow(2, -10 * x));
// 프레임마다 같은 값이 나오는 의사 난수(렌더가 몇 번이든 같은 영상) — 켜짐·손 등장 잡음
export const rnd = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
