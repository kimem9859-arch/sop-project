import {SCAN_FROM, SCAN_TO, scanY} from "../lib/boot.ts";
import {C, FONT, easeOut, rnd} from "./theme.ts";

// HUD 켜짐(boot 0~1 · BOOT_SEC 초) — 「시스템이 가동됐다」(G3 「배경이 지지직 거리는? 시스템이 가동 되었다는 효과」)
//   0.00~0.32 잡음·주사선이 화면에 깜빡이며 흐름(지지직) · 모서리 테두리가 그려짐
//   0.12~0.80 가운데 「SOP 가디언 · 비전 감시 시작」이 떴다 사라짐
//   SCAN_FROM~SCAN_TO 스캔 선이 위→아래(지나가는 버튼마다 탐지 연출 — ButtonBoxes) · 0.85~1 패널
export const HudBoot: React.FC<{boot: number; W: number; H: number}> = ({boot, W, H}) => {
  if (boot >= 1) return null;
  const seed = Math.floor(boot * 90);
  const L = 160 * easeOut(boot / 0.3);
  const y = scanY(boot, H);
  const noise = boot < 0.32 ? (0.18 + 0.32 * rnd(seed)) * (1 - boot / 0.32) : 0; // 지지직 — 깜빡이며 잦아든다
  const bands = boot < 0.3 ? [0, 1, 2, 3].map((i) => ({y: rnd(seed * 7 + i) * H, h: 2 + rnd(seed * 13 + i) * 14, o: 0.25 + 0.5 * rnd(seed * 3 + i)})) : [];
  const lock = boot < 0.12 ? 0 : boot < 0.24 ? easeOut((boot - 0.12) / 0.12) : boot < 0.68 ? 1 : Math.max(0, 1 - (boot - 0.68) / 0.12);
  const corner = (x: number, yy: number, sx: number, sy: number) => (
    <path d={`M ${x} ${yy + sy * L} L ${x} ${yy} L ${x + sx * L} ${yy}`} stroke={C.info} strokeWidth={4} fill="none" strokeLinecap="round" />
  );
  const scanning = boot > SCAN_FROM && boot < SCAN_TO + 0.02;
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
      {boot < 0.6 && (
        <div style={{position: "absolute", inset: 0, opacity: 0.18 * (1 - boot / 0.6),
          backgroundImage: "repeating-linear-gradient(0deg, rgba(0,0,0,0.9) 0 2px, transparent 2px 4px)"}} />
      )}
      <svg style={{position: "absolute", inset: 0, width: "100%", height: "100%"}}>
        <defs>
          <linearGradient id="scan" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={C.info} stopOpacity="0" />
            <stop offset="1" stopColor={C.info} stopOpacity="0.35" />
          </linearGradient>
        </defs>
        {bands.map((b, i) => <rect key={i} x={0} y={b.y} width={W} height={b.h} fill={C.info} opacity={b.o * 0.5} />)}
        {corner(24, 24, 1, 1)}{corner(W - 24, 24, -1, 1)}{corner(24, H - 24, 1, -1)}{corner(W - 24, H - 24, -1, -1)}
        {scanning && <rect x={0} y={y - 90} width={W} height={90} fill="url(#scan)" />}
        {scanning && <rect x={0} y={y - 1.5} width={W} height={3} fill={C.info} />}
      </svg>
      {lock > 0 && (
        <div style={{position: "absolute", left: 0, right: 0, top: H / 2 - 90, textAlign: "center", fontFamily: FONT, opacity: lock,
          transform: `scale(${0.96 + 0.04 * lock})`}}>
          <div style={{display: "inline-block", padding: "22px 46px", borderRadius: 22, background: "rgba(8,10,12,0.72)",
            border: `1px solid ${C.info}`, boxShadow: "0 12px 32px rgba(0,0,0,0.5)"}}>
            <div style={{fontSize: 64, fontWeight: 800, color: C.text, letterSpacing: `${0.12 * (1 - lock) - 0.01}em`}}>SOP 가디언</div>
            <div style={{fontSize: 28, fontWeight: 700, color: C.info, marginTop: 6, display: "flex", gap: 12, alignItems: "center", justifyContent: "center"}}>
              <span style={{width: 12, height: 12, borderRadius: 6, background: C.done, boxShadow: `0 0 12px ${C.done}`}} />비전 감시 시작
            </div>
          </div>
        </div>
      )}
    </>
  );
};
