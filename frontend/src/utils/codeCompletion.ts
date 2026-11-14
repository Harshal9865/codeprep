export type CompletionKind = 'keyword' | 'type' | 'function' | 'snippet' | 'variable';

export interface CompletionItem {
  label: string;
  insertText: string;
  kind: CompletionKind;
  detail?: string;
  /** Number of characters to move caret backwards after inserting `insertText` (e.g., 1 to land inside `()`) */
  cursorBackOffset?: number;
}

export interface CompletionResult {
  prefix: string;
  replaceStart: number;
  items: CompletionItem[];
}

const CPP_MEMBER_COMPLETIONS: CompletionItem[] = [
  { label: 'push_back()', insertText: 'push_back()', kind: 'function', detail: 'vector / string / deque', cursorBackOffset: 1 },
  { label: 'pop_back()', insertText: 'pop_back()', kind: 'function', detail: 'remove last element' },
  { label: 'emplace_back()', insertText: 'emplace_back()', kind: 'function', detail: 'construct in-place at end', cursorBackOffset: 1 },
  { label: 'size()', insertText: 'size()', kind: 'function', detail: 'container size' },
  { label: 'empty()', insertText: 'empty()', kind: 'function', detail: 'check if empty' },
  { label: 'length()', insertText: 'length()', kind: 'function', detail: 'string length' },
  { label: 'begin()', insertText: 'begin()', kind: 'function', detail: 'start iterator' },
  { label: 'end()', insertText: 'end()', kind: 'function', detail: 'end iterator' },
  { label: 'rbegin()', insertText: 'rbegin()', kind: 'function', detail: 'reverse start iterator' },
  { label: 'rend()', insertText: 'rend()', kind: 'function', detail: 'reverse end iterator' },
  { label: 'front()', insertText: 'front()', kind: 'function', detail: 'first element' },
  { label: 'back()', insertText: 'back()', kind: 'function', detail: 'last element' },
  { label: 'top()', insertText: 'top()', kind: 'function', detail: 'stack / priority_queue top' },
  { label: 'push()', insertText: 'push()', kind: 'function', detail: 'push element', cursorBackOffset: 1 },
  { label: 'pop()', insertText: 'pop()', kind: 'function', detail: 'pop top/front' },
  { label: 'insert()', insertText: 'insert()', kind: 'function', detail: 'insert key/value', cursorBackOffset: 1 },
  { label: 'erase()', insertText: 'erase()', kind: 'function', detail: 'remove key/iterator', cursorBackOffset: 1 },
  { label: 'find()', insertText: 'find()', kind: 'function', detail: 'lookup key / substring', cursorBackOffset: 1 },
  { label: 'count()', insertText: 'count()', kind: 'function', detail: 'count occurrences', cursorBackOffset: 1 },
  { label: 'clear()', insertText: 'clear()', kind: 'function', detail: 'remove all elements' },
  { label: 'resize()', insertText: 'resize()', kind: 'function', detail: 'resize container', cursorBackOffset: 1 },
  { label: 'assign()', insertText: 'assign()', kind: 'function', detail: 'assign size & value', cursorBackOffset: 1 },
  { label: 'reserve()', insertText: 'reserve()', kind: 'function', detail: 'reserve capacity', cursorBackOffset: 1 },
  { label: 'substr()', insertText: 'substr()', kind: 'function', detail: 'substring (pos, len)', cursorBackOffset: 1 },
  { label: 'append()', insertText: 'append()', kind: 'function', detail: 'append string', cursorBackOffset: 1 },
  { label: 'first', insertText: 'first', kind: 'variable', detail: 'pair.first' },
  { label: 'second', insertText: 'second', kind: 'variable', detail: 'pair.second' },
  { label: 'val', insertText: 'val', kind: 'variable', detail: 'ListNode / TreeNode value' },
  { label: 'next', insertText: 'next', kind: 'variable', detail: 'ListNode* next' },
  { label: 'left', insertText: 'left', kind: 'variable', detail: 'TreeNode* left' },
  { label: 'right', insertText: 'right', kind: 'variable', detail: 'TreeNode* right' },
];

const CPP_GENERAL_COMPLETIONS: CompletionItem[] = [
  // Keywords & control flow
  { label: 'return', insertText: 'return ', kind: 'keyword', detail: 'return statement' },
  { label: 'continue', insertText: 'continue;', kind: 'keyword', detail: 'skip to next iteration' },
  { label: 'break', insertText: 'break;', kind: 'keyword', detail: 'exit loop/switch' },
  { label: 'const', insertText: 'const ', kind: 'keyword', detail: 'constant qualifier' },
  { label: 'auto', insertText: 'auto ', kind: 'keyword', detail: 'type deduction' },
  { label: 'nullptr', insertText: 'nullptr', kind: 'keyword', detail: 'null pointer literal' },
  { label: 'true', insertText: 'true', kind: 'keyword', detail: 'boolean true' },
  { label: 'false', insertText: 'false', kind: 'keyword', detail: 'boolean false' },
  { label: 'sizeof()', insertText: 'sizeof()', kind: 'keyword', detail: 'size in bytes', cursorBackOffset: 1 },
  { label: 'struct', insertText: 'struct ', kind: 'keyword', detail: 'struct declaration' },
  { label: 'class', insertText: 'class ', kind: 'keyword', detail: 'class declaration' },
  { label: 'public:', insertText: 'public:', kind: 'keyword', detail: 'access specifier' },
  { label: 'private:', insertText: 'private:', kind: 'keyword', detail: 'access specifier' },
  { label: 'protected:', insertText: 'protected:', kind: 'keyword', detail: 'access specifier' },
  { label: 'virtual', insertText: 'virtual ', kind: 'keyword', detail: 'virtual method' },
  { label: 'override', insertText: 'override', kind: 'keyword', detail: 'override specifier' },
  { label: 'static', insertText: 'static ', kind: 'keyword', detail: 'static storage' },
  { label: 'using', insertText: 'using ', kind: 'keyword', detail: 'type alias / namespace' },
  { label: 'switch', insertText: 'switch () {\n    case :\n        break;\n}', kind: 'snippet', detail: 'switch block', cursorBackOffset: 24 },

  // Snippets
  {
    label: 'for (int i = 0; i < n; i++)',
    insertText: 'for (int i = 0; i < n; i++) {\n    \n}',
    kind: 'snippet',
    detail: 'standard index loop',
    cursorBackOffset: 2,
  },
  {
    label: 'for (auto& x : )',
    insertText: 'for (auto& x : ) {\n    \n}',
    kind: 'snippet',
    detail: 'range-based for loop',
    cursorBackOffset: 9,
  },
  {
    label: 'if () {}',
    insertText: 'if () {\n    \n}',
    kind: 'snippet',
    detail: 'if block',
    cursorBackOffset: 9,
  },
  {
    label: 'else if () {}',
    insertText: 'else if () {\n    \n}',
    kind: 'snippet',
    detail: 'else-if block',
    cursorBackOffset: 9,
  },
  {
    label: 'while () {}',
    insertText: 'while () {\n    \n}',
    kind: 'snippet',
    detail: 'while loop',
    cursorBackOffset: 9,
  },

  // C++17 & STL Types
  { label: 'vector<int>', insertText: 'vector<int>', kind: 'type', detail: '1D dynamic array' },
  { label: 'vector<vector<int>>', insertText: 'vector<vector<int>>', kind: 'type', detail: '2D matrix' },
  { label: 'vector<string>', insertText: 'vector<string>', kind: 'type', detail: 'string list' },
  { label: 'string', insertText: 'string', kind: 'type', detail: 'std::string' },
  { label: 'unordered_map<int, int>', insertText: 'unordered_map<int, int>', kind: 'type', detail: 'hash map' },
  { label: 'unordered_set<int>', insertText: 'unordered_set<int>', kind: 'type', detail: 'hash set' },
  { label: 'map<int, int>', insertText: 'map<int, int>', kind: 'type', detail: 'ordered map (RB-tree)' },
  { label: 'set<int>', insertText: 'set<int>', kind: 'type', detail: 'ordered set' },
  { label: 'pair<int, int>', insertText: 'pair<int, int>', kind: 'type', detail: '2-tuple pair' },
  { label: 'queue<int>', insertText: 'queue<int>', kind: 'type', detail: 'FIFO queue' },
  { label: 'stack<int>', insertText: 'stack<int>', kind: 'type', detail: 'LIFO stack' },
  { label: 'deque<int>', insertText: 'deque<int>', kind: 'type', detail: 'double-ended queue' },
  { label: 'priority_queue<int>', insertText: 'priority_queue<int>', kind: 'type', detail: 'max-heap' },
  { label: 'priority_queue<int, vector<int>, greater<int>>', insertText: 'priority_queue<int, vector<int>, greater<int>>', kind: 'type', detail: 'min-heap' },
  { label: 'long long', insertText: 'long long', kind: 'type', detail: '64-bit signed int' },
  { label: 'size_t', insertText: 'size_t', kind: 'type', detail: 'unsigned size type' },
  { label: 'INT_MAX', insertText: 'INT_MAX', kind: 'type', detail: '2^31 - 1' },
  { label: 'INT_MIN', insertText: 'INT_MIN', kind: 'type', detail: '-2^31' },
  { label: 'LLONG_MAX', insertText: 'LLONG_MAX', kind: 'type', detail: '2^63 - 1' },
  { label: 'LLONG_MIN', insertText: 'LLONG_MIN', kind: 'type', detail: '-2^63' },
  { label: 'ListNode*', insertText: 'ListNode*', kind: 'type', detail: 'singly linked list node' },
  { label: 'TreeNode*', insertText: 'TreeNode*', kind: 'type', detail: 'binary tree node' },

  // STL Algorithms & Functions
  { label: 'sort()', insertText: 'sort()', kind: 'function', detail: 'O(N log N) sort', cursorBackOffset: 1 },
  { label: 'reverse()', insertText: 'reverse()', kind: 'function', detail: 'reverse range', cursorBackOffset: 1 },
  { label: 'min()', insertText: 'min()', kind: 'function', detail: 'minimum of two values', cursorBackOffset: 1 },
  { label: 'max()', insertText: 'max()', kind: 'function', detail: 'maximum of two values', cursorBackOffset: 1 },
  { label: 'swap()', insertText: 'swap()', kind: 'function', detail: 'swap two values', cursorBackOffset: 1 },
  { label: 'abs()', insertText: 'abs()', kind: 'function', detail: 'absolute value', cursorBackOffset: 1 },
  { label: 'lower_bound()', insertText: 'lower_bound()', kind: 'function', detail: 'binary search >= target', cursorBackOffset: 1 },
  { label: 'upper_bound()', insertText: 'upper_bound()', kind: 'function', detail: 'binary search > target', cursorBackOffset: 1 },
  { label: 'binary_search()', insertText: 'binary_search()', kind: 'function', detail: 'check existence in sorted range', cursorBackOffset: 1 },
  { label: 'accumulate()', insertText: 'accumulate()', kind: 'function', detail: 'sum of range', cursorBackOffset: 1 },
  { label: 'max_element()', insertText: 'max_element()', kind: 'function', detail: 'iterator to max element', cursorBackOffset: 1 },
  { label: 'min_element()', insertText: 'min_element()', kind: 'function', detail: 'iterator to min element', cursorBackOffset: 1 },
  { label: 'to_string()', insertText: 'to_string()', kind: 'function', detail: 'number to string', cursorBackOffset: 1 },
  { label: 'stoi()', insertText: 'stoi()', kind: 'function', detail: 'string to int', cursorBackOffset: 1 },
  { label: 'stoll()', insertText: 'stoll()', kind: 'function', detail: 'string to long long', cursorBackOffset: 1 },
  { label: 'make_pair()', insertText: 'make_pair()', kind: 'function', detail: 'construct std::pair', cursorBackOffset: 1 },
  { label: 'memset()', insertText: 'memset()', kind: 'function', detail: 'fill memory bytes', cursorBackOffset: 1 },
  { label: 'cout << ', insertText: 'cout << ', kind: 'function', detail: 'debug stdout' },
];

const SQL_COMPLETIONS: CompletionItem[] = [
  { label: 'SELECT', insertText: 'SELECT ', kind: 'keyword', detail: 'project columns' },
  { label: 'DISTINCT', insertText: 'DISTINCT ', kind: 'keyword', detail: 'unique rows' },
  { label: 'FROM', insertText: 'FROM ', kind: 'keyword', detail: 'source table' },
  { label: 'WHERE', insertText: 'WHERE ', kind: 'keyword', detail: 'filter rows' },
  { label: 'GROUP BY', insertText: 'GROUP BY ', kind: 'keyword', detail: 'aggregate groups' },
  { label: 'HAVING', insertText: 'HAVING ', kind: 'keyword', detail: 'filter groups' },
  { label: 'ORDER BY', insertText: 'ORDER BY ', kind: 'keyword', detail: 'sort output' },
  { label: 'LIMIT', insertText: 'LIMIT ', kind: 'keyword', detail: 'row count limit' },
  { label: 'OFFSET', insertText: 'OFFSET ', kind: 'keyword', detail: 'skip N rows' },
  { label: 'INNER JOIN', insertText: 'INNER JOIN ', kind: 'keyword', detail: 'matching rows join' },
  { label: 'LEFT JOIN', insertText: 'LEFT JOIN ', kind: 'keyword', detail: 'preserve left table' },
  { label: 'RIGHT JOIN', insertText: 'RIGHT JOIN ', kind: 'keyword', detail: 'preserve right table' },
  { label: 'CROSS JOIN', insertText: 'CROSS JOIN ', kind: 'keyword', detail: 'cartesian product' },
  { label: 'UNION ALL', insertText: 'UNION ALL\n', kind: 'keyword', detail: 'combine without dedup' },
  { label: 'UNION', insertText: 'UNION\n', kind: 'keyword', detail: 'combine with dedup' },
  { label: 'WITH', insertText: 'WITH cte AS (\n    SELECT \n)\n', kind: 'snippet', detail: 'Common Table Expression', cursorBackOffset: 4 },
  { label: 'CASE WHEN', insertText: 'CASE WHEN  THEN  ELSE  END', kind: 'snippet', detail: 'conditional expression', cursorBackOffset: 16 },
  { label: 'OVER ()', insertText: 'OVER (PARTITION BY  ORDER BY )', kind: 'snippet', detail: 'window clause', cursorBackOffset: 11 },
  { label: 'ROW_NUMBER()', insertText: 'ROW_NUMBER() OVER (ORDER BY )', kind: 'function', detail: 'unique sequential rank', cursorBackOffset: 1 },
  { label: 'RANK()', insertText: 'RANK() OVER (ORDER BY )', kind: 'function', detail: 'rank with gaps', cursorBackOffset: 1 },
  { label: 'DENSE_RANK()', insertText: 'DENSE_RANK() OVER (ORDER BY )', kind: 'function', detail: 'rank without gaps', cursorBackOffset: 1 },
  { label: 'LAG()', insertText: 'LAG() OVER (ORDER BY )', kind: 'function', detail: 'previous row value', cursorBackOffset: 19 },
  { label: 'LEAD()', insertText: 'LEAD() OVER (ORDER BY )', kind: 'function', detail: 'next row value', cursorBackOffset: 19 },
  { label: 'COALESCE()', insertText: 'COALESCE(, 0)', kind: 'function', detail: 'null fallback', cursorBackOffset: 4 },
  { label: 'NULLIF()', insertText: 'NULLIF(, 0)', kind: 'function', detail: 'return NULL if equal', cursorBackOffset: 4 },
  { label: 'COUNT(*)', insertText: 'COUNT(*)', kind: 'function', detail: 'row count' },
  { label: 'COUNT(DISTINCT )', insertText: 'COUNT(DISTINCT )', kind: 'function', detail: 'distinct count', cursorBackOffset: 1 },
  { label: 'SUM()', insertText: 'SUM()', kind: 'function', detail: 'sum aggregate', cursorBackOffset: 1 },
  { label: 'AVG()', insertText: 'AVG()', kind: 'function', detail: 'average aggregate', cursorBackOffset: 1 },
  { label: 'MIN()', insertText: 'MIN()', kind: 'function', detail: 'minimum value', cursorBackOffset: 1 },
  { label: 'MAX()', insertText: 'MAX()', kind: 'function', detail: 'maximum value', cursorBackOffset: 1 },
  { label: 'ROUND()', insertText: 'ROUND(, 2)', kind: 'function', detail: 'round decimals', cursorBackOffset: 4 },
  { label: 'CAST()', insertText: 'CAST( AS REAL)', kind: 'function', detail: 'type cast', cursorBackOffset: 9 },
  { label: 'STRFTIME()', insertText: "STRFTIME('%Y-%m', )", kind: 'function', detail: 'SQLite date format', cursorBackOffset: 1 },
  { label: 'JULIANDAY()', insertText: 'JULIANDAY()', kind: 'function', detail: 'SQLite date diff', cursorBackOffset: 1 },
  { label: 'BETWEEN', insertText: 'BETWEEN ', kind: 'keyword', detail: 'inclusive range' },
  { label: 'IS NULL', insertText: 'IS NULL', kind: 'keyword', detail: 'null check' },
  { label: 'IS NOT NULL', insertText: 'IS NOT NULL', kind: 'keyword', detail: 'non-null check' },
  { label: 'PARTITION BY', insertText: 'PARTITION BY ', kind: 'keyword', detail: 'window partition' },
];

const CPP_SKIP_WORDS = new Set([
  'if', 'else', 'for', 'while', 'do', 'int', 'void', 'bool', 'char', 'float', 'double',
  'Solution', 'Your', 'code', 'here',
]);

function extractDocumentWords(code: string, currentPrefix: string, language: 'cpp' | 'sql'): CompletionItem[] {
  const matches = code.match(/[A-Za-z_][A-Za-z0-9_]*/g);
  if (!matches) return [];
  const counts = new Map<string, number>();
  for (const w of matches) {
    if (w.length < 2 || w === currentPrefix) continue;
    if (language === 'cpp' && CPP_SKIP_WORDS.has(w)) continue;
    counts.set(w, (counts.get(w) || 0) + 1);
  }
  const items: CompletionItem[] = [];
  for (const [word] of counts.entries()) {
    items.push({
      label: word,
      insertText: word,
      kind: 'variable',
      detail: 'in file',
    });
  }
  return items;
}

export function getCompletions(
  code: string,
  cursorPos: number,
  language: 'cpp' | 'sql',
  forceShow = false
): CompletionResult | null {
  const before = code.slice(0, cursorPos);
  const identMatch = /([A-Za-z_][A-Za-z0-9_]*)$/.exec(before);
  const prefix = identMatch ? identMatch[1] : '';
  const replaceStart = cursorPos - prefix.length;

  // Check if right after `.` or `->` in C++ (member access)
  const beforePrefix = before.slice(0, replaceStart);
  const isMemberAccess =
    language === 'cpp' &&
    (/(?:\.|->)\s*$/.test(beforePrefix) || (prefix.length > 0 && /(?:\.|->)$/.test(beforePrefix)));

  if (!forceShow) {
    if (isMemberAccess) {
      // Show member completions even with 0 or 1+ chars after `.` / `->`
    } else if (prefix.length < 2) {
      return null;
    }
  }

  // Avoid triggering inside line comments
  const lineStart = before.lastIndexOf('\n') + 1;
  const currentLineBeforeCursor = before.slice(lineStart);
  if (language === 'cpp' && /^\s*\/\//.test(currentLineBeforeCursor)) {
    return null;
  }
  if (language === 'sql' && /^\s*--/.test(currentLineBeforeCursor)) {
    return null;
  }

  const baseCandidates: CompletionItem[] =
    language === 'sql'
      ? [...SQL_COMPLETIONS, ...extractDocumentWords(code, prefix, 'sql')]
      : isMemberAccess
      ? CPP_MEMBER_COMPLETIONS
      : [...CPP_GENERAL_COMPLETIONS, ...extractDocumentWords(code, prefix, 'cpp')];

  const lowerPrefix = prefix.toLowerCase();
  const seen = new Set<string>();
  const scored: Array<{ item: CompletionItem; score: number }> = [];

  for (const item of baseCandidates) {
    if (seen.has(item.label)) continue;
    const labelLower = item.label.toLowerCase();
    const insertLower = item.insertText.toLowerCase();

    if (prefix.length === 0) {
      seen.add(item.label);
      scored.push({ item, score: item.kind === 'variable' ? 2 : 1 });
      continue;
    }

    // Never suggest identical word with no extra benefit
    if (item.insertText.trim() === prefix) continue;

    let score = -1;
    if (item.label.startsWith(prefix)) {
      score = 100;
    } else if (labelLower.startsWith(lowerPrefix) || insertLower.startsWith(lowerPrefix)) {
      score = 80;
    } else if (labelLower.includes(lowerPrefix)) {
      score = 40;
    }

    if (score > 0) {
      // Prefer keywords/types/functions over generic words when tied
      if (item.kind !== 'variable') score += 5;
      // Shorter labels slightly favored
      score -= Math.min(20, item.label.length * 0.2);
      seen.add(item.label);
      scored.push({ item, score });
    }
  }

  if (scored.length === 0) return null;

  scored.sort((a, b) => b.score - a.score || a.item.label.localeCompare(b.item.label));

  return {
    prefix,
    replaceStart,
    items: scored.slice(0, 9).map((s) => s.item),
  };
}
