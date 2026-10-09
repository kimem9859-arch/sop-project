import type {VoiceView} from "../lib/uiState.ts";
import {IconMic, IconSpeaker} from "./icons.tsx";
import {C, FONT} from "./theme.ts";

// 오른쪽 아래 — 호출 → 질문(작업자) → 답(가디언) · 재생 중 파형 · 음성 알림
// G3 「흐려서 잘 안 보여 · 배경이 안 보여도 되니까 크기를 키우고 흐림을 없애줘」 → 불투명 · 큰 글자 · 흐림·반투명 없음
const SOLID: React.CSSProperties = {
  borderRadius: 20, boxShadow: "0 10px 28px rgba(0,0,0,0.5)", fontFamily: FONT, color: C.text,
};
export const VoiceBubbles: React.FC<{voice: VoiceView; t: number}> = ({voice, t}) => {
  if (!voice.listening && !voice.question && !voice.answer && !voice.speaking && !voice.alert) return null;
  const bars = [0, 1, 2, 3, 4, 5].map((i) => 10 + (voice.speaking || voice.alert ? 22 * Math.abs(Math.sin(t * 9 + i * 1.3)) : 0));
  const tone = voice.alert ? C.warn : C.info;
  const bubble = (who: string, text: string, mine: boolean) => (
    <div style={{...SOLID, alignSelf: mine ? "flex-end" : "flex-start", maxWidth: 720, padding: "16px 24px",
      background: mine ? "#1d3557" : "#14171c", border: `1px solid ${mine ? "#3d6aa5" : "#3a3f47"}`}}>
      <div style={{fontSize: 20, fontWeight: 700, color: mine ? "#9cc4ff" : C.label}}>{who}</div>
      <div style={{fontSize: 34, fontWeight: 700, lineHeight: 1.3}}>{text}</div>
    </div>
  );
  return (
    <div style={{position: "absolute", right: 40, bottom: 160, width: 780, display: "flex", flexDirection: "column", gap: 14}}>
      {voice.listening && (
        <div style={{...SOLID, alignSelf: "flex-end", display: "flex", gap: 10, alignItems: "center", padding: "10px 20px",
          background: "#14171c", border: `1px solid ${C.info}`, color: C.info, fontSize: 28, fontWeight: 800}}>
          <IconMic size={30} color={C.info} />듣는 중
        </div>
      )}
      {voice.question && bubble("작업자", voice.question, true)}
      {voice.answer && bubble("가디언", voice.answer, false)}
      {(voice.speaking || voice.alert) && (
        <div style={{...SOLID, alignSelf: voice.alert ? "flex-end" : "flex-start", display: "flex", gap: 6, alignItems: "center",
          height: 56, padding: "0 20px", borderRadius: 28, background: "#14171c", border: `1px solid ${tone}`}}>
          <IconSpeaker size={30} color={tone} />
          {bars.map((h, i) => <span key={i} style={{width: 6, height: h, borderRadius: 3, background: tone}} />)}
          {voice.alert && <span style={{marginLeft: 10, color: tone, fontSize: 26, fontWeight: 800}}>음성 알림</span>}
        </div>
      )}
    </div>
  );
};
