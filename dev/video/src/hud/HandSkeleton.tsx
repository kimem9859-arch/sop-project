import type {Pt} from "../lib/dets.ts";
import {C, FONT, easeOut, type Fit} from "./theme.ts";

// MediaPipe 손 21점 연결
const EDGES = [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [17, 18], [18, 19], [19, 20], [0, 17]];
const DEPTH = [0, 1, 2, 3, 4, 1, 2, 3, 4, 2, 3, 4, 5, 3, 4, 5, 6, 3, 4, 5, 6]; // 손목에서 마디 수(뻗기 연출)
export const HAND = "#2bea74"; // 선명한 초록 — G3 「흰색이라 잘 보이지 않아」 → 「파랑 버튼 색과 비슷해서 초록색으로」
export const INTRO_SEC = 4.0;  // 첫 등장 연출 길이 — 끝나면 꺾쇠·표시도 없어지고 뼈대만(G3 「연출이 끝나면 조준 꺾쇠도 없어지는 것으로」)

// age = 본편에서 손이 처음 나타난 뒤 지난 초(firstHandAt) · INTRO_SEC 이 지나면(또는 첫 등장이 아니면 큰 값) 연출 없이 뼈대만
// 첫 등장 연출(G3 「첫 등장에만」·「손 등장에도 시스템 가동 효과」) — 켜짐과 같은 결:
//   0~0.35 꺾쇠 안 지지직 잡음·줄무늬 · 0~0.5 꺾쇠가 손으로 좁혀 옴 「손 인식」 · 0.1~0.55 스캔 선이 손을 훑음
//   0.45~1.1 손목부터 뼈대가 뻗고 관절 점이 튀어나옴 · 0.55~ 「● 손 추적 시작」 · 1.0~1.3 꺾쇠·표시가 사라짐
// 시안 3 피드백 「손 탐지 실행 연출이 너무 빨라 스캔인지 지지직인지 구분이 안되는데 … 느리게 왕복 1회」 → 잡음·줄무늬 없앰:
//   0~0.5 꺾쇠가 손으로 좁혀 옴 「손 인식」 · 0.3~1.9 스캔 선 위 → 아래 → 위 한 번 · 1.9~3.4 스캔이 끝난 뒤 뼈대가 천천히 뻗음
//   (시안 4 피드백 「21점 오버레이 나타남 속도가 너무 빨라 … 스캔이 끝나면 나타나도록」) · 3.4~ 「● 손 추적 시작」 · 3.6~4.0 꺾쇠 사라짐
// pulse = 손 전체 맥박(공구 쥠 판정 시작 — 「검지 포인트만 … 손 오버레이 전체에 효과를」) · 그동안 검지 고리는 숨김
// ring = 검지 끝(8) 고리 색(경고·차단 중엔 그 색)
// dim = 공구를 쥔 동안 — 뼈대를 옅게 · 검지 고리 숨김: 손 모델이 렌치 막대를 펴진 검지로 읽는다(10/9 초안 원본 프레임 대조 ·
//   합성의 시간 밀림이 아니라 모델 판독) — 보이는 방식만 바꾸고 좌표는 그대로(설계 §5 「연출은 보여 주는 방식만」)
export const HandSkeleton: React.FC<{hand: Pt[] | null; fit: Fit; t: number; age: number | null; ring?: string; dim?: boolean; pulse?: boolean}> =
  ({hand, fit, t, age, ring = C.current, dim = false, pulse = false}) => {
    if (!hand || age === null) return null;
    const P = hand.map(([x, y]) => [fit.x + x * fit.s, fit.y + y * fit.s]);
    const intro = age < INTRO_SEC;
    const grow = intro ? Math.max(0, Math.min(1, (age - 1.9) / 1.5)) * 6.01 : 6.01;
    const shown = (i: number) => DEPTH[i] <= grow;
    const pop = (i: number) => Math.min(1, Math.max(0, (grow - DEPTH[i]) / 0.8));
    // 조준 꺾쇠 — 손 둘레 상자
    const xs = P.map((p) => p[0]), ys = P.map((p) => p[1]);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    const k = 1.75 - 0.6 * easeOut(age / 0.5);
    const hw = ((Math.max(...xs) - Math.min(...xs)) / 2 + 24) * k, hh = ((Math.max(...ys) - Math.min(...ys)) / 2 + 24) * k;
    const bx = cx - hw, by = cy - hh, bw = hw * 2, bh = hh * 2;
    const lockOp = age < 3.6 ? Math.min(1, age / 0.15) : Math.max(0, 1 - (age - 3.6) / 0.4);
    const L = Math.min(hw, hh) * 0.35;
    const corners = [[bx, by, 1, 1], [bx + bw, by, -1, 1], [bx, by + bh, 1, -1], [bx + bw, by + bh, -1, -1]];
    const u = (age - 0.3) / 1.6;   // 스캔 왕복 0~1
    const io = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
    const scan = u > 0 && u < 1 ? by + (u < 0.5 ? io(u * 2) : 1 - io((u - 0.5) * 2)) * bh : null;
    const tracking = age >= 3.4;
    const pz = pulse ? 1 + 0.045 * Math.sin(t * Math.PI * 3) : 1;
    return (
      <svg style={{position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible", opacity: dim ? 0.35 : 1}}>
        {intro && (
          <defs>
            <clipPath id="hand-box"><rect x={bx} y={by} width={bw} height={bh} rx={6} /></clipPath>
            <linearGradient id="hand-scan" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={HAND} stopOpacity="0" />
              <stop offset="1" stopColor={HAND} stopOpacity="0.4" />
            </linearGradient>
          </defs>
        )}
        {intro && (
          <g clipPath="url(#hand-box)">
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
        <g transform={`translate(${cx} ${cy}) scale(${pz}) translate(${-cx} ${-cy})`}
          style={pulse ? {filter: `drop-shadow(0 0 ${8 + 8 * (pz - 1) / 0.045}px ${HAND})`} : undefined}>
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
        </g>
        {grow >= 6 && !dim && !pulse && <circle cx={P[8][0]} cy={P[8][1]} r={18 + 4 * Math.sin(t * Math.PI * 3)} fill="none" stroke={ring} strokeWidth={5} />}
      </svg>
    );
  };
