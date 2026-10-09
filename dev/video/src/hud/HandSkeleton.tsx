import type {Pt} from "../lib/dets.ts";
import {C, FONT, easeOut, type Fit} from "./theme.ts";

// MediaPipe 손 21점 연결
const EDGES = [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [17, 18], [18, 19], [19, 20], [0, 17]];
const DEPTH = [0, 1, 2, 3, 4, 1, 2, 3, 4, 2, 3, 4, 5, 3, 4, 5, 6, 3, 4, 5, 6]; // 손목에서 마디 수(뻗기 연출)
export const HAND = "#2fd3ff"; // 피부·검은 콘솔 위에서 잘 보이는 하늘색(사용자 G3 「흰색이라 잘 보이지 않아」)

// age = 손이 이번에 처음 나타난 뒤 지난 초(handSince) — 등장 연출:
//   0~0.5초 조준 꺾쇠가 손을 향해 좁혀 오며 「손 인식」 → 0.25~0.9초 손목부터 뼈대가 뻗고 관절 점이 튀어나옴 → 1.0~1.6초 꺾쇠가 사라짐
// ring = 검지 끝(8) 고리 색(경고·차단 중엔 그 색)
export const HandSkeleton: React.FC<{hand: Pt[] | null; fit: Fit; t: number; age: number | null; ring?: string}> =
  ({hand, fit, t, age, ring = C.current}) => {
    if (!hand || age === null) return null;
    const P = hand.map(([x, y]) => [fit.x + x * fit.s, fit.y + y * fit.s]);
    const grow = easeOut((age - 0.25) / 0.65) * 6.01;
    const shown = (i: number) => DEPTH[i] <= grow;
    const pop = (i: number) => Math.min(1, Math.max(0, (grow - DEPTH[i]) / 0.8)); // 그 마디에 닿은 뒤 커지며 튀어나옴
    // 조준 꺾쇠 — 손 둘레 상자
    const xs = P.map((p) => p[0]), ys = P.map((p) => p[1]);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    const k = 1.75 - 0.6 * easeOut(age / 0.5);
    const hw = ((Math.max(...xs) - Math.min(...xs)) / 2 + 24) * k, hh = ((Math.max(...ys) - Math.min(...ys)) / 2 + 24) * k;
    const lockOp = age < 1.0 ? Math.min(1, age / 0.15) : Math.max(0, 1 - (age - 1.0) / 0.6);
    const L = Math.min(hw, hh) * 0.35;
    const corners = [[cx - hw, cy - hh, 1, 1], [cx + hw, cy - hh, -1, 1], [cx - hw, cy + hh, 1, -1], [cx + hw, cy + hh, -1, -1]];
    return (
      <svg style={{position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible"}}>
        {lockOp > 0 && (
          <g opacity={lockOp}>
            {corners.map(([x, y, sx, sy], i) => (
              <path key={i} d={`M ${x} ${y + sy * L} L ${x} ${y} L ${x + sx * L} ${y}`} stroke={HAND} strokeWidth={4} fill="none" strokeLinecap="round" />
            ))}
            <text x={cx - hw} y={cy - hh - 12} fill={HAND} fontFamily={FONT} fontSize={24} fontWeight={800}
              stroke="rgba(0,0,0,0.85)" strokeWidth={5} paintOrder="stroke">손 인식</text>
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
