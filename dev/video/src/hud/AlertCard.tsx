import type {AlertView} from "../lib/uiState.ts";
import {IconStop, IconWarn} from "./icons.tsx";
import {C, GLASS, STEPS, easeOut} from "./theme.ts";

const name = (b: string) => STEPS.find((s) => s.button === b)?.name ?? "";
// 위 가운데(진행 막대 자리) — 첫 시선은 버튼 박스, 카드는 그다음(PRODUCT 원칙 2) · 「전기 차단」 표현 금지 = 「버튼 입력 차단」
// bottom = 위쪽 자리에 버튼·손이 있으면 자막 위로 내린다(카드는 흐리지 않는 대신 자리를 비킨다)
export const AlertCard: React.FC<{alert: AlertView | null; age: number; bottom?: boolean}> = ({alert, age, bottom = false}) => {
  if (!alert) return null;
  const block = alert.kind === "block";
  const col = block ? C.danger : C.warn;
  const k = easeOut(age / 0.35);
  return (
    <>
      {block && <div style={{position: "absolute", inset: 0, pointerEvents: "none",
        boxShadow: `inset 0 0 ${120 + 24 * Math.sin(age * 5)}px rgba(255,82,82,0.32)`}} />}
      <div style={{...GLASS, position: "absolute", left: "50%", ...(bottom ? {bottom: 150} : {top: 40}), transform: `translateX(-50%) translateY(${(1 - k) * -14}px)`,
        opacity: k, filter: `blur(${(1 - k) * 6}px)`, minWidth: 620, padding: "18px 26px", display: "flex", gap: 18, alignItems: "center",
        background: "rgba(14,10,10,0.78)", border: `1px solid ${block ? "rgba(255,82,82,0.55)" : "rgba(255,143,46,0.55)"}`}}>
        {block ? <IconStop size={52} color={col} /> : <IconWarn size={52} color={col} />}
        <div>
          <div style={{fontSize: 36, fontWeight: 800, color: col, letterSpacing: "-0.01em"}}>{block ? "버튼 입력 차단" : "순서가 다릅니다"}</div>
          <div style={{fontSize: 24, fontWeight: 600, marginTop: 4}}>
            {block && alert.button ? `${alert.button} 은 지금 순서가 아닙니다 · ` : ""}지금은 {alert.expected} {name(alert.expected)} 차례
          </div>
        </div>
      </div>
    </>
  );
};
