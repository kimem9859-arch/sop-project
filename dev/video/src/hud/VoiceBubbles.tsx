import type {VoiceView} from "../lib/uiState.ts";
import {IconMic, IconSpeaker} from "./icons.tsx";
import {C, FONT, GLASS} from "./theme.ts";

// 오른쪽 아래 — 호출 → 질문(작업자) → 답(가디언) · 재생 중 파형 · 음성 알림 표시
export const VoiceBubbles: React.FC<{voice: VoiceView; t: number}> = ({voice, t}) => {
  if (!voice.listening && !voice.question && !voice.answer && !voice.speaking && !voice.alert) return null;
  const bars = [0, 1, 2, 3, 4].map((i) => 8 + (voice.speaking || voice.alert ? 18 * Math.abs(Math.sin(t * 9 + i * 1.3)) : 0));
  const bubble = (who: string, text: string, mine: boolean) => (
    <div style={{...GLASS, alignSelf: mine ? "flex-end" : "flex-start", maxWidth: 600, padding: "12px 20px", borderRadius: 18,
      background: mine ? "rgba(36,62,96,0.72)" : "rgba(10,12,14,0.72)"}}>
      <div style={{fontSize: 17, fontWeight: 600, color: C.label}}>{who}</div>
      <div style={{fontSize: 28, fontWeight: 700}}>{text}</div>
    </div>
  );
  return (
    <div style={{position: "absolute", right: 40, bottom: 170, width: 640, display: "flex", flexDirection: "column", gap: 12, fontFamily: FONT}}>
      {voice.listening && (
        <div style={{alignSelf: "flex-end", display: "flex", gap: 8, alignItems: "center", color: C.info, fontSize: 24, fontWeight: 700}}>
          <IconMic size={26} color={C.info} />듣는 중
        </div>
      )}
      {voice.question && bubble("작업자", voice.question, true)}
      {voice.answer && bubble("가디언", voice.answer, false)}
      {(voice.speaking || voice.alert) && (
        <div style={{...GLASS, alignSelf: voice.alert ? "flex-end" : "flex-start", display: "flex", gap: 5, alignItems: "center",
          height: 46, padding: "0 16px", borderRadius: 23}}>
          <IconSpeaker size={26} color={voice.alert ? C.warn : C.info} />
          {bars.map((h, i) => <span key={i} style={{width: 5, height: h, borderRadius: 3, background: voice.alert ? C.warn : C.info}} />)}
          {voice.alert && <span style={{marginLeft: 8, color: C.warn, fontSize: 22, fontWeight: 700}}>음성 알림</span>}
        </div>
      )}
    </div>
  );
};
