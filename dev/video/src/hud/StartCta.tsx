import {CTA} from "../lib/cta.ts";
import {SynthLabel} from "./Overlays.tsx";
import {StepPanel} from "./StepPanel.tsx";
import {C, FONT, STEPS, easeOut} from "./theme.ts";

// 「작업 시작」 누름(캡스톤 D83) — 시연 프로그램 StartButton 시안 A(`Rpi5/Demo/overlay_menu.py` · 사용자 10/14)를 옮겨 그림
//   640×148 · 왼쪽 위 · 오른쪽 아래 모서리 24 잘림(overlay.cut_corner_path) · 바탕 sheet_bg · 노랑 테두리 2(누르면 3) · 노랑 ▶ 타일 96
//   · 「START」 · 「작업 시작」 · 부제 · › · 자리 = 영상 가운데(relayout) · 글자 자리는 paintEvent 의 기준선 그대로
//   촬영(10/11)이 버튼(10/14)보다 앞이라 실제 장면이 없어 그린 연출 — 손 대신 손가락 누름 물결
// 시간표 = lib/cta(편집표가 같은 값으로 누름 소리를 놓는다)
// 부제 = 시연 프로그램 _start_subtitle(공정 이름 · 단계 수 · 1단계) — 공정 이름 정본 = Rpi5/Demo/recipe.json process_name 「PECVD 정비(PM) 시퀀스」의 괄호 앞
const SUB = `PECVD 정비 · ${STEPS.length}단계 · 1단계 ${STEPS[0].name}부터`;
const W0 = 640, H0 = 148, CUT = 24, TILE = 96, PAD = 30;
const k01 = (x: number) => Math.max(0, Math.min(1, x));

export const StartCta: React.FC<{age: number; W: number; H: number; synth?: string}> = ({age, W, H, synth}) => {
  const show = easeOut(k01((age - CTA.IN) / 0.35)) * (1 - k01((age - CTA.OUT) / 0.3));
  const down = age >= CTA.PRESS && age < CTA.PRESS + 0.18;
  const scale = (0.94 + 0.06 * easeOut(k01((age - CTA.IN) / 0.35))) * (down ? 0.97 : 1) * (1 + 0.04 * k01((age - CTA.OUT) / 0.3));
  const glow = age >= CTA.PRESS ? Math.max(0, 1 - (age - CTA.PRESS) / 0.45) : 0;   // 누른 뒤 노란 빛이 번졌다 잦아듦
  const x0 = (W - W0) / 2, y0 = (H - H0) / 2, top = (H0 - TILE) / 2;
  const cx = PAD + TILE / 2 + 3, cy = H0 / 2, r = TILE * 0.22;
  const path = `M${CUT + 1} 1 H${W0 - 1} V${H0 - 1 - CUT} L${W0 - 1 - CUT} ${H0 - 1} H1 V${CUT + 1} Z`;
  // 손가락 누름 — 닿는 점(누르기 직전부터 잠깐) · 퍼지는 고리
  const tap = {x: x0 + 300, y: y0 + 80};
  const dot = k01((age - (CTA.PRESS - 0.12)) / 0.12) * (1 - k01((age - CTA.PRESS - 0.12) / 0.2));
  const ring = age >= CTA.PRESS ? k01((age - CTA.PRESS) / 0.55) : -1;
  return (
    <>
      {show > 0 && (
        <div style={{position: "absolute", left: x0, top: y0, width: W0, height: H0, opacity: show, transform: `scale(${scale.toFixed(4)})`,
          filter: glow > 0 ? `drop-shadow(0 0 ${(28 * glow).toFixed(1)}px ${C.current})` : undefined}}>
          <svg width={W0} height={H0} style={{position: "absolute", inset: 0, overflow: "visible"}}>
            <path d={path} fill="rgba(10,12,14,0.94)" stroke={C.current} strokeWidth={down ? 3 : 2} />
            {down && <path d={path} fill="rgba(255,215,92,0.14)" />}
            <rect x={PAD} y={top} width={TILE} height={TILE} fill={C.current} />
            <polygon points={`${cx - r * 0.8},${cy - r} ${cx - r * 0.8},${cy + r} ${cx + r},${cy}`} fill="#111111" />
            <g fontFamily={FONT}>
              <text x={PAD + TILE + 26} y={top + 16} fontSize={17} fontWeight={700} letterSpacing={6} fill={C.current}>START</text>
              <text x={PAD + TILE + 26} y={top + 69} fontSize={54} fontWeight={800} fill={C.text}>작업 시작</text>
              <text x={PAD + TILE + 26} y={top + TILE - 4} fontSize={17} fontWeight={500} fill={C.label}>{SUB}</text>
              <text x={W0 - PAD} y={top + TILE - 4} fontSize={54} fontWeight={800} fill={C.current} textAnchor="end">›</text>
            </g>
          </svg>
        </div>
      )}
      {dot > 0 && <div style={{position: "absolute", left: tap.x - 26, top: tap.y - 26, width: 52, height: 52, borderRadius: "50%",
        background: "rgba(255,255,255,0.55)", boxShadow: "0 0 12px rgba(255,255,255,0.5)", opacity: dot}} />}
      {ring >= 0 && ring < 1 && <div style={{position: "absolute", left: tap.x - 120 * easeOut(ring), top: tap.y - 120 * easeOut(ring),
        width: 240 * easeOut(ring), height: 240 * easeOut(ring), borderRadius: "50%", border: `4px solid ${C.current}`, opacity: 0.9 * (1 - ring)}} />}
      {/* 누른 직후 왼쪽 위 단계 목록 — 01 장 카드의 목록(Hud · START · 1단계 차례)과 같은 모양으로 이어짐 */}
      <StepPanel state="START" done={[]} expected={STEPS[0].button} alert={null} age={age - CTA.PANEL} />
      <SynthLabel text={synth} />
    </>
  );
};
