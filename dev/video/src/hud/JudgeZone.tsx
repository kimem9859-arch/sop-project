import type {Box} from "../lib/dets.ts";
import {DWELL_MS, type Dwell} from "../lib/judge.ts";
import {C, FONT, easeOut, type Fit} from "./theme.ts";

// 판정 기준 장면 — 오답 버튼 위에 판정 구역과 「머묾 타이머」(발표 S20 그림을 실제 화면 위에 · 값 = lib/judge 기록)
// 바깥 링 = 다가온 단계(점선) · 안쪽 상자 = 누를 자리 · 원 = 머문 시간(0.3초가 한 바퀴)
//   경고(warn) = 한 바퀴 차고 「0.3초 머묾 → 경고」 · 스침(graze) = 중간에 멈추고 「0.07초 → 경고 없음」(초록 · 기준은 절 제목이 말한다)
// 이름표 = 링 위(화면 위 끝에 닿으면 링 아래) · 🔑 링 폭은 개념 표시 — 실제 시스템 링(XGA 화면에서 상자 둘레 40 px)과 폰 화면의 크기는 다르다
export const JudgeZone: React.FC<{box: Box; fit: Fit; dwell: Dwell; t: number}> = ({box, fit, dwell, t}) => {
  const [, , x1, y1, x2, y2] = box;
  const X1 = fit.x + x1 * fit.s, Y1 = fit.y + y1 * fit.s, X2 = fit.x + x2 * fit.s, Y2 = fit.y + y2 * fit.s;
  const cx = (X1 + X2) / 2, cy = (Y1 + Y2) / 2, size = Math.max(X2 - X1, Y2 - Y1);
  const ring = size * 0.75, inner = 8;
  const warn = dwell.kind === "warn";
  const col = warn ? (dwell.done ? C.warn : C.current) : dwell.done ? C.done : C.current;
  const r = size * 0.5 + inner + 16;
  const circ = 2 * Math.PI * r;
  const appear = easeOut(Math.min(1, dwell.progress * 3 + (dwell.done ? 1 : 0)));
  const elapsed = warn ? (dwell.progress * (dwell.endMs - dwell.startMs)) / 1000 : (dwell.progress * DWELL_MS) / 1000;
  const pulse = warn && dwell.done ? 0.5 + 0.5 * Math.sin(t * Math.PI * 6) : 0;
  const result = warn ? "0.3초 머묾 → 경고" : `${elapsed.toFixed(2)}초 → 경고 없음`;
  return (
    <svg style={{position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible", opacity: appear}}>
      <rect x={X1 - ring} y={Y1 - ring} width={X2 - X1 + 2 * ring} height={Y2 - Y1 + 2 * ring} rx={14} fill="none"
        stroke={C.info} strokeWidth={3} strokeDasharray="10 8" opacity={0.9} />
      <text x={X1 - ring} y={Y1 - ring - 12 < 34 ? Y2 + ring + 30 : Y1 - ring - 12} fill={C.info} fontFamily={FONT} fontSize={22} fontWeight={800}
        stroke="rgba(0,0,0,0.85)" strokeWidth={5} paintOrder="stroke">판정 구역</text>
      <rect x={X1 - inner} y={Y1 - inner} width={X2 - X1 + 2 * inner} height={Y2 - Y1 + 2 * inner} rx={6}
        fill={col} fillOpacity={0.12 + 0.2 * pulse} stroke={col} strokeWidth={4} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(0,0,0,0.6)" strokeWidth={10} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={col} strokeWidth={7} strokeLinecap="round"
        strokeDasharray={`${circ * dwell.progress} ${circ}`} transform={`rotate(-90 ${cx} ${cy})`} />
      <text x={cx + r + 16} y={cy + 12} fill={col} fontFamily={FONT} fontSize={34} fontWeight={800}
        stroke="rgba(0,0,0,0.85)" strokeWidth={6} paintOrder="stroke" style={{fontVariantNumeric: "tabular-nums"}}>
        {dwell.done ? result : `${elapsed.toFixed(2)}초`}
      </text>
    </svg>
  );
};
