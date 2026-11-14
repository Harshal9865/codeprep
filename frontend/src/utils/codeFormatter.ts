export type FormatterLanguage = 'cpp' | 'sql';

const INDENT = '    '; // 4 spaces (LeetCode C++ standard)

const CPP_TYPE_WORDS = new Set([
  'void', 'bool', 'char', 'short', 'int', 'long', 'float', 'double', 'signed', 'unsigned',
  'auto', 'const', 'static', 'size_t', 'ssize_t', 'int64_t', 'uint64_t', 'int32_t', 'uint32_t',
  'string', 'ListNode', 'TreeNode', 'Node', 'Solution', 'struct', 'class',
]);

const CPP_UNARY_PREV_WORDS = new Set([
  'return', 'case', 'throw', 'else', 'sizeof', 'delete', 'new',
]);

const CPP_TEMPLATE_NAMES = new Set([
  'vector', 'pair', 'tuple', 'map', 'multimap', 'unordered_map', 'set', 'multiset',
  'unordered_set', 'queue', 'stack', 'deque', 'priority_queue', 'array', 'bitset',
  'list', 'optional', 'variant', 'greater', 'less', 'function', 'shared_ptr', 'unique_ptr',
]);

interface ProtectedSpan {
  token: string;
  raw: string;
}

/**
 * Replaces strings, char literals, comments, and preprocessor lines with safe tokens
 * so spacing/case transforms never corrupt literal content.
 */
function protectCppLiteralsAndComments(code: string): {
  masked: string;
  spans: ProtectedSpan[];
} {
  const spans: ProtectedSpan[] = [];
  let out = '';
  let i = 0;
  const n = code.length;

  const pushSpan = (raw: string, tag: string) => {
    const token = `__CP_SPAN_${tag}_${spans.length}__`;
    spans.push({ token, raw });
    out += token;
  };

  while (i < n) {
    const ch = code[i];

    // Preprocessor directive at start of line
    if (ch === '#' && (i === 0 || code[i - 1] === '\n' || /^\s+$/.test(code.slice(code.lastIndexOf('\n', i - 1) + 1, i)))) {
      const start = i;
      while (i < n && code[i] !== '\n') i++;
      pushSpan(code.slice(start, i).trim(), 'PREP');
      continue;
    }

    // Line comment
    if (ch === '/' && code[i + 1] === '/') {
      const start = i;
      while (i < n && code[i] !== '\n') i++;
      pushSpan(code.slice(start, i), 'LCOM');
      continue;
    }

    // Block comment
    if (ch === '/' && code[i + 1] === '*') {
      const start = i;
      i += 2;
      while (i < n && !(code[i] === '*' && code[i + 1] === '/')) i++;
      if (i < n) i += 2;
      pushSpan(code.slice(start, i), 'BCOM');
      continue;
    }

    // String or char literal
    if (ch === '"' || ch === "'") {
      const quote = ch;
      const start = i;
      i++;
      while (i < n && code[i] !== quote && code[i] !== '\n') {
        if (code[i] === '\\' && i + 1 < n) i += 2;
        else i++;
      }
      if (i < n && code[i] === quote) i++;
      pushSpan(code.slice(start, i), 'STR');
      continue;
    }

    out += ch;
    i++;
  }

  return { masked: out, spans };
}

function restoreSpans(text: string, spans: ProtectedSpan[]): string {
  let result = text;
  // Restore in reverse order in case nested
  for (let i = spans.length - 1; i >= 0; i--) {
    result = result.split(spans[i].token).join(spans[i].raw);
  }
  return result;
}

type MiniToken = {
  kind: 'word' | 'num' | 'op' | 'punct' | 'span';
  val: string;
};

function tokenizeCppLine(line: string): MiniToken[] {
  const tokens: MiniToken[] = [];
  let i = 0;
  const n = line.length;

  const threeOps = ['<<=', '>>=', '...'];
  const twoOps = ['==', '!=', '<=', '>=', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '&&', '||', '<<', '>>', '++', '--', '::', '->'];

  while (i < n) {
    const ch = line[i];
    if (ch === ' ' || ch === '\t') {
      i++;
      continue;
    }

    // Protected span placeholder
    if (line.startsWith('__CP_SPAN_', i)) {
      const end = line.indexOf('__', i + 10);
      if (end !== -1) {
        const tok = line.slice(i, end + 2);
        tokens.push({ kind: 'span', val: tok });
        i = end + 2;
        continue;
      }
    }

    // Identifier / keyword
    if ((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_') {
      const start = i;
      while (i < n && /[A-Za-z0-9_]/.test(line[i])) i++;
      tokens.push({ kind: 'word', val: line.slice(start, i) });
      continue;
    }

    // Number
    if (ch >= '0' && ch <= '9') {
      const start = i;
      while (i < n && /[0-9a-fA-FxXbB_.uUlLfFeE]/.test(line[i])) {
        if ((line[i] === 'e' || line[i] === 'E') && (line[i + 1] === '+' || line[i + 1] === '-')) {
          i += 2;
          continue;
        }
        i++;
      }
      tokens.push({ kind: 'num', val: line.slice(start, i) });
      continue;
    }

    const tri = line.slice(i, i + 3);
    if (threeOps.includes(tri)) {
      tokens.push({ kind: 'op', val: tri });
      i += 3;
      continue;
    }

    const two = line.slice(i, i + 2);
    if (twoOps.includes(two)) {
      tokens.push({ kind: 'op', val: two });
      i += 2;
      continue;
    }

    if ('{}()[];,.:?~'.includes(ch)) {
      tokens.push({ kind: 'punct', val: ch });
      i++;
      continue;
    }

    if ('=+-*/%<>!&|^'.includes(ch)) {
      tokens.push({ kind: 'op', val: ch });
      i++;
      continue;
    }

    tokens.push({ kind: 'punct', val: ch });
    i++;
  }

  return tokens;
}

const BINARY_SPACED_OPS = new Set([
  '=', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<=', '>>=',
  '==', '!=', '<=', '>=', '&&', '||', '<<', '>>', '+', '-', '/', '%', '^', '|',
]);

function isUnaryContext(prev: MiniToken | null): boolean {
  if (!prev) return true;
  if (prev.kind === 'punct' && '([{,;?:'.includes(prev.val)) return true;
  if (prev.kind === 'op' && prev.val !== '++' && prev.val !== '--') return true;
  if (prev.kind === 'word' && CPP_UNARY_PREV_WORDS.has(prev.val)) return true;
  return false;
}

function looksLikeTemplateOpen(tokens: MiniToken[], idx: number): boolean {
  const prev = idx > 0 ? tokens[idx - 1] : null;
  if (!prev) return false;
  if (prev.kind === 'op' && prev.val === '>') return true;
  if (prev.kind !== 'word') return false;
  if (CPP_TEMPLATE_NAMES.has(prev.val)) return true;
  // Custom PascalCase template class (exclude single-letter vars like N and ALL_CAPS constants like INT_MAX)
  const isPascal = prev.val.length >= 2 && /^[A-Z][A-Za-z0-9_]*$/.test(prev.val) && /[a-z]/.test(prev.val);
  if (!isPascal) return false;
  // Verify there's a matching `>` before `;`, `&&`, `||`, or `==`
  for (let k = idx + 1; k < tokens.length; k++) {
    const v = tokens[k].val;
    if (v === '>' || v === '>>') return true;
    if (v === ';' || v === '&&' || v === '||' || v === '==' || v === '!=') return false;
  }
  return false;
}

function formatCppLineTokens(line: string): string {
  const trimmed = line.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('__CP_SPAN_PREP_') || trimmed.startsWith('__CP_SPAN_LCOM_') || trimmed.startsWith('__CP_SPAN_BCOM_')) {
    return trimmed;
  }

  const tokens = tokenizeCppLine(trimmed);
  if (tokens.length === 0) return '';

  let out = '';
  let angleDepth = 0;

  for (let idx = 0; idx < tokens.length; idx++) {
    const tok = tokens[idx];
    const prev = idx > 0 ? tokens[idx - 1] : null;
    const next = idx + 1 < tokens.length ? tokens[idx + 1] : null;

    // Track template `<...>` depth when `<` follows a template name or `>`
    if (tok.kind === 'op' && tok.val === '<') {
      if (looksLikeTemplateOpen(tokens, idx)) {
        angleDepth++;
        out += '<';
        continue;
      }
    }

    if (angleDepth > 0 && tok.kind === 'op' && (tok.val === '>' || tok.val === '>>')) {
      const popCount = tok.val === '>>' ? Math.min(2, angleDepth) : 1;
      angleDepth -= popCount;
      out = out.replace(/ +$/, '') + tok.val;
      continue;
    }

    if (tok.kind === 'span' && tok.val.includes('_LCOM_')) {
      out = (out ? out.replace(/ +$/, '') + ' ' : '') + tok.val;
      continue;
    }

    // No space before `.`, `->`, `::`, `;`, `,`, `)`, `]`, `++`, `--`
    if (tok.val === '.' || tok.val === '->' || tok.val === '::') {
      out = out.replace(/ +$/, '') + tok.val;
      continue;
    }

    if (prev && (prev.val === '.' || prev.val === '->' || prev.val === '::')) {
      out += tok.val;
      continue;
    }

    if (tok.val === ';' || tok.val === ',') {
      out = out.replace(/ +$/, '') + tok.val;
      if (next && next.val !== ')' && next.val !== ']' && next.val !== ';') {
        out += ' ';
      }
      continue;
    }

    if (tok.val === '(') {
      const needsSpaceBeforeParen =
        prev &&
        prev.kind === 'word' &&
        ['if', 'for', 'while', 'switch', 'catch'].includes(prev.val);
      if (needsSpaceBeforeParen && !out.endsWith(' ')) {
        out += ' ';
      }
      out += '(';
      continue;
    }

    if (tok.val === ')' || tok.val === ']') {
      out = out.replace(/ +$/, '') + tok.val;
      if (next && next.val === '{') out += ' ';
      continue;
    }

    if (tok.val === '[') {
      out = out.replace(/ +$/, '') + '[';
      continue;
    }

    if (tok.val === '{') {
      if (out && !out.endsWith(' ') && !out.endsWith('(') && !out.endsWith('[')) {
        out += ' ';
      }
      out += '{';
      if (next && next.val !== '}' && next.val !== ';') out += ' ';
      continue;
    }

    if (tok.val === '}') {
      if (out && !out.endsWith(' ') && !out.endsWith('{')) {
        out += ' ';
      }
      out += '}';
      if (next && next.kind === 'word') out += ' ';
      continue;
    }

    if (tok.val === ':') {
      // Case/label/access specifier vs ternary `a ? b : c`
      const isLabelOrAccess =
        prev?.kind === 'word' && ['public', 'private', 'protected', 'default'].includes(prev.val);
      const isForEach = prev && out.includes('for (') && !out.includes('?');
      if (isLabelOrAccess) {
        out = out.replace(/ +$/, '') + ':';
        if (next) out += ' ';
      } else if (isForEach || out.includes('?')) {
        out = out.replace(/ +$/, '') + ' : ';
      } else {
        out = out.replace(/ +$/, '') + ':';
        if (next) out += ' ';
      }
      continue;
    }

    if (tok.val === '?') {
      out = out.replace(/ +$/, '') + ' ? ';
      continue;
    }

    if (tok.val === '++' || tok.val === '--') {
      if (prev && (prev.kind === 'word' || prev.val === ')' || prev.val === ']')) {
        out = out.replace(/ +$/, '') + tok.val;
      } else {
        if (out && !out.endsWith(' ') && !out.endsWith('(') && !out.endsWith('[')) out += ' ';
        out += tok.val;
      }
      continue;
    }

    if (tok.val === '!' || tok.val === '~') {
      if (out && !out.endsWith(' ') && !out.endsWith('(') && !out.endsWith('[') && !out.endsWith('!')) {
        out += ' ';
      }
      out += tok.val;
      continue;
    }

    if (tok.val === '*' || tok.val === '&') {
      const prevIsTypeLike =
        prev &&
        ((prev.kind === 'word' && (CPP_TYPE_WORDS.has(prev.val) || /^[A-Z]/.test(prev.val))) ||
          prev.val === '>' ||
          prev.val === '*' ||
          prev.val === '&');
      if (prevIsTypeLike || isUnaryContext(prev)) {
        // Keep pointer/ref attached to type or unary operand: `vector<int>& nums`, `ListNode* head`, `*it`
        if (isUnaryContext(prev) && out && !out.endsWith('(') && !out.endsWith('[') && !out.endsWith(' ')) {
          out += ' ';
        }
        out += tok.val;
        if (prevIsTypeLike && next && (next.kind === 'word' || next.val === '(')) {
          out += ' ';
        }
      } else {
        out = out.replace(/ +$/, '') + ` ${tok.val} `;
      }
      continue;
    }

    if ((tok.val === '+' || tok.val === '-') && isUnaryContext(prev)) {
      if (out && !out.endsWith(' ') && !out.endsWith('(') && !out.endsWith('[')) {
        out += ' ';
      }
      out += tok.val;
      continue;
    }

    if (tok.val === '<' || tok.val === '>' || BINARY_SPACED_OPS.has(tok.val)) {
      out = out.replace(/ +$/, '') + ` ${tok.val} `;
      continue;
    }

    // Default word / number / span
    if (
      out &&
      !out.endsWith(' ') &&
      !out.endsWith('(') &&
      !out.endsWith('[') &&
      !out.endsWith('<') &&
      !out.endsWith('!') &&
      !out.endsWith('~')
    ) {
      const isUnarySignPrefix =
        (prev?.val === '-' || prev?.val === '+') && isUnaryContext(idx >= 2 ? tokens[idx - 2] : null);
      const isUnaryStarAmp =
        (prev?.val === '*' || prev?.val === '&') &&
        isUnaryContext(idx >= 2 ? tokens[idx - 2] : null);
      if (!isUnarySignPrefix && !isUnaryStarAmp) {
        out += ' ';
      }
    }
    out += tok.val;
  }

  return out.replace(/ +$/, '');
}

function countNetBracesOutsideStrings(line: string): { leadingClose: number; netDelta: number } {
  const clean = line.replace(/__CP_SPAN_[A-Z]+_\d+__/g, '');
  let leadingClose = 0;
  let seenNonClose = false;
  let delta = 0;

  for (const ch of clean) {
    if (ch === '}') {
      if (!seenNonClose) leadingClose++;
      delta--;
    } else if (ch === '{') {
      seenNonClose = true;
      delta++;
    } else if (ch !== ' ' && ch !== '\t') {
      seenNonClose = true;
    }
  }
  return { leadingClose, netDelta: delta };
}

export function formatCppCode(code: string): string {
  const normalized = code.replace(/\r\n/g, '\n');
  const { masked, spans } = protectCppLiteralsAndComments(normalized);
  const preLines = masked.split('\n');

  // Fold Allman-style standalone `{` onto control/function/class headers for K&R LeetCode style
  const rawLines: string[] = [];
  for (const l of preLines) {
    const trimmed = l.trim();
    if (trimmed === '{' && rawLines.length > 0) {
      let prevIdx = rawLines.length - 1;
      while (prevIdx >= 0 && rawLines[prevIdx].trim() === '') prevIdx--;
      if (prevIdx >= 0) {
        const prevTrim = rawLines[prevIdx].trim();
        const isHeaderOrBlock =
          !prevTrim.startsWith('__CP_SPAN_PREP_') &&
          !prevTrim.startsWith('__CP_SPAN_LCOM_') &&
          !prevTrim.startsWith('__CP_SPAN_BCOM_') &&
          !/[;{}:\[\],]$/.test(prevTrim);
        if (isHeaderOrBlock) {
          rawLines.splice(prevIdx + 1);
          rawLines[prevIdx] = rawLines[prevIdx].replace(/\s+$/, '') + ' {';
          continue;
        }
      }
    }
    rawLines.push(l);
  }

  const formattedLines: string[] = [];
  let braceDepth = 0;
  let blankRun = 0;

  for (const rawLine of rawLines) {
    const lineContent = formatCppLineTokens(rawLine);

    if (!lineContent) {
      blankRun++;
      if (blankRun <= 1 && formattedLines.length > 0) {
        formattedLines.push('');
      }
      continue;
    }
    blankRun = 0;

    // Preprocessor directives always flush left
    if (lineContent.startsWith('__CP_SPAN_PREP_')) {
      formattedLines.push(lineContent);
      continue;
    }

    const { leadingClose, netDelta } = countNetBracesOutsideStrings(lineContent);
    const effectiveBeforeLine = Math.max(0, braceDepth - leadingClose);

    // `public:` / `private:` / `protected:` sit flush with enclosing class brace (depth - 1)
    const isAccessSpecifier = /^(public|private|protected)\s*:/.test(lineContent);
    const indentLevel = isAccessSpecifier
      ? Math.max(0, effectiveBeforeLine - 1)
      : effectiveBeforeLine;

    formattedLines.push(INDENT.repeat(indentLevel) + lineContent);
    braceDepth = Math.max(0, braceDepth + netDelta);
  }

  // Trim trailing empty lines while preserving a clean single trailing newline only if original had one
  while (formattedLines.length > 0 && formattedLines[formattedLines.length - 1] === '') {
    formattedLines.pop();
  }

  const rejoined = formattedLines.join('\n') + (normalized.endsWith('\n') ? '\n' : '');
  return restoreSpans(rejoined, spans);
}

const SQL_CLAUSE_KEYWORDS = [
  'SELECT', 'FROM', 'WHERE', 'INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL JOIN',
  'CROSS JOIN', 'JOIN', 'ON', 'GROUP BY', 'HAVING', 'ORDER BY', 'LIMIT', 'OFFSET',
  'UNION ALL', 'UNION', 'INTERSECT', 'EXCEPT', 'WITH',
];

const SQL_UPPER_WORDS = new Set([
  'SELECT', 'DISTINCT', 'FROM', 'WHERE', 'AS', 'AND', 'OR', 'NOT', 'IN', 'IS', 'NULL',
  'TRUE', 'FALSE', 'LIKE', 'GLOB', 'BETWEEN', 'EXISTS', 'JOIN', 'INNER', 'LEFT', 'RIGHT',
  'FULL', 'OUTER', 'CROSS', 'ON', 'USING', 'GROUP', 'BY', 'HAVING', 'ORDER', 'ASC', 'DESC',
  'LIMIT', 'OFFSET', 'UNION', 'ALL', 'INTERSECT', 'EXCEPT', 'WITH', 'RECURSIVE', 'OVER',
  'PARTITION', 'ROWS', 'RANGE', 'UNBOUNDED', 'PRECEDING', 'FOLLOWING', 'CURRENT', 'ROW',
  'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'CAST', 'COALESCE', 'NULLIF', 'COUNT', 'SUM',
  'AVG', 'MIN', 'MAX', 'ROUND', 'ROW_NUMBER', 'RANK', 'DENSE_RANK', 'LAG', 'LEAD',
  'FIRST_VALUE', 'LAST_VALUE', 'STRFTIME', 'JULIANDAY',
]);

export function formatSqlCode(code: string): string {
  const normalized = code.replace(/\r\n/g, '\n');
  const spans: ProtectedSpan[] = [];
  let masked = '';
  let i = 0;
  const n = normalized.length;

  const pushSpan = (raw: string, tag: string) => {
    const token = `__SQL_SPAN_${tag}_${spans.length}__`;
    spans.push({ token, raw });
    masked += token;
  };

  while (i < n) {
    const ch = normalized[i];
    if (ch === '-' && normalized[i + 1] === '-') {
      const start = i;
      while (i < n && normalized[i] !== '\n') i++;
      pushSpan(normalized.slice(start, i), 'LCOM');
      continue;
    }
    if (ch === '/' && normalized[i + 1] === '*') {
      const start = i;
      i += 2;
      while (i < n && !(normalized[i] === '*' && normalized[i + 1] === '/')) i++;
      if (i < n) i += 2;
      pushSpan(normalized.slice(start, i), 'BCOM');
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      const q = ch;
      const start = i;
      i++;
      while (i < n) {
        if (normalized[i] === q) {
          if (normalized[i + 1] === q) {
            i += 2;
            continue;
          }
          i++;
          break;
        }
        i++;
      }
      pushSpan(normalized.slice(start, i), 'STR');
      continue;
    }
    masked += ch;
    i++;
  }

  // Normalize SQL keyword casing outside spans/comments
  masked = masked.replace(/\b[A-Za-z_][A-Za-z0-9_]*\b/g, (word) => {
    if (word.startsWith('__SQL_SPAN_')) return word;
    const upper = word.toUpperCase();
    return SQL_UPPER_WORDS.has(upper) ? upper : word;
  });

  // Clean spacing around commas and binary comparison operators
  const lines = masked.split('\n').map((rawLine) => {
    const trimmed = rawLine.trim();
    if (!trimmed) return '';
    let s = trimmed
      .replace(/\s+/g, ' ')
      .replace(/\s*,\s*/g, ', ')
      .replace(/\(\s+/g, '(')
      .replace(/\s+\)/g, ')')
      .replace(/\s*(<=|>=|<>|!=|=)\s*/g, ' $1 ')
      .replace(/\s*;\s*$/g, ';');

    // Keep clause lines cleanly formatted while preserving leading indent inside CTE subqueries
    const leadingSpaces = rawLine.match(/^\s*/)?.[0] ?? '';
    const startsWithClause = SQL_CLAUSE_KEYWORDS.some((kw) => s.toUpperCase().startsWith(kw));
    if (startsWithClause && leadingSpaces.length <= 4) {
      return s;
    }
    if (s.startsWith('AND ') || s.startsWith('OR ')) {
      return INDENT + s;
    }
    return leadingSpaces + s;
  });

  // Collapse multiple blank lines and indent inside (...)
  const outLines: string[] = [];
  let parenDepth = 0;
  let blankRun = 0;
  for (const line of lines) {
    if (!line.trim()) {
      blankRun++;
      if (blankRun <= 1 && outLines.length > 0) outLines.push('');
      continue;
    }
    blankRun = 0;
    const clean = line.trim();
    if (clean.startsWith(')')) {
      parenDepth = Math.max(0, parenDepth - 1);
    }
    const baseIndent = INDENT.repeat(parenDepth);
    const extraIndent = (clean.startsWith('AND ') || clean.startsWith('OR ')) ? INDENT : '';
    outLines.push(baseIndent + extraIndent + clean);

    for (const ch of clean.replace(/__SQL_SPAN_[A-Z]+_\d+__/g, '')) {
      if (ch === '(') parenDepth++;
      else if (ch === ')') parenDepth = Math.max(0, parenDepth - 1);
    }
  }

  while (outLines.length > 0 && outLines[outLines.length - 1] === '') {
    outLines.pop();
  }

  const rejoined = outLines.join('\n') + (normalized.endsWith('\n') ? '\n' : '');
  return restoreSpans(rejoined, spans);
}

export function formatCode(code: string, language: FormatterLanguage): string {
  return language === 'sql' ? formatSqlCode(code) : formatCppCode(code);
}

/**
 * Lightweight live line auto-formatter triggered on `;` or `}` when Auto-Format is ON.
 * Safely formats only the current line's spacing and/or closing-brace alignment without disturbing
 * unfinished code elsewhere in the file.
 */
export function autoFormatCurrentLineOnTrigger(
  code: string,
  cursorPos: number,
  triggerChar: ';' | '}',
  language: FormatterLanguage
): { code: string; cursorPos: number } | null {
  const lineStart = code.lastIndexOf('\n', cursorPos - 1) + 1;
  const nextNewline = code.indexOf('\n', cursorPos);
  const lineEnd = nextNewline === -1 ? code.length : nextNewline;
  const currentLine = code.slice(lineStart, lineEnd);

  // Skip if cursor is inside a string or line comment
  const beforeCursorOnLine = code.slice(lineStart, cursorPos);
  if (language === 'cpp' && /^\s*\/\//.test(beforeCursorOnLine)) return null;
  if (language === 'sql' && /^\s*--/.test(beforeCursorOnLine)) return null;

  if (language === 'cpp') {
    if (triggerChar === '}') {
      // If line only has whitespace + `}`, align it with its matching `{`
      if (/^\s*\}\s*$/.test(currentLine)) {
        const beforeText = code.slice(0, lineStart);
        let depth = 0;
        let matchingLineIndent = '';
        const prevLines = beforeText.split('\n');
        // Walk backwards tracking brace balance to find matching `{`
        for (let i = prevLines.length - 1; i >= 0; i--) {
          const l = prevLines[i];
          for (let j = l.length - 1; j >= 0; j--) {
            if (l[j] === '}') depth++;
            else if (l[j] === '{') {
              if (depth === 0) {
                matchingLineIndent = l.match(/^[ \t]*/)?.[0] ?? '';
                i = -1;
                break;
              }
              depth--;
            }
          }
        }
        const replacement = `${matchingLineIndent}}`;
        if (replacement === currentLine) return null;
        const nextCode = code.slice(0, lineStart) + replacement + code.slice(lineEnd);
        return {
          code: nextCode,
          cursorPos: lineStart + replacement.length,
        };
      }
      return null;
    }

    if (triggerChar === ';') {
      // Only format up to the cursor or clean the current line if balanced quotes
      const quoteCount = (currentLine.match(/(?<!\\)"/g) || []).length;
      if (quoteCount % 2 !== 0) return null;

      const leadingIndent = currentLine.match(/^[ \t]*/)?.[0] ?? '';
      const { masked, spans } = protectCppLiteralsAndComments(currentLine.trim());
      const formattedBody = restoreSpans(formatCppLineTokens(masked), spans);
      if (!formattedBody) return null;

      const replacement = leadingIndent + formattedBody;
      if (replacement === currentLine) return null;

      // Keep caret positioned right after the semicolon that triggered formatting
      const semiIdxInCurrent = cursorPos - lineStart - 1;
      const semisBefore = currentLine.slice(0, semiIdxInCurrent + 1).split(';').length - 1;
      let targetOffset = replacement.length;
      if (semisBefore > 0) {
        let seen = 0;
        for (let k = 0; k < replacement.length; k++) {
          if (replacement[k] === ';') {
            seen++;
            if (seen === semisBefore) {
              targetOffset = k + 1;
              break;
            }
          }
        }
      }

      const nextCode = code.slice(0, lineStart) + replacement + code.slice(lineEnd);
      return {
        code: nextCode,
        cursorPos: lineStart + targetOffset,
      };
    }
  }

  return null;
}
