import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { Title } from "./scenes/Title";
import { StepBrowse } from "./scenes/StepBrowse";
import { StepClick } from "./scenes/StepClick";
import { StepPreview } from "./scenes/StepPreview";
import { StepDownload } from "./scenes/StepDownload";
import { Outro } from "./scenes/Outro";

const TRANSITION_FRAMES = 15;

export const Tutorial = () => {
  return (
    <TransitionSeries>
      {/* Scene 1: Title */}
      <TransitionSeries.Sequence durationInFrames={120}>
        <Title />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
      />

      {/* Scene 2: Open webpage */}
      <TransitionSeries.Sequence durationInFrames={120}>
        <StepBrowse />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
      />

      {/* Scene 3: Click extension */}
      <TransitionSeries.Sequence durationInFrames={120}>
        <StepClick />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
      />

      {/* Scene 4: Preview Markdown */}
      <TransitionSeries.Sequence durationInFrames={150}>
        <StepPreview />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
      />

      {/* Scene 5: Download */}
      <TransitionSeries.Sequence durationInFrames={150}>
        <StepDownload />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
      />

      {/* Scene 6: Outro */}
      <TransitionSeries.Sequence durationInFrames={100}>
        <Outro />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
};
