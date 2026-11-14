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

function isTrivialLiteralReturn(code: string): boolean {
  const cleaned = code
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
  // Matches a Solution method whose body is just returning a literal constant or empty braced init
  return /class Solution\s*\{\s*public:\s*[^\{]+\{\s*return\s+(-?\d+|true|false|nullptr|""|''|\{\s*\})\s*;\s*\}\s*;?\s*\}$/.test(
    cleaned
  );
}

function checkBraceAndParenBalance(code: string): string | null {
  const cleaned = code
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')
    .replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, '""');
  let braces = 0;
  let parens = 0;
  for (const ch of cleaned) {
    if (ch === '{') braces++;
    else if (ch === '}') braces--;
    else if (ch === '(') parens++;
    else if (ch === ')') parens--;
    if (braces < 0) return 'Extra closing brace `}` found before a matching `{`.';
    if (parens < 0) return 'Extra closing parenthesis `)` found before a matching `(`.';
  }
  if (braces !== 0) return `Unbalanced braces: ${braces > 0 ? `${braces} unclosed '{'` : `${-braces} extra '}'`}.`;
  if (parens !== 0) return `Unbalanced parentheses: ${parens > 0 ? `${parens} unclosed '('` : `${-parens} extra ')'`}.`;
  return null;
}

function analyzeCppCode(input: AnalysisInput): MethodAnalysisReport {
  const lines = input.userCode.split(/\r?\n/);
  const code = input.userCode;
  const targetComplexity = inferTargetComplexity(input.constraints, input.topic);
  const mistakes: CodeMistakeItem[] = [];
  const guidanceSteps: string[] = [];
  const isVerifiedAccepted = input.verdict === 'Accepted';
  const hasFailureVerdict = Boolean(input.verdict && input.verdict !== 'Accepted');

  if (isSkeletonStub(code)) {
    return {
      detectedMethod: 'Starter Skeleton (No logic implemented yet)',
      estimatedComplexity: 'Incomplete (Empty Stub)',
      targetComplexity,
      mistakes: [
        {
          title: 'Function body is still empty',
          detail: 'The current editor code only contains the starter class/signature stub.',
          fixHint: `Implement the ${input.pattern || input.topic || 'core'} algorithm inside the function body and return the expected result.`,
        },
      ],
      guidanceSteps: [
        `Identify the input parameters from ${input.functionSignature || 'the method signature'} and target ${targetComplexity}.`,
        `Draft the main loop or recursion using the ${input.pattern || input.topic || 'target'} invariant.`,
        'Click Run to verify against sample test cases, then inspect any failing edge cases.',
      ],
      summary: `No logic implemented yet — the editor only contains the starter skeleton. Implement your ${targetComplexity} approach and click Run/Submit.`,
    };
  }

  const balanceErr = checkBraceAndParenBalance(code);
  if (balanceErr) {
    mistakes.push({
      title: 'Syntax Error: Unbalanced Braces / Parentheses',
      detail: balanceErr,
      fixHint: 'Match every `{` with `}` and every `(` with `)` before compiling.',
    });
  }

  if (isTrivialLiteralReturn(code) && !isVerifiedAccepted) {
    mistakes.push({
      title: 'Incomplete / Hardcoded Return Statement',
      detail: 'Your function only returns a constant literal without processing the input parameters.',
      fixHint: `Replace the hardcoded return with actual logic to handle the problem inputs (${input.pattern || targetComplexity}).`,
    });
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

    const isLoop = /\b(for|while)\s*\(/.test(stripped) || /\bdo\s*\{/.test(stripped);
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

    // Mistake: Off-by-one `<= container.size()` or `<= container.length()`
    if (/\b(?:for|while)\s*\([^)]*<=\s*[a-zA-Z_]\w*\s*\.\s*(size|length)\(\s*\)/.test(stripped)) {
      mistakes.push({
        line: lineNo,
        title: 'Off-by-one loop bound (<= .size())',
        detail: 'Indices run from 0 to size() - 1; using <= container.size() accesses one element past the end.',
        fixHint: 'Change `<= container.size()` to `< container.size()`.',
      });
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
        detail: '.size() returns size_t (unsigned). If the container is empty or smaller than the subtracted value, subtraction underflows to ~1.8e19.',
        fixHint: 'Cast to int first: `static_cast<int>(container.size()) - 1` or guard `!container.empty()`.',
      });
    }

    // Mistake: Single '=' inside if (...) or while (...)
    if (/\b(?:if|while)\s*\([^;()]*[^=!<>]=[^=][^;()]*\)/.test(stripped)) {
      mistakes.push({
        line: lineNo,
        title: 'Assignment (=) instead of equality (==) in condition',
        detail: 'A single `=` assigns a value instead of comparing equality inside `if` / `while`.',
        fixHint: 'Replace `=` with `==` if you intended a comparison.',
      });
    }

    // Mistake: Uninitialized local scalar variable inside function body (excluding class fields? C++ Solution rarely needs uninit scalars)
    if (
      /^\s*(?:int|long|long\s+long|double|float|bool|char)\s+([a-zA-Z_]\w*)\s*;\s*$/.test(stripped) &&
      maxBraceDepth >= 2
    ) {
      const varMatch = stripped.match(/^\s*(?:int|long|long\s+long|double|float|bool|char)\s+([a-zA-Z_]\w*)\s*;/);
      mistakes.push({
        line: lineNo,
        title: `Uninitialized variable \`${varMatch?.[1] || 'var'}\``,
        detail: `Local primitive \`${varMatch?.[1] || 'var'}\` has an indeterminate garbage value in C++ if read before assignment.`,
        fixHint: `Initialize explicitly (e.g., \`= 0\`, \`= INT_MIN\`, or \`= false\`).`,
      });
    }

    // Mistake: accumulate(..., 0) overflow
    if (/accumulate\([^,]+,[^,]+,\s*0\s*\)/.test(stripped)) {
      mistakes.push({
        line: lineNo,
        title: '32-bit sum accumulator risk',
        detail: 'std::accumulate(..., 0) sums into an int, which can overflow on large arrays.',
        fixHint: 'Use `0LL` as the initial value when sums can exceed 2^31 - 1.',
      });
    }

    // Mistake: Infinite loop pattern in binary search
    if (/while\s*\(\s*\w+\s*<=\s*\w+\s*\)/.test(code) && /\b(r|right|hi|high)\s*=\s*mid\s*;/.test(stripped)) {
      mistakes.push({
        line: lineNo,
        title: 'Binary search infinite loop risk',
        detail: 'Using while (l <= r) together with r = mid can loop forever when l == r == mid.',
        fixHint: 'Use `r = mid - 1` with `while (l <= r)`, or use `while (l < r)` with `r = mid`.',
      });
    }

    // Mistake: Out-of-bounds [i + 1] or [i - 1]
    if (/\[i\s*\+\s*1\]/.test(stripped) && /\.size\(\)/.test(code) && !/i\s*\+\s*1\s*</.test(code)) {
      mistakes.push({
        line: lineNo,
        title: 'Check index bounds for `[i + 1]`',
        detail: 'Indexing `[i + 1]` can read past the last element if the loop stops at `size()` instead of `size() - 1`.',
        fixHint: 'Ensure your loop condition stops at `i + 1 < n` or check bounds before accessing `[i + 1]`.',
      });
    }

    if (/\[i\s*-\s*1\]/.test(stripped) && /for\s*\(\s*(?:int|size_t)\s+i\s*=\s*0\b/.test(code) && !/\bi\s*>\s*0\b|\bi\s*>=\s*1\b/.test(code)) {
      mistakes.push({
        line: lineNo,
        title: 'Potential negative index `[i - 1]` when `i == 0`',
        detail: 'Loop starts at `i = 0` and accesses `[i - 1]` without a visible `i > 0` guard.',
        fixHint: 'Start the loop at `i = 1` or guard with `if (i > 0)` before reading `[i - 1]`.',
      });
    }

    // Mistake: vector::erase(vec.begin()) inside a loop -> O(N^2) shift
    if (loopDepthStack.length > 0 && /\.erase\s*\([^)]*\.begin\s*\(/.test(stripped)) {
      mistakes.push({
        line: lineNo,
        title: 'Linear `.erase(begin())` inside loop',
        detail: 'Erasing from the front of a std::vector shifts all remaining elements (O(N) per erase -> O(N^2) total).',
        fixHint: 'Use `std::deque`, two indices/pointers, or pop from `.back()` instead.',
      });
    }
  }

  // Global C++ structural checks
  const hasUnorderedMap = /\bunordered_map\b/.test(code);
  const hasOrderedMap = /\bmap\s*</.test(code) && !hasUnorderedMap;
  const hasSet = /\bunordered_set\b|\bset\s*</.test(code);
  const hasSort = /\bsort\s*\(/.test(code);
  const hasStlLinear = /\b(accumulate|max_element|min_element|reverse|find|count|fill|partial_sum)\s*\(/.test(code);
  const hasStlLog = /\b(lower_bound|upper_bound|binary_search)\s*\(/.test(code);
  const hasStackOrQueue = /\bstack\b|\bqueue\b|\bdeque\b|\bpriority_queue\b/.test(code);
  const hasDpArray = /\bdp\b/.test(code);
  const hasBinarySearch =
    hasStlLog || (/\bmid\b/.test(code) && /\blow\b|\blo\b|\bl\b|\bleft\b/.test(code) && /\bhigh\b|\bhi\b|\br\b|\bright\b/.test(code));

  // Detect recursion in main method OR any helper method inside Solution
  const declaredFnNames = Array.from(
    code.matchAll(/\b(?:void|int|long(?:\s+long)?|bool|double|float|string|char|auto|vector<[^>]+>)\s+([A-Za-z_]\w*)\s*\(/g)
  )
    .map((m) => m[1])
    .filter((name) => name !== 'if' && name !== 'for' && name !== 'while' && name !== 'switch');
  const sigMatch = input.functionSignature?.match(/\b([A-Za-z_]\w*)\s*\(/);
  if (sigMatch?.[1] && !declaredFnNames.includes(sigMatch[1])) {
    declaredFnNames.push(sigMatch[1]);
  }
  const isRecursive = declaredFnNames.some(
    (fnName) => (code.match(new RegExp(`\\b${fnName}\\s*\\(`, 'g')) || []).length >= 2
  );

  // Return statement check for non-void signature
  const expectsReturn = Boolean(input.functionSignature && !input.functionSignature.trim().startsWith('void '));
  if (expectsReturn && !/\breturn\b/.test(code)) {
    mistakes.push({
      title: 'Missing return statement',
      detail: `Signature '${input.functionSignature}' expects a return value, but no return statement was found.`,
      fixHint: 'Ensure every execution path returns a value matching the return type.',
    });
  }

  // LinkedList / Tree null dereference guard
  if (
    (code.includes('ListNode') || code.includes('TreeNode') || code.includes('->next') || code.includes('->left')) &&
    !/\bnullptr\b|\bNULL\b|!\s*\w+/.test(code)
  ) {
    mistakes.push({
      title: 'Missing null pointer guard',
      detail: 'Your code accesses `->next` or `->left`/`->right` without a visible nullptr base check.',
      fixHint: 'Check `if (!node)` / `node == nullptr` (or `while (fast && fast->next)`) before dereferencing.',
    });
  }

  // Execution diagnostic translation
  const execAny = input.executionResult as
    | {
        compileError?: string;
        stderr?: string;
        error?: string;
        passedTestCases?: number;
        totalTestCases?: number;
        failedTestCase?: { input: string; expected: string; actual: string; testIndex?: number };
      }
    | undefined;
  const runtimeOrCompileErr = execAny?.compileError || execAny?.error || execAny?.stderr;
  const tcProgress =
    typeof execAny?.passedTestCases === 'number' && typeof execAny?.totalTestCases === 'number' && execAny.totalTestCases > 0
      ? `Passed ${execAny.passedTestCases}/${execAny.totalTestCases} test cases`
      : '';

  if (runtimeOrCompileErr && (input.verdict === 'Compile Error' || input.verdict === 'Runtime Error' || execAny?.compileError)) {
    const comp = runtimeOrCompileErr;
    const lineMatch = comp.match(/[Ll]ine\s*(\d+)|:(\d+):\d+:\s*error:/);
    const parsedLine = lineMatch ? parseInt(lineMatch[1] || lineMatch[2], 10) : undefined;
    let fixHint = 'Verify C++17 types, semicolons, brackets, and exact parameter types matching the stub.';
    if (comp.includes('control reaches end of non-void')) {
      fixHint = 'Add a fallback `return` statement at the end of your function outside `if`/`for` blocks.';
    } else if (comp.includes('was not declared in this scope')) {
      fixHint = 'Check variable spelling and ensure variables are declared in the outer scope where used.';
    } else if (comp.includes('no matching function')) {
      fixHint = 'Check argument types/order passed to STL helpers (e.g. sort, max, unordered_map, push_back).';
    } else if (input.verdict === 'Runtime Error') {
      fixHint = 'Check out-of-bounds vector indexing, empty-container `.back()`/`.top()`, or null pointer dereferences.';
    }
    mistakes.unshift({
      line: parsedLine,
      title: input.verdict === 'Runtime Error' ? `Runtime Error${tcProgress ? ` (${tcProgress})` : ''}` : 'Compilation Error',
      detail: comp.split('\n').slice(0, 3).join(' ').slice(0, 260),
      fixHint,
    });
  } else if (input.verdict === 'Compile Error' || input.verdict === 'Runtime Error') {
    mistakes.unshift({
      title: `${input.verdict}${tcProgress ? ` (${tcProgress})` : ''}`,
      detail: `Your submitted code terminated with ${input.verdict}.`,
      fixHint:
        input.verdict === 'Compile Error'
          ? 'Review syntax, semicolons, variable declarations, and return types against the starter signature.'
          : 'Guard array bounds, empty containers, division by zero, and pointer dereferences.',
    });
  } else if (input.verdict === 'Time Limit Exceeded' || (maxLoopNesting >= 2 && targetComplexity.includes('O(N)'))) {
    mistakes.push({
      title: maxLoopNesting >= 2 ? 'Quadratic O(N^2) nested loops vs large constraint' : 'Time Limit Exceeded',
      detail: `Detected ${maxLoopNesting >= 2 ? `${maxLoopNesting}-level nested loops` : 'excessive runtime'}${tcProgress ? ` (${tcProgress})` : ''} while target is ${targetComplexity}.`,
      fixHint: `Replace nested scanning with ${hasUnorderedMap ? 'O(1) hash transitions' : 'an unordered_map/unordered_set, sorting + two pointers, or monotonic stack'}.`,
    });
  } else if (input.verdict === 'Memory Limit Exceeded' || input.verdict === 'Output Limit Exceeded') {
    mistakes.unshift({
      title: input.verdict,
      detail: `Execution exceeded sandbox ${input.verdict === 'Memory Limit Exceeded' ? 'memory' : 'stdout'} limits${tcProgress ? ` (${tcProgress})` : ''}.`,
      fixHint: 'Avoid huge DP tables or printing inside tight loops (`cout` debug statements).',
    });
  } else if (input.executionResult?.failedTestCase) {
    const tc = input.executionResult.failedTestCase;
    let hint = 'Trace your variables step-by-step on this exact failing input to find where state diverges from expected output.';
    if ((tc.actual === '[]' || tc.actual === '0' || tc.actual === '-1' || tc.actual === 'false') && tc.expected !== tc.actual) {
      hint = 'Your loop/base case exited early or missed a valid branch — check loop boundaries (< vs <=), initial conditions, and return values.';
    } else if (/^-?\d+$/.test(tc.actual.trim()) && /^-?\d+$/.test(tc.expected.trim())) {
      const diff = Math.abs(Number(tc.actual.trim()) - Number(tc.expected.trim()));
      if (diff === 1) {
        hint = 'Off-by-1 discrepancy! Check loop start/end bounds, initial counter (0 vs 1), or `<` vs `<=`.';
      } else if (Number(tc.actual.trim()) < 0 && Number(tc.expected.trim()) > 0) {
        hint = 'Negative actual vs positive expected strongly suggests integer overflow (`long long`) or reversed subtraction order.';
      }
    } else if (tc.expected.startsWith('[') && tc.actual.startsWith('[')) {
      const expItems = tc.expected.slice(1, -1).split(',').filter(Boolean).length;
      const actItems = tc.actual.slice(1, -1).split(',').filter(Boolean).length;
      if (expItems !== actItems) {
        hint = `Output length mismatch (got ${actItems} elements, expected ${expItems}). Check push_back conditions, loop termination, or duplicate filtering.`;
      }
    }
    mistakes.unshift({
      title: `Failed Test Case (${input.verdict || 'Wrong Answer'}${tcProgress ? ` • ${tcProgress}` : ''})`,
      detail: `Input: ${tc.input.slice(0, 120)} → Expected: ${tc.expected.slice(0, 100)}, Got: ${tc.actual.slice(0, 100)}`,
      fixHint: hint,
    });
  } else if (hasFailureVerdict) {
    mistakes.unshift({
      title: `Failed Submission (${input.verdict}${tcProgress ? ` • ${tcProgress}` : ''})`,
      detail: 'Your current implementation failed test validation.',
      fixHint: 'Inspect loop invariants, boundary conditions (empty/1-element/duplicates/negatives), and variable updates.',
    });
  }

  if (hasOrderedMap && !hasUnorderedMap && loopCount > 0) {
    mistakes.push({
      title: 'std::map used where unordered_map is faster',
      detail: 'std::map performs O(log N) tree operations per lookup vs O(1) average for unordered_map.',
      fixHint: 'Unless sorted key order is needed, switch to unordered_map for faster runtime.',
    });
  }

  // Approach classification & honest complexity estimate
  const methodTags: string[] = [];
  let estimatedComplexity = 'Incomplete / Unverified';

  const hasCompileOrSyntaxError = input.verdict === 'Compile Error' || Boolean(balanceErr);
  const effectiveLinearPasses = loopCount + (hasStlLinear && loopCount === 0 ? 1 : 0);

  if (hasCompileOrSyntaxError) {
    methodTags.push('Uncompilable / Syntax-Broken C++');
    estimatedComplexity = 'Invalid (Compile Error)';
  } else if (isTrivialLiteralReturn(code)) {
    methodTags.push('Hardcoded / Incomplete Stub');
    estimatedComplexity = 'Incomplete (Constant Stub)';
  } else if (isRecursive && !hasDpArray) {
    methodTags.push('Recursive Search (no visible memoization)');
    estimatedComplexity = 'O(branch^depth) or O(N) recursion stack';
  } else if (hasDpArray) {
    methodTags.push('Dynamic Programming');
    estimatedComplexity = maxLoopNesting >= 2 ? 'O(N * M) or O(N^2)' : 'O(N)';
  } else if (hasBinarySearch) {
    methodTags.push('Binary Search');
    estimatedComplexity = maxLoopNesting >= 2 ? 'O(N^2 log M)' : loopCount >= 1 && !hasStlLog ? 'O(log N)' : hasSort ? 'O(N log N)' : 'O(log N) / O(N log M)';
  } else if (hasSort && maxLoopNesting >= 2) {
    methodTags.push('Sorting + Nested Scan');
    estimatedComplexity = 'O(N^2)';
  } else if (hasSort) {
    methodTags.push('Sorting-Based Approach');
    estimatedComplexity = 'O(N log N)';
  } else if (hasUnorderedMap || hasSet) {
    methodTags.push('Hash Table Lookup');
    estimatedComplexity = maxLoopNesting >= 2 ? 'O(N^2)' : 'O(N) avg';
  } else if (hasStackOrQueue) {
    methodTags.push('Stack / Queue / Heap');
    estimatedComplexity = code.includes('priority_queue') ? 'O(N log K)' : 'O(N)';
  } else if (maxLoopNesting >= 3) {
    methodTags.push('Triple Nested Loops');
    estimatedComplexity = 'O(N^3)';
  } else if (maxLoopNesting === 2 || (loopCount >= 1 && hasStlLinear && /\.(find|count|accumulate|erase)\s*\(/.test(code))) {
    methodTags.push('Nested Loops / Quadratic Scan');
    estimatedComplexity = 'O(N^2)';
  } else if (effectiveLinearPasses >= 1) {
    methodTags.push(effectiveLinearPasses > 1 ? 'Multi-Pass Linear Iteration' : 'Single-Pass / Linear Iteration');
    estimatedComplexity = 'O(N)';
  } else {
    methodTags.push('Direct Expression (No Loops/Recursion Detected)');
    estimatedComplexity = isVerifiedAccepted
      ? 'O(1)'
      : 'O(1) structure (no loop/recursion — verify if logic is incomplete)';
  }

  const detectedMethod = methodTags.join(' + ');

  if (isVerifiedAccepted) {
    guidanceSteps.push('Your current code passed all tests! Check whether auxiliary maps/arrays can be reduced toward O(1) extra space or fewer passes.');
  } else if (hasFailureVerdict) {
    guidanceSteps.push(
      `Your code failed (${input.verdict}). Fix the flagged issues and trace failing inputs before trusting runtime or complexity.`
    );
  } else if (mistakes.length > 0) {
    guidanceSteps.push(`Address the ${mistakes.length} ${mistakes.length === 1 ? 'issue' : 'issues'} above before running tests.`);
  } else {
    guidanceSteps.push(`Your logic (${detectedMethod}) has not been verified against tests yet — run sample & full tests to validate edge cases.`);
  }

  if (input.pattern && !hasUnorderedMap && !hasBinarySearch && !hasDpArray && input.pattern.toLowerCase().includes('hash')) {
    guidanceSteps.push(`Tip for this problem (${input.pattern}): an unordered_map/unordered_set can remove inner scans for O(N) time.`);
  } else if (input.pattern) {
    guidanceSteps.push(`Target pattern focus: ${input.pattern} (${targetComplexity}).`);
  }

  if (input.userQuestion?.trim()) {
    guidanceSteps.unshift(`Regarding your question ("${input.userQuestion.trim()}"): Inspect ${detectedMethod} (${estimatedComplexity}) alongside loop bounds, initialization values, and failing edge inputs.`);
  }

  const summaryLines = [
    `Method Detected: ${detectedMethod} (Est: ${estimatedComplexity} | Target: ${targetComplexity})`,
    '',
    mistakes.length > 0
      ? `Mistakes / Failures Found (${mistakes.length}):\n${mistakes
          .map((m, idx) => `${idx + 1}. ${m.line ? `[Line ${m.line}] ` : ''}${m.title}: ${m.detail}\n   Fix: ${m.fixHint}`)
          .join('\n')}`
      : isVerifiedAccepted
        ? 'Verified Accepted — all test cases passed cleanly.'
        : 'No static syntax crash spotted, but logic correctness is NOT yet verified. Click Run / Submit or check edge cases carefully.',
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
  const isVerifiedAccepted = input.verdict === 'Accepted';
  const hasFailureVerdict = Boolean(input.verdict && input.verdict !== 'Accepted');

  if (!sql || /^(?:--[^\n]*\n?)+$/.test(sql)) {
    return {
      detectedMethod: 'Empty SQL Editor',
      estimatedComplexity: 'Incomplete (Empty Query)',
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
      summary: 'No SQL query written yet. Draft a SELECT query first, then click Run or Analyze My Query for detailed diagnostics.',
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

  // Common SQL & SQLite mistakes
  if (/=\s*NULL\b|!=\s*NULL\b|<>\s*NULL\b/.test(upper)) {
    mistakes.push({
      title: 'Invalid NULL comparison (= NULL)',
      detail: 'In SQL, = NULL or != NULL always evaluates to UNKNOWN/false.',
      fixHint: 'Use IS NULL or IS NOT NULL instead.',
    });
  }

  if (/\bSELECT\s+\*/.test(upper)) {
    mistakes.push({
      title: 'SELECT * projection mismatch risk',
      detail: 'Most SQL problems expect specific column names and order rather than all table columns.',
      fixHint: 'Explicitly select the required columns with matching aliases (`AS ...`).',
    });
  }

  if (/\bLEFT\s+(?:OUTER\s+)?JOIN\b/.test(upper) && /\bCOUNT\s*\(\s*\*\s*\)/.test(upper)) {
    mistakes.push({
      title: 'COUNT(*) with LEFT JOIN counts unmatched rows as 1',
      detail: 'When a right-table row is unmatched (NULL), COUNT(*) counts the row anyway instead of 0.',
      fixHint: 'Count a non-null column from the right table, e.g. `COUNT(r.id)` instead of `COUNT(*)`.',
    });
  }

  if (/\bLEFT\s+(?:OUTER\s+)?JOIN\b/.test(upper) && /\b(SUM|AVG)\s*\(/.test(upper) && !/\bCOALESCE\b|\bIFNULL\b/.test(upper)) {
    mistakes.push({
      title: 'SUM / AVG after LEFT JOIN may return NULL instead of 0',
      detail: 'Groups with only unmatched NULL rows evaluate `SUM(col)` to NULL.',
      fixHint: 'Wrap with `COALESCE(SUM(col), 0)` if zero is expected for empty groups.',
    });
  }

  if (/\b[a-zA-Z_][\w.]*\s*\/\s*[a-zA-Z_][\w.]*/.test(sql) && !/1\.0\s*\*|\*\s*1\.0|\bCAST\s*\([^)]+AS\s+(?:REAL|FLOAT)/i.test(sql)) {
    mistakes.push({
      title: 'SQLite integer division truncation (`a / b`)',
      detail: 'In SQLite, dividing two integers truncates decimals (e.g. `1 / 2 = 0`).',
      fixHint: 'Multiply by `1.0 * numerator / denominator` or use `CAST(... AS REAL)`.',
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
        columns?: string[];
        expectedColumns?: string[];
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
    const colMismatch =
      sqlExec?.expectedColumns &&
      sqlExec?.columns &&
      sqlExec.expectedColumns.join(',') !== sqlExec.columns.join(',');
    const actualSample =
      sqlExec?.failedTestCase?.actual?.slice(0, 140) ||
      (colMismatch
        ? `Column mismatch — got [${sqlExec!.columns!.join(', ')}], expected [${sqlExec!.expectedColumns!.join(', ')}]`
        : sqlExec?.rows
          ? `${sqlExec.rows.length} rows returned (expected ${sqlExec.expectedRows?.length ?? '?'})`
          : 'Output rows differed from expected result');
    mistakes.unshift({
      title: 'SQL Output Mismatch (Wrong Answer)',
      detail: actualSample,
      fixHint: colMismatch
        ? 'Rename your output columns with exact `AS column_name` aliases matching the expected headers.'
        : 'Check LEFT JOIN vs INNER JOIN for missing zero rows, WHERE vs ON filters (especially on NULL rows), duplicate rows (DISTINCT), and ORDER BY.',
    });
  } else if (hasFailureVerdict) {
    mistakes.unshift({
      title: `SQL Check Failed (${input.verdict})`,
      detail: 'The submitted query failed validation against expected output.',
      fixHint: 'Verify schema column aliases, join types, NULL handling, and ordering.',
    });
  }

  if (isVerifiedAccepted) {
    guidanceSteps.push('Query passed all assertions! Check whether a single LEFT JOIN + GROUP BY or window function simplifies any subqueries.');
  } else if (hasFailureVerdict) {
    guidanceSteps.push(`Your query failed (${input.verdict}). Address the flagged issues and compare your output columns & rows against Expected Output.`);
  } else {
    guidanceSteps.push('Verify your output column names (`AS ...`) match the example headers exactly.');
    guidanceSteps.push('Click Run Query / Submit to verify rows, NULL handling, and ordering against expected output.');
  }

  const summary = [
    `SQL Method Detected: ${detectedMethod}`,
    '',
    mistakes.length > 0
      ? `SQL Mistakes / Risks (${mistakes.length}):\n${mistakes
          .map((m, idx) => `${idx + 1}. ${m.title}: ${m.detail}\n   Fix: ${m.fixHint}`)
          .join('\n')}`
      : isVerifiedAccepted
        ? 'Verified Accepted — your query returned the exact expected columns and rows.'
        : 'No static SQL anti-patterns caught, but relational correctness is NOT verified until you Run/Submit.',
    '',
    `Guidance:\n${guidanceSteps.map((s) => `• ${s}`).join('\n')}`,
  ].join('\n');

  return {
    detectedMethod,
    estimatedComplexity: input.verdict === 'Query Error' ? 'Invalid (SQL Error)' : 'Relational Query Plan',
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

