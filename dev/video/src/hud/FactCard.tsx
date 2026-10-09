import {CARD_FLY, CARD_IN, CARD_LAND, THINK_ANCHOR} from "./VoiceBubbles.tsx";
import {C, FONT, GLASS, easeOut} from "./theme.ts";

// 사실 카드 — 코드가 정한 「지금 상황」을 LLM 에게 함께 보낸다(발표 S22 「판단은 코드, 말은 LLM」 · Rpi5/Demo/voice_card.build_card)
// 질문 뒤 CARD_IN 초에 크게 나타나 → CARD_FLY 부터 「LLM 생각 중」 말풍선(오른쪽 아래)으로 작아지며 날아 들어감 → CARD_LAND 에 사라짐
// (시안 1 피드백 「카드가 등장한 뒤 말풍선 안(LLM 생각 중...)으로 들어가는 연출 · 카드가 배경을 가려도 괜찮으니까 공간을 잘 활용」)
// 시안 4 피드백 「사실 카드 넣기 효과는 이전 효과로 롤백」 — 천(지니) 효과를 거두고 시안 3 의 한 장 그대로 작아지며 날아드는 연출로
// 첫 줄 「지금 할 일」= 코드가 정한 답의 뼈대 — 강조
const CW = 900;
export const FactCard: React.FC<{lines: string[]; q: number; W: number; H: number}> = ({lines, q, W, H}) => {
  if (q < CARD_IN || q >= CARD_LAND) return null;
  const a = easeOut((q - CARD_IN) / 0.3);
  const fly = q >= CARD_FLY ? easeOut((q - CARD_FLY) / (CARD_LAND - CARD_FLY)) : 0;
  const x0 = 520, y0 = 150;                                              // 크게 보일 자리(왼쪽 단계 목록 오른쪽)
  const x1 = W - THINK_ANCHOR.right - 700, y1 = H - THINK_ANCHOR.bottom - 120; // 「LLM 생각 중」 말풍선 근처
  const sc = 1 - 0.88 * fly;
  const body = lines.filter((l) => l !== "[사실]");
  return (
    <div style={{...GLASS, position: "absolute", left: x0 + (x1 - x0) * fly, top: y0 + (y1 - y0) * fly, width: CW, padding: "22px 30px",
      background: "rgba(10,12,14,0.9)", border: `2px solid ${C.info}`, transformOrigin: "0 0",
      transform: `scale(${sc * (0.95 + 0.05 * a)})`, opacity: a * (1 - 0.6 * fly), fontFamily: FONT}}>
      <div style={{display: "flex", alignItems: "baseline", gap: 14, marginBottom: 10}}>
        <span style={{fontSize: 34, fontWeight: 800, color: C.info}}>사실 카드</span>
        <span style={{fontSize: 22, fontWeight: 600, color: C.label}}>코드가 정한 지금 상황 → LLM 에 함께 보냄</span>
      </div>
      {body.map((l, i) => (
        <div key={i} style={{fontSize: i === 0 ? 27 : 22, fontWeight: i === 0 ? 800 : 600, lineHeight: 1.45,
          color: i === 0 ? C.current : C.text, opacity: easeOut((q - CARD_IN - 0.05 * i) / 0.2)}}>{l}</div>
      ))}
    </div>
  );
};
