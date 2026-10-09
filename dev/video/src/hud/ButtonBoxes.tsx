import type {Box} from "../lib/dets.ts";
import {BTN, C, FONT, TOOL_KO, easeOut, rnd, type Fit} from "./theme.ts";

// 모서리 꺾쇠 박스 + 이름표 · next = 다음에 누를 버튼(숨쉬기) · press = 방금 누른 버튼과 경과 초(파동)
// alert = 경고·차단 중 그 버튼 — 🔑 첫 시선은 손과 버튼(PRODUCT 원칙 2): 경고색·굵게·맥박 · revealY = 스캔 선 아래는 숨김
// intro = 켜짐 스캔 선이 지나간 버튼 → 지난 초(0~BTN_INTRO_SEC) — 탐지 연출(10/9 초안 피드백 「파동이 희미 … 더 선명하게 · 지지직 효과 추가」):
//   0~0.4 큰 꺾쇠가 버튼으로 좁혀 듦 · 0~0.45 잡음·번쩍·색 어긋남(지지직) · 0~1.0 굵은 파동 두 겹(빛 번짐) · 0~0.6 「B1 인식」 → 그 뒤 점수
// 누름 파동 = 그 버튼 색(「초록색인데 버튼 오버레이 색과 동일한 색으로」) · 틀린 누름만 빨강
// tool + toolState = 공구 쥠 판정(「공구 오버레이 색이 바뀐다거나 … 완료 시 효과」): 확인 중 = 노랑·맥박·훑는 선·확인 칸 · 쥠 = 초록·번쩍·파동
type ToolState = {phase: string; age: number; checks: number; wrong: boolean};
const CONFIRM = 3;

const Rings: React.FC<{cx: number; cy: number; r0: number; age: number; col: string; delays: number[]; dur: number; reach: number; w: number}> =
  ({cx, cy, r0, age, col, delays, dur, reach, w}) => (
    <>
      {delays.map((d) => {
        const k = (age - d) / dur;
        if (k <= 0 || k >= 1) return null;
        const r = r0 + reach * easeOut(k), sw = w * (1 - k) + 1.5;
        return (
          <g key={d}>
            <circle cx={cx} cy={cy} r={r} fill="none" stroke={col} strokeWidth={sw * 3.2} opacity={0.22 * (1 - k)} />
            <circle cx={cx} cy={cy} r={r} fill="none" stroke={col} strokeWidth={sw} opacity={1 - k * 0.85} />
          </g>
        );
      })}
    </>
  );

export const ButtonBoxes: React.FC<{
  boxes: Box[]; fit: Fit; t: number; next?: string | null;
  press?: {button: string; age: number; ok: boolean} | null;
  alert?: {button: string | null; kind: "warning" | "block"} | null; revealY?: number; tool?: boolean;
  intro?: Record<string, number>; toolState?: ToolState | null; pressAt?: Box | null;
}> = ({boxes, fit, t, next = null, press = null, alert = null, revealY = Infinity, tool = false, intro = {}, toolState = null, pressAt = null}) => (
  <svg style={{position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible"}}>
    <filter id={tool ? "tool-noise" : "btn-noise"}>
      <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="1" seed={Math.floor(t * 30)} />
      <feColorMatrix type="saturate" values="0" />
    </filter>
    {boxes.map(([name, score, x1, y1, x2, y2]) => {
      const X1 = fit.x + x1 * fit.s, Y1 = fit.y + y1 * fit.s, X2 = fit.x + x2 * fit.s, Y2 = fit.y + y2 * fit.s;
      if (Y1 > revealY) return null;
      const ts = tool ? toolState : null;
      const hit = !tool && alert?.button === name;
      const alertCol = alert?.kind === "block" ? C.danger : C.warn;
      const col = hit ? alertCol : !tool ? BTN[name] ?? C.text
        : ts?.wrong ? C.warn : ts?.phase === "grasped" ? C.done : ts?.phase === "checking" ? C.current : C.info;
      const ia = tool ? undefined : intro[name];                       // 탐지 연출 중이면 지난 초
      const ta = ts && (ts.phase === "checking" || ts.phase === "grasped") ? ts.age : undefined; // 공구 단계가 바뀐 뒤 초
      const grow = ia !== undefined ? 0.9 * (1 - easeOut(ia / 0.4))
        : ta !== undefined && ts?.phase === "checking" ? 0.5 * (1 - easeOut(ta / 0.35)) : 0;
      const cx = (X1 + X2) / 2, cy = (Y1 + Y2) / 2, bw = X2 - X1, bh = Y2 - Y1;
      const pad = (hit ? 8 : 0) + grow * Math.max(bw, bh);
      const bx1 = X1 - pad, by1 = Y1 - pad, bx2 = X2 + pad, by2 = Y2 + pad;
      const L = Math.min(bx2 - bx1, by2 - by1) * 0.32;
      const glow = name === next ? 0.35 + 0.35 * Math.sin(t * Math.PI * 1.6) : 0;
      const beat = hit ? 0.5 + 0.5 * Math.sin(t * Math.PI * 4) : 0;
      const corners = [[bx1, by1, 1, 1], [bx2, by1, -1, 1], [bx1, by2, 1, -1], [bx2, by2, -1, -1]];
      const path = (x: number, y: number, sx: number, sy: number) => `M ${x} ${y + sy * L} L ${x} ${y} L ${x + sx * L} ${y}`;
      const fz = Math.floor(t * 30);
      const glitch = ia !== undefined && ia < 0.45 ? 1 - ia / 0.45 : 0;   // 지지직 세기
      const split = glitch * (4 + 4 * rnd(fz + x1));                      // 색 어긋남 폭
      const detecting = ia !== undefined && ia < 0.6;
      const checking = ts?.phase === "checking", grasped = ts?.phase === "grasped";
      const sw = hit || checking || grasped ? 6 : 4;
      const label = tool ? (TOOL_KO[name] ?? name) : name;
      const labelOp = detecting && ia! < 0.3 ? (rnd(fz * 3 + x1) > 0.35 ? 1 : 0.15) : 1;
      return (
        <g key={name}>
          {glitch > 0 && (
            <>
              <rect x={X1} y={Y1} width={bw} height={bh} filter="url(#btn-noise)" opacity={(0.6 + 0.3 * rnd(fz)) * glitch} />
              <rect x={X1} y={Y1} width={bw} height={bh} fill="#fff" opacity={ia! < 0.18 ? 0.5 * (1 - ia! / 0.18) : 0} />
              {[0, 1].map((i) => (
                <rect key={i} x={X1 - bw * 0.6} y={Y1 + rnd(fz * 7 + i + x1) * bh} width={bw * 2.2} height={2 + rnd(fz * 5 + i) * 6}
                  fill={col} opacity={0.6 * glitch} />
              ))}
              {corners.map(([x, y, sx, sy], i) => (
                <g key={i}>
                  <path d={path(x + split, y, sx, sy)} stroke="rgb(255,40,100)" strokeWidth={4} fill="none" opacity={0.8 * glitch} />
                  <path d={path(x - split, y, sx, sy)} stroke="rgb(40,220,255)" strokeWidth={4} fill="none" opacity={0.8 * glitch} />
                </g>
              ))}
            </>
          )}
          {ia !== undefined && <Rings cx={cx} cy={cy} r0={Math.max(bw, bh) * 0.6} age={ia} col={col} delays={[0, 0.22]} dur={0.75} reach={120} w={8} />}
          {glow > 0 && <rect x={X1 - 6} y={Y1 - 6} width={bw + 12} height={bh + 12} rx={10} fill={col} opacity={glow * 0.3} />}
          {hit && <rect x={bx1 - 6} y={by1 - 6} width={bx2 - bx1 + 12} height={by2 - by1 + 12} rx={12}
            fill={alertCol} opacity={0.18 + 0.22 * beat} />}
          {checking && (
            // 쥠 판정 중 — 노랑 맥박 + 위→아래 훑는 선(판정이 돌고 있다)
            <>
              <rect x={bx1} y={by1} width={bx2 - bx1} height={by2 - by1} rx={8} fill={col} opacity={0.1 + 0.1 * Math.sin(t * Math.PI * 4)} />
              <rect x={bx1} y={by1 + ((t * 0.9) % 1) * (by2 - by1)} width={bx2 - bx1} height={3} fill={col} opacity={0.75} />
            </>
          )}
          {grasped && ta !== undefined && ta < 0.35 && <rect x={bx1} y={by1} width={bx2 - bx1} height={by2 - by1} rx={8} fill={col} opacity={0.55 * (1 - ta / 0.35)} />}
          {grasped && ta !== undefined && <Rings cx={cx} cy={cy} r0={Math.max(bw, bh) * 0.55} age={ta} col={col} delays={[0, 0.2]} dur={0.8} reach={140} w={9} />}
          {corners.map(([x, y, sx, sy], i) => (
            <path key={i} d={path(x, y, sx, sy)} stroke={col} strokeWidth={sw} fill="none" strokeLinecap="round" />
          ))}
          <text x={bx1} y={by1 - 12} fill={col} fontFamily={FONT} fontSize={hit ? 28 : checking || grasped ? 26 : 22} fontWeight={800}
            stroke="rgba(0,0,0,0.85)" strokeWidth={5} paintOrder="stroke" opacity={labelOp}>
            {label}
            {detecting ? <tspan fontWeight={700} dx={8}>인식</tspan>
              : checking ? <tspan fontWeight={700} dx={8}>쥠 판정 중</tspan>
              : grasped ? <tspan fontWeight={800} dx={8}>쥠 확인</tspan>
              : <tspan fontWeight={600} fontSize={hit ? 22 : 18} dx={8} style={{fontVariantNumeric: "tabular-nums"}}>{score.toFixed(2)}</tspan>}
          </text>
          {(checking || grasped) && Array.from({length: CONFIRM}, (_, i) => (
            // 확인 칸 — 연속 확인 수(3번째 = 쥠) · 박스 오른쪽 위(아래는 자막에 가린다)
            <rect key={i} x={bx2 - CONFIRM * 34 + 6 + i * 34} y={by1 - 30} width={28} height={10} rx={3}
              fill={i < (ts?.checks ?? 0) ? col : "rgba(255,255,255,0.22)"} stroke="rgba(0,0,0,0.7)" strokeWidth={1.5} />
          ))}
          {press && press.button === name && press.age < 1.0 && (
            <>
              {press.age < 0.3 && <circle cx={cx} cy={cy} r={Math.max(bw, bh) * 0.75} fill={press.ok ? col : C.danger} opacity={0.5 * (1 - press.age / 0.3)} />}
              <Rings cx={cx} cy={cy} r0={26} age={press.age} col={press.ok ? col : C.danger} delays={[0, 0.15, 0.3]} dur={0.6} reach={140} w={10} />
            </>
          )}
        </g>
      );
    })}
    {press && pressAt && press.age < 1.0 && !boxes.some((b) => b[0] === press.button) && (() => {
      // 누르는 손가락이 버튼을 가려 그 순간 박스가 없을 때 — 직전에 보인 자리에 파동만(박스는 그리지 않는다)
      const [, , x1, y1, x2, y2] = pressAt;
      const cx = fit.x + ((x1 + x2) / 2) * fit.s, cy = fit.y + ((y1 + y2) / 2) * fit.s, r = Math.max(x2 - x1, y2 - y1) * fit.s;
      const col = press.ok ? BTN[press.button] ?? C.text : C.danger;
      return (
        <>
          {press.age < 0.3 && <circle cx={cx} cy={cy} r={r * 0.75} fill={col} opacity={0.5 * (1 - press.age / 0.3)} />}
          <Rings cx={cx} cy={cy} r0={26} age={press.age} col={col} delays={[0, 0.15, 0.3]} dur={0.6} reach={140} w={10} />
        </>
      );
    })()}
  </svg>
);
