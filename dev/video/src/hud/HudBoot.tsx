import {BANNER_FROM, BANNER_TO, BOOT_SEC, CHECK_SEC, LIST_END, PANEL_FROM, scanY} from "../lib/boot.ts";
import {IconCheck} from "./icons.tsx";
import {C, FONT, easeOut, rnd} from "./theme.ts";

// HUD 켜짐(boot 0~1 · BOOT_SEC 초) — 시간표 = lib/boot
//   0~0.8초 화면 잡음·줄무늬(시스템 가동 — 지지직은 여기만) · 모서리 테두리
//   0.15초~ 가운데 띠: 「비전 감시 시작」 → 점검 4줄이 차례로(확인 중 → 정상) — 글자는 차분하게 나타남
//     (시안 1 피드백 「문구 효과로 지지직 … 너무 화려하고 과해」 → 옅게 밀려 들어옴 · 체크가 톡)
//   LIST_END~ 띠가 내려가며 사라짐 → BANNER 「점검 완료 · 버튼 탐지를 시작합니다」 따로 → 정지 구간 스캔 선(위 → 아래 → 위)
const CHECKS = ["카메라 센서 상태", "비전 감지 모델 실행", "인터락 연결 점검", "작업 레시피 불러오기"];
const HEAD_AT = 0.15, ROW_AT = 0.6, ROW_GAP = 0.4, ROW_CHECK = 0.3;
const k01 = (x: number) => Math.max(0, Math.min(1, x));

const Spinner: React.FC<{s: number}> = ({s}) => (
  <svg width={30} height={30} viewBox="0 0 30 30" style={{flex: "none", transform: `rotate(${(s * 540) % 360}deg)`}}>
    <circle cx={15} cy={15} r={11} fill="none" stroke={C.edge} strokeWidth={3} />
    <path d="M15 4 a11 11 0 0 1 11 11" fill="none" stroke={C.info} strokeWidth={3} strokeLinecap="round" />
  </svg>
);

export const HudBoot: React.FC<{boot: number; W: number; H: number}> = ({boot, W, H}) => {
  if (boot >= 1) return null;
  const s = boot * BOOT_SEC;
  const seed = Math.floor(s * 30);
  const L = 160 * easeOut(s / 0.6);
  const y = scanY(s, H);
  const noise = s < 0.8 ? (0.18 + 0.32 * rnd(seed)) * (1 - s / 0.8) : 0; // 지지직 — 가동 순간만
  const bands = s < 0.75 ? [0, 1, 2, 3].map((i) => ({y: rnd(seed * 7 + i) * H, h: 2 + rnd(seed * 13 + i) * 14, o: 0.25 + 0.5 * rnd(seed * 3 + i)})) : [];
  const frameOp = boot < PANEL_FROM ? 1 : Math.max(0, 1 - (boot - PANEL_FROM) / (1 - PANEL_FROM));
  const corner = (x: number, yy: number, sx: number, sy: number) => (
    <path d={`M ${x} ${yy + sy * L} L ${x} ${yy} L ${x + sx * L} ${yy}`} stroke={C.info} strokeWidth={4} fill="none" strokeLinecap="round" />
  );
  const listIn = easeOut(k01((s - HEAD_AT) / 0.35));
  const listOut = k01((s - LIST_END) / (BANNER_FROM - LIST_END));  // 내려가며 사라짐
  const listOp = listIn * (1 - listOut);
  const banner = s >= BANNER_FROM && s < BANNER_TO ? Math.min(easeOut(k01((s - BANNER_FROM) / 0.2)), k01((BANNER_TO - s) / 0.25)) : 0;
  return (
    <>
      {noise > 0 && (
        <svg style={{position: "absolute", inset: 0, width: "100%", height: "100%", opacity: noise, mixBlendMode: "screen"}}>
          <filter id="boot-noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={seed} />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#boot-noise)" />
        </svg>
      )}
      {s < 1.2 && (
        <div style={{position: "absolute", inset: 0, opacity: 0.18 * (1 - s / 1.2),
          backgroundImage: "repeating-linear-gradient(0deg, rgba(0,0,0,0.9) 0 2px, transparent 2px 4px)"}} />
      )}
      <svg style={{position: "absolute", inset: 0, width: "100%", height: "100%"}}>
        <defs>
          <linearGradient id="scan-dn" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={C.info} stopOpacity="0" />
            <stop offset="1" stopColor={C.info} stopOpacity="0.4" />
          </linearGradient>
        </defs>
        {bands.map((b, i) => <rect key={i} x={0} y={b.y} width={W} height={b.h} fill={C.info} opacity={b.o * 0.5} />)}
        <g opacity={frameOp}>{corner(24, 24, 1, 1)}{corner(W - 24, 24, -1, 1)}{corner(24, H - 24, 1, -1)}{corner(W - 24, H - 24, -1, -1)}</g>
        {y !== null && <rect x={0} y={y - 110} width={W} height={110} fill="url(#scan-dn)" />}
        {y !== null && <rect x={0} y={y - 2} width={W} height={4} fill={C.info} />}
      </svg>
      {listOp > 0 && s < CHECK_SEC && (
        // 카드가 아니라 화면을 가로지르는 띠 — 어두운 반투명(뒤 영상이 비친다)
        <div style={{position: "absolute", left: 0, right: 0, top: H / 2 - 230, height: 400, fontFamily: FONT, color: C.text, opacity: listOp,
          transform: `translateY(${(1 - listIn) * 14 + listOut * 60}px)`,
          background: "linear-gradient(90deg, rgba(6,8,10,0) 0%, rgba(6,8,10,0.72) 22%, rgba(6,8,10,0.72) 78%, rgba(6,8,10,0) 100%)"}}>
          <div style={{width: 760, margin: "0 auto", paddingTop: 34}}>
            <div style={{display: "flex", alignItems: "center", gap: 16, fontSize: 54, fontWeight: 800, letterSpacing: "-0.01em"}}>
              <span style={{width: 18, height: 18, borderRadius: 9, background: C.done, boxShadow: `0 0 16px ${C.done}`,
                opacity: 0.55 + 0.45 * Math.abs(Math.sin(s * Math.PI * 1.5))}} />
              비전 감시 시작
            </div>
            <div style={{height: 3, margin: "16px 0 18px", background: C.info, width: `${100 * easeOut((s - HEAD_AT) / 0.5)}%`, opacity: 0.8}} />
            {CHECKS.map((label, i) => {
              const at = ROW_AT + i * ROW_GAP;
              const a = easeOut(k01((s - at) / 0.25));
              const done = s >= at + ROW_CHECK;
              const pop = done ? 0.6 + 0.4 * easeOut(k01((s - at - ROW_CHECK) / 0.18)) : 1;
              return (
                <div key={label} style={{display: "flex", alignItems: "center", gap: 16, height: 54, fontSize: 29, fontWeight: 700,
                  opacity: a, transform: `translateX(${(1 - a) * -18}px)`}}>
                  <span style={{display: "grid", placeItems: "center", width: 30, height: 30, transform: `scale(${pop})`}}>
                    {done ? <IconCheck size={30} color={C.done} /> : <Spinner s={s} />}
                  </span>
                  <span>{label}</span>
                  <span style={{flex: 1, borderBottom: `2px dotted ${C.edge}`, transform: "translateY(4px)"}} />
                  <span style={{fontSize: 27, fontWeight: done ? 800 : 600, color: done ? C.done : C.label}}>{done ? "정상" : "확인 중"}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {banner > 0 && (
        <div style={{position: "absolute", left: 0, right: 0, top: H / 2 - 50, textAlign: "center", fontFamily: FONT, opacity: banner,
          transform: `scale(${0.94 + 0.06 * banner})`}}>
          <div style={{display: "inline-flex", alignItems: "center", gap: 16, padding: "18px 36px", borderRadius: 18,
            background: "rgba(6,8,10,0.8)", border: `1px solid ${C.info}`, boxShadow: "0 10px 28px rgba(0,0,0,0.5)"}}>
            <IconCheck size={38} color={C.done} />
            <span style={{fontSize: 40, fontWeight: 800, color: C.text}}>점검 완료</span>
            <span style={{width: 2, height: 34, background: C.edge}} />
            <span style={{fontSize: 34, fontWeight: 700, color: C.info}}>버튼 탐지를 시작합니다</span>
          </div>
        </div>
      )}
    </>
  );
};
