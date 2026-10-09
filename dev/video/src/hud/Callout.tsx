import {calloutAt, type CalloutDef} from "../lib/callout.ts";
import {C, FONT, easeOut} from "./theme.ts";

// 화면 속 물건 짚기(검출 모델이 없는 것 — 타워램프) · keys = [원본 초, x, y, w, h](사본 픽셀) 사이를 이어서 따라간다
// 🔑 사람이 짚은 표시 — AI 검출 박스와 구분되게 점선 + 둥근 모서리 · 글은 박스 오른쪽 아래(위 가운데 알림 카드와 겹치지 않게)

const COL = {warn: C.warn, danger: C.danger, done: C.done, label: C.label};
export const Callout: React.FC<{def: CalloutDef; sec: number; age: number; fit: {s: number; x: number; y: number}}> = ({def, sec, age, fit}) => {
  const r = calloutAt(def.keys, sec);
  if (!r) return null;
  const [x, y, w, h] = r;
  const X = fit.x + x * fit.s, Y = fit.y + y * fit.s, Wd = w * fit.s, Hd = h * fit.s;
  const a = easeOut(Math.min(1, age / 0.35));
  return (
    <>
      <svg style={{position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible", opacity: a}}>
        <rect x={X - 10} y={Y - 10} width={Wd + 20} height={Hd + 20} rx={16} fill="none" stroke={C.text} strokeWidth={4} strokeDasharray="12 8" />
        <polyline points={`${X + Wd + 10},${Y + Hd * 0.5} ${X + Wd + 50},${Y + Hd * 0.5} ${X + Wd + 50},${Y + Hd + 34}`} fill="none" stroke={C.text} strokeWidth={3} />
      </svg>
      <div style={{position: "absolute", left: X + Wd + 30, top: Y + Hd + 34, fontFamily: FONT, opacity: a,
        background: "rgba(10,12,14,0.82)", border: `1px solid ${C.edge}`, borderRadius: 16, padding: "12px 20px"}}>
        <div style={{fontSize: 34, fontWeight: 800, color: C.text}}>{def.label}</div>
        {def.lines.map((l, i) => <div key={i} style={{fontSize: 26, fontWeight: 700, color: COL[l.color], marginTop: 4}}>{l.text}</div>)}
      </div>
    </>
  );
};
