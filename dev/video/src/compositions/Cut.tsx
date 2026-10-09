import {AbsoluteFill, Freeze, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig, type CalculateMetadataFunction} from "remotion";
import {BOOT_SEC} from "../lib/boot.ts";
import {detAt, firstHandAt, fitRect, lastBox, type Dets} from "../lib/dets.ts";
import {bootTimes, place, srcSec, totalFrames, type Clip, type Placed} from "../lib/edit.ts";
import {dwellAt} from "../lib/judge.ts";
import {holeMask, holesFor} from "../lib/mask.ts";
import type {Ev} from "../lib/timeline.ts";
import {stagedRun, type StagedEv, type StagedPress} from "../lib/staged.ts";
import {stateAt} from "../lib/uiState.ts";
import {Callout} from "../hud/Callout.tsx";
import {Breadcrumb, ChapterTitle, SectionTitle} from "../hud/ChapterTitle.tsx";
import {EndSummary} from "../hud/EndSummary.tsx";
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

// boot0 = 이 구간 시작의 켜짐 초와 흐름 여부(lib/edit bootTimes — 제목 카드 동안 멈춤) · null = 켜짐 전
const ClipView: React.FC<{p: Placed; d: TakeData | undefined; boot0: {at: number; runs: boolean} | null; synth?: string}> = ({p, d, boot0, synth}) => {
  const f = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const c = p.clip;
  const sec = srcSec(c, f, fps);
  const holdT = c.hold !== undefined ? f / fps : null;  // 정지 구간 안 경과 초(연출 시계)
  const fadeIn = Math.min(1, f / 10), fadeOut = Math.min(1, (p.frames - f) / 10);
  const fit = d ? fitRect(d.dets.w, d.dets.h, width, height) : null;
  let hud = null;
  let view = d ? detAt(d.dets, sec) : null;
  if (c.overlay && d && view && fit && c.intro !== "end" && !c.card) {
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
    hud = <Hud ui={ui} pressAt={pressAt} dwell={dwellAt(d.tl.events, d.tl.runStart, tMs)} view={view} fit={fit}
      t={(p.start + f) / fps} tMs={tMs} boot={boot} handAge={handAge} W={width} H={height} caption={c.caption}
      captionOpacity={Math.min(fadeIn, fadeOut)} badge={c.badge} synth={synth}
      toolIntro={c.intro === "tool" ? holdT : null} overlap={c.intro === "overlap" ? holdT : null} frozenAge={holdT} />;
  }
  // 탐지 연출 동안 화면을 멈추고 배경을 흐리고 어둡게(10/9 초안 피드백) — 주인공(버튼 · 손 · 공구)은 선명하게 남긴다(시안 1 피드백)
  //   = 흐린 바탕 + 같은 정지 화면을 주인공 자리만 보이게 한 겹 더 · 들고 날 때 BLUR_RAMP 프레임에 걸쳐 · intro 없는 정지 = 그냥 멈춤
  const k = c.hold !== undefined && (c.intro || c.card) ? Math.min(1, f / BLUR_RAMP, (p.frames - f) / BLUR_RAMP) : 0;
  const dim = c.card ? 0.62 : 0.5;  // 제목 카드는 더 어둡게(글이 주인공)
  const src = staticFile(`footage/${c.take}/${c.file}`);
  const vid = (style: React.CSSProperties) => (
    <OffthreadVideo src={src} trimBefore={Math.round(c.from * fps)} playbackRate={c.speed} muted={c.speed !== 1 || c.hold !== undefined}
      style={{position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", ...style}} />
  );
  const holes = k > 0 && view && fit ? holesFor(c.intro, view, fit) : [];
  const mask = holes.length ? holeMask(holes, width, height) : null;
  const portrait = d ? d.dets.h > d.dets.w : false;   // 세로 촬영 = 양옆을 같은 화면의 흐린 확대로 채움
  const layers = (
    <>
      {portrait && vid({objectFit: "cover", filter: "blur(28px) brightness(0.45)"})}
      {vid({filter: k > 0 ? `blur(${(7 * k).toFixed(2)}px) brightness(${(1 - dim * k).toFixed(3)})` : undefined})}
      {mask && vid({maskImage: `url("${mask}")`, WebkitMaskImage: `url("${mask}")`, maskSize: "100% 100%", WebkitMaskSize: "100% 100%"})}
    </>
  );
  return (
    <AbsoluteFill style={{background: "#000"}}>
      {c.hold !== undefined ? <Freeze frame={0}>{layers}</Freeze> : layers}
      {hud}
      {c.callout && fit && <Callout def={c.callout} sec={sec} age={f / fps} fit={fit} />}
      {c.intro === "end" && <EndSummary age={holdT ?? 0} W={width} H={height} />}
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
  if (!data) return null;
  const ps = place(EDITS[edit], 30);
  const bt = bootTimes(ps, 30);
  return (
    <AbsoluteFill>
      {ps.map((p, i) => (
        <Sequence key={i} from={p.start} durationInFrames={p.frames}>
          <ClipView p={p} d={data[keyOf(p.clip)]} boot0={bt[i]} synth={SYNTH[edit]} />
        </Sequence>
      ))}
      <Chapters ps={ps} />
      {edit === "skeleton" && (
        <div style={{position: "absolute", left: 40, bottom: 20, color: "#fff", font: "600 20px Pretendard", background: "rgba(0,0,0,.6)", padding: "4px 10px", borderRadius: 6}}>
          제작 흐름 뼈대 시험 · 10/8 영상 + 10/9 견본 기록(짝 아님)
        </div>
      )}
    </AbsoluteFill>
  );
};
