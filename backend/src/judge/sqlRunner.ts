import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { Logger } from '../utils/logger';

export interface SqlExecutionResult {
  verdict: 'Accepted' | 'Wrong Answer' | 'Time Limit Exceeded' | 'Query Error';
  columns: string[];
  rows: Array<Record<string, unknown>>;
  runtimeMs: number;
  error?: string;
  expectedColumns?: string[];
  expectedRows?: Array<Record<string, unknown>>;
}

const DEFAULT_EMPLOYEE_DDL = `
CREATE TABLE IF NOT EXISTS Employee (
  id INTEGER PRIMARY KEY,
  name TEXT,
  salary INTEGER,
  departmentId INTEGER
);
DELETE FROM Employee;
INSERT INTO Employee (id, name, salary, departmentId) VALUES
  (1, 'Joe', 70000, 1),
  (2, 'Jim', 90000, 1),
  (3, 'Henry', 80000, 2),
  (4, 'Sam', 60000, 2),
  (5, 'Max', 90000, 1);
`;

export class SqlRunner {
  private static readonly DISALLOWED_KEYWORDS = [
    'DROP',
    'ALTER',
    'TRUNCATE',
    'GRANT',
    'REVOKE',
    'COPY',
    'VACUUM',
    'SHUTDOWN',
    'ATTACH',
    'DETACH',
    'PRAGMA',
    'DELETE',
    'UPDATE',
    'INSERT',
    'CREATE',
  ];

  /**
   * Strips SQL comments and quoted string literals before keyword scanning.
   */
  private static stripCommentsAndStrings(sql: string): string {
    return sql
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/--[^\n\r]*/g, ' ')
      .replace(/'(?:''|[^'])*'/g, "''")
      .replace(/"(?:""|[^"])*"/g, '""');
  }

  /**
   * Strips leading/trailing comments and trailing semicolons cleanly.
   */
  private static stripComments(sql: string): string {
    return sql
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/--[^\n\r]*/g, ' ')
      .trim()
      .replace(/;+\s*$/, '');
  }

  /**
   * Splits multi-statement DDL scripts cleanly respecting string quotes.
   */
  private static splitSqlStatements(script: string): string[] {
    const statements: string[] = [];
    let current = '';
    let inSingleQuote = false;
    let inDoubleQuote = false;

    for (let i = 0; i < script.length; i++) {
      const ch = script[i];
      if (ch === "'" && !inDoubleQuote) {
        if (inSingleQuote && script[i + 1] === "'") {
          current += "''";
          i++;
          continue;
        }
        inSingleQuote = !inSingleQuote;
      } else if (ch === '"' && !inSingleQuote) {
        if (inDoubleQuote && script[i + 1] === '"') {
          current += '""';
          i++;
          continue;
        }
        inDoubleQuote = !inDoubleQuote;
      } else if (ch === ';' && !inSingleQuote && !inDoubleQuote) {
        const trimmed = current.trim();
        if (trimmed) statements.push(trimmed);
        current = '';
        continue;
      }
      current += ch;
    }

    const tail = current.trim();
    if (tail) statements.push(tail);
    return statements;
  }

  /**
   * Converts common PostgreSQL DDL syntax into SQLite-compatible DDL.
   */
  private static normalizePostgresDdl(ddl: string): string {
    return ddl
      .replace(/\bBIGSERIAL\s+PRIMARY\s+KEY\b/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT')
      .replace(/\bSERIAL\s+PRIMARY\s+KEY\b/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT')
      .replace(/\bCHARACTER\s+VARYING\s*\([^)]+\)/gi, 'TEXT')
      .replace(/\bVARCHAR\s*\([^)]+\)/gi, 'TEXT')
      .replace(/\bCHAR\s*\([^)]+\)/gi, 'TEXT')
      .replace(/\b(?:DECIMAL|NUMERIC)\s*\([^)]+\)/gi, 'REAL')
      .replace(/\bBOOLEAN\b/gi, 'INTEGER')
      .replace(/\bTIMESTAMP(?:\s+WITHOUT\s+TIME\s+ZONE)?\b/gi, 'TEXT');
  }

  /**
   * Converts common PostgreSQL query idioms into SQLite-compatible SQL.
   */
  private static normalizePostgresQuery(query: string): string {
    return query
      .replace(
        /(\b[a-zA-Z_][a-zA-Z0-9_.]*|\))\s*::\s*(int|integer|bigint|smallint|numeric|decimal|float|real|text|varchar)\b/gi,
        (_m, expr: string, typeName: string) => {
          const t = typeName.toLowerCase();
          if (t === 'text' || t === 'varchar') return `CAST(${expr} AS TEXT)`;
          if (t === 'numeric' || t === 'decimal' || t === 'float' || t === 'real') {
            return `CAST(${expr} AS REAL)`;
          }
          return `CAST(${expr} AS INTEGER)`;
        }
      )
      .replace(/\bILIKE\b/gi, 'LIKE')
      .replace(/\bNOW\s*\(\s*\)/gi, 'CURRENT_TIMESTAMP')
      .replace(/\bYEAR\s*\(([^)]+)\)/gi, "CAST(strftime('%Y', $1) AS INTEGER)")
      .replace(/\bMONTH\s*\(([^)]+)\)/gi, "CAST(strftime('%m', $1) AS INTEGER)")
      .replace(/\bDAY\s*\(([^)]+)\)/gi, "CAST(strftime('%d', $1) AS INTEGER)")
      .replace(/\bDATEDIFF\s*\(([^,]+),([^)]+)\)/gi, 'CAST(julianday($1) - julianday($2) AS INTEGER)');
  }

  private static normalizeCellValue(val: unknown): unknown {
    if (typeof val === 'bigint') {
      return Number(val);
    }
    if (val instanceof Date) {
      return val.toISOString();
    }
    return val;
  }

  private static sanitizeRows(rawRows: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
    return rawRows.map((row) => {
      const normalized: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(row)) {
        normalized[key] = SqlRunner.normalizeCellValue(value);
      }
      return normalized;
    });
  }

  /**
   * Validates query syntax for write/administrative commands and ensures single read-only query.
   */
  static validateQuerySecurity(sql: string): { safe: boolean; error?: string } {
    const cleaned = SqlRunner.stripComments(sql);
    if (!cleaned) {
      return {
        safe: false,
        error: 'SQL query cannot be empty.',
      };
    }

    const statements = SqlRunner.splitSqlStatements(cleaned);
    if (statements.length > 1) {
      return {
        safe: false,
        error: 'Only a single SELECT or WITH query statement is allowed per execution.',
      };
    }

    const unscoped = SqlRunner.stripCommentsAndStrings(cleaned).toUpperCase();
    if (/\bREPLACE\s+INTO\b/i.test(unscoped)) {
      return {
        safe: false,
        error: 'Prohibited keyword "REPLACE INTO": Only read-only SELECT / WITH queries are permitted.',
      };
    }
    for (const kw of SqlRunner.DISALLOWED_KEYWORDS) {
      const regex = new RegExp(`\\b${kw}\\b`, 'i');
      if (regex.test(unscoped)) {
        return {
          safe: false,
          error: `Prohibited keyword "${kw}": Only read-only SELECT / WITH queries are permitted.`,
        };
      }
    }

    const strippedUpper = unscoped.trim();
    if (!strippedUpper.startsWith('SELECT') && !strippedUpper.startsWith('WITH')) {
      return {
        safe: false,
        error: 'Query must begin with a valid SELECT or WITH statement.',
      };
    }

    return { safe: true };
  }

  /**
   * Executes SQL query inside an ephemeral, isolated per-submission SQLite sandbox.
   */
  static async executeQuery(
    userQuery: string,
    schemaDdl: string,
    expectedQuery: string,
    expectedOutputJson: string
  ): Promise<SqlExecutionResult> {
    const startTime = Date.now();

    const security = SqlRunner.validateQuerySecurity(userQuery);
    if (!security.safe) {
      return {
        verdict: 'Query Error',
        columns: [],
        rows: [],
        runtimeMs: Math.max(1, Date.now() - startTime),
        error: security.error,
      };
    }

    const tmpDbPath = path.join(os.tmpdir(), `codeprep-sql-${crypto.randomUUID()}.db`);
    const dbUrl = `file:${tmpDbPath.replace(/\\/g, '/')}`;
    const sandboxDb = new PrismaClient({
      log: ['error'],
      datasources: { db: { url: dbUrl } },
    });

    try {
      await sandboxDb.$connect();

      // 1. Seed isolated tables from schemaDdl (with Employee fallback)
      const ddlSource = schemaDdl && schemaDdl.trim().length > 0 ? schemaDdl : DEFAULT_EMPLOYEE_DDL;
      const ddlStatements = SqlRunner.splitSqlStatements(SqlRunner.normalizePostgresDdl(ddlSource));
      for (const stmt of ddlStatements) {
        await sandboxDb.$executeRawUnsafe(stmt);
      }

      // 2. Run user query cleanly
      const cleanedUserSql = SqlRunner.normalizePostgresQuery(SqlRunner.stripComments(userQuery));
      const execStart = Date.now();
      const rawActualRows = await sandboxDb.$queryRawUnsafe<Array<Record<string, unknown>>>(cleanedUserSql);
      const queryElapsedMs = Math.max(1, Date.now() - execStart);
      const actualRows = SqlRunner.sanitizeRows(rawActualRows);
      const actualColumns = actualRows.length > 0 ? Object.keys(actualRows[0]) : [];

      // 3. Determine expected result set: run expectedQuery on the exact seeded DB first, fallback to JSON
      let expectedRows: Array<Record<string, unknown>> = [];
      let parsedFallback: Array<Record<string, unknown>> = [];
      try {
        parsedFallback = JSON.parse(expectedOutputJson || '[]');
      } catch {
        parsedFallback = [];
      }

      const trimmedExpectedQuery = SqlRunner.stripComments(expectedQuery || '');
      if (trimmedExpectedQuery) {
        try {
          const normalizedExpectedSql = SqlRunner.normalizePostgresQuery(trimmedExpectedQuery);
          const rawExpected = await sandboxDb.$queryRawUnsafe<Array<Record<string, unknown>>>(normalizedExpectedSql);
          expectedRows = SqlRunner.sanitizeRows(rawExpected);
        } catch (expectedErr) {
          Logger.warn('SqlRunner', 'Expected query execution fell back to expectedOutputJson', expectedErr);
          expectedRows = parsedFallback;
        }
      } else {
        expectedRows = parsedFallback;
      }

      const expectedColumns = expectedRows.length > 0 ? Object.keys(expectedRows[0]) : [];
      const requireOrder = /\bORDER\s+BY\b/i.test(trimmedExpectedQuery || cleanedUserSql);

      const isMatch = SqlRunner.compareResults(actualRows, expectedRows, requireOrder);

      return {
        verdict: isMatch ? 'Accepted' : 'Wrong Answer',
        columns: actualColumns.length > 0 ? actualColumns : expectedColumns,
        rows: actualRows,
        runtimeMs: queryElapsedMs,
        expectedColumns,
        expectedRows,
        error: isMatch
          ? undefined
          : actualRows.length !== expectedRows.length
          ? `Row count mismatch: returned ${actualRows.length} row${actualRows.length === 1 ? '' : 's'}, expected ${expectedRows.length}.`
          : 'Output columns or values do not match the expected result set.',
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Database execution failed.';
      // Clean Prisma wrapper noise so SQL syntax / column errors are easy to read
      const conciseError = msg.replace(/[\s\S]*Message:\s*/i, '').trim() || msg;
      return {
        verdict: 'Query Error',
        columns: [],
        rows: [],
        runtimeMs: Math.max(1, Date.now() - startTime),
        error: conciseError,
      };
    } finally {
      try {
        await sandboxDb.$disconnect();
      } catch {}
      for (const suffix of ['', '-wal', '-shm', '-journal']) {
        const candidate = `${tmpDbPath}${suffix}`;
        if (fs.existsSync(candidate)) {
          try {
            fs.unlinkSync(candidate);
          } catch {}
        }
      }
    }
  }

  /**
   * Compares two result sets: checks row count, columns, and cell values with numeric tolerance.
   */
  static compareResults(
    actualRows: Array<Record<string, unknown>>,
    expectedRows: Array<Record<string, unknown>>,
    requireOrder = false
  ): boolean {
    if (actualRows.length !== expectedRows.length) return false;
    if (actualRows.length === 0) return true;

    const actualKeysLower = Object.keys(actualRows[0]).map((k) => k.toLowerCase()).sort();
    const expectedKeysLower = Object.keys(expectedRows[0]).map((k) => k.toLowerCase()).sort();
    if (JSON.stringify(actualKeysLower) !== JSON.stringify(expectedKeysLower)) {
      return false;
    }

    const normalizeVal = (val: unknown): string => {
      if (val === null || val === undefined) return 'NULL';
      if (typeof val === 'number') {
        return Number.isInteger(val) ? String(val) : String(Math.round(val * 100000) / 100000);
      }
      if (typeof val === 'string' && val !== '' && !Number.isNaN(Number(val))) {
        const num = Number(val);
        return Number.isInteger(num) ? String(num) : String(Math.round(num * 100000) / 100000);
      }
      return String(val);
    };

    const serializeRow = (row: Record<string, unknown>): string =>
      Object.entries(row)
        .map(([k, v]) => [k.toLowerCase(), normalizeVal(v)] as const)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}:${v}`)
        .join('|');

    if (requireOrder) {
      const actualOrdered = actualRows.map(serializeRow);
      const expectedOrdered = expectedRows.map(serializeRow);
      return JSON.stringify(actualOrdered) === JSON.stringify(expectedOrdered);
    }

    const actualSet = actualRows.map(serializeRow).sort();
    const expectedSet = expectedRows.map(serializeRow).sort();
    return JSON.stringify(actualSet) === JSON.stringify(expectedSet);
  }
}
