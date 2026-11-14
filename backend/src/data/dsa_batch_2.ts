import { ProblemDefinition } from '../judge/types';

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
  const pattern = isTwoPointer ? 'Opposite Ends / Fast & Slow Pointers' : 'Dynamic Shrinking/Expanding Window';

  return {
    id,
    slug,
    title,
    difficulty: diff,
    category: 'DSA' as const,
    topic,
    pattern,
    statement: `Solve ${title} using optimal ${pattern} principles. Analyze time complexity and ensure minimal space overhead.`,
    constraints: '1 <= nums.length <= 10^5\n-10^4 <= nums[i] <= 10^4',
    examples: [
      { input: '[0,1,0,2,1,0,1,3,2,1,2,1]', output: '6', explanation: 'Computed optimal answer under constraints.' },
      { input: '[4,2,0,3,2,5]', output: '9' },
    ],
    functionSignature: 'int solve(vector<int>& nums)',
    paramTypes: ['vector<int>'],
    returnType: 'int',
    defaultCodeStub: `class Solution {\npublic:\n    int solve(vector<int>& nums) {\n        // Your code here\n    }\n};`,
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
});

