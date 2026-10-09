import type {Box, Pt} from "../lib/dets.ts";
import {hull} from "../lib/geom.ts";
import {HAND} from "./HandSkeleton.tsx";
import {C, easeOut, type Fit} from "./theme.ts";

// 공구 쥠 판정 시작 — 손과 공구 박스가 겹치는 순간(화면 정지 구간) · 겹친 곳을 채워 강조
// 시안 3 피드백 — 문구 없앰 · 손 구역 = 손 모양에 맞춘 둥근 구역(볼록 껍질 + 여유) · 초록(공구 박스 노랑과 나눔)
// 🔑 실제 시스템 기준 = 「손끝이 요구 공구 박스 안」(Rpi5/Demo/tool_state.py) — 영상에서는 손 전체 구역으로 보인다(사용자 「영상에서는 손으로」)
const PAD = 26;
export const Overlap: React.FC<{hand: Pt[]; tool: Box; fit: Fit; age: number; t: number}> = ({hand, tool, fit, age, t}) => {
  const P = hull(hand.map(([x, y]) => [fit.x + x * fit.s, fit.y + y * fit.s] as [number, number]));
  const d = P.map(([x, y], i) => `${i ? "L" : "M"} ${x.toFixed(1)} ${y.toFixed(1)}`).join(" ") + " Z";
  const [, , tx1, ty1, tx2, ty2] = tool;
  const TX1 = fit.x + tx1 * fit.s, TY1 = fit.y + ty1 * fit.s, TX2 = fit.x + tx2 * fit.s, TY2 = fit.y + ty2 * fit.s;
  const a = easeOut(Math.min(1, age / 0.35));
  const pulse = 0.5 + 0.5 * Math.sin(t * Math.PI * 4);
  const blob = (sw: number, color: string) => <path d={d} fill={color} stroke={color} strokeWidth={sw} strokeLinejoin="round" />;
  return (
    <svg style={{position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible", opacity: a}}>
      <defs>
        <mask id="hand-blob" maskUnits="userSpaceOnUse">{blob(PAD * 2, "white")}</mask>
        <mask id="hand-edge" maskUnits="userSpaceOnUse">{blob(PAD * 2 + 5, "white")}{blob(PAD * 2 - 1, "black")}</mask>
      </defs>
      <path d={d} fill={HAND} opacity={0.16} stroke={HAND} strokeOpacity={0.16} strokeWidth={PAD * 2} strokeLinejoin="round" />
      <rect x={0} y={0} width="100%" height="100%" fill={HAND} mask="url(#hand-edge)" opacity={0.95} />
      <rect x={TX1} y={TY1} width={TX2 - TX1} height={TY2 - TY1} fill={C.current} opacity={0.25 + 0.3 * pulse} mask="url(#hand-blob)" />
    </svg>
  );
};
