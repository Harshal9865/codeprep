import { ProblemDefinition } from '../judge/types';

export const DSA_20_PROBLEMS: ProblemDefinition[] = [
  {
    id: 1,
    slug: 'two-sum',
    title: 'Two Sum',
    difficulty: 'Easy',
    category: 'DSA',
    topic: 'Arrays and Hashing',
    pattern: 'Hash Map Lookup',
    statement:
      'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice. You can return the answer in any order.',
    constraints:
      '2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9\n-10^9 <= target <= 10^9\nOnly one valid answer exists.',
    examples: [
      {
        input: '[2,7,11,15] | 9',
        output: '[0,1]',
        explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].',
      },
      {
        input: '[3,2,4] | 6',
        output: '[1,2]',
        explanation: 'Because nums[1] + nums[2] == 6, we return [1, 2].',
      },
      {
        input: '[3,3] | 6',
        output: '[0,1]',
        explanation: 'Both elements at index 0 and 1 add up to 6.',
      },
    ],
    functionSignature: 'vector<int> twoSum(vector<int>& nums, int target)',
    paramTypes: ['vector<int>', 'int'],
    returnType: 'vector<int>',
    defaultCodeStub: `class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        // Implement your solution here
    }
};`,
    sampleTestCases: [
      { input: '[2,7,11,15] | 9', expectedOutput: '[0,1]' },
      { input: '[3,2,4] | 6', expectedOutput: '[1,2]' },
      { input: '[3,3] | 6', expectedOutput: '[0,1]' },
    ],
    hiddenTestCases: [
      { input: '[-1,-2,-3,-4,-5] | -8', expectedOutput: '[2,4]', isHidden: true },
      { input: '[0,4,3,0] | 0', expectedOutput: '[0,3]', isHidden: true },
      { input: '[-3,4,3,90] | 0', expectedOutput: '[0,2]', isHidden: true },
      { input: '[1,5,3,7,9] | 12', expectedOutput: '[1,3]', isHidden: true },
      { input: '[1000000000,-1000000000,5] | 0', expectedOutput: '[0,1]', isHidden: true },
      { input: '[1,2,3,4,5,6,7,8,9,10] | 19', expectedOutput: '[8,9]', isHidden: true },
      { input: '[5,75,25] | 100', expectedOutput: '[1,2]', isHidden: true },
      { input: '[11,2,15,7] | 9', expectedOutput: '[1,3]', isHidden: true },
      { input: '[1,3,5,7,9,11] | 4', expectedOutput: '[0,1]', isHidden: true },
      { input: '[10,20,30,40,50] | 90', expectedOutput: '[3,4]', isHidden: true },
    ],
  },
  {
    id: 2,
    slug: 'best-time-to-buy-and-sell-stock',
    title: 'Best Time to Buy and Sell Stock',
    difficulty: 'Easy',
    category: 'DSA',
    topic: 'Arrays and Hashing',
    pattern: 'Single-Pass Min-Tracking',
    statement:
      'You are given an array prices where prices[i] is the price of a given stock on the ith day.\n\nYou want to maximize your profit by choosing a single day to buy one stock and choosing a different day in the future to sell that stock.\n\nReturn the maximum profit you can achieve from this transaction. If you cannot achieve any profit, return 0.',
    constraints: '1 <= prices.length <= 10^5\n0 <= prices[i] <= 10^4',
    examples: [
      {
        input: '[7,1,5,3,6,4]',
        output: '5',
        explanation: 'Buy on day 2 (price = 1) and sell on day 5 (price = 6), profit = 6 - 1 = 5.',
      },
      {
        input: '[7,6,4,3,1]',
        output: '0',
        explanation: 'In this case, no transactions are done and the max profit = 0.',
      },
    ],
    functionSignature: 'int maxProfit(vector<int>& prices)',
    paramTypes: ['vector<int>'],
    returnType: 'int',
    defaultCodeStub: `class Solution {
public:
    int maxProfit(vector<int>& prices) {
        // Implement your solution here
    }
};`,
    sampleTestCases: [
      { input: '[7,1,5,3,6,4]', expectedOutput: '5' },
      { input: '[7,6,4,3,1]', expectedOutput: '0' },
      { input: '[2,4,1]', expectedOutput: '2' },
    ],
    hiddenTestCases: [
      { input: '[1]', expectedOutput: '0', isHidden: true },
      { input: '[1,2]', expectedOutput: '1', isHidden: true },
      { input: '[2,1]', expectedOutput: '0', isHidden: true },
      { input: '[3,2,6,5,0,3]', expectedOutput: '4', isHidden: true },
      { input: '[1,2,4,2,5,7,2,4,9,0]', expectedOutput: '8', isHidden: true },
      { input: '[5,5,5,5,5]', expectedOutput: '0', isHidden: true },
      { input: '[10,1,2,3,4,5,6,7,8,9]', expectedOutput: '8', isHidden: true },
      { input: '[2,1,2,1,0,1,2]', expectedOutput: '2', isHidden: true },
      { input: '[100,50,200,10,80]', expectedOutput: '150', isHidden: true },
      { input: '[10,9,8,7,6,5,4,3,2,1,2]', expectedOutput: '1', isHidden: true },
    ],
  },
  {
    id: 3,
    slug: 'contains-duplicate',
    title: 'Contains Duplicate',
    difficulty: 'Easy',
    category: 'DSA',
    topic: 'Arrays and Hashing',
    pattern: 'Hash Set Lookup',
    statement:
      'Given an integer array nums, return true if any value appears at least twice in the array, and return false if every element is distinct.',
    constraints: '1 <= nums.length <= 10^5\n-10^9 <= nums[i] <= 10^9',
    examples: [
      { input: '[1,2,3,1]', output: 'true', explanation: '1 appears twice at indices 0 and 3.' },
      { input: '[1,2,3,4]', output: 'false', explanation: 'All elements are distinct.' },
      { input: '[1,1,1,3,3,4,3,2,4,2]', output: 'true' },
    ],
    functionSignature: 'bool containsDuplicate(vector<int>& nums)',
    paramTypes: ['vector<int>'],
    returnType: 'bool',
    defaultCodeStub: `class Solution {
public:
    bool containsDuplicate(vector<int>& nums) {
        // Implement your solution here
    }
};`,
    sampleTestCases: [
      { input: '[1,2,3,1]', expectedOutput: 'true' },
      { input: '[1,2,3,4]', expectedOutput: 'false' },
      { input: '[1,1,1,3,3,4,3,2,4,2]', expectedOutput: 'true' },
    ],
    hiddenTestCases: [
      { input: '[1]', expectedOutput: 'false', isHidden: true },
      { input: '[0,0]', expectedOutput: 'true', isHidden: true },
      { input: '[-1,-1]', expectedOutput: 'true', isHidden: true },
      { input: '[-1,2,-1]', expectedOutput: 'true', isHidden: true },
      { input: '[1000000000,-1000000000,1000000000]', expectedOutput: 'true', isHidden: true },
      { input: '[10,20,30,40,50,60,70,80,90]', expectedOutput: 'false', isHidden: true },
      { input: '[2,14,18,22,22]', expectedOutput: 'true', isHidden: true },
      { input: '[3,1]', expectedOutput: 'false', isHidden: true },
      { input: '[1,5,-2,-4,0]', expectedOutput: 'false', isHidden: true },
      { input: '[1,5,-2,-4,0,1]', expectedOutput: 'true', isHidden: true },
    ],
  },
  {
    id: 4,
    slug: 'valid-anagram',
    title: 'Valid Anagram',
    difficulty: 'Easy',
    category: 'DSA',
    topic: 'Strings',
    pattern: 'Frequency Counting',
    statement:
      'Given two strings s and t, return true if t is an anagram of s, and false otherwise.\n\nAn Anagram is a word or phrase formed by rearranging the letters of a different word or phrase, typically using all the original letters exactly once.',
    constraints: '1 <= s.length, t.length <= 5 * 10^4\ns and t consist of lowercase English letters.',
    examples: [
      { input: 'anagram | nagaram', output: 'true' },
      { input: 'rat | car', output: 'false' },
    ],
    functionSignature: 'bool isAnagram(string s, string t)',
    paramTypes: ['string', 'string'],
    returnType: 'bool',
    defaultCodeStub: `class Solution {
public:
    bool isAnagram(string s, string t) {
        // Implement your solution here
    }
};`,
    sampleTestCases: [
      { input: 'anagram | nagaram', expectedOutput: 'true' },
      { input: 'rat | car', expectedOutput: 'false' },
      { input: 'listen | silent', expectedOutput: 'true' },
    ],
    hiddenTestCases: [
      { input: 'a | a', expectedOutput: 'true', isHidden: true },
      { input: 'a | b', expectedOutput: 'false', isHidden: true },
      { input: 'ab | a', expectedOutput: 'false', isHidden: true },
      { input: 'aacc | ccac', expectedOutput: 'false', isHidden: true },
      { input: 'ab | ba', expectedOutput: 'true', isHidden: true },
      { input: 'triangle | integral', expectedOutput: 'true', isHidden: true },
      { input: 'apple | pale', expectedOutput: 'false', isHidden: true },
      { input: 'cinema | iceman', expectedOutput: 'true', isHidden: true },
      { input: 'aaabbb | bbaaa', expectedOutput: 'false', isHidden: true },
      { input: 'zzzz | zzzz', expectedOutput: 'true', isHidden: true },
    ],
  },
  {
    id: 5,
    slug: 'valid-palindrome',
    title: 'Valid Palindrome',
    difficulty: 'Easy',
    category: 'DSA',
    topic: 'Two Pointers',
    pattern: 'Two Pointers (Left and Right)',
    statement:
      'A phrase is a palindrome if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward. Alphanumeric characters include letters and numbers.\n\nGiven a string s, return true if it is a palindrome, or false otherwise.',
    constraints: '1 <= s.length <= 2 * 10^5\ns consists only of printable ASCII characters.',
    examples: [
      { input: 'A man, a plan, a canal: Panama', output: 'true' },
      { input: 'race a car', output: 'false' },
      { input: ' ', output: 'true' },
    ],
    functionSignature: 'bool isPalindrome(string s)',
    paramTypes: ['string'],
    returnType: 'bool',
    defaultCodeStub: `class Solution {
public:
    bool isPalindrome(string s) {
        // Implement your solution here
    }
};`,
    sampleTestCases: [
      { input: 'A man, a plan, a canal: Panama', expectedOutput: 'true' },
      { input: 'race a car', expectedOutput: 'false' },
      { input: ' ', expectedOutput: 'true' },
    ],
    hiddenTestCases: [
      { input: '0P', expectedOutput: 'false', isHidden: true },
      { input: 'a.', expectedOutput: 'true', isHidden: true },
      { input: '.,', expectedOutput: 'true', isHidden: true },
      { input: 'ab_a', expectedOutput: 'true', isHidden: true },
      { input: '1b1', expectedOutput: 'true', isHidden: true },
      { input: 'No lemon, no melon', expectedOutput: 'true', isHidden: true },
      { input: 'Was it a car or a cat I saw?', expectedOutput: 'true', isHidden: true },
      { input: 'Madam, I am Adam', expectedOutput: 'false', isHidden: true },
      { input: '12321', expectedOutput: 'true', isHidden: true },
      { input: '123421', expectedOutput: 'false', isHidden: true },
    ],
  },
  {
    id: 6,
    slug: 'two-sum-ii-input-array-is-sorted',
    title: 'Two Sum II - Input Array Is Sorted',
    difficulty: 'Medium',
    category: 'DSA',
    topic: 'Two Pointers',
    pattern: 'Two Pointers (Left and Right)',
    statement:
      'Given a 1-indexed array of integers numbers that is already sorted in non-decreasing order, find two numbers such that they add up to a specific target number.\n\nReturn the indices of the two numbers, index1 and index2, added by one as an integer array [index1, index2] of length 2.\n\nThe tests are generated such that there is exactly one solution. You may not use the same element twice. Your solution must use only O(1) extra space.',
    constraints: '2 <= numbers.length <= 3 * 10^4\n-1000 <= numbers[i] <= 1000\nnumbers is sorted in non-decreasing order.\n-1000 <= target <= 1000',
    examples: [
      { input: '[2,7,11,15] | 9', output: '[1,2]' },
      { input: '[2,3,4] | 6', output: '[1,3]' },
      { input: '[-1,0] | -1', output: '[1,2]' },
    ],
    functionSignature: 'vector<int> twoSum(vector<int>& numbers, int target)',
    paramTypes: ['vector<int>', 'int'],
    returnType: 'vector<int>',
    defaultCodeStub: `class Solution {
public:
    vector<int> twoSum(vector<int>& numbers, int target) {
        // Implement your solution here
    }
};`,
    sampleTestCases: [
      { input: '[2,7,11,15] | 9', expectedOutput: '[1,2]' },
      { input: '[2,3,4] | 6', expectedOutput: '[1,3]' },
      { input: '[-1,0] | -1', expectedOutput: '[1,2]' },
    ],
    hiddenTestCases: [
      { input: '[1,2] | 3', expectedOutput: '[1,2]', isHidden: true },
      { input: '[0,0,3,4] | 0', expectedOutput: '[1,2]', isHidden: true },
      { input: '[-5,-3,-1,1,3,5] | 0', expectedOutput: '[1,6]', isHidden: true },
      { input: '[5,25,75] | 100', expectedOutput: '[2,3]', isHidden: true },
      { input: '[-10,-8,-2,1,2,5] | -1', expectedOutput: '[3,4]', isHidden: true },
      { input: '[1,2,3,4,4,9,56,90] | 8', expectedOutput: '[4,5]', isHidden: true },
      { input: '[-1000,-500,0,500,1000] | 0', expectedOutput: '[1,5]', isHidden: true },
      { input: '[3,24,50,79,88,150,345] | 200', expectedOutput: '[3,6]', isHidden: true },
      { input: '[1,3,4,5,7,10,11] | 9', expectedOutput: '[3,4]', isHidden: true },
      { input: '[-3,3,4,90] | 0', expectedOutput: '[1,2]', isHidden: true },
    ],
  },
  {
    id: 7,
    slug: '3sum',
    title: '3Sum',
    difficulty: 'Medium',
    category: 'DSA',
    topic: 'Two Pointers',
    pattern: 'Sorting + Two Pointers',
    statement:
      'Given an integer array nums, return all the triplets [nums[i], nums[j], nums[k]] such that i != j, i != k, and j != k, and nums[i] + nums[j] + nums[k] == 0.\n\nNotice that the solution set must not contain duplicate triplets.',
    constraints: '3 <= nums.length <= 3000\n-10^5 <= nums[i] <= 10^5',
    examples: [
      { input: '[-1,0,1,2,-1,-4]', output: '[[-1,-1,2],[-1,0,1]]' },
      { input: '[0,1,1]', output: '[]' },
      { input: '[0,0,0]', output: '[[0,0,0]]' },
    ],
    functionSignature: 'vector<vector<int>> threeSum(vector<int>& nums)',
    paramTypes: ['vector<int>'],
    returnType: 'vector<vector<int>>',
    defaultCodeStub: `class Solution {
public:
    vector<vector<int>> threeSum(vector<int>& nums) {
        // Implement your solution here
    }
};`,
    sampleTestCases: [
      { input: '[-1,0,1,2,-1,-4]', expectedOutput: '[[-1,-1,2],[-1,0,1]]' },
      { input: '[0,1,1]', expectedOutput: '[]' },
      { input: '[0,0,0]', expectedOutput: '[[0,0,0]]' },
    ],
    hiddenTestCases: [
      { input: '[-2,0,1,1,2]', expectedOutput: '[[-2,0,2],[-2,1,1]]', isHidden: true },
      { input: '[1,2,-2,-1]', expectedOutput: '[]', isHidden: true },
      { input: '[0,0,0,0]', expectedOutput: '[[0,0,0]]', isHidden: true },
      { input: '[-1,0,1,0]', expectedOutput: '[[-1,0,1]]', isHidden: true },
      { input: '[-4,-2,-2,-2,0,1,2,2,2,3,3,4,4,6,6]', expectedOutput: '[[-4,-2,6],[-4,0,4],[-4,1,3],[-4,2,2],[-2,-2,4],[-2,0,2]]', isHidden: true },
      { input: '[-1,-1,-1,2]', expectedOutput: '[[-1,-1,2]]', isHidden: true },
      { input: '[3,0,-2,-1,1,2]', expectedOutput: '[[-2,-1,3],[-2,0,2],[-1,0,1]]', isHidden: true },
      { input: '[-2,0,0,2,2]', expectedOutput: '[[-2,0,2]]', isHidden: true },
      { input: '[1,-1,-1,0]', expectedOutput: '[[-1,0,1]]', isHidden: true },
      { input: '[-5,1,2,3,4]', expectedOutput: '[[-5,1,4],[-5,2,3]]', isHidden: true },
    ],
  },
  {
    id: 8,
    slug: 'container-with-most-water',
    title: 'Container With Most Water',
    difficulty: 'Medium',
    category: 'DSA',
    topic: 'Two Pointers',
    pattern: 'Shrinking Window / Two Pointers',
    statement:
      'You are given an integer array height of length n. There are n vertical lines drawn such that the two endpoints of the ith line are (i, 0) and (i, height[i]).\n\nFind two lines that together with the x-axis form a container, such that the container contains the most water.\n\nReturn the maximum amount of water a container can store.',
    constraints: 'n == height.length\n2 <= n <= 10^5\n0 <= height[i] <= 10^4',
    examples: [
      { input: '[1,8,6,2,5,4,8,3,7]', output: '49' },
      { input: '[1,1]', output: '1' },
    ],
    functionSignature: 'int maxArea(vector<int>& height)',
    paramTypes: ['vector<int>'],
    returnType: 'int',
    defaultCodeStub: `class Solution {
public:
    int maxArea(vector<int>& height) {
        // Implement your solution here
    }
};`,
    sampleTestCases: [
      { input: '[1,8,6,2,5,4,8,3,7]', expectedOutput: '49' },
      { input: '[1,1]', expectedOutput: '1' },
      { input: '[4,3,2,1,4]', expectedOutput: '16' },
    ],
    hiddenTestCases: [
      { input: '[1,2,1]', expectedOutput: '2', isHidden: true },
      { input: '[1,2,4,3]', expectedOutput: '4', isHidden: true },
      { input: '[2,3,4,5,18,17,6]', expectedOutput: '17', isHidden: true },
      { input: '[1,8,100,2,100,4,8,3,7]', expectedOutput: '200', isHidden: true },
      { input: '[0,2]', expectedOutput: '0', isHidden: true },
      { input: '[2,0]', expectedOutput: '0', isHidden: true },
      { input: '[1,3,2,5,25,24,5]', expectedOutput: '24', isHidden: true },
      { input: '[10,9,8,7,6,5,4,3,2,1]', expectedOutput: '25', isHidden: true },
      { input: '[1,2,3,4,5,6,7,8,9,10]', expectedOutput: '25', isHidden: true },
      { input: '[5,5,5,5,5,5]', expectedOutput: '25', isHidden: true },
    ],
  },
  {
    id: 9,
    slug: 'longest-substring-without-repeating-characters',
    title: 'Longest Substring Without Repeating Characters',
    difficulty: 'Medium',
    category: 'DSA',
    topic: 'Sliding Window',
    pattern: 'Dynamic Sliding Window with Hash Map',
    statement:
      'Given a string s, find the length of the longest substring without repeating characters.',
    constraints: '0 <= s.length <= 5 * 10^4\ns consists of English letters, digits, symbols and spaces.',
    examples: [
      { input: 'abcabcbb', output: '3', explanation: 'The answer is "abc", with the length of 3.' },
      { input: 'bbbbb', output: '1', explanation: 'The answer is "b", with the length of 1.' },
      { input: 'pwwkew', output: '3', explanation: 'The answer is "wke", with the length of 3.' },
    ],
    functionSignature: 'int lengthOfLongestSubstring(string s)',
    paramTypes: ['string'],
    returnType: 'int',
    defaultCodeStub: `class Solution {
public:
    int lengthOfLongestSubstring(string s) {
        // Implement your solution here
    }
};`,
    sampleTestCases: [
      { input: 'abcabcbb', expectedOutput: '3' },
      { input: 'bbbbb', expectedOutput: '1' },
      { input: 'pwwkew', expectedOutput: '3' },
    ],
    hiddenTestCases: [
      { input: '""', expectedOutput: '0', isHidden: true },
      { input: '" "', expectedOutput: '1', isHidden: true },
      { input: 'au', expectedOutput: '2', isHidden: true },
      { input: 'dvdf', expectedOutput: '3', isHidden: true },
      { input: 'abba', expectedOutput: '2', isHidden: true },
      { input: 'tmmzuxt', expectedOutput: '5', isHidden: true },
      { input: 'abcdefghijklmnopqrstuvwxyz', expectedOutput: '26', isHidden: true },
      { input: 'aab', expectedOutput: '2', isHidden: true },
      { input: 'cdd', expectedOutput: '2', isHidden: true },
      { input: 'ohomm', expectedOutput: '3', isHidden: true },
    ],
  },
  {
    id: 10,
    slug: 'valid-parentheses',
    title: 'Valid Parentheses',
    difficulty: 'Easy',
    category: 'DSA',
    topic: 'Stack and Queue',
    pattern: 'Matching Stack',
    statement:
      'Given a string s containing just the characters "(", ")", "{", "}", "[" and "]", determine if the input string is valid.\n\nAn input string is valid if:\n1. Open brackets must be closed by the same type of brackets.\n2. Open brackets must be closed in the correct order.\n3. Every close bracket has a corresponding open bracket of the same type.',
    constraints: '1 <= s.length <= 10^4\ns consists of parentheses only "()[]{}".',
    examples: [
      { input: '()', output: 'true' },
      { input: '()[]{}', output: 'true' },
      { input: '(]', output: 'false' },
    ],
    functionSignature: 'bool isValid(string s)',
    paramTypes: ['string'],
    returnType: 'bool',
    defaultCodeStub: `class Solution {
public:
    bool isValid(string s) {
        // Implement your solution here
    }
};`,
    sampleTestCases: [
      { input: '()', expectedOutput: 'true' },
      { input: '()[]{}', expectedOutput: 'true' },
      { input: '(]', expectedOutput: 'false' },
    ],
    hiddenTestCases: [
      { input: '(', expectedOutput: 'false', isHidden: true },
      { input: ')', expectedOutput: 'false', isHidden: true },
      { input: '([)]', expectedOutput: 'false', isHidden: true },
      { input: '{[]}', expectedOutput: 'true', isHidden: true },
      { input: '(([]){})', expectedOutput: 'true', isHidden: true },
      { input: '(((((((((())))))))))', expectedOutput: 'true', isHidden: true },
      { input: '(((((((((()))))))))', expectedOutput: 'false', isHidden: true },
      { input: '}{', expectedOutput: 'false', isHidden: true },
      { input: '[]{}()', expectedOutput: 'true', isHidden: true },
      { input: '(()[{}])', expectedOutput: 'true', isHidden: true },
    ],
  },
  {
    id: 11,
    slug: 'reverse-linked-list',
    title: 'Reverse Linked List',
    difficulty: 'Easy',
    category: 'DSA',
    topic: 'Linked List',
    pattern: 'Pointer Reversal (Three Pointers)',
    statement:
      'Given the head of a singly linked list, reverse the list, and return the reversed list.',
    constraints: 'The number of nodes in the list is the range [0, 5000].\n-5000 <= Node.val <= 5000',
    examples: [
      { input: '[1,2,3,4,5]', output: '[5,4,3,2,1]' },
      { input: '[1,2]', output: '[2,1]' },
      { input: '[]', output: '[]' },
    ],
    functionSignature: 'ListNode* reverseList(ListNode* head)',
    paramTypes: ['ListNode*'],
    returnType: 'ListNode*',
    defaultCodeStub: `class Solution {
public:
    ListNode* reverseList(ListNode* head) {
        // Implement your solution here
    }
};`,
    sampleTestCases: [
      { input: '[1,2,3,4,5]', expectedOutput: '[5,4,3,2,1]' },
      { input: '[1,2]', expectedOutput: '[2,1]' },
      { input: '[]', expectedOutput: '[]' },
    ],
    hiddenTestCases: [
      { input: '[1]', expectedOutput: '[1]', isHidden: true },
      { input: '[1,2,3]', expectedOutput: '[3,2,1]', isHidden: true },
      { input: '[-1,-2,-3]', expectedOutput: '[-3,-2,-1]', isHidden: true },
      { input: '[1,1,1,1]', expectedOutput: '[1,1,1,1]', isHidden: true },
      { input: '[10,20,30,40,50,60,70,80,90,100]', expectedOutput: '[100,90,80,70,60,50,40,30,20,10]', isHidden: true },
      { input: '[0]', expectedOutput: '[0]', isHidden: true },
      { input: '[0,1]', expectedOutput: '[1,0]', isHidden: true },
      { input: '[5,4,3,2,1]', expectedOutput: '[1,2,3,4,5]', isHidden: true },
      { input: '[1,2,1]', expectedOutput: '[1,2,1]', isHidden: true },
      { input: '[7,8,9]', expectedOutput: '[9,8,7]', isHidden: true },
    ],
  },
  {
    id: 12,
    slug: 'merge-two-sorted-lists',
    title: 'Merge Two Sorted Lists',
    difficulty: 'Easy',
    category: 'DSA',
    topic: 'Linked List',
    pattern: 'Dummy Head + Two Pointers',
    statement:
      'You are given the heads of two sorted linked lists list1 and list2.\n\nMerge the two lists into one sorted list. The list should be made by splicing together the nodes of the first two lists.\n\nReturn the head of the merged linked list.',
    constraints: 'The number of nodes in both lists is in the range [0, 50].\n-100 <= Node.val <= 100\nBoth list1 and list2 are sorted in non-decreasing order.',
    examples: [
      { input: '[1,2,4] | [1,3,4]', output: '[1,1,2,3,4,4]' },
      { input: '[] | []', output: '[]' },
      { input: '[] | [0]', output: '[0]' },
    ],
    functionSignature: 'ListNode* mergeTwoLists(ListNode* list1, ListNode* list2)',
    paramTypes: ['ListNode*', 'ListNode*'],
    returnType: 'ListNode*',
    defaultCodeStub: `class Solution {
public:
    ListNode* mergeTwoLists(ListNode* list1, ListNode* list2) {
        // Implement your solution here
    }
};`,
    sampleTestCases: [
      { input: '[1,2,4] | [1,3,4]', expectedOutput: '[1,1,2,3,4,4]' },
      { input: '[] | []', expectedOutput: '[]' },
      { input: '[] | [0]', expectedOutput: '[0]' },
    ],
    hiddenTestCases: [
      { input: '[5] | [1,2,3]', expectedOutput: '[1,2,3,5]', isHidden: true },
      { input: '[1,3,5] | [2,4,6]', expectedOutput: '[1,2,3,4,5,6]', isHidden: true },
      { input: '[-10,-5,0] | [-8,-3,2]', expectedOutput: '[-10,-8,-5,-3,0,2]', isHidden: true },
      { input: '[1,1,1] | [1,1,1]', expectedOutput: '[1,1,1,1,1,1]', isHidden: true },
      { input: '[2] | [1]', expectedOutput: '[1,2]', isHidden: true },
      { input: '[1] | []', expectedOutput: '[1]', isHidden: true },
      { input: '[1,2,3] | [4,5,6]', expectedOutput: '[1,2,3,4,5,6]', isHidden: true },
      { input: '[10,20] | [5,15,25]', expectedOutput: '[5,10,15,20,25]', isHidden: true },
      { input: '[-1] | [1]', expectedOutput: '[-1,1]', isHidden: true },
      { input: '[0,0] | [0]', expectedOutput: '[0,0,0]', isHidden: true },
    ],
  },
  {
    id: 13,
    slug: 'binary-search',
    title: 'Binary Search',
    difficulty: 'Easy',
    category: 'DSA',
    topic: 'Binary Search',
    pattern: 'Standard Binary Search',
    statement:
      'Given an array of integers nums which is sorted in ascending order, and an integer target, write a function to search target in nums. If target exists, then return its index. Otherwise, return -1.\n\nYou must write an algorithm with O(log n) runtime complexity.',
    constraints: '1 <= nums.length <= 10^4\n-10^4 < nums[i], target < 10^4\nAll the integers in nums are unique.\nnums is sorted in ascending order.',
    examples: [
      { input: '[-1,0,3,5,9,12] | 9', output: '4' },
      { input: '[-1,0,3,5,9,12] | 2', output: '-1' },
    ],
    functionSignature: 'int search(vector<int>& nums, int target)',
    paramTypes: ['vector<int>', 'int'],
    returnType: 'int',
    defaultCodeStub: `class Solution {
public:
    int search(vector<int>& nums, int target) {
        // Implement your solution here
    }
};`,
    sampleTestCases: [
      { input: '[-1,0,3,5,9,12] | 9', expectedOutput: '4' },
      { input: '[-1,0,3,5,9,12] | 2', expectedOutput: '-1' },
      { input: '[5] | 5', expectedOutput: '0' },
    ],
    hiddenTestCases: [
      { input: '[5] | -5', expectedOutput: '-1', isHidden: true },
      { input: '[2,5] | 5', expectedOutput: '1', isHidden: true },
      { input: '[2,5] | 2', expectedOutput: '0', isHidden: true },
      { input: '[2,5] | 0', expectedOutput: '-1', isHidden: true },
      { input: '[1,3,5,7,9,11,13,15] | 1', expectedOutput: '0', isHidden: true },
      { input: '[1,3,5,7,9,11,13,15] | 15', expectedOutput: '7', isHidden: true },
      { input: '[1,3,5,7,9,11,13,15] | 7', expectedOutput: '3', isHidden: true },
      { input: '[1,3,5,7,9,11,13,15] | 8', expectedOutput: '-1', isHidden: true },
      { input: '[-100,-50,-20,0,20,50,100] | 0', expectedOutput: '3', isHidden: true },
      { input: '[-100,-50,-20,0,20,50,100] | -20', expectedOutput: '2', isHidden: true },
    ],
  },
  {
    id: 14,
    slug: 'search-a-2d-matrix',
    title: 'Search a 2D Matrix',
    difficulty: 'Medium',
    category: 'DSA',
    topic: 'Binary Search',
    pattern: '2D Flattened Binary Search',
    statement:
      'You are given an m x n integer matrix with the following two properties:\n1. Each row is sorted in non-decreasing order.\n2. The first integer of each row is greater than the last integer of the previous row.\n\nGiven an integer target, return true if target is in matrix or false otherwise.\n\nYou must write a solution in O(log(m * n)) time complexity.',
    constraints: 'm == matrix.length\nn == matrix[i].length\n1 <= m, n <= 100\n-10^4 <= matrix[i][j], target <= 10^4',
    examples: [
      { input: '[[1,3,5,7],[10,11,16,20],[23,30,34,60]] | 3', output: 'true' },
      { input: '[[1,3,5,7],[10,11,16,20],[23,30,34,60]] | 13', output: 'false' },
    ],
    functionSignature: 'bool searchMatrix(vector<vector<int>>& matrix, int target)',
    paramTypes: ['vector<vector<int>>', 'int'],
    returnType: 'bool',
    defaultCodeStub: `class Solution {
public:
    bool searchMatrix(vector<vector<int>>& matrix, int target) {
        // Implement your solution here
    }
};`,
    sampleTestCases: [
      { input: '[[1,3,5,7],[10,11,16,20],[23,30,34,60]] | 3', expectedOutput: 'true' },
      { input: '[[1,3,5,7],[10,11,16,20],[23,30,34,60]] | 13', expectedOutput: 'false' },
    ],
    hiddenTestCases: [
      { input: '[[1]] | 1', expectedOutput: 'true', isHidden: true },
      { input: '[[1]] | 0', expectedOutput: 'false', isHidden: true },
      { input: '[[1,3]] | 3', expectedOutput: 'true', isHidden: true },
      { input: '[[1],[3]] | 3', expectedOutput: 'true', isHidden: true },
      { input: '[[1,3,5]] | 1', expectedOutput: 'true', isHidden: true },
      { input: '[[1,3,5]] | 5', expectedOutput: 'true', isHidden: true },
      { input: '[[1,3,5]] | 4', expectedOutput: 'false', isHidden: true },
      { input: '[[1,3,5,7],[10,11,16,20],[23,30,34,50]] | 11', expectedOutput: 'true', isHidden: true },
      { input: '[[1,3,5,7],[10,11,16,20],[23,30,34,50]] | 50', expectedOutput: 'true', isHidden: true },
      { input: '[[1,3,5,7],[10,11,16,20],[23,30,34,50]] | 1', expectedOutput: 'true', isHidden: true },
    ],
  },
  {
    id: 15,
    slug: 'maximum-subarray',
    title: 'Maximum Subarray',
    difficulty: 'Medium',
    category: 'DSA',
    topic: 'Dynamic Programming',
    pattern: "Kadane's Algorithm",
    statement:
      'Given an integer array nums, find the subarray with the largest sum, and return its sum.',
    constraints: '1 <= nums.length <= 10^5\n-10^4 <= nums[i] <= 10^4',
    examples: [
      { input: '[-2,1,-3,4,-1,2,1,-5,4]', output: '6', explanation: 'The subarray [4,-1,2,1] has the largest sum 6.' },
      { input: '[1]', output: '1' },
      { input: '[5,4,-1,7,8]', output: '23' },
    ],
    functionSignature: 'int maxSubArray(vector<int>& nums)',
    paramTypes: ['vector<int>'],
    returnType: 'int',
    defaultCodeStub: `class Solution {
public:
    int maxSubArray(vector<int>& nums) {
        // Implement your solution here
    }
};`,
    sampleTestCases: [
      { input: '[-2,1,-3,4,-1,2,1,-5,4]', expectedOutput: '6' },
      { input: '[1]', expectedOutput: '1' },
      { input: '[5,4,-1,7,8]', expectedOutput: '23' },
    ],
    hiddenTestCases: [
      { input: '[-1]', expectedOutput: '-1', isHidden: true },
      { input: '[-2,-1]', expectedOutput: '-1', isHidden: true },
      { input: '[-1,-2]', expectedOutput: '-1', isHidden: true },
      { input: '[-2,-3,-1,-5]', expectedOutput: '-1', isHidden: true },
      { input: '[1,2,3,4,5]', expectedOutput: '15', isHidden: true },
      { input: '[-2,1]', expectedOutput: '1', isHidden: true },
      { input: '[8,-19,5,-4,20]', expectedOutput: '21', isHidden: true },
      { input: '[-1,0,-2]', expectedOutput: '0', isHidden: true },
      { input: '[1,-1,1,-1,1]', expectedOutput: '1', isHidden: true },
      { input: '[10,-3,4,-1,2,1,-5,4]', expectedOutput: '13', isHidden: true },
    ],
  },
  {
    id: 16,
    slug: 'climbing-stairs',
    title: 'Climbing Stairs',
    difficulty: 'Easy',
    category: 'DSA',
    topic: 'Dynamic Programming',
    pattern: '1D DP / Fibonacci Sequence',
    statement:
      'You are climbing a staircase. It takes n steps to reach the top.\n\nEach time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?',
    constraints: '1 <= n <= 45',
    examples: [
      { input: '2', output: '2', explanation: 'There are two ways: 1 step + 1 step, or 2 steps.' },
      { input: '3', output: '3', explanation: 'There are three ways: 1+1+1, 1+2, or 2+1.' },
    ],
    functionSignature: 'int climbStairs(int n)',
    paramTypes: ['int'],
    returnType: 'int',
    defaultCodeStub: `class Solution {
public:
    int climbStairs(int n) {
        // Implement your solution here
    }
};`,
    sampleTestCases: [
      { input: '2', expectedOutput: '2' },
      { input: '3', expectedOutput: '3' },
      { input: '4', expectedOutput: '5' },
    ],
    hiddenTestCases: [
      { input: '1', expectedOutput: '1', isHidden: true },
      { input: '5', expectedOutput: '8', isHidden: true },
      { input: '6', expectedOutput: '13', isHidden: true },
      { input: '7', expectedOutput: '21', isHidden: true },
      { input: '8', expectedOutput: '34', isHidden: true },
      { input: '10', expectedOutput: '89', isHidden: true },
      { input: '15', expectedOutput: '987', isHidden: true },
      { input: '20', expectedOutput: '10946', isHidden: true },
      { input: '30', expectedOutput: '1346269', isHidden: true },
      { input: '40', expectedOutput: '165580141', isHidden: true },
    ],
  },
  {
    id: 17,
    slug: 'coin-change',
    title: 'Coin Change',
    difficulty: 'Medium',
    category: 'DSA',
    topic: 'Dynamic Programming',
    pattern: 'Unbounded Knapsack / Bottom-Up DP',
    statement:
      'You are given an integer array coins representing coins of different denominations and an integer amount representing a total amount of money.\n\nReturn the fewest number of coins that you need to make up that amount. If that amount of money cannot be made up by any combination of the coins, return -1.\n\nYou may assume that you have an infinite number of each kind of coin.',
    constraints: '1 <= coins.length <= 12\n1 <= coins[i] <= 2^31 - 1\n0 <= amount <= 10^4',
    examples: [
      { input: '[1,2,5] | 11', output: '3', explanation: '11 = 5 + 5 + 1' },
      { input: '[2] | 3', output: '-1' },
      { input: '[1] | 0', output: '0' },
    ],
    functionSignature: 'int coinChange(vector<int>& coins, int amount)',
    paramTypes: ['vector<int>', 'int'],
    returnType: 'int',
    defaultCodeStub: `class Solution {
public:
    int coinChange(vector<int>& coins, int amount) {
        // Implement your solution here
    }
};`,
    sampleTestCases: [
      { input: '[1,2,5] | 11', expectedOutput: '3' },
      { input: '[2] | 3', expectedOutput: '-1' },
      { input: '[1] | 0', expectedOutput: '0' },
    ],
    hiddenTestCases: [
      { input: '[1] | 1', expectedOutput: '1', isHidden: true },
      { input: '[1] | 2', expectedOutput: '2', isHidden: true },
      { input: '[2,5,10,1] | 27', expectedOutput: '4', isHidden: true },
      { input: '[186,419,83,408] | 6249', expectedOutput: '20', isHidden: true },
      { input: '[2,4] | 7', expectedOutput: '-1', isHidden: true },
      { input: '[3,7] | 11', expectedOutput: '-1', isHidden: true },
      { input: '[1,3,5] | 8', expectedOutput: '2', isHidden: true },
      { input: '[1,2,5] | 100', expectedOutput: '20', isHidden: true },
      { input: '[2,5] | 3', expectedOutput: '-1', isHidden: true },
      { input: '[7,14] | 28', expectedOutput: '2', isHidden: true },
    ],
  },
  {
    id: 18,
    slug: 'number-of-islands',
    title: 'Number of Islands',
    difficulty: 'Medium',
    category: 'DSA',
    topic: 'Graphs',
    pattern: 'Grid DFS / BFS Connected Components',
    statement:
      'Given an m x n 2D binary grid grid which represents a map of "1"s (land) and "0"s (water), return the number of islands.\n\nAn island is surrounded by water and is formed by connecting adjacent lands horizontally or vertically. You may assume all four edges of the grid are all surrounded by water.',
    constraints: 'm == grid.length\nn == grid[i].length\n1 <= m, n <= 300\ngrid[i][j] is 0 or 1.',
    examples: [
      { input: '[[1,1,1,1,0],[1,1,0,1,0],[1,1,0,0,0],[0,0,0,0,0]]', output: '1' },
      { input: '[[1,1,0,0,0],[1,1,0,0,0],[0,0,1,0,0],[0,0,0,1,1]]', output: '3' },
    ],
    functionSignature: 'int numIslands(vector<vector<int>>& grid)',
    paramTypes: ['vector<vector<int>>'],
    returnType: 'int',
    defaultCodeStub: `class Solution {
public:
    int numIslands(vector<vector<int>>& grid) {
        // Implement your solution here
    }
};`,
    sampleTestCases: [
      { input: '[[1,1,1,1,0],[1,1,0,1,0],[1,1,0,0,0],[0,0,0,0,0]]', expectedOutput: '1' },
      { input: '[[1,1,0,0,0],[1,1,0,0,0],[0,0,1,0,0],[0,0,0,1,1]]', expectedOutput: '3' },
    ],
    hiddenTestCases: [
      { input: '[[1]]', expectedOutput: '1', isHidden: true },
      { input: '[[0]]', expectedOutput: '0', isHidden: true },
      { input: '[[1,0],[0,1]]', expectedOutput: '2', isHidden: true },
      { input: '[[1,1],[1,1]]', expectedOutput: '1', isHidden: true },
      { input: '[[0,0],[0,0]]', expectedOutput: '0', isHidden: true },
      { input: '[[1,0,1,0,1]]', expectedOutput: '3', isHidden: true },
      { input: '[[1],[0],[1],[0],[1]]', expectedOutput: '3', isHidden: true },
      { input: '[[1,1,1],[0,1,0],[1,1,1]]', expectedOutput: '1', isHidden: true },
      { input: '[[1,0,1],[0,1,0],[1,0,1]]', expectedOutput: '5', isHidden: true },
      { input: '[[0,1,0],[1,0,1],[0,1,0]]', expectedOutput: '4', isHidden: true },
    ],
  },
  {
    id: 19,
    slug: 'kth-largest-element-in-an-array',
    title: 'Kth Largest Element in an Array',
    difficulty: 'Medium',
    category: 'DSA',
    topic: 'Heap',
    pattern: 'Min-Heap / Quickselect',
    statement:
      'Given an integer array nums and an integer k, return the kth largest element in the array.\n\nNote that it is the kth largest element in the sorted order, not the kth distinct element.\n\nCan you solve it without sorting?',
    constraints: '1 <= k <= nums.length <= 10^5\n-10^4 <= nums[i] <= 10^4',
    examples: [
      { input: '[3,2,1,5,6,4] | 2', output: '5' },
      { input: '[3,2,3,1,2,4,5,5,6] | 4', output: '4' },
    ],
    functionSignature: 'int findKthLargest(vector<int>& nums, int k)',
    paramTypes: ['vector<int>', 'int'],
    returnType: 'int',
    defaultCodeStub: `class Solution {
public:
    int findKthLargest(vector<int>& nums, int k) {
        // Implement your solution here
    }
};`,
    sampleTestCases: [
      { input: '[3,2,1,5,6,4] | 2', expectedOutput: '5' },
      { input: '[3,2,3,1,2,4,5,5,6] | 4', expectedOutput: '4' },
    ],
    hiddenTestCases: [
      { input: '[1] | 1', expectedOutput: '1', isHidden: true },
      { input: '[2,1] | 1', expectedOutput: '2', isHidden: true },
      { input: '[2,1] | 2', expectedOutput: '1', isHidden: true },
      { input: '[-1,-1] | 2', expectedOutput: '-1', isHidden: true },
      { input: '[-1,2,0] | 1', expectedOutput: '2', isHidden: true },
      { input: '[-1,2,0] | 2', expectedOutput: '0', isHidden: true },
      { input: '[-1,2,0] | 3', expectedOutput: '-1', isHidden: true },
      { input: '[7,6,5,4,3,2,1] | 5', expectedOutput: '3', isHidden: true },
      { input: '[10,20,30,40,50] | 3', expectedOutput: '30', isHidden: true },
      { input: '[99,99] | 1', expectedOutput: '99', isHidden: true },
    ],
  },
  {
    id: 20,
    slug: 'lru-cache',
    title: 'LRU Cache',
    difficulty: 'Medium',
    category: 'DSA',
    topic: 'Linked List',
    pattern: 'Hash Map + Doubly-Linked List',
    statement:
      'Design a data structure that follows the constraints of a Least Recently Used (LRU) cache.\n\nImplement the LRUCache class:\n- LRUCache(int capacity) Initialize the LRU cache with positive size capacity.\n- int get(int key) Return the value of the key if the key exists, otherwise return -1.\n- void put(int key, int value) Update the value of the key if the key exists. Otherwise, add the key-value pair to the cache. If the number of keys exceeds the capacity from this operation, evict the least recently used key.\n\nThe functions get and put must each run in O(1) average time complexity.',
    constraints: '1 <= capacity <= 3000\n0 <= key <= 10^4\n0 <= value <= 10^5\nAt most 2 * 10^5 calls will be made to get and put.',
    examples: [
      {
        input: 'capacity = 2, put(1, 1), put(2, 2), get(1), put(3, 3), get(2), put(4, 4), get(1), get(3), get(4)',
        output: '[null,null,null,1,null,-1,null,-1,3,4]',
        explanation: 'LRU cache eviction order preserves most recently accessed entries.',
      },
    ],
    functionSignature: 'int testLRU(int capacity)',
    paramTypes: ['int'],
    returnType: 'int',
    defaultCodeStub: `class LRUCache {
public:
    LRUCache(int capacity) {
        // Implement initialization
    }
    
    int get(int key) {
        // Implement get
    }
    
    void put(int key, int value) {
        // Implement put
    }
};

class Solution {
public:
    int testLRU(int capacity) {
        LRUCache cache(capacity);
        cache.put(1, 10);
        cache.put(2, 20);
        return cache.get(1); // Returns 10
    }
};`,
    sampleTestCases: [
      { input: '2', expectedOutput: '10' },
      { input: '5', expectedOutput: '10' },
    ],
    hiddenTestCases: [
      { input: '1', expectedOutput: '10', isHidden: true },
      { input: '3', expectedOutput: '10', isHidden: true },
      { input: '10', expectedOutput: '10', isHidden: true },
      { input: '100', expectedOutput: '10', isHidden: true },
      { input: '1000', expectedOutput: '10', isHidden: true },
      { input: '4', expectedOutput: '10', isHidden: true },
      { input: '6', expectedOutput: '10', isHidden: true },
      { input: '7', expectedOutput: '10', isHidden: true },
      { input: '8', expectedOutput: '10', isHidden: true },
      { input: '9', expectedOutput: '10', isHidden: true },
    ],
  },
];

