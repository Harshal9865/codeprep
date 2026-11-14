import { Problem } from '../types/problem';

export interface InterviewPrepSet {
  id: string;
  title: string;
  badge: string;
  companies: string[];
  description: string;
  targetLabel: string;
  accentColor: string;
  matchProblem: (problem: Problem) => boolean;
}

function hasSlugSuffix(problem: Problem, slugs: string[]): boolean {
  const s = (problem.slug || '').toLowerCase();
  const t = (problem.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return slugs.some((target) => s === target || s.endsWith(`-${target}`) || t.includes(target));
}

const MUST_KNOW_SLUGS = [
  'two-sum',
  'contains-duplicate',
  'valid-anagram',
  'valid-palindrome',
  'best-time-to-buy-and-sell-stock',
  'maximum-subarray',
  'valid-parentheses',
  'longest-substring-without-repeating-characters',
  'merge-intervals',
  'search-in-rotated-sorted-array',
  'find-minimum-in-rotated-sorted-array',
  'number-of-islands',
  'course-schedule',
  'coin-change',
  'longest-increasing-subsequence',
  'word-break',
  'subsets',
  'kth-largest-element-in-an-array',
];

const ARRAYS_WINDOW_STACK_SLUGS = [
  'two-sum',
  'contains-duplicate',
  'trapping-rain-water',
  'longest-substring-without-repeating-characters',
  'longest-repeating-character-replacement',
  'minimum-window-substring',
  'sliding-window-maximum',
  'merge-intervals',
  'rotate-image',
  'generate-parentheses',
  'daily-temperatures',
  'largest-rectangle-in-histogram',
];

const GRAPHS_BS_DP_SLUGS = [
  'search-in-rotated-sorted-array',
  'find-minimum-in-rotated-sorted-array',
  'koko-eating-bananas',
  'kth-largest-element-in-an-array',
  'number-of-islands',
  'rotting-oranges',
  'course-schedule',
  'word-ladder',
  'detect-cycle-in-undirected-graph-gfg',
  'coin-change',
  'longest-increasing-subsequence',
  'word-break',
  'edit-distance',
  '0-1-knapsack-problem-gfg',
];

const BACKTRACKING_GREEDY_SLUGS = [
  'subsets',
  'combination-sum',
  'word-search',
  'generate-parentheses',
  'the-celebrity-problem-gfg',
  'job-sequencing-problem-gfg',
];

export const INTERVIEW_PREP_SETS: InterviewPrepSet[] = [
  {
    id: 'core-600',
    title: 'Core 600 Curriculum (#1–#600)',
    badge: 'Original 600',
    companies: ['500 DSA', '100 SQL', 'Core Set'],
    description: 'The original curated 600-problem curriculum (500 C++ DSA #1–#500 + 100 SQL #501–#600), kept separate from extended drills.',
    targetLabel: '600 Questions',
    accentColor: 'text-primary',
    matchProblem: (p) => p.id >= 1 && p.id <= 600,
  },
  {
    id: 'top-interview-classics',
    title: 'Most-Asked Company Classics',
    badge: 'Top Picks',
    companies: ['Google', 'Amazon', 'Meta', 'Microsoft'],
    description: 'High-signal coding problems covering hashing, sliding windows, graphs, binary search, and DP.',
    targetLabel: 'Must-Know Core',
    accentColor: 'text-primary',
    matchProblem: (p) => hasSlugSuffix(p, MUST_KNOW_SLUGS),
  },
  {
    id: 'arrays-window-stack',
    title: 'Arrays, Sliding Window & Stack',
    badge: 'Coding Screens',
    companies: ['Uber', 'Atlassian', 'Bloomberg', 'Adobe'],
    description: 'Two-pointer, substring frequency window, interval merging, and monotonic stack patterns.',
    targetLabel: 'Screen Prep',
    accentColor: 'text-sky-400',
    matchProblem: (p) =>
      hasSlugSuffix(p, ARRAYS_WINDOW_STACK_SLUGS) ||
      (p.category === 'DSA' &&
        (p.topic === 'Sliding Window' || p.topic === 'Stack and Queues') &&
        p.id <= 60),
  },
  {
    id: 'graphs-trees-dp',
    title: 'Graphs, Binary Search & DP Loop',
    badge: 'Onsite Focus',
    companies: ['Google', 'Stripe', 'Netflix', 'DoorDash'],
    description: 'Multi-source BFS, cycle detection, topological sort, rotated binary search, and 1D/2D DP.',
    targetLabel: 'Onsite Loop',
    accentColor: 'text-emerald-400',
    matchProblem: (p) =>
      hasSlugSuffix(p, GRAPHS_BS_DP_SLUGS) ||
      (p.category === 'DSA' && (p.topic === 'Graphs' || p.topic === '1-D Dynamic Programming') && p.id <= 125),
  },
  {
    id: 'backtracking-greedy',
    title: 'Backtracking, Heap & Greedy Picks',
    badge: 'Problem Solving',
    companies: ['Goldman Sachs', 'Flipkart', 'Oracle', 'Intuit'],
    description: 'State-space search trees, priority queues, matrix traversal, and greedy scheduling.',
    targetLabel: 'Pattern Drill',
    accentColor: 'text-amber-400',
    matchProblem: (p) =>
      hasSlugSuffix(p, BACKTRACKING_GREEDY_SLUGS) ||
      (p.category === 'DSA' &&
        (p.topic === 'Backtracking' || p.topic === 'Greedy' || p.topic === 'Heap and Priority Queue') &&
        p.id <= 140),
  },
  {
    id: 'blind75-ladder',
    title: 'Foundations 75 Ladder',
    badge: 'Full Track',
    companies: ['All Companies'],
    description: 'Progressive 75-problem foundation ladder across core interview data structures.',
    targetLabel: '75 Questions',
    accentColor: 'text-cyan-400',
    matchProblem: (p) => p.category === 'DSA' && p.id >= 1 && p.id <= 75,
  },
  {
    id: 'sql-interview-50',
    title: 'SQL Interview Top 50',
    badge: 'Database Round',
    companies: ['Meta Data', 'Amazon', 'Airbnb', 'Razorpay'],
    description: 'Aggregations, window functions, CTEs, ranking, and relational joins asked in SQL rounds.',
    targetLabel: '50 Queries',
    accentColor: 'text-sky-400',
    matchProblem: (p) => p.category === 'SQL' && p.id >= 501 && p.id <= 550,
  },
];

