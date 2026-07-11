import React from 'react';

interface BlockData {
  label: string;
  desc?: string;
  color: string;
}

interface PowerTowerProps {
  blocks: BlockData[];
  width: number;
  height: number;
}

export const PowerTower: React.FC<PowerTowerProps> = ({ blocks, width, height }) => {
  // The AntV parser gives us the blocks from top to bottom if it's a pyramid, 
  // or maybe bottom to top. 
  // Wait, in our gen_video.py we did: 2^1, 2^2, 2^3. 
  // Let's assume the array is [2^1, 2^2, 2^3].
  // We want 2^1 at the BOTTOM. So we should reverse them or use flex-direction: column-reverse.
  
  return (
    <div style={{
      width: `${width}px`,
      height: `${height}px`,
      display: 'flex',
      flexDirection: 'column-reverse',
      alignItems: 'center',
      justifyContent: 'flex-start',
      paddingBottom: '40px',
    }}>
      {blocks.map((block, i) => {
        // The higher the block (larger index), the smaller it gets.
        // Base size for 2^1 (i=0) is say 300px width.
        const blockWidth = 300 - (i * 30);
        const blockHeight = 180 - (i * 15);
        
        return (
          <div key={i} style={{
            width: `${blockWidth}px`,
            height: `${blockHeight}px`,
            marginTop: '-20px', // slight overlap
            background: `linear-gradient(135deg, #1e1e1e 0%, ${block.color} 100%)`,
            border: `3px solid ${block.color}`,
            borderRadius: '24px',
            boxShadow: `0 0 40px ${block.color}88, inset 0 0 20px ${block.color}aa`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontFamily: 'system-ui, sans-serif',
            zIndex: 10 - i, // Bottom block (i=0) is in front, or back? Let's put lower index on top visually.
            position: 'relative',
            textShadow: '0 2px 10px rgba(0,0,0,0.8)'
          }}>
            {/* The little star sparkles could just be a pseudo element or an image, but text is fine */}
            <div style={{ fontSize: '72px', fontWeight: '900', lineHeight: 1.1 }}>
              {block.label.replace('label ', '')}
            </div>
            {block.desc && (
              <div style={{ fontSize: '24px', fontWeight: 'bold', opacity: 0.8 }}>
                {block.desc.replace('desc ', '')}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
