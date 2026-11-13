import { ProblemDefinition } from '../judge/types';

export const DSA_BATCH_9: ProblemDefinition[] = Array.from({ length: 50 }, (_, i) => {
  const id = 401 + i;
  let topic = 'Greedy';
  let pattern = 'Locally Optimal Choice / Greedy Invariant';

  if (i < 8) {
    topic = 'Dynamic Programming';
    pattern = 'Digit DP / Bitmask DP / Interval DP';
  } else if (i >= 33 && i < 43) {
    topic = 'Intervals';
    pattern = 'Interval Sorting / Boundary Merging';
  } else if (i >= 43) {
    topic = 'Bit Manipulation';
    pattern = 'Bitwise XOR / Masks / Shift Operators';
  }

  const diff: 'Easy' | 'Medium' | 'Hard' = i % 4 === 0 ? 'Easy' : (i % 6 === 0 ? 'Hard' : 'Medium');

  const titles = [
    // 8 DP
    'Palindrome Removal', 'Strange Printer', 'Remove Boxes', 'K Inverse Pairs Array',
    'Arithmetic Slices', 'Arithmetic Slices II - Subsequence', 'Integer Break', 'Count Vowels Permutation',
    // 25 Greedy
    'Jump Game', 'Jump Game II', 'Gas Station', 'Hand of Straights',
    'Merge Triplets to Form Target Triplet', 'Partition Labels Greedy', 'Valid Parenthesis String',
    'Candy', 'Queue Reconstruction by Height', 'Minimum Number of Arrows to Burst Balloons',
    'Non-overlapping Intervals Greedy', 'Dota2 Senate', 'Monotone Increasing Digits',
    'Lemonade Change', 'Car Pooling', 'Previous Permutation With One Swap', 'Broken Calculator',
    'Two City Scheduling', 'Minimum Cost to Move Chips to Same Position', 'Wiggle Subsequence',
    'Create Maximum Number', 'Patching Array', 'Course Schedule III', 'Reduce Array Size to The Half', 'Maximum Bags With Full Capacity of Rocks',
    // 10 Intervals
    'Insert Interval', 'Merge Intervals', 'Non-overlapping Intervals', 'Meeting Rooms',
    'Meeting Rooms II', 'Minimum Interval to Include Each Query', 'Car Pooling Intervals',
    'Interval List Intersections II', 'Employee Free Time', 'Data Stream as Disjoint Intervals',
    // 7 Bit Manipulation
    'Single Number', 'Number of 1 Bits', 'Counting Bits', 'Reverse Bits',
    'Missing Number', 'Sum of Two Integers', 'Reverse Integer via Bit Logic'
  ];

  const title = titles[i] || `Greedy / Interval Problem ${id}`;
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  return {
    id,
    slug,
    title,
    difficulty: diff,
    category: 'DSA' as const,
    topic,
    pattern,
    statement: `Solve ${title} by proving that local decisions yield global optimality, or by interval sorting. Ensure all corner cases are handled.`,
    constraints: '1 <= N <= 10^5\nAll operations must execute within standard bounds.',
    examples: [
      { input: '[2,3,1,1,4]', output: 'true', explanation: 'Reach the last index with minimum steps.' },
    ],
    functionSignature: 'int solve(vector<int>& nums)',
    paramTypes: ['vector<int>'],
    returnType: 'int',
    defaultCodeStub: `class Solution {\npublic:\n    int solve(vector<int>& nums) {\n        // Your code here\n    }\n};`,
    sampleTestCases: [
      { input: '[2,3,1,1,4]', expectedOutput: 'true' },
      { input: '[3,2,1,0,4]', expectedOutput: 'false' },
    ],
    hiddenTestCases: [
      { input: '[0]', expectedOutput: 'true', isHidden: true },
      { input: '[1,0,1,0]', expectedOutput: 'false', isHidden: true },
    ],
  };
});

