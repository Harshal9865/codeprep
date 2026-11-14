import React, { useRef } from 'react';

interface ResizableDividerProps {
  orientation: 'vertical' | 'horizontal';
  onDragDelta: (deltaPx: number) => void;
  onDragStateChange?: (isDragging: boolean) => void;
  onDoubleClick?: () => void;
  title?: string;
}

/**
 * LeetCode-style drag divider with generous hit area, grip pill, and double-click reset.
 * - orientation="vertical": sits between left/right panes, resizes horizontally (col-resize)
 * - orientation="horizontal": sits between top/bottom panes, resizes vertically (row-resize)
 */
export const ResizableDivider: React.FC<ResizableDividerProps> = ({
  orientation,
  onDragDelta,
  onDragStateChange,
  onDoubleClick,
  title = 'Drag to resize (double-click to reset)',
}) => {
  const lastPosRef = useRef<number | null>(null);
  const isVertical = orientation === 'vertical';

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    lastPosRef.current = isVertical ? e.clientX : e.clientY;
    onDragStateChange?.(true);
    document.body.style.cursor = isVertical ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (lastPosRef.current === null) return;
    const currentPos = isVertical ? e.clientX : e.clientY;
    const delta = currentPos - lastPosRef.current;
    if (delta !== 0) {
      lastPosRef.current = currentPos;
      onDragDelta(delta);
    }
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (lastPosRef.current === null) return;
    lastPosRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    onDragStateChange?.(false);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  };

  return (
    <div
      role="separator"
      aria-orientation={isVertical ? 'vertical' : 'horizontal'}
      title={title}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onDoubleClick={onDoubleClick}
      className={`group relative shrink-0 select-none z-20 flex items-center justify-center bg-canvas/80 hover:bg-primary/15 active:bg-primary/25 transition-colors ${
        isVertical
          ? 'hidden md:flex w-2 cursor-col-resize border-x border-border-subtle/70 hover:border-primary/40'
          : 'h-2 w-full cursor-row-resize border-y border-border-subtle/70 hover:border-primary/40'
      }`}
    >
      {/* Visual grip pill */}
      <div
        className={`rounded-full bg-text-muted/35 group-hover:bg-primary group-active:bg-primary transition-colors ${
          isVertical ? 'w-1 h-8' : 'h-1 w-10'
        }`}
      />
    </div>
  );
};
