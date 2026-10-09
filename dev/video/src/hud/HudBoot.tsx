import {C, easeOut} from "./theme.ts";

// 안경 테 → HUD 켜짐(boot 0~1): 0~0.3 모서리 테두리가 그려짐 → 0.3~0.8 스캔 선이 위→아래(지나간 자리부터 박스) → 0.8~1 패널
export const scanY = (boot: number, H: number) => easeOut((boot - 0.3) / 0.5) * H;

export const HudBoot: React.FC<{boot: number; W: number; H: number}> = ({boot, W, H}) => {
  if (boot >= 1) return null;
  const L = 160 * easeOut(boot / 0.3);
  const y = scanY(boot, H);
  const corner = (x: number, yy: number, sx: number, sy: number) => (
    <path d={`M ${x} ${yy + sy * L} L ${x} ${yy} L ${x + sx * L} ${yy}`} stroke={C.info} strokeWidth={4} fill="none" strokeLinecap="round" />
  );
  const scanning = boot > 0.3 && boot < 0.82;
  return (
    <svg style={{position: "absolute", inset: 0, width: "100%", height: "100%"}}>
      <defs>
        <linearGradient id="scan" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={C.info} stopOpacity="0" />
          <stop offset="1" stopColor={C.info} stopOpacity="0.35" />
        </linearGradient>
      </defs>
      {corner(24, 24, 1, 1)}{corner(W - 24, 24, -1, 1)}{corner(24, H - 24, 1, -1)}{corner(W - 24, H - 24, -1, -1)}
      {scanning && <rect x={0} y={y - 90} width={W} height={90} fill="url(#scan)" />}
      {scanning && <rect x={0} y={y - 1.5} width={W} height={3} fill={C.info} />}
    </svg>
  );
};
