import { ExecutionResult } from '../judge/types';

export interface CodeMistakeItem {
  line?: number;
  title: string;
  detail: string;
  fixHint: string;
}

export interface MethodAnalysisReport {
  detectedMethod: string;
  estimatedComplexity: string;
  targetComplexity: string;
  mistakes: CodeMistakeItem[];
  guidanceSteps: string[];
  summary: string;
}

export interface AnalysisInput {
  problemId: number;
  problemTitle: string;
  problemStatement: string;
  functionSignature?: string;
  constraints?: string;
  topic?: string;
  pattern?: string;
  category?: string;
  userCode: string;
  verdict?: string;
  executionResult?: ExecutionResult;
  userQuestion?: string;
  isSolved: boolean;
}

function inferTargetComplexity(constraints?: string, topic?: string): string {
  const c = (constraints || '').toLowerCase();
  if (c.includes('10^5') || c.includes('10^6') || c.includes('100000')) {
    return 'O(N) or O(N log N)';
  }
  if (c.includes('10^4') || c.includes('5 * 10^4')) {
    return 'O(N) or O(N log N)';
  }
  if (c.includes('10^3') || c.includes('3000') || c.includes('1000')) {
    return 'O(N^2) or better';
  }
  if (topic === 'Binary Search') return 'O(log N) or O(N log M)';
  return 'Optimal pattern complexity';
}

function isSkeletonStub(code: string): boolean {
  const cleaned = code
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (cleaned.length < 28) return true;
  if (/\{\s*\}$/.test(cleaned)) return true;
  return /class Solution\s*\{\s*public:\s*[^\{]+\{\s*\}\s*;?\s*\}$/.test(cleaned);
}

function analyzeCppCode(input: AnalysisInput): MethodAnalysisReport {
  const lines = input.userCode.split(/\r?\n/);
  const code = input.userCode;
  const targetComplexity = inferTargetComplexity(input.constraints, input.topic);
  const mistakes: CodeMistakeItem[] = [];
  const guidanceSteps: string[] = [];

  if (isSkeletonStub(code)) {
    return {
      detectedMethod: 'Starter Skeleton (No logic implemented yet)',
      estimatedComplexity: 'N/A',
      targetComplexity,
      mistakes: [
        {
          title: 'Function body is still empty',
          detail: 'The current editor code only contains the starter class/signature stub.',
          fixHint: `Start by implementing the ${input.pattern || input.topic || 'core'} approach inside the function body and handling boundary cases.`,
        },
      ],
      guidanceSteps: [
        `Identify the input structure from the signature (${input.functionSignature || 'method'}) and constraints (${targetComplexity}).`,
        `Draft the main loop or recursion using the ${input.pattern || input.topic || 'target'} invariant.`,
        'Click Run to test against the sample cases, then click Analyze My Code again so I can check your logic for bugs.',
      ],
      summary: `Your editor only has the starter skeleton right now. Write your initial attempt (${targetComplexity} target) and click Analyze My Code to get line-by-line feedback.`,
    };
  }

  // 1. Detect Candidate Method & Loop Nesting
  let maxBraceDepth = 0;
  let loopCount = 0;
  let maxLoopNesting = 0;
  const loopDepthStack: number[] = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const lineNo = i + 1;
    const stripped = rawLine.replace(/\/\/.*$/, '');

    const isLoop = /\b(for|while)\s*\(/.test(stripped);
    if (isLoop) {
      loopCount++;
      loopDepthStack.push(maxBraceDepth);
      maxLoopNesting = Math.max(maxLoopNesting, loopDepthStack.length);
    }

    const opens = (stripped.match(/\{/g) || []).length;
    const closes = (stripped.match(/\}/g) || []).length;
    maxBraceDepth += opens - closes;
    while (loopDepthStack.length > 0 && maxBraceDepth <= loopDepthStack[loopDepthStack.length - 1]) {
      loopDepthStack.pop();
    }

    // Mistake: Binary search midpoint integer overflow
    if (/\(\s*[a-zA-Z_]\w*\s*\+\s*[a-zA-Z_]\w*\s*\)\s*\/\s*2\b/.test(stripped)) {
      mistakes.push({
        line: lineNo,
        title: 'Potential midpoint overflow',
        detail: 'Computing (left + right) / 2 can overflow signed 32-bit int when indices are large.',
        fixHint: 'Use left + (right - left) / 2 instead.',
      });
    }

    // Mistake: Unsigned .size() subtraction underflow
    if (/\.\s*(size|length)\(\s*\)\s*-\s*[1-9a-zA-Z_]/.test(stripped) && !/static_cast<\s*int\s*>|\(\s*int\s*\)/.test(stripped)) {
      mistakes.push({
        line: lineNo,
        title: 'Unsigned .size() subtraction trap',
        detail: '.size() returns size_t (unsigned). If the container is empty or too small, size() - 1 underflows to ~1.8e19 and can crash or loop forever.',
        fixHint: 'Cast with static_cast<int>(container.size()) - 1 or guard !container.empty() first.',
      });
    }

    // Mistake: Single '=' inside if (...)
    if (/\bif\s*\([^=<>!]*[^=<>!]=[^=][^)]*\)/.test(stripped)) {
      mistakes.push({
        line: lineNo,
        title: 'Assignment (=) instead of equality (==) inside if condition',
        detail: 'A single = inside an if(...) assigns a value instead of comparing.',
        fixHint: 'Replace = with == if you meant a comparison check.',
      });
    }

    // Mistake: accumulate(..., 0) overflow
    if (/accumulate\([^,]+,[^,]+,\s*0\s*\)/.test(stripped)) {
      mistakes.push({
        line: lineNo,
        title: '32-bit sum accumulator risk',
        detail: 'std::accumulate(..., 0) sums into an int, which can overflow on large arrays.',
        fixHint: 'Use 0LL when sums may exceed 2^31 - 1.',
      });
    }

    // Mistake: Infinite loop pattern in binary search
    if (/while\s*\(\s*\w+\s*<=\s*\w+\s*\)/.test(code) && /\b(r|right|hi|high)\s*=\s*mid\s*;/.test(stripped)) {
      mistakes.push({
        line: lineNo,
        title: 'Binary search infinite loop risk',
        detail: 'Using while (l <= r) together with r = mid can loop forever when l == r == mid.',
        fixHint: 'Either use r = mid - 1 with while (l <= r), or use while (l < r) with r = mid.',
      });
    }

    // Mistake: Out-of-bounds [i + 1] or [i - 1] without visible guard on same/adjacent loop
    if (/\[i\s*\+\s*1\]/.test(stripped) && /\.size\(\)/.test(code) && !/i\s*\+\s*1\s*</.test(code)) {
      mistakes.push({
        line: lineNo,
        title: 'Check index bounds for [i + 1]',
        detail: 'Indexing [i + 1] can read past the last element if the loop stops at size() instead of size() - 1.',
        fixHint: 'Ensure your loop condition stops at i + 1 < n or verify i + 1 < size() before accessing.',
      });
    }
  }

  // Global C++ structural checks
  const hasUnorderedMap = /\bunordered_map\b/.test(code);
  const hasOrderedMap = /\bmap\s*</.test(code) && !hasUnorderedMap;
  const hasSet = /\bunordered_set\b|\bset\s*</.test(code);
  const hasSort = /\bsort\s*\(/.test(code);
  const hasStackOrQueue = /\bstack\b|\bqueue\b|\bdeque\b|\bpriority_queue\b/.test(code);
  const hasDpArray = /\bdp\b/.test(code);
  const hasBinarySearch = /\bmid\b/.test(code) && (/\blow\b|\blo\b|\bl\b/.test(code)) && (/\bhigh\b|\bhi\b|\br\b/.test(code));
  const methodNameMatch = input.functionSignature?.match(/\b([A-Za-z_]\w*)\s*\(/);
  const methodName = methodNameMatch?.[1];
  const isRecursive = Boolean(
    methodName && (code.match(new RegExp(`\\b${methodName}\\s*\\(`, 'g')) || []).length >= 2
  );

  // Return statement check for non-void signature
  const expectsReturn = Boolean(input.functionSignature && !input.functionSignature.trim().startsWith('void '));
  if (expectsReturn && !/\breturn\b/.test(code)) {
    mistakes.push({
      title: 'Missing return statement',
      detail: `Signature '${input.functionSignature}' expects a return value, but no return statement was found.`,
      fixHint: 'Make sure every execution path returns a value matching the return type.',
    });
  }

  // LinkedList / Tree null dereference guard
  if ((code.includes('ListNode') || code.includes('TreeNode') || code.includes('->next') || code.includes('->left')) && !/\bnullptr\b|\bNULL\b|!\s*\w+/.test(code)) {
    mistakes.push({
      title: 'Missing null pointer guard',
      detail: 'Your code accesses ->next or ->left/->right without a visible nullptr base check.',
      fixHint: 'Check if node == nullptr (or while (fast && fast->next)) before dereferencing.',
    });
  }

  // Execution diagnostic translation
  const execAny = input.executionResult as
    | {
        compileError?: string;
        stderr?: string;
        error?: string;
        failedTestCase?: { input: string; expected: string; actual: string };
      }
    | undefined;
  const runtimeOrCompileErr = execAny?.compileError || execAny?.error || execAny?.stderr;

  if (runtimeOrCompileErr && (input.verdict === 'Compile Error' || input.verdict === 'Runtime Error' || execAny?.compileError)) {
    const comp = runtimeOrCompileErr;
    const lineMatch = comp.match(/[Ll]ine\s*(\d+)/);
    const parsedLine = lineMatch ? parseInt(lineMatch[1], 10) : undefined;
    let fixHint = 'Verify C++17 types, semicolons, brackets, and exact parameter types matching the stub.';
    if (comp.includes('control reaches end of non-void')) {
      fixHint = 'Add a default return statement at the end of your function outside if/for blocks.';
    } else if (comp.includes('was not declared in this scope')) {
      fixHint = 'Check variable spelling and ensure variables are declared before use (or inside the right block).';
    } else if (comp.includes('no matching function')) {
      fixHint = 'Check argument types/order passed to STL helpers (e.g. sort, max, unordered_map, push_back).';
    } else if (input.verdict === 'Runtime Error') {
      fixHint = 'Check out-of-bounds vector indexing, empty-container .back()/pop(), or null pointer dereferences.';
    }
    mistakes.unshift({
      line: parsedLine,
      title: input.verdict === 'Runtime Error' ? 'Runtime Error' : 'Compilation Error',
      detail: comp.split('\n').slice(0, 3).join(' ').slice(0, 240),
      fixHint,
    });
  } else if (input.verdict === 'Time Limit Exceeded' || (maxLoopNesting >= 2 && targetComplexity.includes('O(N)'))) {
    mistakes.push({
      title: maxLoopNesting >= 2 ? 'Quadratic O(N^2) nested loops vs large constraint' : 'Time Limit Exceeded risk',
      detail: `Detected ${maxLoopNesting >= 2 ? `${maxLoopNesting}-level nested loops` : 'a time limit failure'} while the problem targets ${targetComplexity}.`,
      fixHint: `Flatten the inner scan using ${hasUnorderedMap ? 'direct index arithmetic' : 'an unordered_map / unordered_set, sorting + two pointers, or monotonic stack'}.`,
    });
  } else if (input.executionResult?.failedTestCase) {
    const tc = input.executionResult.failedTestCase;
    let hint = 'Trace your variables step-by-step on this exact failing input to find where state diverges.';
    if ((tc.actual === '[]' || tc.actual === '0' || tc.actual === '-1') && tc.expected !== tc.actual) {
      hint = 'Your loop/base case exited early or missed a valid match—check boundary comparisons (< vs <=) and fallback return values.';
    } else if (/^-?\d+$/.test(tc.actual) && /^-?\d+$/.test(tc.expected)) {
      const diff = Math.abs(Number(tc.actual) - Number(tc.expected));
      if (diff === 1) {
        hint = 'Off-by-1 discrepancy! Check index boundaries, initial counter (0 vs 1), or strict < vs <=.';
      } else if (Number(tc.actual) < 0 && Number(tc.expected) > 0) {
        hint = 'Negative output vs positive expected strongly suggests integer overflow or subtraction order.';
      }
    }
    mistakes.unshift({
      title: `Failed Test Case (${input.verdict || 'Wrong Answer'})`,
      detail: `Input: ${tc.input} → Expected: ${tc.expected}, Got: ${tc.actual}`,
      fixHint: hint,
    });
  }

  if (hasOrderedMap && !hasUnorderedMap && loopCount > 0) {
    mistakes.push({
      title: 'std::map used where unordered_map is faster',
      detail: 'std::map performs O(log N) tree operations per lookup vs O(1) average for unordered_map.',
      fixHint: 'Unless sorted key traversal is required, switch to unordered_map for faster runtime.',
    });
  }

  // Approach classification & complexity estimate
  const methodTags: string[] = [];
  let estimatedComplexity = 'O(1)';

  if (isRecursive && !hasDpArray) {
    methodTags.push('Recursive Search (no visible memoization)');
    estimatedComplexity = 'O(branch^depth) unless pruned or linear tree depth';
  } else if (hasDpArray) {
    methodTags.push('Dynamic Programming');
    estimatedComplexity = maxLoopNesting >= 2 ? 'O(N * M)' : 'O(N)';
  } else if (hasBinarySearch) {
    methodTags.push('Binary Search');
    estimatedComplexity = maxLoopNesting >= 2 ? 'O(N log M)' : 'O(log N)';
  } else if (hasSort && maxLoopNesting >= 2) {
    methodTags.push('Sorting + Nested/Two-Pointer Scan');
    estimatedComplexity = 'O(N^2) / O(N log N)';
  } else if (hasSort) {
    methodTags.push('Sorting-Based Approach');
    estimatedComplexity = 'O(N log N)';
  } else if (hasUnorderedMap || hasSet) {
    methodTags.push('Hash Table Lookup');
    estimatedComplexity = maxLoopNesting >= 2 ? 'O(N^2)' : 'O(N) avg';
  } else if (hasStackOrQueue) {
    methodTags.push('Stack / Queue / Heap');
    estimatedComplexity = 'O(N) or O(N log K)';
  } else if (maxLoopNesting >= 3) {
    methodTags.push('Triple Nested Loops');
    estimatedComplexity = 'O(N^3)';
  } else if (maxLoopNesting === 2) {
    methodTags.push('Nested Loops (Brute-Force / Matrix Scan)');
    estimatedComplexity = 'O(N^2)';
  } else if (loopCount >= 1) {
    methodTags.push('Single-Pass / Linear Iteration');
    estimatedComplexity = 'O(N)';
  } else {
    methodTags.push('Direct Expression / Constant-Time Logic');
  }

  const detectedMethod = methodTags.join(' + ');

  if (input.isSolved) {
    guidanceSteps.push('Your method passed all tests! Double-check whether any extra array/map can be reduced to O(1) space or fewer passes.');
  } else if (mistakes.length === 0) {
    guidanceSteps.push(`Your ${detectedMethod} looks structurally clean (Est. ${estimatedComplexity}). Run it against sample and hidden tests to verify edge cases.`);
  } else {
    guidanceSteps.push(`Address the highlighted ${mistakes.length === 1 ? 'issue' : `${mistakes.length} issues`} above before re-running.`);
  }

  if (input.pattern && !hasUnorderedMap && !hasBinarySearch && !hasDpArray && input.pattern.toLowerCase().includes('hash')) {
    guidanceSteps.push(`Tip for this problem (${input.pattern}): an unordered_map/unordered_set can remove inner scans for O(N) time.`);
  } else if (input.pattern) {
    guidanceSteps.push(`Target pattern focus: ${input.pattern} (${targetComplexity}).`);
  }

  if (input.userQuestion?.trim()) {
    guidanceSteps.unshift(`Regarding your question ("${input.userQuestion.trim()}"): Look at your ${detectedMethod} (${estimatedComplexity}) and the checks flagged above—verify base cases, loop bounds, and container state transitions on edge inputs.`);
  }

  const summaryLines = [
    `Method Detected: ${detectedMethod} (${estimatedComplexity} | Target: ${targetComplexity})`,
    '',
    mistakes.length > 0
      ? `Mistakes / Risks Found (${mistakes.length}):\n${mistakes
          .map((m, idx) => `${idx + 1}. ${m.line ? `[Line ${m.line}] ` : ''}${m.title}: ${m.detail}\n   Fix: ${m.fixHint}`)
          .join('\n')}`
      : 'No obvious static C++ syntax or complexity traps detected in your current code.',
    '',
    `Guidance:\n${guidanceSteps.map((s) => `• ${s}`).join('\n')}`,
  ];

  return {
    detectedMethod,
    estimatedComplexity,
    targetComplexity,
    mistakes,
    guidanceSteps,
    summary: summaryLines.join('\n'),
  };
}

function analyzeSqlCode(input: AnalysisInput): MethodAnalysisReport {
  const sql = input.userCode.trim();
  const upper = sql.toUpperCase();
  const mistakes: CodeMistakeItem[] = [];
  const guidanceSteps: string[] = [];

  if (!sql || /^--[^\n]*$/.test(sql)) {
    return {
      detectedMethod: 'Empty SQL Editor',
      estimatedComplexity: 'Relational Query',
      targetComplexity: 'Clean SELECT + JOIN/GROUP/WINDOW',
      mistakes: [
        {
          title: 'No SQL query written yet',
          detail: 'Write a SELECT query using the schema tables shown on the left.',
          fixHint: 'Start with SELECT ... FROM ... and verify column aliases against expected output.',
        },
      ],
      guidanceSteps: [
        'Inspect the schema columns first.',
        'Check whether unmatched rows require LEFT JOIN instead of INNER JOIN.',
        'Run your query to test relational output equality.',
      ],
      summary: 'Write a SELECT query first, then run Analyze My Query to get targeted feedback on joins, grouping, NULLs, and ordering.',
    };
  }

  const methods: string[] = [];
  if (/\bWITH\b/.test(upper)) methods.push('CTE');
  if (/\bOVER\s*\(/.test(upper)) methods.push('Window Function');
  if (/\bLEFT\s+(?:OUTER\s+)?JOIN\b/.test(upper)) methods.push('LEFT JOIN');
  else if (/\bJOIN\b/.test(upper)) methods.push('INNER JOIN');
  if (/\bGROUP\s+BY\b/.test(upper)) methods.push('GROUP BY Aggregation');
  if (/\bSELECT\s+DISTINCT\b/.test(upper)) methods.push('DISTINCT Projection');
  const detectedMethod = methods.length > 0 ? methods.join(' + ') : 'Standard SELECT Filter Query';

  // Common SQL mistakes
  if (/=\s*NULL\b|!=\s*NULL\b|<>\s*NULL\b/.test(upper)) {
    mistakes.push({
      title: 'Invalid NULL comparison (= NULL)',
      detail: 'In SQL, = NULL or != NULL always evaluates to UNKNOWN/false.',
      fixHint: 'Use IS NULL or IS NOT NULL instead.',
    });
  }

  if (/\bWHERE\b[\s\S]*\b(COUNT|SUM|AVG|MIN|MAX)\s*\(/i.test(sql) && !/\bSELECT\b[\s\S]*\b(WHERE)\b[\s\S]*\(\s*SELECT\b/i.test(sql)) {
    mistakes.push({
      title: 'Aggregate function inside WHERE clause',
      detail: 'SQL cannot filter aggregate values (COUNT/SUM/AVG) inside WHERE.',
      fixHint: 'Move aggregate conditions to HAVING (or compute in a CTE/subquery first).',
    });
  }

  const hasAgg = /\b(COUNT|SUM|AVG|MIN|MAX)\s*\(/.test(upper) && !/\bOVER\s*\(/.test(upper);
  if (hasAgg && !/\bGROUP\s+BY\b/.test(upper)) {
    const selectPart = upper.split(/\bFROM\b/)[0] || '';
    if (selectPart.includes(',')) {
      mistakes.push({
        title: 'Aggregate mixed with ungrouped SELECT columns',
        detail: 'When selecting non-aggregated columns alongside COUNT/SUM/AVG, SQL requires GROUP BY.',
        fixHint: 'Add GROUP BY for all non-aggregated SELECT columns, or use a window function OVER (...).',
      });
    }
  }

  if (/\bLIMIT\b/.test(upper) && !/\bORDER\s+BY\b/.test(upper)) {
    mistakes.push({
      title: 'LIMIT used without ORDER BY',
      detail: 'Without ORDER BY, SQLite row ordering with LIMIT is non-deterministic.',
      fixHint: 'Add an explicit ORDER BY clause before LIMIT.',
    });
  }

  const sqlExec = input.executionResult as
    | {
        compileError?: string;
        error?: string;
        failedTestCase?: { actual?: string };
        rows?: Array<Record<string, unknown>>;
        expectedRows?: Array<Record<string, unknown>>;
      }
    | undefined;
  const sqlErrText = sqlExec?.compileError || sqlExec?.error;

  if (sqlErrText || input.verdict === 'Query Error') {
    mistakes.unshift({
      title: 'SQL Execution / Syntax Error',
      detail: sqlErrText || 'SQLite rejected the query syntax or column reference.',
      fixHint: 'Double-check exact table names, aliases, commas, and column names in the Schema panel.',
    });
  } else if (input.verdict === 'Wrong Answer') {
    const actualSample =
      sqlExec?.failedTestCase?.actual?.slice(0, 140) ||
      (sqlExec?.rows ? `${sqlExec.rows.length} rows returned (expected ${sqlExec.expectedRows?.length ?? '?'})` : 'Output mismatch');
    mistakes.unshift({
      title: 'Result Set Mismatch',
      detail: `Expected rows/columns differed from your output: ${actualSample}`,
      fixHint: 'Check column alias names (AS ...), LEFT JOIN vs INNER JOIN for missing/zero rows, NULL filtering (COALESCE), and duplicate rows.',
    });
  }

  if (input.isSolved) {
    guidanceSteps.push('Query passed all assertions! Check whether a single LEFT JOIN + GROUP BY or window function simplifies any subqueries.');
  } else {
    guidanceSteps.push('Verify your output column names match the example headers exactly.');
    guidanceSteps.push('Check whether NULLs should become 0 via COALESCE(..., 0) or remain excluded.');
  }

  const summary = [
    `SQL Method Detected: ${detectedMethod}`,
    '',
    mistakes.length > 0
      ? `Potential SQL Issues (${mistakes.length}):\n${mistakes
          .map((m, idx) => `${idx + 1}. ${m.title}: ${m.detail}\n   Fix: ${m.fixHint}`)
          .join('\n')}`
      : 'No static SQL anti-patterns spotted. Verify exact column aliases and edge rows (NULLs/ties).',
    '',
    `Guidance:\n${guidanceSteps.map((s) => `• ${s}`).join('\n')}`,
  ].join('\n');

  return {
    detectedMethod,
    estimatedComplexity: 'Relational Query Plan',
    targetComplexity: 'Single-pass JOIN / Window / Aggregate',
    mistakes,
    guidanceSteps,
    summary,
  };
}

export class CodeAnalyzerService {
  static analyze(input: AnalysisInput): MethodAnalysisReport {
    if (input.category === 'SQL') {
      return analyzeSqlCode(input);
    }
    return analyzeCppCode(input);
  }
}

