import { ProblemDefinition } from '../judge/types';
import { buildBatch7ProblemSpec } from './batchProblemSpecs';

export const DSA_BATCH_7: ProblemDefinition[] = Array.from({ length: 50 }, (_, i) => {
  const id = 301 + i;
  const isGraph = i < 26;
  const topic = isGraph ? 'Graphs' : 'Backtracking';
  const pattern = isGraph ? 'Dijkstra / Disjoint Set Union / Topological Sort' : 'State-Space Exploration / Pruning';
  const diff: 'Easy' | 'Medium' | 'Hard' = i % 4 === 0 ? 'Easy' : (i % 6 === 0 ? 'Hard' : 'Medium');

  const titles = [
    // 26 Graphs
    'Network Delay Time', 'Cheapest Flights Within K Stops', 'Swim in Rising Water',
    'Reconstruct Itinerary', 'Min Cost to Connect All Points', 'Alien Dictionary',
    'Is Graph Bipartite', 'Find Eventual Safe States', 'Critical Connections in a Network',
    'Accounts Merge', 'Evaluate Division', 'Path with Maximum Probability',
    'Path with Minimum Effort', 'Parallel Courses', 'All Paths From Source to Target',
    'Keys and Rooms', 'Time Needed to Inform All Employees', 'As Far from Land as Possible',
    'Shortest Bridge', 'Number of Operations to Make Network Connected', 'Making A Large Island',
    'Find the City With the Smallest Number of Neighbors at a Threshold Distance',
    'Minimum Number of Days to Disconnect Island', 'Cut Off Trees for Golf Event',
    'Most Stones Removed with Same Row or Column', 'Bus Routes',
    // 24 Backtracking
    'Subsets', 'Subsets II', 'Combination Sum', 'Combination Sum II', 'Combination Sum III',
    'Permutations', 'Permutations II', 'Word Search', 'Word Search II',
    'Palindrome Partitioning', 'Letter Combinations of a Phone Number II', 'N-Queens',
    'N-Queens II', 'Sudoku Solver', 'Restore IP Addresses', 'Matchsticks to Square',
    'Partition to K Equal Sum Subsets', 'Split a String Into the Max Number of Unique Substrings',
    'Maximum Score Words Formed by Letters', 'Unique Paths III', 'Non-decreasing Subsequences',
    'Generate Parentheses II', 'Combinations', 'Target Sum via Backtracking'
  ];

  const title = titles[i] || `Graph / Backtracking Problem ${id}`;
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const spec = buildBatch7ProblemSpec(title, topic);

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
    functionSignature: 'bool solve(vector<vector<int>>& grid)',
    paramTypes: ['vector<vector<int>>'],
    returnType: 'bool',
    defaultCodeStub: `class Solution {\npublic:\n    bool solve(vector<vector<int>>& grid) {\n        // Your code here\n    }\n};`,
    sampleTestCases: spec.sampleTestCases,
    hiddenTestCases: spec.hiddenTestCases,
  };
});

