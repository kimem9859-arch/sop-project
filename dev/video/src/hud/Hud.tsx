import type {Box, DetView} from "../lib/dets.ts";
import {BOOT_SEC, BTN_INTRO_SEC, PANEL_FROM, scanPassBoot, scanY} from "../lib/boot.ts";
import {covers} from "../lib/occlusion.ts";
import type {UiState} from "../lib/uiState.ts";
import {AlertCard} from "./AlertCard.tsx";
import {ButtonBoxes} from "./ButtonBoxes.tsx";
import {HandSkeleton} from "./HandSkeleton.tsx";
import {HudBoot} from "./HudBoot.tsx";
import {Caption, SpeedBadge, SynthLabel} from "./Overlays.tsx";
import {ProgressGauge} from "./ProgressGauge.tsx";
import {DONE_SHOW, StepDone} from "./StepDone.tsx";
import {StepPanel} from "./StepPanel.tsx";
import {C, STEPS, type Fit} from "./theme.ts";
import {ToolCard} from "./ToolCard.tsx";
import {VoiceBubbles} from "./VoiceBubbles.tsx";

// pressAt = 누른 버튼이 그 순간 가려졌을 때 직전 박스(lastBox) · t = 애니메이션 박자(초 · 편집 전체 시계 — 화면 정지 중에도 흐른다) · tMs = 기록 시각(누름·알림 경과) · boot = HUD 켜짐 0~1 · handAge = 손 탐지 연출 뒤 초
export const Hud: React.FC<{ui: UiState; view: DetView; fit: Fit; t: number; tMs: number; boot: number; handAge: number | null;
  W: number; H: number; caption?: string; captionOpacity?: number; badge?: string; synth?: string; pressAt?: Box | null}> =
  ({ui, view, fit, t, tMs, boot, handAge, W, H, caption, captionOpacity = 1, badge, synth, pressAt = null}) => {
    const panelAge = boot >= 1 ? null : (boot - PANEL_FROM) * BOOT_SEC; // 단계 목록이 나타난 뒤 초(지지직 등장)
    const panels = boot >= PANEL_FROM;
    const press = ui.lastPress ? {button: ui.lastPress.button, age: (tMs - ui.lastPress.t) / 1000, ok: ui.lastPress.ok} : null;
    const alertAge = ui.alert ? (tMs - ui.alert.since) / 1000 : 0;
    const ring = ui.alert ? (ui.alert.kind === "block" ? C.danger : C.warn) : C.current;
    // 패널은 흐리지 않는다(G3 「UI나 자막에 가려진 것은 어쩔 수 없는 거고 … 지장이 없다면 괜찮아」)
    // 알림 카드만 — 위 자리가 버튼·손으로 막히고 아래(자막 위)가 비어 있을 때 내린다 · 둘 다 막히면 위
    // 켜짐 스캔 선이 지나간 버튼마다 탐지 연출(BTN_INTRO_SEC) — 이름 → 지나간 뒤 초
    const intro: Record<string, number> = {};
    if (boot < 1) for (const [name, , , y1] of view.btn) {
      const age = (boot - scanPassBoot(fit.y + y1 * fit.s, H)) * BOOT_SEC;
      if (age >= 0 && age < BTN_INTRO_SEC) intro[name] = age;
    }
    const alertLow = covers({x: W / 2 - 340, y: 40, w: 680, h: 130}, view, fit) && !covers({x: W / 2 - 340, y: H - 280, w: 680, h: 130}, view, fit);
    const tool = ui.tool ? {phase: ui.tool.phase, age: (tMs - ui.tool.since) / 1000, checks: ui.tool.checks, wrong: ui.tool.wrong !== null} : null;
    const holding = tool !== null && (tool.phase === "checking" || tool.phase === "grasped") && view.tool.length > 0 && view.hand !== null;
    const doneAge = ui.lastDone ? (tMs - ui.lastDone.t) / 1000 : Infinity;
    const doneShown = doneAge >= 0 && doneAge < DONE_SHOW;
    return (
      <>
        <ButtonBoxes boxes={view.btn} fit={fit} t={t} next={ui.sub ? null : ui.expected} press={press}
          alert={ui.alert ? {button: ui.alert.button, kind: ui.alert.kind} : null} revealY={boot >= 1 ? Infinity : scanY(boot, H)} intro={intro} pressAt={pressAt} />
        {ui.sub && <ButtonBoxes boxes={view.tool} fit={fit} t={t} tool toolState={tool} />}
        <HandSkeleton hand={view.hand} fit={fit} t={t} age={handAge} ring={ring} dim={holding} />
        <HudBoot boot={boot} W={W} H={H} />
        {panels && <StepPanel state={ui.state} done={ui.done} expected={ui.expected} alert={ui.alert?.kind ?? null} age={panelAge} />}
        {!ui.alert && panels && ui.sub && (
          <ProgressGauge sub={ui.sub} age={(tMs - ui.sub.since) / 1000} first={ui.sub.button === STEPS[0].button && ui.done.length === 0}
            top={doneShown ? 150 : 40} />
        )}
        {panels && <StepDone done={ui.lastDone} age={doneAge} all={ui.done.length === STEPS.length} />}
        <ToolCard tool={panels ? ui.tool : null} age={ui.tool ? (tMs - ui.tool.since) / 1000 : null} />
        <AlertCard alert={ui.alert} age={alertAge} bottom={alertLow} />
        <VoiceBubbles voice={ui.voice} t={t} />
        <SpeedBadge badge={badge} />
        <Caption text={caption} opacity={captionOpacity} />
        <SynthLabel text={synth} />
      </>
    );
  };
