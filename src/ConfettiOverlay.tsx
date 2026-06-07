import React, { useMemo } from 'react';
import { useCurrentFrame, interpolate, random } from 'remotion';

export const ConfettiOverlay = () => {
  const frame = useCurrentFrame();

  const particles = useMemo(() => {
    return Array.from({ length: 150 }).map((_, i) => {
      const startX = random(`x-${i}`) * 100; // percentage
      const startY = -10; // start above screen
      const endY = 110; // fall past bottom
      const speed = 0.5 + random(`speed-${i}`) * 1.5;
      const delay = random(`delay-${i}`) * 30; // random delay up to 30 frames
      const color = ['#FF4136', '#2ECC40', '#0074D9', '#FFDC00', '#F012BE', '#7FDBFF'][
        Math.floor(random(`color-${i}`) * 6)
      ];
      const rotationSpeed = random(`rot-${i}`) * 15 - 7.5;
      return { startX, startY, endY, speed, delay, color, rotationSpeed };
    });
  }, []);

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 100,
        overflow: 'hidden',
      }}
    >
      {particles.map((p, i) => {
        const progressFrame = Math.max(0, frame - p.delay);
        const y = interpolate(progressFrame, [0, 90 / p.speed], [p.startY, p.endY], {
          extrapolateRight: 'clamp',
        });
        const rotation = progressFrame * p.rotationSpeed;

        if (progressFrame === 0 || y >= p.endY) return null;

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${p.startX}%`,
              top: `${y}%`,
              width: 15,
              height: 15,
              backgroundColor: p.color,
              transform: `rotate(${rotation}deg)`,
              borderRadius: '2px',
            }}
          />
        );
      })}
    </div>
  );
};
