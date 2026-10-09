import {AbsoluteFill, Freeze, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig, type CalculateMetadataFunction} from "remotion";
import {BOOT_SEC, BTN_INTRO_SEC, BTN_ORDER, BTN_STEP, btnIntroAge} from "../lib/boot.ts";
import {detAt, firstHandAt, fitRect, lastBox, tipTrail, type Box, type Dets} from "../lib/dets.ts";
import {bootTimes, place, srcSec, totalFrames, type Clip, type Placed} from "../lib/edit.ts";
import {burstAge, insetSpot, screenSince, shake} from "../lib/fx.ts";
import {dwellAt} from "../lib/judge.ts";
import {holeMask, holesFor} from "../lib/mask.ts";
import type {Ev} from "../lib/timeline.ts";
import {stagedRun, type StagedEv, type StagedPress} from "../lib/staged.ts";
import {stateAt} from "../lib/uiState.ts";
import {Callout} from "../hud/Callout.tsx";
import {Breadcrumb, ChapterTitle, SectionTitle} from "../hud/ChapterTitle.tsx";
import {EndSummary} from "../hud/EndSummary.tsx";
import {ChromaFilter, INSET, PixelBurst, ZoomInset} from "../hud/Fx.tsx";
import {BTN, C, TOOL_KO} from "../hud/theme.ts";
import {Hud} from "../hud/Hud.tsx";
import {SKELETON} from "../edits/skeleton.ts";
import {PRETEST, PRETEST_STAGED, PRETEST_SYNTH} from "../edits/pretest.ts";
import {FEATURE, FEATURE_STAGED, FEATURE_SYNTH} from "../edits/feature.ts";

// 자료 묶음마다(촬영 · 연출 기록 갈래 run) — 검출 · 기록 시간표 · 시각 맞춤(영상 0초의 기록 시각) · 손 첫 등장
// handIntro · toolIntro = 편집표의 손 · 공구 탐지 정지 구간 원본 초(있으면 그 전엔 숨기고 그때 연출 · -1 = 다른 촬영에서 이미 함)
type TakeData = {dets: Dets; tl: {runStart: number; events: Ev[]}; offsetMs: number; firstHand: number | null;
  handIntro: number | null; toolIntro: number | null};
const EDITS: Record<string, Clip[]> = {skeleton: SKELETON, pretest: PRETEST, feature: FEATURE};
// 측정 기록 없이 찍은 촬영 = 연출 기록(lib/staged)으로 대신(편집 → 자료 묶음) · 그 편집은 「합성」 표기도 바꿔 단다
export type Staged = {start: number; presses: StagedPress[]; first?: string; extra?: StagedEv[]};
const STAGED: Record<string, Record<string, Staged>> = {pretest: PRETEST_STAGED, feature: FEATURE_STAGED};
const SYNTH: Record<string, string> = {pretest: PRETEST_SYNTH, feature: FEATURE_SYNTH};
export type CutProps = {edit: string; data: Record<string, TakeData> | null};
const keyOf = (c: Clip) => (c.run ? `${c.take}#${c.run}` : c.take);

export const calcCut: CalculateMetadataFunction<CutProps> = async ({props}) => {
  const clips = EDITS[props.edit];
  const data: Record<string, TakeData> = {};
  const introAt = (take: string, kind: Clip["intro"]) => {
    const own = clips.find((c) => c.take === take && c.intro === kind);
    return own ? own.from : clips.some((c) => c.intro === kind) ? -1 : null;
  };
  for (const key of new Set(clips.filter((c) => c.overlay).map(keyOf))) {
    const take = key.split("#")[0];
    const j = (f: string) => fetch(staticFile(`footage/${take}/${f}`)).then((r) => r.json());
    const st = STAGED[props.edit]?.[key];
    const [dets, tl, sy] = st ? [await j("dets.json"), stagedRun(st.start, st.presses, {first: st.first, extra: st.extra}), {offsetMs: 0}]
      : await Promise.all([j("dets.json"), j("timeline.json"), j("sync.json")]);
    const from = Math.min(...clips.filter((c) => c.overlay && keyOf(c) === key).map((c) => c.from));
    data[key] = {dets, tl, offsetMs: sy.offsetMs, firstHand: firstHandAt(dets, from), handIntro: introAt(take, "hand"), toolIntro: introAt(take, "tool")};
  }
  return {props: {...props, data}, durationInFrames: totalFrames(place(clips, 30))};
};

const BLUR_RAMP = 6; // 정지 구간 들고 날 때 흐림이 차오르는 프레임
const DWELL_FILL = 1.5; // 경고 절 정지 중 0.3초 타이머가 차는 데 걸리는 화면 초
const BLURS = new Set(["buttons", "hand", "tool", "overlap"]); // 흐림 · 어둡게를 쓰는 정지 연출(경고 절 정지는 그냥 멈춤)
// 테크 효과(시안 8 「테크적이고 화려하게」) — 차단 순간 = 흔들림 · 붉은 번쩍임 · 색 번짐 · 살짝 당겨짐 · 장 전환 = 색 번짐 + 픽셀 조각
//   시안 9 「장 전환 효과가 너무 강한 것 같아」 → 0.3초 · 색 번짐 5 px(PixelBurst 도 옅게)
const IMPACT = 0.35, TRAIL_SEC = 0.3, BURST = 0.3, BURST_CA = 5;
const PANEL = {x: 40, y: 40, w: 440, h: 360};   // 왼쪽 위 단계 목록(확대 창이 피할 자리)

// boot0 = 이 구간 시작의 켜짐 초와 흐름 여부(lib/edit bootTimes — 제목 카드 동안 멈춤) · null = 켜짐 전
// ps · i = 편집 전체와 이 구간 순번(차단 순간의 화면 시계) · trailFrom = 검지 끝 자취를 이 원본 초부터만(절 카드 바로 뒤 — 안 보인 자취를 그리지 않게)
const ClipView: React.FC<{p: Placed; d: TakeData | undefined; boot0: {at: number; runs: boolean} | null; synth?: string;
  ps: Placed[]; i: number; trailFrom: number | null}> = ({p, d, boot0, synth, ps, i, trailFrom}) => {
  const f = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const c = p.clip;
  const sec = srcSec(c, f, fps);
  const holdT = c.hold !== undefined ? f / fps : null;  // 정지 구간 안 경과 초(연출 시계)
  const fadeIn = Math.min(1, f / 10), fadeOut = Math.min(1, (p.frames - f) / 10);
  const fit = d ? fitRect(d.dets.w, d.dets.h, width, height) : null;
  let hud = null;
  let impact: number | null = null;   // 차단이 화면에 처음 나온 뒤 화면 초(lib/fx screenSince)
  let view = d ? detAt(d.dets, sec) : null;
  if (c.overlay && d && view && fit && c.intro !== "end") {
    // 공구는 공구 탐지 연출 전에는 숨긴다(손과 같게 · 시안 1 피드백 「바로 공구가 나타나면 실행하지 말고 약간의 지연」)
    if (d.toolIntro !== null && d.toolIntro >= 0 && c.intro !== "tool" && sec < d.toolIntro) view = {...view, tool: []};
    const tMs = d.offsetMs + sec * 1000;
    const boot = boot0 === null ? 1 : Math.max(0, Math.min(1, (boot0.at + (boot0.runs ? f / fps : 0)) / BOOT_SEC));
    // 손 탐지 연출 — 편집표에 손 정지 구간이 있으면 그 구간에서만(그 전엔 숨김) · 없으면 본편 첫 등장 한 번(G3)
    const handAge = !view.hand ? null
      : d.handIntro !== null ? (c.intro === "hand" ? holdT : sec > d.handIntro || (sec === d.handIntro && c.hold === undefined) ? 10 : null)
      : d.firstHand !== null && sec >= d.firstHand ? sec - d.firstHand : 10;
    const ui = stateAt(d.tl.events, d.tl.runStart, tMs);
    const lp = ui.lastPress && tMs - ui.lastPress.t < 1000 ? ui.lastPress.button : null;
    const pressAt = lp && !view.btn.some((b) => b[0] === lp) ? lastBox(d.dets, sec, lp, 1) : null;
    // 경고 절 — 오답 버튼에 손가락이 닿은 순간 화면을 멈추고 그동안 0.3초 타이머를 채운다(시안 3 피드백 · 기록의 머문 시작과 같은 자리)
    const uiMs = tMs + (holdT ?? 0) * 1000;   // 정지 중에도 흐르는 장식 시계(차단 정지 중 판정 구역이 사라지는 것 등)
    // 판정 구역을 찾는 시각 — 그냥 멈춘 구간(차단 정지)만 장식 시계로 · 제목 카드 · 탐지 정지는 기록 시각 그대로
    //   (제목 카드 동안 장식 시계가 앞서 가 다음 장면의 경고 · 스침 구역이 미리 비치던 것 — 시안 4 피드백 「판정 영역 그래픽이 잠깐 나오는데」)
    const plainHold = c.hold !== undefined && !c.card && !c.intro;
    const dw0 = dwellAt(d.tl.events, d.tl.runStart, plainHold ? uiMs : tMs);
    const dw = c.intro === "dwell" && dw0 && holdT !== null ? {...dw0, progress: Math.min(1, holdT / DWELL_FILL), done: false} : dw0;
    if (ui.alert?.kind === "block") impact = screenSince(ps, i, f, fps, (ui.alert.since - d.offsetMs) / 1000);
    const back = trailFrom === null ? TRAIL_SEC : Math.min(TRAIL_SEC, Math.max(0, sec - trailFrom));
    hud = <Hud ui={ui} pressAt={pressAt} dwell={dw} uiMs={uiMs} view={view} fit={fit} impact={impact}
      trail={c.tip ? tipTrail(d.dets, sec, back) : null}
      t={(p.start + f) / fps} tMs={tMs} boot={boot} handAge={handAge} W={width} H={height} caption={c.caption}
      captionOpacity={Math.min(fadeIn, fadeOut)} badge={c.badge} synth={synth}
      toolIntro={c.intro === "tool" ? holdT : null} overlap={c.intro === "overlap" ? holdT : null} frozenAge={holdT} />;
  }
  // 탐지 연출 동안 화면을 멈추고 배경을 흐리고 어둡게(10/9 초안 피드백) — 주인공(버튼 · 손 · 공구)은 선명하게 남긴다(시안 1 피드백)
  //   = 흐린 바탕 + 같은 정지 화면을 주인공 자리만 보이게 한 겹 더 · 들고 날 때 BLUR_RAMP 프레임에 걸쳐 · intro 없는 정지 = 그냥 멈춤
  const k = c.hold !== undefined && ((c.intro && BLURS.has(c.intro)) || c.card) ? Math.min(1, f / BLUR_RAMP, (p.frames - f) / BLUR_RAMP) : 0;
  const dim = c.card ? 0.62 : 0.5;  // 제목 카드는 더 어둡게(글이 주인공)
  const src = staticFile(`footage/${c.take}/${c.file}`);
  const vid = (style: React.CSSProperties) => (
    <OffthreadVideo src={src} trimBefore={Math.round(c.from * fps)} playbackRate={c.speed} muted={c.speed !== 1 || c.hold !== undefined}
      style={{position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", ...style}} />
  );
  // 버튼 정지 — 강조 차례가 온 버튼만 0.3초에 걸쳐 선명해진다(스캔 중에는 버튼도 배경처럼 흐림 · 시안 4 피드백)
  const bootSec = boot0 ? boot0.at + (boot0.runs ? f / fps : 0) : 0;
  const reveal = (name: string) => Math.max(0, Math.min(1, (btnIntroAge(name, bootSec) ?? -1) / 0.3));
  const holes = k > 0 && view && fit ? holesFor(c.intro, view, fit, reveal) : [];
  const mask = holes.length ? holeMask(holes, width, height) : null;
  const portrait = d ? d.dets.h > d.dets.w : false;   // 세로 촬영 = 양옆을 같은 화면의 흐린 확대로 채움
  const layers = (
    <>
      {portrait && vid({objectFit: "cover", filter: "blur(28px) brightness(0.45)"})}
      {vid({filter: k > 0 ? `blur(${(7 * k).toFixed(2)}px) brightness(${(1 - dim * k).toFixed(3)})` : undefined})}
      {mask && vid({maskImage: `url("${mask}")`, WebkitMaskImage: `url("${mask}")`, maskSize: "100% 100%", WebkitMaskSize: "100% 100%"})}
    </>
  );
  // ⑦ 탐지 확대 창(시안 10 「추천 외에 제안한 효과」) — 버튼 정지 = 강조 차례마다 그 버튼 하나씩 · 공구 정지 = 그 공구 · 다른 상자 · 단계 목록을 피한 자리
  let insets: React.ReactNode[] = [];
  if (view && fit && holdT !== null && (c.intro === "buttons" || c.intro === "tool")) {
    const R = (b: Box) => ({x: fit.x + b[2] * fit.s, y: fit.y + b[3] * fit.s, w: (b[4] - b[2]) * fit.s, h: (b[5] - b[3]) * fit.s});
    const one = (b: Box, age: number, dur: number, col: string, name: string) => {
      const r = R(b), zoom = Math.min(3, Math.max(1.3, (INSET * 0.85) / Math.max(r.w, r.h)));
      const spot = insetSpot(r, INSET + 34, [PANEL, ...view!.btn.filter((x) => x !== b).map(R)], width, height, 60);   // +34 = 아래 이름표 · 60 = 강조 고리 밖
      return <ZoomInset key={name} video={vid({})} box={b} fit={fit} spot={spot} zoom={zoom} col={col} name={name} age={age} dur={dur} W={width} H={height} />;
    };
    if (c.intro === "buttons") insets = BTN_ORDER.map((n, i) => {
      const b = view!.btn.find((x) => x[0] === n), age = btnIntroAge(n, bootSec);
      return b && age !== null ? one(b, age, i < BTN_ORDER.length - 1 ? BTN_STEP : BTN_INTRO_SEC + 0.3, BTN[n], n) : null;
    });
    else if (view.tool[0]) insets = [one(view.tool[0], holdT - 0.15, c.hold! - 0.15, C.current, TOOL_KO[view.tool[0][0]] ?? view.tool[0][0])];
  }
  const hit = impact !== null && impact >= 0 && impact < IMPACT ? 1 - impact / IMPACT : 0;
  const [sx, sy] = hit > 0 ? shake(impact!, 18, IMPACT) : [0, 0];
  const caId = `ca-hit-${p.start}`;
  const fade = c.fadeOut ? Math.min(1, (p.frames - f) / (c.fadeOut * fps)) : 1;   // 끝에서 검은 화면으로(검은 막을 위에 덮음 — 전체 투명도는 뒤 배경이 비침)
  return (
    <AbsoluteFill style={{background: "#000"}}>
      {hit > 0 && <ChromaFilter id={caId} dx={8 * hit} />}
      <AbsoluteFill style={hit > 0 ? {transform: `translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px) scale(${(1 + 0.03 * hit).toFixed(4)})`, filter: `url(#${caId})`} : undefined}>
        {c.hold !== undefined ? <Freeze frame={0}>{layers}</Freeze> : layers}
        {/* 제목 카드 중에도 HUD 를 그리고 배경과 함께 흐리게 · 어둡게(시안 3 피드백 「작업 단계 UI도 같이 배경과 흐려짐」·「제목이 나올 때부터 있는 게」) */}
        {c.card ? <div style={{position: "absolute", inset: 0, filter: `blur(${(7 * k).toFixed(2)}px) brightness(${(1 - dim * k).toFixed(3)})`}}>{hud}</div> : hud}
        {insets.length > 0 && <Freeze frame={0}>{insets}</Freeze>}   {/* 확대 창은 정지 구간에만 */}
        {c.callout && fit && <Callout def={c.callout} sec={sec} age={f / fps} fit={fit} />}
        {c.intro === "end" && <EndSummary age={holdT ?? 0} W={width} H={height} />}
      </AbsoluteFill>
      {fade < 1 && <div style={{position: "absolute", inset: 0, background: "#000", opacity: 1 - fade}} />}
      {hit > 0 && <div style={{position: "absolute", inset: 0, background: "#ff2a2a", opacity: 0.42 * Math.max(0, 1 - impact! / 0.25), pointerEvents: "none"}} />}
    </AbsoluteFill>
  );
};

// 장 · 절 제목 카드 + 길잡이 — 지금 구간이 제목 카드(card)면 그 카드를 구간 길이만큼 · 길잡이는 가장 최근 장 · 절 표시로 늘
const Chapters: React.FC<{ps: Placed[]}> = ({ps}) => {
  const f = useCurrentFrame();
  const {fps, height} = useVideoConfig();
  const ch = ps.filter((p) => p.clip.chapter && p.start <= f).pop();
  const sc = ps.filter((p) => p.clip.section && p.start <= f).pop();
  if (!ch?.clip.chapter) return null;
  const sec = sc && sc.start >= ch.start ? sc.clip.section! : null;
  const cur = ps.find((p) => p.start <= f && f < p.start + p.frames);
  const age = cur ? (f - cur.start) / fps : 0, dur = cur ? cur.frames / fps : 0;
  return (
    <>
      {cur?.clip.card === "chapter" && cur.clip.chapter && <ChapterTitle ch={cur.clip.chapter} age={age} dur={dur} H={height} />}
      {cur?.clip.card === "section" && cur.clip.section && <SectionTitle sec={cur.clip.section} age={age} dur={dur} H={height} />}
      {!cur?.clip.card && <Breadcrumb ch={ch.clip.chapter} sec={sec} />}
    </>
  );
};

export const Cut: React.FC<CutProps> = ({edit, data}) => {
  const f = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  if (!data) return null;
  const ps = place(EDITS[edit], 30);
  const bt = bootTimes(ps, 30);
  const ba = burstAge(ps, f, fps, BURST);   // 장 제목 카드 첫 0.3초 — 화면 전체 색 번짐 + 픽셀 조각(제목 글자는 그 위)
  return (
    <AbsoluteFill>
      {ba !== null && <ChromaFilter id="ca-burst" dx={BURST_CA * (1 - ba / BURST)} />}
      <AbsoluteFill style={ba !== null ? {filter: "url(#ca-burst)"} : undefined}>
        {ps.map((p, i) => (
          <Sequence key={i} from={p.start} durationInFrames={p.frames}>
            <ClipView p={p} d={data[keyOf(p.clip)]} boot0={bt[i]} synth={SYNTH[edit]} ps={ps} i={i}
            trailFrom={ps[i - 1]?.clip.tip && keyOf(ps[i - 1].clip) === keyOf(p.clip) ? null : p.clip.from} />
          </Sequence>
        ))}
      </AbsoluteFill>
      {ba !== null && <PixelBurst age={ba} win={BURST} W={width} H={height} />}
      <Chapters ps={ps} />
      {edit === "skeleton" && (
        <div style={{position: "absolute", left: 40, bottom: 20, color: "#fff", font: "600 20px Pretendard", background: "rgba(0,0,0,.6)", padding: "4px 10px", borderRadius: 6}}>
          제작 흐름 뼈대 시험 · 10/8 영상 + 10/9 견본 기록(짝 아님)
        </div>
      )}
    </AbsoluteFill>
  );
};
