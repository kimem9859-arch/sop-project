import {GlitchNoise, glitchStyle} from "./Glitch.tsx";
import {C, FONT, GLASS} from "./theme.ts";

// 끝맺음 — 세 기능 요약(멈춘·흐린 마지막 화면 위) · 제목 → 카드 셋이 차례로 지지직 등장
const ITEMS = [
  {no: "01", title: "객체 탐지", line: "카메라 한 대로 버튼 · 손 · 공구를 함께 찾습니다"},
  {no: "02", title: "판정 기준", line: "오답 버튼에 0.3초 머물면 경고, 누르면 차단합니다"},
  {no: "03", title: "음성 비서", line: "「가디언」으로 묻고, 위험은 먼저 알려 줍니다"},
];

export const EndSummary: React.FC<{age: number; W: number; H: number}> = ({age, W, H}) => (
  <div style={{position: "absolute", left: 0, top: 0, width: W, height: H, display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center", gap: 44, fontFamily: FONT, color: C.text}}>
    <div style={{fontSize: 64, fontWeight: 800, letterSpacing: "-0.01em", ...glitchStyle(age, 23)}}>작업자의 눈으로 정비 순서를 지킵니다</div>
    <div style={{display: "flex", gap: 28}}>
      {ITEMS.map((it, i) => {
        const a = age - 0.35 - i * 0.2;
        if (a < 0) return <div key={it.no} style={{width: 500}} />;
        return (
          <div key={it.no} style={{...GLASS, position: "relative", width: 500, padding: "26px 30px", background: "rgba(10,12,14,0.78)",
            borderTop: `4px solid ${C.info}`, ...glitchStyle(a, 29 + i)}}>
            <GlitchNoise age={a} seed={29 + i} />
            <div style={{fontSize: 30, fontWeight: 800, color: C.info, fontVariantNumeric: "tabular-nums"}}>{it.no}</div>
            <div style={{fontSize: 44, fontWeight: 800, marginTop: 4}}>{it.title}</div>
            <div style={{fontSize: 26, fontWeight: 600, color: C.label, marginTop: 10, lineHeight: 1.4}}>{it.line}</div>
          </div>
        );
      })}
    </div>
  </div>
);
