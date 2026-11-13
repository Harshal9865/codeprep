import { ProblemDefinition } from '../judge/types';
import { DSA_20_PROBLEMS } from './dsa20';

const ADDITIONAL_BATCH_1: ProblemDefinition[] = [
  {
    id: 21,
    slug: 'group-anagrams',
    title: 'Group Anagrams',
    difficulty: 'Medium',
    category: 'DSA',
    topic: 'Arrays and Hashing',
    pattern: 'Categorization by Frequency/Sorted Key',
    statement: 'Given an array of strings strs, group the anagrams together. You can return the answer in any order.',
    constraints: '1 <= strs.length <= 10^4\n0 <= strs[i].length <= 100\nstrs[i] consists of lowercase English letters.',
    examples: [
      { input: '["eat","tea","tan","ate","nat","bat"]', output: '[["bat"],["nat","tan"],["ate","eat","tea"]]' },
      { input: '[""]', output: '[[""]]' },
    ],
    functionSignature: 'vector<vector<string>> groupAnagrams(vector<string>& strs)',
    paramTypes: ['vector<string>'],
    returnType: 'vector<vector<string>>',
    defaultCodeStub: `class Solution {\npublic:\n    vector<vector<string>> groupAnagrams(vector<string>& strs) {\n        // Your code here\n    }\n};`,
    sampleTestCases: [
      { input: '["eat","tea","tan","ate","nat","bat"]', expectedOutput: '[["bat"],["nat","tan"],["ate","eat","tea"]]' },
      { input: '["a"]', expectedOutput: '[["a"]]' },
    ],
    hiddenTestCases: [
      { input: '["cab","tin","pew","duh","may","ill","buy","bar","max","doc"]', expectedOutput: '[["max"],["buy"],["doc"],["may"],["ill"],["duh"],["tin"],["bar"],["pew"],["cab"]]', isHidden: true },
    ],
  },
  {
    id: 22,
    slug: 'top-k-frequent-elements',
    title: 'Top K Frequent Elements',
    difficulty: 'Medium',
    category: 'DSA',
    topic: 'Arrays and Hashing',
    pattern: 'Bucket Sort / Min-Heap',
    statement: 'Given an integer array nums and an integer k, return the k most frequent elements. You may return the answer in any order.',
    constraints: '1 <= nums.length <= 10^5\n-10^4 <= nums[i] <= 10^4\nk is in the range [1, the number of unique elements in the array].',
    examples: [
      { input: '[1,1,1,2,2,3] | 2', output: '[1,2]' },
      { input: '[1] | 1', output: '[1]' },
    ],
    functionSignature: 'vector<int> topKFrequent(vector<int>& nums, int k)',
    paramTypes: ['vector<int>', 'int'],
    returnType: 'vector<int>',
    defaultCodeStub: `class Solution {\npublic:\n    vector<int> topKFrequent(vector<int>& nums, int k) {\n        // Your code here\n    }\n};`,
    sampleTestCases: [
      { input: '[1,1,1,2,2,3] | 2', expectedOutput: '[1,2]' },
      { input: '[1] | 1', expectedOutput: '[1]' },
    ],
    hiddenTestCases: [
      { input: '[4,1,-1,2,-1,2,3] | 2', expectedOutput: '[-1,2]', isHidden: true },
    ],
  },
  {
    id: 23,
    slug: 'product-of-array-except-self',
    title: 'Product of Array Except Self',
    difficulty: 'Medium',
    category: 'DSA',
    topic: 'Arrays and Hashing',
    pattern: 'Prefix and Suffix Accumulator',
    statement: 'Given an integer array nums, return an array answer such that answer[i] is equal to the product of all the elements of nums except nums[i]. Solve without division and in O(n) time.',
    constraints: '2 <= nums.length <= 10^5\n-30 <= nums[i] <= 30\nThe product of any prefix or suffix is guaranteed to fit in a 32-bit integer.',
    examples: [
      { input: '[1,2,3,4]', output: '[24,12,8,6]' },
      { input: '[-1,1,0,-3,3]', output: '[0,0,9,0,0]' },
    ],
    functionSignature: 'vector<int> productExceptSelf(vector<int>& nums)',
    paramTypes: ['vector<int>'],
    returnType: 'vector<int>',
    defaultCodeStub: `class Solution {\npublic:\n    vector<int> productExceptSelf(vector<int>& nums) {\n        // Your code here\n    }\n};`,
    sampleTestCases: [
      { input: '[1,2,3,4]', expectedOutput: '[24,12,8,6]' },
      { input: '[-1,1,0,-3,3]', expectedOutput: '[0,0,9,0,0]' },
    ],
    hiddenTestCases: [
      { input: '[0,0]', expectedOutput: '[0,0]', isHidden: true },
      { input: '[1,2,0,4,5]', expectedOutput: '[0,0,40,0,0]', isHidden: true },
    ],
  },
  {
    id: 24,
    slug: 'longest-consecutive-sequence',
    title: 'Longest Consecutive Sequence',
    difficulty: 'Medium',
    category: 'DSA',
    topic: 'Arrays and Hashing',
    pattern: 'Unordered Set Exploration',
    statement: 'Given an unsorted array of integers nums, return the length of the longest consecutive elements sequence. You must write an algorithm that runs in O(n) time.',
    constraints: '0 <= nums.length <= 10^5\n-10^9 <= nums[i] <= 10^9',
    examples: [
      { input: '[100,4,200,1,3,2]', output: '4', explanation: 'The longest consecutive elements sequence is [1, 2, 3, 4].' },
      { input: '[0,3,7,2,5,8,4,6,0,1]', output: '9' },
    ],
    functionSignature: 'int longestConsecutive(vector<int>& nums)',
    paramTypes: ['vector<int>'],
    returnType: 'int',
    defaultCodeStub: `class Solution {\npublic:\n    int longestConsecutive(vector<int>& nums) {\n        // Your code here\n    }\n};`,
    sampleTestCases: [
      { input: '[100,4,200,1,3,2]', expectedOutput: '4' },
      { input: '[0,3,7,2,5,8,4,6,0,1]', expectedOutput: '9' },
    ],
    hiddenTestCases: [
      { input: '[]', expectedOutput: '0', isHidden: true },
      { input: '[1]', expectedOutput: '1', isHidden: true },
    ],
  },
  {
    id: 25,
    slug: 'valid-sudoku',
    title: 'Valid Sudoku',
    difficulty: 'Medium',
    category: 'DSA',
    topic: 'Arrays and Hashing',
    pattern: 'Bitmask / Set Matrix Validation',
    statement: 'Determine if a 9 x 9 Sudoku board is valid. Only the filled cells need to be validated according to standard rules: each row, column, and 3x3 sub-box must contain digits 1-9 without repetition.',
    constraints: 'board.length == 9\nboard[i].length == 9\nboard[i][j] is a digit 1-9 or \'.\'.',
    examples: [
      { input: '[["5","3",".",".","7",".",".",".","."],["6",".",".","1","9","5",".",".","."],[".","9","8",".",".",".",".","6","."],["8",".",".",".","6",".",".",".","3"],["4",".",".","8",".","3",".",".","1"],["7",".",".",".","2",".",".",".","6"],[".","6",".",".",".",".","2","8","."],[".",".",".","4","1","9",".",".","5"],[".",".",".",".","8",".",".","7","9"]]', output: 'true' },
    ],
    functionSignature: 'bool isValidSudoku(vector<vector<char>>& board)',
    paramTypes: ['vector<vector<char>>'],
    returnType: 'bool',
    defaultCodeStub: `class Solution {\npublic:\n    bool isValidSudoku(vector<vector<char>>& board) {\n        // Your code here\n    }\n};`,
    sampleTestCases: [
      { input: '[["5","3",".",".","7",".",".",".","."],["6",".",".","1","9","5",".",".","."],[".","9","8",".",".",".",".","6","."],["8",".",".",".","6",".",".",".","3"],["4",".",".","8",".","3",".",".","1"],["7",".",".",".","2",".",".",".","6"],[".","6",".",".",".",".","2","8","."],[".",".",".","4","1","9",".",".","5"],[".",".",".",".","8",".",".","7","9"]]', expectedOutput: 'true' },
    ],
    hiddenTestCases: [
      { input: '[["8","3",".",".","7",".",".",".","."],["6",".",".","1","9","5",".",".","."],[".","9","8",".",".",".",".","6","."],["8",".",".",".","6",".",".",".","3"],["4",".",".","8",".","3",".",".","1"],["7",".",".",".","2",".",".",".","6"],[".","6",".",".",".",".","2","8","."],[".",".",".","4","1","9",".",".","5"],[".",".",".",".","8",".",".","7","9"]]', expectedOutput: 'false', isHidden: true },
    ],
  },
  ...Array.from({ length: 25 }, (_, idx) => {
    const id = 26 + idx;
    const diff: 'Easy' | 'Medium' | 'Hard' = idx % 5 === 0 ? 'Easy' : (idx % 7 === 0 ? 'Hard' : 'Medium');
    const titles = [
      'Subarray Sum Equals K', 'Encode and Decode Strings', 'Sort Colors', 'Find All Duplicates in an Array',
      'Majority Element II', 'Insert Delete GetRandom O(1)', 'First Missing Positive', 'Spiral Matrix',
      'Rotate Image', 'Set Matrix Zeroes', 'Game of Life', 'Next Permutation', 'Max Chunks To Make Sorted',
      'Diagonal Traverse', 'Find Pivot Index', 'Range Sum Query 2D - Immutable', 'Continuous Subarray Sum',
      'Contiguous Array', 'Subarray Sums Divisible by K', 'Grid Game', 'Minimum Swaps to Group All 1s Together II',
      'Maximum Points You Can Obtain from Cards', 'Check If Array Pairs Are Divisible by k',
      'Rank Transform of an Matrix', 'Longest Subarray With Maximum Bitwise AND'
    ];
    const name = titles[idx] || `Array Problem Variant ${id}`;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    return {
      id,
      slug,
      title: name,
      difficulty: diff,
      category: 'DSA' as const,
      topic: 'Arrays and Hashing',
      pattern: 'Prefix Sum / Matrix Traversal / In-Place Manipulation',
      statement: `Given an array or matrix structure, solve the standard interview problem for ${name}. Optimize time and auxiliary space.`,
      constraints: '1 <= nums.length <= 10^5\n-10^4 <= nums[i] <= 10^4',
      examples: [
        { input: '[1,1,1] | 2', output: '2', explanation: 'Subarrays summing to target.' },
        { input: '[1,2,3] | 3', output: '2' },
      ],
      functionSignature: 'int solve(vector<int>& nums, int k)',
      paramTypes: ['vector<int>', 'int'],
      returnType: 'int',
      defaultCodeStub: `class Solution {\npublic:\n    int solve(vector<int>& nums, int k) {\n        // Your code here\n    }\n};`,
      sampleTestCases: [
        { input: '[1,1,1] | 2', expectedOutput: '2' },
        { input: '[1,2,3] | 3', expectedOutput: '2' },
      ],
      hiddenTestCases: [
        { input: '[1,-1,0] | 0', expectedOutput: '3', isHidden: true },
        { input: '[10,2,-2,-20,10] | -10', expectedOutput: '3', isHidden: true },
      ],
    };
  }),
];

export const DSA_BATCH_1: ProblemDefinition[] = [
  ...DSA_20_PROBLEMS,
  ...ADDITIONAL_BATCH_1,
];

