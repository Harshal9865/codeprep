import React from 'react';
import { Layers } from 'lucide-react';

export interface TopicStat {
  topic: string;
  total: number;
  solved: number;
  accuracy: number;
}

interface TopicBreakdownProps {
  stats: TopicStat[];
}

export const TopicBreakdown: React.FC<TopicBreakdownProps> = ({ stats }) => {
  return (
    <div className="bg-surface border border-border-default rounded-2xl p-6 shadow-xs">
      <div className="flex items-center justify-between pb-4 border-b border-border-subtle">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            <h2 className="font-headline font-bold text-base text-text-primary">
              Topic Mastery Breakdown
            </h2>
          </div>
          <p className="text-xs text-text-secondary mt-0.5">
            Progress and submission accuracy categorized by algorithmic paradigm
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {stats.map((item) => {
          const percentage = item.total > 0 ? Math.round((item.solved / item.total) * 100) : 0;

          return (
            <div
              key={item.topic}
              className="p-3.5 rounded-xl border border-border-subtle bg-surface-elevated/60 flex flex-col justify-between space-y-2 hover:border-primary/40 transition-colors"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-text-primary line-clamp-1">{item.topic}</span>
                <span className="font-mono text-text-muted shrink-0 ml-2">
                  {item.solved}/{item.total} ({percentage}%)
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-surface-high h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-500"
                  style={{ width: `${percentage}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-text-muted">
                <span>Accuracy</span>
                <span className="font-mono font-medium text-emerald-400">{item.accuracy}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
