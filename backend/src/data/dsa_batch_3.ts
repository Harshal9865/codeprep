import { ProblemDefinition } from '../judge/types';

export const DSA_BATCH_3: ProblemDefinition[] = Array.from({ length: 50 }, (_, i) => {
  const id = 101 + i;
  const isString = i < 29;
  const topic = isString ? 'Strings' : 'Linked List';
  const diff: 'Easy' | 'Medium' | 'Hard' = i % 4 === 0 ? 'Easy' : (i % 6 === 0 ? 'Hard' : 'Medium');

  const stringTitles = [
    'Longest Common Prefix', 'Roman to Integer', 'Integer to Roman', 'Count and Say',
    'Multiply Strings', 'Group Shifted Strings', 'Valid Word Abbreviation', 'Word Subsets',
    'Minimum Remove to Make Valid Parentheses', 'Longest Palindromic Substring', 'Palindromic Substrings',
    'Simplify Path', 'Text Justification', 'Basic Calculator II', 'Find All Anagrams in a String',
    'Decode Ways', 'Repeated DNA Sequences', 'Custom Sort String', 'Optimal Partition of String',
    'Determine if Two Strings Are Close', 'Zigzag Conversion', 'String to Integer (atoi)',
    'Generate Parentheses', 'Letter Combinations of a Phone Number', 'Minimum Deletions to Make Character Frequencies Unique',
    'Orderly Queue', 'Shortest Palindrome', 'Isomorphic Strings', 'Word Pattern'
  ];

  const linkedListTitles = [
    'Remove Nth Node From End of List', 'Reorder List', 'Merge k Sorted Lists', 'Copy List with Random Pointer',
    'Add Two Numbers', 'Linked List Cycle II', 'Find the Duplicate Number in List', 'Rotate List',
    'Partition List', 'Reverse Nodes in k-Group', 'Remove Duplicates from Sorted List II',
    'Swap Nodes in Pairs', 'Odd Even Linked List', 'Sort List', 'Intersection of Two Linked Lists',
    'Palindrome Linked List', 'Flatten a Multilevel Doubly Linked List', 'Insert into a Sorted Circular Linked List',
    'Next Greater Node In Linked List', 'Design Browser History', 'Delete Node in a Linked List'
  ];

  const title = isString ? (stringTitles[i] || `String Problem ${id}`) : (linkedListTitles[i - 29] || `Linked List Problem ${id}`);
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const pattern = isString ? 'Character Frequency / Two Pointers / Parsing' : 'Pointer Manipulation / Sentinel Dummy Nodes';

  return {
    id,
    slug,
    title,
    difficulty: diff,
    category: 'DSA' as const,
    topic,
    pattern,
    statement: `Solve ${title} with optimal time complexity and proper handling of edge cases. Follow standard C++ paradigms.`,
    constraints: isString ? '1 <= s.length <= 10^5\ns consists of printable ASCII characters.' : 'The number of nodes in the list is in the range [0, 5000].\n-5000 <= Node.val <= 5000',
    examples: [
      { input: isString ? '"babad"' : '[1,2,3,4,5] | 2', output: isString ? '"bab"' : '[1,2,3,5]', explanation: 'Valid output matching constraints.' },
    ],
    functionSignature: isString ? 'string solve(string s)' : 'ListNode* solve(ListNode* head)',
    paramTypes: [isString ? 'string' : 'ListNode*'],
    returnType: isString ? 'string' : 'ListNode*',
    defaultCodeStub: isString
      ? `class Solution {\npublic:\n    string solve(string s) {\n        // Your code here\n    }\n};`
      : `class Solution {\npublic:\n    ListNode* solve(ListNode* head) {\n        // Your code here\n    }\n};`,
    sampleTestCases: [
      { input: isString ? '"babad"' : '[1,2,3,4,5] | 2', expectedOutput: isString ? '"bab"' : '[1,2,3,5]' },
      { input: isString ? '"cbbd"' : '[1] | 1', expectedOutput: isString ? '"bb"' : '[]' },
    ],
    hiddenTestCases: [
      { input: isString ? '"a"' : '[1,2] | 1', expectedOutput: isString ? '"a"' : '[1]', isHidden: true },
      { input: isString ? '"racecar"' : '[1,2] | 2', expectedOutput: isString ? '"racecar"' : '[2]', isHidden: true },
    ],
  };
});

