import {HANIUM_PROBLEM, HANIUM_TITLE} from "../edits/hanium.ts";
import {C, FONT, easeOut} from "./theme.ts";

// 한이음판 첫 화면 — 작품 이름(설계 D84 · 로고 인트로 대신) · 장 제목 카드와 같은 글꼴 · 색 · 파란 강조 막대
//   어두운 바탕 위 왼쪽 정렬 · 차분히 밀려 들어옴 · 사라짐은 구간 fadeOut(검은 막) · 소리 안내는 아래 자막(편집표 caption)
//   작품 이름 아래 문제 제기 한 줄(조금 늦게 나타남 · 다른 참가 영상 조사 뒤 사용자 10/18)
export const TitleCard: React.FC<{age: number; W: number; H: number}> = ({age, W, H}) => {
  const a = easeOut(Math.min(1, Math.max(0, (age - 0.2) / 0.5)));
  const b = easeOut(Math.min(1, Math.max(0, (age - 1.2) / 0.5)));
  return (
    <div style={{position: "absolute", inset: 0, width: W, height: H, fontFamily: FONT, color: C.text,
      background: "radial-gradient(ellipse at 30% 45%, rgba(18,30,52,0.94) 0%, rgba(5,7,10,0.97) 70%)"}}>
      <div style={{position: "absolute", left: 150, top: H / 2 - 200, display: "flex", gap: 34, opacity: a, transform: `translateX(${(1 - a) * -28}px)`}}>
        <div style={{width: 7, borderRadius: 4, background: C.info, boxShadow: `0 0 16px ${C.info}`}} />
        <div>
          <div style={{fontSize: 30, fontWeight: 700, color: C.info, letterSpacing: "0.18em"}}>PROJECT</div>
          {HANIUM_TITLE.map((line) => (
            <div key={line} style={{fontSize: 76, fontWeight: 800, lineHeight: 1.18, letterSpacing: "-0.01em", marginTop: 12}}>{line}</div>
          ))}
          <div style={{fontSize: 36, fontWeight: 600, color: C.label, marginTop: 34, opacity: b, transform: `translateY(${(1 - b) * 10}px)`}}>{HANIUM_PROBLEM}</div>
        </div>
      </div>
    </div>
  );
};
