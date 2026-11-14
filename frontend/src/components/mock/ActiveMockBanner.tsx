import React, { useEffect, useState } from 'react';
import { ArrowLeft, Clock } from 'lucide-react';
import {
  ACTIVE_MOCK_STORAGE_KEY,
  ActiveMockSession,
} from '../../pages/MockInterviewPage';

interface ActiveMockBannerProps {
  isVisible: boolean;
  onReturnToMock: () => void;
}

function readActiveUnsubmittedMock(): ActiveMockSession | null {
  try {
    const raw = localStorage.getItem(ACTIVE_MOCK_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActiveMockSession;
    if (!parsed || parsed.submitted) return null;
    return parsed;
  } catch {
    return null;
  }
}

export const ActiveMockBanner: React.FC<ActiveMockBannerProps> = ({
  isVisible,
  onReturnToMock,
}) => {
  const [session, setSession] = useState<ActiveMockSession | null>(() =>
    readActiveUnsubmittedMock()
  );
  const [secsLeft, setSecsLeft] = useState<number>(0);

  useEffect(() => {
    const sync = () => {
      const active = readActiveUnsubmittedMock();
      setSession(active);
      if (active) {
        setSecsLeft(Math.max(0, Math.floor((active.expiresAtMs - Date.now()) / 1000)));
      }
    };
    sync();
    window.addEventListener('codeprep:mock-updated', sync);
    window.addEventListener('storage', sync);
    const id = window.setInterval(sync, 1000);
    return () => {
      window.removeEventListener('codeprep:mock-updated', sync);
      window.removeEventListener('storage', sync);
      window.clearInterval(id);
    };
  }, []);

  if (!isVisible || !session) return null;

  const mins = Math.floor(secsLeft / 60);
  const secs = secsLeft % 60;
  const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  return (
    <div className="fixed bottom-4 right-4 z-40 flex items-center gap-2.5 px-3.5 py-2 rounded-full bg-surface-elevated/95 backdrop-blur border border-primary/45 shadow-lg">
      <div className="flex items-center gap-1.5 text-xs font-mono text-primary font-semibold">
        <Clock className="w-3.5 h-3.5" />
        <span>Mock {formatted}</span>
      </div>
      <span className="text-[11px] text-text-secondary hidden sm:inline max-w-[140px] truncate">
        {session.trackName}
      </span>
      <button
        type="button"
        onClick={onReturnToMock}
        className="px-2.5 py-1 rounded-full bg-primary hover:bg-primary-hover text-white text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-3 h-3" />
        <span>Return to Mock</span>
      </button>
    </div>
  );
};
