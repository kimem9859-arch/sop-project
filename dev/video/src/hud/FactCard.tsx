import {CARD_FLY, CARD_IN, CARD_LAND, THINK_ANCHOR} from "./VoiceBubbles.tsx";
import {C, FONT, easeOut} from "./theme.ts";

// 사실 카드 — 코드가 정한 「지금 상황」을 LLM 에게 함께 보낸다(발표 S22 「판단은 코드, 말은 LLM」 · Rpi5/Demo/voice_card.build_card)
// 질문 뒤 CARD_IN 초에 크게 나타나 → CARD_FLY 부터 「LLM 생각 중」 말풍선으로 빨려 들어감 → CARD_LAND 에 사라짐
// 시안 3 피드백 「네모 나게 작게 들어가는데 천(수건) 느낌처럼」 → 카드를 가로 띠 STRIPS 개로 나눠, 말풍선 쪽(아래)부터 먼저 좁아지며
//   끌려가고 위쪽이 뒤따른다(지니 효과) · 띠 경계를 이웃과 공유해 틈 없이 한 장으로 휘어 듦 · 살짝 출렁임 — 날아가기 전에는 한 장 그대로(글자 선명)
// 첫 줄 「지금 할 일」= 코드가 정한 답의 뼈대 — 강조
const CW = 1060, PAD = 24, HEAD = 48, FIRST = 40, LINE = 31, STRIPS = 44;
const easeIn = (x: number) => x * x * x;

const Body: React.FC<{lines: string[]; q: number}> = ({lines, q}) => (
  <div style={{width: CW, padding: PAD, boxSizing: "border-box", fontFamily: FONT, color: C.text}}>
    <div style={{display: "flex", alignItems: "baseline", gap: 14, height: HEAD}}>
      <span style={{fontSize: 34, fontWeight: 800, color: C.info}}>사실 카드</span>
      <span style={{fontSize: 22, fontWeight: 600, color: C.label}}>코드가 정한 지금 상황 → LLM 에 함께 보냄</span>
    </div>
    {lines.map((l, i) => (
      <div key={i} style={{height: i === 0 ? FIRST : LINE, whiteSpace: "nowrap", fontSize: i === 0 ? 26 : 21, fontWeight: i === 0 ? 800 : 600,
        color: i === 0 ? C.current : C.text, opacity: easeOut((q - CARD_IN - 0.05 * i) / 0.2)}}>{l}</div>
    ))}
  </div>
);

export const FactCard: React.FC<{lines: string[]; q: number; W: number; H: number}> = ({lines, q, W, H}) => {
  if (q < CARD_IN || q >= CARD_LAND) return null;
  const body = lines.filter((l) => l !== "[사실]");
  const CH = PAD * 2 + HEAD + FIRST + (body.length - 1) * LINE;
  const a = easeOut((q - CARD_IN) / 0.3);
  const x0 = 520, y0 = 150;                                                   // 크게 보일 자리(왼쪽 단계 목록 오른쪽)
  const tx = W - THINK_ANCHOR.right - 560, ty = H - THINK_ANCHOR.bottom - 90; // 「LLM 생각 중」 말풍선 근처
  const frame: React.CSSProperties = {background: "rgba(10,12,14,0.92)", border: `2px solid ${C.info}`, borderRadius: 18,
    boxShadow: "0 10px 28px rgba(0,0,0,0.45)"};
  if (q < CARD_FLY) {
    return (
      <div style={{...frame, position: "absolute", left: x0, top: y0, width: CW, height: CH, overflow: "hidden", opacity: a,
        transform: `scale(${0.95 + 0.05 * a})`, transformOrigin: "0 0"}}>
        <Body lines={body} q={q} />
      </div>
    );
  }
  // 띠 경계마다 진행률 — 아래 경계가 먼저 끌려가고 위가 뒤따른다 · 이웃 띠가 늘 맞닿아 한 장의 천처럼 이어진다
  const f = (q - CARD_FLY) / (CARD_LAND - CARD_FLY);
  const edge = (b: number) => {
    const delay = ((STRIPS - b) / STRIPS) * 0.45;
    const p = easeIn(Math.max(0, Math.min(1, (f - delay) / 0.55)));
    const ripple = Math.sin(p * Math.PI) * 44 * Math.sin(b * 0.55 + f * 7);       // 천처럼 출렁임
    return {y: y0 + (b / STRIPS) * CH + (ty - y0 - (b / STRIPS) * CH) * p,
      cx: x0 + CW / 2 + (tx - x0 - CW / 2) * p + ripple, w: CW * (1 - 0.95 * p), p};
  };
  const E = Array.from({length: STRIPS + 1}, (_, b) => edge(b));
  const h = CH / STRIPS;
  return (
    <>
      {E.slice(0, -1).map((top, i) => {
        const bot = E[i + 1];
        const hh = Math.max(0.5, bot.y - top.y), w = (top.w + bot.w) / 2, cx = (top.cx + bot.cx) / 2;
        return (
          <div key={i} style={{position: "absolute", left: cx - CW / 2, top: top.y, width: CW, height: h + 0.8, overflow: "hidden",
            transform: `scale(${w / CW}, ${(hh + 0.8) / (h + 0.8)})`, transformOrigin: "50% 0", opacity: 1 - 0.7 * (top.p + bot.p) / 2}}>
            <div style={{...frame, position: "absolute", left: 0, top: -i * h, width: CW, height: CH, overflow: "hidden"}}>
              <Body lines={body} q={q} />
            </div>
          </div>
        );
      })}
    </>
  );
};
