export class LineMapper {
  /**
   * Remaps raw compiler errors from full harness line numbers to user code relative line numbers.
   * Example raw: "solution.cpp:128:5: error: 'x' was not declared in this scope"
   * Example remapped: "Line 12:5: error: 'x' was not declared in this scope"
   */
  static remapCompilerOutput(
    rawStderr: string,
    userCodeStartLine: number,
    userCodeEndLine: number
  ): string {
    const lines = rawStderr.split('\n');
    const remappedLines: string[] = [];

    const lineRegex = /(?:[a-zA-Z0-9_./\\-]+):(\d+):(\d+):\s*(error|warning|note):\s*(.*)/;

    for (const line of lines) {
      const match = line.match(lineRegex);
      if (match) {
        const rawLineNum = parseInt(match[1], 10);
        const colNum = match[2];
        const severity = match[3];
        const message = match[4];

        if (rawLineNum >= userCodeStartLine && rawLineNum <= userCodeEndLine) {
          const userLine = rawLineNum - userCodeStartLine + 1;
          remappedLines.push(`Line ${userLine}:${colNum}: ${severity}: ${message}`);
        } else {
          // If error happened outside user code (e.g. invalid type or missing required method)
          remappedLines.push(`Structure Error: ${severity}: ${message}`);
        }
      } else if (line.trim().length > 0 && !line.includes('#include') && !line.includes('generated harness')) {
        remappedLines.push(line);
      }
    }

    return remappedLines.join('\n').trim();
  }
}

