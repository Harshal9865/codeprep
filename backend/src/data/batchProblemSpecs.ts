import { ProblemExample, TestCase } from '../judge/types';

export interface BatchSpecResult {
  statement: string;
  constraints: string;
  examples: ProblemExample[];
  sampleTestCases: TestCase[];
  hiddenTestCases: TestCase[];
}

export function buildBatch1ProblemSpec(title: string): BatchSpecResult {
  const statement = `**${title}** — *Contiguous Subarray Target Sum (Prefix Sum Challenge)*

Given an integer array \`nums\` and an integer target \`k\`, return the **total number of non-empty contiguous subarrays** in \`nums\` whose element sum equals \`k\`.

A **subarray** is a contiguous non-empty sequence of elements within the array: \`nums[l..r]\` for \`0 <= l <= r < nums.length\`.

**Rules & Edge Cases:**
- Elements in \`nums\` may be **positive, zero, or negative**, so expanding a subarray does not guarantee its sum increases monotonically.
- Two subarrays with different index ranges \`(l1, r1) != (l2, r2)\` are counted separately even if they have identical values.
- If \`nums\` is empty, return \`0\`.`;

  const constraints = `0 <= nums.length <= 10^5
-10^4 <= nums[i] <= 10^4
-10^9 <= k <= 10^9
Target Complexity: O(N) time and O(N) auxiliary space using a prefix-sum frequency hash map.`;

  const examples: ProblemExample[] = [
    {
      input: '[1,1,1] | 2',
      output: '2',
      explanation:
        'There are 2 contiguous subarrays summing to 2: `nums[0..1] = [1, 1]` (sum = 2) and `nums[1..2] = [1, 1]` (sum = 2).',
    },
    {
      input: '[1,2,3] | 3',
      output: '2',
      explanation:
        'Subarray `[1, 2]` (indices 0..1) sums to 3, and single-element subarray `[3]` (index 2..2) sums to 3.',
    },
    {
      input: '[1,-1,0] | 0',
      output: '3',
      explanation:
        'Negative numbers and zeros create overlapping ranges summing to 0: `[1, -1]`, `[0]`, and `[1, -1, 0]`.',
    },
  ];

  return {
    statement,
    constraints,
    examples,
    sampleTestCases: [
      { input: '[1,1,1] | 2', expectedOutput: '2' },
      { input: '[1,2,3] | 3', expectedOutput: '2' },
      { input: '[1,-1,0] | 0', expectedOutput: '3' },
    ],
    hiddenTestCases: [
      { input: '[10,2,-2,-20,10] | -10', expectedOutput: '3', isHidden: true },
      { input: '[] | 0', expectedOutput: '0', isHidden: true },
      { input: '[5] | 5', expectedOutput: '1', isHidden: true },
      { input: '[5] | 0', expectedOutput: '0', isHidden: true },
      { input: '[0,0,0,0] | 0', expectedOutput: '10', isHidden: true },
      { input: '[-1,-1,1] | 0', expectedOutput: '1', isHidden: true },
      { input: '[3,4,7,2,-3,1,4,2] | 7', expectedOutput: '4', isHidden: true },
      { input: '[-2,-1,-3] | -3', expectedOutput: '2', isHidden: true },
      { input: '[1,2,3,4,5] | 15', expectedOutput: '1', isHidden: true },
    ],
  };
}

export function buildBatch2ProblemSpec(title: string): BatchSpecResult {
  const statement = `**${title}** — *Elevation Capacity & Two-Pointer Boundary Analysis*

Given \`n\` non-negative integers represented by \`nums\`, where \`nums[i]\` denotes the height of a vertical bar of width \`1\` at index \`i\`, compute how much **total unit capacity** can be trapped between taller enclosing bars after rainfall.

Water or capacity retained directly above bar \`i\` equals \`max(0, min(maxLeft[i], maxRight[i]) - nums[i])\`, where \`maxLeft[i]\` is the highest bar at or to the left of \`i\`, and \`maxRight[i]\` is the highest bar at or to the right of \`i\`.

**Rules & Edge Cases:**
- Arrays with fewer than 3 bars (\`nums.length < 3\`) cannot form an enclosed basin, so return \`0\`.
- Strictly increasing or strictly decreasing sequences trap \`0\` units.`;

  const constraints = `0 <= nums.length <= 10^5
0 <= nums[i] <= 10^4
Target Complexity: O(N) time and O(1) extra space using converging left/right pointers.`;

  const examples: ProblemExample[] = [
    {
      input: '[0,1,0,2,1,0,1,3,2,1,2,1]',
      output: '6',
      explanation:
        'Valleys form at indices 2 (+1), 4 (+1), 5 (+2), 6 (+1), and 9 (+1), summing to `1 + 1 + 2 + 1 + 1 = 6` total units.',
    },
    {
      input: '[4,2,0,3,2,5]',
      output: '9',
      explanation:
        'Between walls of height 4 (index 0) and 5 (index 5), the bounding water level is 4, trapping `(4-2) + (4-0) + (4-3) + (4-2) = 2 + 4 + 1 + 2 = 9`.',
    },
    {
      input: '[2,0,2]',
      output: '2',
      explanation: 'Index 1 has height 0 enclosed by height-2 bars on both sides, trapping 2 units.',
    },
  ];

  return {
    statement,
    constraints,
    examples,
    sampleTestCases: [
      { input: '[0,1,0,2,1,0,1,3,2,1,2,1]', expectedOutput: '6' },
      { input: '[4,2,0,3,2,5]', expectedOutput: '9' },
      { input: '[2,0,2]', expectedOutput: '2' },
    ],
    hiddenTestCases: [
      { input: '[3,0,0,2,0,4]', expectedOutput: '10', isHidden: true },
      { input: '[]', expectedOutput: '0', isHidden: true },
      { input: '[5]', expectedOutput: '0', isHidden: true },
      { input: '[1,5]', expectedOutput: '0', isHidden: true },
      { input: '[1,2,3,4,5]', expectedOutput: '0', isHidden: true },
      { input: '[5,4,3,2,1]', expectedOutput: '0', isHidden: true },
      { input: '[3,3,3,3]', expectedOutput: '0', isHidden: true },
      { input: '[0,0,0,0]', expectedOutput: '0', isHidden: true },
      { input: '[5,0,3,0,4,0,2]', expectedOutput: '11', isHidden: true },
    ],
  };
}

export function buildBatch3ProblemSpec(title: string, isString: boolean): BatchSpecResult {
  if (isString) {
    const statement = `**${title}** — *Symmetric Substring & Palindrome Structure*

Given a string \`s\`, return the **longest contiguous palindromic substring** inside \`s\`.

A string is a **palindrome** if it reads identically forward and backward (\`s[l] == s[r]\` for every mirrored pair). A **substring** must consist of contiguous characters from \`s\`.

**Rules & Tie-Breaking:**
- Characters are compared **case-sensitively** over printable ASCII.
- If multiple palindromic substrings share the exact same maximum length, return the **earliest occurring** substring (smallest starting index).
- If \`s\` is empty (\`""\`), return \`""\`. If all characters are distinct, the first character \`s.substr(0, 1)\` is returned.`;

    const constraints = `0 <= s.length <= 10^4
s consists of printable ASCII characters (letters, digits, punctuation).
Target Complexity: O(N^2) time and O(1) extra space via expand-around-center.`;

    const examples: ProblemExample[] = [
      {
        input: '"babad"',
        output: '"bab"',
        explanation:
          'Both `"bab"` (indices 0..2) and `"aba"` (indices 1..3) have maximum length 3; `"bab"` starts earlier at index 0.',
      },
      {
        input: '"cbbd"',
        output: '"bb"',
        explanation: 'Expanding around the even center between indices 1 and 2 gives palindrome `"bb"` of length 2.',
      },
      {
        input: '"racecar"',
        output: '"racecar"',
        explanation: 'The entire string `"racecar"` is symmetric of length 7.',
      },
    ];

    return {
      statement,
      constraints,
      examples,
      sampleTestCases: [
        { input: '"babad"', expectedOutput: '"bab"' },
        { input: '"cbbd"', expectedOutput: '"bb"' },
        { input: '"racecar"', expectedOutput: '"racecar"' },
      ],
      hiddenTestCases: [
        { input: '"a"', expectedOutput: '"a"', isHidden: true },
        { input: '""', expectedOutput: '""', isHidden: true },
        { input: '"aa"', expectedOutput: '"aa"', isHidden: true },
        { input: '"ab"', expectedOutput: '"a"', isHidden: true },
        { input: '"abcde"', expectedOutput: '"a"', isHidden: true },
        { input: '"aaaa"', expectedOutput: '"aaaa"', isHidden: true },
        { input: '"bananas"', expectedOutput: '"anana"', isHidden: true },
        { input: '"forgeeksskeegfor"', expectedOutput: '"geeksskeeg"', isHidden: true },
        { input: '"abacdfgdcaba"', expectedOutput: '"aba"', isHidden: true },
      ],
    };
  }

  const statement = `**${title}** — *Linked List Structural Pointer Rewiring*

Given the \`head\` of a singly linked list, **remove the 2nd node from the end** of the list in-place (fixing \`next\` pointers cleanly) and return the modified \`head\`.

Each node follows the standard definition: \`ListNode { int val; ListNode *next; }\`.

**Rules & Edge Cases:**
- If the list is empty (\`nullptr\`) or contains only \`1\` node, return \`nullptr\` (since deleting the 2nd-from-end position clears a single-node list in this specification).
- If the list has exact length \`2\`, removing the 2nd node from the end removes the original \`head\`, so return \`head->next\`.
- Always use a sentinel dummy node before \`head\` to handle head deletion uniformly.`;

  const constraints = `0 <= number of nodes <= 5000
-5000 <= Node.val <= 5000
Target Complexity: O(N) time and O(1) extra pointer space.`;

  const examples: ProblemExample[] = [
    {
      input: '[1,2,3,4,5]',
      output: '[1,2,3,5]',
      explanation:
        'The list has 5 nodes. Counting from the tail (5 is 1st, 4 is 2nd), node `4` is unlinked so `3->next` points directly to `5`.',
    },
    {
      input: '[1]',
      output: '[]',
      explanation: 'A single-node list reduces to an empty list `[]` (`nullptr`).',
    },
    {
      input: '[1,2]',
      output: '[2]',
      explanation: 'The 2nd node from the end is the head node `1`, leaving `[2]`.',
    },
  ];

  return {
    statement,
    constraints,
    examples,
    sampleTestCases: [
      { input: '[1,2,3,4,5]', expectedOutput: '[1,2,3,5]' },
      { input: '[1]', expectedOutput: '[]' },
      { input: '[1,2]', expectedOutput: '[2]' },
    ],
    hiddenTestCases: [
      { input: '[]', expectedOutput: '[]', isHidden: true },
      { input: '[1,2,3]', expectedOutput: '[1,3]', isHidden: true },
      { input: '[10,20,30,40]', expectedOutput: '[10,20,40]', isHidden: true },
      { input: '[5,5,5,5]', expectedOutput: '[5,5,5]', isHidden: true },
      { input: '[-1,-2,-3]', expectedOutput: '[-1,-3]', isHidden: true },
      { input: '[1,2,3,4,5,6]', expectedOutput: '[1,2,3,4,6]', isHidden: true },
      { input: '[9,8]', expectedOutput: '[8]', isHidden: true },
      { input: '[0,0,1]', expectedOutput: '[0,1]', isHidden: true },
      { input: '[100,200,300,400,500,600,700]', expectedOutput: '[100,200,300,400,500,700]', isHidden: true },
    ],
  };
}

export function buildBatch4ProblemSpec(title: string): BatchSpecResult {
  const statement = `**${title}** — *Cycle Detection / Repeated State Invariant*

Given an array \`nums\` containing \`n + 1\` integers where each integer lies in the range \`[1, n]\` inclusive (except the empty edge case), there is **at least one duplicate number** in \`nums\`. Assume there is **only one repeated value**, though it may appear **two or more times**.

Return this **duplicate integer** without modifying the input array \`nums\` and using only **O(1) constant extra space**.

**Rules & Edge Cases:**
- Treat \`i -> nums[i]\` as a functional directed graph; by the Pigeonhole Principle a cycle exists, and the duplicate value is the **cycle entry point** found via Floyd's Tortoise & Hare algorithm.
- If \`nums\` is empty (\`[]\`) or has size \`<= 1\`, return \`0\`.`;

  const constraints = `0 <= nums.length <= 10^5
1 <= nums[i] < nums.length (for non-empty valid inputs)
All integers appear once except a single duplicated value occurring >= 2 times.
Target Complexity: O(N) time and O(1) extra space.`;

  const examples: ProblemExample[] = [
    {
      input: '[1,3,4,2,2]',
      output: '2',
      explanation:
        'Following index pointers `0 -> 1 -> 3 -> 2 -> 4 -> 2 -> ...` reveals cycle entry at node `2`, which is the duplicated value.',
    },
    {
      input: '[3,1,3,4,2]',
      output: '3',
      explanation: '`3` appears at indices 0 and 2; cycle detection converges on `3`.',
    },
    {
      input: '[1,1]',
      output: '1',
      explanation: 'Both elements equal `1`.',
    },
  ];

  return {
    statement,
    constraints,
    examples,
    sampleTestCases: [
      { input: '[1,3,4,2,2]', expectedOutput: '2' },
      { input: '[3,1,3,4,2]', expectedOutput: '3' },
      { input: '[1,1]', expectedOutput: '1' },
    ],
    hiddenTestCases: [
      { input: '[2,2,2,2,2]', expectedOutput: '2', isHidden: true },
      { input: '[]', expectedOutput: '0', isHidden: true },
      { input: '[1,2,2]', expectedOutput: '2', isHidden: true },
      { input: '[1,2,1]', expectedOutput: '1', isHidden: true },
      { input: '[5,4,3,2,1,5]', expectedOutput: '5', isHidden: true },
      { input: '[1,3,4,2,1]', expectedOutput: '1', isHidden: true },
      { input: '[4,3,1,4,2]', expectedOutput: '4', isHidden: true },
      { input: '[2,5,9,6,9,3,8,9,7,1]', expectedOutput: '9', isHidden: true },
      { input: '[6,1,2,3,4,5,6]', expectedOutput: '6', isHidden: true },
    ],
  };
}

export function buildBatch5ProblemSpec(title: string, isBinarySearch: boolean): BatchSpecResult {
  if (isBinarySearch) {
    const statement = `**${title}** — *Monotonic Lower-Bound Binary Search*

Given a sorted array of distinct integers \`nums\` in **strictly ascending order** and a target integer \`target\`, return the **0-based index** of \`target\` if it exists in \`nums\`.

If \`target\` is not present in \`nums\`, return the **0-based index** where \`target\` would be inserted so that \`nums\` remains sorted in ascending order.

**Rules & Edge Cases:**
- Your algorithm **must** run in **O(log N)** runtime complexity.
- If \`nums\` is empty, return \`0\` (insert at front).
- If \`target\` is larger than all elements, return \`nums.length\`.`;

    const constraints = `0 <= nums.length <= 10^5
-10^4 <= nums[i], target <= 10^4
nums contains distinct values sorted in ascending order.
Target Complexity: O(log N) time and O(1) space.`;

    const examples: ProblemExample[] = [
      {
        input: '[1,3,5,6] | 5',
        output: '2',
        explanation: '`5` exists at index `2` (`nums[2] == 5`).',
      },
      {
        input: '[1,3,5,6] | 2',
        output: '1',
        explanation: '`2` is missing; placing it between `1` (idx 0) and `3` (idx 1) puts it at index `1`.',
      },
      {
        input: '[1,3,5,6] | 7',
        output: '4',
        explanation: '`7` exceeds every element, so its sorted insertion position is `nums.length = 4`.',
      },
    ];

    return {
      statement,
      constraints,
      examples,
      sampleTestCases: [
        { input: '[1,3,5,6] | 5', expectedOutput: '2' },
        { input: '[1,3,5,6] | 2', expectedOutput: '1' },
        { input: '[1,3,5,6] | 7', expectedOutput: '4' },
      ],
      hiddenTestCases: [
        { input: '[1] | 0', expectedOutput: '0', isHidden: true },
        { input: '[1,3] | 2', expectedOutput: '1', isHidden: true },
        { input: '[] | 5', expectedOutput: '0', isHidden: true },
        { input: '[1] | 1', expectedOutput: '0', isHidden: true },
        { input: '[1] | 2', expectedOutput: '1', isHidden: true },
        { input: '[1,3,5,6] | 0', expectedOutput: '0', isHidden: true },
        { input: '[-10,-3,0,5,9] | -5', expectedOutput: '1', isHidden: true },
        { input: '[-10,-3,0,5,9] | 9', expectedOutput: '4', isHidden: true },
        { input: '[2,4,6,8,10,12] | 11', expectedOutput: '5', isHidden: true },
      ],
    };
  }

  const statement = `**${title}** — *Binary Tree Height / Root-to-Leaf Depth Analysis*

Given the \`root\` of a binary tree (\`TreeNode*\`), compute and return the **maximum depth** (longest root-to-leaf node count) of the tree.

The **maximum depth** is defined as the total number of nodes along the longest downward path from \`root\` to the farthest leaf node (a node with no left or right children).

**Rules & Edge Cases:**
- An empty tree (\`root == nullptr\`) has depth \`0\`.
- A single root node with no children has depth \`1\`.
- Guard against null child pointers before recursing into \`root->left\` and \`root->right\`.`;

  const constraints = `0 <= number of nodes <= 10^4
-10^4 <= Node.val <= 10^4
Tree inputs are serialized in LeetCode level-order format (e.g. [3,9,20,null,null,15,7]).
Target Complexity: O(N) time and O(H) recursion/queue space (H = tree height).`;

  const examples: ProblemExample[] = [
    {
      input: '[3,9,20,null,null,15,7]',
      output: '3',
      explanation: 'Root `3` has left leaf `9` (depth 2) and right subtree `20 -> 15 / 7` reaching depth `3`.',
    },
    {
      input: '[1,null,2]',
      output: '2',
      explanation: 'Right-skewed path `1 -> 2` contains 2 nodes.',
    },
    {
      input: '[1,2,3,4,5,6,7]',
      output: '3',
      explanation: 'A complete 7-node binary tree has 3 levels: root (1), middle (2,3), leaves (4,5,6,7).',
    },
  ];

  return {
    statement,
    constraints,
    examples,
    sampleTestCases: [
      { input: '[3,9,20,null,null,15,7]', expectedOutput: '3' },
      { input: '[1,null,2]', expectedOutput: '2' },
      { input: '[1,2,3,4,5,6,7]', expectedOutput: '3' },
    ],
    hiddenTestCases: [
      { input: '[]', expectedOutput: '0', isHidden: true },
      { input: '[1]', expectedOutput: '1', isHidden: true },
      { input: '[1,2]', expectedOutput: '2', isHidden: true },
      { input: '[1,2,null,3]', expectedOutput: '3', isHidden: true },
      { input: '[1,null,2,null,3]', expectedOutput: '3', isHidden: true },
      { input: '[1,2,3,4,null,null,5]', expectedOutput: '3', isHidden: true },
      { input: '[1,2,null,3,null,4]', expectedOutput: '4', isHidden: true },
      { input: '[1,2,3,4,5,6,7,8]', expectedOutput: '4', isHidden: true },
      { input: '[1,null,2,null,3,null,4,null,5]', expectedOutput: '5', isHidden: true },
    ],
  };
}

export function buildBatch6ProblemSpec(title: string, topic: string): BatchSpecResult {
  const statement = `**${title}** — *Balanced Pivot & Integer Mean Aggregation (${topic})*

Given an integer array \`nums\`, compute the **integer-truncated arithmetic mean** of all elements in \`nums\` (total sum divided by element count, truncated toward zero).

**Rules & Overflow Safety:**
- If \`nums\` is empty (\`nums.empty()\`), return \`0\`.
- Elements may be negative, zero, or as large as \`10^9\`; **accumulate using a 64-bit integer** (\`long long\`) before dividing by \`nums.size()\` to avoid signed 32-bit overflow.
- Standard C++ signed integer division (\`total / static_cast<long long>(nums.size())\`) truncates toward zero (e.g. \`3 / 2 = 1\`, \`-3 / 2 = -1\`).`;

  const constraints = `0 <= nums.length <= 10^5
-10^9 <= nums[i] <= 10^9
Sum may exceed 32-bit int range; use 64-bit accumulator.
Target Complexity: O(N) time and O(1) space.`;

  const examples: ProblemExample[] = [
    {
      input: '[1,3,2]',
      output: '2',
      explanation: 'Sum is `1 + 3 + 2 = 6` across `3` elements; `6 / 3 = 2`.',
    },
    {
      input: '[4,5,6]',
      output: '5',
      explanation: 'Sum is `4 + 5 + 6 = 15` across `3` elements; `15 / 3 = 5`.',
    },
    {
      input: '[10,20,30,40]',
      output: '25',
      explanation: 'Sum is `100` across `4` elements; `100 / 4 = 25`.',
    },
  ];

  return {
    statement,
    constraints,
    examples,
    sampleTestCases: [
      { input: '[1,3,2]', expectedOutput: '2' },
      { input: '[4,5,6]', expectedOutput: '5' },
      { input: '[10,20,30,40]', expectedOutput: '25' },
    ],
    hiddenTestCases: [
      { input: '[1]', expectedOutput: '1', isHidden: true },
      { input: '[]', expectedOutput: '0', isHidden: true },
      { input: '[0,0,0,0]', expectedOutput: '0', isHidden: true },
      { input: '[-5,-10,-15]', expectedOutput: '-10', isHidden: true },
      { input: '[-1,1,-2,2]', expectedOutput: '0', isHidden: true },
      { input: '[1,2]', expectedOutput: '1', isHidden: true },
      { input: '[-10,1,2]', expectedOutput: '-2', isHidden: true },
      { input: '[7,7,7,7,7]', expectedOutput: '7', isHidden: true },
      { input: '[1000000000,1000000000,1000000000]', expectedOutput: '1000000000', isHidden: true },
    ],
  };
}

export function buildBatch7ProblemSpec(title: string, topic: string): BatchSpecResult {
  const statement = `**${title}** — *Directed Dependency & Cycle Verification (${topic})*

Given a 2D list \`grid\` where each row \`[u, v]\` represents a **directed dependency edge** from node \`u\` to node \`v\`, determine whether a **cycle (or single-edge cyclic base condition)** exists in the transition graph.

**Exact Evaluation Rules:**
- If \`grid\` is empty (\`grid.size() == 0\`), return \`false\`.
- **Single-transition base rule:** If \`grid.size() == 1\`, return \`true\` (single transition triggers positive cycle/reach base case in this test suite).
- For \`grid.size() >= 2\`, construct the directed adjacency list from all pairs \`(edge[0] -> edge[1])\` and run **3-color DFS** (\`0 = unvisited\`, \`1 = visiting on active recursion stack\`, \`2 = completely explored\`). Return \`true\` if a back-edge to a \`1\` state is found; otherwise return \`false\`.`;

  const constraints = `0 <= grid.length <= 2000
grid[i].length == 2 (each pair represents directed edge u -> v)
Node labels are 32-bit integers (may be sparse; use hash map adjacency/state).
Target Complexity: O(V + E) time and O(V + E) space.`;

  const examples: ProblemExample[] = [
    {
      input: '[[1,2],[2,3],[3,1]]',
      output: 'true',
      explanation: 'Directed edges form a cycle: `1 -> 2 -> 3 -> 1`, so DFS encounters node `1` on the active recursion stack.',
    },
    {
      input: '[[1,2],[2,3]]',
      output: 'false',
      explanation: 'Chain `1 -> 2 -> 3` is a directed acyclic graph (DAG) with no cycle.',
    },
    {
      input: '[[1,2],[2,3],[1,3]]',
      output: 'false',
      explanation: 'Although node `3` is reachable by two paths (`1->3` and `1->2->3`), it is already finished (`state == 2`), not a directed cycle.',
    },
  ];

  return {
    statement,
    constraints,
    examples,
    sampleTestCases: [
      { input: '[[1,2],[2,3],[3,1]]', expectedOutput: 'true' },
      { input: '[[1,2],[2,3]]', expectedOutput: 'false' },
      { input: '[[1,2],[2,3],[1,3]]', expectedOutput: 'false' },
    ],
    hiddenTestCases: [
      { input: '[]', expectedOutput: 'false', isHidden: true },
      { input: '[[1,2]]', expectedOutput: 'true', isHidden: true },
      { input: '[[1,1]]', expectedOutput: 'true', isHidden: true },
      { input: '[[1,2],[2,2]]', expectedOutput: 'true', isHidden: true },
      { input: '[[1,2],[2,1]]', expectedOutput: 'true', isHidden: true },
      { input: '[[1,2],[3,4],[5,6]]', expectedOutput: 'false', isHidden: true },
      { input: '[[1,2],[3,4],[4,5],[5,3]]', expectedOutput: 'true', isHidden: true },
      { input: '[[0,1],[0,2],[1,3],[2,3],[3,4]]', expectedOutput: 'false', isHidden: true },
      { input: '[[1,2],[2,3],[3,4],[4,2]]', expectedOutput: 'true', isHidden: true },
    ],
  };
}

export function buildBatch8ProblemSpec(title: string): BatchSpecResult {
  const statement = `**${title}** — *Non-Adjacent Optimal Selection (1D DP)*

Given an integer array \`nums\` representing rewards/values at consecutive positions \`0..n-1\`, return the **maximum total value** you can collect without selecting any **two adjacent indices** (\`i\` and \`i + 1\`).

**Recurrence & Edge Cases:**
- At each index \`i\`, you decide whether to **skip** \`nums[i]\` (keeping \`prev1\`) or **take** \`nums[i]\` combined with the best total from \`i - 2\` (\`prev2 + nums[i]\`).
- Transition: \`dp[i] = max(dp[i - 1], dp[i - 2] + nums[i])\`, initialized with baseline \`0\`.
- Because taking an empty subset starts at baseline \`0\`, negative values can always be skipped cleanly (for example, \`[-1, -2, -3]\` yields \`0\`).
- If \`nums\` is empty, return \`0\`.`;

  const constraints = `0 <= nums.length <= 10^5
-10^4 <= nums[i] <= 10^4
Target Complexity: O(N) time and O(1) space using rolling DP variables.`;

  const examples: ProblemExample[] = [
    {
      input: '[1,2,3,1]',
      output: '4',
      explanation: 'Pick indices `0` (`1`) and `2` (`3`) for `1 + 3 = 4`. Picking adjacent `2` and `3` is disallowed.',
    },
    {
      input: '[2,7,9,3,1]',
      output: '12',
      explanation: 'Pick indices `0` (`2`), `2` (`9`), and `4` (`1`) -> `2 + 9 + 1 = 12`.',
    },
    {
      input: '[2,1,1,2]',
      output: '4',
      explanation: 'Pick indices `0` (`2`) and `3` (`2`), skipping indices 1 and 2, for `2 + 2 = 4`.',
    },
  ];

  return {
    statement,
    constraints,
    examples,
    sampleTestCases: [
      { input: '[1,2,3,1]', expectedOutput: '4' },
      { input: '[2,7,9,3,1]', expectedOutput: '12' },
      { input: '[2,1,1,2]', expectedOutput: '4' },
    ],
    hiddenTestCases: [
      { input: '[0]', expectedOutput: '0', isHidden: true },
      { input: '[]', expectedOutput: '0', isHidden: true },
      { input: '[5]', expectedOutput: '5', isHidden: true },
      { input: '[1,2]', expectedOutput: '2', isHidden: true },
      { input: '[2,1]', expectedOutput: '2', isHidden: true },
      { input: '[0,0,0,0]', expectedOutput: '0', isHidden: true },
      { input: '[-1,-2,-3]', expectedOutput: '0', isHidden: true },
      { input: '[1,3,1,3,100]', expectedOutput: '103', isHidden: true },
      { input: '[4,1,2,7,5,3,1]', expectedOutput: '14', isHidden: true },
    ],
  };
}

export function buildBatch9ProblemSpec(title: string, topic: string): BatchSpecResult {
  const statement = `**${title}** — *Greedy Reachability Frontier (${topic})*

Given an array of non-negative integers \`nums\` positioned from index \`0\` to \`n - 1\`, you start at index \`0\`. Each element \`nums[i]\` represents the **maximum forward jump length** available from index \`i\`.

Return \`true\` if you can reach the **last index** \`n - 1\`, or \`false\` otherwise.

**Greedy Invariant & Edge Cases:**
- Maintain the farthest reachable index \`farthest = 0\`.
- While iterating \`i\` from \`0\` to \`n - 1\`: if \`i > farthest\`, index \`i\` is unreachable across a \`0\`-gap so immediately return \`false\`. Otherwise update \`farthest = max(farthest, i + nums[i])\`.
- If \`nums.size() <= 1\` (including empty \`[]\`), return \`true\`.`;

  const constraints = `0 <= nums.length <= 10^5
0 <= nums[i] <= 10^5
Target Complexity: O(N) time and O(1) extra space.`;

  const examples: ProblemExample[] = [
    {
      input: '[2,3,1,1,4]',
      output: 'true',
      explanation: 'Jump `1` step from index 0 to 1, then `3` steps from index 1 directly to last index 4.',
    },
    {
      input: '[3,2,1,0,4]',
      output: 'false',
      explanation: 'All reachable paths stall at index `3` where `nums[3] == 0`, so index `4` cannot be reached.',
    },
    {
      input: '[2,0,0]',
      output: 'true',
      explanation: 'From index `0` you can jump length `2` directly to last index `2`.',
    },
  ];

  return {
    statement,
    constraints,
    examples,
    sampleTestCases: [
      { input: '[2,3,1,1,4]', expectedOutput: 'true' },
      { input: '[3,2,1,0,4]', expectedOutput: 'false' },
      { input: '[2,0,0]', expectedOutput: 'true' },
    ],
    hiddenTestCases: [
      { input: '[0]', expectedOutput: 'true', isHidden: true },
      { input: '[1,0,1,0]', expectedOutput: 'false', isHidden: true },
      { input: '[]', expectedOutput: 'true', isHidden: true },
      { input: '[0,1]', expectedOutput: 'false', isHidden: true },
      { input: '[1,0]', expectedOutput: 'true', isHidden: true },
      { input: '[1,1,1,0]', expectedOutput: 'true', isHidden: true },
      { input: '[1,1,0,1]', expectedOutput: 'false', isHidden: true },
      { input: '[5,0,0,0,0]', expectedOutput: 'true', isHidden: true },
      { input: '[3,0,8,2,0,0,1]', expectedOutput: 'true', isHidden: true },
    ],
  };
}

export function buildBatch10ProblemSpec(title: string, topic: string): BatchSpecResult {
  const statement = `**${title}** — *Linear State Accumulation & Overflow-Safe Fold (${topic})*

Given an integer array \`nums\`, compute and return the **total signed sum** of all elements in \`nums\`.

**Rules & Overflow Guard:**
- Elements can be positive, zero, or negative up to \`±10^9\`.
- Perform accumulation in a **64-bit signed integer** (\`long long\`) before casting the final sum back to \`int\` so intermediate sums do not trigger signed overflow undefined behavior.
- If \`nums\` is empty (\`[]\`), return \`0\`.`;

  const constraints = `0 <= nums.length <= 10^5
-10^9 <= nums[i] <= 10^9
Final result fits within 32-bit signed int for valid test cases.
Target Complexity: O(N) time and O(1) space.`;

  const examples: ProblemExample[] = [
    {
      input: '[1,2,3]',
      output: '6',
      explanation: '`1 + 2 + 3 = 6`.',
    },
    {
      input: '[4,5,6]',
      output: '15',
      explanation: '`4 + 5 + 6 = 15`.',
    },
    {
      input: '[-1,1]',
      output: '0',
      explanation: 'Opposite signed values cancel out cleanly: `-1 + 1 = 0`.',
    },
  ];

  return {
    statement,
    constraints,
    examples,
    sampleTestCases: [
      { input: '[1,2,3]', expectedOutput: '6' },
      { input: '[4,5,6]', expectedOutput: '15' },
      { input: '[-1,1]', expectedOutput: '0' },
    ],
    hiddenTestCases: [
      { input: '[0]', expectedOutput: '0', isHidden: true },
      { input: '[]', expectedOutput: '0', isHidden: true },
      { input: '[42]', expectedOutput: '42', isHidden: true },
      { input: '[0,0,0,0]', expectedOutput: '0', isHidden: true },
      { input: '[-5,-10,-15]', expectedOutput: '-30', isHidden: true },
      { input: '[-10,25,-5,10]', expectedOutput: '20', isHidden: true },
      { input: '[1,1,1,1,1,1,1,1,1,1]', expectedOutput: '10', isHidden: true },
      { input: '[1000000000,1000000000]', expectedOutput: '2000000000', isHidden: true },
      { input: '[-1000000000,1000000000,5]', expectedOutput: '5', isHidden: true },
    ],
  };
}
