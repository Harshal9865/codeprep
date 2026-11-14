import { useCallback, useEffect, useState } from 'react';

export type MaximizedPane = 'none' | 'spec' | 'editor' | 'console';

export interface WorkspaceLayoutState {
  leftWidthPct: number;
  bottomHeightPx: number;
  isBottomCollapsed: boolean;
  maximizedPane: MaximizedPane;
}

const DEFAULT_LAYOUT: WorkspaceLayoutState = {
  leftWidthPct: 45,
  bottomHeightPx: 256,
  isBottomCollapsed: false,
  maximizedPane: 'none',
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export function useWorkspaceLayout(
  storageKey: string,
  overrides?: Partial<WorkspaceLayoutState>
) {
  const defaults: WorkspaceLayoutState = {
    ...DEFAULT_LAYOUT,
    ...overrides,
  };

  const [layout, setLayout] = useState<WorkspaceLayoutState>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return defaults;
      const parsed = JSON.parse(raw) as Partial<WorkspaceLayoutState>;
      return {
        leftWidthPct:
          typeof parsed.leftWidthPct === 'number'
            ? clamp(parsed.leftWidthPct, 22, 75)
            : defaults.leftWidthPct,
        bottomHeightPx:
          typeof parsed.bottomHeightPx === 'number'
            ? clamp(parsed.bottomHeightPx, 120, 620)
            : defaults.bottomHeightPx,
        isBottomCollapsed: Boolean(parsed.isBottomCollapsed),
        maximizedPane:
          parsed.maximizedPane === 'spec' ||
          parsed.maximizedPane === 'editor' ||
          parsed.maximizedPane === 'console'
            ? parsed.maximizedPane
            : 'none',
      };
    } catch {
      return defaults;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(layout));
    } catch {
      // Ignore storage quota errors
    }
  }, [storageKey, layout]);

  const setLeftWidthPct = useCallback((pct: number) => {
    setLayout((prev) => ({
      ...prev,
      leftWidthPct: clamp(Number(pct.toFixed(2)), 22, 75),
    }));
  }, []);

  const setBottomHeightPx = useCallback((px: number) => {
    setLayout((prev) => ({
      ...prev,
      bottomHeightPx: clamp(Math.round(px), 120, 620),
      isBottomCollapsed: false,
    }));
  }, []);

  const toggleBottomCollapsed = useCallback(() => {
    setLayout((prev) => ({
      ...prev,
      isBottomCollapsed: !prev.isBottomCollapsed,
      maximizedPane: prev.maximizedPane === 'console' ? 'none' : prev.maximizedPane,
    }));
  }, []);

  const expandBottom = useCallback(() => {
    setLayout((prev) => ({
      ...prev,
      isBottomCollapsed: false,
    }));
  }, []);

  const toggleMaximize = useCallback((pane: Exclude<MaximizedPane, 'none'>) => {
    setLayout((prev) => ({
      ...prev,
      maximizedPane: prev.maximizedPane === pane ? 'none' : pane,
      isBottomCollapsed: pane === 'console' ? false : prev.isBottomCollapsed,
    }));
  }, []);

  const resetLayout = useCallback(() => {
    setLayout(defaults);
  }, [defaults.leftWidthPct, defaults.bottomHeightPx, defaults.isBottomCollapsed]);

  const isCustomLayout =
    Math.abs(layout.leftWidthPct - defaults.leftWidthPct) > 0.5 ||
    Math.abs(layout.bottomHeightPx - defaults.bottomHeightPx) > 4 ||
    layout.isBottomCollapsed !== defaults.isBottomCollapsed ||
    layout.maximizedPane !== 'none';

  return {
    layout,
    setLeftWidthPct,
    setBottomHeightPx,
    toggleBottomCollapsed,
    expandBottom,
    toggleMaximize,
    resetLayout,
    isCustomLayout,
  };
}
