import React from 'react';
import { Code2, Database } from 'lucide-react';

interface TopicStat {
  topic: string;
  total: number;
  solved: number;
  accuracy: number;
}

interface LeetCodeSkillsPanelProps {
  topics: TopicStat[];
  dsaSolved: number;
  dsaTotal: number;
  sqlSolved: number;
  sqlTotal: number;
  onSelectTopic?: (topic: string) => void;
  onNavigate?: (tab: string) => void;
}

export const LeetCodeSkillsPanel: React.FC<LeetCodeSkillsPanelProps> = ({
  topics,
  dsaSolved,
  dsaTotal,
  sqlSolved,
  sqlTotal,
  onSelectTopic,
  onNavigate,
}) => {
  const sortedTopics = [...topics]
    .sort((a, b) => b.total - a.total)
    .slice(0, 12);

  return (
    <div className="bg-surface rounded-2xl p-5 flex flex-col gap-5 shadow-sm border border-border-subtle transition-colors">
      {/* Languages & Engines */}
      <div>
        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3 font-mono">
          Active Tracks
        </h3>
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => onNavigate?.('dsa')}
            className="w-full flex items-center justify-between text-xs py-2 px-2.5 rounded-lg bg-surface-elevated hover:bg-surface-high border border-border-subtle transition-colors"
          >
            <div className="flex items-center gap-2 text-text-primary font-medium">
              <Code2 className="w-3.5 h-3.5 text-primary" />
              <span>C++17 (DSA)</span>
            </div>
            <div className="text-text-muted font-mono">
              <strong className="text-text-primary">{dsaSolved}</strong> / {dsaTotal}
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate?.('sql')}
            className="w-full flex items-center justify-between text-xs py-2 px-2.5 rounded-lg bg-surface-elevated hover:bg-surface-high border border-border-subtle transition-colors"
          >
            <div className="flex items-center gap-2 text-text-primary font-medium">
              <Database className="w-3.5 h-3.5 text-sky-400" />
              <span>SQL Query Lab</span>
            </div>
            <div className="text-text-muted font-mono">
              <strong className="text-text-primary">{sqlSolved}</strong> / {sqlTotal}
            </div>
          </button>
        </div>
      </div>

      {/* Topic Proficiency Pills (Interactive) */}
      <div className="border-t border-border-subtle pt-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider font-mono">
            Topic Breakdown
          </h3>
          <span className="text-[11px] text-text-muted">Click to filter</span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {sortedTopics.map((t) => (
            <button
              key={t.topic}
              type="button"
              onClick={() => onSelectTopic?.(t.topic)}
              title={`${t.topic}: ${t.solved}/${t.total} solved (${t.accuracy}% accuracy)`}
              className="px-2.5 py-1 rounded-full bg-surface-elevated hover:bg-surface-high border border-border-subtle hover:border-primary/40 text-xs text-text-secondary flex items-center gap-1.5 transition-colors"
            >
              <span className="truncate max-w-[125px] text-text-primary font-medium">{t.topic}</span>
              <span className="text-text-muted text-[11px] font-mono">
                {t.solved}/{t.total}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
