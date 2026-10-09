import type {Box} from "../lib/dets.ts";
import {BTN, C, FONT, TOOL_KO, easeOut, rnd, type Fit} from "./theme.ts";

// 모서리 꺾쇠 박스 + 이름표 · next = 다음에 누를 버튼(숨쉬기) · press = 방금 누른 버튼과 경과 초(파동)
// alert = 경고·차단 중 그 버튼 — 🔑 첫 시선은 손과 버튼(PRODUCT 원칙 2): 경고색·굵게·맥박 · revealY = 스캔 선 아래는 숨김
// intro = 켜짐 스캔 선이 지나간 버튼 → 지난 초(0~0.7) — 탐지 연출(G3 「영상 시작 스캔 연출에 버튼도 탐지 실행 연출」):
//   0~0.35 큰 꺾쇠가 버튼으로 좁혀 듦 · 0~0.25 잡음·번쩍 · 0~0.7 퍼지는 고리 · 0~0.45 「B1 인식」 → 그 뒤 점수
export const ButtonBoxes: React.FC<{
  boxes: Box[]; fit: Fit; t: number; next?: string | null;
  press?: {button: string; age: number; ok: boolean} | null;
  alert?: {button: string | null; kind: "warning" | "block"} | null; revealY?: number; tool?: boolean;
  intro?: Record<string, number>;
}> = ({boxes, fit, t, next = null, press = null, alert = null, revealY = Infinity, tool = false, intro = {}}) => (
  <svg style={{position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible"}}>
    {Object.keys(intro).length > 0 && (
      <filter id="btn-noise">
        <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="1" seed={Math.floor(t * 30)} />
        <feColorMatrix type="saturate" values="0" />
      </filter>
    )}
    {boxes.map(([name, score, x1, y1, x2, y2]) => {
      const X1 = fit.x + x1 * fit.s, Y1 = fit.y + y1 * fit.s, X2 = fit.x + x2 * fit.s, Y2 = fit.y + y2 * fit.s;
      if (Y1 > revealY) return null;
      const hit = !tool && alert?.button === name;
      const alertCol = alert?.kind === "block" ? C.danger : C.warn;
      const col = hit ? alertCol : tool ? C.info : BTN[name] ?? C.text;
      const ia = tool ? undefined : intro[name];          // 탐지 연출 중이면 지난 초
      const grow = ia === undefined ? 0 : 0.8 * (1 - easeOut(ia / 0.35)); // 큰 꺾쇠 → 제 크기
      const cx = (X1 + X2) / 2, cy = (Y1 + Y2) / 2;
      const pad = (hit ? 8 : 0) + grow * Math.max(X2 - X1, Y2 - Y1);
      const bx1 = X1 - pad, by1 = Y1 - pad, bx2 = X2 + pad, by2 = Y2 + pad;
      const L = Math.min(bx2 - bx1, by2 - by1) * 0.32;
      const glow = name === next ? 0.35 + 0.35 * Math.sin(t * Math.PI * 1.6) : 0;
      const beat = hit ? 0.5 + 0.5 * Math.sin(t * Math.PI * 4) : 0;
      const corners = [[bx1, by1, 1, 1], [bx2, by1, -1, 1], [bx1, by2, 1, -1], [bx2, by2, -1, -1]];
      const label = `${tool ? TOOL_KO[name] ?? name : name}`;
      const detecting = ia !== undefined && ia < 0.45;
      return (
        <g key={name}>
          {ia !== undefined && ia < 0.25 && (
            <>
              <rect x={X1} y={Y1} width={X2 - X1} height={Y2 - Y1} filter="url(#btn-noise)" opacity={(0.5 + 0.3 * rnd(Math.floor(t * 30))) * (1 - ia / 0.25)} />
              <rect x={X1} y={Y1} width={X2 - X1} height={Y2 - Y1} fill="#fff" opacity={0.35 * (1 - ia / 0.25)} />
            </>
          )}
          {ia !== undefined && <circle cx={cx} cy={cy} r={(X2 - X1) * 0.6 + 70 * (ia / 0.7)} fill="none" stroke={col} strokeWidth={3} opacity={1 - ia / 0.7} />}
          {glow > 0 && <rect x={X1 - 6} y={Y1 - 6} width={X2 - X1 + 12} height={Y2 - Y1 + 12} rx={10} fill={col} opacity={glow * 0.3} />}
          {hit && <rect x={bx1 - 6} y={by1 - 6} width={bx2 - bx1 + 12} height={by2 - by1 + 12} rx={12}
            fill={alertCol} opacity={0.18 + 0.22 * beat} />}
          {corners.map(([x, y, sx, sy], i) => (
            <path key={i} d={`M ${x} ${y + sy * L} L ${x} ${y} L ${x + sx * L} ${y}`}
              stroke={col} strokeWidth={hit ? 6 : 4} fill="none" strokeLinecap="round" />
          ))}
          <text x={bx1} y={by1 - 12} fill={col} fontFamily={FONT} fontSize={hit ? 28 : 22} fontWeight={800}
            stroke="rgba(0,0,0,0.85)" strokeWidth={5} paintOrder="stroke">
            {label}{detecting ? <tspan fontWeight={700} dx={8}>인식</tspan>
              : <tspan fontWeight={600} fontSize={hit ? 22 : 18} dx={8} style={{fontVariantNumeric: "tabular-nums"}}>{score.toFixed(2)}</tspan>}
          </text>
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
