import type {Box, Pt} from "../lib/dets.ts";
import {HAND} from "./HandSkeleton.tsx";
import {C, FONT, easeOut, type Fit} from "./theme.ts";

// 공구 쥠 판정 시작 — 손과 공구 박스가 겹치는 순간(화면 정지 구간) · 겹친 곳을 채워 강조
// 🔑 실제 시스템 기준 = 「손끝이 요구 공구 박스 안」(Rpi5/Demo/tool_state.py) — 영상에서는 손 전체 상자로 보인다
//   (시안 1 피드백 「원래는 검지포인트이지만 영상에서는 손으로 적용해줘」)
export const handBox = (hand: Pt[]): [number, number, number, number] => {
  const xs = hand.map((p) => p[0]), ys = hand.map((p) => p[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
};

export const Overlap: React.FC<{hand: Pt[]; tool: Box; fit: Fit; age: number; t: number}> = ({hand, tool, fit, age, t}) => {
  const P = (x: number, y: number) => [fit.x + x * fit.s, fit.y + y * fit.s];
  const [hx1, hy1, hx2, hy2] = handBox(hand);
  const [, , tx1, ty1, tx2, ty2] = tool;
  const [HX1, HY1] = P(hx1 - 12, hy1 - 12), [HX2, HY2] = P(hx2 + 12, hy2 + 12);
  const [TX1, TY1] = P(tx1, ty1), [TX2, TY2] = P(tx2, ty2);
  const ix1 = Math.max(HX1, TX1), iy1 = Math.max(HY1, TY1), ix2 = Math.min(HX2, TX2), iy2 = Math.min(HY2, TY2);
  const a = easeOut(Math.min(1, age / 0.35));
  const pulse = 0.5 + 0.5 * Math.sin(t * Math.PI * 4);
  const has = ix2 > ix1 && iy2 > iy1;
  return (
    <svg style={{position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible", opacity: a}}>
      <rect x={HX1} y={HY1} width={HX2 - HX1} height={HY2 - HY1} rx={10} fill="none" stroke={HAND} strokeWidth={4} strokeDasharray="12 8" />
      <text x={HX1} y={HY2 + 34} fill={HAND} fontFamily={FONT} fontSize={24} fontWeight={800} stroke="rgba(0,0,0,0.85)" strokeWidth={5} paintOrder="stroke">손</text>
      {has && <rect x={ix1} y={iy1} width={ix2 - ix1} height={iy2 - iy1} fill={C.current} opacity={0.22 + 0.25 * pulse} />}
      {has && <rect x={ix1} y={iy1} width={ix2 - ix1} height={iy2 - iy1} fill="none" stroke={C.current} strokeWidth={5} />}
      {has && (
        <text x={ix2 + 18} y={(iy1 + iy2) / 2} fill={C.current} fontFamily={FONT} fontSize={32} fontWeight={800}
          stroke="rgba(0,0,0,0.85)" strokeWidth={6} paintOrder="stroke">
          <tspan x={ix2 + 18}>손 · 공구 겹침</tspan><tspan x={ix2 + 18} dy={40}>→ 쥠 판정 시작</tspan>
        </text>
      )}
    </svg>
  );
};
