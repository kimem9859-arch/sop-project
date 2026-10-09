import {IconCheck} from "./icons.tsx";
import {C, GLASS, STEPS, easeOut} from "./theme.ts";

// 위 가운데 — 단계 완료 안내(10/9 초안 피드백 「각 단계가 끝나면 상단 중앙 위에 단계 완료 안내 UI」)
// age = 완료 뒤 초 · SHOW 초 동안 — 바운스로 등장(살짝 커졌다 제자리 · 시안 3 피드백 「지지직 효과는 제거 … 카드 바운스」) · 체크가 그려짐 · 끝 0.4초 사라짐
export const DONE_SHOW = 2.6;
export const StepDone: React.FC<{done: {button: string; order: number} | null; age: number; all: boolean}> = ({done, age, all}) => {
  if (!done || age < 0 || age >= DONE_SHOW) return null;
  const i = STEPS.findIndex((s) => s.button === done.button);
  const next = STEPS[i + 1];
  const out = age > DONE_SHOW - 0.4 ? (DONE_SHOW - age) / 0.4 : 1;
  const draw = easeOut((age - 0.15) / 0.4);
  const sc = age < 0.5 ? 0.82 + 0.18 * easeOut(age / 0.22) + 0.07 * Math.sin(Math.PI * Math.min(1, age / 0.5)) * (1 - age / 0.5) : 1;
  return (
    <div style={{...GLASS, position: "absolute", left: "50%", top: 40, minWidth: 520, padding: "14px 30px 14px 22px", display: "flex", gap: 18, alignItems: "center",
      border: `1px solid ${C.done}`, transform: `translateX(-50%) scale(${sc})`, opacity: Math.min(1, age / 0.12) * out}}>
      <div style={{width: 52, height: 52, borderRadius: 26, border: `3px solid ${C.done}`, display: "grid", placeItems: "center",
        boxShadow: `0 0 18px ${C.done}`, clipPath: `inset(0 ${(1 - draw) * 100}% 0 0)`}}>
        <IconCheck size={32} color={C.done} />
      </div>
      <div>
        <div style={{fontSize: 34, fontWeight: 800, color: C.done}}>{all ? "모든 단계 완료" : `${done.order}단계 완료`}</div>
        <div style={{fontSize: 22, fontWeight: 600, color: C.label, marginTop: 2}}>
          {all ? "PECVD 정비 순서를 지켰습니다" : `${STEPS[i]?.name ?? ""}${next ? ` · 다음 ${next.button} ${next.name}` : ""}`}
        </div>
      </div>
    </div>
  );
};
