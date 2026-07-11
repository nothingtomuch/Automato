import React from 'react';

interface NumberLineProps {
  dsl: string;
  width: number;
  height: number;
}

export const NumberLine: React.FC<NumberLineProps> = ({ dsl, width, height }) => {
  // Example DSL: custom number-line min=0 max=16 step=2 highlight=8
  const parseParam = (key: string, def: number) => {
    const match = dsl.match(new RegExp(`${key}=([\\d.-]+)`));
    return match ? parseFloat(match[1]) : def;
  };

  const min = parseParam('min', 0);
  const max = parseParam('max', 10);
  const step = parseParam('step', 1);
  const highlight = parseParam('highlight', NaN);

  const ticks = [];
  for (let i = min; i <= max; i += step) {
    ticks.push(i);
  }

  return (
    <div style={{
      width: `${width}px`,
      height: `${height}px`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative'
    }}>
      {/* The main line */}
      <div style={{
        position: 'absolute',
        width: '90%',
        height: '8px',
        background: 'linear-gradient(90deg, #ff007a, #7928ca, #00d4ff)',
        borderRadius: '4px',
        boxShadow: '0 0 15px rgba(121, 40, 202, 0.8)'
      }} />

      {/* Ticks and labels */}
      <div style={{
        position: 'absolute',
        width: '90%',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        {ticks.map((tick, i) => {
          const isHighlighted = tick === highlight;
          return (
            <div key={i} style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              position: 'relative',
              top: '20px'
            }}>
              {/* Tick mark */}
              <div style={{
                width: isHighlighted ? '6px' : '4px',
                height: isHighlighted ? '30px' : '20px',
                backgroundColor: isHighlighted ? '#fff' : '#ddd',
                borderRadius: '2px',
                marginBottom: '10px',
                marginTop: isHighlighted ? '-35px' : '-25px',
                boxShadow: isHighlighted ? '0 0 10px #fff' : 'none'
              }} />
              {/* Label */}
              <div style={{
                color: isHighlighted ? '#fff' : '#ddd',
                fontSize: isHighlighted ? '48px' : '32px',
                fontWeight: isHighlighted ? '900' : 'bold',
                textShadow: isHighlighted ? '0 0 20px rgba(255,255,255,0.8)' : '0 2px 4px rgba(0,0,0,0.8)',
                fontFamily: 'system-ui, sans-serif'
              }}>
                {tick}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
