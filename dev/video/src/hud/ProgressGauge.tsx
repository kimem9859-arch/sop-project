import type {SubView} from "../lib/uiState.ts";
import {C, GLASS} from "./theme.ts";

// 위 가운데 — 단계 사이 대기(서브 작업) 진행 · 숫자 없이 막대만(배속 구간에서도 읽힌다)
export const ProgressGauge: React.FC<{sub: SubView | null}> = ({sub}) =>
  sub ? (
    <div style={{...GLASS, position: "absolute", left: "50%", top: 40, transform: "translateX(-50%)", width: 600, padding: "14px 22px 16px"}}>
      <div style={{fontSize: 24, fontWeight: 700, marginBottom: 10}}>{sub.label}</div>
      <div style={{height: 10, borderRadius: 5, background: "rgba(0,0,0,.6)", border: `1px solid ${C.edge}`, overflow: "hidden"}}>
        <div style={{width: `${sub.progress * 100}%`, height: "100%", background: `linear-gradient(90deg, ${C.gaugeFrom}, ${C.gaugeTo})`}} />
      </div>
    </div>
  ) : null;
