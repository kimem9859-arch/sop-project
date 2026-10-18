import type {Box, DetView, Pt} from "../lib/dets.ts";
import {BOOT_SEC, BTN_INTRO_SEC, btnIntroAge, panelState, type BootOpts} from "../lib/boot.ts";
import type {Dwell} from "../lib/judge.ts";
import {covers} from "../lib/occlusion.ts";
import type {UiState} from "../lib/uiState.ts";
import {AlertCard, EdgeAlert} from "./AlertCard.tsx";
import {ButtonBoxes} from "./ButtonBoxes.tsx";
import {CARD_BOX, FactCard} from "./FactCard.tsx";
import {FactStreams, LockBadge, TipTrail, VoiceWave, type Stream} from "./Fx.tsx";
import {HandSkeleton} from "./HandSkeleton.tsx";
import {HudBoot} from "./HudBoot.tsx";
import {JudgeZone} from "./JudgeZone.tsx";
import {SpeedBadge, SynthLabel} from "./Overlays.tsx";
import {Overlap} from "./Overlap.tsx";
import {ProgressGauge} from "./ProgressGauge.tsx";
import {ReleaseButton} from "./ReleaseButton.tsx";
import {DONE_SHOW, StepDone} from "./StepDone.tsx";
import {StepPanel} from "./StepPanel.tsx";
import {C, STEPS, type Fit} from "./theme.ts";
import {ToolCard} from "./ToolCard.tsx";
import {VoiceBubbles} from "./VoiceBubbles.tsx";

// t = 애니메이션 박자(초 · 편집 전체 시계 — 화면 정지 중에도 흐른다) · tMs = 기록 시각(누름·알림 경과) · boot = HUD 켜짐 0~1
// handAge = 손 탐지 연출 뒤 초 · toolIntro = 공구 탐지 연출 뒤 초(정지 구간) · overlap = 손·공구 겹침 강조 뒤 초(정지 구간)
// uiMs = 화면 장식의 시계(기록 시각 + 정지 구간 경과) — 정지 중에도 카드 · 알림 연출은 이어진다(시안 3 피드백 「UI는 계속 진행」)
// frozenAge = 화면 정지 구간 안 경과 초 · dwell = 판정 기준 장면의 머묾 타이머(lib/judge) · pressAt = 누른 버튼이 그 순간 가려졌을 때 직전 박스(lastBox)
// trail = 검지 끝 자취(판정 장면) · impact = 차단 뒤 화면 초(자물쇠 「찰칵」)
// zoneBox = 판정 구역을 그릴 버튼 박스(손이 가려도 크기 유지 — lib/dets stableBox · 시안 17)
// quiet = 0~1 — 공구 인식 연출이 왼쪽 위 단계 목록 · 위 대기 시간에 가리지 않게 그 둘을 잠깐 숨김(시안 17 피드백)
// handRecog = 손 「인식」 길이(HandSkeleton recog — 손 정지 구간까지 · 시안 17 3차) · factFrom = 사실 카드 「검출 결과」 빛줄기를 낼 버튼(없으면 지금 단계 버튼)
// factGauge = 대기 시간 UI 에서도 사실 카드로 빛줄기(시안 17 4차 · 단계 질문) · voiceFx = 지금 나오는 목소리의 물결 세기 · 흐름(lib/voiceLevel)
// bootOpts = 켜짐 모양(편집마다) — world = 가상 세계 · panelAt = 단계 목록이 나타나는 켜짐 초(기본 = 레시피 줄 정상 · 한이음 = 점검 완료 뒤 · D84)
export const Hud: React.FC<{ui: UiState; view: DetView; fit: Fit; t: number; tMs: number; boot: number; handAge: number | null;
  W: number; H: number; badge?: string; synth?: string; pressAt?: Box | null; dwell?: Dwell | null;
  toolIntro?: number | null; overlap?: number | null; frozenAge?: number | null; uiMs?: number; trail?: Pt[] | null; impact?: number | null;
  quiet?: number; zoneBox?: Box | null; handRecog?: number; factFrom?: string; factGauge?: boolean; voiceFx?: {amp: number; phase: number}; bootOpts?: BootOpts}> =
  ({ui, view, fit, t, tMs, boot, handAge, W, H, badge, synth, pressAt = null, dwell = null,
    toolIntro = null, overlap = null, frozenAge = null, uiMs = tMs, trail = null, impact = null, quiet = 0, zoneBox = null, handRecog, factFrom, factGauge = false, voiceFx, bootOpts}) => {
    const bs = boot * BOOT_SEC;
    const {shown: panels, age: panelAge} = panelState(boot, bootOpts?.panelAt);   // 단계 목록 — 보이는지 · 나타난 뒤 초(지지직 등장)
    const press = ui.lastPress ? {button: ui.lastPress.button, age: (uiMs - ui.lastPress.t) / 1000, ok: ui.lastPress.ok} : null;
    const alertAge = ui.alert ? (uiMs - ui.alert.since) / 1000 : 0;
    const ring = ui.alert ? (ui.alert.kind === "block" ? C.danger : C.warn) : C.current;
    // 켜짐 중 버튼은 자기 탐지 연출 차례가 와야 나타난다(B1 → … → EMO) · 연출 중이면 지난 초
    const intro: Record<string, number> = {};
    const btns = boot >= 1 ? view.btn : view.btn.filter(([name]) => {   // 단계 목록은 먼저 나와도 박스는 자기 강조 차례에
      const a = btnIntroAge(name, bs);
      if (a !== null && a >= 0 && a < BTN_INTRO_SEC) intro[name] = a;
      return a !== null && a >= 0;
    });
    // 패널은 흐리지 않는다(G3) · 알림 카드만 — 위 자리가 버튼·손으로 막히고 아래(자막 위)가 비어 있을 때 내린다
    const alertLow = covers({x: W / 2 - 340, y: 40, w: 680, h: 130}, view, fit) && !covers({x: W / 2 - 340, y: H - 280, w: 680, h: 130}, view, fit);
    const tool = ui.tool ? {phase: ui.tool.phase, age: (uiMs - ui.tool.since) / 1000, checks: ui.tool.checks, wrong: ui.tool.wrong !== null} : null;
    const holding = tool !== null && (tool.phase === "checking" || tool.phase === "grasped") && view.tool.length > 0 && view.hand !== null;
    const doneAge = ui.lastDone ? (uiMs - ui.lastDone.t) / 1000 : Infinity;
    const doneShown = doneAge >= 0 && doneAge < DONE_SHOW;
    const q = ui.voice.thinkingSince !== null ? (tMs - ui.voice.thinkingSince) / 1000 : -1;
    // 음성 파동 — 호출 뒤 0.3초에 차오르고 음성비서가 일하는 동안(답 재생이 끝날 때까지) 계속 · 끝나면 0.5초에 걸쳐 사라짐(시안 17 피드백)
    const v = ui.voice;
    const wave = v.calledSince === null ? 0
      : Math.min(1, (tMs - v.calledSince) / 300) * (v.endedAt !== null ? Math.max(0, 1 - (tMs - v.endedAt) / 500) : 1);
    const lockBox = ui.alert?.kind === "block" && ui.alert.button
      ? (zoneBox && zoneBox[0] === ui.alert.button ? zoneBox : view.btn.find((b) => b[0] === ui.alert!.button) ?? pressAt) : null;
    // 사실 카드로 모이는 빛줄기의 출발점 — 단계 목록 아래 · 공구 카드 아래 · 지금 단계 버튼의 검출 상자(카드에 가리면 뺌)
    const streams: Stream[] = [];
    if (v.card && v.thinking) {
      if (panels) streams.push({x: 260, y: 402, label: "단계 상태", col: C.done});
      if (panels && ui.tool) streams.push({x: W - 275, y: 205, label: "공구 상태", col: C.current});
      // 대기 시간 UI(위 가운데 · 폭 600 · 아래 끝 약 128)에서 — 단계 질문(시안 17 4차 피드백 「대기 시간 UI 에서 사실 카드로 이어지는 상태 모으기」)
      //   출발점 = 아래 가운데 · 이름표는 그 아래(13차 「오른쪽이 아니라 하단 중앙으로」 — 4차는 오른쪽 끝 · 이름표 오른쪽)
      if (factGauge && panels && ui.sub && !ui.alert) streams.push({x: W / 2, y: 130, label: "대기 시간", col: C.gaugeFrom});
      const at = (x: Box) => [fit.x + ((x[2] + x[4]) / 2) * fit.s, fit.y + x[5] * fit.s];
      const shown = view.btn.filter((x) => {   // 카드에 가리지 않는 상자 — 지금 단계 버튼이 가리면 다른 버튼에서
        const [bx, by] = at(x);
        return !(bx > CARD_BOX.x - 20 && bx < CARD_BOX.x + CARD_BOX.w + 20 && by > CARD_BOX.y - 20 && by < CARD_BOX.y + CARD_BOX.h + 60);
      });
      const b = shown.find((x) => x[0] === (factFrom ?? ui.sub?.button ?? ui.expected)) ?? shown[0];
      // 카드 오른쪽의 버튼은 상자 왼쪽 가운데에서 출발 · 이름표도 왼쪽(아래는 작업자 말풍선 자리 · 시안 17 7차 B4) — 그 밖은 상자 아래 가운데
      const side = b && fit.x + b[2] * fit.s > CARD_BOX.x + CARD_BOX.w;
      if (b && side) streams.push({x: fit.x + b[2] * fit.s - 6, y: fit.y + ((b[3] + b[5]) / 2) * fit.s, label: "검출 결과", col: "#62e6ff", side: "left"});
      else if (b) streams.push({x: Math.min(Math.max(at(b)[0], 80), W - 80), y: Math.min(at(b)[1], H - 80), label: "검출 결과", col: "#62e6ff"});
    }
    return (
      <>
        <ButtonBoxes boxes={btns} fit={fit} t={t} next={ui.sub ? null : ui.expected} press={press}
          alert={ui.alert ? {button: ui.alert.button, kind: ui.alert.kind} : null} intro={intro} pressAt={pressAt} hide={dwell?.button ?? null} />
        {dwell && (() => {
          const b = zoneBox && zoneBox[0] === dwell.button ? zoneBox : view.btn.find((x) => x[0] === dwell.button);
          return b ? <JudgeZone box={b} fit={fit} dwell={dwell} t={t} left={dwell.kind === "graze"} /> : null;   // 스침 = 손이 오른쪽에서 와 글을 왼쪽에(시안 17 3차)
        })()}
        {(ui.sub || toolIntro !== null) && <ButtonBoxes boxes={view.tool} fit={fit} t={t} tool toolState={tool} toolIntro={toolIntro} frozenAge={frozenAge} />}
        {overlap !== null && view.hand && view.tool[0] && <Overlap hand={view.hand} tool={view.tool[0]} fit={fit} age={overlap} t={t} />}
        {/* 검지 끝 자취는 손 뼈대 아래(뼈대 · 판정 박스를 가리지 않게) */}
        {/* 「검지 끝」 이름표는 뺌(시안 17 피드백) */}
        {trail && trail.length > 1 && <TipTrail pts={trail} fit={fit} label={false} />}
        <HandSkeleton hand={view.hand} fit={fit} t={t} age={handAge} ring={ring} dim={holding && overlap === null} pulse={overlap !== null} recog={handRecog} />
        {lockBox && <LockBadge box={lockBox} fit={fit} age={impact ?? 10} t={t} />}
        <HudBoot boot={boot} W={W} H={H} world={bootOpts?.world ?? true} />
        <div style={{position: "absolute", inset: 0, opacity: 1 - quiet}}>
          {panels && <StepPanel state={boot < 1 ? "START" : ui.state} done={ui.done} expected={ui.expected} alert={ui.alert?.kind ?? null} age={panelAge} />}
          {!ui.alert && panels && ui.sub && (
            <ProgressGauge sub={ui.sub} age={(tMs - ui.sub.since) / 1000} first={ui.sub.button === STEPS[0].button && ui.done.length === 0}
              top={doneShown ? 150 : 40} />
          )}
          {panels && <StepDone done={ui.lastDone} age={doneAge} all={ui.done.length === STEPS.length} />}
        </div>
        <ToolCard tool={panels ? ui.tool : null} age={ui.tool ? (uiMs - ui.tool.since) / 1000 : null} />
        <AlertCard alert={ui.alert} age={alertAge} bottom={alertLow} />
        {!ui.alert && tool?.wrong && <EdgeAlert red age={tool.age} flash />}   {/* 다른 공구 — 차단 · 경고와 같은 화면 테두리(시안 17 3차) */}
        {ui.alert?.kind === "block" && <ReleaseButton age={alertAge} t={t} />}   {/* 경고 해제 버튼은 뺌(시안 17 피드백) */}
        {streams.length > 0 && <FactStreams q={q} from={streams} card={CARD_BOX} />}
        {ui.voice.card && ui.voice.thinking && <FactCard lines={ui.voice.card} q={q} W={W} H={H} />}
        <VoiceWave level={wave} t={t} W={W} H={H} voice={voiceFx} />   {/* 목소리를 따라(시안 17 8차 · lib/voiceLevel) */}
        <VoiceBubbles voice={ui.voice} t={t} tMs={tMs} />
        <SpeedBadge badge={badge} />
        <SynthLabel text={synth} />
      </>
    );
  };
