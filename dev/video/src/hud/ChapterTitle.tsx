import {GlitchNoise, glitchStyle} from "./Glitch.tsx";
import {C, FONT, easeOut} from "./theme.ts";

// 장 제목 · 절 제목 · 길잡이 — 기능 소개 영상(10/9 사용자 「기능적인 영상」 · 시안 1 피드백 「각 장에는 세부 절 … 절 제목도」)
// 장 제목 = 왼쪽 가운데 큰 띠(지지직) · 첫 절 이름도 그 아래에 · 절 제목 = 같은 자리 작은 띠(장 제목이 없을 때)
// 길잡이 = 왼쪽 아래 늘 작게 「01 객체 탐지 › 버튼」(어디쯤인지)
export const CH_SEC = 2.6, SEC_SEC = 1.8;
export type Chapter = {no: string; title: string; desc: string};
export type Section = {no: string; title: string; desc: string};

const band = (H: number): React.CSSProperties => ({
  position: "absolute", left: 0, top: H / 2 - 40, width: 1100, padding: "26px 0 26px 40px", fontFamily: FONT, color: C.text,
  background: "linear-gradient(90deg, rgba(6,8,10,0.8) 0%, rgba(6,8,10,0.7) 55%, rgba(6,8,10,0) 100%)",
});

export const ChapterTitle: React.FC<{ch: Chapter; sec: Section | null; age: number; H: number}> = ({ch, sec, age, H}) => {
  if (age < 0 || age >= CH_SEC) return null;
  const out = CH_SEC - age < 0.35 ? (CH_SEC - age) * (0.6 / 0.35) : null; // 끝 0.35초 지지직 사라짐
  const g = out !== null ? glitchStyle(out, 17) : glitchStyle(age, 17);
  return (
    <div style={{...band(H), ...g}}>
      <GlitchNoise age={out ?? age} seed={17} />
      <div style={{display: "flex", alignItems: "stretch", gap: 28}}>
        <div style={{width: 6, borderRadius: 3, background: C.info, boxShadow: `0 0 14px ${C.info}`}} />
        <div style={{fontSize: 104, fontWeight: 800, color: C.info, lineHeight: 1, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.03em"}}>{ch.no}</div>
        <div style={{display: "flex", flexDirection: "column", justifyContent: "center"}}>
          <div style={{fontSize: 62, fontWeight: 800, lineHeight: 1.05, letterSpacing: "-0.01em"}}>{ch.title}</div>
          <div style={{fontSize: 30, fontWeight: 600, color: C.label, marginTop: 8}}>{ch.desc}</div>
          {sec && (
            <div style={{marginTop: 14, display: "flex", alignItems: "center", gap: 12, fontSize: 30, fontWeight: 800,
              opacity: easeOut((age - 0.5) / 0.3), transform: `translateX(${(1 - easeOut((age - 0.5) / 0.3)) * -14}px)`}}>
              <SecNo no={sec.no} />{sec.title}
              <span style={{fontSize: 24, fontWeight: 600, color: C.label}}>{sec.desc}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const SecNo: React.FC<{no: string; size?: number}> = ({no, size = 40}) => (
  <span style={{width: size, height: size, borderRadius: size / 2, border: `3px solid ${C.info}`, display: "grid", placeItems: "center",
    fontSize: size * 0.55, fontWeight: 800, color: C.info, fontVariantNumeric: "tabular-nums", flex: "none"}}>{no}</span>
);

// 절 제목 — 차분하게 밀려 들어오고 사라짐(장 제목보다 한 단계 아래)
export const SectionTitle: React.FC<{sec: Section; age: number; H: number}> = ({sec, age, H}) => {
  if (age < 0 || age >= SEC_SEC) return null;
  const a = Math.min(easeOut(age / 0.3), Math.min(1, (SEC_SEC - age) / 0.3));
  return (
    <div style={{...band(H), width: 900, padding: "20px 0 20px 40px", opacity: a, transform: `translateX(${(1 - a) * -24}px)`}}>
      <div style={{display: "flex", alignItems: "center", gap: 18}}>
        <SecNo no={sec.no} size={56} />
        <div>
          <div style={{fontSize: 48, fontWeight: 800, lineHeight: 1.1}}>{sec.title}</div>
          <div style={{fontSize: 26, fontWeight: 600, color: C.label, marginTop: 4}}>{sec.desc}</div>
        </div>
      </div>
    </div>
  );
};

export const Breadcrumb: React.FC<{ch: Chapter; sec: Section | null}> = ({ch, sec}) => (
  <div style={{position: "absolute", left: 40, bottom: 22, display: "flex", alignItems: "center", gap: 10, fontFamily: FONT,
    fontSize: 22, fontWeight: 700, color: C.label, textShadow: "0 1px 4px rgba(0,0,0,0.9)"}}>
    <span style={{color: C.info, fontVariantNumeric: "tabular-nums"}}>{ch.no}</span>{ch.title}
    {sec && <><span style={{opacity: 0.6}}>›</span><span style={{color: C.text}}>{sec.title}</span></>}
  </div>
);
