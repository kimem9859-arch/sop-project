import type {Box, Pt} from "../lib/dets.ts";
import {C, FONT, easeOut, rnd, type Fit} from "./theme.ts";

// 테크 효과 묶음 — 시안 8 피드백 「연출 · 효과 … 영상 분위기는 테크적이고 화려하게」 → 추천 5개(사용자 「추천만 넣어줘봐」)
//   ① 장 전환(색 번짐 + 픽셀 조각) ③ 검지 끝 빛 꼬리 ④ 차단 순간(자물쇠 「찰칵」 — 흔들림 · 번쩍임은 Cut) ⑤ 「가디언」 듣는 중 음성 파동
//   시안 9 피드백 — ① 「너무 강한 것 같아」 → 약하게 · ② 화면 질감 · 상시 테두리 「시선이 분산」 → 뺌
//   · 「추천 외에 제안한 효과에 대해서도」 → ⑥ 사실 카드로 모이는 빛줄기(FactStreams · 글자 암호 풀림은 FactCard) ⑦ 탐지 확대 창(ZoomInset)
// 🔑 화려함은 전환 · 탐지 확대 창 · 음성 장면에 — 탐지 박스 · 손 뼈대(증거) 위는 덮지 않는다

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

// ① 장 전환 — 장 제목 카드 첫 win 초: 옅은 번쩍 → 드문 픽셀 조각이 걷힘 · 가로 잡음 줄 2개(시안 9 「너무 강한 것 같아」 → 조각 약 1/3 · 옅게)
const CELL = 48;
export const PixelBurst: React.FC<{age: number; win: number; W: number; H: number}> = ({age, win, W, H}) => {
  const k = Math.max(0, 1 - age / win), f = Math.floor(age * 30);
  const cols = Math.ceil(W / CELL), rows = Math.ceil(H / CELL), dens = 0.18 * k * k;
  const cells: React.ReactNode[] = [];
  for (let i = 0; i < cols * rows; i++) {
    if (rnd(i * 13.1 + f * 7.3) >= dens) continue;
    const c = rnd(i * 5.7 + f * 3.1);
    const [fill, op] = c < 0.6 ? ["#04070b", 0.55] : c < 0.85 ? [C.info, 0.35] : ["#ff3d9a", 0.3];
    cells.push(<rect key={i} x={(i % cols) * CELL} y={Math.floor(i / cols) * CELL} width={CELL} height={CELL} fill={fill} opacity={op * k} />);
  }
  return (
    <svg style={{position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none"}}>
      {cells}
      {[0, 1].map((i) => (
        <rect key={`l${i}`} x={0} y={rnd(f * 11 + i) * H} width={W} height={2 + rnd(f * 17 + i) * 6}
          fill={i % 2 ? "#ff3d9a" : C.info} opacity={0.3 * k} />
      ))}
      {age < 0.06 && <rect width={W} height={H} fill="#e6f6ff" opacity={0.2 * (1 - age / 0.06)} />}
    </svg>
  );
};

// ⑦ 탐지 확대 창 — 강조되는 버튼 옆에(공구 창은 시안 14 에서 뺌) 그 자리를 zoom 배 키운 둥근 창 + 이름 · 신뢰도 + 잇는 선
//   video = 같은 촬영 화면을 전체 크기로 그리는 함수(Cut 의 vid · 정지 구간이면 Cut 이 Freeze 로 감싼다) · age = 창이 열린 뒤 초 · dur = 열려 있는 초
export const INSET = 180;
export const ZoomInset: React.FC<{video: React.ReactNode; box: Box; fit: Fit; spot: {x: number; y: number}; zoom: number; col: string;
  name: string; age: number; dur: number; W: number; H: number}> = ({video, box, fit, spot, zoom, col, name, age, dur, W, H}) => {
  if (age < 0 || age >= dur) return null;
  const [, score, x1, y1, x2, y2] = box;
  const X1 = fit.x + x1 * fit.s, Y1 = fit.y + y1 * fit.s, X2 = fit.x + x2 * fit.s, Y2 = fit.y + y2 * fit.s;
  const cx = (X1 + X2) / 2, cy = (Y1 + Y2) / 2, S = INSET;
  const a = Math.min(easeOut(age / 0.15), Math.min(1, (dur - age) / 0.12));
  // 잇는 선 — 상자에서 창 쪽 모서리 → 창의 가까운 모서리
  const bx = spot.x > cx ? X2 : X1, by = spot.y > cy ? Y2 : Y1;
  const ix = spot.x > cx ? spot.x : spot.x + S, iy = spot.y > cy ? spot.y : spot.y + S;
  const grow = easeOut(age / 0.2);
  return (
    <>
      <svg style={{position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible", pointerEvents: "none", opacity: a}}>
        <line x1={bx} y1={by} x2={bx + (ix - bx) * grow} y2={by + (iy - by) * grow} stroke={col} strokeWidth={2.5} strokeDasharray="6 5" />
        <circle cx={bx} cy={by} r={5} fill={col} />
      </svg>
      <div style={{position: "absolute", left: spot.x, top: spot.y, width: S, height: S, borderRadius: 18, overflow: "hidden", opacity: a,
        transform: `scale(${0.75 + 0.25 * a})`, transformOrigin: `${ix - spot.x}px ${iy - spot.y}px`,
        border: `3px solid ${col}`, boxShadow: `0 0 22px ${col}, 0 10px 28px rgba(0,0,0,0.6)`, background: "#000"}}>
        <div style={{position: "absolute", left: 0, top: 0, width: W, height: H, transformOrigin: "0 0",
          transform: `translate(${(S / 2 - cx * zoom).toFixed(1)}px, ${(S / 2 - cy * zoom).toFixed(1)}px) scale(${zoom.toFixed(3)})`}}>{video}</div>
        <svg style={{position: "absolute", inset: 0, width: "100%", height: "100%"}}>
          <line x1={S / 2} y1={S / 2 - 26} x2={S / 2} y2={S / 2 - 12} stroke={col} strokeWidth={2} />
          <line x1={S / 2} y1={S / 2 + 12} x2={S / 2} y2={S / 2 + 26} stroke={col} strokeWidth={2} />
          <line x1={S / 2 - 26} y1={S / 2} x2={S / 2 - 12} y2={S / 2} stroke={col} strokeWidth={2} />
          <line x1={S / 2 + 12} y1={S / 2} x2={S / 2 + 26} y2={S / 2} stroke={col} strokeWidth={2} />
          <rect x={8} y={8} width={58} height={24} rx={6} fill="rgba(0,0,0,0.7)" />
          <text x={37} y={26} textAnchor="middle" fill={col} fontFamily={FONT} fontSize={17} fontWeight={800}>{`×${zoom.toFixed(1)}`}</text>
        </svg>
      </div>
      <div style={{position: "absolute", left: spot.x, top: spot.y + S + 8, width: S, textAlign: "center", opacity: a, fontFamily: FONT,
        fontSize: 22, fontWeight: 800, color: col, textShadow: "0 1px 4px rgba(0,0,0,0.95)"}}>
        {name} <span style={{color: C.text, fontWeight: 700, fontVariantNumeric: "tabular-nums"}}>{score.toFixed(2)}</span>
      </div>
    </>
  );
};

// ⑥ 사실 카드로 모이는 빛줄기 — 코드가 가진 사실(단계 상태 · 공구 상태 · 검출 결과)이 카드로 모인다(발표 「판단은 코드, 말은 LLM」)
//   q = 질문 뒤 초 · 빛 머리가 0.15 → 0.6초(카드가 뜨는 때)에 출발점 → 카드 안쪽으로 · 이름표는 출발점에(줄을 다 그린 뒤)
export type Stream = {x: number; y: number; label: string; col: string};
const bez = (p0: number[], p1: number[], p2: number[], u: number) =>
  [0, 1].map((k) => (1 - u) * (1 - u) * p0[k] + 2 * (1 - u) * u * p1[k] + u * u * p2[k]);
export const FactStreams: React.FC<{q: number; from: Stream[]; card: {x: number; y: number; w: number; h: number}}> = ({q, from, card}) => {
  if (q < 0.05 || q > 1.1) return null;
  const run = Math.max(0, Math.min(1, (q - 0.15) / 0.45));
  const head = run < 0.5 ? 2 * run * run : 1 - Math.pow(-2 * run + 2, 2) / 2;
  const fade = q < 0.15 ? (q - 0.05) / 0.1 : q > 0.75 ? Math.max(0, 1 - (q - 0.75) / 0.35) : 1;
  // 도착점 = 카드 안쪽(위 60~190 px) — 카드 높이(줄 수)가 달라도 빛줄기가 카드 밑으로 들어간다(리뷰 — 단계 질문에서 카드 아래 빈 곳에 멈춤)
  // 휨 = 두 방향 중 아래로 휘는 쪽(리뷰 — 오른쪽에서 오는 줄이 위로 휘어 공구 카드 글자 · 다른 이름표를 지남)
  const paths = from.map((s) => {
    const tx = Math.min(Math.max(s.x, card.x + 60), card.x + card.w - 60), ty = Math.min(Math.max(s.y, card.y + 60), card.y + 190);
    const mx = (s.x + tx) / 2, my = (s.y + ty) / 2, dx = tx - s.x, dy = ty - s.y;
    const c1 = [mx - dy * 0.3, my + dx * 0.3], c2 = [mx + dy * 0.3, my - dx * 0.3];
    return Array.from({length: 25}, (_, k) => bez([s.x, s.y], c1[1] >= c2[1] ? c1 : c2, [tx, ty], k / 24));
  });
  const n = Math.round(head * 24);
  return (
    <svg style={{position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible", pointerEvents: "none", opacity: fade}}>
      {from.map((s, i) => (
        <g key={i}>
          <polyline points={paths[i].map((p) => p.join(",")).join(" ")} fill="none" stroke={s.col} strokeWidth={2} opacity={0.25} strokeDasharray="4 6" />
          {paths[i].slice(Math.max(0, n - 8), n + 1).map((p, k, arr) => k === 0 ? null : (
            <line key={k} x1={arr[k - 1][0]} y1={arr[k - 1][1]} x2={p[0]} y2={p[1]} stroke={s.col} strokeLinecap="round"
              strokeWidth={2 + 5 * (k / arr.length)} opacity={0.25 + 0.75 * (k / arr.length)} />
          ))}
          {head < 1 && <circle cx={paths[i][n][0]} cy={paths[i][n][1]} r={9} fill={s.col} opacity={0.9} style={{filter: `drop-shadow(0 0 10px ${s.col})`}} />}
          <circle cx={s.x} cy={s.y} r={6} fill={s.col} />
        </g>
      ))}
      {from.map((s, i) => (
        <g key={`t${i}`} transform={`translate(${s.x} ${s.y + 14})`}>
          <rect x={-58} y={0} width={116} height={30} rx={15} fill="rgba(10,12,14,0.88)" stroke={s.col} strokeWidth={1.5} />
          <text x={0} y={21} textAnchor="middle" fill={s.col} fontFamily={FONT} fontSize={18} fontWeight={800}>{s.label}</text>
        </g>
      ))}
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
