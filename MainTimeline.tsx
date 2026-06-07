import React from "react";
import { Sequence, Audio, staticFile } from "remotion";
import { Scene3DCanvas } from "./Scene3DCanvas";

export const MainTimeline = ({ timeline }: any) => {
  if (!timeline) return null;

  return (
    <div style={{ flex: 1, backgroundColor: "#000" }}>
      {timeline.map((scene: any) => {
        // GRACEFUL DEGRADATION If the scene has 0 frames due to an audio error,
        // Remotion will safely skip rendering it entirely! 🛡️
        if (scene.durationInFrames === 0) return null;

        return (
          <Sequence
            key={scene.stepId}
            from={scene.startFrame}
            durationInFrames={scene.durationInFrames}
          >
            <Audio src={staticFile(scene.audioFile)} />
            <Scene3DCanvas sceneData={scene} />
          </Sequence>
        );
      })}
    </div>
  );
};