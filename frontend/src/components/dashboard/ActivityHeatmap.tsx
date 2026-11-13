import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Info, ChevronDown, CalendarDays, Flame } from 'lucide-react';

export interface HeatmapDay {
  date: string; // YYYY-MM-DD
  count: number;
  acceptedCount: number;
  level: number;
}

interface ActivityHeatmapProps {
  data: HeatmapDay[];
  currentStreak: number;
  longestStreak: number;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface MonthBlock {
  key: string;
  label: string;
  columns: Array<Array<HeatmapDay | null>>;
}

function parseIsoUtcNoon(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map((v) => parseInt(v, 10));
  return new Date(Date.UTC(y || 2026, (m || 1) - 1, d || 1, 12, 0, 0));
}

function buildCalendarYearDays(year: number, lookup: Map<string, HeatmapDay>): HeatmapDay[] {
  const startMs = Date.UTC(year, 0, 1, 12, 0, 0);
  const endMs = Date.UTC(year, 11, 31, 12, 0, 0);
  const days: HeatmapDay[] = [];
  for (let ms = startMs; ms <= endMs; ms += 86_400_000) {
    const iso = new Date(ms).toISOString().split('T')[0];
    days.push(lookup.get(iso) || { date: iso, count: 0, acceptedCount: 0, level: 0 });
  }
  return days;
}

function computeMaxStreak(days: HeatmapDay[]): number {
  let max = 0;
  let cur = 0;
  for (const d of days) {
    if (d.count > 0) {
      cur++;
      if (cur > max) max = cur;
    } else {
      cur = 0;
    }
  }
  return max;
}

export const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({
  data,
  currentStreak,
  longestStreak,
}) => {
  const safeData = useMemo(() => (Array.isArray(data) ? data : []), [data]);
  const [selectedPeriod, setSelectedPeriod] = useState<'current' | string>('current');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<HeatmapDay | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const dayLookup = useMemo(() => {
    const map = new Map<string, HeatmapDay>();
    for (const item of safeData) {
      if (item?.date) map.set(item.date, item);
    }
    return map;
  }, [safeData]);

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    for (const item of safeData) {
      if (item?.date && item.date.length >= 4) {
        const y = parseInt(item.date.slice(0, 4), 10);
        if (!Number.isNaN(y)) years.add(y);
      }
    }
    if (years.size === 0) years.add(new Date().getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  }, [safeData]);

  const activeDaysList = useMemo(() => {
    if (selectedPeriod === 'current') return safeData;
    const yr = parseInt(selectedPeriod, 10);
    if (Number.isNaN(yr)) return safeData;
    return buildCalendarYearDays(yr, dayLookup);
  }, [selectedPeriod, safeData, dayLookup]);

  const monthBlocks: MonthBlock[] = useMemo(() => {
    if (activeDaysList.length === 0) return [];

    // Group sequential days by YYYY-MM
    const grouped: Array<{ key: string; monthIdx: number; days: HeatmapDay[] }> = [];
    for (const day of activeDaysList) {
      const monthKey = day.date.slice(0, 7);
      const monthIdx = Math.max(0, Math.min(11, parseInt(day.date.slice(5, 7), 10) - 1));
      const last = grouped[grouped.length - 1];
      if (!last || last.key !== monthKey) {
        grouped.push({ key: monthKey, monthIdx, days: [day] });
      } else {
        last.days.push(day);
      }
    }

    // Build Sun(0)..Sat(6) week columns per month block
    return grouped.map((group) => {
      const firstDate = parseIsoUtcNoon(group.days[0].date);
      const leadingEmpty = firstDate.getUTCDay();
      const columns: Array<Array<HeatmapDay | null>> = [];

      let currentCol: Array<HeatmapDay | null> = Array(leadingEmpty).fill(null);
      for (const day of group.days) {
        currentCol.push(day);
        if (currentCol.length === 7) {
          columns.push(currentCol);
          currentCol = [];
        }
      }
      if (currentCol.length > 0) {
        while (currentCol.length < 7) currentCol.push(null);
        columns.push(currentCol);
      }

      return {
        key: group.key,
        label: MONTH_NAMES[group.monthIdx] || '',
        columns,
      };
    });
  }, [activeDaysList]);

  const totalSubmissions = useMemo(
    () => activeDaysList.reduce((acc, d) => acc + (d.count || 0), 0),
    [activeDaysList]
  );

  const totalActiveDays = useMemo(
    () => activeDaysList.filter((d) => (d.count || 0) > 0).length,
    [activeDaysList]
  );

  const periodMaxStreak = useMemo(() => {
    if (selectedPeriod === 'current') {
      return Math.max(longestStreak, computeMaxStreak(activeDaysList));
    }
    return computeMaxStreak(activeDaysList);
  }, [selectedPeriod, longestStreak, activeDaysList]);

  const getLevelClass = (level: number) => {
    if (level === 1) return 'bg-[#0e4429]';
    if (level === 2) return 'bg-[#006d32]';
    if (level === 3) return 'bg-[#26a641]';
    if (level >= 4) return 'bg-[#39d353]';
    return '';
  };

  return (
    <div className="bg-surface rounded-2xl p-5 border border-border-subtle shadow-sm space-y-4">
      {/* Header matching LeetCode activity strip */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-lg font-bold text-text-primary tabular-nums">{totalSubmissions}</span>
          <span className="text-sm text-text-secondary">
            submissions in {selectedPeriod === 'current' ? 'the past one year' : selectedPeriod}
          </span>
          <span
            title="Includes every code run/submission recorded in your local SQLite history across DSA and SQL challenges."
            className="text-text-muted hover:text-text-secondary cursor-help inline-flex items-center"
          >
            <Info className="w-3.5 h-3.5" />
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs">
          <span className="text-text-muted">
            Total active days:{' '}
            <strong className="text-text-primary font-semibold tabular-nums">{totalActiveDays}</strong>
          </span>
          <span className="text-text-muted">
            Max streak:{' '}
            <strong className="text-text-primary font-semibold tabular-nums">{periodMaxStreak}</strong>
          </span>

          {/* Period / Year Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-elevated hover:bg-surface-high border border-border-subtle text-xs font-medium text-text-primary transition-colors"
            >
              <span>{selectedPeriod === 'current' ? 'Current' : selectedPeriod}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-text-muted transition-transform duration-150 ${
                  isDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-32 rounded-xl bg-surface-elevated border border-border-subtle shadow-xl py-1 z-30 animate-fade-up">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPeriod('current');
                    setSelectedDay(null);
                    setIsDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                    selectedPeriod === 'current'
                      ? 'text-primary font-semibold bg-primary-subtle/50'
                      : 'text-text-secondary hover:bg-surface-high hover:text-text-primary'
                  }`}
                >
                  Current
                </button>
                {availableYears.map((yr) => {
                  const key = String(yr);
                  return (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => {
                        setSelectedPeriod(key);
                        setSelectedDay(null);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs font-mono transition-colors ${
                        selectedPeriod === key
                          ? 'text-primary font-semibold bg-primary-subtle/50'
                          : 'text-text-secondary hover:bg-surface-high hover:text-text-primary'
                      }`}
                    >
                      {yr}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Month-Segmented Heatmap Matrix (Zero white outline tiles) */}
      <div className="w-full overflow-x-auto pb-1">
        <div className="flex items-start justify-between gap-2.5 min-w-max">
          {monthBlocks.map((month, mIdx) => {
            const showLabel = month.columns.length >= 2 || mIdx === 0;
            return (
              <div key={month.key} className="flex flex-col items-center shrink-0">
                <div className="flex gap-[3px]">
                  {month.columns.map((col, cIdx) => (
                    <div key={`${month.key}-c${cIdx}`} className="flex flex-col gap-[3px]">
                      {col.map((cell, rIdx) => {
                        if (!cell) {
                          return (
                            <span
                              key={`${month.key}-e-${cIdx}-${rIdx}`}
                              className="w-[10px] h-[10px] sm:w-[11px] sm:h-[11px] block"
                              aria-hidden="true"
                            />
                          );
                        }

                        const isSelected = selectedDay?.date === cell.date;
                        const levelClass = getLevelClass(cell.level);

                        return (
                          <button
                            key={cell.date}
                            type="button"
                            onClick={() => setSelectedDay(isSelected ? null : cell)}
                            style={cell.level === 0 ? { backgroundColor: 'var(--heatmap-empty)' } : undefined}
                            title={`${cell.date}: ${cell.count} submission${cell.count === 1 ? '' : 's'} (${cell.acceptedCount} accepted)`}
                            className={`w-[10px] h-[10px] sm:w-[11px] sm:h-[11px] rounded-[2px] border-0 transition-transform duration-150 hover:scale-125 ${levelClass} ${
                              isSelected ? 'ring-1 ring-primary ring-offset-1 ring-offset-surface' : ''
                            }`}
                            aria-label={`${cell.date}: ${cell.count} submissions`}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
                <span className="mt-2 text-[11px] text-text-muted font-medium tracking-tight h-4 leading-4">
                  {showLabel ? month.label : ''}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Inspection Strip + Less/More Scale */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border-subtle text-xs text-text-muted">
        <div className="flex items-center gap-2 font-mono">
          {selectedDay ? (
            <>
              <CalendarDays className="w-3.5 h-3.5 text-primary" />
              <span className="text-text-primary font-semibold">{selectedDay.date}</span>
              <span>·</span>
              <span>
                {selectedDay.count} submission{selectedDay.count === 1 ? '' : 's'} ({selectedDay.acceptedCount} accepted)
              </span>
              <button
                type="button"
                onClick={() => setSelectedDay(null)}
                className="text-text-muted hover:text-text-primary underline ml-1"
              >
                clear
              </button>
            </>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-primary" />
              <span>
                Current streak: <strong className="text-text-primary">{currentStreak}d</strong>
              </span>
              <span className="hidden sm:inline text-border-hover">·</span>
              <span className="hidden sm:inline">Click any square to inspect date activity</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
          <span>Less</span>
          <span
            className="w-[10px] h-[10px] rounded-[2px]"
            style={{ backgroundColor: 'var(--heatmap-empty)' }}
          />
          <span className="w-[10px] h-[10px] rounded-[2px] bg-[#0e4429]" />
          <span className="w-[10px] h-[10px] rounded-[2px] bg-[#006d32]" />
          <span className="w-[10px] h-[10px] rounded-[2px] bg-[#26a641]" />
          <span className="w-[10px] h-[10px] rounded-[2px] bg-[#39d353]" />
          <span>More</span>
        </div>
      </div>
    </div>
  );
};
