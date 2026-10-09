import {AbsoluteFill, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig, type CalculateMetadataFunction} from "remotion";
import {detAt, fitRect, type Dets} from "../lib/dets.ts";
import type {Ev} from "../lib/timeline.ts";
import {stateAt} from "../lib/uiState.ts";
import {Hud} from "../hud/Hud.tsx";

// 🔴 시안 전용 — 바탕 영상(10/8 가로 흉내)과 상태(10/9 Task 9 시험 세션 기록)는 짝이 아니다 · 화면에 표기한다
type TL = {runStart: number; events: Ev[]};
export type UiDraftProps = {take: string; video: string; videoSec: number; tls: TL[] | null; dets: Dets | null};
type Moment = {label: string; run: number; tMs: number; boot?: boolean; freeze?: boolean; extra?: Ev[]; caption?: string; badge?: string};

const MOMENTS: Moment[] = [
  {label: "HUD 켜짐", run: 0, tMs: 250011525.954, boot: true, caption: "화면 표시는 실제 시스템 기록을 바탕으로 다시 그린 합성입니다"},
  {label: "B1 누름", run: 0, tMs: 250014400, caption: "AI 가 버튼과 손을 알아보고 순서를 확인합니다"},
  {label: "대기 진행", run: 0, tMs: 250019570, badge: "×4"},
  {label: "공구 확인 중", run: 0, tMs: 250033600, caption: "필요한 공구를 쥐었는지도 확인합니다"},
  {label: "공구 쥠", run: 0, tMs: 250035600},
  // 판 2 는 MONITOR(250059997.393) → B3 누름(250060263.675) → BLOCK 이라 경고가 없다 — 그 사이에 시안용 WARNING 을 넣고 시각을 멈춘다
  {label: "경고(시안용 사건)", run: 1, tMs: 250060250, freeze: true,
    extra: [{t: 250059998, kind: "state", d: {new: "WARNING", expected: "B1", dwell_roi: "B3"}, src: "main"}],
    caption: "누르기 전에 경고하고, 그래도 누르면 막습니다", badge: "0.5×"},
  {label: "차단", run: 1, tMs: 250060280, badge: "0.5×"},
  {label: "질문·답", run: 2, tMs: 250136700, caption: "손을 쓰지 않고 물어볼 수 있습니다"},
];
const PER = 60;

export const calcUiDraft: CalculateMetadataFunction<UiDraftProps> = async ({props}) => {
  const dets: Dets = await fetch(staticFile(`footage/${props.take}/dets.json`)).then((r) => r.json());
  const tls: TL[] = await Promise.all([1, 2, 3].map((n) => fetch(staticFile(`samples/154014_r${n}.json`)).then((r) => r.json())));
  return {props: {...props, dets, tls}, durationInFrames: MOMENTS.length * PER};
};

const MomentView: React.FC<{m: Moment; tl: TL; dets: Dets; take: string; video: string; videoSec: number}> = ({m, tl, dets, take, video, videoSec}) => {
  const f = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const sec = videoSec + f / fps;
  const tMs = m.tMs + (m.boot || m.freeze ? 0 : (f / fps) * 1000);
  const evs = m.extra ? [...tl.events, ...m.extra].sort((a, b) => a.t - b.t) : tl.events;
  const ui = stateAt(evs, tl.runStart, tMs);
  return (
    <AbsoluteFill style={{background: "#000"}}>
      <OffthreadVideo src={staticFile(`footage/${take}/${video}`)} muted trimBefore={Math.round(videoSec * fps)}
        style={{width: "100%", height: "100%", objectFit: "contain"}} />
      <Hud ui={ui} view={detAt(dets, sec)} fit={fitRect(dets.w, dets.h, width, height)} t={sec} tMs={tMs}
        boot={m.boot ? f / PER : 1} handGrow={1} W={width} H={height} caption={m.caption} badge={m.badge} />
      <div style={{position: "absolute", left: 40, bottom: 20, color: "#fff", font: "600 20px Pretendard", background: "rgba(0,0,0,.6)", padding: "4px 10px", borderRadius: 6}}>
        {`UI 시안 · 영상과 기록 짝 아님 · ${m.label}`}
      </div>
    </AbsoluteFill>
  );
};

export const UiDraft: React.FC<UiDraftProps> = ({take, video, videoSec, tls, dets}) =>
  tls && dets ? (
    <AbsoluteFill>
      {MOMENTS.map((m, i) => (
        <Sequence key={m.label} from={i * PER} durationInFrames={PER}>
          <MomentView m={m} tl={tls[m.run]} dets={dets} take={take} video={video} videoSec={videoSec} />
        </Sequence>
      ))}
    </AbsoluteFill>
  ) : null;
