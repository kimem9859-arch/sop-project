import {BOOT_SEC, CHECK_SEC, PANEL_FROM, SCAN_FROM, SCAN_TO, scanY} from "../lib/boot.ts";
import {GlitchNoise, glitchStyle} from "./Glitch.tsx";
import {IconCheck} from "./icons.tsx";
import {C, FONT, easeOut, rnd} from "./theme.ts";

// HUD 켜짐(boot 0~1 · BOOT_SEC 초) — 10/9 초안 피드백 「"SOP 가디언" 작동 카드가 아닌 다른 형태로 "비전 감시 시작" 문장 아래로
// 점검하는 듯한 연출 … 모든 사항이 점검 완료되면 그다음에 버튼 탐지」
//   0~0.8초 화면 잡음·줄무늬(지지직) · 모서리 테두리
//   0.15초~ 가운데 띠: 「비전 감시 시작」 → 점검 4줄이 차례로(확인 중 → 완료) → 「점검 완료 · 버튼 탐지를 시작합니다」 → 지지직 사라짐
//   SCAN_FROM~SCAN_TO 스캔 선(화면 정지 구간 · 버튼마다 탐지 연출은 ButtonBoxes)
const CHECKS = [
  {label: "카메라 센서 상태", value: "정상"},
  {label: "비전 감지 모델 실행", value: "버튼 · 손 · 공구"},
  {label: "인터락 연결 점검", value: "완료"},
  {label: "작업 절차 불러오기", value: "PECVD 정비 4단계"},
];
const HEAD_AT = 0.15, ROW_AT = 0.6, ROW_GAP = 0.45, ROW_CHECK = 0.35, DONE_AT = 2.45, EXIT = 0.3;

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
  const y = scanY(boot, H);
  const noise = s < 0.8 ? (0.18 + 0.32 * rnd(seed)) * (1 - s / 0.8) : 0; // 지지직 — 깜빡이며 잦아든다
  const bands = s < 0.75 ? [0, 1, 2, 3].map((i) => ({y: rnd(seed * 7 + i) * H, h: 2 + rnd(seed * 13 + i) * 14, o: 0.25 + 0.5 * rnd(seed * 3 + i)})) : [];
  const frameOp = boot < PANEL_FROM ? 1 : Math.max(0, 1 - (boot - PANEL_FROM) / (1 - PANEL_FROM));
  const corner = (x: number, yy: number, sx: number, sy: number) => (
    <path d={`M ${x} ${yy + sy * L} L ${x} ${yy} L ${x + sx * L} ${yy}`} stroke={C.info} strokeWidth={4} fill="none" strokeLinecap="round" />
  );
  const scanning = boot > SCAN_FROM && boot < SCAN_TO + 0.01;
  const listOn = s >= HEAD_AT && s < CHECK_SEC;
  const exitAge = (CHECK_SEC - s) * (0.6 / EXIT); // 끝 EXIT 초 동안 지지직 사라짐(glitch 를 거꾸로)
  const blockStyle = s > CHECK_SEC - EXIT ? glitchStyle(exitAge, 7) : glitchStyle(s - HEAD_AT, 7);
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
          <linearGradient id="scan" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={C.info} stopOpacity="0" />
            <stop offset="1" stopColor={C.info} stopOpacity="0.4" />
          </linearGradient>
        </defs>
        {bands.map((b, i) => <rect key={i} x={0} y={b.y} width={W} height={b.h} fill={C.info} opacity={b.o * 0.5} />)}
        <g opacity={frameOp}>{corner(24, 24, 1, 1)}{corner(W - 24, 24, -1, 1)}{corner(24, H - 24, 1, -1)}{corner(W - 24, H - 24, -1, -1)}</g>
        {scanning && <rect x={0} y={y - 110} width={W} height={110} fill="url(#scan)" />}
        {scanning && <rect x={0} y={y - 2} width={W} height={4} fill={C.info} />}
      </svg>
      {listOn && (
        // 카드가 아니라 화면을 가로지르는 띠 — 위아래 가는 선 + 어두운 반투명(뒤 영상이 비친다)
        <div style={{position: "absolute", left: 0, right: 0, top: H / 2 - 230, height: 400, fontFamily: FONT, color: C.text,
          background: "linear-gradient(90deg, rgba(6,8,10,0) 0%, rgba(6,8,10,0.72) 22%, rgba(6,8,10,0.72) 78%, rgba(6,8,10,0) 100%)",
          ...blockStyle}}>
          <GlitchNoise age={s > CHECK_SEC - EXIT ? exitAge : s - HEAD_AT} seed={7} />
          <div style={{width: 760, margin: "0 auto", paddingTop: 34}}>
            <div style={{display: "flex", alignItems: "center", gap: 16, fontSize: 54, fontWeight: 800, letterSpacing: "-0.01em"}}>
              <span style={{width: 18, height: 18, borderRadius: 9, background: C.done, boxShadow: `0 0 16px ${C.done}`,
                opacity: 0.55 + 0.45 * Math.abs(Math.sin(s * Math.PI * 1.5))}} />
              비전 감시 시작
            </div>
            <div style={{height: 3, margin: "16px 0 18px", background: C.info, width: `${100 * easeOut((s - HEAD_AT) / 0.5)}%`, opacity: 0.8}} />
            {CHECKS.map((c, i) => {
              const at = ROW_AT + i * ROW_GAP;
              if (s < at) return <div key={c.label} style={{height: 54}} />;
              const done = s >= at + ROW_CHECK;
              return (
                <div key={c.label} style={{position: "relative", display: "flex", alignItems: "center", gap: 16, height: 54, fontSize: 29, fontWeight: 700,
                  ...glitchStyle((s - at) * 2, 11 + i)}}>
                  {done ? <IconCheck size={30} color={C.done} /> : <Spinner s={s} />}
                  <span>{c.label}</span>
                  <span style={{flex: 1, borderBottom: `2px dotted ${C.edge}`, transform: "translateY(4px)"}} />
                  <span style={{fontSize: 27, fontWeight: done ? 800 : 600, color: done ? C.done : C.label, fontVariantNumeric: "tabular-nums"}}>
                    {done ? c.value : "확인 중"}
                  </span>
                </div>
              );
            })}
            {s >= DONE_AT && (
              <div style={{marginTop: 14, fontSize: 30, fontWeight: 800, color: C.info, ...glitchStyle((s - DONE_AT) * 2, 21)}}>
                점검 완료 · 버튼 탐지를 시작합니다
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
