import {BANNER_FROM, BANNER_TO, BOOT_SEC, CHECK_SEC, HEAD_AT, LIST_END, ROW_AT, ROW_CHECK, ROW_GAP, WORLD_SEC, scanY} from "../lib/boot.ts";
import {IconCheck} from "./icons.tsx";
import {C, FONT, easeOut, rnd} from "./theme.ts";

// HUD 켜짐(boot 0~1 · BOOT_SEC 초) — 시간표 = lib/boot
//   0~WORLD_SEC 가상 세계가 펼쳐짐(시안 3 피드백 「안경 프레임이 화면에서 사라진 직후 가상 세계가 펼쳐지는 연출 … 여기까지 인트로」):
//     가운데 수평선이 번쩍 → 위아래로 눈꺼풀처럼 열리며 원근 격자 · 퍼지는 고리 · 반짝이는 점이 드러났다 걷힘 → 모서리 테두리
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

// 가상 세계 펼침 — s = 0~WORLD_SEC
const World: React.FC<{s: number; W: number; H: number}> = ({s, W, H}) => {
  if (s >= WORLD_SEC) return null;
  const y0 = H * 0.52, cx = W / 2;
  const line = easeOut(k01(s / 0.25));                       // 수평선이 가운데서 양옆으로
  const open = easeOut(k01((s - 0.2) / 0.6));                // 눈꺼풀이 위아래로 열림
  const top = y0 - open * (y0 + 20), bot = y0 + open * (H - y0 + 20);
  const grid = k01((s - 0.25) / 0.3) * (1 - k01((s - 0.9) / 0.6)); // 격자 드러났다 걷힘
  const ring = k01((s - 0.3) / 0.9);
  const flash = s < 0.3 ? 0.5 * (1 - s / 0.3) : 0;
  const vx = Array.from({length: 21}, (_, i) => i - 10);
  const hy = Array.from({length: 9}, (_, k) => (k + 1) / 9);
  return (
    <svg style={{position: "absolute", inset: 0, width: "100%", height: "100%"}}>
      <defs>
        <clipPath id="world-open"><rect x={0} y={top} width={W} height={Math.max(0, bot - top)} /></clipPath>
        <radialGradient id="world-glow" cx="50%" cy="52%" r="60%">
          <stop offset="0" stopColor={C.info} stopOpacity={0.28} />
          <stop offset="1" stopColor={C.info} stopOpacity={0} />
        </radialGradient>
      </defs>
      <rect x={0} y={0} width={W} height={Math.max(0, top)} fill="#04070b" opacity={0.75 * (1 - open)} />
      <rect x={0} y={bot} width={W} height={Math.max(0, H - bot)} fill="#04070b" opacity={0.75 * (1 - open)} />
      <g clipPath="url(#world-open)" opacity={grid}>
        <rect width={W} height={H} fill="url(#world-glow)" />
        {vx.map((i) => (
          <g key={i} stroke={C.info} strokeWidth={1.5} opacity={0.55}>
            <line x1={cx + i * 30} y1={y0} x2={cx + i * 420} y2={H} />
            <line x1={cx + i * 30} y1={y0} x2={cx + i * 420} y2={0} />
          </g>
        ))}
        {hy.map((k, j) => {
          const d = Math.pow(k, 2.2);
          return (
            <g key={j} stroke={C.info} strokeWidth={1.5} opacity={0.5}>
              <line x1={0} y1={y0 + d * (H - y0)} x2={W} y2={y0 + d * (H - y0)} />
              <line x1={0} y1={y0 - d * y0} x2={W} y2={y0 - d * y0} />
            </g>
          );
        })}
        {Array.from({length: 48}, (_, i) => {
          const tw = k01((s - 0.4 - rnd(i) * 0.4) / 0.25) * (1 - k01((s - 1.0 - rnd(i + 99) * 0.3) / 0.3));
          return <circle key={i} cx={rnd(i * 3 + 1) * W} cy={rnd(i * 7 + 2) * H} r={1.5 + rnd(i * 5) * 2.5} fill="#cfe6ff" opacity={tw * 0.9} />;
        })}
      </g>
      {ring > 0 && ring < 1 && <circle cx={cx} cy={y0} r={60 + ring * W * 0.6} fill="none" stroke={C.info} strokeWidth={3 * (1 - ring) + 1} opacity={0.7 * (1 - ring)} />}
      {open < 1 && (
        <g stroke={C.info} strokeWidth={3} opacity={1 - open * 0.6}>
          <line x1={cx - cx * line} y1={top} x2={cx + cx * line} y2={top} />
          <line x1={cx - cx * line} y1={bot} x2={cx + cx * line} y2={bot} />
        </g>
      )}
      {flash > 0 && <rect width={W} height={H} fill="#dfefff" opacity={flash} />}
    </svg>
  );
};

export const HudBoot: React.FC<{boot: number; W: number; H: number}> = ({boot, W, H}) => {
  if (boot >= 1) return null;
  const s = boot * BOOT_SEC;
  const L = 160 * easeOut((s - 0.9) / 0.6);
  const y = scanY(s, H);
  const frameOp = s < BOOT_SEC - 0.5 ? 1 : Math.max(0, (BOOT_SEC - s) / 0.5);
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
        {L > 0 && <g opacity={frameOp}>{corner(24, 24, 1, 1)}{corner(W - 24, 24, -1, 1)}{corner(24, H - 24, 1, -1)}{corner(W - 24, H - 24, -1, -1)}</g>}
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
