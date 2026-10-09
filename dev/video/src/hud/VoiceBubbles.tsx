import type {VoiceView} from "../lib/uiState.ts";
import {IconMic, IconSpeaker} from "./icons.tsx";
import {C, FONT, easeOut} from "./theme.ts";

// 오른쪽 아래 — 음성 비서 대화(아래가 최신 · 최근 4개) + 음성 알림
// G3 「흐려서 잘 안 보여」 → 불투명 · 큰 글자 · 흐림 없음
// 시안 1 피드백 「"가디언" 말풍선 → 듣는 중 → 확인해보겠습니다 → "LLM 생각 중..." → 답변」 · 「경고와 차단에는 음성알림 문구 말풍선을
//   음성 알림 위에 … 주황, 빨강」 — 알림 문장 = Rpi5/Demo/voice_card.alert_texts() 그대로(2026-10-09 출력 사본)
export const ALERT_TEXT: Record<string, string> = {
  alert_emo: "비상정지 중이니 EMO를 복귀한 뒤 차단 해제를 누르세요.",
  alert_block_B1: "차단 중이니 차단 해제를 누른 뒤 B1 버튼부터 다시 누르세요.",
  alert_warn_B1: "순서가 다르니 손을 떼고 B1 버튼을 누르세요.",
  alert_block_B2: "차단 중이니 차단 해제를 누른 뒤 B2 버튼부터 다시 누르세요.",
  alert_warn_B2: "순서가 다르니 손을 떼고 B2 버튼을 누르세요.",
  alert_block_B3: "차단 중이니 차단 해제를 누른 뒤 B3 버튼부터 다시 누르세요.",
  alert_warn_B3: "순서가 다르니 손을 떼고 B3 버튼을 누르세요.",
  alert_block_B4: "차단 중이니 차단 해제를 누른 뒤 B4 버튼부터 다시 누르세요.",
  alert_warn_B4: "순서가 다르니 손을 떼고 B4 버튼을 누르세요.",
};
// 사실 카드가 「LLM 생각 중」 말풍선으로 날아드는 시각표(질문 뒤 초) — FactCard 와 같이 쓴다
export const CARD_IN = 0.7, CARD_FLY = 2.4, CARD_LAND = 3.0;
export const THINK_ANCHOR = {right: 40, bottom: 160}; // 말풍선 묶음 자리(카드가 날아갈 곳)

const SOLID: React.CSSProperties = {borderRadius: 20, boxShadow: "0 10px 28px rgba(0,0,0,0.5)", fontFamily: FONT, color: C.text};

const Bubble: React.FC<{who: string; text: string; mine: boolean; age: number}> = ({who, text, mine, age}) => {
  const a = easeOut(Math.min(1, Math.max(0, age) / 0.25));
  return (
    <div style={{...SOLID, alignSelf: mine ? "flex-end" : "flex-start", maxWidth: 720, padding: "14px 24px", opacity: a,
      transform: `translateY(${(1 - a) * 12}px)`, background: mine ? "#1d3557" : "#14171c", border: `1px solid ${mine ? "#3d6aa5" : "#3a3f47"}`}}>
      <div style={{fontSize: 20, fontWeight: 700, color: mine ? "#9cc4ff" : C.label}}>{who}</div>
      <div style={{fontSize: 34, fontWeight: 700, lineHeight: 1.3}}>{text}</div>
    </div>
  );
};

export const VoiceBubbles: React.FC<{voice: VoiceView; t: number; tMs: number}> = ({voice, t, tMs}) => {
  const v = voice;
  if (!v.listening && !v.called && !v.question && !v.answer && !v.speaking && !v.alert) return null;
  const q = v.thinkingSince !== null ? (tMs - v.thinkingSince) / 1000 : 0;  // 질문 뒤 초
  const items: React.ReactNode[] = [];
  if (v.called) items.push(<Bubble key="call" who="작업자" text="가디언" mine age={1} />);
  if (v.listening) items.push(
    <div key="listen" style={{...SOLID, alignSelf: "flex-end", display: "flex", gap: 10, alignItems: "center", padding: "10px 20px",
      background: "#14171c", border: `1px solid ${C.info}`, color: C.info, fontSize: 28, fontWeight: 800}}>
      <IconMic size={30} color={C.info} />듣는 중
    </div>);
  if (v.question) items.push(<Bubble key="q" who="작업자" text={v.question} mine age={q} />);
  if (v.ack) items.push(<Bubble key="ack" who="가디언" text="확인해 보겠습니다." mine={false} age={q - 0.3} />);
  if (v.thinking && q >= 0.5) {
    const land = q >= CARD_LAND && q < CARD_LAND + 0.5 ? 1 - (q - CARD_LAND) / 0.5 : 0;  // 카드가 들어온 순간 번쩍
    const dots = ".".repeat(1 + (Math.floor(t * 3) % 3));
    items.push(
      <div key="think" style={{...SOLID, alignSelf: "flex-start", display: "flex", gap: 12, alignItems: "center", padding: "12px 24px",
        background: "#14171c", border: `2px solid ${C.current}`, boxShadow: `0 0 ${12 + 30 * land}px ${C.current}`}}>
        <span style={{fontSize: 30, fontWeight: 800, color: C.current, minWidth: 230}}>LLM 생각 중{dots}</span>
        {q >= CARD_LAND && <span style={{fontSize: 22, fontWeight: 700, color: C.label}}>사실 카드 받음</span>}
      </div>);
  }
  if (v.answer) items.push(<Bubble key="a" who="가디언" text={v.answer} mine={false} age={q} />);
  const alertKind = v.alert?.startsWith("alert_block") || v.alert === "alert_emo" ? "block" : v.alert ? "warn" : null;
  const tone = alertKind === "block" ? C.danger : alertKind === "warn" ? C.warn : C.info;
  const bars = [0, 1, 2, 3, 4, 5].map((i) => 10 + (v.speaking || v.alert ? 22 * Math.abs(Math.sin(t * 9 + i * 1.3)) : 0));
  return (
    <div style={{position: "absolute", ...THINK_ANCHOR, width: 780, display: "flex", flexDirection: "column", gap: 14}}>
      {items.slice(-4)}
      {v.alert && ALERT_TEXT[v.alert] && (
        <div style={{...SOLID, alignSelf: "flex-end", maxWidth: 720, padding: "14px 24px", background: "#1a1111", border: `2px solid ${tone}`}}>
          <div style={{fontSize: 20, fontWeight: 800, color: tone}}>가디언 · {alertKind === "block" ? "차단 알림" : "경고 알림"}</div>
          <div style={{fontSize: 32, fontWeight: 700, lineHeight: 1.3}}>{ALERT_TEXT[v.alert]}</div>
        </div>
      )}
      {(v.speaking || v.alert) && (
        <div style={{...SOLID, alignSelf: v.alert ? "flex-end" : "flex-start", display: "flex", gap: 6, alignItems: "center",
          height: 56, padding: "0 20px", borderRadius: 28, background: "#14171c", border: `1px solid ${tone}`}}>
          <IconSpeaker size={30} color={tone} />
          {bars.map((h, i) => <span key={i} style={{width: 6, height: h, borderRadius: 3, background: tone}} />)}
          {v.alert && <span style={{marginLeft: 10, color: tone, fontSize: 26, fontWeight: 800}}>음성 알림</span>}
        </div>
      )}
    </div>
  );
};
