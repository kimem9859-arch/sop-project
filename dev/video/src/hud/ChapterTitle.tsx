import {GlitchNoise, glitchStyle} from "./Glitch.tsx";
import {C, FONT, easeOut} from "./theme.ts";

// 장 · 절 제목 카드 + 길잡이 — 기능 소개 영상(10/9 사용자 「기능적인 영상」 · 「각 장에는 세부 절 … 절 제목도」)
// 시안 2 피드백 「절 제목은 따로 독립 제목 카드로 … 객체 탐지 제목 아래에 같이 넣지 말고」 → 장 카드 · 절 카드를 각각의 정지 구간(card)에
// 장 카드 = 지지직으로 들고 남 · 절 카드 = 차분히 밀려 들어옴 · dur = 카드 길이(초) · 길잡이 = 왼쪽 아래 늘 작게 「01 객체 탐지 › 버튼」
export type Chapter = {no: string; title: string; desc: string};
export type Section = {no: string; title: string; desc: string};

const band = (H: number, h: number): React.CSSProperties => ({
  position: "absolute", left: 0, top: H / 2 - h / 2, width: 1300, padding: "30px 0 30px 80px", fontFamily: FONT, color: C.text,
  background: "linear-gradient(90deg, rgba(6,8,10,0.85) 0%, rgba(6,8,10,0.75) 55%, rgba(6,8,10,0) 100%)",
});

export const ChapterTitle: React.FC<{ch: Chapter; age: number; dur: number; H: number}> = ({ch, age, dur, H}) => {
  if (age < 0 || age >= dur) return null;
  const out = dur - age < 0.35 ? (dur - age) * (0.6 / 0.35) : null; // 끝 0.35초 지지직 사라짐
  const g = out !== null ? glitchStyle(out, 17) : glitchStyle(age, 17);
  return (
    <div style={{...band(H, 230), ...g}}>
      <GlitchNoise age={out ?? age} seed={17} />
      <div style={{display: "flex", alignItems: "stretch", gap: 32}}>
        <div style={{width: 7, borderRadius: 4, background: C.info, boxShadow: `0 0 16px ${C.info}`}} />
        <div style={{fontSize: 132, fontWeight: 800, color: C.info, lineHeight: 1, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.03em"}}>{ch.no}</div>
        <div style={{display: "flex", flexDirection: "column", justifyContent: "center"}}>
          <div style={{fontSize: 78, fontWeight: 800, lineHeight: 1.05, letterSpacing: "-0.01em"}}>{ch.title}</div>
          <div style={{fontSize: 34, fontWeight: 600, color: C.label, marginTop: 10}}>{ch.desc}</div>
        </div>
      </div>
    </div>
  );
};

const SecNo: React.FC<{no: string; size: number}> = ({no, size}) => (
  <span style={{width: size, height: size, borderRadius: size / 2, border: `4px solid ${C.info}`, display: "grid", placeItems: "center",
    fontSize: size * 0.52, fontWeight: 800, color: C.info, fontVariantNumeric: "tabular-nums", flex: "none"}}>{no}</span>
);

export const SectionTitle: React.FC<{sec: Section; age: number; dur: number; H: number}> = ({sec, age, dur, H}) => {
  if (age < 0 || age >= dur) return null;
  const a = Math.min(easeOut(age / 0.35), Math.min(1, (dur - age) / 0.3));
  return (
    <div style={{...band(H, 180), opacity: a, transform: `translateX(${(1 - a) * -28}px)`}}>
      <div style={{display: "flex", alignItems: "center", gap: 26}}>
        <SecNo no={sec.no} size={84} />
        <div>
          <div style={{fontSize: 66, fontWeight: 800, lineHeight: 1.08}}>{sec.title}</div>
          <div style={{fontSize: 32, fontWeight: 600, color: C.label, marginTop: 6}}>{sec.desc}</div>
        </div>
      </div>
    </div>
  );
};

export const Breadcrumb: React.FC<{ch: Chapter; sec: Section | null}> = ({ch, sec}) => (
  <div style={{position: "absolute", left: 40, bottom: 38, display: "flex", alignItems: "center", gap: 10, fontFamily: FONT,
    fontSize: 22, fontWeight: 700, color: C.label, textShadow: "0 1px 4px rgba(0,0,0,0.9)"}}>
    <span style={{color: C.info, fontVariantNumeric: "tabular-nums"}}>{ch.no}</span>{ch.title}
    {sec && <><span style={{opacity: 0.6}}>›</span><span style={{color: C.text}}>{sec.title}</span></>}
  </div>
);
