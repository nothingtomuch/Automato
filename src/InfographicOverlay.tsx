import { useEffect, useRef, useState } from 'react';
import { delayRender, continueRender } from 'remotion';
import { parseSyntax } from '@antv/infographic';
import { PowerTower } from './PowerTower';
import { NumberLine } from './NumberLine';
import { FlowChart, parseFlowchartDSL } from './FlowChart';

interface InfographicOverlayProps {
  dsl: string;
  width?: number;
  height?: number;
}

// Parse `cube { label ... color ... desc ... }` blocks from power-tower DSL
function parsePowerTowerCubes(dsl: string): Array<{ label: string; desc?: string; color?: string }> {
  const cubes: Array<{ label: string; desc?: string; color?: string }> = [];
  const cubeRegex = /cube\s*\{([^}]+)\}/g;
  let match;
  while ((match = cubeRegex.exec(dsl)) !== null) {
    const body = match[1];
    const label = (body.match(/label\s+(.+)/)?.[1] ?? '').trim();
    const desc  = (body.match(/desc\s+(.+)/)?.[1] ?? '').trim() || undefined;
    const color = (body.match(/color\s+(#[0-9a-fA-F]{3,8})/)?.[1] ?? '').trim() || undefined;
    if (label) cubes.push({ label, desc, color });
  }
  return cubes;
}

export const InfographicOverlay = ({ dsl, width = 600, height = 800 }: InfographicOverlayProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const infographicRef = useRef<any>(null);
  const [handle] = useState(() => delayRender('Waiting for AntV Infographic engine...'));

  // 1. Detect custom templates early — no AntV needed for these
  const trimmed = dsl.trim();
  const isFlowchart       = trimmed.startsWith('infographic flowchart');
  const isCustomPowerTower = trimmed.startsWith('infographic power-tower') || trimmed.startsWith('power-tower');
  const isCustomNumberLine = trimmed.startsWith('custom number-line');

  let customAst: any = null;
  let isCustomPyramid = false;
  if (!isFlowchart && !isCustomPowerTower && !isCustomNumberLine) {
    try {
      customAst = parseSyntax(dsl);
      isCustomPyramid = customAst?.options?.template === 'list-pyramid-badge-card';
    } catch (e) {
      // ignore
    }
  }

  const isCustom = isFlowchart || isCustomPowerTower || isCustomNumberLine || isCustomPyramid;

  useEffect(() => {
    if (isCustom) {
      continueRender(handle);
      return;
    }

    if (typeof window === 'undefined' || !containerRef.current) return;

    const initAndRender = async () => {
      try {
        const { Infographic } = await import('@antv/infographic');
        const container = containerRef.current;
        if (!container) return;
        container.innerHTML = '';
        infographicRef.current = new Infographic({
          container,
          width,
          height,
          editable: false,
        });
        infographicRef.current.render(dsl);
        continueRender(handle);
      } catch (error) {
        console.error('AntV Engine Render Exception:', error);
        continueRender(handle);
      }
    };

    initAndRender();

    return () => {
      if (infographicRef.current && typeof infographicRef.current.destroy === 'function') {
        infographicRef.current.destroy();
      }
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [dsl, handle, width, height]);

  // ── Flowchart ───────────────────────────────────────────────────────────────
  if (isFlowchart) {
    const { steps, sps } = parseFlowchartDSL(dsl);
    return <FlowChart steps={steps} secondsPerStep={sps} width={width} height={height} />;
  }

  // ── Power Tower ─────────────────────────────────────────────────────────────
  if (isCustomPowerTower) {
    const cubes = parsePowerTowerCubes(dsl);
    return <PowerTower blocks={cubes.length > 0 ? cubes : [{ label: '?', desc: 'Add cubes in the editor' }]} width={width} height={height} />;
  }

  // ── Pyramid (legacy AntV list) ───────────────────────────────────────────────
  if (isCustomPyramid && customAst?.options?.data?.lists) {
    return <PowerTower blocks={customAst.options.data.lists} width={width} height={height} />;
  }

  // ── Number Line ──────────────────────────────────────────────────────────────
  if (isCustomNumberLine) {
    return <NumberLine dsl={dsl} width={width} height={height} />;
  }

  // ── AntV default ─────────────────────────────────────────────────────────────
  return (
    <div style={{ width: `${width}px`, height: `${height}px` }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
};
