import React, { useMemo, useRef, useCallback } from 'react';

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
}

export const HighlightedCodeEditor: React.FC<HighlightedCodeEditorProps> = ({
  value,
  onChange,
  onKeyDown,
  language = 'cpp',
  textareaRef: externalRef,
  placeholder,
  showLineNumbers = false,
  paddingClass = 'p-3',
}) => {
  const internalRef = useRef<HTMLTextAreaElement>(null);
  const resolvedRef = externalRef ?? internalRef;
  const preRef = useRef<HTMLPreElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);

  const tokens = useMemo(() => tokenizeCode(value, language), [value, language]);
  const lineCount = useMemo(() => value.split('\n').length, [value]);

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
  }, [resolvedRef]);

  return (
    <div className="flex-1 h-full relative flex overflow-hidden font-mono text-[13px] bg-canvas">
      {showLineNumbers && (
        <div
          ref={gutterRef}
          className="w-12 select-none py-3 text-right pr-3 bg-surface-subtle border-r border-border-subtle text-text-muted font-mono text-xs leading-6 shrink-0 overflow-hidden"
        >
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
      )}

      <div className="flex-1 relative overflow-hidden">
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
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          onScroll={handleScroll}
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
      </div>
    </div>
  );
};

