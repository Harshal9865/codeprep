import { ProblemDefinition } from '../judge/types';
import { buildBatch6ProblemSpec } from './batchProblemSpecs';

export const DSA_BATCH_6: ProblemDefinition[] = Array.from({ length: 50 }, (_, i) => {
  const id = 251 + i;
  let topic = 'Binary Search Tree';
  let pattern = 'In-order Traversal Invariant';

  if (i < 3) {
    topic = 'Trees';
    pattern = 'Structural Tree Analysis';
  } else if (i >= 13 && i < 32) {
    topic = 'Heap';
    pattern = 'Priority Queue / Min-Max Heap';
  } else if (i >= 32) {
    topic = 'Graphs';
    pattern = 'Breadth-First Search / Depth-First Search';
  }

  const diff: 'Easy' | 'Medium' | 'Hard' = i % 4 === 0 ? 'Easy' : (i % 6 === 0 ? 'Hard' : 'Medium');

  const titles = [
    // 3 Trees
    'Count Complete Tree Nodes', 'Binary Tree Inorder Traversal', 'Binary Tree Postorder Traversal',
    // 10 BST
    'Validate Binary Search Tree', 'Kth Smallest Element in a BST', 'Lowest Common Ancestor of a BST',
    'Insert into a Binary Search Tree', 'Delete Node in a BST', 'Convert Sorted Array to Binary Search Tree',
    'Search in a Binary Search Tree', 'Two Sum IV - Input is a BST', 'Recover Binary Search Tree', 'Range Sum of BST',
    // 19 Heap
    'Last Stone Weight', 'Kth Largest Element in a Stream', 'Top K Frequent Words',
    'Find Median from Data Stream', 'Merge k Sorted Lists via Min-Heap', 'Reorganize String',
    'Task Scheduler', 'K Closest Points to Origin', 'Seat Reservation Manager',
    'Single-Threaded CPU', 'Process Tasks Using Servers', 'Maximum Subsequence Score',
    'Design Twitter', 'Ugly Number II', 'Super Ugly Number', 'Find K Pairs with Smallest Sums',
    'Sort Characters By Frequency', 'Furthest Building You Can Reach', 'Constrained Subsequence Sum',
    // 18 Graphs
    'Max Area of Island', 'Clone Graph', 'Pacific Atlantic Water Flow', 'Surrounded Regions',
    'Rotting Oranges', 'Walls and Gates', 'Course Schedule', 'Course Schedule II',
    'Graph Valid Tree', 'Number of Connected Components in an Undirected Graph', 'Redundant Connection',
    'Word Ladder', 'Word Ladder II', 'Minimum Knight Moves', 'Shortest Path in Binary Matrix',
    'Open the Lock', 'Snakes and Ladders', '01 Matrix'
  ];

  const title = titles[i] || `Heap / Graph Problem ${id}`;
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const spec = buildBatch6ProblemSpec(title, topic);

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

