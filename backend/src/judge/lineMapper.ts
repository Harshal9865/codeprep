export class LineMapper {
  /**
   * Remaps raw compiler errors from full harness line numbers to user code relative line numbers.
   * Supports both Linux (/tmp/...) and Windows (C:\Users\...) file paths.
   */
  static remapCompilerOutput(
    rawStderr: string,
    userCodeStartLine: number,
    userCodeEndLine: number
  ): string {
    const lines = rawStderr.replace(/\r\n/g, '\n').split('\n');
    const remappedLines: string[] = [];

    const lineRegex = /^(?:[a-zA-Z]:)?[a-zA-Z0-9_./\\ -]+:(\d+):(\d+):\s*(fatal error|error|warning|note):\s*(.*)$/;
    const memberCtxRegex = /^(?:[a-zA-Z]:)?[a-zA-Z0-9_./\\ -]+:\s*(In (?:member )?function\s+.*)$/;

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
        } else if (severity === 'error' || severity === 'fatal error') {
          remappedLines.push(`Structure Error: ${severity}: ${message}`);
        }
        continue;
      }

      const ctxMatch = line.match(memberCtxRegex);
      if (ctxMatch) {
        remappedLines.push(ctxMatch[1]);
        continue;
      }

      const trimmed = line.trim();
      if (
        trimmed.length > 0 &&
        !trimmed.includes('#include') &&
        !trimmed.includes('generated harness') &&
        !trimmed.includes('__CODEPREP_')
      ) {
        remappedLines.push(line);
      }
    }

    if (remappedLines.length > 36) {
      return (
        remappedLines.slice(0, 36).join('\n').trim() +
        `\n... (${remappedLines.length - 36} more diagnostic lines omitted)`
      );
    }

    return remappedLines.join('\n').trim();
  }
}
