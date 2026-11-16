import React, { useMemo, useState } from 'react';
import { SubmissionHistoryItem } from '../../types/problem';
import { buildSimpleLineDiff } from '../../utils/lineDiff';

interface SubmissionDiffViewerProps {
  baseSubmission: SubmissionHistoryItem;
  allSubmissions: SubmissionHistoryItem[];
  currentCode?: string;
}

export const SubmissionDiffViewer: React.FC<SubmissionDiffViewerProps> = ({
  baseSubmission,
  allSubmissions,
  currentCode = '',
}) => {
  const otherSubmissions = useMemo(
    () => allSubmissions.filter((s) => s.id !== baseSubmission.id && Boolean(s.code)),
    [allSubmissions, baseSubmission.id]
  );

  const [compareTarget, setCompareTarget] = useState<string>(() =>
    currentCode ? 'current' : otherSubmissions[0]?.id || 'current'
  );

  const targetMeta = useMemo(() => {
    if (compareTarget === 'current' || !otherSubmissions.some((s) => s.id === compareTarget)) {
      return {
        label: 'Current Editor',
        code: currentCode,
      };
    }
    const found = otherSubmissions.find((s) => s.id === compareTarget)!;
    const dateStr = new Date(found.submittedAt).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    return {
      label: `${found.verdict} (${dateStr})`,
      code: found.code,
    };
  }, [compareTarget, currentCode, otherSubmissions]);

  const diffLines = useMemo(
    () => buildSimpleLineDiff(baseSubmission.code, targetMeta.code),
    [baseSubmission.code, targetMeta.code]
  );

  const addedCount = useMemo(
    () => diffLines.filter((d) => d.type === 'add').length,
    [diffLines]
  );
  const removedCount = useMemo(
    () => diffLines.filter((d) => d.type === 'del').length,
    [diffLines]
  );

  return (
    <div className="border-t border-border-subtle bg-canvas">
      <div className="px-3 py-2 bg-surface flex flex-wrap items-center justify-between gap-2 border-b border-border-subtle text-[11px] font-mono text-text-muted">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-danger">− This Submission</span>
          <span>vs</span>
          <span className="text-success truncate">+ {targetMeta.label}</span>
          <span className="px-1.5 py-0.2 rounded bg-surface-elevated border border-border-subtle text-[10px]">
            <span className="text-success">+{addedCount}</span>{' '}
            <span className="text-danger">−{removedCount}</span>
          </span>
        </div>

        {(otherSubmissions.length > 0 || Boolean(currentCode)) && (
          <select
            value={compareTarget}
            onChange={(e) => setCompareTarget(e.target.value)}
            aria-label="Compare submission target"
            className="bg-surface-elevated border border-border-subtle rounded px-2 py-0.5 text-[11px] text-text-primary focus:outline-none focus:border-primary"
          >
            {currentCode && <option value="current">Current Editor</option>}
            {otherSubmissions.map((other, idx) => {
              const t = new Date(other.submittedAt).toLocaleString([], {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });
              return (
                <option key={other.id} value={other.id}>
                  #{otherSubmissions.length - idx}: {other.verdict}
                  {typeof other.runtimeMs === 'number' ? ` (${other.runtimeMs}ms)` : ''} · {t}
                </option>
              );
            })}
          </select>
        )}
      </div>

      <div className="max-h-64 overflow-auto font-mono text-[11.5px] leading-5 p-2 space-y-0.5">
        {diffLines.map((d, di) => (
          <div
            key={di}
            className={`px-2 rounded whitespace-pre ${
              d.type === 'add'
                ? 'bg-success/15 text-success'
                : d.type === 'del'
                ? 'bg-danger/15 text-danger'
                : 'text-text-secondary'
            }`}
          >
            {d.type === 'add' ? '+ ' : d.type === 'del' ? '- ' : '  '}
            {d.text}
          </div>
        ))}
      </div>
    </div>
  );
};
