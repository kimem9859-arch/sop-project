import type {Pt} from "../lib/dets.ts";
import {C, type Fit} from "./theme.ts";

// MediaPipe 손 21점 연결
const EDGES = [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [17, 18], [18, 19], [19, 20], [0, 17]];
const DEPTH = [0, 1, 2, 3, 4, 1, 2, 3, 4, 2, 3, 4, 5, 3, 4, 5, 6, 3, 4, 5, 6]; // 손목에서 마디 수(뻗기 연출)

// grow = 0~1 · 손목부터 마디 순서로 뼈대가 뻗는다 · 검지 끝(8) 고리 맥박
export const HandSkeleton: React.FC<{hand: Pt[] | null; fit: Fit; t: number; grow?: number}> = ({hand, fit, t, grow = 1}) => {
  if (!hand) return null;
  const P = hand.map(([x, y]) => [fit.x + x * fit.s, fit.y + y * fit.s]);
  const shown = (i: number) => DEPTH[i] <= grow * 6;
  return (
    <svg style={{position: "absolute", inset: 0, width: "100%", height: "100%"}}>
      {EDGES.filter(([a, b]) => shown(a) && shown(b)).map(([a, b]) => (
        <line key={`${a}-${b}`} x1={P[a][0]} y1={P[a][1]} x2={P[b][0]} y2={P[b][1]} stroke="#fff" strokeWidth={3} opacity={0.9} />
      ))}
      {P.map(([x, y], i) => shown(i) && <circle key={i} cx={x} cy={y} r={5} fill={C.info} stroke="#fff" strokeWidth={1.5} />)}
      {shown(8) && <circle cx={P[8][0]} cy={P[8][1]} r={16 + 4 * Math.sin(t * Math.PI * 3)} fill="none" stroke={C.current} strokeWidth={3} />}
    </svg>
  );
};
