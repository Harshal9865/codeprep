import { ProblemDefinition } from '../judge/types';

export const DSA_BATCH_5: ProblemDefinition[] = Array.from({ length: 50 }, (_, i) => {
  const id = 201 + i;
  const isBinarySearch = i < 13;
  const topic = isBinarySearch ? 'Binary Search' : 'Trees';
  const pattern = isBinarySearch ? 'Predicate Invariant / Range Bisection' : 'DFS / BFS / Tree Recursion';
  const diff: 'Easy' | 'Medium' | 'Hard' = i % 4 === 0 ? 'Easy' : (i % 6 === 0 ? 'Hard' : 'Medium');

  const titles = [
    // 13 Binary Search
    'H-Index II', 'Heaters via Binary Search', 'Magnetic Force Between Two Balls', 'Kth Missing Positive Number',
    'Minimum Speed to Arrive on Time', 'Maximum Running Time of N Computers', 'Minimized Maximum of Products Distributed to Any Store',
    'Find in Mountain Array', 'Snapshot Array', 'Online Election', 'Random Pick with Weight',
    'Search a 2D Matrix II', 'Sqrt(x)',
    // 37 Binary Trees
    'Invert Binary Tree', 'Maximum Depth of Binary Tree', 'Diameter of Binary Tree', 'Balanced Binary Tree',
    'Same Tree', 'Subtree of Another Tree', 'Lowest Common Ancestor of a Binary Tree',
    'Binary Tree Level Order Traversal', 'Binary Tree Right Side View', 'Count Good Nodes in Binary Tree',
    'Binary Tree Maximum Path Sum', 'Serialize and Deserialize Binary Tree', 'Construct Binary Tree from Preorder and Inorder Traversal',
    'Construct Binary Tree from Inorder and Postorder Traversal', 'Populating Next Right Pointers in Each Node',
    'Flatten Binary Tree to Linked List', 'Binary Tree Zigzag Level Order Traversal', 'Path Sum',
    'Path Sum II', 'Path Sum III', 'Binary Tree Paths', 'Sum Root to Leaf Numbers',
    'Lowest Common Ancestor of Deepest Leaves', 'Maximum Width of Binary Tree', 'All Nodes Distance K in Binary Tree',
    'Vertical Order Traversal of a Binary Tree', 'Delete Nodes And Return Forest', 'Step-By-Step Directions From a Binary Tree Node to Another',
    'Cousins in Binary Tree', 'Leaf-Similar Trees', 'Find Duplicate Subtrees', 'Check Completeness of a Binary Tree',
    'Maximum Difference Between Node and Ancestor', 'Pseudo-Palindromic Paths in a Binary Tree',
    'Binary Tree Longest Consecutive Sequence', 'House Robber III', 'Trim a Binary Tree'
  ];

  const title = titles[i] || `Tree / Search Problem ${id}`;
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  return {
    id,
    slug,
    title,
    difficulty: diff,
    category: 'DSA' as const,
    topic,
    pattern,
    statement: `Solve ${title} adhering to canonical tree recursion or binary search bounds. Protect against stack overflow and null pointer dereference.`,
    constraints: 'The number of nodes or elements is in the range [1, 10^5].\n-10^4 <= val <= 10^4',
    examples: [
      { input: '[3,9,20,null,null,15,7]', output: '3', explanation: 'Maximum depth computed via bottom-up recursion.' },
    ],
    functionSignature: isBinarySearch ? 'int solve(vector<int>& nums, int target)' : 'int solve(TreeNode* root)',
    paramTypes: [isBinarySearch ? 'vector<int>' : 'TreeNode*'],
    returnType: 'int',
    defaultCodeStub: isBinarySearch
      ? `class Solution {\npublic:\n    int solve(vector<int>& nums, int target) {\n        // Your code here\n    }\n};`
      : `class Solution {\npublic:\n    int solve(TreeNode* root) {\n        // Your code here\n    }\n};`,
    sampleTestCases: [
      { input: isBinarySearch ? '[1,3,5,6] | 5' : '[3,9,20,null,null,15,7]', expectedOutput: isBinarySearch ? '2' : '3' },
      { input: isBinarySearch ? '[1,3,5,6] | 2' : '[1,null,2]', expectedOutput: isBinarySearch ? '1' : '2' },
      { input: isBinarySearch ? '[1,3,5,6] | 7' : '[1,2,3,4,5,6,7]', expectedOutput: isBinarySearch ? '4' : '3' },
    ],
    hiddenTestCases: [
      { input: isBinarySearch ? '[1] | 0' : '[]', expectedOutput: '0', isHidden: true },
      { input: isBinarySearch ? '[1,3] | 2' : '[1]', expectedOutput: '1', isHidden: true },
      { input: isBinarySearch ? '[] | 5' : '[1,2]', expectedOutput: isBinarySearch ? '0' : '2', isHidden: true },
      { input: isBinarySearch ? '[1] | 1' : '[1,2,null,3]', expectedOutput: isBinarySearch ? '0' : '3', isHidden: true },
      { input: isBinarySearch ? '[1] | 2' : '[1,null,2,null,3]', expectedOutput: isBinarySearch ? '1' : '3', isHidden: true },
      { input: isBinarySearch ? '[1,3,5,6] | 0' : '[1,2,3,4,null,null,5]', expectedOutput: isBinarySearch ? '0' : '3', isHidden: true },
      { input: isBinarySearch ? '[-10,-3,0,5,9] | -5' : '[1,2,null,3,null,4]', expectedOutput: isBinarySearch ? '1' : '4', isHidden: true },
      { input: isBinarySearch ? '[-10,-3,0,5,9] | 9' : '[1,2,3,4,5,6,7,8]', expectedOutput: '4', isHidden: true },
      { input: isBinarySearch ? '[2,4,6,8,10,12] | 11' : '[1,null,2,null,3,null,4,null,5]', expectedOutput: '5', isHidden: true },
    ],
  };
});

