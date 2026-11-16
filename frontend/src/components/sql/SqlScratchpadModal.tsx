import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../services/api';
import { Play, Terminal, X, RotateCcw, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface SqlScratchpadModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPreset?: {
    label?: string;
    schemaDdl: string;
    query: string;
  } | null;
}

interface ScratchPreset {
  id: string;
  label: string;
  schemaDdl: string;
  query: string;
}

const SCRATCH_PRESETS: ScratchPreset[] = [
  {
    id: 'employees',
    label: 'Employees & Salaries',
    schemaDdl: `CREATE TABLE Employee (
  id INTEGER PRIMARY KEY,
  name TEXT,
  department TEXT,
  salary INTEGER
);

INSERT INTO Employee (id, name, department, salary) VALUES
  (1, 'Aarav', 'Engineering', 95000),
  (2, 'Maya', 'Engineering', 110000),
  (3, 'Rohan', 'Product', 88000),
  (4, 'Neha', 'Product', 92000),
  (5, 'Kabir', 'Design', 82000);`,
    query: `SELECT
  department,
  COUNT(*) AS headcount,
  ROUND(AVG(salary), 2) AS avg_salary,
  MAX(salary) AS top_salary
FROM Employee
GROUP BY department
ORDER BY avg_salary DESC;`,
  },
  {
    id: 'orders',
    label: 'Customers & Orders',
    schemaDdl: `CREATE TABLE Customers (
  id INTEGER PRIMARY KEY,
  name TEXT,
  city TEXT
);

CREATE TABLE Orders (
  id INTEGER PRIMARY KEY,
  customer_id INTEGER,
  amount INTEGER,
  order_date TEXT
);

INSERT INTO Customers VALUES (1, 'Alice', 'Delhi'), (2, 'Bob', 'Mumbai'), (3, 'Chitra', 'Pune');
INSERT INTO Orders VALUES
  (101, 1, 1200, '2026-01-05'),
  (102, 1, 800, '2026-02-10'),
  (103, 2, 1500, '2026-02-14');`,
    query: `SELECT
  c.name,
  c.city,
  COALESCE(SUM(o.amount), 0) AS total_spent
FROM Customers c
LEFT JOIN Orders o ON c.id = o.customer_id
GROUP BY c.id, c.name, c.city
ORDER BY total_spent DESC;`,
  },
  {
    id: 'window',
    label: 'Window Ranking',
    schemaDdl: `CREATE TABLE Scores (
  player TEXT,
  season INTEGER,
  points INTEGER
);

INSERT INTO Scores VALUES
  ('Karan', 1, 240),
  ('Isha', 1, 310),
  ('Vikram', 1, 310),
  ('Karan', 2, 290),
  ('Isha', 2, 260);`,
    query: `SELECT
  season,
  player,
  points,
  DENSE_RANK() OVER (PARTITION BY season ORDER BY points DESC) AS rank_in_season
FROM Scores
ORDER BY season, rank_in_season, player;`,
  },
];

const SCRATCH_STORAGE_KEY = 'codeprep_sql_scratchpad_v1';

export const SqlScratchpadModal: React.FC<SqlScratchpadModalProps> = ({
  isOpen,
  onClose,
  initialPreset,
}) => {
  const [schemaDdl, setSchemaDdl] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(SCRATCH_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as { schemaDdl?: string };
        if (typeof parsed.schemaDdl === 'string') return parsed.schemaDdl;
      }
    } catch {}
    return SCRATCH_PRESETS[0].schemaDdl;
  });

  const [query, setQuery] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(SCRATCH_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as { query?: string };
        if (typeof parsed.query === 'string') return parsed.query;
      }
    } catch {}
    return SCRATCH_PRESETS[0].query;
  });

  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<{
    verdict: string;
    runtimeMs: number;
    columns: string[];
    rows: Array<Record<string, unknown>>;
    error?: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen && initialPreset) {
      setSchemaDdl(initialPreset.schemaDdl);
      setQuery(initialPreset.query);
      setResult(null);
    }
  }, [isOpen, initialPreset]);

  useEffect(() => {
    try {
      localStorage.setItem(SCRATCH_STORAGE_KEY, JSON.stringify({ schemaDdl, query }));
    } catch {}
  }, [schemaDdl, query]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleRun = async (explainOnly = false) => {
    setIsRunning(true);
    try {
      const res = await apiRequest<{
        result: {
          verdict: string;
          runtimeMs: number;
          columns: string[];
          rows: Array<Record<string, unknown>>;
          error?: string;
        };
      }>('/submissions/sql-scratch', {
        method: 'POST',
        body: JSON.stringify({ schemaDdl, query, explainOnly }),
      });
      setResult(res.result);
    } catch (err: unknown) {
      setResult({
        verdict: 'Query Error',
        runtimeMs: 0,
        columns: [],
        rows: [],
        error: err instanceof Error ? err.message : 'Query execution failed.',
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/65 backdrop-blur-[2px]" onClick={onClose} />
      <div
        role="dialog"
        aria-label="SQL Scratchpad"
        className="relative z-10 w-full max-w-5xl max-h-[90vh] rounded-2xl bg-surface border border-border-default shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-border-subtle bg-surface-elevated flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Terminal className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold text-text-primary">SQL Scratchpad</h2>
            <span className="text-[11px] font-mono text-text-muted">SQLite Sandbox</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {SCRATCH_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  setSchemaDdl(preset.schemaDdl);
                  setQuery(preset.query);
                  setResult(null);
                }}
                className="px-2.5 py-1 rounded-lg bg-surface-subtle hover:bg-surface-high border border-border-subtle text-[11px] text-text-secondary hover:text-text-primary transition-colors"
              >
                {preset.label}
              </button>
            ))}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close SQL Scratchpad"
              className="ml-2 p-1.5 rounded-lg bg-surface-subtle hover:bg-surface-high border border-border-subtle text-text-muted hover:text-text-primary"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono text-text-muted">
                <span>1. Schema &amp; Seed Data (CREATE / INSERT)</span>
                <button
                  type="button"
                  onClick={() => setSchemaDdl(SCRATCH_PRESETS[0].schemaDdl)}
                  className="inline-flex items-center gap-1 hover:text-text-primary"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              </div>
              <textarea
                value={schemaDdl}
                onChange={(e) => setSchemaDdl(e.target.value)}
                spellCheck={false}
                className="w-full h-56 p-3 rounded-xl bg-surface-subtle border border-border-subtle focus:border-primary/60 focus:outline-none font-mono text-xs text-text-primary leading-relaxed resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono text-text-muted">
                <span>2. Query (SELECT / WITH)</span>
                <span>Isolated per run</span>
              </div>
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                spellCheck={false}
                className="w-full h-56 p-3 rounded-xl bg-surface-subtle border border-border-subtle focus:border-primary/60 focus:outline-none font-mono text-xs text-text-primary leading-relaxed resize-none"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isRunning}
                onClick={() => void handleRun(false)}
                className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-black text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-60"
              >
                {isRunning ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-current" />
                )}
                <span>{isRunning ? 'Running...' : 'Run Query'}</span>
              </button>
              <button
                type="button"
                disabled={isRunning}
                onClick={() => void handleRun(true)}
                className="px-3.5 py-2 rounded-xl bg-surface-elevated hover:bg-surface-high border border-border-subtle text-xs font-mono text-text-secondary hover:text-text-primary transition-colors disabled:opacity-60"
              >
                Explain Plan
              </button>
            </div>

            {result && (
              <div className="flex items-center gap-2 text-xs font-mono">
                {result.error ? (
                  <span className="inline-flex items-center gap-1 text-danger">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Error</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-success">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>
                      {result.rows.length} row{result.rows.length === 1 ? '' : 's'} ({result.runtimeMs} ms)
                    </span>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Output */}
          {result && (
            <div className="rounded-xl border border-border-subtle bg-surface-subtle overflow-hidden">
              {result.error ? (
                <div className="p-4 text-xs font-mono text-danger whitespace-pre-wrap">
                  {result.error}
                </div>
              ) : result.columns.length === 0 ? (
                <div className="p-4 text-xs font-mono text-text-muted">
                  Query executed cleanly with 0 rows returned.
                </div>
              ) : (
                <div className="overflow-x-auto max-h-60">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-surface-elevated border-b border-border-subtle text-text-secondary">
                      <tr>
                        {result.columns.map((col) => (
                          <th key={col} className="py-2 px-3 font-semibold whitespace-nowrap">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                      {result.rows.map((row, ri) => (
                        <tr key={ri} className="hover:bg-surface-high/40">
                          {result.columns.map((col) => (
                            <td key={col} className="py-2 px-3 text-text-primary whitespace-nowrap">
                              {row[col] === null || row[col] === undefined ? (
                                <span className="text-text-muted italic">NULL</span>
                              ) : (
                                String(row[col])
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
