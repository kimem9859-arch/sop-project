import {Composition} from "remotion";
import {Skeleton, calcSkeleton} from "./compositions/Skeleton.tsx";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Skeleton" component={Skeleton} calculateMetadata={calcSkeleton}
      durationInFrames={30} fps={30} width={1920} height={1080}
      defaultProps={{take: "20261008_phoneA", video: "original.mp4", dets: null}} />
  </>
);
