import {BANNER_FROM, BANNER_TO, BOOT_SEC, CHECK_SEC, HEAD_AT, LIST_END, ROW_AT, ROW_CHECK, ROW_GAP, WORLD_SEC, scanY} from "../lib/boot.ts";
import {IconCheck} from "./icons.tsx";
import {C, FONT, easeOut, rnd} from "./theme.ts";

// HUD 켜짐(boot 0~1 · BOOT_SEC 초) — 시간표 = lib/boot
//   0~WORLD_SEC 가상 세계가 펼쳐짐(시안 3 피드백 「안경 프레임이 화면에서 사라진 직후 가상 세계가 펼쳐지는 연출 … 여기까지 인트로」) — 아래 World
//   HEAD_AT~ 가운데 띠: 「비전 감시 시작」 → 점검 4줄(확인 중 → 정상) — 글자는 차분하게(시안 1 피드백 「지지직 … 과해」)
//   LIST_END~ 띠가 내려가며 사라짐 → BANNER 「점검 완료 · 버튼 탐지를 시작합니다」 → (단계 목록은 Hud) → 정지 구간 스캔 선(위 → 아래 → 위 한 번)
const CHECKS = ["카메라 센서 상태", "비전 감지 모델 실행", "인터락 연결 점검", "작업 레시피 불러오기"];
const k01 = (x: number) => Math.max(0, Math.min(1, x));

const Spinner: React.FC<{s: number}> = ({s}) => (
  <svg width={30} height={30} viewBox="0 0 30 30" style={{flex: "none", transform: `rotate(${(s * 540) % 360}deg)`}}>
    <circle cx={15} cy={15} r={11} fill="none" stroke={C.edge} strokeWidth={3} />
    <path d="M15 4 a11 11 0 0 1 11 11" fill="none" stroke={C.info} strokeWidth={3} strokeLinecap="round" />
  </svg>
);

// 가상 세계 펼침 — s = 0~WORLD_SEC(2.6초) · 시안 6 피드백 「좀 더 화려하게 … 현실세계가 아닌 게임과 같은 가상세계」
//   0~0.3 번쩍 · 수평선이 시안/자홍으로 갈라짐 → 0.1~0.6 눈꺼풀이 열리며 짙은 파랑 가상 공간(현실은 어둡게 덮임)
//   0.25~1.9 다가오는 네온 격자(바닥 · 천장) · 0.35~1.3 워프 빛줄기 · 0.3~1.2 충격파 고리 · 0.5~1.8 육각 타일 물결 · 0.45~2.0 회전하는 HUD 고리
//   1.5~2.4 가상 공간이 걷히며 반짝이가 떠오름 → (모서리 테두리는 HudBoot 가 2.0~ 그린다)
const MAG = "#ff4fd8";
const HEX_R = 46;
const HEXES = (() => {
  const out: [number, number][] = [];
  const dx = HEX_R * Math.sqrt(3), dy = HEX_R * 1.5;
  for (let r = -1; r * dy < 1080 + HEX_R; r++) for (let c = -1; c * dx < 1920 + HEX_R; c++) out.push([c * dx + (r % 2 ? dx / 2 : 0), r * dy]);
  return out;
})();
const hexPath = (x: number, y: number, r: number) =>
  Array.from({length: 6}, (_, i) => {
    const a = (Math.PI / 3) * i + Math.PI / 6;
    return `${i ? "L" : "M"} ${(x + r * Math.cos(a)).toFixed(1)} ${(y + r * Math.sin(a)).toFixed(1)}`;
  }).join(" ") + " Z";
const World: React.FC<{s: number; W: number; H: number}> = ({s, W, H}) => {
  if (s >= WORLD_SEC) return null;
  const y0 = H * 0.52, cx = W / 2;
  const line = easeOut(k01(s / 0.2));
  const open = easeOut(k01((s - 0.1) / 0.5));
  const top = y0 - open * (y0 + 20), bot = y0 + open * (H - y0 + 20);
  const space = k01((s - 0.1) / 0.35) * (1 - k01((s - 1.5) / 0.8));      // 가상 공간의 짙기
  const grid = k01((s - 0.25) / 0.25) * (1 - k01((s - 1.4) / 0.5));
  const flash = s < 0.3 ? 0.85 * (1 - s / 0.3) : 0;
  const scroll = (s * 1.4) % 1;                                            // 격자가 다가옴
  const vx = Array.from({length: 25}, (_, i) => i - 12);
  const hy = Array.from({length: 10}, (_, k) => (k + scroll) / 10);
  const warp = k01((s - 0.35) / 0.95);
  const shock = k01((s - 0.3) / 0.9);
  const wave = (s - 0.5) * 1500, wave2 = (s - 0.85) * 1500;               // 육각 물결 앞머리(중심에서 거리)
  const ringsOp = k01((s - 0.45) / 0.3) * (1 - k01((s - 1.6) / 0.4));
  return (
    <svg style={{position: "absolute", inset: 0, width: "100%", height: "100%"}}>
      <defs>
        <clipPath id="world-open"><rect x={0} y={top} width={W} height={Math.max(0, bot - top)} /></clipPath>
        <radialGradient id="world-core" cx="50%" cy="52%" r="65%">
          <stop offset="0" stopColor="#1b3f8f" stopOpacity={0.9} />
          <stop offset="0.55" stopColor="#081633" stopOpacity={0.92} />
          <stop offset="1" stopColor="#02060f" stopOpacity={0.96} />
        </radialGradient>
        <filter id="neon" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {/* 눈꺼풀 바깥 = 아직 어두움 */}
      <rect x={0} y={0} width={W} height={Math.max(0, top)} fill="#02060f" opacity={0.85 * (1 - open)} />
      <rect x={0} y={bot} width={W} height={Math.max(0, H - bot)} fill="#02060f" opacity={0.85 * (1 - open)} />
      <g clipPath="url(#world-open)">
        <rect width={W} height={H} fill="url(#world-core)" opacity={space * 0.82} />
        <g filter="url(#neon)" opacity={grid}>
          {vx.map((i) => (
            <g key={i} stroke={i % 4 === 0 ? MAG : C.info} strokeWidth={2} opacity={0.75}>
              <line x1={cx + i * 26} y1={y0} x2={cx + i * 380} y2={H} />
              <line x1={cx + i * 26} y1={y0} x2={cx + i * 380} y2={0} />
            </g>
          ))}
          {hy.map((k, j) => {
            const d = Math.pow(k, 2.2);
            return (
              <g key={j} stroke={C.info} strokeWidth={2} opacity={0.35 + 0.55 * k}>
                <line x1={0} y1={y0 + d * (H - y0)} x2={W} y2={y0 + d * (H - y0)} />
                <line x1={0} y1={y0 - d * y0} x2={W} y2={y0 - d * y0} />
              </g>
            );
          })}
          <ellipse cx={cx} cy={y0} rx={260} ry={18} fill={C.info} opacity={0.5} />
        </g>
        {/* 육각 타일 물결 — 중심에서 퍼지며 켜졌다 꺼짐(두 겹) */}
        <g>
          {HEXES.map(([x, y], i) => {
            const d = Math.hypot(x - cx, y - y0);
            const b = Math.max(Math.exp(-(((d - wave) / 110) ** 2)), 0.7 * Math.exp(-(((d - wave2) / 90) ** 2)));
            if (b < 0.06) return null;
            const col = rnd(i * 13) > 0.8 ? MAG : C.info;
            return <path key={i} d={hexPath(x, y, HEX_R - 4)} fill={col} fillOpacity={0.22 * b} stroke={col} strokeWidth={2} strokeOpacity={0.9 * b} />;
          })}
        </g>
        {/* 워프 빛줄기 */}
        {warp > 0 && warp < 1 && Array.from({length: 64}, (_, i) => {
          const ang = rnd(i * 7 + 3) * Math.PI * 2, sp = 0.5 + rnd(i * 11) * 0.8;
          const r1 = 80 + warp * 1300 * sp, r2 = r1 + 120 + 260 * warp * sp;
          return <line key={i} x1={cx + Math.cos(ang) * r1} y1={y0 + Math.sin(ang) * r1} x2={cx + Math.cos(ang) * r2} y2={y0 + Math.sin(ang) * r2}
            stroke={i % 3 ? C.info : MAG} strokeWidth={2 + 2 * rnd(i)} strokeLinecap="round" opacity={(1 - warp) * 0.9} />;
        })}
        {/* 회전하는 HUD 고리 */}
        <g opacity={ringsOp} transform={`translate(${cx} ${y0})`} filter="url(#neon)">
          {[{r: 120, w: 3, dash: "18 10", v: 90}, {r: 170, w: 5, dash: "60 26 8 26", v: -60}, {r: 230, w: 2, dash: "4 12", v: 140}].map((g, i) => (
            <circle key={i} r={g.r * (0.85 + 0.15 * easeOut(k01((s - 0.45) / 0.4)))} fill="none" stroke={i === 1 ? MAG : C.info} strokeWidth={g.w}
              strokeDasharray={g.dash} transform={`rotate(${s * g.v * 3})`} />
          ))}
          <circle r={6 + 4 * Math.sin(s * 20)} fill="#e8f6ff" />
        </g>
        {/* 충격파 */}
        {shock > 0 && shock < 1 && <circle cx={cx} cy={y0} r={40 + shock * W * 0.75} fill="none" stroke="#dff3ff" strokeWidth={6 * (1 - shock) + 1} opacity={0.9 * (1 - shock)} />}
        {/* 걷힐 때 떠오르는 반짝이 */}
        {Array.from({length: 70}, (_, i) => {
          const t0 = 1.2 + rnd(i * 5) * 0.6, u = k01((s - t0) / 0.9);
          if (u <= 0 || u >= 1) return null;
          return <circle key={i} cx={rnd(i * 3 + 1) * W} cy={rnd(i * 7 + 2) * H - u * 160} r={1.5 + rnd(i * 9) * 3}
            fill={i % 4 ? "#cfe9ff" : MAG} opacity={(1 - u) * 0.95} />;
        })}
      </g>
      {/* 눈꺼풀 가장자리 — 시안/자홍으로 갈라짐 */}
      {open < 1 && (
        <g strokeWidth={4} opacity={1 - open * 0.5}>
          <line x1={cx - cx * line} y1={top - 3} x2={cx + cx * line} y2={top - 3} stroke={MAG} />
          <line x1={cx - cx * line} y1={top} x2={cx + cx * line} y2={top} stroke={C.info} />
          <line x1={cx - cx * line} y1={bot} x2={cx + cx * line} y2={bot} stroke={C.info} />
          <line x1={cx - cx * line} y1={bot + 3} x2={cx + cx * line} y2={bot + 3} stroke={MAG} />
        </g>
      )}
      {flash > 0 && <rect width={W} height={H} fill="#e6f6ff" opacity={flash} />}
    </svg>
  );
};

export const HudBoot: React.FC<{boot: number; W: number; H: number}> = ({boot, W, H}) => {
  if (boot >= 1) return null;
  const s = boot * BOOT_SEC;
  const L = 160 * easeOut((s - 2.0) / 0.5);
  const y = scanY(s, H);
  const corner = (x: number, yy: number, sx: number, sy: number) => (
    <path d={`M ${x} ${yy + sy * L} L ${x} ${yy} L ${x + sx * L} ${yy}`} stroke={C.info} strokeWidth={4} fill="none" strokeLinecap="round" />
  );
  const listIn = easeOut(k01((s - HEAD_AT) / 0.35));
  const listOut = k01((s - LIST_END) / (BANNER_FROM - LIST_END));  // 내려가며 사라짐
  const listOp = listIn * (1 - listOut);
  const banner = s >= BANNER_FROM && s < BANNER_TO ? Math.min(easeOut(k01((s - BANNER_FROM) / 0.2)), k01((BANNER_TO - s) / 0.25)) : 0;
  return (
    <>
      <World s={s} W={W} H={H} />
      <svg style={{position: "absolute", inset: 0, width: "100%", height: "100%"}}>
        <defs>
          <linearGradient id="scan-dn" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={C.info} stopOpacity="0" />
            <stop offset="1" stopColor={C.info} stopOpacity="0.4" />
          </linearGradient>
        </defs>
        {/* 켜짐 뒤에도 같은 자리 · 같은 모양으로 HudFrame(Fx) 이 이어 받는다(시안 8 · 화면 질감) */}
        {L > 0 && <g>{corner(24, 24, 1, 1)}{corner(W - 24, 24, -1, 1)}{corner(24, H - 24, 1, -1)}{corner(W - 24, H - 24, -1, -1)}</g>}
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
