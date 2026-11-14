import React from 'react';
import {
  GridShapeFrame,
  QuestionVisual,
  OptionVisual,
} from '../../utils/aptitudeGenerator';

export const SvgFrameGlyph: React.FC<{ frame: GridShapeFrame; size?: number }> = ({
  frame,
  size = 64,
}) => {
  const cornerCoords: Array<[number, number]> = [
    [10, 10],
    [54, 10],
    [54, 54],
    [10, 54],
  ];
  const [dotX, dotY] = cornerCoords[frame.dotCorner % 4] || [10, 10];
  const fillCol = frame.filled ? 'var(--color-primary)' : 'none';
  const strokeCol = 'var(--color-primary)';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className="rounded-lg bg-canvas border border-border-subtle shrink-0"
    >
      {/* Quadrant Dot Marker */}
      <circle cx={dotX} cy={dotY} r="3.5" fill="#10b981" />

      <g transform={`rotate(${frame.rotation} 32 32)`}>
        {frame.shape === 'arrow' && (
          <path
            d="M32 13 L46 30 L37 30 L37 50 L27 50 L27 30 L18 30 Z"
            fill={fillCol}
            stroke={strokeCol}
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
        )}
        {frame.shape === 'triangle' && (
          <polygon
            points="32,14 49,47 15,47"
            fill={fillCol}
            stroke={strokeCol}
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
        )}
        {frame.shape === 'l-piece' && (
          <path
            d="M22 15 L31 15 L31 39 L45 39 L45 48 L22 48 Z"
            fill={fillCol}
            stroke={strokeCol}
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
        )}
        {frame.shape === 'diamond' && (
          <polygon
            points="32,13 48,32 32,51 16,32"
            fill={fillCol}
            stroke={strokeCol}
            strokeWidth="2.5"
          />
        )}
      </g>
    </svg>
  );
};

export const PixelGridTile: React.FC<{ cells: number[][]; tileSize?: number }> = ({
  cells,
  tileSize = 68,
}) => {
  const cellPx = tileSize / 4;
  return (
    <svg
      width={tileSize}
      height={tileSize}
      viewBox={`0 0 ${tileSize} ${tileSize}`}
      shapeRendering="crispEdges"
      className="rounded-lg bg-canvas border border-border-subtle shrink-0"
    >
      {cells.map((row, r) =>
        row.map((val, c) => (
          <rect
            key={`${r}-${c}`}
            x={c * cellPx + 1.5}
            y={r * cellPx + 1.5}
            width={cellPx - 3}
            height={cellPx - 3}
            rx="1.5"
            fill={val === 1 ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)'}
          />
        ))
      )}
    </svg>
  );
};

export const QuestionVisualBlock: React.FC<{ visual: QuestionVisual }> = ({ visual }) => {
  if (visual.type === 'bar-chart') {
    const maxVal = Math.max(...visual.items.map((i) => i.value), 10);
    return (
      <div className="p-4 rounded-xl bg-surface-subtle border border-border-subtle space-y-3">
        <div className="flex items-center justify-between text-xs font-mono text-text-muted">
          <span className="font-semibold text-text-primary">{visual.title}</span>
          <span>Unit: {visual.unit}</span>
        </div>
        <div className="grid grid-cols-5 gap-3 items-end h-40 pt-5 px-2">
          {visual.items.map((item) => {
            const pct = Math.max(12, Math.round((item.value / maxVal) * 100));
            return (
              <div key={item.label} className="flex flex-col items-center justify-end h-full gap-1.5">
                <span className="text-[11px] font-mono font-bold text-text-primary">
                  {item.value}
                </span>
                <div
                  className={`w-full max-w-[44px] rounded-t-md transition-all ${
                    item.highlight ? 'bg-primary' : 'bg-emerald-500/70'
                  }`}
                  style={{ height: `${pct}%` }}
                />
                <span className="text-[11px] font-mono text-text-secondary text-center truncate w-full">
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (visual.type === 'data-table') {
    return (
      <div className="rounded-xl border border-border-subtle bg-surface-subtle overflow-hidden">
        <div className="px-4 py-2 bg-surface-elevated/60 border-b border-border-subtle text-xs font-mono font-semibold text-text-primary">
          {visual.title}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-border-subtle text-text-muted bg-surface-subtle">
                {visual.headers.map((h) => (
                  <th key={h} className="py-2 px-4 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {visual.rows.map((row, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-surface/40' : ''}>
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="py-2 px-4 text-text-primary">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (visual.type === 'svg-sequence') {
    return (
      <div className="p-4 rounded-xl bg-surface-subtle border border-border-subtle space-y-2.5">
        <div className="text-xs font-mono text-text-muted">{visual.title}</div>
        <div className="flex flex-wrap items-center gap-3">
          {visual.frames.map((frame, i) => (
            <React.Fragment key={i}>
              <div className="flex flex-col items-center gap-1">
                <SvgFrameGlyph frame={frame} size={64} />
                <span className="text-[10px] font-mono text-text-muted">Step {i + 1}</span>
              </div>
              <span className="text-text-muted font-mono text-xs">→</span>
            </React.Fragment>
          ))}
          {visual.showQuestionMark && (
            <div className="flex flex-col items-center gap-1">
              <div className="w-16 h-16 rounded-lg border border-dashed border-primary/50 bg-primary-subtle/20 flex items-center justify-center font-mono text-xl font-bold text-primary">
                ?
              </div>
              <span className="text-[10px] font-mono text-primary">Step 5</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (visual.type === 'mirror-grid') {
    return (
      <div className="p-4 rounded-xl bg-surface-subtle border border-border-subtle space-y-2.5">
        <div className="text-xs font-mono text-text-muted">{visual.title}</div>
        <div className="flex items-center gap-5">
          <PixelGridTile cells={visual.cells} tileSize={84} />
          <div className="h-20 w-0.5 bg-danger/70 relative flex items-center">
            <span className="ml-2 text-[10px] font-mono uppercase tracking-wider text-danger">
              Mirror Axis
            </span>
          </div>
          <div className="w-[84px] h-[84px] rounded-lg border border-dashed border-primary/50 bg-primary-subtle/15 flex items-center justify-center font-mono text-xl font-bold text-primary">
            ?
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export const OptionVisualTile: React.FC<{ visual: OptionVisual }> = ({ visual }) => {
  if (visual.type === 'svg-frame' && visual.frame) {
    return <SvgFrameGlyph frame={visual.frame} size={46} />;
  }
  if (visual.type === 'mirror-grid' && visual.cells) {
    return <PixelGridTile cells={visual.cells} tileSize={52} />;
  }
  return null;
};
