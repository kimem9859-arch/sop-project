import type {Box} from "../lib/dets.ts";
import {BTN, C, FONT, TOOL_KO, type Fit} from "./theme.ts";

// 모서리 꺾쇠 박스 + 이름표 · next = 다음에 누를 버튼(숨쉬기) · press = 방금 누른 버튼과 경과 초(파동) · revealY = 스캔 선 아래는 숨김
export const ButtonBoxes: React.FC<{
  boxes: Box[]; fit: Fit; t: number; next?: string | null;
  press?: {button: string; age: number; ok: boolean} | null; revealY?: number; tool?: boolean;
}> = ({boxes, fit, t, next = null, press = null, revealY = Infinity, tool = false}) => (
  <svg style={{position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible"}}>
    {boxes.map(([name, score, x1, y1, x2, y2]) => {
      const X1 = fit.x + x1 * fit.s, Y1 = fit.y + y1 * fit.s, X2 = fit.x + x2 * fit.s, Y2 = fit.y + y2 * fit.s;
      if (Y1 > revealY) return null;
      const col = tool ? C.info : BTN[name] ?? C.text;
      const L = Math.min(X2 - X1, Y2 - Y1) * 0.3;
      const glow = name === next ? 0.35 + 0.35 * Math.sin(t * Math.PI * 1.6) : 0;
      const corners = [[X1, Y1, 1, 1], [X2, Y1, -1, 1], [X1, Y2, 1, -1], [X2, Y2, -1, -1]];
      const cx = (X1 + X2) / 2, cy = (Y1 + Y2) / 2;
      return (
        <g key={name}>
          {glow > 0 && <rect x={X1 - 6} y={Y1 - 6} width={X2 - X1 + 12} height={Y2 - Y1 + 12} rx={10}
            fill={col} opacity={glow * 0.35} />}
          {corners.map(([x, y, sx, sy], i) => (
            <path key={i} d={`M ${x} ${y + sy * L} L ${x} ${y} L ${x + sx * L} ${y}`}
              stroke={col} strokeWidth={4} fill="none" strokeLinecap="round" />
          ))}
          <text x={X1} y={Y1 - 10} fill={col} fontFamily={FONT} fontSize={22} fontWeight={700}
            stroke="#000" strokeWidth={4} paintOrder="stroke">{`${tool ? TOOL_KO[name] ?? name : name} ${score.toFixed(2)}`}</text>
          {press && press.button === name && press.age < 0.8 && [0, 0.25].map((d) => {
            const k = Math.max(0, (press.age - d) / 0.55);
            return k > 0 && k < 1 ? <circle key={d} cx={cx} cy={cy} r={20 + k * 90} fill="none"
              stroke={press.ok ? C.done : C.danger} strokeWidth={5 * (1 - k)} opacity={1 - k} /> : null;
          })}
        </g>
      );
    })}
  </svg>
);
