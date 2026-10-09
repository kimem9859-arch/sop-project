import type {Box, DetView} from "../lib/dets.ts";
import {BOOT_SEC, BTN_INTRO_SEC, PANEL_FROM, btnIntroAge} from "../lib/boot.ts";
import type {Dwell} from "../lib/judge.ts";
import {covers} from "../lib/occlusion.ts";
import type {UiState} from "../lib/uiState.ts";
import {AlertCard} from "./AlertCard.tsx";
import {ButtonBoxes} from "./ButtonBoxes.tsx";
import {FactCard} from "./FactCard.tsx";
import {HandSkeleton} from "./HandSkeleton.tsx";
import {HudBoot} from "./HudBoot.tsx";
import {JudgeZone} from "./JudgeZone.tsx";
import {Caption, SpeedBadge, SynthLabel} from "./Overlays.tsx";
import {Overlap} from "./Overlap.tsx";
import {ProgressGauge} from "./ProgressGauge.tsx";
import {DONE_SHOW, StepDone} from "./StepDone.tsx";
import {StepPanel} from "./StepPanel.tsx";
import {C, STEPS, type Fit} from "./theme.ts";
import {ToolCard} from "./ToolCard.tsx";
import {VoiceBubbles} from "./VoiceBubbles.tsx";

// t = 애니메이션 박자(초 · 편집 전체 시계 — 화면 정지 중에도 흐른다) · tMs = 기록 시각(누름·알림 경과) · boot = HUD 켜짐 0~1
// handAge = 손 탐지 연출 뒤 초 · toolIntro = 공구 탐지 연출 뒤 초(정지 구간) · overlap = 손·공구 겹침 강조 뒤 초(정지 구간)
// frozenAge = 화면 정지 구간 안 경과 초 · dwell = 판정 기준 장면의 머묾 타이머(lib/judge) · pressAt = 누른 버튼이 그 순간 가려졌을 때 직전 박스(lastBox)
export const Hud: React.FC<{ui: UiState; view: DetView; fit: Fit; t: number; tMs: number; boot: number; handAge: number | null;
  W: number; H: number; caption?: string; captionOpacity?: number; badge?: string; synth?: string; pressAt?: Box | null; dwell?: Dwell | null;
  toolIntro?: number | null; overlap?: number | null; frozenAge?: number | null}> =
  ({ui, view, fit, t, tMs, boot, handAge, W, H, caption, captionOpacity = 1, badge, synth, pressAt = null, dwell = null,
    toolIntro = null, overlap = null, frozenAge = null}) => {
    const bs = boot * BOOT_SEC;
    const panelAge = boot >= 1 ? null : (boot - PANEL_FROM) * BOOT_SEC; // 단계 목록이 나타난 뒤 초(지지직 등장)
    const panels = boot >= PANEL_FROM;
    const press = ui.lastPress ? {button: ui.lastPress.button, age: (tMs - ui.lastPress.t) / 1000, ok: ui.lastPress.ok} : null;
    const alertAge = ui.alert ? (tMs - ui.alert.since) / 1000 : 0;
    const ring = ui.alert ? (ui.alert.kind === "block" ? C.danger : C.warn) : C.current;
    // 켜짐 중 버튼은 자기 탐지 연출 차례가 와야 나타난다(B1 → … → EMO) · 연출 중이면 지난 초
    const intro: Record<string, number> = {};
    const btns = panels ? view.btn : view.btn.filter(([name]) => {
      const a = btnIntroAge(name, bs);
      if (a !== null && a >= 0 && a < BTN_INTRO_SEC) intro[name] = a;
      return a !== null && a >= 0;
    });
    // 패널은 흐리지 않는다(G3) · 알림 카드만 — 위 자리가 버튼·손으로 막히고 아래(자막 위)가 비어 있을 때 내린다
    const alertLow = covers({x: W / 2 - 340, y: 40, w: 680, h: 130}, view, fit) && !covers({x: W / 2 - 340, y: H - 280, w: 680, h: 130}, view, fit);
    const tool = ui.tool ? {phase: ui.tool.phase, age: (tMs - ui.tool.since) / 1000, checks: ui.tool.checks, wrong: ui.tool.wrong !== null} : null;
    const holding = tool !== null && (tool.phase === "checking" || tool.phase === "grasped") && view.tool.length > 0 && view.hand !== null;
    const doneAge = ui.lastDone ? (tMs - ui.lastDone.t) / 1000 : Infinity;
    const doneShown = doneAge >= 0 && doneAge < DONE_SHOW;
    const q = ui.voice.thinkingSince !== null ? (tMs - ui.voice.thinkingSince) / 1000 : -1;
    return (
      <>
        <ButtonBoxes boxes={btns} fit={fit} t={t} next={ui.sub ? null : ui.expected} press={press}
          alert={ui.alert ? {button: ui.alert.button, kind: ui.alert.kind} : null} intro={intro} pressAt={pressAt} />
        {dwell && (() => {
          const b = view.btn.find((x) => x[0] === dwell.button);
          return b ? <JudgeZone box={b} fit={fit} dwell={dwell} t={t} /> : null;
        })()}
        {(ui.sub || toolIntro !== null) && <ButtonBoxes boxes={view.tool} fit={fit} t={t} tool toolState={tool} toolIntro={toolIntro} frozenAge={frozenAge} />}
        {overlap !== null && view.hand && view.tool[0] && <Overlap hand={view.hand} tool={view.tool[0]} fit={fit} age={overlap} t={t} />}
        <HandSkeleton hand={view.hand} fit={fit} t={t} age={handAge} ring={ring} dim={holding && overlap === null} />
        <HudBoot boot={boot} W={W} H={H} />
        {panels && <StepPanel state={ui.state} done={ui.done} expected={ui.expected} alert={ui.alert?.kind ?? null} age={panelAge} />}
        {!ui.alert && panels && ui.sub && (
          <ProgressGauge sub={ui.sub} age={(tMs - ui.sub.since) / 1000} first={ui.sub.button === STEPS[0].button && ui.done.length === 0}
            top={doneShown ? 150 : 40} />
        )}
        {panels && <StepDone done={ui.lastDone} age={doneAge} all={ui.done.length === STEPS.length} />}
        <ToolCard tool={panels ? ui.tool : null} age={ui.tool ? (tMs - ui.tool.since) / 1000 : null} />
        <AlertCard alert={ui.alert} age={alertAge} bottom={alertLow} />
        {ui.voice.card && ui.voice.thinking && <FactCard lines={ui.voice.card} q={q} W={W} H={H} />}
        <VoiceBubbles voice={ui.voice} t={t} tMs={tMs} />
        <SpeedBadge badge={badge} />
        <Caption text={caption} opacity={captionOpacity} />
        <SynthLabel text={synth} />
      </>
    );
  };
