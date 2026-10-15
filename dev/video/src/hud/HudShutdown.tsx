import {C, FONT, easeOut} from "./theme.ts";

// 안경을 벗을 때 HUD 꺼짐(시안 17 4차 피드백 「시스템 종료 연출 · 추천대로 · 분량은 길지 않게」 — 추천 ★a 의 「감시 종료」 부분만)
//   켜짐(HudBoot)과 같은 모서리 테두리 · 화면을 가로지르는 띠에 「비전 감시 종료」 — 0~0.2 나타남 · 그 뒤 읽는 틈
//   꺼지는 모양(화면 전체가 한 줄 → 점 → 검정)은 Cut 이 영상과 함께 누른다(lib/fx crtOff · 12차 「종료할 때 검정 화면으로」)
//   age = 종료 연출 시작 뒤 초
export const SHUTDOWN_SEC = 1.4;

export const HudShutdown: React.FC<{age: number; W: number; H: number}> = ({age, W, H}) => {
  if (age < 0 || age >= SHUTDOWN_SEC) return null;
  const inA = easeOut(Math.max(0, Math.min(1, age / 0.2)));
  const L = 160 * inA;
  const corner = (x: number, y: number, sx: number, sy: number) => (
    <path d={`M ${x} ${y + sy * L} L ${x} ${y} L ${x + sx * L} ${y}`} stroke={C.info} strokeWidth={4} fill="none" strokeLinecap="round" />
  );
  return (
    <>
      <svg style={{position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none"}}>
        {L > 1 && <g>{corner(24, 24, 1, 1)}{corner(W - 24, 24, -1, 1)}{corner(24, H - 24, 1, -1)}{corner(W - 24, H - 24, -1, -1)}</g>}
      </svg>
      <div style={{position: "absolute", left: 0, right: 0, top: H / 2 - 150, height: 300, fontFamily: FONT, color: C.text, opacity: inA,
        background: "linear-gradient(90deg, rgba(6,8,10,0) 0%, rgba(6,8,10,0.72) 22%, rgba(6,8,10,0.72) 78%, rgba(6,8,10,0) 100%)"}}>
        <div style={{position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)", width: 760}}>
          <div style={{display: "flex", alignItems: "center", gap: 16, fontSize: 54, fontWeight: 800, letterSpacing: "-0.01em"}}>
            <span style={{width: 18, height: 18, borderRadius: 9, background: C.label}} />
            비전 감시 종료
          </div>
          <div style={{height: 3, margin: "16px 0 14px", background: C.info, width: `${100 * (1 - easeOut(Math.max(0, Math.min(1, (age - 0.2) / 0.55))))}%`, opacity: 0.8}} />
          <div style={{fontSize: 29, fontWeight: 700, color: C.label}}>시스템을 종료합니다</div>
        </div>
      </div>
    </>
  );
};
