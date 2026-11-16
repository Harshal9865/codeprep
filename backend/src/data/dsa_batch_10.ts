import { ProblemDefinition } from '../judge/types';
import { buildBatch10ProblemSpec } from './batchProblemSpecs';

export const DSA_BATCH_10: ProblemDefinition[] = Array.from({ length: 50 }, (_, i) => {
  const id = 451 + i;
  let topic = 'Bit Manipulation';
  let pattern = 'Bitwise Logic / Power of Two';

  if (i >= 8 && i < 23) {
    topic = 'Math and Geometry';
    pattern = 'Number Theory / Fast Exponentiation / Geometry';
  } else if (i >= 23 && i < 33) {
    topic = 'Tries';
    pattern = 'Prefix Tree Traversal';
  } else if (i >= 33) {
    topic = 'Capstone DSA';
    pattern = 'Integrated Multi-Paradigm Optimization';
  }

  const diff: 'Easy' | 'Medium' | 'Hard' = i % 3 === 0 ? 'Easy' : (i % 5 === 0 ? 'Hard' : 'Medium');

  const titles = [
    // 8 Bit Manipulation
    'Single Number II', 'Single Number III', 'Bitwise AND of Numbers Range', 'Subsets with Bitmask',
    'Maximum XOR of Two Numbers in an Array', 'Concatenation of Consecutive Binary Numbers',
    'Minimum Flips to Make a OR b Equal to c', 'Counting Subgrids via Bitset',
    // 15 Math & Geometry
    'Rotate Image Geometry', 'Spiral Matrix II', 'Set Matrix Zeroes II', 'Happy Number',
    'Plus One', 'Pow(x, n)', 'Multiply Strings Math', 'Detect Squares',
    'Max Points on a Line', 'Excel Sheet Column Title', 'Excel Sheet Column Number', 'Factorial Trailing Zeroes',
    'Count Primes (Sieve of Eratosthenes)', 'Greatest Common Divisor of Strings', 'Reaching Points',
    // 10 Tries
    'Implement Trie (Prefix Tree)', 'Design Add and Search Words Data Structure', 'Word Search II Trie',
    'Replace Words', 'Maximum XOR With an Element From Array', 'Concatenated Words',
    'Stream of Characters', 'Prefix and Suffix Search', 'Map Sum Pairs', 'Longest Word in Dictionary',
    // 17 Capstone DSA Challenges
    'Skyline Problem', 'Count of Smaller Numbers After Self', 'Reverse Pairs',
    'LFU Cache', 'All O`one Data Structure', 'Max Points on a Line II',
    'Trapping Rain Water II', 'Shortest Palindrome II', 'Sliding Window Median II',
    'Burst Balloons II', 'Distinct Subsequences II', 'Recover a Tree From Preorder Traversal',
    'Binary Tree Cameras', 'Freedom Trail', 'Longest Duplicate Substring',
    'Find Minimum Time to Finish All Jobs', 'Optimal Account Balancing'
  ];

  const title = titles[i] || `Advanced DSA Problem ${id}`;
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const spec = buildBatch10ProblemSpec(title, topic);

  return {
    id,
    slug,
    title,
    difficulty: diff,
    category: 'DSA' as const,
    topic,
    pattern,
    statement: spec.statement,
    constraints: spec.constraints,
    examples: spec.examples,
    functionSignature: 'int solve(vector<int>& nums)',
    paramTypes: ['vector<int>'],
    returnType: 'int',
    defaultCodeStub: `class Solution {\npublic:\n    int solve(vector<int>& nums) {\n        // Your code here\n    }\n};`,
    sampleTestCases: spec.sampleTestCases,
    hiddenTestCases: spec.hiddenTestCases,
  };
});

