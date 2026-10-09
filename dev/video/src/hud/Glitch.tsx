import {C, rnd} from "./theme.ts";

// 「지지직」 등장 — 켜짐·손 탐지와 같은 결(잡음 · 줄무늬 · 색 어긋남 · 가로 흔들림 · 깜빡임)
// 10/9 초안 피드백: 단계 목록이 처음 나올 때 · 공구 카드 내용이 바뀔 때 「지지직 한다거나」 — 꺾쇠·파동은 넣지 않는다
// age = 나타난 뒤 초(null 또는 GLITCH_SEC 이상 = 효과 없음) · seed = 부품마다 다른 잡음
export const GLITCH_SEC = 0.6;

export function glitchStyle(age: number | null, seed = 0, base = ""): React.CSSProperties {
  if (age === null || age >= GLITCH_SEC) return base ? {transform: base} : {};
  if (age < 0) return {opacity: 0, transform: base};
  const p = age / GLITCH_SEC, k = 1 - p, f = Math.floor(age * 30) + seed * 31;
  const on = p > 0.55 || rnd(f) > 0.4 * k; // 앞부분은 켜졌다 꺼졌다
  const dx = (rnd(f + 1) - 0.5) * 30 * k, dy = (rnd(f + 2) - 0.5) * 6 * k;
  const cut = p < 0.4 ? `inset(${(rnd(f + 3) * 35 * k).toFixed(1)}% 0 ${(rnd(f + 4) * 35 * k).toFixed(1)}% 0)` : undefined;
  const sh = (4 + 6 * k).toFixed(1);
  return {
    opacity: on ? 0.6 + 0.4 * p : 0.12,
    transform: `${base} translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)`,
    clipPath: cut,
    filter: `drop-shadow(${sh}px 0 0 rgba(255,40,100,${(0.75 * k).toFixed(2)})) drop-shadow(-${sh}px 0 0 rgba(40,220,255,${(0.75 * k).toFixed(2)}))`,
  };
}

// 부품 안을 덮는 잡음·줄무늬 — 부품의 position 상자 안에 넣는다(inset 0)
export const GlitchNoise: React.FC<{age: number | null; seed?: number; color?: string}> = ({age, seed = 0, color = C.info}) => {
  if (age === null || age < 0 || age >= GLITCH_SEC) return null;
  const k = 1 - age / GLITCH_SEC, f = Math.floor(age * 30) + seed * 31;
  const id = `gn-${seed}`;
  return (
    <svg style={{position: "absolute", inset: 0, width: "100%", height: "100%", borderRadius: "inherit", overflow: "hidden", pointerEvents: "none"}}>
      <filter id={id}>
        <feTurbulence type="fractalNoise" baseFrequency="1.0" numOctaves="2" seed={f} />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter={`url(#${id})`} opacity={(0.35 + 0.35 * rnd(f)) * k} style={{mixBlendMode: "screen"}} />
      {[0, 1, 2].map((i) => (
        <rect key={i} x="0" y={`${(rnd(f * 7 + i) * 100).toFixed(1)}%`} width="100%" height={2 + rnd(f * 11 + i) * 10}
          fill={color} opacity={(0.25 + 0.5 * rnd(f * 5 + i)) * k} />
      ))}
    </svg>
  );
};
