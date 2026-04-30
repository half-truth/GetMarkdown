import { Composition } from "remotion";
import { Tutorial } from "./Tutorial";

// 6 scenes: 120+120+120+150+150+100 = 760 frames - 75 transition overlap = 685 frames
// ~22.8 seconds at 30fps

export const RemotionRoot = () => {
  return (
    <Composition
      id="Tutorial"
      component={Tutorial}
      durationInFrames={685}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};
