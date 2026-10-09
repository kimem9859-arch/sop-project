import {AbsoluteFill, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig, type CalculateMetadataFunction} from "remotion";
import {BOOT_SEC} from "../lib/boot.ts";
import {detAt, firstHandAt, fitRect, type Dets} from "../lib/dets.ts";
import {place, srcSec, totalFrames, type Clip, type Placed} from "../lib/edit.ts";
import type {Ev} from "../lib/timeline.ts";
import {stagedRun} from "../lib/staged.ts";
import {stateAt} from "../lib/uiState.ts";
import {Hud} from "../hud/Hud.tsx";
import {SKELETON} from "../edits/skeleton.ts";
import {PRETEST, PRETEST_STAGED, PRETEST_SYNTH} from "../edits/pretest.ts";

// 촬영마다 — 검출 · 기록 시간표 · 시각 맞춤(영상 0초의 기록 시각) · 손 첫 등장(본편 첫 오버레이 구간 뒤)
type TakeData = {dets: Dets; tl: {runStart: number; events: Ev[]}; offsetMs: number; firstHand: number | null};
const EDITS: Record<string, Clip[]> = {skeleton: SKELETON, pretest: PRETEST};
// 측정 기록 없이 찍은 촬영 = 연출 기록(lib/staged)으로 대신 · 그 편집은 「합성」 표기도 바꿔 단다
const STAGED = {...PRETEST_STAGED};
const SYNTH: Record<string, string> = {pretest: PRETEST_SYNTH};
export type CutProps = {edit: string; data: Record<string, TakeData> | null};

export const calcCut: CalculateMetadataFunction<CutProps> = async ({props}) => {
  const clips = EDITS[props.edit];
  const data: Record<string, TakeData> = {};
  for (const take of new Set(clips.filter((c) => c.overlay).map((c) => c.take))) {
    const j = (f: string) => fetch(staticFile(`footage/${take}/${f}`)).then((r) => r.json());
    const st = STAGED[take];
    const [dets, tl, sy] = st ? [await j("dets.json"), stagedRun(st.start, st.presses), {offsetMs: 0}]
      : await Promise.all([j("dets.json"), j("timeline.json"), j("sync.json")]);
    const from = Math.min(...clips.filter((c) => c.overlay && c.take === take).map((c) => c.from));
    data[take] = {dets, tl, offsetMs: sy.offsetMs, firstHand: firstHandAt(dets, from)};
  }
  return {props: {...props, data}, durationInFrames: totalFrames(place(clips, 30))};
};

const ClipView: React.FC<{p: Placed; d: TakeData | undefined; bootStart: number | null; synth?: string}> = ({p, d, bootStart, synth}) => {
  const f = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const c = p.clip;
  const sec = srcSec(c, f, fps);
  const fadeIn = Math.min(1, f / 10), fadeOut = Math.min(1, (p.frames - f) / 10);
  let hud = null;
  if (c.overlay && d) {
    const tMs = d.offsetMs + sec * 1000;
    const view = detAt(d.dets, sec);
    const boot = bootStart === null ? 1 : Math.max(0, Math.min(1, (p.start + f - bootStart) / (BOOT_SEC * fps)));
    // 손 등장 연출은 본편 첫 등장 한 번만(G3) — 그 뒤로는 다 그려진 뼈대(큰 값)
    const handAge = !view.hand ? null : d.firstHand !== null && sec >= d.firstHand ? sec - d.firstHand : 10;
    hud = <Hud ui={stateAt(d.tl.events, d.tl.runStart, tMs)} view={view} fit={fitRect(d.dets.w, d.dets.h, width, height)}
      t={sec} tMs={tMs} boot={boot} handAge={handAge} W={width} H={height} caption={c.caption}
      captionOpacity={Math.min(fadeIn, fadeOut)} badge={c.badge} synth={synth} />;
  }
  return (
    <AbsoluteFill style={{background: "#000"}}>
      <OffthreadVideo src={staticFile(`footage/${c.take}/${c.file}`)} trimBefore={Math.round(c.from * fps)}
        playbackRate={c.speed} muted={c.speed !== 1} style={{width: "100%", height: "100%", objectFit: "contain"}} />
      {hud}
    </AbsoluteFill>
  );
};

export const Cut: React.FC<CutProps> = ({edit, data}) => {
  if (!data) return null;
  const ps = place(EDITS[edit], 30);
  const bootStart = ps.find((p) => p.clip.boot)?.start ?? null;
  return (
    <AbsoluteFill>
      {ps.map((p, i) => (
        <Sequence key={i} from={p.start} durationInFrames={p.frames}>
          <ClipView p={p} d={data[p.clip.take]} bootStart={bootStart} synth={SYNTH[edit]} />
        </Sequence>
      ))}
      {edit === "skeleton" && (
        <div style={{position: "absolute", left: 40, bottom: 20, color: "#fff", font: "600 20px Pretendard", background: "rgba(0,0,0,.6)", padding: "4px 10px", borderRadius: 6}}>
          제작 흐름 뼈대 시험 · 10/8 영상 + 10/9 견본 기록(짝 아님)
        </div>
      )}
    </AbsoluteFill>
  );
};
