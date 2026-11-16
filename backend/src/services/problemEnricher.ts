import { InputParser } from '../judge/inputParser';
import { findCuratedSolution } from '../data/curatedSolutions';

export interface EnrichedProblemDetails {
  parameters: Array<{ name: string; type: string }>;
  returnType: string;
  expectedComplexity: { time: string; space: string };
  hints: string[];
  followUp: string;
  inputFormatNote: string;
  tags: string[];
}

const SPECIFIC_PROBLEM_HINTS: Record<number, { hints: string[]; followUp: string }> = {
  1: {
    hints: [
      'A brute-force nested loop checks every pair `(i, j)` in O(N^2). To optimize, think about what value you need for each `nums[i]`.',
      'For the current element `x = nums[i]`, you only need to know whether `complement = target - x` was already seen at an earlier index.',
      'Store `{value -> index}` in an `unordered_map<int, int>` as you scan once from left to right. Check `seen.find(target - x)` before inserting `nums[i]` so the same index is never reused.',
    ],
    followUp: 'Can you come up with an algorithm that is less than O(N^2) time complexity? What changes if `nums` were already sorted (see #6 Two Sum II)?',
  },
  2: {
    hints: [
      'Profit requires buying BEFORE selling (`buyDay < sellDay`). Tracking every future maximum takes O(N^2) naively.',
      'As you scan left-to-right on day `i`, the maximum profit from selling today only depends on the minimum price seen strictly before today.',
      'Maintain running `minPrice = min(minPrice, prices[i])` and `bestProfit = max(bestProfit, prices[i] - minPrice)` in O(1) extra space.',
    ],
    followUp: 'How would your state change if you were allowed unlimited transactions, at most 2 transactions, or a 1-day cooldown after selling?',
  },
  6: {
    hints: [
      'The array `numbers` is already sorted in non-decreasing order and asks for O(1) extra space (no hash map).',
      'Place `left = 0` at the smallest value and `right = n - 1` at the largest. Compare `numbers[left] + numbers[right]` against `target`.',
      'If the sum is too small, increment `left`; if too large, decrement `right`. Remember the output expects 1-indexed `[left + 1, right + 1]`.',
    ],
    followUp: 'What if the array could contain huge values summing past 32-bit int limits? Using `long long` for the sum avoids overflow safely.',
  },
  8: {
    hints: [
      'Water area between lines `l` and `r` is `(r - l) * min(height[l], height[r])`.',
      'Starting with maximum width (`l = 0, r = n - 1`), any inward move decreases width `(r - l)`. To possibly find a larger area, the limiting shorter height must improve.',
      'Always advance the pointer pointing to the shorter vertical bar (`if (height[l] < height[r]) l++; else r--;`).',
    ],
    followUp: 'Prove why discarding the shorter boundary never skips the global optimum.',
  },
  10: {
    hints: [
      'The most recently opened unclosed bracket must always be closed first (LIFO order).',
      'Push expected closing brackets or opening brackets onto a stack/vector as you scan `s`.',
      'Whenever you hit a closing bracket, check `!st.empty()` first and verify the top matches; at the end, ensure `st.empty()`.',
    ],
    followUp: 'If the string only consisted of `(` and `)`, could you solve validation in O(1) extra space without a stack?',
  },
  15: {
    hints: [
      'A subarray ending at index `i` either extends the best subarray ending at `i - 1`, or starts fresh at `nums[i]`.',
      'Kadane recurrence: `curr = max(nums[i], curr + nums[i])` and `best = max(best, curr)`.',
      'Initialize both `curr` and `best` to `nums[0]` (not `0`) so all-negative arrays like `[-3, -1, -5]` return `-1` cleanly.',
    ],
    followUp: 'If you have figured out the O(N) Kadane solution, try solving it using the divide-and-conquer approach (returning prefix/suffix/total/best segment sums).',
  },
  17: {
    hints: [
      'Greedy (picking the largest coin first) fails on inputs like coins `[1, 3, 4]`, amount `6` (`4+1+1 = 3` coins vs `3+3 = 2` coins).',
      'Define `dp[a]` = minimum number of coins needed to form exact amount `a`, initialized to `amount + 1` (infinity) with `dp[0] = 0`.',
      'For every `a` from `1..amount`, try `dp[a] = min(dp[a], dp[a - coin] + 1)` for each `coin <= a`. Return `-1` if `dp[amount] > amount`.',
    ],
    followUp: 'Can you solve the counting variant where you return the number of combinations that make up `amount` (Coin Change II) without double-counting permutations?',
  },
  20: {
    hints: [
      'O(1) `get` requires a hash map (`unordered_map`), while O(1) eviction of the least-recently-used key requires O(1) move-to-front ordering.',
      'Combine `std::list<pair<int, int>>` (doubly-linked list holding recency order) with `unordered_map<int, list<pair<int, int>>::iterator>`.',
      'Use `order.splice(order.begin(), order, it->second)` to promote an accessed node to the MRU front in strict O(1) without invalidating iterators.',
    ],
    followUp: 'How would you upgrade this design to an LFU (Least Frequently Used) Cache still running in O(1) average time per operation?',
  },
  59: {
    hints: [
      'A 90-degree clockwise rotation maps `(r, c) -> (c, n - 1 - r)`.',
      'Notice that matrix transpose swaps `(r, c) <-> (c, r)`. Reversing each row afterwards maps `(c, r) -> (c, n - 1 - r)`.',
      'Loop `i` from `0..n-1` and `j` from `i + 1..n-1` to transpose in-place, then `reverse(matrix[i].begin(), matrix[i].end())`.',
    ],
    followUp: 'How would you rotate the matrix 90 degrees counter-clockwise or 180 degrees using only transpose/row-reverse primitives?',
  },
  110: {
    hints: [
      'Each item `i` has binary choice: skip it or include it (if `wt[i] <= w`). Notice `knapSack` takes `(W, wt, val, n)`.',
      'Naive 2D DP `dp[i][w]` uses O(N * W) space. Since row `i` only depends on row `i - 1` at smaller weights, you can compress to 1D.',
      'In the 1D `vector<int> dp(W + 1, 0)` array, iterate `w` **downward** from `W` down to `wt[i]` so each item is counted at most once.',
    ],
    followUp: 'What changes if each item could be picked an unlimited number of times (Unbounded Knapsack)? (Iterate `w` forward instead of backward!)',
  },
};

function parseComplexity(raw?: string): { time: string; space: string } | null {
  if (!raw) return null;
  const parts = raw.split('|').map((s) => s.trim());
  const timePart = parts.find((p) => /^Time:/i.test(p))?.replace(/^Time:\s*/i, '').trim();
  const spacePart = parts.find((p) => /^Space:/i.test(p))?.replace(/^Space:\s*/i, '').trim();
  if (!timePart && !spacePart) return null;
  return {
    time: timePart || 'O(N)',
    space: spacePart || 'O(N)',
  };
}

function deriveComplexityByTopic(
  category: string,
  topic: string,
  constraints: string
): { time: string; space: string } {
  if (category.toUpperCase() === 'SQL') {
    return {
      time: topic.includes('Window') || topic.includes('CTE') ? 'O(N log N) sort/partition scan' : 'O(N) index / hash join',
      space: 'O(N) working set / CTE materialization',
    };
  }
  const t = topic.toLowerCase();
  if (t.includes('binary search')) return { time: 'O(log N)', space: 'O(1)' };
  if (t.includes('two pointers') || t.includes('sliding window')) return { time: 'O(N)', space: 'O(1)' };
  if (t.includes('linked list')) return { time: 'O(N)', space: 'O(1)' };
  if (t.includes('tree')) return { time: 'O(N)', space: 'O(H) recursion depth' };
  if (t.includes('backtracking')) return { time: 'O(branch^N)', space: 'O(N) recursion path' };
  if (t.includes('graph')) return { time: 'O(V + E)', space: 'O(V + E)' };
  if (t.includes('heap')) return { time: 'O(N log K)', space: 'O(K)' };
  if (t.includes('oop') || t.includes('encapsulation') || t.includes('polymorphism') || t.includes('raii') || t.includes('design')) {
    return { time: 'O(1) – O(N) per operation', space: 'O(N) object state' };
  }
  if (constraints.includes('10^5')) return { time: 'O(N) or O(N log N)', space: 'O(N)' };
  return { time: 'O(N)', space: 'O(N)' };
}

function buildGenericHints(params: {
  id: number;
  title: string;
  category: string;
  topic: string;
  pattern: string;
  constraints: string;
  functionSignature: string;
}): string[] {
  const { id, title, category, topic, pattern, functionSignature } = params;
  if (category.toUpperCase() === 'SQL') {
    const isWindow = /window|rank|row_number|running|lag|lead/i.test(topic + pattern);
    const isCte = /cte|recursive|gap|island|retention/i.test(topic + pattern);
    return [
      `Start by identifying the base grain of **#${id} ${title}**: list every table in the schema, verify join keys, and check whether unmatched rows require \`LEFT JOIN\` instead of \`INNER JOIN\`.`,
      isWindow
        ? `Use window functions (\`ROW_NUMBER()\`, \`RANK()\`, or \`SUM() OVER (PARTITION BY ... ORDER BY ...)\`) inside a \`WITH\` CTE rather than collapsing rows prematurely with \`GROUP BY\`.`
        : isCte
        ? `Break multi-step filtering into readable \`WITH\` CTE stages (or \`WITH RECURSIVE\` for missing sequences) before computing final ratios or filters.`
        : `Apply row-level filters in \`WHERE\` before grouping with \`GROUP BY\`, then filter aggregated metrics cleanly inside \`HAVING\`.`,
      `Double-check exact column aliases (e.g. \`AS ...\`), \`NULL\` edge cases (\`COALESCE(..., 0)\` / integer-vs-float \`* 1.0\` division), and tie-breakers in the final \`ORDER BY\` clause.`,
    ];
  }

  if (category.toUpperCase() === 'OOP' || id >= 631 && id <= 730) {
    return [
      `Model **${title}** with clean separation between private state invariants and public member methods (${pattern || topic}).`,
      `Validate every mutator precondition BEFORE mutating internal fields (atomic updates so invalid operations never leave partial state), and mark read-only getters \`const\`.`,
      `Inside \`${functionSignature || 'simulate(...)'}\`, process commands sequentially, verify boundary caps / empty collections, and ensure clean memory lifecycle with RAII / STL containers.`,
    ];
  }

  return [
    `Identify the bottleneck in a brute-force approach for **#${id} ${title}**. Focus on the core invariant described by **${pattern || topic}**.`,
    `Structure your single pass or traversal around \`${functionSignature || 'Solution'}\`: avoid nested rescans by maintaining incremental state (prefix accumulators, pointers, stack, or visited markers).`,
    `Verify edge cases before submitting: empty input (\`[]\`, \`""\`, or \`nullptr\`), single element, duplicate values, negative numbers, and 32-bit signed integer overflow (\`long long\`).`,
  ];
}

function buildFollowUp(params: {
  id: number;
  category: string;
  topic: string;
  pattern: string;
  returnType: string;
}): string {
  const { category, topic, returnType } = params;
  if (category.toUpperCase() === 'SQL') {
    return 'Database Scaling Follow-up: Which composite index (e.g. `(foreign_key, created_at DESC)`) would convert this query from a full table scan (`SCAN`) into an index seek (`SEARCH`) on 10M+ rows? Check using the EXPLAIN button!';
  }
  const t = topic.toLowerCase();
  if (t.includes('dynamic programming')) {
    return 'Space Optimization Follow-up: Can you compress the DP state dimension to O(1) or 1D rolling arrays while preserving exact recurrence dependencies?';
  }
  if (t.includes('linked list')) {
    return 'In-Place Follow-up: Could you solve this in a single pass with O(1) extra pointer memory without copying values into an external vector?';
  }
  if (t.includes('graph') || t.includes('tree')) {
    return 'Scale & Iterative Follow-up: How would your recursive DFS behave on a skewed 10^5-node chain (stack overflow risk), and how would you rewrite it iteratively?';
  }
  if (returnType === 'void') {
    return 'In-Place Guarantee: Verify your solution modifies the container strictly in-place in O(1) extra memory without allocating a full clone.';
  }
  return 'Complexity Follow-up: Can your solution handle streaming or N = 10^5 inputs within strict O(N) / O(N log N) time without quadratic bottlenecks or signed overflow?';
}

export function enrichProblemDetails(params: {
  id: number;
  slug: string;
  title: string;
  category: string;
  topic: string;
  pattern: string;
  constraints: string;
  functionSignature: string;
}): EnrichedProblemDetails {
  const isSql = params.category.toUpperCase() === 'SQL';
  const parsedSig = !isSql ? InputParser.parseSignature(params.functionSignature) : null;
  const parameters = parsedSig
    ? parsedSig.params.map((p) => ({ name: p.name, type: p.rawType }))
    : [];
  const returnType = isSql
    ? 'SQL Result Table (SELECT)'
    : parsedSig?.returnType || 'auto';

  const curated = !isSql
    ? findCuratedSolution(params.id, params.slug, params.functionSignature)
    : null;
  const expectedComplexity =
    parseComplexity(curated?.complexity) ||
    deriveComplexityByTopic(params.category, params.topic, params.constraints);

  const specific = SPECIFIC_PROBLEM_HINTS[params.id];
  const hints = specific ? specific.hints : buildGenericHints(params);
  const followUp = specific ? specific.followUp : buildFollowUp({ ...params, returnType });

  const inputFormatNote = isSql
    ? 'Write a single read-only SQLite SELECT or WITH query against the seeded schema tables shown below.'
    : parameters.length > 1
    ? `Custom testcases accept ${parameters.length} arguments separated by \`|\` on one line or across ${parameters.length} lines (e.g. \`arg1 | arg2\`).`
    : parameters.length === 1
    ? `Pass ${parameters[0].type} directly as a single testcase literal (e.g. JSON array, quoted string, or number).`
    : 'Implement your solution directly inside `class Solution`.';

  const rawTags = [
    params.category.toUpperCase(),
    params.topic,
    ...(params.pattern ? params.pattern.split('/').map((s) => s.trim()) : []),
  ].filter(Boolean);
  const tags = Array.from(new Set(rawTags)).slice(0, 5);

  return {
    parameters,
    returnType,
    expectedComplexity,
    hints,
    followUp,
    inputFormatNote,
    tags,
  };
}
