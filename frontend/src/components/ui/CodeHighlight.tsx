import React, { useMemo, useRef, useCallback, useState, useEffect } from 'react';
import { getCompletions, CompletionItem, CompletionResult } from '../../utils/codeCompletion';
import { autoFormatCurrentLineOnTrigger, formatCode } from '../../utils/codeFormatter';

export type CodeLanguage = 'cpp' | 'sql';

type TokenType =
  | 'plain'
  | 'keyword'
  | 'control'
  | 'type'
  | 'function'
  | 'number'
  | 'string'
  | 'comment'
  | 'macro'
  | 'punctuation';

interface Token {
  type: TokenType;
  value: string;
}

const CPP_KEYWORDS = new Set([
  'class',
  'struct',
  'union',
  'enum',
  'public',
  'private',
  'protected',
  'virtual',
  'override',
  'final',
  'const',
  'constexpr',
  'consteval',
  'static',
  'inline',
  'extern',
  'mutable',
  'volatile',
  'explicit',
  'friend',
  'template',
  'typename',
  'namespace',
  'using',
  'typedef',
  'new',
  'delete',
  'this',
  'nullptr',
  'true',
  'false',
  'operator',
  'sizeof',
  'auto',
  'void',
  'bool',
  'char',
  'short',
  'int',
  'long',
  'float',
  'double',
  'signed',
  'unsigned',
  'wchar_t',
  'char16_t',
  'char32_t',
]);

const CPP_CONTROL = new Set([
  'if',
  'else',
  'for',
  'while',
  'do',
  'switch',
  'case',
  'default',
  'break',
  'continue',
  'return',
  'goto',
  'try',
  'catch',
  'throw',
]);

const CPP_TYPES = new Set([
  'std',
  'string',
  'wstring',
  'string_view',
  'vector',
  'deque',
  'list',
  'set',
  'multiset',
  'unordered_set',
  'map',
  'multimap',
  'unordered_map',
  'pair',
  'tuple',
  'stack',
  'queue',
  'priority_queue',
  'array',
  'bitset',
  'optional',
  'variant',
  'size_t',
  'ssize_t',
  'int64_t',
  'uint64_t',
  'int32_t',
  'uint32_t',
  'INT_MAX',
  'INT_MIN',
  'LLONG_MAX',
  'LLONG_MIN',
  'Solution',
  'ListNode',
  'TreeNode',
  'Node',
]);

const SQL_KEYWORDS = new Set([
  'SELECT',
  'DISTINCT',
  'FROM',
  'WHERE',
  'AS',
  'AND',
  'OR',
  'NOT',
  'IN',
  'IS',
  'NULL',
  'TRUE',
  'FALSE',
  'LIKE',
  'GLOB',
  'BETWEEN',
  'EXISTS',
  'JOIN',
  'INNER',
  'LEFT',
  'RIGHT',
  'FULL',
  'OUTER',
  'CROSS',
  'ON',
  'USING',
  'GROUP',
  'BY',
  'HAVING',
  'ORDER',
  'ASC',
  'DESC',
  'LIMIT',
  'OFFSET',
  'UNION',
  'ALL',
  'INTERSECT',
  'EXCEPT',
  'WITH',
  'RECURSIVE',
  'OVER',
  'PARTITION',
  'ROWS',
  'RANGE',
  'UNBOUNDED',
  'PRECEDING',
  'FOLLOWING',
  'CURRENT',
  'ROW',
  'CREATE',
  'TABLE',
  'VIEW',
  'PRIMARY',
  'KEY',
  'VALUES',
  'INTO',
  'SET',
]);

const SQL_CONTROL = new Set(['CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'IF', 'CAST', 'FILTER']);

const SQL_TYPES = new Set([
  'INT',
  'INTEGER',
  'BIGINT',
  'SMALLINT',
  'DECIMAL',
  'NUMERIC',
  'FLOAT',
  'REAL',
  'DOUBLE',
  'VARCHAR',
  'CHAR',
  'TEXT',
  'DATE',
  'DATETIME',
  'TIMESTAMP',
  'BOOLEAN',
  'BOOL',
]);

const TOKEN_COLORS: Record<TokenType, string> = {
  plain: 'var(--syntax-variable)',
  keyword: 'var(--syntax-keyword)',
  control: 'var(--syntax-control)',
  type: 'var(--syntax-type)',
  function: 'var(--syntax-function)',
  number: 'var(--syntax-number)',
  string: 'var(--syntax-string)',
  comment: 'var(--syntax-comment)',
  macro: 'var(--syntax-macro)',
  punctuation: 'var(--syntax-punctuation)',
};

function isIdentStart(ch: string): boolean {
  return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_';
}

function isIdentPart(ch: string): boolean {
  return isIdentStart(ch) || (ch >= '0' && ch <= '9');
}

function isDigit(ch: string): boolean {
  return ch >= '0' && ch <= '9';
}

function nextNonSpaceChar(code: string, idx: number): string {
  let j = idx;
  while (j < code.length && (code[j] === ' ' || code[j] === '\t')) {
    j++;
  }
  return j < code.length ? code[j] : '';
}

function tokenizeCpp(code: string): Token[] {
  const tokens: Token[] = [];
  const n = code.length;
  let i = 0;

  while (i < n) {
    const ch = code[i];

    // Whitespace run
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      const start = i;
      while (i < n && (code[i] === ' ' || code[i] === '\t' || code[i] === '\n' || code[i] === '\r')) {
        i++;
      }
      tokens.push({ type: 'plain', value: code.slice(start, i) });
      continue;
    }

    // Line comment //
    if (ch === '/' && code[i + 1] === '/') {
      const start = i;
      while (i < n && code[i] !== '\n') i++;
      tokens.push({ type: 'comment', value: code.slice(start, i) });
      continue;
    }

    // Block comment /* ... */
    if (ch === '/' && code[i + 1] === '*') {
      const start = i;
      i += 2;
      while (i < n && !(code[i] === '*' && code[i + 1] === '/')) i++;
      if (i < n) i += 2;
      tokens.push({ type: 'comment', value: code.slice(start, i) });
      continue;
    }

    // Preprocessor directive (#include, #define, etc.)
    if (ch === '#') {
      const start = i;
      i++;
      while (i < n && isIdentPart(code[i])) i++;
      tokens.push({ type: 'macro', value: code.slice(start, i) });
      // Highlight <header> or "header" following #include
      if (code.slice(start, i) === '#include') {
        const wsStart = i;
        while (i < n && (code[i] === ' ' || code[i] === '\t')) i++;
        if (i > wsStart) tokens.push({ type: 'plain', value: code.slice(wsStart, i) });
        if (code[i] === '<') {
          const incStart = i;
          i++;
          while (i < n && code[i] !== '>' && code[i] !== '\n') i++;
          if (code[i] === '>') i++;
          tokens.push({ type: 'string', value: code.slice(incStart, i) });
        }
      }
      continue;
    }

    // String or char literal
    if (ch === '"' || ch === "'") {
      const quote = ch;
      const start = i;
      i++;
      while (i < n && code[i] !== quote && code[i] !== '\n') {
        if (code[i] === '\\' && i + 1 < n) {
          i += 2;
        } else {
          i++;
        }
      }
      if (i < n && code[i] === quote) i++;
      tokens.push({ type: 'string', value: code.slice(start, i) });
      continue;
    }

    // Number literal (decimal, hex, binary, float, suffixes)
    if (isDigit(ch) || (ch === '.' && i + 1 < n && isDigit(code[i + 1]))) {
      const start = i;
      if (ch === '0' && (code[i + 1] === 'x' || code[i + 1] === 'X' || code[i + 1] === 'b' || code[i + 1] === 'B')) {
        i += 2;
      }
      while (i < n && /[0-9a-fA-F_'.]/.test(code[i])) {
        if ((code[i] === 'e' || code[i] === 'E') && (code[i + 1] === '+' || code[i + 1] === '-')) {
          i += 2;
          continue;
        }
        i++;
      }
      while (i < n && (code[i] === 'u' || code[i] === 'U' || code[i] === 'l' || code[i] === 'L' || code[i] === 'f' || code[i] === 'F')) {
        i++;
      }
      tokens.push({ type: 'number', value: code.slice(start, i) });
      continue;
    }

    // Identifier / keyword / type / function call
    if (isIdentStart(ch)) {
      const start = i;
      while (i < n && isIdentPart(code[i])) i++;
      const word = code.slice(start, i);
      const nextCh = nextNonSpaceChar(code, i);

      let type: TokenType = 'plain';
      if (CPP_CONTROL.has(word)) {
        type = 'control';
      } else if (CPP_KEYWORDS.has(word)) {
        type = 'keyword';
      } else if (CPP_TYPES.has(word)) {
        type = 'type';
      } else if (nextCh === '(') {
        type = 'function';
      } else if (word.length > 1 && word[0] >= 'A' && word[0] <= 'Z' && /[a-z]/.test(word)) {
        // PascalCase identifiers (custom structs/classes)
        type = 'type';
      }

      tokens.push({ type, value: word });
      continue;
    }

    // Punctuation / operators
    if ('{}()[];,.:<>+-*/%=&|^!~?'.includes(ch)) {
      const start = i;
      while (i < n && '{}()[];,.:<>+-*/%=&|^!~?'.includes(code[i])) {
        if (code[i] === '/' && (code[i + 1] === '/' || code[i + 1] === '*')) break;
        i++;
      }
      tokens.push({ type: 'punctuation', value: code.slice(start, i) });
      continue;
    }

    tokens.push({ type: 'plain', value: ch });
    i++;
  }

  return tokens;
}

function tokenizeSql(code: string): Token[] {
  const tokens: Token[] = [];
  const n = code.length;
  let i = 0;

  while (i < n) {
    const ch = code[i];

    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      const start = i;
      while (i < n && (code[i] === ' ' || code[i] === '\t' || code[i] === '\n' || code[i] === '\r')) {
        i++;
      }
      tokens.push({ type: 'plain', value: code.slice(start, i) });
      continue;
    }

    // SQL line comment --
    if (ch === '-' && code[i + 1] === '-') {
      const start = i;
      while (i < n && code[i] !== '\n') i++;
      tokens.push({ type: 'comment', value: code.slice(start, i) });
      continue;
    }

    // Block comment /* ... */
    if (ch === '/' && code[i + 1] === '*') {
      const start = i;
      i += 2;
      while (i < n && !(code[i] === '*' && code[i + 1] === '/')) i++;
      if (i < n) i += 2;
      tokens.push({ type: 'comment', value: code.slice(start, i) });
      continue;
    }

    // Strings & quoted identifiers
    if (ch === "'" || ch === '"' || ch === '`') {
      const quote = ch;
      const start = i;
      i++;
      while (i < n) {
        if (code[i] === quote) {
          if (code[i + 1] === quote) {
            i += 2;
            continue;
          }
          i++;
          break;
        }
        i++;
      }
      tokens.push({ type: 'string', value: code.slice(start, i) });
      continue;
    }

    if (isDigit(ch)) {
      const start = i;
      while (i < n && (isDigit(code[i]) || code[i] === '.')) i++;
      tokens.push({ type: 'number', value: code.slice(start, i) });
      continue;
    }

    if (isIdentStart(ch)) {
      const start = i;
      while (i < n && isIdentPart(code[i])) i++;
      const word = code.slice(start, i);
      const upper = word.toUpperCase();
      const nextCh = nextNonSpaceChar(code, i);

      let type: TokenType = 'plain';
      if (SQL_CONTROL.has(upper)) {
        type = 'control';
      } else if (SQL_KEYWORDS.has(upper)) {
        type = 'keyword';
      } else if (SQL_TYPES.has(upper)) {
        type = 'type';
      } else if (nextCh === '(') {
        type = 'function';
      }

      tokens.push({ type, value: word });
      continue;
    }

    if ('(),.;=<>!+-*/'.includes(ch)) {
      const start = i;
      while (i < n && '(),.;=<>!+-*/'.includes(code[i])) {
        if (code[i] === '-' && code[i + 1] === '-') break;
        if (code[i] === '/' && code[i + 1] === '*') break;
        i++;
      }
      tokens.push({ type: 'punctuation', value: code.slice(start, i) });
      continue;
    }

    tokens.push({ type: 'plain', value: ch });
    i++;
  }

  return tokens;
}

export function tokenizeCode(code: string, language: CodeLanguage = 'cpp'): Token[] {
  return language === 'sql' ? tokenizeSql(code) : tokenizeCpp(code);
}

interface HighlightedCodeProps {
  code: string;
  language?: CodeLanguage;
  className?: string;
}

export const HighlightedCode: React.FC<HighlightedCodeProps> = ({
  code,
  language = 'cpp',
  className = '',
}) => {
  const tokens = useMemo(() => tokenizeCode(code, language), [code, language]);

  return (
    <pre
      className={`font-mono whitespace-pre select-text selection:bg-primary/25 ${className}`}
      style={{ fontVariantLigatures: 'none' }}
    >
      {tokens.map((tok, idx) => (
        <span key={idx} style={{ color: TOKEN_COLORS[tok.type] }}>
          {tok.value}
        </span>
      ))}
    </pre>
  );
};

interface HighlightedCodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  language?: CodeLanguage;
  textareaRef?: React.RefObject<HTMLTextAreaElement>;
  placeholder?: string;
  showLineNumbers?: boolean;
  paddingClass?: string;
  autoFormat?: boolean;
  onFormatted?: () => void;
}

const OPEN_TO_CLOSE: Record<string, string> = {
  '(': ')',
  '[': ']',
  '{': '}',
  '"': '"',
  "'": "'",
};

const CLOSING_CHARS = new Set([')', ']', '}', '"', "'"]);

const EMPTY_PAIRS = new Set(['()', '[]', '{}', '""', "''"]);

function countNonWhitespaceBefore(text: string, pos: number): number {
  let count = 0;
  for (let i = 0; i < pos && i < text.length; i++) {
    if (!/\s/.test(text[i])) count++;
  }
  return count;
}

function posFromNonWhitespaceCount(text: string, targetCount: number): number {
  if (targetCount <= 0) return 0;
  let count = 0;
  for (let i = 0; i < text.length; i++) {
    if (!/\s/.test(text[i])) {
      count++;
      if (count >= targetCount) return i + 1;
    }
  }
  return text.length;
}

const KIND_BADGE: Record<CompletionItem['kind'], { label: string; cls: string }> = {
  keyword: { label: 'kw', cls: 'bg-purple-500/20 text-purple-300' },
  type: { label: 'tp', cls: 'bg-sky-500/20 text-sky-300' },
  function: { label: 'fn', cls: 'bg-amber-500/20 text-amber-300' },
  snippet: { label: 'sn', cls: 'bg-emerald-500/20 text-emerald-300' },
  variable: { label: 'id', cls: 'bg-surface-high text-text-secondary' },
};

export const HighlightedCodeEditor: React.FC<HighlightedCodeEditorProps> = ({
  value,
  onChange,
  onKeyDown,
  language = 'cpp',
  textareaRef: externalRef,
  placeholder,
  showLineNumbers = false,
  paddingClass = 'p-3',
  autoFormat = true,
  onFormatted,
}) => {
  const internalRef = useRef<HTMLTextAreaElement>(null);
  const resolvedRef = externalRef ?? internalRef;
  const preRef = useRef<HTMLPreElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [completion, setCompletion] = useState<CompletionResult | null>(null);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [caretCoords, setCaretCoords] = useState<{ top: number; left: number }>({ top: 36, left: 16 });
  const suppressAutocompleteRef = useRef(false);

  const tokens = useMemo(() => tokenizeCode(value, language), [value, language]);
  const lineCount = useMemo(() => value.split('\n').length, [value]);

  const setCaretAsync = useCallback(
    (start: number, end: number = start) => {
      window.requestAnimationFrame(() => {
        const ta = resolvedRef.current;
        if (!ta) return;
        ta.focus();
        ta.selectionStart = start;
        ta.selectionEnd = end;
      });
    },
    [resolvedRef]
  );

  const computeCaretCoords = useCallback(
    (text: string, pos: number) => {
      const ta = resolvedRef.current;
      const charWidth = measureRef.current
        ? measureRef.current.getBoundingClientRect().width / 10
        : 7.8;
      const padPx = paddingClass === 'p-4' ? 16 : 12;
      const lineHeight = 24; // leading-6
      const before = text.slice(0, pos);
      const lines = before.split('\n');
      const row = lines.length - 1;
      const col = lines[row].length;
      const scrollTop = ta?.scrollTop ?? 0;
      const scrollLeft = ta?.scrollLeft ?? 0;
      const containerW = containerRef.current?.clientWidth ?? 480;
      const containerH = containerRef.current?.clientHeight ?? 320;

      const rawTop = padPx + (row + 1) * lineHeight - scrollTop + 2;
      const rawLeft = padPx + col * charWidth - scrollLeft;
      const popupW = 280;
      const popupH = 220;
      const top = rawTop + popupH > containerH ? Math.max(8, rawTop - lineHeight - popupH - 4) : Math.max(8, rawTop);
      const left = Math.max(8, Math.min(rawLeft, Math.max(8, containerW - popupW - 12)));
      setCaretCoords({ top, left });
    },
    [paddingClass, resolvedRef]
  );

  const refreshCompletions = useCallback(
    (text: string, pos: number, forceShow = false) => {
      if (suppressAutocompleteRef.current && !forceShow) {
        suppressAutocompleteRef.current = false;
        setCompletion(null);
        return;
      }
      const res = getCompletions(text, pos, language, forceShow);
      if (res && res.items.length > 0) {
        computeCaretCoords(text, pos);
        setCompletion(res);
        setSelectedIdx(0);
      } else {
        setCompletion(null);
      }
    },
    [computeCaretCoords, language]
  );

  const applyCompletion = useCallback(
    (item: CompletionItem) => {
      const ta = resolvedRef.current;
      if (!ta || !completion) return;
      const cursorPos = ta.selectionStart;
      const lineStart = value.lastIndexOf('\n', completion.replaceStart - 1) + 1;
      const currentIndent = value.slice(lineStart, completion.replaceStart).match(/^[ \t]*/)?.[0] ?? '';

      const adjustedInsert = item.insertText.includes('\n')
        ? item.insertText.replace(/\n/g, `\n${currentIndent}`)
        : item.insertText;

      const nextValue =
        value.slice(0, completion.replaceStart) + adjustedInsert + value.slice(cursorPos);

      const nextCaret =
        completion.replaceStart + adjustedInsert.length - (item.cursorBackOffset ?? 0);

      setCompletion(null);
      onChange(nextValue);
      setCaretAsync(nextCaret);
    },
    [completion, onChange, resolvedRef, setCaretAsync, value]
  );

  useEffect(() => {
    setCompletion(null);
  }, [language]);

  const handleScroll = useCallback(() => {
    const ta = resolvedRef.current;
    if (!ta) return;
    if (preRef.current) {
      preRef.current.scrollTop = ta.scrollTop;
      preRef.current.scrollLeft = ta.scrollLeft;
    }
    if (gutterRef.current) {
      gutterRef.current.scrollTop = ta.scrollTop;
    }
    if (completion) {
      computeCaretCoords(value, ta.selectionStart);
    }
  }, [completion, computeCaretCoords, resolvedRef, value]);

  const handleValueChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const nextVal = e.target.value;
    const nextPos = e.target.selectionStart;
    onChange(nextVal);
    refreshCompletions(nextVal, nextPos, false);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pasted = e.clipboardData.getData('text/plain');
    if (!pasted || !autoFormat) return;
    const isMultiLineOrCode = pasted.includes('\n') || /[;{}()=,]/.test(pasted);
    if (!isMultiLineOrCode) return;

    e.preventDefault();
    const ta = e.currentTarget;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const normalizedPaste = pasted.replace(/\r\n/g, '\n');
    const rawCombined = value.slice(0, start) + normalizedPaste + value.slice(end);
    const nonWsTarget = countNonWhitespaceBefore(rawCombined, start + normalizedPaste.length);
    const formatted = formatCode(rawCombined, language);
    const nextPos = posFromNonWhitespaceCount(formatted, nonWsTarget);

    setCompletion(null);
    onChange(formatted);
    setCaretAsync(nextPos);
    onFormatted?.();
  };

  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const ta = e.currentTarget;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;

    // 1. Autocomplete popup navigation & acceptance
    if (completion && completion.items.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIdx((prev) => (prev + 1) % completion.items.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIdx((prev) => (prev - 1 + completion.items.length) % completion.items.length);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setCompletion(null);
        return;
      }
      if ((e.key === 'Tab' || e.key === 'Enter') && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        e.preventDefault();
        applyCompletion(completion.items[selectedIdx] ?? completion.items[0]);
        return;
      }
    }

    // 2. Manual trigger Autocomplete: Ctrl+Space
    if (e.ctrlKey && e.code === 'Space') {
      e.preventDefault();
      refreshCompletions(value, start, true);
      return;
    }

    // 3. Format Document shortcut: Shift+Alt+F
    if (e.shiftKey && e.altKey && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      const nonWs = countNonWhitespaceBefore(value, start);
      const formatted = formatCode(value, language);
      const nextPos = posFromNonWhitespaceCount(formatted, nonWs);
      setCompletion(null);
      onChange(formatted);
      setCaretAsync(nextPos);
      onFormatted?.();
      return;
    }

    // 4. Toggle line comment: Ctrl+/ or Cmd+/
    if ((e.ctrlKey || e.metaKey) && e.key === '/') {
      e.preventDefault();
      const prefix = language === 'sql' ? '-- ' : '// ';
      const prefixTrim = language === 'sql' ? '--' : '//';
      const blockStart = value.lastIndexOf('\n', start - 1) + 1;
      const nextNl = value.indexOf('\n', end);
      const blockEnd = nextNl === -1 ? value.length : nextNl;
      const selectedLines = value.slice(blockStart, blockEnd).split('\n');
      const allCommented = selectedLines.every((l) => !l.trim() || l.trimStart().startsWith(prefixTrim));

      const updatedLines = selectedLines.map((line) => {
        if (!line.trim()) return line;
        if (allCommented) {
          return line.replace(new RegExp(`^(\\s*)${prefixTrim === '//' ? '\\/\\/' : '--'}\\s?`), '$1');
        }
        const indent = line.match(/^\s*/)?.[0] ?? '';
        return indent + prefix + line.slice(indent.length);
      });

      const joined = updatedLines.join('\n');
      const nextVal = value.slice(0, blockStart) + joined + value.slice(blockEnd);
      setCompletion(null);
      onChange(nextVal);
      setCaretAsync(blockStart, blockStart + joined.length);
      return;
    }

    // Let parent shortcuts (e.g., Ctrl+Enter Run / Ctrl+Shift+Enter Submit) execute cleanly
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      setCompletion(null);
      onKeyDown?.(e);
      return;
    }

    // 5. Smart Tab & Shift+Tab (4-space indent / unindent)
    if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey || (start !== end && value.slice(start, end).includes('\n'))) {
        const blockStart = value.lastIndexOf('\n', start - 1) + 1;
        const nextNl = value.indexOf('\n', end);
        const blockEnd = nextNl === -1 ? value.length : nextNl;
        const lines = value.slice(blockStart, blockEnd).split('\n');
        let firstLineDelta = 0;
        let totalDelta = 0;

        const transformed = lines.map((line, idx) => {
          if (e.shiftKey) {
            const match = /^( {1,4}|\t)/.exec(line);
            const removeLen = match ? match[0].length : 0;
            if (idx === 0) firstLineDelta = -removeLen;
            totalDelta -= removeLen;
            return line.slice(removeLen);
          }
          if (idx === 0) firstLineDelta = 4;
          totalDelta += 4;
          return '    ' + line;
        });

        const nextVal = value.slice(0, blockStart) + transformed.join('\n') + value.slice(blockEnd);
        onChange(nextVal);
        setCaretAsync(
          Math.max(blockStart, start + firstLineDelta),
          Math.max(blockStart, end + totalDelta)
        );
      } else {
        const nextVal = value.slice(0, start) + '    ' + value.slice(end);
        onChange(nextVal);
        setCaretAsync(start + 4);
      }
      return;
    }

    // 6. Smart Backspace: delete empty bracket/quote pair together
    if (e.key === 'Backspace' && start === end && start > 0) {
      const pair = value.slice(start - 1, start + 1);
      if (EMPTY_PAIRS.has(pair)) {
        e.preventDefault();
        suppressAutocompleteRef.current = true;
        const nextVal = value.slice(0, start - 1) + value.slice(start + 1);
        onChange(nextVal);
        setCompletion(null);
        setCaretAsync(start - 1);
        return;
      }
      if (value[start - 1] === ' ' && /^ {4}$/.test(value.slice(Math.max(0, start - 4), start))) {
        const lineStart = value.lastIndexOf('\n', start - 1) + 1;
        if (/^ +$/.test(value.slice(lineStart, start))) {
          e.preventDefault();
          const nextVal = value.slice(0, start - 4) + value.slice(start);
          onChange(nextVal);
          setCaretAsync(start - 4);
          return;
        }
      }
    }

    // 7. Smart Enter: `{ | }` expansion + auto-indent
    if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      setCompletion(null);
      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      const lineBefore = value.slice(lineStart, start);
      const currentIndent = lineBefore.match(/^[ \t]*/)?.[0] ?? '';
      const beforeChar = value[start - 1] ?? '';
      const afterChar = value[end] ?? '';

      if (beforeChar === '{' && afterChar === '}') {
        const insertion = `\n${currentIndent}    \n${currentIndent}`;
        const nextVal = value.slice(0, start) + insertion + value.slice(end);
        onChange(nextVal);
        setCaretAsync(start + 1 + currentIndent.length + 4);
        return;
      }

      const trimmedBefore = lineBefore.trimEnd();
      const shouldIncreaseIndent =
        trimmedBefore.endsWith('{') ||
        trimmedBefore.endsWith('(') ||
        trimmedBefore.endsWith('[') ||
        (language === 'cpp' && /^(public|private|protected|default|case\b.*):$/.test(trimmedBefore.trim()));

      const nextIndent = shouldIncreaseIndent ? `${currentIndent}    ` : currentIndent;
      const nextVal = value.slice(0, start) + '\n' + nextIndent + value.slice(end);
      onChange(nextVal);
      setCaretAsync(start + 1 + nextIndent.length);
      return;
    }

    // 8. Auto-close pairs `() [] {} "" ''` & wrap selection
    if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key in OPEN_TO_CLOSE) {
      const openChar = e.key;
      const closeChar = OPEN_TO_CLOSE[openChar];
      const nextChar = value[end] ?? '';
      const prevChar = start > 0 ? value[start - 1] : '';

      if (start !== end) {
        e.preventDefault();
        const selected = value.slice(start, end);
        const nextVal = value.slice(0, start) + openChar + selected + closeChar + value.slice(end);
        onChange(nextVal);
        setCaretAsync(start + 1, end + 1);
        return;
      }

      // Overtype closing quote if already sitting before matching quote
      if ((openChar === '"' || openChar === "'") && nextChar === openChar && prevChar !== '\\') {
        e.preventDefault();
        setCaretAsync(start + 1);
        return;
      }

      const canAutoCloseNext =
        nextChar === '' || /[\s)\]},;:]/.test(nextChar);
      const canAutoCloseQuotePrev =
        (openChar !== '"' && openChar !== "'") ||
        (prevChar !== '\\' && !/[A-Za-z0-9_]/.test(prevChar));

      if (canAutoCloseNext && canAutoCloseQuotePrev) {
        e.preventDefault();
        const nextVal = value.slice(0, start) + openChar + closeChar + value.slice(end);
        onChange(nextVal);
        setCaretAsync(start + 1);
        return;
      }
    }

    // 9. Skip-over closing delimiters `) ] }` + auto-dedent `}`
    if (!e.ctrlKey && !e.metaKey && !e.altKey && CLOSING_CHARS.has(e.key)) {
      if (e.key === '}' && autoFormat && start === end) {
        const lineStart = value.lastIndexOf('\n', start - 1) + 1;
        const lineBefore = value.slice(lineStart, start);
        const nextChar = value[start] ?? '';
        // Case A: skip over auto-inserted `}` and align it cleanly
        if (nextChar === '}' && /^\s*$/.test(lineBefore)) {
          e.preventDefault();
          const formatted = autoFormatCurrentLineOnTrigger(value, start + 1, '}', language);
          if (formatted) {
            onChange(formatted.code);
            setCaretAsync(formatted.cursorPos);
          } else {
            setCaretAsync(start + 1);
          }
          return;
        }
        // Case B: user typed `}` manually on whitespace-only line
        if (/^\s+$/.test(lineBefore) && nextChar !== '}') {
          e.preventDefault();
          const inserted = value.slice(0, start) + '}' + value.slice(end);
          const formatted = autoFormatCurrentLineOnTrigger(inserted, start + 1, '}', language);
          if (formatted) {
            onChange(formatted.code);
            setCaretAsync(formatted.cursorPos);
          } else {
            onChange(inserted);
            setCaretAsync(start + 1);
          }
          return;
        }
      }

      if (start === end && value[start] === e.key) {
        e.preventDefault();
        setCaretAsync(start + 1);
        return;
      }
    }

    // 10. Auto-fix spacing on `;` when Auto-Format is ON
    if (e.key === ';' && autoFormat && !e.ctrlKey && !e.metaKey && !e.altKey && start === end) {
      e.preventDefault();
      setCompletion(null);
      const inserted = value.slice(0, start) + ';' + value.slice(end);
      const formatted = autoFormatCurrentLineOnTrigger(inserted, start + 1, ';', language);
      if (formatted) {
        onChange(formatted.code);
        setCaretAsync(formatted.cursorPos);
      } else {
        onChange(inserted);
        setCaretAsync(start + 1);
      }
      return;
    }

    onKeyDown?.(e);
  };

  const gutterPadClass = paddingClass === 'p-4' ? 'py-4' : 'py-3';

  return (
    <div className="flex-1 h-full relative flex overflow-hidden font-mono text-[13px] bg-canvas">
      {showLineNumbers && (
        <div
          ref={gutterRef}
          className={`w-12 select-none ${gutterPadClass} text-right pr-3 bg-surface-subtle border-r border-border-subtle text-text-muted font-mono text-xs leading-6 shrink-0 overflow-hidden`}
        >
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
      )}

      <div ref={containerRef} className="flex-1 relative overflow-hidden">
        {/* Hidden monospace character width probe */}
        <span
          ref={measureRef}
          aria-hidden="true"
          className="fixed -top-[9999px] -left-[9999px] font-mono text-[13px] whitespace-pre pointer-events-none"
          style={{ fontVariantLigatures: 'none' }}
        >
          0000000000
        </span>

        {/* Highlighted Underlay (locked scroll to textarea) */}
        <pre
          ref={preRef}
          aria-hidden="true"
          className={`absolute inset-0 m-0 ${paddingClass} font-mono text-[13px] leading-6 whitespace-pre overflow-hidden pointer-events-none`}
          style={{ fontVariantLigatures: 'none', tabSize: 4 }}
        >
          {tokens.map((tok, idx) => (
            <span key={idx} style={{ color: TOKEN_COLORS[tok.type] }}>
              {tok.value}
            </span>
          ))}
          {value.endsWith('\n') ? ' ' : ''}
        </pre>

        {/* Transparent Interactive Textarea Overlay */}
        <textarea
          ref={resolvedRef}
          value={value}
          onChange={handleValueChange}
          onKeyDown={handleEditorKeyDown}
          onPaste={handlePaste}
          onScroll={handleScroll}
          onBlur={() => {
            window.setTimeout(() => setCompletion(null), 120);
          }}
          placeholder={placeholder}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          wrap="off"
          className={`relative z-10 w-full h-full m-0 ${paddingClass} bg-transparent font-mono text-[13px] leading-6 whitespace-pre overflow-auto resize-none focus:outline-none selection:bg-primary/25`}
          style={{
            color: 'transparent',
            caretColor: 'var(--text-primary)',
            fontVariantLigatures: 'none',
            tabSize: 4,
          }}
        />

        {/* LeetCode-style Autocomplete Dropdown */}
        {completion && completion.items.length > 0 && (
          <div
            role="listbox"
            aria-label="Code completions"
            style={{ top: caretCoords.top, left: caretCoords.left }}
            className="absolute z-30 w-72 max-h-56 overflow-y-auto rounded-xl bg-surface-elevated border border-border-default shadow-2xl py-1 text-xs font-mono"
          >
            {completion.items.map((item, idx) => {
              const badge = KIND_BADGE[item.kind];
              const isActive = idx === selectedIdx;
              return (
                <button
                  key={`${item.kind}-${item.label}`}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    applyCompletion(item);
                  }}
                  onMouseEnter={() => setSelectedIdx(idx)}
                  className={`w-full px-2.5 py-1.5 text-left flex items-center justify-between gap-2 transition-colors ${
                    isActive
                      ? 'bg-primary/20 text-text-primary'
                      : 'text-text-secondary hover:bg-surface-high'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase shrink-0 ${badge.cls}`}>
                      {badge.label}
                    </span>
                    <span className="truncate font-medium text-text-primary">{item.label}</span>
                  </div>
                  {item.detail && (
                    <span className="text-[10px] text-text-muted truncate max-w-[100px] shrink-0">
                      {item.detail}
                    </span>
                  )}
                </button>
              );
            })}
            <div className="px-2.5 py-1 border-t border-border-subtle text-[10px] text-text-muted flex items-center justify-between">
              <span>Tab / Enter to accept</span>
              <span>Esc to close</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

