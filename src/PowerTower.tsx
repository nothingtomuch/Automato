import React from 'react';

interface CubeData {
  label: string;
  desc?: string;
  color?: string;
}

interface PowerTowerProps {
  blocks: CubeData[];
  width: number;
  height: number;
}

const PALETTE = [
  { face: '#2979ff', top: '#5e9eff', shadow: '#0d47a1', glow: '#2979ffaa' },
  { face: '#00c853', top: '#69f0ae', shadow: '#1b5e20', glow: '#00c853aa' },
  { face: '#ff6d00', top: '#ffa040', shadow: '#bf360c', glow: '#ff6d00aa' },
  { face: '#aa00ff', top: '#d068ff', shadow: '#4a148c', glow: '#aa00ffaa' },
  { face: '#d50000', top: '#ff6e6e', shadow: '#7f0000', glow: '#d50000aa' },
  { face: '#00b8d4', top: '#69efff', shadow: '#006064', glow: '#00b8d4aa' },
];

function parseSuperscript(text: string): React.ReactNode {
  // e.g. "2^3" -> 2<sup>3</sup>
  const parts = text.split('^');
  if (parts.length === 2) {
    return <>{parts[0]}<sup style={{ fontSize: '0.55em', verticalAlign: 'super', lineHeight: 0 }}>{parts[1]}</sup></>;
  }
  return text;
}

const Cube: React.FC<{
  data: CubeData;
  index: number;
  total: number;
  cubeSize: number;
  depth: number;
}> = ({ data, index, total, cubeSize, depth }) => {
  const palette = PALETTE[index % PALETTE.length];
  const face = data.color || palette.face;
  const top = palette.top;
  const shadow = palette.shadow;
  const glow = palette.glow;

  const tiltX = 20; // degrees tilt for isometric feel
  const tiltZ = -5;

  return (
    <div style={{
      position: 'relative',
      width: cubeSize,
      height: cubeSize,
      marginTop: index === 0 ? 0 : -cubeSize * 0.18,
      flexShrink: 0,
      transform: `scale(${1 - index * 0.04})`,
      transformOrigin: 'bottom center',
      zIndex: total - index,
      filter: `drop-shadow(0 ${8 + index * 4}px ${20 + index * 8}px ${glow})`,
      transition: 'all 0.3s ease',
    }}>
      {/* CSS 3D Cube using perspective */}
      <div style={{
        width: cubeSize,
        height: cubeSize,
        position: 'relative',
        transformStyle: 'preserve-3d',
        transform: `perspective(600px) rotateX(${tiltX}deg) rotateZ(${tiltZ}deg)`,
      }}>
        {/* Front face */}
        <div style={{
          position: 'absolute',
          width: cubeSize,
          height: cubeSize,
          background: `linear-gradient(135deg, ${face}cc 0%, ${face} 60%, ${shadow}88 100%)`,
          border: `2px solid ${face}`,
          borderRadius: 16,
          backdropFilter: 'blur(8px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontFamily: "'Inter', 'system-ui', sans-serif",
          boxShadow: `inset 0 0 30px ${face}55, inset 2px 2px 12px rgba(255,255,255,0.25), inset -2px -2px 12px rgba(0,0,0,0.4)`,
          transform: `translateZ(${depth / 2}px)`,
          overflow: 'hidden',
        }}>
          {/* Shine overlay */}
          <div style={{
            position: 'absolute',
            top: 0, left: 0,
            width: '60%', height: '50%',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.35) 0%, transparent 100%)',
            borderRadius: '16px 0 50% 0',
            pointerEvents: 'none',
          }} />
          {/* Sparkle corners */}
          <div style={{ position: 'absolute', top: 10, left: 10, fontSize: 14, opacity: 0.9 }}>✦</div>
          <div style={{ position: 'absolute', bottom: 10, right: 10, fontSize: 10, opacity: 0.7 }}>✦</div>

          <div style={{
            fontSize: cubeSize * 0.38,
            fontWeight: 900,
            lineHeight: 1,
            textShadow: '0 2px 12px rgba(0,0,0,0.8)',
            letterSpacing: '-0.02em',
            userSelect: 'none',
          }}>
            {parseSuperscript(data.label.replace(/^label\s*/i, ''))}
          </div>
          {data.desc && (
            <div style={{
              fontSize: cubeSize * 0.13,
              fontWeight: 600,
              opacity: 0.85,
              marginTop: 4,
              textAlign: 'center',
              padding: '0 8px',
              textShadow: '0 1px 4px rgba(0,0,0,0.6)',
            }}>
              {data.desc.replace(/^desc\s*/i, '')}
            </div>
          )}
        </div>

        {/* Top face */}
        <div style={{
          position: 'absolute',
          width: cubeSize,
          height: depth,
          background: `linear-gradient(180deg, ${top}cc 0%, ${face}aa 100%)`,
          border: `2px solid ${top}`,
          borderRadius: '8px 8px 0 0',
          transform: `rotateX(90deg) translateZ(${cubeSize - depth / 2}px)`,
          boxShadow: `inset 0 0 20px rgba(255,255,255,0.2)`,
        }} />

        {/* Right side face */}
        <div style={{
          position: 'absolute',
          width: depth,
          height: cubeSize,
          background: `linear-gradient(90deg, ${shadow}cc 0%, ${shadow}88 100%)`,
          border: `2px solid ${shadow}88`,
          borderRadius: '0 8px 8px 0',
          transform: `rotateY(-90deg) translateZ(-${depth / 2}px) translateX(${cubeSize}px)`,
          right: 0,
        }} />
      </div>
    </div>
  );
};

export const PowerTower: React.FC<PowerTowerProps> = ({ blocks, width, height }) => {
  const cubeSize = Math.min(Math.floor(width * 0.72), Math.floor(height / (blocks.length * 0.9 + 0.3)));
  const depth = Math.round(cubeSize * 0.22);

  return (
    <div style={{
      width,
      height,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-end',
      paddingBottom: 32,
      paddingTop: 24,
      boxSizing: 'border-box',
    }}>
      {/* Stack bottom → top visually, but we render top-first via column-reverse */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}>
        {[...blocks].reverse().map((block, revIdx) => {
          const idx = blocks.length - 1 - revIdx; // original index (0 = bottom)
          return (
            <Cube
              key={idx}
              data={block}
              index={idx}
              total={blocks.length}
              cubeSize={cubeSize - idx * Math.round(cubeSize * 0.07)}
              depth={depth}
            />
          );
        })}
      </div>
    </div>
  );
};
