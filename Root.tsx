import { Composition, getInputProps } from "remotion";
import { MainTimeline } from "./MainTimeline";

interface VideoProps {
  meta?: { totalFrames?: number; fps?: number; themeColor?: string; hostCharacter?: string };
  timeline?: unknown[];
}

export const Root = () => {
  // Pull the enriched props compiled by the Python script
  const props = getInputProps() as VideoProps;
  
  // Default fallbacks if compiling headlessly without props during development
  const totalFrames = props.meta?.totalFrames || 300;
  const fps = props.meta?.fps || 30;

  return (
    <Composition
      id="EducationalVideo"
      component={MainTimeline}
      durationInFrames={totalFrames}
      fps={fps}
      width={1920}
      height={1080}
      defaultProps={props}
    />
  );
};