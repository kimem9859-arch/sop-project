import {Composition} from "remotion";
import "./hud/fonts.ts";
import {Skeleton, calcSkeleton} from "./compositions/Skeleton.tsx";
import {UiDraft, calcUiDraft} from "./compositions/UiDraft.tsx";
import {Cut, calcCut} from "./compositions/Cut.tsx";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Skeleton" component={Skeleton} calculateMetadata={calcSkeleton}
      durationInFrames={30} fps={30} width={1920} height={1080}
      defaultProps={{take: "20261008_phoneA", video: "original.mp4", dets: null}} />
    <Composition id="UiDraft" component={UiDraft} calculateMetadata={calcUiDraft}
      durationInFrames={30} fps={30} width={1920} height={1080}
      defaultProps={{take: "20261008_phoneB_land34", video: "proxy.mp4", videoSec: 6.33, tls: null, dets: null}} />
    <Composition id="Cut" component={Cut} calculateMetadata={calcCut}
      durationInFrames={30} fps={30} width={1920} height={1080}
      defaultProps={{edit: "skeleton", data: null}} />
  </>
);
