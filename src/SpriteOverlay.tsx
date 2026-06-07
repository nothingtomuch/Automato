import React from "react";
import { useCurrentFrame, interpolate, Img, staticFile } from "remotion";

export const SpriteOverlay = ({ sprites }: { sprites: any[] }) => {
  const frame = useCurrentFrame();

  if (!sprites || sprites.length === 0) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 10,
      }}
    >
      {sprites.map((sprite) => {
        const keyframes = [...sprite.keyframes].sort((a, b) => a.frame - b.frame);
        if (keyframes.length === 0) return null;

        const inputFrames = keyframes.map((kf) => kf.frame);

        // Helper to interpolate safely, handling a single keyframe by repeating its value
        const safeInterpolate = (prop: string, defaultVal: number) => {
          const values = keyframes.map((kf) => (kf[prop] !== undefined ? kf[prop] : defaultVal));
          if (values.length === 1) return values[0];
          return interpolate(frame, inputFrames, values, {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
        };

        const x = safeInterpolate("x", 0);
        const y = safeInterpolate("y", 0);
        const rotation = safeInterpolate("rotation", 0);
        const scale = safeInterpolate("scale", 1);
        const opacity = safeInterpolate("opacity", 1);

        return (
          <Img
            key={sprite.id}
            src={staticFile(sprite.src)}
            style={{
              position: "absolute",
              left: `${x}px`,
              top: `${y}px`,
              width: "300px",
              height: "300px",
              objectFit: "contain",
              opacity,
              transform: `translate(-50%, -50%) rotate(${rotation}deg) scale(${scale})`,
              transformOrigin: "center center",
            }}
          />
        );
      })}
    </div>
  );
};
