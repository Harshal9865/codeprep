import { ProblemDefinition } from '../judge/types';
import { buildBatch2ProblemSpec } from './batchProblemSpecs';

export const DSA_BATCH_2: ProblemDefinition[] = Array.from({ length: 50 }, (_, i) => {
  const id = 51 + i;
  const isTwoPointer = i < 26;
  const topic = isTwoPointer ? 'Two Pointers' : 'Sliding Window';
  const diff: 'Easy' | 'Medium' | 'Hard' = i % 5 === 0 ? 'Easy' : (i % 7 === 0 ? 'Hard' : 'Medium');

  const twoPointerTitles = [
    'Trapping Rain Water', 'Move Zeroes', 'Remove Duplicates from Sorted Array II', 'Squares of a Sorted Array',
    'Sort Transformed Array', '3Sum Closest', '4Sum', 'Boats to Save People', 'Valid Palindrome II',
    'String Compression', 'Shortest Unsorted Continuous Subarray', 'Backspace String Compare', 'Push Dominoes',
    'Interval List Intersections', 'Assign Cookies', 'Heaters', 'Expressive Words', 'Friends Of Appropriate Ages',
    'Most Profit Assigning Work', 'Find the Duplicate Number', 'Partition Labels', 'Compare Version Numbers',
    'Sentence Similarity III', 'Rotate Array', 'Reverse Words in a String', 'Longest Mountain in Array'
  ];

  const slidingWindowTitles = [
    'Minimum Window Substring', 'Sliding Window Maximum', 'Permutation in String',
    'Longest Repeating Character Replacement', 'Maximum Average Subarray I', 'Fruit Into Baskets',
    'Max Consecutive Ones III', 'Binary Subarrays With Sum', 'Subarrays with K Different Integers',
    'Grumpy Bookstore Owner', 'Number of Substrings Containing All Three Characters',
    'Count Number of Nice Subarrays', 'Replace the Substring for Balanced String',
    'Find K-Length Substrings With No Repeated Characters', 'Maximum Number of Vowels in a Substring of Given Length',
    'Longest Continuous Subarray With Absolute Diff Less Than or Equal to Limit',
    'Subarray Product Less Than K', 'Minimum Size Subarray Sum', 'Minimum Operations to Reduce X to Zero',
    'Frequency of the Most Frequent Element', 'Maximum Points You Can Obtain from Cards II',
    'Get Equal Substrings Within Budget', 'Count Complete Subarrays in an Array', 'Maximum Beauty of an Array After Applying Operation'
  ];

  const title = isTwoPointer ? (twoPointerTitles[i] || `Two Pointers Problem ${id}`) : (slidingWindowTitles[i - 26] || `Sliding Window Problem ${id}`);
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const pattern = isTwoPointer ? 'Opposite Ends / Boundary Two Pointers' : 'Dynamic Shrinking/Expanding Window';
  const spec = buildBatch2ProblemSpec(title);

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

