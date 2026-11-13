import { TestCase } from './types';

export interface ParsedParam {
  rawType: string;
  normType: string;
  name: string;
}

export interface ParsedSignature {
  returnType: string;
  methodName: string;
  params: ParsedParam[];
}

export class InputParser {
  static normalizeType(rawType: string): string {
    return rawType
      .replace(/\bconst\b/g, '')
      .replace(/[&\s]+$/g, '')
      .replace(/\s*<\s*/g, '<')
      .replace(/\s*>\s*/g, '>')
      .replace(/\s*\*\s*/g, '*')
      .replace(/\s+/g, ' ')
      .trim();
  }

  static splitTopLevelParams(paramsStr: string): string[] {
    const result: string[] = [];
    let angleDepth = 0;
    let parenDepth = 0;
    let start = 0;

    for (let i = 0; i < paramsStr.length; i++) {
      const ch = paramsStr[i];
      if (ch === '<') angleDepth++;
      else if (ch === '>') angleDepth = Math.max(0, angleDepth - 1);
      else if (ch === '(') parenDepth++;
      else if (ch === ')') parenDepth = Math.max(0, parenDepth - 1);
      else if (ch === ',' && angleDepth === 0 && parenDepth === 0) {
        result.push(paramsStr.slice(start, i).trim());
        start = i + 1;
      }
    }

    const last = paramsStr.slice(start).trim();
    if (last && last !== 'void') result.push(last);
    return result;
  }

  static parseSignature(sig: string): ParsedSignature | null {
    const trimmed = sig.trim();
    const openIdx = trimmed.indexOf('(');
    const closeIdx = trimmed.lastIndexOf(')');
    if (openIdx === -1 || closeIdx === -1 || closeIdx < openIdx) {
      return null;
    }

    const header = trimmed.slice(0, openIdx).trim();
    const paramsStr = trimmed.slice(openIdx + 1, closeIdx).trim();

    const headMatch = header.match(/^(.*?)([A-Za-z_]\w*)$/);
    if (!headMatch || !headMatch[1].trim()) {
      return null;
    }

    const returnType = this.normalizeType(headMatch[1]);
    const methodName = headMatch[2].trim();

    if (!paramsStr) {
      return { returnType, methodName, params: [] };
    }

    const rawParams = this.splitTopLevelParams(paramsStr);
    const params: ParsedParam[] = rawParams.map((param, idx) => {
      const nameMatch = param.match(/([A-Za-z_]\w*)\s*(?:\[[^\]]*\])?\s*$/);
      const name = nameMatch ? nameMatch[1] : `arg_${idx}`;
      const rawType = nameMatch
        ? param.slice(0, nameMatch.index).trim()
        : param;
      return {
        rawType,
        normType: this.normalizeType(rawType),
        name,
      };
    });

    return { returnType, methodName, params };
  }

  static splitOutsideDelimiters(input: string, delimiter: string): string[] {
    const parts: string[] = [];
    let bracketDepth = 0;
    let braceDepth = 0;
    let parenDepth = 0;
    let inQuotes = false;
    let quoteChar = '"';
    let start = 0;

    for (let i = 0; i < input.length; i++) {
      const ch = input[i];
      if ((ch === '"' || ch === "'") && (i === 0 || input[i - 1] !== '\\')) {
        if (!inQuotes) {
          inQuotes = true;
          quoteChar = ch;
        } else if (quoteChar === ch) {
          inQuotes = false;
        }
        continue;
      }

      if (inQuotes) continue;

      if (ch === '[') bracketDepth++;
      else if (ch === ']') bracketDepth = Math.max(0, bracketDepth - 1);
      else if (ch === '{') braceDepth++;
      else if (ch === '}') braceDepth = Math.max(0, braceDepth - 1);
      else if (ch === '(') parenDepth++;
      else if (ch === ')') parenDepth = Math.max(0, parenDepth - 1);
      else if (
        ch === delimiter &&
        bracketDepth === 0 &&
        braceDepth === 0 &&
        parenDepth === 0
      ) {
        parts.push(input.slice(start, i));
        start = i + 1;
      }
    }

    parts.push(input.slice(start));
    return parts;
  }

  private static stripAssignmentPrefix(val: string, paramType: string): string {
    const trimmed = val.trim();
    const assignMatch = trimmed.match(/^([A-Za-z_]\w*)\s*=\s*([\s\S]+)$/);
    if (!assignMatch) return val;

    const rhs = assignMatch[2].trim();
    const isStringType = paramType === 'string' || paramType === 'std::string';
    if (!isStringType) {
      return rhs;
    }

    if (
      (rhs.startsWith('"') && rhs.endsWith('"')) ||
      (rhs.startsWith("'") && rhs.endsWith("'"))
    ) {
      return rhs;
    }

    return val;
  }

  private static finalizeArg(raw: string, paramType: string): string {
    const isStringType = paramType === 'string' || paramType === 'std::string';
    const stripped = this.stripAssignmentPrefix(raw, paramType);

    if (isStringType) {
      // Preserve meaningful whitespace-only string inputs (e.g. " " in Valid Palindrome)
      if (stripped.length > 0 && stripped.trim().length === 0) {
        return stripped;
      }
      return stripped.trim();
    }

    return stripped.trim();
  }

  /**
   * Splits a single test case input into exact parameter strings.
   * Supports:
   *  1. Pipe-delimited: "[2,7,11,15] | 9"
   *  2. Multi-line LeetCode format: "[2,7,11,15]\n9"
   *  3. Single-line LeetCode assignment format: "nums = [2,7,11,15], target = 9"
   */
  static splitTestInput(rawInput: string, paramTypes: string[]): string[] {
    const paramCount = paramTypes.length;
    if (paramCount === 0) return [];

    const normalized = rawInput.replace(/\r\n/g, '\n');

    if (paramCount === 1) {
      const cleaned = normalized.replace(/^\n+|\n+$/g, '');
      return [this.finalizeArg(cleaned, paramTypes[0])];
    }

    // 1. Pipe-delimited outside brackets & quotes
    const pipeParts = this.splitOutsideDelimiters(normalized, '|');
    if (pipeParts.length === paramCount) {
      return pipeParts.map((part, idx) => this.finalizeArg(part, paramTypes[idx] || ''));
    }

    // 2. Multi-line LeetCode testcase lines
    const nonEmptyLines = normalized
      .split('\n')
      .map((l) => l.replace(/\r$/, ''))
      .filter((l) => l.trim().length > 0);
    if (nonEmptyLines.length >= paramCount) {
      return nonEmptyLines
        .slice(0, paramCount)
        .map((line, idx) => this.finalizeArg(line, paramTypes[idx] || ''));
    }

    // 3. Comma-separated outside brackets & quotes (e.g. "nums = [1,2], target = 3")
    const commaParts = this.splitOutsideDelimiters(normalized, ',');
    if (commaParts.length === paramCount) {
      return commaParts.map((part, idx) => this.finalizeArg(part, paramTypes[idx] || ''));
    }

    // Fallback: pad to paramCount
    const result: string[] = [];
    for (let i = 0; i < paramCount; i++) {
      result.push(
        pipeParts[i] !== undefined ? this.finalizeArg(pipeParts[i], paramTypes[i] || '') : ''
      );
    }
    return result;
  }

  /**
   * Expands multi-case Custom Input blocks just like LeetCode's multi-line testcase box.
   */
  static expandCustomTestCases(rawInput: string, paramTypes: string[]): TestCase[] {
    const normalized = rawInput.replace(/\r\n/g, '\n');
    const paramCount = Math.max(1, paramTypes.length);
    const nonEmptyLines = normalized
      .split('\n')
      .map((l) => l.replace(/\r$/, ''))
      .filter((l) => l.trim().length > 0);

    if (nonEmptyLines.length <= 1) {
      return [{ id: 1, input: rawInput, expectedOutput: '' }];
    }

    // Case A: Every line uses pipe delimiter matching paramCount
    if (
      paramCount > 1 &&
      nonEmptyLines.every((line) => this.splitOutsideDelimiters(line, '|').length === paramCount)
    ) {
      return nonEmptyLines.map((line, idx) => ({
        id: idx + 1,
        input: line,
        expectedOutput: '',
      }));
    }

    // Case B: Multi-line LeetCode batch (exact multiple of paramCount)
    if (
      paramCount > 1 &&
      nonEmptyLines.length % paramCount === 0 &&
      !normalized.includes('|')
    ) {
      const grouped: TestCase[] = [];
      for (let i = 0; i < nonEmptyLines.length; i += paramCount) {
        grouped.push({
          id: grouped.length + 1,
          input: nonEmptyLines.slice(i, i + paramCount).join('\n'),
          expectedOutput: '',
        });
      }
      return grouped;
    }

    // Case C: Single parameter with multiple literal lines (arrays, numbers, booleans, or quoted strings)
    if (paramCount === 1) {
      const looksLikeLiteralPerLine = nonEmptyLines.every((line) => {
        const t = line.trim();
        return (
          t.startsWith('[') ||
          t.startsWith('"') ||
          t.startsWith("'") ||
          t === 'true' ||
          t === 'false' ||
          /^-?\d+(\.\d+)?$/.test(t) ||
          /^[A-Za-z_]\w*\s*=/.test(t)
        );
      });
      if (looksLikeLiteralPerLine) {
        return nonEmptyLines.map((line, idx) => ({
          id: idx + 1,
          input: line,
          expectedOutput: '',
        }));
      }
    }

    return [{ id: 1, input: rawInput, expectedOutput: '' }];
  }

  /**
   * Serializes arguments into unambiguous length-prefixed stdin payload for the C++ driver.
   */
  static buildDriverStdin(testCases: TestCase[], functionSignature: string): string {
    const sig = this.parseSignature(functionSignature);
    const paramTypes = sig ? sig.params.map((p) => p.normType) : [];

    const chunks: string[] = [`${testCases.length}\n`];

    for (const tc of testCases) {
      const args = this.splitTestInput(tc.input, paramTypes);
      for (const arg of args) {
        const byteLen = Buffer.byteLength(arg, 'utf8');
        chunks.push(`${byteLen}\n${arg}\n`);
      }
    }

    return chunks.join('');
  }
}

