export interface ComparisonResult {
  isMatch: boolean;
  actualClean: string;
  expectedClean: string;
  debugOutput?: string;
  timeMs?: number;
}

export class Comparator {
  /**
   * Extracts output captured between secret execution markers and checks against expected output.
   */
  static extractAndCompare(
    rawStdout: string,
    expectedOutput: string,
    startMarker: string,
    endMarker: string,
    options: {
      orderInsensitive?: boolean;
      floatTolerance?: number;
    } = {}
  ): ComparisonResult {
    let actualClean = '';
    let debugOutput = '';
    let timeMs = 0;

    const startIndex = rawStdout.indexOf(startMarker);
    const endIndex = rawStdout.indexOf(endMarker);

    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
      // User debug output printed before the marker
      const beforeOutput = rawStdout.substring(0, startIndex);
      // Actual solution output
      actualClean = rawStdout.substring(startIndex + startMarker.length, endIndex);
      // Anything after the end marker (e.g. execution timing)
      const afterOutput = rawStdout.substring(endIndex + endMarker.length);

      debugOutput = beforeOutput.trim();

      const timeMatch = afterOutput.match(/__TIME_MS__:([0-9.]+)/);
      if (timeMatch) {
        timeMs = parseFloat(timeMatch[1]);
      }
    } else {
      // Markers missing (abnormal termination or crash)
      actualClean = rawStdout.trim();
    }

    const normActual = this.normalizeOutput(actualClean);
    const normExpected = this.normalizeOutput(expectedOutput);

    let isMatch = normActual === normExpected;

    // Handle JSON string literal expected output (e.g. '"BANC"' or '""') vs unquoted C++ stdout string
    if (!isMatch && normExpected.length >= 2 && normExpected.startsWith('"') && normExpected.endsWith('"')) {
      try {
        const unquotedExpected = JSON.parse(normExpected);
        if (typeof unquotedExpected === 'string' && normActual === unquotedExpected) {
          isMatch = true;
        }
      } catch {
        // Ignore JSON parse error
      }
    }

    // Handle whitespace normalization across JSON containers (e.g. "[1, 2]" vs "[1,2]")
    if (!isMatch) {
      try {
        const parsedA = JSON.parse(normActual);
        const parsedE = JSON.parse(normExpected);
        if (JSON.stringify(parsedA) === JSON.stringify(parsedE)) {
          isMatch = true;
        }
      } catch {
        // Ignore non-JSON outputs
      }
    }

    // Check float tolerance if specified
    if (!isMatch && options.floatTolerance !== undefined) {
      const numActual = parseFloat(normActual);
      const numExpected = parseFloat(normExpected);
      if (!isNaN(numActual) && !isNaN(numExpected)) {
        isMatch = Math.abs(numActual - numExpected) <= options.floatTolerance;
      }
    }

    // Check order-insensitive comparison for arrays/sets if specified
    if (!isMatch && options.orderInsensitive) {
      isMatch = this.compareOrderInsensitive(normActual, normExpected);
    }

    return {
      isMatch,
      actualClean: normActual,
      expectedClean: normExpected,
      debugOutput: debugOutput.length > 2048 ? debugOutput.substring(0, 2048) + '\n...[debug output truncated at 2KB]' : debugOutput,
      timeMs,
    };
  }

  static normalizeOutput(str: string): string {
    return str
      .replace(/\r\n/g, '\n') // Normalize CRLF to LF
      .replace(/[ \t]+$/gm, '') // Remove trailing whitespace per line
      .trim(); // Trim leading/trailing whitespace
  }

  private static compareOrderInsensitive(actual: string, expected: string): boolean {
    try {
      const parsedActual = JSON.parse(actual.replace(/'/g, '"'));
      const parsedExpected = JSON.parse(expected.replace(/'/g, '"'));

      if (Array.isArray(parsedActual) && Array.isArray(parsedExpected)) {
        if (parsedActual.length !== parsedExpected.length) return false;
        const sortedActual = [...parsedActual].sort();
        const sortedExpected = [...parsedExpected].sort();
        return JSON.stringify(sortedActual) === JSON.stringify(sortedExpected);
      }
    } catch {
      // Fallback to strict string equality
    }
    return false;
  }
}

