import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface FlowStep {
  shape: 'oval' | 'rect' | 'diamond';
  label: string;
  edgeLabel: string;
  color: string;
  branch?: {
    label: string;
    steps: FlowStep[];
  };
}

export interface FlowChartProps {
  steps: FlowStep[];
  secondsPerStep: number;
  width: number;
  height: number;
}

// ─── DSL Parser ───────────────────────────────────────────────────────────────
export function parseFlowchartDSL(dsl: string): { steps: FlowStep[]; sps: number } {
  const lines = dsl.split('\n').map(l => l.trim()).filter(Boolean);
  let sps = 1.5;
  const steps: FlowStep[] = [];
  const stepRx = /^step\s+(oval|rect|diamond)\s+"([^"]*)"\s+edge="([^"]*)"\s+color=(#[0-9a-fA-F]{3,8})/i;
  const branchRx = /^branch\s+"([^"]*)"\s*\{/;

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith('infographic flowchart')) {
      const m = line.match(/sps=([\d.]+)/);
      if (m) sps = parseFloat(m[1]);
      i++; continue;
    }
    const sm = line.match(stepRx);
    if (sm) {
      const step: FlowStep = { shape: sm[1] as any, label: sm[2], edgeLabel: sm[3], color: sm[4] };
      i++;
      if (i < lines.length) {
        const bm = lines[i].match(branchRx);
        if (bm) {
          const branchSteps: FlowStep[] = [];
          i++;
          while (i < lines.length && lines[i] !== '}') {
            const bsm = lines[i].match(stepRx);
            if (bsm) branchSteps.push({ shape: bsm[1] as any, label: bsm[2], edgeLabel: bsm[3], color: bsm[4] });
            i++;
          }
          step.branch = { label: bm[1], steps: branchSteps };
          i++; // skip }
        }
      }
      steps.push(step);
    } else { i++; }
  }
  return { steps, sps };
}

// ─── Pure-SVG node shape helpers ─────────────────────────────────────────────
const NW = 220;
const NH = 68;
const DIA_EXTRA = 26; // extra height for diamond top/bottom points
const VGAP = 52;
const FONT = "'Inter', 'Segoe UI', sans-serif";

function wrapLabel(text: string, maxChars = 20): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (test.length > maxChars && cur) { lines.push(cur); cur = w; }
    else cur = test;
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 3); // max 3 lines
}

function rectNode(x: number, y: number, w: number, h: number, color: string, label: string, opacity: number) {
  const lines = wrapLabel(label);
  const lineH = 20;
  const totalTH = lines.length * lineH;
  const textY = y + h / 2 - totalTH / 2 + lineH * 0.75;
  return (
    <g opacity={opacity} style={{ transition: 'opacity 0.5s' }}>
      <defs>
        <linearGradient id={`rg${color.slice(1)}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.9} />
          <stop offset="100%" stopColor={color} stopOpacity={0.55} />
        </linearGradient>
      </defs>
      <rect x={x} y={y} width={w} height={h} rx={12} ry={12}
        fill={`url(#rg${color.slice(1)})`}
        stroke={color} strokeWidth={2.5}
        style={{ filter: `drop-shadow(0 0 12px ${color}77)` }}
      />
      {/* shine */}
      <rect x={x + 4} y={y + 4} width={w * 0.45} height={h * 0.38} rx={8}
        fill="rgba(255,255,255,0.18)" />
      {lines.map((line, li) => (
        <text key={li} x={x + w / 2} y={textY + li * lineH}
          textAnchor="middle" fill="white" fontSize={14} fontWeight={700}
          fontFamily={FONT}
          style={{ textShadow: '0 1px 6px rgba(0,0,0,0.7)' }}>
          {line}
        </text>
      ))}
    </g>
  );
}

function ovalNode(x: number, y: number, w: number, h: number, color: string, label: string, opacity: number) {
  const cx = x + w / 2, cy = y + h / 2;
  const rx = w / 2 - 2, ry = h / 2 - 2;
  const lines = wrapLabel(label, 22);
  const lineH = 18;
  const textY = cy - (lines.length - 1) * lineH / 2;
  return (
    <g opacity={opacity} style={{ transition: 'opacity 0.5s' }}>
      <defs>
        <linearGradient id={`og${color.slice(1)}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.88} />
          <stop offset="100%" stopColor={color} stopOpacity={0.5} />
        </linearGradient>
      </defs>
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry}
        fill={`url(#og${color.slice(1)})`} stroke={color} strokeWidth={2.5}
        style={{ filter: `drop-shadow(0 0 12px ${color}77)` }} />
      <ellipse cx={cx - rx * 0.25} cy={cy - ry * 0.3} rx={rx * 0.35} ry={ry * 0.22}
        fill="rgba(255,255,255,0.18)" />
      {lines.map((line, li) => (
        <text key={li} x={cx} y={textY + li * lineH}
          textAnchor="middle" dominantBaseline="middle"
          fill="white" fontSize={14} fontWeight={700} fontFamily={FONT}>
          {line}
        </text>
      ))}
    </g>
  );
}

function diamondNode(x: number, y: number, w: number, h: number, color: string, label: string, opacity: number) {
  const cx = x + w / 2, cy = y + h / 2;
  const pts = `${cx},${y} ${x + w - 2},${cy} ${cx},${y + h} ${x + 2},${cy}`;
  const lines = wrapLabel(label, 18);
  const lineH = 18;
  const textY = cy - (lines.length - 1) * lineH / 2;
  return (
    <g opacity={opacity} style={{ transition: 'opacity 0.5s' }}>
      <defs>
        <linearGradient id={`dg${color.slice(1)}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.9} />
          <stop offset="100%" stopColor={color} stopOpacity={0.55} />
        </linearGradient>
      </defs>
      <polygon points={pts}
        fill={`url(#dg${color.slice(1)})`} stroke={color} strokeWidth={2.5}
        style={{ filter: `drop-shadow(0 0 14px ${color}88)` }} />
      {lines.map((line, li) => (
        <text key={li} x={cx} y={textY + li * lineH}
          textAnchor="middle" dominantBaseline="middle"
          fill="white" fontSize={13} fontWeight={700} fontFamily={FONT}>
          {line}
        </text>
      ))}
    </g>
  );
}

function renderNode(shape: FlowStep['shape'], x: number, y: number, w: number, h: number, color: string, label: string, opacity: number) {
  if (shape === 'oval') return ovalNode(x, y, w, h, color, label, opacity);
  if (shape === 'diamond') return diamondNode(x, y, w, h, color, label, opacity);
  return rectNode(x, y, w, h, color, label, opacity);
}

// ─── Arrow marker ─────────────────────────────────────────────────────────────
function ArrowDef({ id, color }: { id: string; color: string }) {
  return (
    <marker id={id} markerWidth={10} markerHeight={7} refX={9} refY={3.5} orient="auto">
      <polygon points="0 0, 10 3.5, 0 7" fill={color} />
    </marker>
  );
}

// ─── Main renderer ────────────────────────────────────────────────────────────
export const FlowChart: React.FC<FlowChartProps> = ({ steps, secondsPerStep, width, height }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const framesPerStep = Math.max(1, Math.round(secondsPerStep * fps));
  const revealedCount = Math.min(steps.length, Math.floor(frame / framesPerStep) + 1);

  // ── Compute layout ──────────────────────────────────────────────────────────
  type LayoutNode = { step: FlowStep; x: number; y: number; w: number; h: number; idx: number };
  const mainX = Math.round((width - NW) / 2);
  const nodes: LayoutNode[] = [];
  let curY = 40;

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const isDiamond = step.shape === 'diamond';
    const nodeH = isDiamond ? NH + DIA_EXTRA * 2 : NH;
    nodes.push({ step, x: mainX, y: curY, w: NW, h: nodeH, idx: i });
    curY += nodeH + VGAP;
  }

  // total SVG height needed
  const svgH = curY + 20;

  // ── Build branch column: how wide is main + branch side-by-side?
  const hasBranches = steps.some(s => s.branch && s.branch.steps.length > 0);
  const branchColX = mainX + NW + 32;
  const svgW = hasBranches ? Math.max(width, branchColX + NW + 20) : width;

  // scale to fit
  const scaleX = width / svgW;
  const scaleY = height / svgH;
  // scale variable retained for future use (viewBox handles fitting)
  void Math.min(1, scaleX, scaleY);

  const arrowDefs: React.ReactNode[] = [];
  const arrows: React.ReactNode[] = [];
  const shapes: React.ReactNode[] = [];

  nodes.forEach((n, i) => {
    const revealed = i < revealedCount;
    const opacity = revealed ? 1 : 0;

    // ── Draw the node ──────────────────────────────────────────────────────
    shapes.push(
      <g key={`node-${i}`}>
        {renderNode(n.step.shape, n.x, n.y, n.w, n.h, n.step.color, n.step.label, opacity)}
      </g>
    );

    // ── Arrow to next main node ────────────────────────────────────────────
    if (i < nodes.length - 1 && revealed && i + 1 < revealedCount) {
      const next = nodes[i + 1];
      const ax = n.x + n.w / 2;
      const ay1 = n.y + n.h;
      const ay2 = next.y - 2;
      const mid = ay1 + (ay2 - ay1) * 0.5;
      const aId = `ah${i}`;
      arrowDefs.push(<ArrowDef key={aId} id={aId} color={n.step.color} />);
      arrows.push(
        <g key={`arr-${i}`}>
          <line x1={ax} y1={ay1} x2={ax} y2={ay2}
            stroke={n.step.color} strokeWidth={2.5}
            markerEnd={`url(#${aId})`}
            style={{ filter: `drop-shadow(0 0 4px ${n.step.color}66)` }}
          />
          {n.step.edgeLabel && (
            <text x={ax + 6} y={mid + 6} fill={n.step.color} fontSize={12} fontWeight={700} fontFamily={FONT}>
              {n.step.edgeLabel}
            </text>
          )}
        </g>
      );
    }

    // ── Branch (No path) ───────────────────────────────────────────────────
    if (n.step.branch && n.step.branch.steps.length > 0 && revealed) {
      const branch = n.step.branch;
      const branchColor = '#ff9800';
      const arrowId = `bah${i}`;
      arrowDefs.push(<ArrowDef key={arrowId} id={arrowId} color={branchColor} />);

      // horizontal arrow from right side of decision node → branch column
      const srcX = n.x + n.w;
      const srcY = n.y + n.h / 2;
      arrows.push(
        <g key={`barr-${i}`}>
          <line x1={srcX} y1={srcY} x2={branchColX - 2} y2={srcY}
            stroke={branchColor} strokeWidth={2.5}
            markerEnd={`url(#${arrowId})`}
            style={{ filter: `drop-shadow(0 0 4px ${branchColor}66)` }}
          />
          <text x={srcX + 6} y={srcY - 6} fill={branchColor} fontSize={12} fontWeight={700} fontFamily={FONT}>
            {branch.label}
          </text>
        </g>
      );

      // Branch step nodes stacked vertically from srcY
      let bY = n.y;
      branch.steps.forEach((bs, bi) => {
        const isDia = bs.shape === 'diamond';
        const bh = isDia ? NH + DIA_EXTRA * 2 : NH;
        shapes.push(
          <g key={`bnode-${i}-${bi}`}>
            {renderNode(bs.shape, branchColX, bY, NW, bh, bs.color, bs.label, opacity)}
          </g>
        );
        if (bi < branch.steps.length - 1) {
          const bAId = `bah${i}_${bi}`;
          const bax = branchColX + NW / 2;
          arrowDefs.push(<ArrowDef key={bAId} id={bAId} color={bs.color} />);
          arrows.push(
            <line key={`barr-${i}-${bi}`}
              x1={bax} y1={bY + bh} x2={bax} y2={bY + bh + VGAP / 2 - 2}
              stroke={bs.color} strokeWidth={2.5} markerEnd={`url(#${bAId})`}
            />
          );
        }
        bY += bh + VGAP / 2;
      });
    }
  });

  return (
    <div style={{ width, height, overflow: 'hidden', display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${svgW} ${svgH}`}
        preserveAspectRatio="xMidYMin meet"
        style={{ fontFamily: FONT }}
      >
        <defs>{arrowDefs}</defs>
        {arrows}
        {shapes}
      </svg>
    </div>
  );
};
