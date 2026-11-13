import { useState, useEffect } from 'react';

export interface PotdDayHistoryItem {
  date: string;
  problemId: number;
  title: string;
  difficulty: string;
  solved: boolean;
  isToday: boolean;
}

export interface PotdSummary {
  date: string;
  id: number;
  slug: string;
  title: string;
  difficulty: string;
  category: string;
  topic: string;
  solvedToday: boolean;
  solvedAt: string | null;
  streakMaintained: boolean;
  distributionLabel: string;
  nextResetIso: string;
  recentDays: PotdDayHistoryItem[];
}

export function formatCountdown(targetIso?: string | null): string {
  if (!targetIso) return '--:--:--';
  const diffMs = Math.max(0, new Date(targetIso).getTime() - Date.now());
  const totalSec = Math.floor(diffMs / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function usePotdCountdown(nextResetIso?: string | null): string {
  const [countdown, setCountdown] = useState<string>(() => formatCountdown(nextResetIso));

  useEffect(() => {
    setCountdown(formatCountdown(nextResetIso));
    if (!nextResetIso) return;
    const id = window.setInterval(() => {
      setCountdown(formatCountdown(nextResetIso));
    }, 1000);
    return () => window.clearInterval(id);
  }, [nextResetIso]);

  return countdown;
}

