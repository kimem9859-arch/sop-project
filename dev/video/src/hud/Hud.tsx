import type {DetView} from "../lib/dets.ts";
import {BOOT_SEC, scanPassBoot, scanY} from "../lib/boot.ts";
import {covers} from "../lib/occlusion.ts";
import type {UiState} from "../lib/uiState.ts";
import {AlertCard} from "./AlertCard.tsx";
import {ButtonBoxes} from "./ButtonBoxes.tsx";
import {HandSkeleton} from "./HandSkeleton.tsx";
import {HudBoot} from "./HudBoot.tsx";
import {Caption, SpeedBadge, SynthLabel} from "./Overlays.tsx";
import {ProgressGauge} from "./ProgressGauge.tsx";
import {StepPanel} from "./StepPanel.tsx";
import {C, type Fit} from "./theme.ts";
import {ToolCard} from "./ToolCard.tsx";
import {VoiceBubbles} from "./VoiceBubbles.tsx";

// t = 원본 영상 초(애니메이션 박자) · tMs = 기록 시각(누름·알림 경과) · boot = HUD 켜짐 0~1 · handAge = 손이 처음 나타난 뒤 초(handSince)
export const Hud: React.FC<{ui: UiState; view: DetView; fit: Fit; t: number; tMs: number; boot: number; handAge: number | null;
  W: number; H: number; caption?: string; captionOpacity?: number; badge?: string}> =
  ({ui, view, fit, t, tMs, boot, handAge, W, H, caption, captionOpacity = 1, badge}) => {
    const panels = Math.max(0, Math.min(1, (boot - 0.85) / 0.15));
    const press = ui.lastPress ? {button: ui.lastPress.button, age: (tMs - ui.lastPress.t) / 1000, ok: ui.lastPress.ok} : null;
    const alertAge = ui.alert ? (tMs - ui.alert.since) / 1000 : 0;
    const ring = ui.alert ? (ui.alert.kind === "block" ? C.danger : C.warn) : C.current;
    // 패널은 흐리지 않는다(G3 「UI나 자막에 가려진 것은 어쩔 수 없는 거고 … 지장이 없다면 괜찮아」)
    // 알림 카드만 — 위 자리가 버튼·손으로 막히고 아래(자막 위)가 비어 있을 때 내린다 · 둘 다 막히면 위
    // 켜짐 스캔 선이 지나간 버튼마다 탐지 연출(0.7초) — 이름 → 지나간 뒤 초
    const intro: Record<string, number> = {};
    if (boot < 1) for (const [name, , , y1] of view.btn) {
      const age = (boot - scanPassBoot(fit.y + y1 * fit.s, H)) * BOOT_SEC;
      if (age >= 0 && age < 0.7) intro[name] = age;
    }
    const alertLow = covers({x: W / 2 - 340, y: 40, w: 680, h: 130}, view, fit) && !covers({x: W / 2 - 340, y: H - 280, w: 680, h: 130}, view, fit);
    return (
      <>
        <ButtonBoxes boxes={view.btn} fit={fit} t={t} next={ui.sub ? null : ui.expected} press={press}
          alert={ui.alert ? {button: ui.alert.button, kind: ui.alert.kind} : null} revealY={boot >= 1 ? Infinity : scanY(boot, H)} intro={intro} />
        {ui.sub && <ButtonBoxes boxes={view.tool} fit={fit} t={t} tool />}
        <HandSkeleton hand={view.hand} fit={fit} t={t} age={handAge} ring={ring} />
        <HudBoot boot={boot} W={W} H={H} />
        <StepPanel state={ui.state} done={ui.done} expected={ui.expected} alert={ui.alert?.kind ?? null} opacity={panels} />
        {!ui.alert && panels > 0 && <ProgressGauge sub={ui.sub} />}
        <ToolCard tool={panels > 0 ? ui.tool : null} />
        <AlertCard alert={ui.alert} age={alertAge} bottom={alertLow} />
        <VoiceBubbles voice={ui.voice} t={t} />
        <SpeedBadge badge={badge} />
        <Caption text={caption} opacity={captionOpacity} />
        <SynthLabel />
      </>
    );
  };
