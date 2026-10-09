import {GlitchNoise, glitchStyle} from "./Glitch.tsx";
import {C, FONT} from "./theme.ts";

// 장 제목 — 기능 소개 영상(10/9 사용자 「시나리오 중심이 아닌 … 기능적인 영상」)의 장 머리
// 왼쪽 가운데(단계 목록 아래)에 번호 · 이름 · 한 줄 · 켜짐·탐지와 같은 지지직으로 들고 남 · CH_SEC 초
export const CH_SEC = 2.6;
export type Chapter = {no: string; title: string; desc: string};

export const ChapterTitle: React.FC<{ch: Chapter; age: number; H: number}> = ({ch, age, H}) => {
  if (age < 0 || age >= CH_SEC) return null;
  const out = CH_SEC - age < 0.35 ? (CH_SEC - age) * (0.6 / 0.35) : null; // 끝 0.35초 지지직 사라짐
  const g = out !== null ? glitchStyle(out, 17) : glitchStyle(age, 17);
  return (
    <div style={{position: "absolute", left: 0, top: H / 2 - 40, width: 1100, padding: "26px 0 26px 40px", fontFamily: FONT, color: C.text,
      background: "linear-gradient(90deg, rgba(6,8,10,0.8) 0%, rgba(6,8,10,0.7) 55%, rgba(6,8,10,0) 100%)", ...g}}>
      <GlitchNoise age={out ?? age} seed={17} />
      <div style={{display: "flex", alignItems: "stretch", gap: 28}}>
        <div style={{width: 6, borderRadius: 3, background: C.info, boxShadow: `0 0 14px ${C.info}`}} />
        <div style={{fontSize: 104, fontWeight: 800, color: C.info, lineHeight: 1, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.03em"}}>{ch.no}</div>
        <div style={{display: "flex", flexDirection: "column", justifyContent: "center"}}>
          <div style={{fontSize: 62, fontWeight: 800, lineHeight: 1.05, letterSpacing: "-0.01em"}}>{ch.title}</div>
          <div style={{fontSize: 30, fontWeight: 600, color: C.label, marginTop: 8}}>{ch.desc}</div>
        </div>
      </div>
    </div>
  );
};
