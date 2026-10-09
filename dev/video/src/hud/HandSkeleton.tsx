import type {Pt} from "../lib/dets.ts";
import {C, FONT, easeOut, rnd, type Fit} from "./theme.ts";

// MediaPipe 손 21점 연결
const EDGES = [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [17, 18], [18, 19], [19, 20], [0, 17]];
const DEPTH = [0, 1, 2, 3, 4, 1, 2, 3, 4, 2, 3, 4, 5, 3, 4, 5, 6, 3, 4, 5, 6]; // 손목에서 마디 수(뻗기 연출)
export const HAND = "#2fd3ff"; // 피부·검은 콘솔 위에서 잘 보이는 하늘색(G3 「흰색이라 잘 보이지 않아」)
export const INTRO_SEC = 1.8;  // 첫 등장 연출 길이 — 이 뒤로는 다 그려진 뼈대만

// age = 본편에서 손이 처음 나타난 뒤 지난 초(firstHandAt) · INTRO_SEC 이 지나면(또는 첫 등장이 아니면 큰 값) 연출 없이 뼈대만
// 첫 등장 연출(G3 「첫 등장에만」·「손 등장에도 시스템 가동 효과」) — 켜짐과 같은 결:
//   0~0.35 꺾쇠 안 지지직 잡음·줄무늬 · 0~0.5 꺾쇠가 손으로 좁혀 옴 「손 인식」 · 0.1~0.55 스캔 선이 손을 훑음
//   0.45~1.1 손목부터 뼈대가 뻗고 관절 점이 튀어나옴 · 0.55~ 「● 손 추적 시작」 · 1.2~1.8 꺾쇠가 사라짐
// ring = 검지 끝(8) 고리 색(경고·차단 중엔 그 색)
export const HandSkeleton: React.FC<{hand: Pt[] | null; fit: Fit; t: number; age: number | null; ring?: string}> =
  ({hand, fit, t, age, ring = C.current}) => {
    if (!hand || age === null) return null;
    const P = hand.map(([x, y]) => [fit.x + x * fit.s, fit.y + y * fit.s]);
    const intro = age < INTRO_SEC;
    const grow = intro ? easeOut((age - 0.45) / 0.65) * 6.01 : 6.01;
    const shown = (i: number) => DEPTH[i] <= grow;
    const pop = (i: number) => Math.min(1, Math.max(0, (grow - DEPTH[i]) / 0.8));
    // 조준 꺾쇠 — 손 둘레 상자
    const xs = P.map((p) => p[0]), ys = P.map((p) => p[1]);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    const k = 1.75 - 0.6 * easeOut(age / 0.5);
    const hw = ((Math.max(...xs) - Math.min(...xs)) / 2 + 24) * k, hh = ((Math.max(...ys) - Math.min(...ys)) / 2 + 24) * k;
    const bx = cx - hw, by = cy - hh, bw = hw * 2, bh = hh * 2;
    const lockOp = age < 1.2 ? Math.min(1, age / 0.12) : Math.max(0, 1 - (age - 1.2) / 0.6);
    const L = Math.min(hw, hh) * 0.35;
    const corners = [[bx, by, 1, 1], [bx + bw, by, -1, 1], [bx, by + bh, 1, -1], [bx + bw, by + bh, -1, -1]];
    const seed = Math.floor(age * 60);
    const noise = age < 0.35 ? (0.25 + 0.35 * rnd(seed)) * (1 - age / 0.35) : 0;
    const bars = age < 0.33 ? [0, 1, 2].map((i) => ({y: by + rnd(seed * 7 + i) * bh, h: 2 + rnd(seed * 11 + i) * 10, o: 0.3 + 0.5 * rnd(seed * 5 + i)})) : [];
    const scan = age > 0.1 && age < 0.6 ? by + easeOut((age - 0.1) / 0.45) * bh : null;
    const tracking = age >= 0.55;
    return (
      <svg style={{position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible"}}>
        {intro && (
          <defs>
            <clipPath id="hand-box"><rect x={bx} y={by} width={bw} height={bh} rx={6} /></clipPath>
            <filter id="hand-noise">
              <feTurbulence type="fractalNoise" baseFrequency="0.95" numOctaves="2" seed={seed} />
              <feColorMatrix type="saturate" values="0" />
            </filter>
            <linearGradient id="hand-scan" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={HAND} stopOpacity="0" />
              <stop offset="1" stopColor={HAND} stopOpacity="0.4" />
            </linearGradient>
          </defs>
        )}
        {intro && (
          <g clipPath="url(#hand-box)">
            {noise > 0 && <rect x={bx} y={by} width={bw} height={bh} filter="url(#hand-noise)" opacity={noise} style={{mixBlendMode: "screen"}} />}
            {bars.map((b, i) => <rect key={i} x={bx} y={b.y} width={bw} height={b.h} fill={HAND} opacity={b.o * 0.45} />)}
            {scan !== null && <rect x={bx} y={scan - 70} width={bw} height={70} fill="url(#hand-scan)" />}
            {scan !== null && <rect x={bx} y={scan - 1.5} width={bw} height={3} fill={HAND} />}
          </g>
        )}
        {intro && lockOp > 0 && (
          <g opacity={lockOp}>
            {corners.map(([x, y, sx, sy], i) => (
              <path key={i} d={`M ${x} ${y + sy * L} L ${x} ${y} L ${x + sx * L} ${y}`} stroke={HAND} strokeWidth={4} fill="none" strokeLinecap="round" />
            ))}
            {tracking && <circle cx={bx + 9} cy={by - 21} r={7} fill={C.done} />}
            <text x={tracking ? bx + 24 : bx} y={by - 12} fill={HAND} fontFamily={FONT} fontSize={24} fontWeight={800}
              stroke="rgba(0,0,0,0.85)" strokeWidth={5} paintOrder="stroke">{tracking ? "손 추적 시작" : "손 인식"}</text>
          </g>
        )}
        {EDGES.filter(([a, b]) => shown(a) && shown(b)).map(([a, b]) => (
          <g key={`${a}-${b}`}>
            <line x1={P[a][0]} y1={P[a][1]} x2={P[b][0]} y2={P[b][1]} stroke="rgba(0,0,0,0.55)" strokeWidth={9} strokeLinecap="round" />
            <line x1={P[a][0]} y1={P[a][1]} x2={P[b][0]} y2={P[b][1]} stroke={HAND} strokeWidth={5} strokeLinecap="round" />
          </g>
        ))}
        {P.map(([x, y], i) => shown(i) && (
          <circle key={i} cx={x} cy={y} r={7 * (0.4 + 0.6 * pop(i)) + 3 * Math.max(0, 1 - pop(i)) * pop(i)}
            fill={HAND} stroke="#fff" strokeWidth={2} />
        ))}
        {grow >= 6 && <circle cx={P[8][0]} cy={P[8][1]} r={18 + 4 * Math.sin(t * Math.PI * 3)} fill="none" stroke={ring} strokeWidth={5} />}
      </svg>
    );
  };
