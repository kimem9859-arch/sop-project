import {AbsoluteFill, OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig, type CalculateMetadataFunction} from "remotion";
import {detAt, fitRect, type Dets} from "../lib/dets.ts";
import {ButtonBoxes} from "../hud/ButtonBoxes.tsx";
import {HandSkeleton} from "../hud/HandSkeleton.tsx";

export type SkeletonProps = {take: string; video: string; dets: Dets | null};

export const calcSkeleton: CalculateMetadataFunction<SkeletonProps> = async ({props}) => {
  const dets: Dets = await fetch(staticFile(`footage/${props.take}/dets.json`)).then((r) => r.json());
  return {props: {...props, dets}, durationInFrames: Math.max(1, Math.floor((dets.rows.length / dets.fps) * 30))};
};

// G1 확인용 — 원본 위에 재검출 박스·손을 그대로 얹는다(연출 없음)
export const Skeleton: React.FC<SkeletonProps> = ({take, video, dets}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  if (!dets) return null;
  const sec = frame / fps;
  const v = detAt(dets, sec);
  const fit = fitRect(dets.w, dets.h, width, height);
  return (
    <AbsoluteFill style={{background: "#000"}}>
      <OffthreadVideo src={staticFile(`footage/${take}/${video}`)} muted style={{width: "100%", height: "100%", objectFit: "contain"}} />
      <ButtonBoxes boxes={v.btn} fit={fit} t={sec} />
      <ButtonBoxes boxes={v.tool} fit={fit} t={sec} tool />
      <HandSkeleton hand={v.hand} fit={fit} t={sec} age={v.hand ? 10 : null} />{/* G1 확인용 — 등장 연출 없이 늘 다 보인다 */}
      <div style={{position: "absolute", left: 20, top: 16, color: "#fff", font: "24px monospace", textShadow: "0 0 4px #000"}}>
        {`${take} · ${sec.toFixed(2)}s · 버튼 ${v.btn.length} · 공구 ${v.tool.length} · 손 ${v.hand ? "O" : "-"}`}
      </div>
    </AbsoluteFill>
  );
};
