import {C, FONT} from "./theme.ts";

// 왼쪽 아래 해제 버튼 — 실제 시연 화면은 경고 · 차단 알림에 「해제」 버튼이 있다(Rpi5/Demo/overlay.py · safety_console._on_alert_release)
// 시안 3 피드백 「경고 해제 버튼을 좌측 하단에」 · 차단 때는 음성 알림 문장(「차단 해제를 누른 뒤」)과 같은 이름 · 길잡이 위에 놓는다
export const ReleaseButton: React.FC<{kind: "warning" | "block"; t: number}> = ({kind, t}) => {
  const col = kind === "block" ? C.danger : C.warn;
  const beat = 0.5 + 0.5 * Math.sin(t * Math.PI * 2);
  return (
    <div style={{position: "absolute", left: 40, bottom: 80, display: "flex", alignItems: "center", gap: 12, padding: "14px 28px",
      borderRadius: 16, fontFamily: FONT, fontSize: 30, fontWeight: 800, color: "#fff", background: "rgba(20,12,12,0.88)",
      border: `3px solid ${col}`, boxShadow: `0 0 ${10 + 16 * beat}px ${col}`}}>
      <span style={{width: 14, height: 14, borderRadius: 7, background: col}} />
      {kind === "block" ? "차단 해제" : "경고 해제"}
    </div>
  );
};
