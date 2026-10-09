import {IconCheck} from "./icons.tsx";
import {BTN, C, GLASS, STEPS} from "./theme.ts";

const LABEL: Record<string, [string, string]> = {
  IDLE: ["대기", C.label], READY: ["준비", C.info], PROCESS_RUN: ["작업 진행 중", C.done],
  MONITOR: ["감시 중", C.done], WARNING: ["경고", C.warn], BLOCK: ["차단", C.danger],
};

// 왼쪽 위 — 상태 + 작업 순서(지금 시연 화면의 왼쪽 위 목록을 다듬음) · 손·버튼이 있는 가운데를 비우려 폭을 좁게
export const StepPanel: React.FC<{state: string; done: string[]; expected: string | null; alert: "warning" | "block" | null; opacity: number}> =
  ({state, done, expected, alert, opacity}) => {
    const [stText, stCol] = LABEL[state] ?? [state, C.text];
    return (
      <div style={{...GLASS, position: "absolute", left: 40, top: 40, width: 360, padding: "18px 22px 14px", opacity}}>
        <div style={{display: "flex", alignItems: "center", gap: 12, fontSize: 30, fontWeight: 800, color: stCol}}>
          <span style={{width: 14, height: 14, borderRadius: 7, background: stCol, boxShadow: `0 0 12px ${stCol}`}} />
          {stText}
        </div>
        <div style={{fontSize: 18, color: C.label, margin: "6px 0 8px"}}>PECVD 정비 순서</div>
        {STEPS.map((s, i) => {
          const isDone = done.includes(s.button);
          const isCur = !isDone && expected === s.button;
          const col = isDone ? C.done : isCur ? (alert === "block" ? C.danger : alert ? C.warn : C.current) : C.label;
          return (
            <div key={s.button} style={{display: "flex", alignItems: "center", gap: 12, padding: "8px 0", color: col,
              fontSize: isCur ? 28 : 23, fontWeight: isCur ? 800 : 600, opacity: isDone || isCur ? 1 : 0.8}}>
              <span style={{width: 32, height: 32, borderRadius: 16, border: `2.5px solid ${col}`, display: "grid", placeItems: "center",
                fontSize: 17, fontWeight: 800, fontVariantNumeric: "tabular-nums"}}>
                {isDone ? <IconCheck size={20} color={col} /> : i + 1}
              </span>
              <span style={{flex: 1}}>{s.name}</span>
              <span style={{padding: "1px 9px", borderRadius: 7, background: BTN[s.button], color: "#111", fontSize: 16, fontWeight: 800}}>{s.button}</span>
            </div>
          );
        })}
      </div>
    );
  };
