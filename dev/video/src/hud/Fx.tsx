import type {Box, Pt} from "../lib/dets.ts";
import {C, FONT, easeOut, rnd, type Fit} from "./theme.ts";

// 테크 효과 묶음 — 시안 8 피드백 「연출 · 효과 … 영상 분위기는 테크적이고 화려하게」 → 추천 5개(사용자 「추천만 넣어줘봐」)
//   ① 장 전환(색 번짐 + 픽셀 조각) ② 화면 질감(주사선 · 가장자리 어둡게 · 흐르는 빛 띠) + HUD 테두리 ③ 검지 끝 빛 꼬리
//   ④ 차단 순간(자물쇠 「찰칵」 — 흔들림 · 번쩍임은 Cut) ⑤ 「가디언」 듣는 중 음성 파동
// 🔑 화려함은 전환 · 가장자리 · 음성 장면에 — 탐지 박스 · 손 뼈대(증거) 위는 덮지 않는다

// 색 번짐(빨강 · 파랑을 좌우로 어긋나게) — 이 필터를 쓸 요소에 style filter: url(#id)
export const ChromaFilter: React.FC<{id: string; dx: number}> = ({id, dx}) => (
  <svg width={0} height={0} style={{position: "absolute"}}>
    <filter id={id} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
      <feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
      <feOffset in="r" dx={dx} dy={0} result="r2" />
      <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g" />
      <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b" />
      <feOffset in="b" dx={-dx} dy={0} result="b2" />
      <feBlend in="r2" in2="g" mode="screen" result="rg" />
      <feBlend in="rg" in2="b2" mode="screen" />
    </filter>
  </svg>
);

// ① 장 전환 — 장 제목 카드 첫 win 초: 번쩍 → 픽셀 조각이 흩어지며 걷힘 · 가로 잡음 줄
const CELL = 60;
export const PixelBurst: React.FC<{age: number; win: number; W: number; H: number}> = ({age, win, W, H}) => {
  const k = Math.max(0, 1 - age / win), f = Math.floor(age * 30);
  const cols = Math.ceil(W / CELL), rows = Math.ceil(H / CELL), dens = 0.55 * k * k;
  const cells: React.ReactNode[] = [];
  for (let i = 0; i < cols * rows; i++) {
    if (rnd(i * 13.1 + f * 7.3) >= dens) continue;
    const c = rnd(i * 5.7 + f * 3.1);
    const [fill, op] = c < 0.6 ? ["#04070b", 0.92] : c < 0.85 ? [C.info, 0.55] : ["#ff3d9a", 0.5];
    cells.push(<rect key={i} x={(i % cols) * CELL} y={Math.floor(i / cols) * CELL} width={CELL} height={CELL} fill={fill} opacity={op} />);
  }
  return (
    <svg style={{position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none"}}>
      {cells}
      {[0, 1, 2, 3].map((i) => (
        <rect key={`l${i}`} x={0} y={rnd(f * 11 + i) * H} width={W} height={3 + rnd(f * 17 + i) * 12}
          fill={i % 2 ? "#ff3d9a" : C.info} opacity={0.6 * k} />
      ))}
      {age < 0.08 && <rect width={W} height={H} fill="#e6f6ff" opacity={0.5 * (1 - age / 0.08)} />}
    </svg>
  );
};

// ② 화면 질감 — 영상 위 · HUD 아래(글자는 가리지 않는다) · 빛 띠는 5초마다 위 → 아래
export const Texture: React.FC<{t: number; H: number}> = ({t, H}) => {
  const band = ((t % 5) / 5) * (H + 400) - 200;
  return (
    <div style={{position: "absolute", inset: 0, pointerEvents: "none"}}>
      <div style={{position: "absolute", inset: 0,
        background: "repeating-linear-gradient(0deg, rgba(0,0,0,0.09) 0px, rgba(0,0,0,0.09) 2px, rgba(0,0,0,0) 2px, rgba(0,0,0,0) 4px)"}} />
      <div style={{position: "absolute", left: 0, right: 0, top: band, height: 200,
        background: "linear-gradient(180deg, rgba(90,168,255,0) 0%, rgba(90,168,255,0.07) 50%, rgba(90,168,255,0) 100%)"}} />
      <div style={{position: "absolute", inset: 0, background: "radial-gradient(ellipse 75% 70% at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.38) 100%)"}} />
    </div>
  );
};

// ② HUD 테두리 — 켜짐(HudBoot)의 네 모서리 꺾쇠를 켜짐 뒤에도 그대로 이어 두고 · 좌우 가운데 눈금자
export const FRAME_IN = 24, FRAME_L = 160;
export const HudFrame: React.FC<{W: number; H: number}> = ({W, H}) => {
  const corner = (x: number, y: number, sx: number, sy: number) => (
    <path d={`M ${x} ${y + sy * FRAME_L} L ${x} ${y} L ${x + sx * FRAME_L} ${y}`} stroke={C.info} strokeWidth={4} fill="none" strokeLinecap="round" />
  );
  const ruler = (x: number, s: number) => Array.from({length: 13}, (_, i) => {
    const y = H / 2 + (i - 6) * 20, long = i === 6 ? 22 : i % 3 === 0 ? 14 : 8;
    return <line key={`${x}-${i}`} x1={x} y1={y} x2={x + s * long} y2={y} stroke={C.info} strokeWidth={i === 6 ? 3 : 2} opacity={i === 6 ? 0.9 : 0.55} />;
  });
  return (
    <svg style={{position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none"}}>
      {corner(FRAME_IN, FRAME_IN, 1, 1)}{corner(W - FRAME_IN, FRAME_IN, -1, 1)}
      {corner(FRAME_IN, H - FRAME_IN, 1, -1)}{corner(W - FRAME_IN, H - FRAME_IN, -1, -1)}
      {ruler(FRAME_IN, 1)}{ruler(W - FRAME_IN, -1)}
    </svg>
  );
};

// ③ 검지 끝 빛 꼬리 — 실제 판정 기준 「검지 끝이 버튼 박스 안」을 보인다 · label = 판정 구역이 없을 때 「검지 끝」 이름표
const TIP = "#62e6ff";
export const TipTrail: React.FC<{pts: Pt[]; fit: Fit; label: boolean}> = ({pts, fit, label}) => {
  const P = pts.map(([x, y]) => [fit.x + x * fit.s, fit.y + y * fit.s] as const);
  const n = P.length, [hx, hy] = P[n - 1];
  return (
    <svg style={{position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible", pointerEvents: "none"}}>
      {P.slice(1).map(([x, y], i) => {
        const u = (i + 1) / (n - 1), [x0, y0] = P[i];
        return (
          <g key={i}>
            <line x1={x0} y1={y0} x2={x} y2={y} stroke={TIP} strokeWidth={(3 + 9 * u) * 2.6} strokeLinecap="round" opacity={0.18 * u} />
            <line x1={x0} y1={y0} x2={x} y2={y} stroke={TIP} strokeWidth={3 + 9 * u} strokeLinecap="round" opacity={0.15 + 0.75 * u} />
          </g>
        );
      })}
      <circle cx={hx} cy={hy} r={15} fill={TIP} opacity={0.35} />
      <circle cx={hx} cy={hy} r={7} fill="#ffffff" />
      {label && (
        <text x={hx - 30} y={hy + 9} textAnchor="end" fill={TIP} fontFamily={FONT} fontSize={24} fontWeight={800}
          stroke="rgba(0,0,0,0.85)" strokeWidth={5} paintOrder="stroke">검지 끝</text>
      )}
    </svg>
  );
};

// ④ 차단 순간 — 막힌 버튼 옆에 자물쇠가 크게 떨어지며(0.15초) 고리가 「찰칵」 닫히고(0.24초) 고리 파동 · age = 차단 뒤 화면 초
export const LockBadge: React.FC<{box: Box; fit: Fit; age: number; t: number}> = ({box, fit, age, t}) => {
  if (age < 0) return null;
  const [, , x1, y1, x2, y2] = box;
  // 위 가운데 알림 카드(아래 끝 약 150 px)와 겹치지 않게 215 px 아래로
  const X1 = fit.x + x1 * fit.s, X2 = fit.x + x2 * fit.s, cy = Math.max(215, fit.y + ((y1 + y2) / 2) * fit.s);
  const cx = X1 - 70 > 40 ? X1 - 70 : X2 + 70;
  const sc = age < 0.15 ? 1.9 - 0.9 * easeOut(age / 0.15) : 1;
  const lift = age < 0.15 ? 14 : age < 0.24 ? 14 * (1 - (age - 0.15) / 0.09) : 0;
  const snap = age >= 0.24 && age < 0.74 ? (age - 0.24) / 0.5 : null;
  const glow = 10 + 8 * Math.sin(t * Math.PI * 3);
  return (
    <svg style={{position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible", pointerEvents: "none"}}>
      {snap !== null && <circle cx={cx} cy={cy} r={34 + 70 * easeOut(snap)} fill="none" stroke={C.danger} strokeWidth={6 * (1 - snap) + 1} opacity={1 - snap} />}
      <g transform={`translate(${cx} ${cy}) scale(${sc})`} opacity={Math.min(1, age / 0.08)}
        style={{filter: `drop-shadow(0 0 ${glow.toFixed(1)}px ${C.danger})`}}>
        <circle r={40} fill="rgba(20,6,6,0.88)" stroke={C.danger} strokeWidth={3} />
        <path d={`M -12 ${-2 - lift} V ${-12 - lift} A 12 12 0 0 1 12 ${-12 - lift} V ${-2 - lift}`} stroke={C.danger} strokeWidth={6} fill="none" strokeLinecap="round" />
        <rect x={-19} y={-4} width={38} height={28} rx={6} fill={C.danger} />
        <circle cx={0} cy={8} r={4.5} fill="#1a0808" />
      </g>
    </svg>
  );
};

// ⑤ 「가디언」 듣는 중 — 화면 아래 가장자리에 음성 파동 빛(AI 비서가 듣고 있다는 신호) · level 0~1
const WAVES = [{col: "#5aa8ff", f: 1.6, sp: 2.2, a: 1}, {col: "#b06bff", f: 2.3, sp: -1.7, a: 0.8},
  {col: "#ff5cc8", f: 3.1, sp: 2.9, a: 0.6}, {col: "#62e6ff", f: 1.1, sp: -3.3, a: 0.75}];
export const VoiceWave: React.FC<{level: number; t: number; W: number; H: number}> = ({level, t, W, H}) => {
  if (level <= 0) return null;
  const base = H - 70, amp = 46 * level * (0.65 + 0.35 * Math.abs(Math.sin(t * 6.3)));
  const path = (w: (typeof WAVES)[number]) => {
    let d = "";
    for (let x = 0; x <= W; x += 16) {
      const u = x / W, env = Math.pow(Math.sin(Math.PI * u), 1.5);
      const y = base - amp * w.a * env * Math.sin(u * Math.PI * 2 * w.f + t * w.sp);
      d += `${x ? "L" : "M"} ${x} ${y.toFixed(1)} `;
    }
    return d;
  };
  return (
    <svg style={{position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none"}}>
      <defs>
        <linearGradient id="vw-glow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5aa8ff" stopOpacity="0" />
          <stop offset="1" stopColor="#7a6bff" stopOpacity={0.42 * level} />
        </linearGradient>
        <filter id="vw-blur" x="-10%" y="-50%" width="120%" height="200%"><feGaussianBlur stdDeviation="7" /></filter>
      </defs>
      <rect x={0} y={H - 200} width={W} height={200} fill="url(#vw-glow)" />
      {WAVES.map((w, i) => <path key={`g${i}`} d={path(w)} stroke={w.col} strokeWidth={10} fill="none" opacity={0.7 * level} filter="url(#vw-blur)" />)}
      {WAVES.map((w, i) => <path key={i} d={path(w)} stroke={w.col} strokeWidth={3} fill="none" opacity={0.95 * level} />)}
    </svg>
  );
};
