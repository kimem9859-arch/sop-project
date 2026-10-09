import {GlitchNoise, glitchStyle} from "./Glitch.tsx";
import {IconCheck} from "./icons.tsx";
import {BTN, C, GLASS, STEPS} from "./theme.ts";

const LABEL: Record<string, [string, string]> = {
  START: ["작업 시작", C.info], IDLE: ["대기", C.label], READY: ["준비", C.info], PROCESS_RUN: ["작업 진행 중", C.done],
  MONITOR: ["감시 중", C.done], WARNING: ["경고", C.warn], BLOCK: ["차단", C.danger],
};

// 왼쪽 위 — 상태 + 작업 순서(지금 시연 화면의 왼쪽 위 목록을 다듬음 · G3 「좀 더 키워도」)
// age = 처음 나타난 뒤 초 — 지지직 등장(10/9 초안 피드백 · 꺾쇠·파동은 넣지 않음) · null = 효과 없이
export const StepPanel: React.FC<{state: string; done: string[]; expected: string | null; alert: "warning" | "block" | null; age: number | null}> =
  ({state, done, expected, alert, age}) => {
    // 네 단계를 다 마친 뒤의 IDLE = 「작업 완료」(「대기」로 보이면 끝난 줄 모른다 · 10/9 초안)
    const [stText, stCol] = state === "IDLE" && done.length === STEPS.length ? ["작업 완료", C.done] : LABEL[state] ?? [state, C.text];
    if (age !== null && age < 0) return null;
    return (
      <div style={{...GLASS, position: "absolute", left: 40, top: 40, width: 440, padding: "22px 26px 18px", ...glitchStyle(age, 3)}}>
        <GlitchNoise age={age} seed={3} />
        <div style={{display: "flex", alignItems: "center", gap: 14, fontSize: 36, fontWeight: 800, color: stCol}}>
          <span style={{width: 16, height: 16, borderRadius: 8, background: stCol, boxShadow: `0 0 14px ${stCol}`}} />
          {stText}
        </div>
        <div style={{fontSize: 21, color: C.label, margin: "8px 0 10px"}}>PECVD 정비 순서</div>
        {STEPS.map((s, i) => {
          const isDone = done.includes(s.button);
          const isCur = !isDone && expected === s.button;
          const col = isDone ? C.done : isCur ? (alert === "block" ? C.danger : alert ? C.warn : C.current) : C.label;
          return (
            <div key={s.button} style={{display: "flex", alignItems: "center", gap: 14, padding: "10px 0", color: col,
              fontSize: isCur ? 33 : 27, fontWeight: isCur ? 800 : 600, opacity: isDone || isCur ? 1 : 0.85}}>
              <span style={{width: 38, height: 38, borderRadius: 19, border: `3px solid ${col}`, display: "grid", placeItems: "center",
                fontSize: 20, fontWeight: 800, fontVariantNumeric: "tabular-nums"}}>
                {isDone ? <IconCheck size={24} color={col} /> : i + 1}
              </span>
              <span style={{flex: 1}}>{s.name}</span>
              <span style={{padding: "2px 11px", borderRadius: 8, background: BTN[s.button], color: "#111", fontSize: 19, fontWeight: 800}}>{s.button}</span>
            </div>
          );
        })}
      </div>
    );
  };
