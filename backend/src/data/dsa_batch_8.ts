import { ProblemDefinition } from '../judge/types';

export const DSA_BATCH_8: ProblemDefinition[] = Array.from({ length: 50 }, (_, i) => {
  const id = 351 + i;
  const isBacktracking = i === 0;
  const topic = isBacktracking ? 'Backtracking' : 'Dynamic Programming';
  const pattern = isBacktracking ? 'Constraint Satisfaction / Pruning' : 'Memoization / Bottom-Up Tabulation';
  const diff: 'Easy' | 'Medium' | 'Hard' = i % 4 === 0 ? 'Easy' : (i % 5 === 0 ? 'Hard' : 'Medium');

  const titles = [
    // 1 Backtracking
    'Fair Distribution of Cookies',
    // 49 Dynamic Programming
    'House Robber', 'House Robber II', 'Longest Palindromic Substring DP', 'Palindromic Substrings DP',
    'Decode Ways II', 'Min Cost Climbing Stairs', 'Coin Change II', 'Partition Equal Subset Sum',
    'Longest Increasing Subsequence', 'Word Break', 'Word Break II', 'Combination Sum IV',
    'Perfect Squares', 'Unique Paths', 'Unique Paths II', 'Minimum Path Sum',
    'Longest Common Subsequence', 'Best Time to Buy and Sell Stock with Cooldown',
    'Best Time to Buy and Sell Stock with Transaction Fee', 'Target Sum', 'Interleaving String',
    'Edit Distance', 'Distinct Subsequences', 'Regular Expression Matching', 'Wildcard Matching',
    'Burst Balloons', 'Maximal Square', 'Longest Valid Parentheses', 'Russian Doll Envelopes',
    'Dungeon Game', 'Trapping Rain Water DP', 'Ones and Zeroes', 'Maximum Length of Repeated Subarray',
    'Cherry Pickup', 'Cherry Pickup II', 'Minimum Falling Path Sum', 'Paint House',
    'Paint House II', 'Paint Fence', 'Count Submatrices with All Ones', 'Stone Game',
    'Stone Game II', 'Stone Game III', 'Stone Game IV', 'Knight Probability in Chessboard',
    'Soup Servings', 'Champagne Tower', 'Push Dominoes DP', 'Domino and Tromino Tiling'
  ];

  const title = titles[i] || `DP Problem ${id}`;
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  return {
    id,
    slug,
    title,
    difficulty: diff,
    category: 'DSA' as const,
    topic,
    pattern,
    statement: `Solve ${title} by formulating the optimal substructure recurrence relation. Analyze time and space complexity with state compression when applicable.`,
    constraints: '1 <= N <= 5000\nOptimal state transitions fit within standard memory and runtime limits.',
    examples: [
      { input: '[1,2,3,1]', output: '4', explanation: 'Optimal recurrence path yields maximum value.' },
    ],
    functionSignature: 'int solve(vector<int>& nums)',
    paramTypes: ['vector<int>'],
    returnType: 'int',
    defaultCodeStub: `class Solution {\npublic:\n    int solve(vector<int>& nums) {\n        // Your code here\n    }\n};`,
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
});

