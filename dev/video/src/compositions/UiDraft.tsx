import {AbsoluteFill, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig, type CalculateMetadataFunction} from "remotion";
import {detAt, firstHandAt, fitRect, type Dets} from "../lib/dets.ts";
import type {Ev} from "../lib/timeline.ts";
import {stateAt} from "../lib/uiState.ts";
import {Hud} from "../hud/Hud.tsx";
import {BOOT_SEC} from "../lib/boot.ts";

// 🔴 시안 전용 — 바탕 영상(10/8 가로 흉내)과 상태(10/9 Task 9 시험 세션 기록)는 짝이 아니다 · 화면에 표기한다
type TL = {runStart: number; events: Ev[]};
export type UiDraftProps = {take: string; video: string; videoSec: number; tls: TL[] | null; dets: Dets | null};
// vSec = 이 순간의 바탕 영상 시작(초 · 없으면 props.videoSec) · len = 프레임 수(없으면 PER)
// intro = 손 첫 등장 연출을 보이는 순간(본편에서는 처음 한 번만 — 다른 순간은 다 그려진 뼈대)
type Moment = {label: string; run: number; tMs: number; vSec?: number; len?: number; boot?: boolean; intro?: boolean; freeze?: boolean; extra?: Ev[]; caption?: string; badge?: string};

const MOMENTS: Moment[] = [
  // 켜짐 = 손이 없는 3초(B 가로 띠 3.17초~) · 손 등장 = 손이 처음 들어오는 6.2초 직전부터
  {label: "HUD 켜짐", run: 0, tMs: 250011525.954, vSec: 3.17, len: BOOT_SEC * 30, boot: true, caption: "화면 표시는 실제 시스템 기록을 바탕으로 다시 그린 합성입니다"},
  {label: "손 등장", run: 0, tMs: 250013000, vSec: 5.7, len: 90, intro: true, caption: "AI 가 버튼과 손을 알아보고 순서를 확인합니다"},
  {label: "B1 누름", run: 0, tMs: 250014400},
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
  return {props: {...props, dets, tls}, durationInFrames: MOMENTS.reduce((s, m) => s + (m.len ?? PER), 0)};
};

const MomentView: React.FC<{m: Moment; tl: TL; dets: Dets; take: string; video: string; videoSec: number}> = ({m, tl, dets, take, video, videoSec}) => {
  const f = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const v0 = m.vSec ?? videoSec;
  const sec = v0 + f / fps;
  const len = m.len ?? PER;
  const tMs = m.tMs + (m.boot || m.freeze ? 0 : (f / fps) * 1000);
  const evs = m.extra ? [...tl.events, ...m.extra].sort((a, b) => a.t - b.t) : tl.events;
  const ui = stateAt(evs, tl.runStart, tMs);
  const view = detAt(dets, sec);
  const first = m.intro ? firstHandAt(dets, v0) : null;
  const handAge = !view.hand ? null : m.intro && first !== null ? Math.max(0, sec - first) : 10;
  return (
    <AbsoluteFill style={{background: "#000"}}>
      <OffthreadVideo src={staticFile(`footage/${take}/${video}`)} muted trimBefore={Math.round(v0 * fps)}
        style={{width: "100%", height: "100%", objectFit: "contain"}} />
      <Hud ui={ui} view={view} fit={fitRect(dets.w, dets.h, width, height)} t={sec} tMs={tMs}
        boot={m.boot ? f / len : 1} handAge={handAge} W={width} H={height} caption={m.caption} badge={m.badge} />
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
        <Sequence key={m.label} from={MOMENTS.slice(0, i).reduce((s, x) => s + (x.len ?? PER), 0)} durationInFrames={m.len ?? PER}>
          <MomentView m={m} tl={tls[m.run]} dets={dets} take={take} video={video} videoSec={videoSec} />
        </Sequence>
      ))}
    </AbsoluteFill>
  ) : null;
