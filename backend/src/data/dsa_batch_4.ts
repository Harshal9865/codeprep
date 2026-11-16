import { ProblemDefinition } from '../judge/types';
import { buildBatch4ProblemSpec } from './batchProblemSpecs';

export const DSA_BATCH_4: ProblemDefinition[] = Array.from({ length: 50 }, (_, i) => {
  const id = 151 + i;
  let topic = 'Stack and Queue';
  let pattern = 'Monotonic Stack / FIFO Queue';

  if (i < 6) {
    topic = 'Linked List';
    pattern = 'Fast & Slow Pointer / In-Place Reversal';
  } else if (i >= 35) {
    topic = 'Binary Search';
    pattern = 'Search Space Halving / Monotonic Predicate';
  }

  const diff: 'Easy' | 'Medium' | 'Hard' = i % 4 === 0 ? 'Easy' : (i % 7 === 0 ? 'Hard' : 'Medium');

  const titles = [
    // 6 Linked List
    'Split Linked List in Parts', 'Add Two Numbers II', 'Swapping Nodes in a Linked List',
    'Double a Number Represented as a Linked List', 'Insert Greatest Common Divisors in Linked List', 'Merge In Between Linked Lists',
    // 29 Stack & Queue
    'Min Stack', 'Evaluate Reverse Polish Notation', 'Daily Temperatures', 'Car Fleet',
    'Largest Rectangle in Histogram', 'Implement Queue using Stacks', 'Implement Stack using Queues',
    'Baseball Game', 'Decode String', 'Asteroid Collision', 'Online Stock Span',
    'Remove All Adjacent Duplicates in String II', 'Design Circular Queue', 'Design Circular Deque',
    'Sliding Window Median', '132 Pattern', 'Next Greater Element I', 'Next Greater Element II',
    'Sum of Subarray Minimums', 'Shortest Subarray with Sum at Least K', 'Trapping Rain Water with Stack',
    'Basic Calculator', 'Basic Calculator III', 'Validate Stack Sequences', 'Exclusive Time of Functions',
    'Remove K Digits', 'Maximum Frequency Stack', 'Find the Most Competitive Subsequence', 'Build an Array With Stack Operations',
    // 15 Binary Search
    'Search in Rotated Sorted Array', 'Find Minimum in Rotated Sorted Array', 'Time Based Key-Value Store',
    'Median of Two Sorted Arrays', 'Koko Eating Bananas', 'Find First and Last Position of Element in Sorted Array',
    'Search Insert Position', 'Single Element in a Sorted Array', 'Capacity To Ship Packages Within D Days',
    'Split Array Largest Sum', 'Find Peak Element', 'Peak Index in a Mountain Array',
    'Search in Rotated Sorted Array II', 'Find Minimum in Rotated Sorted Array II', 'Count Negative Numbers in a Sorted Matrix'
  ];

  const title = titles[i] || `Data Structure Problem ${id}`;
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const spec = buildBatch4ProblemSpec(title);

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

