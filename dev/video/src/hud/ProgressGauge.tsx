import type {SubView} from "../lib/uiState.ts";
import {C, GLASS, easeOut} from "./theme.ts";

// 위 가운데 — 단계 사이 대기(서브 작업) 진행 막대 + 남은 초(10/9 초안 피드백 「초(s)가 없어 추가」)
// age = 대기 시작 뒤 초 · first = 판의 첫 대기(B1) — 그때만 바운스로 들어오고 꺾쇠로 강조(「첫번째 대기 시간 UI만」)
//   0~0.55 작게 → 크게 넘쳤다 제자리(바운스) · 0~0.4 꺾쇠가 바깥에서 좁혀 옴 · ~1.8 꺾쇠 맥박 · 1.8~2.2 꺾쇠 사라짐
// top = 단계 완료 안내가 위에 떠 있을 때 아래로 비켜 선다
const W = 600, H = 96;
export const ProgressGauge: React.FC<{sub: SubView | null; age: number; first: boolean; top?: number}> = ({sub, age, first, top = 40}) => {
  if (!sub) return null;
  const left = Math.max(0, Math.ceil((sub.totalMs * (1 - sub.progress)) / 1000 - 1e-6));
  const bounce = first && age < 0.55 ? 1 + 0.12 * Math.sin(Math.PI * Math.min(1, age / 0.55) * 1.5) * (1 - age / 0.55) - 0.35 * (1 - easeOut(age / 0.2)) : 1;
  const br = first && age < 2.2 ? (age < 1.8 ? 1 : 1 - (age - 1.8) / 0.4) : 0;
  const spread = 60 * (1 - easeOut(age / 0.4)) + 6 * Math.sin(age * Math.PI * 3) * (age > 0.4 ? 1 : 0);
  const L = 34;
  return (
    <div style={{position: "absolute", left: "50%", top, width: W, transform: `translateX(-50%) scale(${bounce})`}}>
      <div style={{...GLASS, padding: "14px 22px 16px"}}>
        <div style={{display: "flex", alignItems: "baseline", marginBottom: 10}}>
          <span style={{flex: 1, fontSize: 24, fontWeight: 700}}>{sub.label}</span>
          <span style={{fontSize: 30, fontWeight: 800, color: C.current, fontVariantNumeric: "tabular-nums"}}>{left}s</span>
        </div>
        <div style={{height: 10, borderRadius: 5, background: "rgba(0,0,0,.6)", border: `1px solid ${C.edge}`, overflow: "hidden"}}>
          <div style={{width: `${sub.progress * 100}%`, height: "100%", background: `linear-gradient(90deg, ${C.gaugeFrom}, ${C.gaugeTo})`}} />
        </div>
      </div>
      {br > 0 && (
        <svg style={{position: "absolute", left: 0, top: 0, width: W, height: H, overflow: "visible", opacity: br}}>
          {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sy], i) => {
            const x = sx < 0 ? -12 - spread : W + 12 + spread, y = sy < 0 ? -12 - spread : H + 12 + spread;
            return <path key={i} d={`M ${x} ${y - sy * L} L ${x} ${y} L ${x - sx * L} ${y}`} stroke={C.current} strokeWidth={5} fill="none" strokeLinecap="round" />;
          })}
        </svg>
      )}
    </div>
  );
};
