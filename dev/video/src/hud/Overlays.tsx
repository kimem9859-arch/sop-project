import {C, FONT, GLASS} from "./theme.ts";

// 설명 자막 — 화면 아래 가운데 한 문장 · 알림 카드(위 가운데)와 겹치지 않는 자리
export const Caption: React.FC<{text?: string; opacity: number}> = ({text, opacity}) =>
  text ? (
    <div style={{position: "absolute", left: 0, right: 0, bottom: 56, textAlign: "center", opacity, fontFamily: FONT}}>
      <span style={{...GLASS, display: "inline-block", padding: "12px 30px", borderRadius: 16, background: "rgba(8,10,12,0.72)",
        fontSize: 40, fontWeight: 700, letterSpacing: "-0.01em"}}>{text}</span>
    </div>
  ) : null;

// 배속 표기 — 경고 선행시간 오해 방지(반드시 표기)
export const SpeedBadge: React.FC<{badge?: string}> = ({badge}) =>
  badge ? (
    <div style={{...GLASS, position: "absolute", right: 40, top: 40, padding: "6px 18px", borderRadius: 12,
      fontSize: 30, fontWeight: 800, fontVariantNumeric: "tabular-nums"}}>{badge}</div>
  ) : null;

// 「합성」 상시 표기(설계 D21) · text = 실제 기록이 아닌 초안(연출 기록)일 때 바꿔 단다
// text = "" 이면 그리지 않음(한이음판 — 늘 떠 있는 표기 대신 장면마다 잠깐 · Cut noteTrack) · opacity = 잠깐 나올 때 들고 남
export const SynthLabel: React.FC<{text?: string; opacity?: number}> = ({text = "합성 화면 · 실제 시스템 기록 기반", opacity = 1}) => text === "" ? null : (
  <div style={{position: "absolute", right: 30, bottom: 20, color: C.label, fontFamily: FONT, fontSize: 18, fontWeight: 500, opacity: 0.8 * opacity,
    textShadow: "0 1px 4px rgba(0,0,0,0.9)"}}>
    {text}
  </div>
);
