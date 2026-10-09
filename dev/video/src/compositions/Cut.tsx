import {AbsoluteFill, Freeze, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig, type CalculateMetadataFunction} from "remotion";
import {BOOT_SEC} from "../lib/boot.ts";
import {detAt, firstHandAt, fitRect, lastBox, type Dets} from "../lib/dets.ts";
import {place, srcSec, totalFrames, type Clip, type Placed} from "../lib/edit.ts";
import type {Ev} from "../lib/timeline.ts";
import {stagedRun} from "../lib/staged.ts";
import {stateAt} from "../lib/uiState.ts";
import {Hud} from "../hud/Hud.tsx";
import {SKELETON} from "../edits/skeleton.ts";
import {PRETEST, PRETEST_STAGED, PRETEST_SYNTH} from "../edits/pretest.ts";

// 촬영마다 — 검출 · 기록 시간표 · 시각 맞춤(영상 0초의 기록 시각) · 손 첫 등장(본편 첫 오버레이 구간 뒤)
// handIntro = 편집표의 손 탐지 정지 구간 원본 초(있으면 그 전엔 손 뼈대를 숨기고 그때 연출 — 10/9 초안 피드백 「2~3초 여유」)
type TakeData = {dets: Dets; tl: {runStart: number; events: Ev[]}; offsetMs: number; firstHand: number | null; handIntro: number | null};
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
    const hi = clips.find((c) => c.take === take && c.intro === "hand");
    data[take] = {dets, tl, offsetMs: sy.offsetMs, firstHand: firstHandAt(dets, from), handIntro: hi ? hi.from : null};
  }
  return {props: {...props, data}, durationInFrames: totalFrames(place(clips, 30))};
};

const BLUR_RAMP = 6; // 정지 구간 들고 날 때 흐림이 차오르는 프레임

const ClipView: React.FC<{p: Placed; d: TakeData | undefined; bootStart: number | null; synth?: string}> = ({p, d, bootStart, synth}) => {
  const f = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const c = p.clip;
  const sec = srcSec(c, f, fps);
  const holdT = c.hold !== undefined ? f / fps : null;  // 정지 구간 안 경과 초(연출 시계)
  const fadeIn = Math.min(1, f / 10), fadeOut = Math.min(1, (p.frames - f) / 10);
  let hud = null;
  if (c.overlay && d) {
    const tMs = d.offsetMs + sec * 1000;
    const view = detAt(d.dets, sec);
    const boot = bootStart === null ? 1 : Math.max(0, Math.min(1, (p.start + f - bootStart) / (BOOT_SEC * fps)));
    // 손 탐지 연출 — 편집표에 손 정지 구간이 있으면 그 구간에서만(그 전엔 숨김) · 없으면 본편 첫 등장 한 번(G3)
    const handAge = !view.hand ? null
      : d.handIntro !== null ? (c.intro === "hand" ? holdT : sec > d.handIntro || (sec === d.handIntro && c.hold === undefined) ? 10 : null)
      : d.firstHand !== null && sec >= d.firstHand ? sec - d.firstHand : 10;
    const ui = stateAt(d.tl.events, d.tl.runStart, tMs);
    const lp = ui.lastPress && tMs - ui.lastPress.t < 1000 ? ui.lastPress.button : null;
    const pressAt = lp && !view.btn.some((b) => b[0] === lp) ? lastBox(d.dets, sec, lp, 1) : null;
    hud = <Hud ui={ui} pressAt={pressAt} view={view} fit={fitRect(d.dets.w, d.dets.h, width, height)}
      t={(p.start + f) / fps} tMs={tMs} boot={boot} handAge={handAge} W={width} H={height} caption={c.caption}
      captionOpacity={Math.min(fadeIn, fadeOut)} badge={c.badge} synth={synth} />;
  }
  // 탐지 연출 동안 화면을 멈추고 배경을 흐리고 어둡게(10/9 초안 피드백) — 들고 날 때 BLUR_RAMP 프레임에 걸쳐
  const k = c.hold !== undefined ? Math.min(1, f / BLUR_RAMP, (p.frames - f) / BLUR_RAMP) : 0;
  const video = (
    <OffthreadVideo src={staticFile(`footage/${c.take}/${c.file}`)} trimBefore={Math.round(c.from * fps)}
      playbackRate={c.speed} muted={c.speed !== 1 || c.hold !== undefined}
      style={{width: "100%", height: "100%", objectFit: "contain", filter: k > 0 ? `blur(${(7 * k).toFixed(2)}px) brightness(${(1 - 0.5 * k).toFixed(3)})` : undefined}} />
  );
  return (
    <AbsoluteFill style={{background: "#000"}}>
      {c.hold !== undefined ? <Freeze frame={0}>{video}</Freeze> : video}
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
