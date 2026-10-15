import {ALERT_TEXT} from "../lib/alerts.ts";
import {typed} from "../lib/fx.ts";
import type {VoiceView} from "../lib/uiState.ts";
import {IconMic, IconSpeaker} from "./icons.tsx";
import {C, FONT, easeOut} from "./theme.ts";

// 오른쪽 아래 — 음성 비서 대화(아래가 최신 · 최근 4개) + 음성 알림
// G3 「흐려서 잘 안 보여」 → 불투명 · 큰 글자 · 흐림 없음
// 시안 1 피드백 「"가디언" 말풍선 → 듣는 중 → 확인해보겠습니다 → "LLM 생각 중..." → 답변」 · 「경고와 차단에는 음성알림 문구 말풍선을
//   음성 알림 위에 … 주황, 빨강」 — 알림 문장 = Rpi5/Demo/voice_card.alert_texts() 그대로(2026-10-09 출력 사본)
export {ALERT_TEXT};
// 사실 카드가 「LLM 생각 중」 말풍선으로 날아드는 시각표(질문 뒤 초) — lib/uiState(FactCard · FactStreams 와 같이 쓴다)
export {CARD_FILL, CARD_FLY, CARD_IN, CARD_LAND, STREAM_AT, STREAM_RUN} from "../lib/uiState.ts";
import {CARD_LAND} from "../lib/uiState.ts";
export const THINK_ANCHOR = {right: 40, bottom: 160}; // 말풍선 묶음 자리(카드가 날아갈 곳)
const ACK_TYPE = 1.0;   // 「확인해 보겠습니다」 글자가 써지는 초(음성 1.1초 안 · 시안 17 4차)

const SOLID: React.CSSProperties = {borderRadius: 20, boxShadow: "0 10px 28px rgba(0,0,0,0.5)", fontFamily: FONT, color: C.text};

// typeDur = 글자가 써지는 초(시안 8 「테크적이고 화려하게」) — 다 쓴 글을 투명하게 깔아 말풍선 크기가 흔들리지 않게
//   커서는 폭 0 — 거의 다 써졌을 때 커서가 폭을 넘겨 다음 줄로 밀려 내려가던 것(시안 17 8차 「타자 효과가 좀 이상해」)
const CURSOR = <span style={{display: "inline-block", width: 0, overflow: "visible", color: C.info}}>▍</span>;
const Bubble: React.FC<{who: string; text: string; mine: boolean; age: number; typeDur?: number}> = ({who, text, mine, age, typeDur}) => {
  const a = easeOut(Math.min(1, Math.max(0, age) / 0.25));
  const typing = typeDur !== undefined && age < typeDur;
  return (
    <div style={{...SOLID, alignSelf: mine ? "flex-end" : "flex-start", maxWidth: 720, padding: "14px 24px", opacity: a,
      transform: `translateY(${(1 - a) * 12}px)`, background: mine ? "#1d3557" : "#14171c", border: `1px solid ${mine ? "#3d6aa5" : "#3a3f47"}`}}>
      <div style={{fontSize: 20, fontWeight: 700, color: mine ? "#9cc4ff" : C.label}}>{who}</div>
      <div style={{fontSize: 34, fontWeight: 700, lineHeight: 1.3, position: "relative"}}>
        {typing ? <><span style={{color: "transparent"}}>{text}</span>
          <span style={{position: "absolute", left: 0, top: 0, right: 0}}>{typed(text, age, typeDur!)}{CURSOR}</span></> : text}
      </div>
    </div>
  );
};

export const VoiceBubbles: React.FC<{voice: VoiceView; t: number; tMs: number}> = ({voice, t, tMs}) => {
  const v = voice;
  if (!v.listening && !v.called && !v.question && !v.answer && !v.speaking && !v.alert && !v.said.length) return null;
  const q = v.thinkingSince !== null ? (tMs - v.thinkingSince) / 1000 : 0;  // 질문 뒤 초
  const items: React.ReactNode[] = [];
  // 「듣는 중」 = 음성비서가 듣는 것 — 음성비서 쪽(왼쪽)에(시안 17 4차 피드백 「화자 위치가 아닌 음성비서 위치 쪽으로」)
  const listen = (
    <div key="listen" style={{...SOLID, alignSelf: "flex-start", display: "flex", gap: 10, alignItems: "center", padding: "10px 20px",
      background: "#14171c", border: `1px solid ${C.info}`, color: C.info, fontSize: 28, fontWeight: 800}}>
      <IconMic size={30} color={C.info} />듣는 중
    </div>);
  if (v.said.length) {
    // 작업자 말(시안 17 3차) — 목소리가 시작될 때 나타남 · 타자 효과는 뺌(시안 17 4차) · 「듣는 중」은 호출어 말풍선 바로 뒤
    v.said.forEach((x, i) => {
      items.push(<Bubble key={`s${i}`} who="작업자" text={x.text} mine age={(tMs - x.since) / 1000} />);
      if (i === 0 && v.listening) items.push(listen);
    });
  } else {
    if (v.called) items.push(<Bubble key="call" who="작업자" text="가디언" mine age={1} />);
    if (v.listening) items.push(listen);
    if (v.question) items.push(<Bubble key="q" who="작업자" text={v.question} mine age={q} typeDur={0.5} />);
  }
  const alertKind = v.alert?.startsWith("alert_block") || v.alert === "alert_emo" ? "block" : v.alert ? "warn" : null;
  const tone = alertKind === "block" ? C.danger : alertKind === "warn" ? C.warn : C.info;
  const bars = [0, 1, 2, 3, 4, 5].map((i) => 10 + (v.speaking || v.alert ? 22 * Math.abs(Math.sin(t * 9 + i * 1.3)) : 0));
  const speaker = (
    <div key="spk" style={{...SOLID, alignSelf: v.alert ? "flex-end" : "flex-start", display: "flex", gap: 6, alignItems: "center",
      height: 56, padding: "0 20px", borderRadius: 28, background: "#14171c", border: `1px solid ${tone}`}}>
      <IconSpeaker size={30} color={tone} />
      {bars.map((h, i) => <span key={i} style={{width: 6, height: h, borderRadius: 3, background: tone}} />)}
      {v.alert && <span style={{marginLeft: 10, color: tone, fontSize: 26, fontWeight: 800}}>음성 알림</span>}
    </div>);
  // 「확인해 보겠습니다」 — 말하는 동안 글자가 써짐(ACK_TYPE) · 재생 표시(스피커 막대)는 묶음 맨 아래(4차에 말풍선 오른쪽으로 옮겼다가 8차에 되돌림)
  if (v.ack) items.push(<Bubble key="ack" who="가디언" text="확인해 보겠습니다." mine={false} age={q - 0.3} typeDur={ACK_TYPE} />);
  if (v.thinking && q >= 0.5) {
    // 사실 카드가 말풍선에 들어가기(CARD_LAND) 전 = 「코드 판정 중」(코드가 지금 상황을 정함) · 들어간 뒤 = 「LLM 생각 중」(시안 17 4차)
    const llm = q >= CARD_LAND;
    const col = llm ? C.current : C.info;
    const land = q >= CARD_LAND && q < CARD_LAND + 0.5 ? 1 - (q - CARD_LAND) / 0.5 : 0;  // 카드가 들어온 순간 번쩍
    const dots = ".".repeat(1 + (Math.floor(t * 3) % 3));
    items.push(
      <div key="think" style={{...SOLID, alignSelf: "flex-start", display: "flex", gap: 12, alignItems: "center", padding: "12px 24px",
        background: "#14171c", border: `2px solid ${col}`, boxShadow: `0 0 ${12 + 30 * land}px ${col}`}}>
        <span style={{fontSize: 30, fontWeight: 800, color: col, minWidth: 230}}>{llm ? "LLM 생각 중" : "코드 판정 중"}{dots}</span>
        {llm && <span style={{fontSize: 22, fontWeight: 700, color: C.label}}>사실 카드 받음</span>}
      </div>);
  }
  if (v.answer) items.push(<Bubble key="a" who="가디언" text={v.answer} mine={false} age={v.answerSince !== null ? (tMs - v.answerSince) / 1000 : q} typeDur={1.4} />);
  return (
    <div style={{position: "absolute", ...THINK_ANCHOR, width: 780, display: "flex", flexDirection: "column", gap: 14}}>
      {items.slice(-4)}
      {v.alert && ALERT_TEXT[v.alert] && (
        <div style={{...SOLID, alignSelf: "flex-end", maxWidth: 720, padding: "14px 24px", background: "#1a1111", border: `2px solid ${tone}`}}>
          <div style={{fontSize: 20, fontWeight: 800, color: tone}}>가디언 · {alertKind === "block" ? "차단 알림" : "경고 알림"}</div>
          <div style={{fontSize: 32, fontWeight: 700, lineHeight: 1.3}}>{ALERT_TEXT[v.alert]}</div>
        </div>
      )}
      {(v.speaking || v.alert) && speaker}
    </div>
  );
};
