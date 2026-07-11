import { useEffect, useRef, useState } from 'react';
import { delayRender, continueRender } from 'remotion';
import { parseSyntax } from '@antv/infographic';
import { PowerTower } from './PowerTower';
import { NumberLine } from './NumberLine';

interface InfographicOverlayProps {
  dsl: string;
  width?: number;
  height?: number;
}

export const InfographicOverlay = ({ dsl, width = 600, height = 800 }: InfographicOverlayProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const infographicRef = useRef<any>(null);
  const [handle] = useState(() => delayRender('Waiting for AntV Infographic engine...'));

  // 1. Try to parse AST synchronously to see if we should intercept
  let customAst: any = null;
  try {
    customAst = parseSyntax(dsl);
  } catch (e) {
    // ignore
  }

  const isCustomPyramid = customAst?.options?.template === 'list-pyramid-badge-card';
  const isCustomNumberLine = dsl.trim().startsWith('custom number-line');

  useEffect(() => {
    // If it's a custom React component, we handle it via pure React, no AntV needed
    if (isCustomPyramid || isCustomNumberLine) {
      continueRender(handle);
      return;
    }

    // Server-side safeguard — Remotion runs in headless Chromium, ensure DOM exists
    if (typeof window === 'undefined' || !containerRef.current) return;

    const initAndRender = async () => {
      try {
        // Dynamic import prevents bundler errors during early initialization
        const { Infographic } = await import('@antv/infographic');

        // Capture ref in a local variable — ref may change during async gap
        const container = containerRef.current;
        if (!container) return;

        // Flush any previous instance DOM nodes
        container.innerHTML = '';

        // Initialize with absolute pixel dimensions (critical for Remotion headless)
        infographicRef.current = new Infographic({
          container: container,
          width,
          height,
          editable: false,
        });

        // Render the DSL layout
        infographicRef.current.render(dsl);

        // Tell Remotion this frame is safe to capture
        continueRender(handle);
      } catch (error) {
        console.error('AntV Engine Render Exception:', error);
        // Always release the render lock to avoid permanent freezes
        continueRender(handle);
      }
    };

    initAndRender();

    // Cleanup: destroy the AntV instance and clear the DOM on unmount
    return () => {
      if (infographicRef.current && typeof infographicRef.current.destroy === 'function') {
        infographicRef.current.destroy();
      }
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [dsl, handle, width, height]);

  if (isCustomPyramid && customAst?.options?.data?.lists) {
    return <PowerTower blocks={customAst.options.data.lists} width={width} height={height} />;
  }

  if (isCustomNumberLine) {
    return <NumberLine dsl={dsl} width={width} height={height} />;
  }

  return (
    <div style={{ width: `${width}px`, height: `${height}px` }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
};
