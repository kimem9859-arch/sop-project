import {C, FONT, easeOut} from "./theme.ts";

// 왼쪽 아래 차단 해제 버튼 — 실제 시연 화면은 차단 알림에 「해제」 버튼이 있다(Rpi5/Demo/overlay.py · safety_console._on_alert_release)
// 시안 17 피드백 「직사각형이 아닌 동그라미 · 자막과 겹치지 않을 정도로 크게 · 커졌다 작아졌다 바운스」 · 경고 해제 버튼은 뺌(Hud)
//   자리 = 자막(아래 가운데 · 가로 약 410~1510)과 길잡이(왼쪽 아래 글줄) 사이 · 지름 220 · 왼쪽 끝에서 100(시안 17 2차 피드백 「더 키우고 오른쪽으로 약간」)
// age = 차단 뒤 초(톡 튀어나옴) · t = 박자(1초마다 한 번 부풀었다 살짝 줄며 제자리)
const D = 220;
export const ReleaseButton: React.FC<{age: number; t: number}> = ({age, t}) => {
  const col = C.danger;
  const a = Math.max(0, Math.min(1, age / 0.35));
  const pop = a < 1 ? 0.6 + 0.4 * easeOut(a) + 0.12 * Math.sin(Math.PI * a) : 1;     // 등장 — 살짝 넘쳤다 제자리
  const p = ((t % 1) + 1) % 1;
  const beat = p < 0.4 ? 0.1 * Math.sin(Math.PI * (p / 0.4)) : p < 0.62 ? -0.035 * Math.sin(Math.PI * ((p - 0.4) / 0.22)) : 0;   // 부풂 → 살짝 줄어듦 → 쉼
  const glow = 14 + 26 * Math.max(0, beat / 0.1);
  return (
    <div style={{position: "absolute", left: 100, bottom: 74, width: D, height: D, borderRadius: "50%", display: "grid", placeItems: "center",
      transform: `scale(${(pop * (1 + beat)).toFixed(4)})`, opacity: a > 0 ? 1 : 0, fontFamily: FONT, color: "#fff", textAlign: "center",
      background: "radial-gradient(circle at 50% 38%, rgba(70,18,18,0.95), rgba(22,8,8,0.95))",
      border: `5px solid ${col}`, boxShadow: `0 0 ${glow.toFixed(1)}px ${col}, inset 0 0 22px rgba(255,82,82,0.35)`}}>
      <div style={{position: "absolute", inset: 14, borderRadius: "50%", border: `2px solid rgba(255,82,82,0.45)`}} />
      <div style={{fontSize: 44, fontWeight: 800, lineHeight: 1.15, letterSpacing: "-0.01em"}}>차단<br />해제</div>
    </div>
  );
};
