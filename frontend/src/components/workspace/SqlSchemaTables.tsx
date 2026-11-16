import React, { useMemo, useState } from 'react';
import { Table as TableIcon, CheckCircle2, Code2, Copy, Check } from 'lucide-react';

interface ParsedColumn {
  name: string;
  type: string;
  isPrimaryKey: boolean;
}

interface ParsedSqlTable {
  name: string;
  columns: ParsedColumn[];
  rows: Array<Array<string | number | null>>;
}

interface SqlSchemaTablesProps {
  schemaDdl?: string;
  expectedResult?: Array<Record<string, unknown>>;
  onInsertIdentifier?: (token: string) => void;
}

function splitTopLevelCommas(input: string): string[] {
  const parts: string[] = [];
  let current = '';
  let depth = 0;
  let inSingle = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (ch === "'") {
      if (inSingle && input[i + 1] === "'") {
        current += "''";
        i++;
        continue;
      }
      inSingle = !inSingle;
    } else if (!inSingle) {
      if (ch === '(') depth++;
      else if (ch === ')') depth = Math.max(0, depth - 1);
      else if (ch === ',' && depth === 0) {
        if (current.trim()) parts.push(current.trim());
        current = '';
        continue;
      }
    }
    current += ch;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

function parseValueLiteral(rawToken: string): string | number | null {
  const token = rawToken.trim();
  if (/^NULL$/i.test(token)) return null;
  if (token.startsWith("'") && token.endsWith("'") && token.length >= 2) {
    return token.slice(1, -1).replace(/''/g, "'");
  }
  if (/^-?\d+(\.\d+)?$/.test(token)) {
    const num = Number(token);
    if (!Number.isNaN(num)) return num;
  }
  return token;
}

function parseInsertTuples(valuesClause: string): Array<Array<string | number | null>> {
  const tuples: Array<Array<string | number | null>> = [];
  let i = 0;
  const len = valuesClause.length;

  while (i < len) {
    if (valuesClause[i] !== '(') {
      i++;
      continue;
    }
    i++; // skip '('
    let depth = 1;
    let inSingle = false;
    let tupleBody = '';
    while (i < len && depth > 0) {
      const ch = valuesClause[i];
      if (ch === "'") {
        if (inSingle && valuesClause[i + 1] === "'") {
          tupleBody += "''";
          i += 2;
          continue;
        }
        inSingle = !inSingle;
      } else if (!inSingle) {
        if (ch === '(') depth++;
        else if (ch === ')') {
          depth--;
          if (depth === 0) {
            i++;
            break;
          }
        }
      }
      tupleBody += ch;
      i++;
    }
    const rawValues = splitTopLevelCommas(tupleBody);
    tuples.push(rawValues.map(parseValueLiteral));
  }

  return tuples;
}

function parseSqlDdl(ddl: string): ParsedSqlTable[] {
  const tablesMap = new Map<string, ParsedSqlTable>();
  const orderedNames: string[] = [];

  // Strip SQL line comments
  const cleaned = ddl.replace(/--[^\n\r]*/g, ' ');

  // Split statements by semicolon respecting single quotes
  const statements: string[] = [];
  let cur = '';
  let inSingle = false;
  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (ch === "'") {
      if (inSingle && cleaned[i + 1] === "'") {
        cur += "''";
        i++;
        continue;
      }
      inSingle = !inSingle;
    } else if (ch === ';' && !inSingle) {
      if (cur.trim()) statements.push(cur.trim());
      cur = '';
      continue;
    }
    cur += ch;
  }
  if (cur.trim()) statements.push(cur.trim());

  for (const stmt of statements) {
    const createMatch = stmt.match(/^CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["`]?([a-zA-Z_][a-zA-Z0-9_]*)["`]?\s*\(([\s\S]+)\)$/i);
    if (createMatch) {
      const tableName = createMatch[1];
      const body = createMatch[2];
      const colDefs = splitTopLevelCommas(body);
      const columns: ParsedColumn[] = [];

      for (const def of colDefs) {
        if (/^(?:PRIMARY|FOREIGN|UNIQUE|CHECK|CONSTRAINT)\b/i.test(def)) continue;
        const parts = def.trim().split(/\s+/);
        if (parts.length < 2) continue;
        const name = parts[0].replace(/["`]/g, '');
        const isPk = /\bPRIMARY\s+KEY\b/i.test(def);
        const typeStr = parts
          .slice(1)
          .join(' ')
          .replace(/\bPRIMARY\s+KEY\b/gi, '')
          .replace(/\bNOT\s+NULL\b/gi, '')
          .replace(/\bAUTOINCREMENT\b/gi, '')
          .trim();
        columns.push({ name, type: typeStr || 'TEXT', isPrimaryKey: isPk });
      }

      if (!tablesMap.has(tableName)) {
        orderedNames.push(tableName);
      }
      tablesMap.set(tableName, { name: tableName, columns, rows: [] });
      continue;
    }

    const insertMatch = stmt.match(
      /^INSERT\s+INTO\s+["`]?([a-zA-Z_][a-zA-Z0-9_]*)["`]?(?:\s*\(([^)]+)\))?\s+VALUES\s+([\s\S]+)$/i
    );
    if (insertMatch) {
      const tableName = insertMatch[1];
      const explicitCols = insertMatch[2]
        ? insertMatch[2].split(',').map((c) => c.trim().replace(/["`]/g, ''))
        : null;
      const valuesPart = insertMatch[3];
      const parsedRows = parseInsertTuples(valuesPart);

      let table = tablesMap.get(tableName);
      if (!table) {
        const inferredCols: ParsedColumn[] = (explicitCols || []).map((c) => ({
          name: c,
          type: 'TEXT',
          isPrimaryKey: false,
        }));
        table = { name: tableName, columns: inferredCols, rows: [] };
        tablesMap.set(tableName, table);
        orderedNames.push(tableName);
      }

      for (const tuple of parsedRows) {
        if (explicitCols && table.columns.length > 0) {
          const orderedRow = table.columns.map((col) => {
            const idx = explicitCols.findIndex((c) => c.toLowerCase() === col.name.toLowerCase());
            return idx >= 0 && idx < tuple.length ? tuple[idx] : null;
          });
          table.rows.push(orderedRow);
        } else {
          table.rows.push(tuple);
        }
      }
    }
  }

  return orderedNames.map((name) => tablesMap.get(name)!);
}

function renderCellValue(val: unknown): React.ReactNode {
  if (val === null || val === undefined) {
    return <span className="text-text-muted/70 italic text-[11px]">null</span>;
  }
  return String(val);
}

export const SqlSchemaTables: React.FC<SqlSchemaTablesProps> = ({
  schemaDdl,
  expectedResult,
  onInsertIdentifier,
}) => {
  const [showRawDdl, setShowRawDdl] = useState(false);
  const [copiedDdl, setCopiedDdl] = useState(false);

  const parsedTables = useMemo(() => (schemaDdl ? parseSqlDdl(schemaDdl) : []), [schemaDdl]);
  const expectedColumns = useMemo(() => {
    if (!Array.isArray(expectedResult) || expectedResult.length === 0) return [];
    return Object.keys(expectedResult[0]);
  }, [expectedResult]);

  const handleCopyDdl = () => {
    if (!schemaDdl) return;
    navigator.clipboard.writeText(schemaDdl);
    setCopiedDdl(true);
    setTimeout(() => setCopiedDdl(false), 1800);
  };

  return (
    <div className="space-y-4">
      {/* Input Schema Tables */}
      {parsedTables.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-text-primary uppercase tracking-wider">
              <TableIcon className="w-3.5 h-3.5 text-primary" />
              <span>Input Tables ({parsedTables.length})</span>
            </div>

            {schemaDdl && (
              <button
                type="button"
                onClick={() => setShowRawDdl((prev) => !prev)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-elevated hover:bg-surface-high border border-border-subtle text-[11px] font-mono text-text-secondary hover:text-text-primary transition-colors"
              >
                <Code2 className="w-3 h-3 text-primary" />
                <span>{showRawDdl ? 'Hide Raw DDL' : 'View Raw DDL'}</span>
              </button>
            )}
          </div>

          {parsedTables.map((table) => (
            <div
              key={table.name}
              className="rounded-xl border border-border-subtle bg-surface-subtle overflow-hidden"
            >
              <div className="px-3.5 py-2 bg-surface-elevated/70 border-b border-border-subtle flex flex-wrap items-center justify-between gap-2">
                {onInsertIdentifier ? (
                  <button
                    type="button"
                    onClick={() => onInsertIdentifier(table.name)}
                    title={`Insert table name '${table.name}' into SQL editor`}
                    className="font-mono text-xs font-bold text-text-primary hover:text-primary transition-colors cursor-pointer"
                  >
                    Table: <span className="text-primary underline decoration-dotted">{table.name}</span>
                  </button>
                ) : (
                  <span className="font-mono text-xs font-bold text-text-primary">
                    Table: <span className="text-primary">{table.name}</span>
                  </span>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {table.columns.map((col) => {
                    const isFkLike = !col.isPrimaryKey && /(_id|Id)$/.test(col.name);
                    const badgeClasses = `px-1.5 py-0.5 rounded bg-surface border font-mono text-[10px] inline-flex items-center gap-1 transition-colors ${
                      col.isPrimaryKey
                        ? 'border-amber-500/40 text-amber-400'
                        : isFkLike
                        ? 'border-sky-500/35 text-sky-400'
                        : 'border-border-subtle text-text-muted'
                    } ${onInsertIdentifier ? 'hover:border-primary/60 hover:text-primary cursor-pointer' : ''}`;

                    const content = (
                      <>
                        {col.isPrimaryKey && <span className="text-[9px] font-bold">PK</span>}
                        {isFkLike && <span className="text-[9px] font-bold">FK</span>}
                        <span>{col.name}:</span>
                        <span className="text-text-secondary">{col.type.split(' ')[0]}</span>
                      </>
                    );

                    return onInsertIdentifier ? (
                      <button
                        key={col.name}
                        type="button"
                        onClick={() => onInsertIdentifier(col.name)}
                        title={`Insert column '${col.name}' at cursor`}
                        className={badgeClasses}
                      >
                        {content}
                      </button>
                    ) : (
                      <span key={col.name} className={badgeClasses}>
                        {content}
                      </span>
                    );
                  })}
                </div>
              </div>

              {table.rows.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse font-mono text-xs">
                    <thead>
                      <tr className="border-b border-border-subtle bg-surface-subtle text-text-muted text-[11px]">
                        {table.columns.map((col) => (
                          <th key={col.name} className="py-2 px-3 font-semibold whitespace-nowrap">
                            {onInsertIdentifier ? (
                              <button
                                type="button"
                                onClick={() => onInsertIdentifier(col.name)}
                                title={`Click to insert '${col.name}' into editor`}
                                className="hover:text-primary transition-colors cursor-pointer"
                              >
                                {col.name}
                              </button>
                            ) : (
                              col.name
                            )}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                      {table.rows.map((row, rIdx) => (
                        <tr
                          key={rIdx}
                          className={rIdx % 2 === 0 ? 'bg-surface/40' : 'bg-surface-elevated/25'}
                        >
                          {table.columns.map((_, cIdx) => (
                            <td key={cIdx} className="py-1.5 px-3 text-text-primary whitespace-nowrap">
                              {renderCellValue(row[cIdx])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Collapsible Raw DDL */}
      {(showRawDdl || parsedTables.length === 0) && schemaDdl && (
        <div className="rounded-xl border border-border-subtle bg-surface-subtle overflow-hidden">
          <div className="px-3.5 py-2 bg-surface-elevated/70 border-b border-border-subtle flex items-center justify-between text-[11px] font-mono text-text-muted">
            <span>SQLite / ANSI Schema DDL</span>
            <button
              type="button"
              onClick={handleCopyDdl}
              className="inline-flex items-center gap-1 text-text-secondary hover:text-text-primary transition-colors"
            >
              {copiedDdl ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
              <span>{copiedDdl ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <pre className="p-3.5 font-mono text-xs text-text-secondary overflow-x-auto leading-relaxed">
            {schemaDdl}
          </pre>
        </div>
      )}

      {/* Expected Output Table */}
      {expectedColumns.length > 0 && expectedResult && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-success uppercase tracking-wider">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Expected Output</span>
          </div>

          <div className="rounded-xl border border-success/25 bg-surface-subtle overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse font-mono text-xs">
                <thead>
                  <tr className="border-b border-border-subtle bg-success-subtle/30 text-text-secondary text-[11px]">
                    {expectedColumns.map((col) => (
                      <th key={col} className="py-2 px-3 font-semibold whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {expectedResult.map((row, rIdx) => (
                    <tr
                      key={rIdx}
                      className={rIdx % 2 === 0 ? 'bg-surface/40' : 'bg-surface-elevated/25'}
                    >
                      {expectedColumns.map((col) => (
                        <td key={col} className="py-1.5 px-3 text-text-primary whitespace-nowrap">
                          {renderCellValue(row[col])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

