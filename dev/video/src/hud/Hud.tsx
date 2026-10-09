import type {DetView} from "../lib/dets.ts";
import {covers} from "../lib/occlusion.ts";
import type {UiState} from "../lib/uiState.ts";
import {AlertCard} from "./AlertCard.tsx";
import {ButtonBoxes} from "./ButtonBoxes.tsx";
import {HandSkeleton} from "./HandSkeleton.tsx";
import {HudBoot, scanY} from "./HudBoot.tsx";
import {Caption, SpeedBadge, SynthLabel} from "./Overlays.tsx";
import {ProgressGauge} from "./ProgressGauge.tsx";
import {StepPanel} from "./StepPanel.tsx";
import {C, type Fit} from "./theme.ts";
import {ToolCard} from "./ToolCard.tsx";
import {VoiceBubbles} from "./VoiceBubbles.tsx";

const FADE = 0.28;

// t = 원본 영상 초(애니메이션 박자) · tMs = 기록 시각(누름·알림 경과) · boot = HUD 켜짐 0~1 · handGrow = 손 뼈대 뻗기 0~1
export const Hud: React.FC<{ui: UiState; view: DetView; fit: Fit; t: number; tMs: number; boot: number; handGrow: number;
  W: number; H: number; caption?: string; captionOpacity?: number; badge?: string}> =
  ({ui, view, fit, t, tMs, boot, handGrow, W, H, caption, captionOpacity = 1, badge}) => {
    const panels = Math.max(0, Math.min(1, (boot - 0.8) / 0.2));
    const press = ui.lastPress ? {button: ui.lastPress.button, age: (tMs - ui.lastPress.t) / 1000, ok: ui.lastPress.ok} : null;
    const alertAge = ui.alert ? (tMs - ui.alert.since) / 1000 : 0;
    const ring = ui.alert ? (ui.alert.kind === "block" ? C.danger : C.warn) : C.current;
    // 패널 자리에 버튼·공구·손이 들어오면 그 패널을 흐리게(손·버튼을 가리지 않는다 · 경고·차단 카드는 예외)
    const fade = (x: number, y: number, w: number, h: number) => (covers({x, y, w, h}, view, fit) ? FADE : 1);
    const fStep = fade(40, 40, 360, 310), fTool = fade(W - 510, 110, 470, 100);
    const fGauge = fade(W / 2 - 300, 40, 600, 90), fVoice = fade(W - 680, H - 450, 640, 280);
    // 알림 카드는 흐리지 않는다 — 위 자리가 막히고 아래(자막 위)가 비어 있을 때만 내린다 · 둘 다 막히면 위
    const alertLow = covers({x: W / 2 - 340, y: 40, w: 680, h: 130}, view, fit) && !covers({x: W / 2 - 340, y: H - 280, w: 680, h: 130}, view, fit);
    return (
      <>
        <ButtonBoxes boxes={view.btn} fit={fit} t={t} next={ui.sub ? null : ui.expected} press={press}
          alert={ui.alert ? {button: ui.alert.button, kind: ui.alert.kind} : null} revealY={boot >= 1 ? Infinity : scanY(boot, H)} />
        {ui.sub && <ButtonBoxes boxes={view.tool} fit={fit} t={t} tool />}
        <HandSkeleton hand={view.hand} fit={fit} t={t} grow={handGrow} ring={ring} />
        <HudBoot boot={boot} W={W} H={H} />
        <StepPanel state={ui.state} done={ui.done} expected={ui.expected} alert={ui.alert?.kind ?? null} opacity={panels * fStep} />
        <div style={{opacity: fGauge}}>{!ui.alert && panels > 0 && <ProgressGauge sub={ui.sub} />}</div>
        <div style={{opacity: fTool}}><ToolCard tool={panels > 0 ? ui.tool : null} /></div>
        <AlertCard alert={ui.alert} age={alertAge} bottom={alertLow} />
        <div style={{opacity: fVoice}}><VoiceBubbles voice={ui.voice} t={t} /></div>
        <SpeedBadge badge={badge} />
        <Caption text={caption} opacity={captionOpacity} />
        <SynthLabel />
      </>
    );
  };
