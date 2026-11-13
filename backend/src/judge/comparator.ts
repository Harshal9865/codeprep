import { OrderComparisonMode } from './problemJudgePolicy';

export interface ComparisonOptions {
  orderInsensitive?: boolean;
  orderMode?: OrderComparisonMode;
  floatTolerance?: number;
  isTreeReturn?: boolean;
  isStringReturn?: boolean;
  allowBoolIntCoercion?: boolean;
}

export interface ComparisonResult {
  isMatch: boolean;
  actualClean: string;
  expectedClean: string;
  debugOutput?: string;
  timeMs?: number;
}

export class Comparator {
  /**
   * Legacy single-case marker extraction & comparison.
   */
  static extractAndCompare(
    rawStdout: string,
    expectedOutput: string,
    startMarker: string,
    endMarker: string,
    options: ComparisonOptions = {}
  ): ComparisonResult {
    let actualClean = '';
    let debugOutput = '';
    let timeMs = 0;

    const startIndex = rawStdout.indexOf(startMarker);
    const endIndex = rawStdout.indexOf(endMarker);

    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
      const beforeOutput = rawStdout.substring(0, startIndex);
      actualClean = rawStdout.substring(startIndex + startMarker.length, endIndex);
      const afterOutput = rawStdout.substring(endIndex + endMarker.length);

      debugOutput = beforeOutput.trim();
      const timeMatch = afterOutput.match(/__TIME_MS__:([0-9.]+)/);
      if (timeMatch) {
        timeMs = parseFloat(timeMatch[1]);
      }
    } else {
      actualClean = rawStdout.trim();
    }

    const caseCmp = this.compareCaseOutput(actualClean, expectedOutput, options);

    return {
      ...caseCmp,
      debugOutput:
        debugOutput.length > 2048
          ? debugOutput.substring(0, 2048) + '\n...[debug output truncated at 2KB]'
          : debugOutput,
      timeMs,
    };
  }

  /**
   * Compares a single test case's pure serialized output against expectedOutput.
   */
  static compareCaseOutput(
    rawActual: string,
    rawExpected: string,
    options: ComparisonOptions = {}
  ): { isMatch: boolean; actualClean: string; expectedClean: string } {
    const normActual = this.normalizeOutput(rawActual);
    const normExpected = this.normalizeOutput(rawExpected);
    const orderMode: OrderComparisonMode =
      options.orderMode || (options.orderInsensitive ? 'outer-unordered' : 'strict');

    let isMatch = normActual === normExpected;

    // 1. String comparison handling JSON-quoted outputs ("BANC", " ", "") vs unquoted expected
    if (!isMatch && (options.isStringReturn || this.looksQuoted(normActual) || this.looksQuoted(normExpected))) {
      const aUnquoted = this.tryUnquoteJsonString(rawActual.replace(/\r\n/g, '\n').trim());
      const eUnquoted = this.tryUnquoteJsonString(rawExpected.replace(/\r\n/g, '\n'));
      const eTrimmedUnquoted = this.tryUnquoteJsonString(normExpected);
      if (aUnquoted !== null) {
        if (eUnquoted !== null && aUnquoted === eUnquoted) isMatch = true;
        else if (eTrimmedUnquoted !== null && aUnquoted === eTrimmedUnquoted) isMatch = true;
        else if (!this.looksQuoted(rawExpected) && aUnquoted === rawExpected.replace(/\r\n/g, '\n')) isMatch = true;
      } else if (eUnquoted !== null && normActual === eUnquoted) {
        isMatch = true;
      }
    }

    // 2. Boolean vs 1/0 coercion strictly when expected output is literal boolean
    if (!isMatch && options.allowBoolIntCoercion) {
      if (normExpected === 'true' && normActual === '1') isMatch = true;
      if (normExpected === 'false' && normActual === '0') isMatch = true;
    }

    // 3. Parse JSON structures for whitespace-agnostic, float-tolerant, tree-null, & order-insensitive checks
    const parsedA = this.tryParseStructured(normActual);
    const parsedE = this.tryParseStructured(normExpected);

    if (!isMatch && parsedA.ok && parsedE.ok) {
      let valA = parsedA.value;
      let valE = parsedE.value;

      if (options.isTreeReturn && Array.isArray(valA) && Array.isArray(valE)) {
        valA = this.stripTrailingNulls(valA);
        valE = this.stripTrailingNulls(valE);
      }

      if (orderMode === 'outer-unordered' && Array.isArray(valA) && Array.isArray(valE)) {
        isMatch = this.deepEqual(
          this.sortOuter(valA),
          this.sortOuter(valE),
          options.floatTolerance
        );
      } else if (orderMode === 'deep-unordered' && Array.isArray(valA) && Array.isArray(valE)) {
        isMatch = this.deepEqual(
          this.canonicalizeDeep(valA),
          this.canonicalizeDeep(valE),
          options.floatTolerance
        );
      } else {
        isMatch = this.deepEqual(valA, valE, options.floatTolerance);
      }
    }

    // 4. Scalar float tolerance check (for non-JSON float strings)
    if (!isMatch && options.floatTolerance !== undefined) {
      const numA = Number(normActual);
      const numE = Number(normExpected);
      if (normActual !== '' && normExpected !== '' && Number.isFinite(numA) && Number.isFinite(numE)) {
        isMatch = Math.abs(numA - numE) <= options.floatTolerance * Math.max(1, Math.abs(numE));
      }
    }

    return {
      isMatch,
      actualClean: normActual,
      expectedClean: normExpected,
    };
  }

  static normalizeOutput(str: string): string {
    return str
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+$/gm, '')
      .trim();
  }

  private static looksQuoted(s: string): boolean {
    return s.length >= 2 && s.startsWith('"') && s.endsWith('"');
  }

  private static tryUnquoteJsonString(s: string): string | null {
    if (!this.looksQuoted(s)) return null;
    try {
      const parsed = JSON.parse(s);
      return typeof parsed === 'string' ? parsed : null;
    } catch {
      return null;
    }
  }

  private static tryParseStructured(s: string): { ok: true; value: unknown } | { ok: false } {
    if (!s) return { ok: false };
    try {
      return { ok: true, value: JSON.parse(s) };
    } catch {
      // Handle single-quoted char/string arrays like ['a','b'] cleanly
      if (s.startsWith('[') && s.includes("'")) {
        try {
          return { ok: true, value: JSON.parse(s.replace(/'/g, '"')) };
        } catch {
          return { ok: false };
        }
      }
      return { ok: false };
    }
  }

  private static stripTrailingNulls(arr: unknown[]): unknown[] {
    const copy = [...arr];
    while (copy.length > 0 && copy[copy.length - 1] === null) {
      copy.pop();
    }
    return copy;
  }

  private static deepEqual(a: unknown, b: unknown, floatTolerance?: number): boolean {
    if (a === b) return true;

    if (typeof a === 'number' && typeof b === 'number') {
      if (Number.isNaN(a) && Number.isNaN(b)) return true;
      if (floatTolerance !== undefined) {
        return Math.abs(a - b) <= floatTolerance * Math.max(1, Math.abs(b));
      }
      return Math.abs(a - b) <= 1e-9;
    }

    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (!this.deepEqual(a[i], b[i], floatTolerance)) return false;
      }
      return true;
    }

    if (a && b && typeof a === 'object' && typeof b === 'object') {
      const keysA = Object.keys(a as Record<string, unknown>);
      const keysB = Object.keys(b as Record<string, unknown>);
      if (keysA.length !== keysB.length) return false;
      for (const k of keysA) {
        if (
          !this.deepEqual(
            (a as Record<string, unknown>)[k],
            (b as Record<string, unknown>)[k],
            floatTolerance
          )
        ) {
          return false;
        }
      }
      return true;
    }

    return false;
  }

  private static compareCanonical(a: unknown, b: unknown): number {
    if (typeof a === 'number' && typeof b === 'number') {
      return a - b;
    }
    if (typeof a === 'string' && typeof b === 'string') {
      return a < b ? -1 : a > b ? 1 : 0;
    }
    if (typeof a === 'boolean' && typeof b === 'boolean') {
      return Number(a) - Number(b);
    }
    if (Array.isArray(a) && Array.isArray(b)) {
      const minLen = Math.min(a.length, b.length);
      for (let i = 0; i < minLen; i++) {
        const cmp = this.compareCanonical(a[i], b[i]);
        if (cmp !== 0) return cmp;
      }
      return a.length - b.length;
    }
    const sa = JSON.stringify(a);
    const sb = JSON.stringify(b);
    return sa < sb ? -1 : sa > sb ? 1 : 0;
  }

  private static sortOuter(arr: unknown[]): unknown[] {
    return [...arr].sort((x, y) => this.compareCanonical(x, y));
  }

  private static canonicalizeDeep(val: unknown): unknown {
    if (!Array.isArray(val)) return val;
    const mapped = val.map((item) => this.canonicalizeDeep(item));
    return mapped.sort((x, y) => this.compareCanonical(x, y));
  }
}
