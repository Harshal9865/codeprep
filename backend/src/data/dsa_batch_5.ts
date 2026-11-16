import { ProblemDefinition } from '../judge/types';
import { buildBatch5ProblemSpec } from './batchProblemSpecs';

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
  const spec = buildBatch5ProblemSpec(title, isBinarySearch);

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
    functionSignature: isBinarySearch ? 'int solve(vector<int>& nums, int target)' : 'int solve(TreeNode* root)',
    paramTypes: [isBinarySearch ? 'vector<int>' : 'TreeNode*'],
    returnType: 'int',
    defaultCodeStub: isBinarySearch
      ? `class Solution {\npublic:\n    int solve(vector<int>& nums, int target) {\n        // Your code here\n    }\n};`
      : `class Solution {\npublic:\n    int solve(TreeNode* root) {\n        // Your code here\n    }\n};`,
    sampleTestCases: spec.sampleTestCases,
    hiddenTestCases: spec.hiddenTestCases,
  };
});

