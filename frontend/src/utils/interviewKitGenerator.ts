export type InterviewQuizCategory =
  | 'DSA Pattern & Complexity'
  | 'C++17 & Output Traps'
  | 'SQL & Query Internals'
  | 'OS & Concurrency'
  | 'DBMS & Indexing'
  | 'Networks & Security'
  | 'System Design & Scale';

export const INTERVIEW_QUIZ_CATEGORIES: InterviewQuizCategory[] = [
  'DSA Pattern & Complexity',
  'C++17 & Output Traps',
  'SQL & Query Internals',
  'OS & Concurrency',
  'DBMS & Indexing',
  'Networks & Security',
  'System Design & Scale',
];

export type InterviewDifficulty = 'Easy' | 'Medium' | 'Hard';

export interface GeneratedInterviewQuestion {
  id: string;
  category: InterviewQuizCategory;
  subtopic: string;
  difficulty: InterviewDifficulty;
  askedIn: string;
  question: string;
  codeSnippet?: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  shortcutTip: string;
}

let seqCounter = 1;

function nextId(prefix: string): string {
  seqCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${seqCounter}-${Math.floor(Math.random() * 1000)}`;
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: readonly T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildOptions(
  correct: string,
  distractors: string[]
): { options: string[]; correctIndex: number } {
  const unique = new Set<string>([correct]);
  for (const d of distractors) {
    if (unique.size >= 4) break;
    if (d && d !== correct) unique.add(d);
  }
  let idx = 1;
  while (unique.size < 4) {
    unique.add(`Alternative ${idx++}`);
  }
  const options = shuffle(Array.from(unique).slice(0, 4));
  return {
    options,
    correctIndex: options.indexOf(correct),
  };
}

interface StaticBankItem {
  subtopic: string;
  difficulty: InterviewDifficulty;
  askedIn: string;
  question: string;
  codeSnippet?: string;
  correct: string;
  distractors: string[];
  explanation: string;
  shortcutTip: string;
}

function fromBank(
  prefix: string,
  category: InterviewQuizCategory,
  item: StaticBankItem
): GeneratedInterviewQuestion {
  const { options, correctIndex } = buildOptions(item.correct, item.distractors);
  return {
    id: nextId(prefix),
    category,
    subtopic: item.subtopic,
    difficulty: item.difficulty,
    askedIn: item.askedIn,
    question: item.question,
    codeSnippet: item.codeSnippet,
    options,
    correctIndex,
    explanation: item.explanation,
    shortcutTip: item.shortcutTip,
  };
}

/* -------------------------------------------------------------------------- */
/* 1. DSA PATTERN & COMPLEXITY (4 Procedural + 12 Deep Curated = 16 pools)    */
/* -------------------------------------------------------------------------- */

const DSA_BANK: StaticBankItem[] = [
  {
    subtopic: 'Prefix Sum vs Sliding Window',
    difficulty: 'Medium',
    askedIn: 'Amazon • Google',
    question: 'You must count contiguous subarrays summing to K in an array containing POSITIVE, ZERO, and NEGATIVE integers. Why does standard two-pointer Sliding Window fail?',
    correct: 'Negative numbers break monotonicity — shrinking or expanding the window no longer moves the sum predictably',
    distractors: [
      'Sliding Window cannot handle K = 0 even with positive numbers',
      'Two pointers only works on sorted arrays or linked lists',
      'Sliding Window requires O(N log N) preprocessing first',
    ],
    explanation: 'Sliding Window relies on window sum increasing on expansion and decreasing on shrink. With negatives, extending right can decrease the sum. Prefix Sum + HashMap (`freq[pref - k]`) solves arbitrary integers in O(N).',
    shortcutTip: 'Positive-only subarray target -> Sliding Window (O(1) space). Contains negatives -> Prefix Sum + HashMap (`freq[0] = 1`).',
  },
  {
    subtopic: 'Monotonic Stack',
    difficulty: 'Medium',
    askedIn: 'Atlassian • Microsoft',
    question: 'Why do Monotonic Stack templates (Next Greater Element / Largest Rectangle in Histogram) push array INDICES onto the stack instead of values?',
    correct: 'Indices give both the value a[st.top()] AND the width/distance (i - st.top() - 1) in O(1)',
    distractors: [
      'C++ std::stack cannot hold negative integers cleanly',
      'Pushing indices prevents stack overflow on sorted arrays',
      'It reduces amortized time from O(N log N) to O(N)',
    ],
    explanation: 'Storing indices lets you compare values via `a[st.top()]` AND compute rectangle widths/distances (`i - prev_smaller - 1`) without storing pairs.',
    shortcutTip: 'In histogram/span problems, store indices on the stack and push sentinel boundaries (or flush at `i == n`).',
  },
  {
    subtopic: '0/1 vs Unbounded Knapsack',
    difficulty: 'Medium',
    askedIn: 'Adobe • Flipkart',
    question: 'In 1D space-optimized 0/1 Knapsack (`dp[c]`), why MUST capacity `c` iterate BACKWARDS from `W` down to `wt[i]`?',
    correct: 'To guarantee each item is used at most once instead of reusing updated dp[c - wt[i]] from the same row',
    distractors: [
      'To improve CPU cache prefetching on x86 architectures',
      'Forward iteration skips base case dp[0] = 0',
      'Backward iteration reduces time complexity from O(N·W) to O(N log W)',
    ],
    explanation: 'Iterating backwards reads `dp[c - wt[i]]` from the PREVIOUS item’s state before overwriting it. Forward iteration lets the current item be picked multiple times (Unbounded Knapsack / Coin Change).',
    shortcutTip: '0/1 Knapsack -> capacity loop BACKWARDS. Unbounded / Coin Change -> capacity loop FORWARDS.',
  },
  {
    subtopic: '0-1 BFS (Deque)',
    difficulty: 'Medium',
    askedIn: 'Uber • Google',
    question: 'In a graph where every edge weight is strictly either 0 or 1, what finds shortest paths faster than standard Dijkstra O((V + E) log V)?',
    correct: '0-1 BFS using a std::deque in O(V + E): push_front for weight 0, push_back for weight 1',
    distractors: [
      'Bellman-Ford in O(V · E)',
      'Standard DFS with a boolean visited array in O(V + E)',
      'Kahn’s Topological Sort on cyclic graphs',
    ],
    explanation: 'A double-ended queue preserves monotonic distance ordering without a heap. Weight-0 neighbors stay at the front; weight-1 neighbors append at the back.',
    shortcutTip: 'Unweighted -> Queue BFS. {0,1} weights -> Deque 0-1 BFS. Arbitrary non-negative weights -> Min-Heap Dijkstra.',
  },
  {
    subtopic: 'Union-Find (DSU)',
    difficulty: 'Medium',
    askedIn: 'Meta • Bloomberg',
    question: 'In Disjoint Set Union (Union-Find) using Path Compression + Union by Size, what happens if `unite(a, b)` forgets `if (a == b) return false;` before updating `sz[a] += sz[b]`?',
    correct: 'Merging an element with its own root DOUBLES sz[a] erroneously and can create a self-parent bug if rank logic isn’t guarded',
    distractors: [
      'Path compression stops working for all future find() calls',
      'Time complexity degrades from O(α(N)) to O(N^2)',
      'Unions across distinct components throw an exception',
    ],
    explanation: 'After `a = find(a); b = find(b);`, if they are already in the same component (`a == b`), continuing to add `sz[a] += sz[b]` adds the component size to itself!',
    shortcutTip: 'ALWAYS write `if (a == b) return false;` immediately after finding both roots — it also directly tells you whether an undirected edge forms a cycle!',
  },
  {
    subtopic: 'Dijkstra Stale Entries',
    difficulty: 'Medium',
    askedIn: 'Amazon • DoorDash',
    question: 'In C++ Dijkstra with `priority_queue`, we push `{new_dist, v}` whenever relaxing an edge (since C++ PQ lacks decrease-key). What happens if you omit `if (d > dist[u]) continue;` upon popping?',
    correct: 'Stale outdated entries still re-scan all outgoing edges of u, degrading performance from O(E log V) to O(V·E)',
    distractors: [
      'Dijkstra returns wrong shortest paths on positive-weight DAGs',
      'The priority_queue throws a duplicate key compilation error',
      'Negative weights become supported automatically',
    ],
    explanation: 'Skipping stale popped distances prevents relaxing `adj[u]` multiple times for suboptimal paths pushed earlier.',
    shortcutTip: 'Write `if (d > dist[u]) continue;` right after `pq.pop()` in every Dijkstra implementation.',
  },
  {
    subtopic: 'Binary Search on Answer',
    difficulty: 'Medium',
    askedIn: 'Google • ByteDance',
    question: 'Problems asking "Minimize the maximum load across K partitions" (e.g., Koko Eating Bananas / Painter’s Partition) typically map to which technique?',
    correct: 'Binary Search on the Answer Space paired with an O(N) greedy feasibility predicate',
    distractors: [
      'Sliding Window of fixed size K',
      'Floyd-Warshall All-Pairs Shortest Path',
      'Sorting and picking the K-th element directly',
    ],
    explanation: 'Whenever feasibility `canSolve(mid)` is monotonic (false..false, true..true), binary searching `[minAns, maxAns]` finds the exact minimum feasible answer in O(N log(Range)).',
    shortcutTip: 'Keywords "minimize the maximum" or "maximize the minimum" almost always signal Binary Search on Answer!',
  },
  {
    subtopic: 'Cycle Detection Math',
    difficulty: 'Medium',
    askedIn: 'Microsoft • Apple',
    question: 'In Floyd’s Tortoise & Hare cycle detection on a linked list, once `slow` and `fast` collide inside the loop, why do we reset one pointer to `head` and move BOTH 1 step at a time?',
    correct: 'Distance from head to cycle entry equals distance (mod cycle length) from meeting point to cycle entry, so they meet at the cycle start',
    distractors: [
      'To measure the total number of nodes in the linked list',
      'Because moving fast at 2x speed skips the head node',
      'To reverse the linked list in-place simultaneously',
    ],
    explanation: 'Algebraically: `2(L + x) = L + x + kC` => `L = kC - x = (k-1)C + (C - x)`. Thus walking `L` steps from `head` and `C - x` steps from collision meets right at the cycle entry!',
    shortcutTip: 'Remember `Find Duplicate Number (N+1 array in 1..N, O(1) space)` is literally disguised Floyd’s Cycle Detection (`nums[i]` as `next`)!',
  },
  {
    subtopic: 'Tree Diameter / Max Path Sum',
    difficulty: 'Hard',
    askedIn: 'Meta • Google',
    question: 'In Binary Tree Maximum Path Sum (recursive post-order DFS), why must `dfs(node)` return `node->val + max({0, left, right})` even after updating `globalAns` with `node->val + left + right`?',
    correct: 'A valid path returned to the parent can only extend ONE downward branch (not split through both left and right children)',
    distractors: [
      'Returning both branches causes integer overflow on deep trees',
      'Because left and right subtrees share the same parent pointer',
      'Post-order traversal visits the root before children',
    ],
    explanation: 'A path cannot fork inside an ancestor (`V` shape + parent edge is invalid). You update the global `V`-shaped candidate locally, then pass up only the single best linear arm.',
    shortcutTip: 'Clamp negative child contributions with `max(0, dfs(child))` so negative branches are cleanly skipped!',
  },
  {
    subtopic: 'Submask Enumeration Complexity',
    difficulty: 'Hard',
    askedIn: 'Competitive • Google',
    question: 'What is the exact total time complexity of iterating through every subset of every bitmask for N items using `for (int sub = m; sub; sub = (sub - 1) & m)`?',
    correct: 'O(3^N) — every element is either not in m, in m\\sub, or in sub (3 choices per bit)',
    distractors: [
      'O(4^N) because two nested loops each run 2^N times',
      'O(N · 2^N)',
      'O(N!)',
    ],
    explanation: 'Sum over k=0..N of `C(N, k) * 2^k` equals `(1 + 2)^N = 3^N` by the Binomial Theorem — fast up to N ≈ 14–16!',
    shortcutTip: '`N <= 15` partitioning / SOS / submask DP -> `O(3^N)` (~14M ops) fits cleanly in 1s!',
  },
  {
    subtopic: 'Kahn’s Algorithm & Cycles',
    difficulty: 'Easy',
    askedIn: 'Amazon • Intuit',
    question: 'How does Kahn’s BFS Topological Sort detect that a directed graph contains a cycle (making a valid ordering impossible)?',
    correct: 'Fewer than V vertices ever reach in-degree 0 and get processed into the result array',
    distractors: [
      'Any node appears in the queue twice during traversal',
      'The starting queue has more than one vertex with in-degree 0',
      'A vertex has out-degree equal to 0',
    ],
    explanation: 'Nodes inside or reachable from a directed cycle always keep `indeg[v] >= 1`, so BFS finishes early with `order.size() < V`.',
    shortcutTip: 'Kahn’s BFS checks cycles cleanly with zero recursion-stack `0/1/2` coloring!',
  },
  {
    subtopic: 'QuickSelect Complexity',
    difficulty: 'Medium',
    askedIn: 'Meta • Stripe',
    question: 'What are the Average and Worst-Case time complexities of `std::nth_element` / QuickSelect to find the K-th smallest element in an unsorted array?',
    correct: 'Average O(N) (with random pivot / Introselect), Worst-case O(N^2) on pathological pivot choices',
    distractors: [
      'Average O(N log N), Worst-case O(N log N)',
      'Average O(K log N), Worst-case O(N log K)',
      'Strictly O(log N) average and worst-case',
    ],
    explanation: 'Partitioning recurses into only ONE side: `N + N/2 + N/4 + ... = 2N = O(N)` expected time (GCC `std::nth_element` uses Introselect fallback for guaranteed O(N) worst-case too!).',
    shortcutTip: 'Static array K-th element -> QuickSelect `O(N)`. Streaming data -> Min-Heap `O(N log K)`.',
  },
];

function genDsaQuestion(): GeneratedInterviewQuestion {
  const roll = randInt(0, 15);

  if (roll === 0) {
    const tiers = [
      {
        n: pick(['N <= 10', 'N <= 11', 'N <= 12']),
        ans: 'O(N!) or O(2^N) (Backtracking / Permutations)',
        wrong: ['O(N^3) minimum', 'Strictly O(log N)', 'Must be O(N) greedy'],
        why: 'Under 10^8 ops/sec, N <= 12 comfortably permits factorial/exponential searches.',
      },
      {
        n: pick(['N <= 18', 'N <= 20', 'N <= 21']),
        ans: 'O(N · 2^N) (Bitmask DP / Meet-in-the-Middle)',
        wrong: ['O(N!) is still safe', 'Requires O(log N)', 'O(N^4) only'],
        why: '20 * 2^20 ≈ 2 × 10^7 ops, safely under a 1-second limit; N! exceeds 10^18.',
      },
      {
        n: pick(['N <= 400', 'N <= 500', 'N <= 800']),
        ans: 'O(N^2) or O(N^3) for N <= 400 (2D DP / Floyd-Warshall)',
        wrong: ['Only O(1) passes', 'Requires O(2^N)', 'O(N^4) passes easily'],
        why: '500^2 = 2.5×10^5 and 400^3 = 6.4×10^7, fitting comfortably within ~10^8 ops/s.',
      },
      {
        n: pick(['N <= 10^5', 'N <= 2·10^5', 'N <= 5·10^5']),
        ans: 'O(N log N) or O(N) (Sort / Heap / Two Pointers)',
        wrong: ['O(N^2) nested loops', 'O(2^N) recursion', 'O(N^3) Floyd-Warshall'],
        why: 'At N = 10^5, N^2 is 10^10 ops (~100s TLE), whereas N log N (~1.7×10^6 ops) passes easily.',
      },
      {
        n: pick(['N <= 10^9', 'N <= 10^12', 'N <= 10^18']),
        ans: 'O(log N) or O(1) (Binary Search on Answer / Math)',
        wrong: ['O(N) single pass loop', 'O(N log N) sorting', 'O(N^2) DP table'],
        why: 'Even a single O(N) loop over 10^9–10^18 times out (>10s); O(log N) or O(1) math is mandatory.',
      },
    ];
    const t = pick(tiers);
    const { options, correctIndex } = buildOptions(t.ans, t.wrong);
    return {
      id: nextId('dsa'),
      category: 'DSA Pattern & Complexity',
      subtopic: 'Constraint Analysis',
      difficulty: 'Easy',
      askedIn: 'Google • Amazon • Codeforces',
      question: `An online assessment gives constraint ${t.n} with a 1-second time limit (~10^8 ops/sec). What is the tightest acceptable time complexity you should target?`,
      options,
      correctIndex,
      explanation: t.why,
      shortcutTip: 'Always read input constraints FIRST before designing your solution — constraints tell you the target Big-O!',
    };
  }

  if (roll === 1) {
    const n = pick([100000, 1000000]);
    const k = pick([8, 16, 32, 64]);
    const wantSmallest = randInt(0, 1) === 0;
    const heapKind = wantSmallest ? 'Max-Heap' : 'Min-Heap';
    const wrongHeap = wantSmallest ? 'Min-Heap' : 'Max-Heap';
    const targetWord = wantSmallest ? 'SMALLEST' : 'LARGEST';
    const ans = `O(N log K) time, O(K) space — using a ${heapKind} of size ${k}`;
    const { options, correctIndex } = buildOptions(ans, [
      `O(N log N) using a ${wrongHeap} of size ${k}`,
      `O(K log N) without reading all N elements`,
      `O(N^2) using bubble partition`,
    ]);
    return {
      id: nextId('dsa'),
      category: 'DSA Pattern & Complexity',
      subtopic: 'Top-K Priority Queue',
      difficulty: 'Medium',
      askedIn: 'Meta • Microsoft • Uber',
      question: `Find the ${k} ${targetWord} numbers from an unsorted stream of N = ${n.toLocaleString()} integers using minimal extra memory. Which approach is optimal?`,
      options,
      correctIndex,
      explanation: `Maintain a ${heapKind} of size ${k}. Whenever a better element arrives, pop the boundary element in top() and push the new value. Complexity stays O(N log ${k}) time and O(${k}) memory.`,
      shortcutTip: 'Top-K LARGEST -> MIN-heap. Top-K SMALLEST -> MAX-heap!',
    };
  }

  if (roll === 2) {
    const cases = [
      { rec: 'T(n) = 2·T(n/2) + O(n)', ans: 'O(n log n)', wrong: ['O(n)', 'O(n^2)', 'O(log n)'], why: 'Case 2 of Master Theorem (log_2(2) = 1 matches n^1): Merge Sort / Divide & Conquer = O(n log n).' },
      { rec: 'T(n) = 2·T(n/2) + O(1)', ans: 'O(n)', wrong: ['O(n log n)', 'O(log n)', 'O(n^2)'], why: 'Case 1 of Master Theorem: work is dominated by O(n) leaves, e.g., Segment Tree build or tree traversal = O(n).' },
      { rec: 'T(n) = T(n - 1) + O(n)', ans: 'O(n^2)', wrong: ['O(n log n)', 'O(n)', 'O(2^n)'], why: 'Sums 1 + 2 + ... + n = n(n+1)/2 = O(n^2).' },
      { rec: 'T(n) = T(n / 2) + O(1)', ans: 'O(log n)', wrong: ['O(n)', 'O(n log n)', 'O(1)'], why: 'Halves the problem at each step with constant work: classic Binary Search = O(log n).' },
      { rec: 'T(n) = 2·T(n - 1) + O(1)', ans: 'O(2^n)', wrong: ['O(n^2)', 'O(n!)', 'O(n log n)'], why: 'Branches twice at every level of depth n (naive recursive Fibonacci) = O(2^n).' },
    ];
    const c = pick(cases);
    const { options, correctIndex } = buildOptions(c.ans, c.wrong);
    return {
      id: nextId('dsa'),
      category: 'DSA Pattern & Complexity',
      subtopic: 'Recurrence & Master Theorem',
      difficulty: 'Medium',
      askedIn: 'Google • Microsoft • Algorithms',
      question: `What is the tight Big-O solution for the recurrence relation \`${c.rec}\`?`,
      options,
      correctIndex,
      explanation: c.why,
      shortcutTip: 'Compare leaf work n^(log_b a) against root work f(n): bigger one wins, tie multiplies by log n!',
    };
  }

  if (roll === 3) {
    const v = pick([200, 500, 1000]);
    const ans = `Floyd-Warshall O(V^3) ≈ ${(v ** 3 / 1_000_000).toFixed(0)}M ops (All-Pairs) OR Adjacency Matrix O(V^2)`;
    const { options, correctIndex } = buildOptions(ans, [
      'Running V separate Bellman-Ford passes in O(V^2 · E) with E ≈ V^2',
      'DFS from every node ignoring edge weights',
      'Topological Sort since dense graphs cannot have cycles',
    ]);
    return {
      id: nextId('dsa'),
      category: 'DSA Pattern & Complexity',
      subtopic: 'Dense Graph Trade-off',
      difficulty: 'Medium',
      askedIn: 'Uber • Graph Systems',
      question: `You have a DENSE directed weighted graph (possibly negative edges, no negative cycles) with V = ${v} vertices and E ≈ V^2 edges, needing shortest paths between ALL pairs of vertices. Which algorithm is cleanest & fastest?`,
      options,
      correctIndex,
      explanation: `With V = ${v}, Floyd-Warshall runs cleanly in 4 lines at O(V^3) (supporting negative edges cleanly!), whereas running V×Bellman-Ford would take O(V^2·E) = O(V^4)!`,
      shortcutTip: 'V <= 400–500 + All-Pairs + negative edges -> Floyd-Warshall O(V^3) beats V runs of Dijkstra/Bellman-Ford!',
    };
  }

  return fromBank('dsa', 'DSA Pattern & Complexity', pick(DSA_BANK));
}

/* -------------------------------------------------------------------------- */
/* 2. C++17 & OUTPUT TRAPS (4 Procedural + 11 Deep Curated = 15 pools)        */
/* -------------------------------------------------------------------------- */

const CPP_BANK: StaticBankItem[] = [
  {
    subtopic: 'Unsigned Underflow Bug',
    difficulty: 'Medium',
    askedIn: 'Amazon • Qualcomm',
    question: 'What happens when `vector<int> v;` is EMPTY and this loop executes?',
    codeSnippet: `for (int i = 0; i <= v.size() - 1; ++i) {\n  process(v[i]);\n}`,
    correct: 'Out-of-bounds loop crash because `v.size() - 1` underflows unsigned size_t to ~1.84 × 10^19',
    distractors: [
      'Loop executes 0 times safely because `0 <= -1` is false',
      'Compiler throws `std::out_of_range` exception cleanly',
      'Loop executes once with `i = 0`',
    ],
    explanation: '`v.size()` returns unsigned `size_t`. When empty, `0ULL - 1` wraps to `SIZE_MAX`, making `i <= SIZE_MAX` true and causing immediate segfault/UB!',
    shortcutTip: 'Write `i < (int)v.size() - 1` or `i + 1 < v.size()` — never subtract 1 from unsigned `.size()`.',
  },
  {
    subtopic: 'Polymorphism & Destructors',
    difficulty: 'Medium',
    askedIn: 'Adobe • Morgan Stanley',
    question: 'What bug occurs if `Base` has virtual methods, `Derived` allocates heap memory, and `~Base()` is NOT marked `virtual`?',
    codeSnippet: `Base* ptr = new Derived();\ndelete ptr; // ~Base() is non-virtual`,
    correct: 'Only ~Base() runs — ~Derived() is skipped (Undefined Behavior & memory leak)',
    distractors: [
      'Compiler automatically makes ~Base() virtual when another virtual method exists',
      'Both ~Derived() and ~Base() still run via RTTI',
      'Compilation error: deleting incomplete polymorphic type',
    ],
    explanation: 'Non-virtual destructor dispatch is static based on pointer type (`Base*`). Marking `virtual ~Base() = default;` ensures vtable dispatch invokes `~Derived()` first.',
    shortcutTip: 'Any base class intended for polymorphic `Base*` ownership MUST declare a virtual destructor.',
  },
  {
    subtopic: 'STL Performance Trap',
    difficulty: 'Medium',
    askedIn: 'Google • Codeforces',
    question: 'You have `std::set<int> s` of size N = 10^5. Why does `std::lower_bound(s.begin(), s.end(), x)` risk TLE compared to `s.lower_bound(x)`?',
    correct: 'std::set iterators are bidirectional (not random access), so std::lower_bound advances step-by-step in O(N)!',
    distractors: [
      'std::lower_bound locks internal mutexes on red-black tree nodes',
      's.lower_bound(x) caches previous lookups in a hash map',
      'std::lower_bound copies the entire set into a vector first',
    ],
    explanation: 'Free `std::lower_bound` calls `std::advance` linearly on non-random-access iterators, degrading O(log N) to O(N).',
    shortcutTip: 'On `set` / `map` / `multiset`, ALWAYS use member `.lower_bound(x)` instead of `std::lower_bound`!',
  },
  {
    subtopic: 'Smart Pointers Internals',
    difficulty: 'Easy',
    askedIn: 'C++ Core • Nvidia',
    question: 'Why should you prefer `auto p = make_shared<User>(args);` over `shared_ptr<User> p(new User(args));`?',
    correct: 'make_shared performs 1 combined heap allocation for both User and the reference-count control block',
    distractors: [
      'make_shared uses stack memory instead of heap memory',
      'new User() cannot invoke constructors inside shared_ptr',
      'make_shared eliminates circular reference leaks without weak_ptr',
    ],
    explanation: '`shared_ptr(new T)` does 2 separate heap allocations (User + control block). `make_shared` fuses them into 1 cache-friendly allocation and prevents exception-leak hazards.',
    shortcutTip: 'Still use `weak_ptr` for back-edges/observers to avoid reference cycles!',
  },
  {
    subtopic: 'std::move & Copy Elision Trap',
    difficulty: 'Hard',
    askedIn: 'CppCon • Bloomberg • Nvidia',
    question: 'Why is `return std::move(localVec);` considered an anti-pattern when returning a local variable by value in C++17?',
    codeSnippet: `vector<int> build() {\n  vector<int> res(1000);\n  return std::move(res); // WHY IS THIS WORSE?\n}`,
    correct: 'std::move forces a move-construction instead of allowing RVO/NRVO zero-copy construction directly in the caller’s slot',
    distractors: [
      'Calling std::move on local variables causes dangling references immediately',
      'It forces a deep O(N) copy instead of O(1) move',
      'C++17 rejects std::move inside return statements at compile time',
    ],
    explanation: 'Without `std::move`, C++ constructs `res` directly into the caller’s return storage (NRVO — zero moves!). `std::move(res)` turns it into an xvalue, blocking NRVO.',
    shortcutTip: 'Simply write `return res;` — C++ automatically moves if NRVO can’t apply anyway!',
  },
  {
    subtopic: 'Priority Queue Comparator',
    difficulty: 'Medium',
    askedIn: 'Amazon • LeetCode',
    question: 'In a C++ custom comparator `cmp(a, b)` for `std::priority_queue`, what does returning `true` mean compared to `std::sort`?',
    correct: 'In priority_queue, `cmp(a, b) == true` means `a` has LOWER priority (placed BELOW `b`), opposite of sort’s intuition',
    distractors: [
      'In priority_queue, `true` puts `a` at `top()` immediately',
      'priority_queue uses identical ordering direction to std::sort',
      'priority_queue requires comparators to return `-1, 0, +1` like C qsort',
    ],
    explanation: '`less<T>` (`a < b`) produces a MAX-heap (larger elements float to `top()`). Therefore `a.cost > b.cost` produces a MIN-heap!',
    shortcutTip: 'Remember: `priority_queue` asks "should `a` come BEFORE `b` in sorted array, leaving `b` on top?" -> `>` makes Min-Heap!',
  },
  {
    subtopic: 'Comparator Strict Weak Ordering',
    difficulty: 'Medium',
    askedIn: 'Qualcomm • Quant • Codeforces',
    question: 'What catastrophic bug happens if a `std::sort` comparator returns `return a <= b;` instead of `return a < b;` when duplicates exist?',
    correct: 'Violates strict weak ordering (irreflexivity), causing std::sort to walk past array bounds and segfault!',
    distractors: [
      'std::sort silently reverses the sorted array descending',
      'std::sort switches cleanly from QuickSort to MergeSort',
      'Only the first duplicate is dropped from the vector',
    ],
    explanation: 'When comparing an element against itself (or equal elements), `cmp(x, x)` MUST return `false`. Returning `true` traps Introsort partitions past memory boundaries.',
    shortcutTip: 'A comparator MUST satisfy `cmp(x, x) == false` — NEVER use `<=` or `>=`!',
  },
  {
    subtopic: 'std::map operator[] Side Effect',
    difficulty: 'Easy',
    askedIn: 'Microsoft • C++',
    question: 'What unexpected behavior occurs when checking presence via `if (mp[key] == 0)` on a `std::unordered_map<int, int>`?',
    correct: 'operator[] SILENTLY INSERTS `{key, 0}` if `key` didn’t exist — growing map size and breaking loops/const refs!',
    distractors: [
      'operator[] throws std::out_of_range when missing',
      'operator[] returns -1 without inserting anything',
      'It fails to compile unless key is an integer',
    ],
    explanation: 'Unlike `.find(key)` or `.count(key)` (or `.contains()` in C++20), `mp[key]` default-constructs and inserts missing keys.',
    shortcutTip: 'Always read with `mp.find(key) != mp.end()` or `.count(key)`, never `mp[key]` when you don’t want insertion!',
  },
  {
    subtopic: 'Vector Move Exception Safety',
    difficulty: 'Hard',
    askedIn: 'Jane Street • Quant C++',
    question: 'Why does `std::vector` copy elements during reallocation instead of moving them if your class’s move constructor is NOT marked `noexcept`?',
    correct: 'To uphold strong exception safety: if a throwing move fails midway, the old buffer would already be partially destroyed',
    distractors: [
      'Because std::vector never calls move constructors on user-defined classes',
      'Only std::deque uses noexcept move constructors',
      'Without noexcept, sizeof(T) increases by 16 bytes',
    ],
    explanation: '`std::move_if_noexcept` checks `is_nothrow_move_constructible` — only `noexcept` move constructors guarantee reallocation can’t corrupt state mid-flight.',
    shortcutTip: 'Always mark custom Move Constructor & Move Assignment `noexcept`!',
  },
  {
    subtopic: 'String Concatenation in Loops',
    difficulty: 'Easy',
    askedIn: 'Amazon • Meta',
    question: 'Why can `ans = ans + ch;` inside an `N = 10^5` character loop cause TLE, whereas `ans += ch;` passes in milliseconds?',
    correct: '`ans = ans + ch` allocates and copies the entire string each step -> O(N^2), whereas `ans += ch` mutates in-place in O(1) amortized',
    distractors: [
      '`+` triggers UTF-8 validation on every iteration',
      '`+=` allocates strings on the CPU stack instead of heap',
      'In C++, `+` operator only works on C-style `char*` pointers',
    ],
    explanation: 'Binary `+` constructs a brand new `std::string` copy on every iteration (`1 + 2 + ... + N = O(N^2)`). `+=` and `.push_back()` reuse exponential buffer capacity.',
    shortcutTip: 'Prefer `ans += ch;` or `ans.push_back(ch);` inside all loops!',
  },
  {
    subtopic: 'vtable & Virtual Call Cost',
    difficulty: 'Medium',
    askedIn: 'Nvidia • Adobe',
    question: 'How does C++ resolve a virtual function call `shape->area()` at runtime, and what memory overhead does each object pay?',
    correct: 'Each polymorphic object embeds 1 hidden `vptr` (8 bytes on 64-bit) pointing to its class’s static `vtable` array of function pointers',
    distractors: [
      'Every object copies the entire vtable array of function pointers inside its own memory',
      'Virtual calls look up method names in a global hash table by string',
      'Polymorphic objects store zero hidden pointers via compile-time reflection',
    ],
    explanation: 'The compiler emits ONE static `vtable` per polymorphic class, and each instance stores one `vptr` pointer resolved via `obj->vptr[slot](obj)`.',
    shortcutTip: 'Also remember: NEVER call virtual functions inside constructors/destructors expecting Derived overrides — dynamic type is Base during Base ctor!',
  },
];

function genCppQuestion(): GeneratedInterviewQuestion {
  const roll = randInt(0, 14);

  if (roll === 0) {
    const a = randInt(3, 9);
    const b = randInt(2, 6);
    const ans = `${a + b}`;
    const { options, correctIndex } = buildOptions(ans, [
      `${a * 2}`,
      `${a}`,
      'Undefined behavior / compile error',
    ]);
    return {
      id: nextId('cpp'),
      category: 'C++17 & Output Traps',
      subtopic: 'Lambda Reference Aliasing',
      difficulty: 'Easy',
      askedIn: 'Microsoft • Nvidia',
      question: 'What does this C++17 snippet print?',
      codeSnippet: `int x = ${a};\nauto& r = x;\nauto fn = [&, b = ${b}]() mutable { r += b; return x; };\ncout << fn();`,
      options,
      correctIndex,
      explanation: '`r` aliases `x` and is captured by reference via `[&]`. Calling `fn()` increments `x` by `b` and returns `x` = ' + ans + '.',
      shortcutTip: 'Notice returning `x` reflects mutation through `r` because both alias the exact same variable!',
    };
  }

  if (roll === 1) {
    const len = pick([5, 6, 8, 10]);
    const ans = `${len * 4} 8`;
    const { options, correctIndex } = buildOptions(ans, [
      `${len * 4} ${len * 4}`,
      `8 8`,
      `${len} 8`,
    ]);
    return {
      id: nextId('cpp'),
      category: 'C++17 & Output Traps',
      subtopic: 'Array-to-Pointer Decay (64-bit)',
      difficulty: 'Easy',
      askedIn: 'Qualcomm • Cisco • Embedded',
      question: 'On a standard 64-bit Linux system (`sizeof(int) == 4`, pointer == 8 bytes), what does this print?',
      codeSnippet: `void f(int p[]) { cout << sizeof(p); }\nint main() {\n  int arr[${len}] = {0};\n  cout << sizeof(arr) << " ";\n  f(arr);\n}`,
      options,
      correctIndex,
      explanation: '`sizeof(arr)` in `main` sees the full array type (`' + len + ' × 4 = ' + len * 4 + '` bytes). Inside `f(int p[])`, `arr` decays to `int*`, so `sizeof(p)` is 8 bytes!',
      shortcutTip: 'Array parameters like `int p[]` ALWAYS decay to raw pointers `int*` — always pass length explicitly or use `std::vector` / `std::array`!',
    };
  }

  if (roll === 2) {
    const startCap = pick([4, 8]);
    const pushes = startCap + 1;
    const ans = `ptr becomes DANGLING (Undefined Behavior) because pushing #${pushes} reallocated the vector`;
    const { options, correctIndex } = buildOptions(ans, [
      `Prints the 1st element safely because std::vector never moves existing elements`,
      `Throws std::bad_alloc when capacity ${startCap} overflows`,
      `Prints ${pushes} deterministically`,
    ]);
    return {
      id: nextId('cpp'),
      category: 'C++17 & Output Traps',
      subtopic: 'Iterator / Pointer Invalidation',
      difficulty: 'Medium',
      askedIn: 'Bloomberg • Nvidia',
      question: `Suppose \`vector<int> v;\` currently has \`size() == ${startCap}\` and \`capacity() == ${startCap}\`. What happens after this snippet runs?`,
      codeSnippet: `int* ptr = &v[0];\nv.push_back(99); // exceeds capacity ${startCap}\ncout << *ptr;`,
      options,
      correctIndex,
      explanation: `Because size == capacity (${startCap}), \`push_back(99)\` allocates a brand-new larger buffer, moves elements over, and FREES the old buffer — making \`ptr\` dangling!`,
      shortcutTip: 'Call `v.reserve(expected_max)` beforehand if holding pointers/iterators, or store integer indices instead of pointers!',
    };
  }

  if (roll === 3) {
    const a = randInt(2, 5);
    const b = randInt(1, 4);
    const condTrue = true; // ++a > 0 is always true since a >= 2!
    const ans = `${a + 1} ${b}`;
    const { options, correctIndex } = buildOptions(ans, [
      `${a + 1} ${b + 1}`,
      `${a} ${b + 1}`,
      `${a} ${b}`,
    ]);
    return {
      id: nextId('cpp'),
      category: 'C++17 & Output Traps',
      subtopic: 'Logical Short-Circuit Evaluation',
      difficulty: 'Easy',
      askedIn: 'TCS Digital • Microsoft OA',
      question: 'What are the printed values of `a` and `b` after short-circuit evaluation?',
      codeSnippet: `int a = ${a}, b = ${b};\nif (++a > 0 || ++b > 0) {\n  cout << a << " " << b;\n}`,
      options,
      correctIndex,
      explanation: `\`++a > 0\` evaluates to \`${a + 1} > 0\` (${condTrue}), so \`||\` short-circuits immediately and NEVER executes \`++b\`! Hence \`a = ${a + 1}\`, \`b = ${b}\`.`,
      shortcutTip: 'Watch out for side effects (`++`, function calls) on the right side of `||` and `&&` — they may be skipped!',
    };
  }

  return fromBank('cpp', 'C++17 & Output Traps', pick(CPP_BANK));
}

/* -------------------------------------------------------------------------- */
/* 3. SQL & QUERY INTERNALS (4 Procedural + 10 Deep Curated = 14 pools)       */
/* -------------------------------------------------------------------------- */

const SQL_BANK: StaticBankItem[] = [
  {
    subtopic: 'The Infamous NULL Trap',
    difficulty: 'Medium',
    askedIn: 'Uber • Razorpay',
    question: 'If `Orders.customer_id` is nullable and contains AT LEAST ONE `NULL`, how many rows does this query return?',
    codeSnippet: `SELECT id, name FROM Customers\nWHERE id NOT IN (SELECT customer_id FROM Orders);`,
    correct: '0 rows! Because `id != NULL` evaluates to UNKNOWN (SQL 3-valued logic)',
    distractors: [
      'All customers who have placed zero orders',
      'Only customers whose id is NULL',
      'Throws a runtime SQL type error',
    ],
    explanation: '`x NOT IN (1, 2, NULL)` expands to `x != 1 AND x != 2 AND x != NULL`. Any comparison with `NULL` yields UNKNOWN, failing the WHERE filter for every row.',
    shortcutTip: 'Never use `NOT IN (subquery)` — always prefer `WHERE NOT EXISTS (SELECT 1 FROM ...)` or `LEFT JOIN ... IS NULL`!',
  },
  {
    subtopic: 'Logical Execution Order',
    difficulty: 'Easy',
    askedIn: 'Microsoft • Oracle',
    question: 'Why does referencing a computed SELECT alias inside `WHERE` fail in SQL?',
    codeSnippet: `SELECT salary * 12 AS annual\nFROM Employees\nWHERE annual > 1000000; -- ERROR!`,
    correct: 'WHERE executes BEFORE SELECT in SQL’s logical pipeline, so `annual` does not exist yet',
    distractors: [
      'SQL aliases are only allowed inside JOIN conditions',
      'Arithmetic expressions cannot appear in SELECT lists',
      'You must use UNION ALL before filtering computed columns',
    ],
    explanation: 'Order: FROM/JOIN -> WHERE -> GROUP BY -> HAVING -> SELECT -> DISTINCT -> ORDER BY -> LIMIT. `ORDER BY` sees SELECT aliases, `WHERE` cannot.',
    shortcutTip: 'Wrap computed columns in a CTE (`WITH cte AS (...)`) or repeat the expression in `WHERE`.',
  },
  {
    subtopic: 'LEFT JOIN Filter Placement',
    difficulty: 'Medium',
    askedIn: 'Meta • Swiggy',
    question: 'You want ALL users, plus only their `status = "completed"` orders if any exist. What happens if you put `o.status = "completed"` in `WHERE` instead of `ON`?',
    correct: 'Users with no completed orders are DROPPED — turning the LEFT JOIN into an INNER JOIN',
    distractors: [
      'No difference; SQL optimizer generates the exact same rows',
      'Users without orders appear twice with NULL columns',
      'SQL raises an ambiguous column syntax error',
    ],
    explanation: 'LEFT JOIN fills `o.*` with NULL when no order matches. Filtering `o.status = "completed"` in `WHERE` discards those NULL rows afterward!',
    shortcutTip: 'Filters on the nullable RIGHT table of a LEFT JOIN belong in `ON`, not `WHERE`!',
  },
  {
    subtopic: 'Window Frame Default Trap',
    difficulty: 'Hard',
    askedIn: 'Stripe • Data Engineering',
    question: 'When calculating running sums with `SUM(amt) OVER (ORDER BY day)`, what subtle bug happens if two transactions share the exact same `day`?',
    correct: 'Default frame is `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`, summing ALL same-day peers together on both rows!',
    distractors: [
      'SQL throws an error unless days are strictly unique',
      'Window function silently skips duplicate days',
      'Both rows show NULL for the cumulative sum',
    ],
    explanation: 'SQL’s default window frame when `ORDER BY` is present uses `RANGE` (groups equal peer keys together), whereas `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` gives strict row-by-row running totals.',
    shortcutTip: 'Add `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` (or unique tie-breaker `ORDER BY day, id`) for deterministic running totals!',
  },
  {
    subtopic: 'Second Highest Null-Safety',
    difficulty: 'Medium',
    askedIn: 'LeetCode #176 • Amazon',
    question: 'If an `Employees` table has only ONE row (or all equal salaries), what does `SELECT DISTINCT salary FROM Employees ORDER BY salary DESC LIMIT 1 OFFSET 1;` return vs wrapping it in `SELECT (...) AS SecondHighestSalary`?',
    correct: 'Bare LIMIT/OFFSET returns 0 rows (empty result set), whereas wrapping in scalar `SELECT (...)` cleanly returns a single `NULL` row!',
    distractors: [
      'Bare LIMIT/OFFSET returns 0 automatically',
      'Both return NULL identically',
      'Scalar subquery raises a cardinality error when empty',
    ],
    explanation: 'Many SQL interview graders require a `NULL` row rather than 0 rows when no 2nd distinct salary exists. `SELECT MAX(salary)` or `SELECT (subquery)` guarantees 1 row (`NULL` if empty).',
    shortcutTip: 'Need `NULL` instead of empty result set? Wrap with `MAX(...)` or `SELECT (SELECT ... LIMIT 1 OFFSET 1)`!',
  },
  {
    subtopic: 'WHERE vs HAVING',
    difficulty: 'Easy',
    askedIn: 'Flipkart • Analytics',
    question: 'When filtering BOTH individual row status (`status = "paid"`) AND aggregated group totals (`COUNT(*) >= 5`), why put `status = "paid"` in `WHERE` instead of `HAVING`?',
    correct: 'WHERE prunes non-paid rows BEFORE grouping (using indexes and shrinking hash/sort memory), while HAVING filters groups AFTER aggregation',
    distractors: [
      'SQL forbids non-aggregated columns inside HAVING completely in all dialects',
      'WHERE automatically creates a B+ Tree index on status',
      'HAVING runs slower only when LIMIT is omitted',
    ],
    explanation: 'Filtering rows early in `WHERE` reduces group cardinality and allows index range scans on `status`.',
    shortcutTip: 'Row condition -> `WHERE`. Aggregate condition (`COUNT`, `SUM`, `AVG`) -> `HAVING`.',
  },
  {
    subtopic: 'Gaps & Islands Streaks',
    difficulty: 'Hard',
    askedIn: 'Meta • Spotify',
    question: 'How do you group consecutive login dates per user into continuous streaks in SQL without procedural loops?',
    correct: 'Subtract `ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY dt)` (in days) from `dt` — consecutive dates yield the exact same constant anchor date!',
    distractors: [
      'Use `GROUP BY user_id, MONTH(dt)` and take MAX minus MIN',
      'Join the table to itself 30 times for 30-day streaks',
      'Use `DENSE_RANK()` ordered by COUNT(*)',
    ],
    explanation: 'Deduplicate `(user_id, dt)` first; then if dates are Jan 10, 11, 12 and row numbers are 1, 2, 3, `dt - row_num` equals Jan 9 for all three rows!',
    shortcutTip: 'Classic Gaps & Islands formula: `grp = date_val - ROW_NUMBER() OVER (...)`, then `GROUP BY user_id, grp`!',
  },
  {
    subtopic: 'Sargable Index Predicates',
    difficulty: 'Medium',
    askedIn: 'Postgres • Backend',
    question: 'Why does `WHERE YEAR(created_at) = 2026` prevent the query planner from using a B+ Tree index on `created_at`?',
    correct: 'Wrapping the indexed column in a function (`YEAR(...)`) breaks range ordering — making the predicate non-SARGable and forcing a full table scan',
    distractors: [
      'B+ Trees cannot store DATE or TIMESTAMP types',
      'The YEAR() function returns strings instead of integers',
      'SQL optimizers always ignore WHERE clauses containing equality `=`',
    ],
    explanation: 'Rewrite as a range condition: `WHERE created_at >= "2026-01-01" AND created_at < "2027-01-01"` so the DB performs an index range seek!',
    shortcutTip: 'Keep indexed columns CLEAN (bare on one side of comparison) — never wrap them in `YEAR()`, `LOWER()`, or arithmetic!',
  },
  {
    subtopic: 'DELETE vs TRUNCATE vs DROP',
    difficulty: 'Easy',
    askedIn: 'Oracle • ServiceNow',
    question: 'Which statement empties ALL rows of a table using minimal undo logging, resets identity/auto-increment counters, and usually cannot fire per-row DELETE triggers?',
    correct: 'TRUNCATE TABLE',
    distractors: ['DELETE FROM table', 'DROP TABLE', 'VACUUM TABLE'],
    explanation: '`TRUNCATE` deallocates data pages directly (minimal logging, resets sequences), whereas `DELETE` removes rows individually with full transaction undo log + triggers.',
    shortcutTip: 'Need `WHERE` filter or triggers? `DELETE`. Wipe whole table fast? `TRUNCATE`. Remove schema too? `DROP`.',
  },
  {
    subtopic: 'Self-Join vs Window LAG',
    difficulty: 'Medium',
    askedIn: 'Amazon • Data Analyst',
    question: 'To compare today’s revenue with yesterday’s revenue per store, why is `LAG(rev, 1) OVER (PARTITION BY store_id ORDER BY dt)` faster than a self-join?',
    correct: 'LAG computes the previous value in a SINGLE sorted window pass O(N log N), avoiding quadratic or extra index self-join lookups',
    distractors: [
      'Self-joins are illegal in CTEs',
      'LAG ignores ORDER BY and hashes rows in O(1)',
      'Self-joins double the number of NULLs automatically',
    ],
    explanation: 'Window functions (`LAG` / `LEAD`) avoid self-join edge cases (like missing weekends if you matched `dt - 1 day`) and process rows cleanly in one scan.',
    shortcutTip: 'Whenever comparing row `i` with `i-1` or `i+1`, use `LAG()` / `LEAD()`!',
  },
];

function genSqlQuestion(): GeneratedInterviewQuestion {
  const roll = randInt(0, 13);

  if (roll === 0) {
    const scores = [100, 100, 90, 80];
    const targetFunc = pick(['ROW_NUMBER()', 'RANK()', 'DENSE_RANK()'] as const);
    const ans =
      targetFunc === 'ROW_NUMBER()'
        ? '1, 2, 3, 4'
        : targetFunc === 'RANK()'
          ? '1, 1, 3, 4'
          : '1, 1, 2, 3';
    const { options, correctIndex } = buildOptions(ans, [
      '1, 2, 3, 4',
      '1, 1, 3, 4',
      '1, 1, 2, 3',
      '1, 2, 2, 3',
    ]);
    return {
      id: nextId('sql'),
      category: 'SQL & Query Internals',
      subtopic: 'Window Ranking Functions',
      difficulty: 'Easy',
      askedIn: 'Amazon • Flipkart • Analytics',
      question: `Given salaries [${scores.join(', ')}] ordered DESC, what ranks does \`${targetFunc}\` assign?`,
      codeSnippet: `SELECT salary, ${targetFunc} OVER (ORDER BY salary DESC) AS rnk\nFROM Employees;`,
      options,
      correctIndex,
      explanation: 'ROW_NUMBER() emits unique sequential numbers (1,2,3,4). RANK() ties equal values and skips gaps (1,1,3,4). DENSE_RANK() ties without gaps (1,1,2,3).',
      shortcutTip: 'Use `DENSE_RANK()` whenever asked for "2nd / Nth highest salary" across tied earners!',
    };
  }

  if (roll === 1) {
    const nulls = randInt(1, 2);
    const nonNullVals = [10, 20, 10, 30];
    const totalRows = nonNullVals.length + nulls;
    const countCol = nonNullVals.length;
    const distinctNonNull = new Set(nonNullVals).size;
    const fnChoice = pick(['COUNT(*)', 'COUNT(bonus)', 'COUNT(DISTINCT bonus)'] as const);
    const ansNum =
      fnChoice === 'COUNT(*)' ? totalRows : fnChoice === 'COUNT(bonus)' ? countCol : distinctNonNull;
    const { options, correctIndex } = buildOptions(`${ansNum}`, [
      `${totalRows}`,
      `${countCol}`,
      `${distinctNonNull}`,
      `${distinctNonNull + 1}`,
    ]);
    const listStr = [...nonNullVals, ...Array(nulls).fill('NULL')].join(', ');
    return {
      id: nextId('sql'),
      category: 'SQL & Query Internals',
      subtopic: 'COUNT(*) vs COUNT(col) & NULLs',
      difficulty: 'Easy',
      askedIn: 'Swiggy • Zomato • SQL OA',
      question: `Table \`Sales\` has ${totalRows} rows with \`bonus\` values: [${listStr}]. What does \`SELECT ${fnChoice} FROM Sales;\` return?`,
      options,
      correctIndex,
      explanation: `\`COUNT(*)\` counts ALL rows including NULLs (${totalRows}). \`COUNT(col)\` ignores NULLs (${countCol}). \`COUNT(DISTINCT col)\` ignores NULLs and duplicates (${distinctNonNull}).`,
      shortcutTip: 'Remember: every aggregate (`COUNT(col)`, `SUM`, `AVG`, `MIN`, `MAX`) IGNORES NULL values — only `COUNT(*)` counts NULL rows!',
    };
  }

  if (roll === 2) {
    const ok = randInt(1, 4);
    const total = ok + randInt(2, 5);
    const ans = `0 (Integer division truncates ${ok}/${total} = 0 in SQLite/Postgres!)`;
    const { options, correctIndex } = buildOptions(ans, [
      `${(ok / total).toFixed(2)} automatically`,
      `1 (rounds up to nearest integer)`,
      `NULL due to type mismatch`,
    ]);
    return {
      id: nextId('sql'),
      category: 'SQL & Query Internals',
      subtopic: 'Integer Division Trap',
      difficulty: 'Medium',
      askedIn: 'LeetCode SQL 50 • Postgres',
      question: `In SQLite / PostgreSQL, if a user has ${ok} accepted submissions out of ${total} total submissions, what does \`ROUND(SUM(CASE WHEN ok THEN 1 ELSE 0 END) / COUNT(*), 2)\` return?`,
      options,
      correctIndex,
      explanation: `Both numerator (${ok}) and denominator (${total}) are integers, so SQL evaluates \`${ok} / ${total}\` using INTEGER division (= 0) BEFORE passing it to \`ROUND()\`!`,
      shortcutTip: 'Always multiply by `1.0` or use `AVG(CASE WHEN ... THEN 1.0 ELSE 0.0 END)` to force floating-point division!',
    };
  }

  if (roll === 3) {
    const aRows = [1, 2, 2, 3];
    const bRows = [2, 3, 4];
    const useAll = randInt(0, 1) === 0;
    const ans = useAll ? `${aRows.length + bRows.length} rows` : `${new Set([...aRows, ...bRows]).size} rows`;
    const { options, correctIndex } = buildOptions(ans, [
      `${aRows.length + bRows.length} rows`,
      `${new Set([...aRows, ...bRows]).size} rows`,
      '2 rows (only the intersection)',
      '5 rows',
    ]);
    return {
      id: nextId('sql'),
      category: 'SQL & Query Internals',
      subtopic: 'UNION vs UNION ALL',
      difficulty: 'Easy',
      askedIn: 'TCS • Infosys • Oracle',
      question: `Table A has id values [${aRows.join(', ')}] and Table B has id values [${bRows.join(', ')}]. How many rows does \`SELECT id FROM A ${useAll ? 'UNION ALL' : 'UNION'} SELECT id FROM B;\` return?`,
      options,
      correctIndex,
      explanation: `\`UNION ALL\` concatenates all rows as-is (${aRows.length + bRows.length}) in O(N). \`UNION\` sorts/hashes to remove ALL duplicates across and within both sets (${new Set([...aRows, ...bRows]).size} distinct values).`,
      shortcutTip: 'Default to `UNION ALL` in production queries when duplicates aren’t possible — skipping deduplication avoids an expensive global sort!',
    };
  }

  return fromBank('sql', 'SQL & Query Internals', pick(SQL_BANK));
}

/* -------------------------------------------------------------------------- */
/* 4. OS & CONCURRENCY (4 Procedural + 10 Deep Curated = 14 pools)            */
/* -------------------------------------------------------------------------- */

const OS_BANK: StaticBankItem[] = [
  {
    subtopic: 'Deadlock Prevention',
    difficulty: 'Easy',
    askedIn: 'Amazon • Oracle • Cisco',
    question: 'Which Coffman Deadlock condition is broken in production systems when engineers enforce acquiring locks in strict ascending resource-ID order?',
    correct: 'Circular Wait',
    distractors: ['Mutual Exclusion', 'Hold and Wait', 'No Preemption'],
    explanation: 'Canonical lock ordering (`lock(min(A,B))` then `lock(max(A,B))`) guarantees wait-for graphs stay acyclic.',
    shortcutTip: 'Always list the 4 Coffman conditions cleanly, then highlight breaking **Circular Wait** via canonical lock order.',
  },
  {
    subtopic: 'Condition Variables',
    difficulty: 'Medium',
    askedIn: 'Nvidia • Google Systems',
    question: 'Why MUST `cv.wait()` be guarded by a `while (!ready)` loop rather than an `if (!ready)` branch?',
    correct: 'Spurious wakeups or another thread consuming the queued work first can leave the predicate false after reacquiring the mutex',
    distractors: [
      'Condition variables only unlock the mutex inside while loops',
      '`if` disables OS priority inheritance',
      'POSIX forbids wait() calls inside conditional statements',
    ],
    explanation: 'OS schedulers can wake threads spuriously, or a competing worker can consume the item before the woken thread grabs the lock.',
    shortcutTip: 'In C++, `cv.wait(lk, pred)` literally compiles to `while (!pred()) cv.wait(lk);`!',
  },
  {
    subtopic: 'Copy-on-Write fork()',
    difficulty: 'Medium',
    askedIn: 'Uber • Linux Internals',
    question: 'How does Linux `fork()` spawn a child process of a 4GB server almost instantaneously without copying 4GB of RAM?',
    correct: 'Copy-on-Write (CoW): parent and child share read-only page mappings and copy individual 4KB frames lazily only when written',
    distractors: [
      'fork() writes parent memory to swap space asynchronously',
      'fork() shares a single writable heap and stack permanently',
      'fork() delays child execution until the parent terminates',
    ],
    explanation: 'Marking page table entries read-only lets both share physical RAM until either attempts a store instruction, triggering a minor page fault to duplicate just that page.',
    shortcutTip: 'Redis BGSAVE snapshots leverage `fork()` + CoW cleanly!',
  },
  {
    subtopic: 'Thread vs Process Switch Cost',
    difficulty: 'Medium',
    askedIn: 'Microsoft • Apple',
    question: 'Why is context switching between two threads of the SAME process significantly faster than switching between two different processes?',
    correct: 'Threads share the same virtual address space, so the hardware TLB and CPU page-table root (CR3) stay valid and don’t flush',
    distractors: [
      'Threads run purely in user space without needing CPU registers saved',
      'Threads do not have their own call stacks or program counters',
      'Process context switches always trigger a full disk read',
    ],
    explanation: 'Cold TLB misses after switching page tables force expensive multi-level RAM lookups on subsequent instructions.',
    shortcutTip: 'Highlight **TLB preservation (shared page tables)** — it immediately signals deep OS mastery!',
  },
  {
    subtopic: 'epoll vs select / poll',
    difficulty: 'Medium',
    askedIn: 'Cloudflare • Backend Infra',
    question: 'Why do high-concurrency event loops (Nginx, Node.js, Redis) use `epoll` (Linux) / `kqueue` (macOS) instead of `select()` for 50,000 open sockets?',
    correct: 'select() copies and linearly scans all 50,000 FDs O(N) on every wakeup, whereas epoll maintains kernel interest sets and returns only ready FDs in O(ready)',
    distractors: [
      'select() only supports UDP sockets, not TCP',
      'epoll compresses TCP payloads inside the kernel',
      'select() spawns one kernel thread per file descriptor',
    ],
    explanation: '`select()` is capped (often 1024 `FD_SETSIZE`) and O(N) per poll. `epoll_wait` stays O(1) when few sockets are active simultaneously.',
    shortcutTip: 'Remember **C10K problem** -> non-blocking I/O multiplexing with `epoll`!',
  },
  {
    subtopic: 'Mutex vs Semaphore',
    difficulty: 'Easy',
    askedIn: 'Qualcomm • Embedded',
    question: 'What is the fundamental conceptual difference between a Mutex and a Binary Semaphore?',
    correct: 'A Mutex has strict thread ownership (only the locker may unlock) and supports priority inheritance; a Semaphore is a signaling counter any thread can post',
    distractors: [
      'Semaphores spin-wait forever while Mutexes always yield CPU immediately',
      'Mutexes can count up to N resources while Semaphores only allow 1',
      'Semaphores only work across processes on the exact same core',
    ],
    explanation: 'Using a semaphore for mutual exclusion risks accidental unlocks by unrelated threads and lacks priority-inversion mitigation.',
    shortcutTip: 'Mutual exclusion / locking state -> **Mutex**. Producer/Consumer signaling or N-slot pool -> **Semaphore**.',
  },
  {
    subtopic: 'False Sharing (CPU Cache)',
    difficulty: 'Hard',
    askedIn: 'HFT • Quant • C++ Systems',
    question: 'Two threads on different CPU cores furiously increment `counters[0]` and `counters[1]` (adjacent 8-byte ints) with zero locks, yet run 10x slower than expected. Why?',
    correct: 'False Sharing: both variables sit in the same 64-byte L1 cache line, causing continuous MESI cache invalidation ping-pong across cores',
    distractors: [
      'TLB thrashing from virtual address aliasing',
      'Integer overflow traps in the ALU pipeline',
      'Mutex priority inversion inside the OS scheduler',
    ],
    explanation: 'CPU caches invalidate at 64-byte cache-line granularity, not per variable. Thread 0 writing `counters[0]` invalidates Core 1’s cache copy of `counters[1]`!',
    shortcutTip: 'Fix False Sharing in C++17 with `alignas(64)` (`std::hardware_destructive_interference_size`) padding!',
  },
  {
    subtopic: 'Thrashing & Working Set',
    difficulty: 'Medium',
    askedIn: 'OS Internals • Amazon',
    question: 'In virtual memory systems, what causes "Thrashing" when too many memory-hungry processes run concurrently?',
    correct: 'Combined active working sets exceed physical RAM, causing constant page faults/swapping where disk I/O eclipses CPU work',
    distractors: [
      'Stack frames overwrite global data segments cleanly',
      'CPU clock frequency halves due to thermal interrupts',
      'Context switching stops completely until one thread finishes',
    ],
    explanation: 'As CPU utilization drops during swap I/O, naive medium-term schedulers might admit MORE jobs, worsening page faults further!',
    shortcutTip: 'Control thrashing using **Working-Set Tracking** or Page-Fault Frequency suspension!',
  },
  {
    subtopic: 'Deadlock vs Livelock vs Starvation',
    difficulty: 'Easy',
    askedIn: 'Oracle • Cisco',
    question: 'Two threads repeatedly acquire Lock A, notice Lock B is busy, politely release Lock A, wait identically, and retry forever without progressing. What is this called?',
    correct: 'Livelock (threads stay active changing state, yet zero useful progress happens)',
    distractors: [
      'Deadlock (all threads sleep permanently)',
      'Belady’s Anomaly',
      'Priority Inheritance',
    ],
    explanation: 'Fix livelock with **randomized exponential backoff** so threads break symmetry instead of colliding in lockstep.',
    shortcutTip: 'Deadlock = blocked sleeping. Livelock = busy looping/backing off symmetrically. Starvation = scheduler never picks a low-priority thread.',
  },
  {
    subtopic: 'Spinlock vs Mutex',
    difficulty: 'Medium',
    askedIn: 'Kernel • Nvidia • Systems',
    question: 'When is a busy-waiting Spinlock faster than a sleeping Mutex — and when is it terrible?',
    correct: 'Spinlocks win for ultra-short critical sections (< context-switch time ~1–5µs) on multi-core CPUs; terrible for I/O locks or single-core machines',
    distractors: [
      'Spinlocks are always faster inside single-core containers',
      'Spinlocks release CPU immediately via kernel futex syscalls',
      'Mutexes never use atomic instructions internally',
    ],
    explanation: 'Putting a thread to sleep and waking it costs two kernel context switches. Spinning burns 100% of a core, which pays off ONLY if the lock frees in nanoseconds.',
    shortcutTip: 'Never hold a spinlock while doing disk/network I/O or memory allocation!',
  },
];

function genOsQuestion(): GeneratedInterviewQuestion {
  const roll = randInt(0, 13);

  if (roll === 0) {
    const hitPct = pick([80, 90, 95]);
    const tlb = pick([10, 20]);
    const ram = pick([100, 200]);
    const hitRate = hitPct / 100;
    const missRate = 1 - hitRate;
    const eat = hitRate * (tlb + ram) + missRate * (tlb + 2 * ram);
    const ans = `${eat} ns`;
    const { options, correctIndex } = buildOptions(ans, [
      `${eat + ram} ns`,
      `${tlb + ram} ns`,
      `${Math.round(hitRate * ram)} ns`,
    ]);
    return {
      id: nextId('os'),
      category: 'OS & Concurrency',
      subtopic: 'TLB Effective Access Time',
      difficulty: 'Medium',
      askedIn: 'Microsoft • Gate • Systems',
      question: `A system has TLB hit ratio = ${hitPct}%, TLB lookup = ${tlb} ns, and RAM access = ${ram} ns (1-level page table). What is the Effective Memory Access Time (EAT)?`,
      options,
      correctIndex,
      explanation: `TLB Hit (${hitPct}%): ${tlb} + ${ram} = ${tlb + ram} ns. TLB Miss (${Math.round(missRate * 100)}%): ${tlb} + 2×${ram} = ${tlb + 2 * ram} ns. EAT = ${eat} ns.`,
      shortcutTip: 'EAT = α(t_TLB + t_MEM) + (1 - α)(t_TLB + 2·t_MEM).',
    };
  }

  if (roll === 1) {
    const pageSpec = pick([
      { label: '4 KB', offsetBits: 12 },
      { label: '8 KB', offsetBits: 13 },
      { label: '16 KB', offsetBits: 14 },
    ]);
    const vaBits = pick([32, 48]);
    const vpnBits = vaBits - pageSpec.offsetBits;
    const ans = `${vpnBits} bits for Page Number, ${pageSpec.offsetBits} bits for Offset`;
    const { options, correctIndex } = buildOptions(ans, [
      `${pageSpec.offsetBits} bits for Page Number, ${vpnBits} bits for Offset`,
      `${vaBits / 2} bits for Page Number, ${vaBits / 2} bits for Offset`,
      `${vpnBits - 2} bits for Page Number, ${pageSpec.offsetBits + 2} bits for Offset`,
    ]);
    return {
      id: nextId('os'),
      category: 'OS & Concurrency',
      subtopic: 'Virtual Address Translation',
      difficulty: 'Easy',
      askedIn: 'Intel • Qualcomm • OS',
      question: `A ${vaBits}-bit virtual address space uses a page size of ${pageSpec.label}. How are the ${vaBits} bits split between Virtual Page Number (VPN) and Page Offset?`,
      options,
      correctIndex,
      explanation: `${pageSpec.label} = 2^${pageSpec.offsetBits} bytes -> ${pageSpec.offsetBits} offset bits. Remaining ${vaBits} - ${pageSpec.offsetBits} = ${vpnBits} high bits index the Virtual Page Number.`,
      shortcutTip: 'Always convert Page Size to `2^k` bytes -> lower `k` bits = offset!',
    };
  }

  if (roll === 2) {
    const k = pick([3, 4, 5]);
    const total = Math.pow(2, k);
    const askChildOnly = randInt(0, 1) === 1;
    const ans = askChildOnly ? `${total - 1} child processes` : `${total} total processes`;
    const { options, correctIndex } = buildOptions(ans, [
      `${total} ${askChildOnly ? 'child processes' : 'children only'}`,
      `${total - 1} total processes`,
      `${k * 2} processes`,
      `${k} processes`,
    ]);
    return {
      id: nextId('os'),
      category: 'OS & Concurrency',
      subtopic: 'fork() Process Tree Count',
      difficulty: 'Easy',
      askedIn: 'Cisco • ServiceNow • C OA',
      question: `Excluding the shell, how many ${askChildOnly ? 'NEW CHILD processes are created' : 'TOTAL processes (including initial parent) exist'} if \`fork();\` is called ${k} times sequentially in a loop?`,
      codeSnippet: `for (int i = 0; i < ${k}; ++i) {\n  fork();\n}`,
      options,
      correctIndex,
      explanation: `Each \`fork()\` doubles every live process, yielding 2^${k} = ${total} total processes (${total - 1} newly spawned children plus the 1 original parent).`,
      shortcutTip: 'n sequential `fork()` calls -> `2^n` total processes, `2^n - 1` new children!',
    };
  }

  if (roll === 3) {
    const ans = 'FIFO (First-In, First-Out) — known as Belady’s Anomaly';
    const { options, correctIndex } = buildOptions(ans, [
      'LRU (Least Recently Used) — violates stack property',
      'Optimal (Belady’s / MIN) replacement',
      'LFU (Least Frequently Used)',
    ]);
    return {
      id: nextId('os'),
      category: 'OS & Concurrency',
      subtopic: 'Page Replacement Policies',
      difficulty: 'Medium',
      askedIn: 'Gate • Oracle • OS',
      question: 'Under which page replacement algorithm can allocating MORE physical RAM frames paradoxically CAUSE MORE page faults on certain access strings?',
      options,
      correctIndex,
      explanation: 'FIFO lacks the "stack inclusion property", exhibiting Belady’s Anomaly (e.g., `1,2,3,4,1,2,5,1,2,3,4,5` causes 9 faults with 3 frames vs 10 faults with 4 frames). Stack algorithms like LRU and Optimal never suffer it.',
      shortcutTip: 'LRU & Optimal are **stack algorithms** -> guaranteed monotonic fault reduction as frames increase!',
    };
  }

  return fromBank('os', 'OS & Concurrency', pick(OS_BANK));
}

/* -------------------------------------------------------------------------- */
/* 5. DBMS & INDEXING (3 Procedural + 10 Deep Curated = 13 pools)             */
/* -------------------------------------------------------------------------- */

const DBMS_BANK: StaticBankItem[] = [
  {
    subtopic: 'WAL & Crash Recovery',
    difficulty: 'Medium',
    askedIn: 'Amazon • Databricks',
    question: 'Why does Write-Ahead Logging (WAL) improve BOTH crash durability AND commit speed compared to flushing B+ Tree pages on every commit?',
    correct: 'Appending sequential WAL bytes to disk is far faster than random B+ Tree page I/O while enabling undo/redo crash recovery',
    distractors: [
      'WAL saves pages purely inside L3 CPU cache forever',
      'WAL eliminates primary keys and unique index checks',
      'WAL disables ACID Isolation across connections',
    ],
    explanation: 'WAL converts random scattered index writes on commit into fast sequential log appends, flushing dirty buffer pages asynchronously later.',
    shortcutTip: 'Rule: WAL record MUST reach disk BEFORE either dirty data page flush or client commit ACK!',
  },
  {
    subtopic: 'UUIDv4 PK Fragmentation',
    difficulty: 'Hard',
    askedIn: 'Stripe • Backend Infra',
    question: 'Why does using random `UUIDv4` as a Clustered Primary Key hurt write throughput at tens of millions of rows?',
    correct: 'Random inserts strike scattered leaf pages causing frequent B+ Tree page splits, cache churn, and low fill factor',
    distractors: [
      'Databases cannot compare 128-bit values inside B+ Trees',
      'UUIDv4 collisions fail unique constraints every million rows',
      'Clustered indexes only allow 32-bit integers',
    ],
    explanation: 'Monotonic PKs (auto-increment, Snowflake, UUIDv7) append cleanly to the rightmost leaf page keeping hot buffer-pool pages cached.',
    shortcutTip: 'Need globally unique distributed PKs without index fragmentation? Use **UUIDv7** or **Snowflake IDs**!',
  },
  {
    subtopic: 'Optimistic vs Pessimistic Locking',
    difficulty: 'Medium',
    askedIn: 'BookMyShow • Fintech',
    question: 'Under high contention on one hot row (e.g., last flash-sale ticket), why can `SELECT ... FOR UPDATE` beat Optimistic Locking (version column)?',
    correct: 'Heavy contention triggers huge optimistic retry storms and wasted rollbacks, whereas a brief pessimistic row lock serializes cleanly',
    distractors: [
      'Optimistic locking requires multiple database servers',
      'SELECT FOR UPDATE operates outside ACID transactions',
      'Optimistic locking cannot guarantee single-row atomicity',
    ],
    explanation: 'Optimistic concurrency shines when collisions are rare. On hot rows where 90% of concurrent writes collide, pessimistic locks save CPU/latency.',
    shortcutTip: 'Low contention -> Optimistic (`WHERE version = v`). Hot contention -> `SELECT FOR UPDATE` or atomic `SET qty = qty - 1 WHERE qty >= 1`.',
  },
  {
    subtopic: 'Clustered vs Covering Index',
    difficulty: 'Medium',
    askedIn: 'MySQL • Postgres • Flipkart',
    question: 'What makes a "Covering Index" dramatically faster for read queries (`Index-Only Scan`)?',
    correct: 'The secondary index already contains ALL columns in both WHERE and SELECT, avoiding expensive random primary-table heap lookups',
    distractors: [
      'It stores table rows compressed in L1 CPU cache',
      'It automatically shards the table across read replicas',
      'Covering indexes do not need updating on INSERT or UPDATE',
    ],
    explanation: 'Using `CREATE INDEX idx ON Orders (user_id) INCLUDE (total, status)` lets Postgres/MySQL answer reads purely from leaf index pages!',
    shortcutTip: 'Notice why `SELECT *` defeats Covering Indexes — project only the columns you actually need!',
  },
  {
    subtopic: 'BCNF vs 3NF',
    difficulty: 'Medium',
    askedIn: 'Oracle • DBMS Core',
    question: 'What is the strict distinction between Third Normal Form (3NF) and Boyce-Codd Normal Form (BCNF)?',
    correct: '3NF allows X -> A if A is a prime attribute (part of some candidate key); BCNF strictly requires X to be a superkey for EVERY non-trivial X -> A',
    distractors: [
      '3NF eliminates multi-valued dependencies while BCNF eliminates atomic arrays',
      'BCNF allows partial key dependencies whereas 3NF forbids them',
      'There is zero mathematical difference between 3NF and BCNF',
    ],
    explanation: 'BCNF closes the rare anomaly loophole where a non-superkey determines part of a composite candidate key. Selective denormalization is later done for read speed.',
    shortcutTip: 'Remember: "The key, the whole key, and nothing but the key" = 3NF; every determinant is a superkey = BCNF!',
  },
  {
    subtopic: 'Sharding Hotspots',
    difficulty: 'Hard',
    askedIn: 'Instagram • Discord',
    question: 'Sharding a `Posts` table by `user_id` works well for 99.9% of users, but one celebrity with 50M reads overwhelms Shard #7. How do you mitigate this hot shard?',
    correct: 'Key salting (`user_id + hash % K` for writes/scatter-reads) OR putting a Redis/CDN read-through layer in front of celebrity keys',
    distractors: [
      'Normalize the Posts table into 5NF',
      'Convert all joins on Shard #7 to nested subqueries',
      'Drop the primary key index on Shard #7',
    ],
    explanation: 'Read-heavy hotspots are best absorbed by caching; write-heavy celebrity/tenant hotspots use bounded key salting (`tenant#0..9`) across shards.',
    shortcutTip: 'Hot READ shard -> Cache/Replicas. Hot WRITE shard -> Bounded Key Salting!',
  },
  {
    subtopic: 'Outbox Pattern & 2PC',
    difficulty: 'Hard',
    askedIn: 'Uber • Payments • Distributed',
    question: 'Your service needs to commit an Order to Postgres AND publish an `OrderCreated` Kafka event reliably without Distributed 2-Phase Commit. Which pattern guarantees atomicity?',
    correct: 'Transactional Outbox Pattern: insert Order + event into an `outbox` table inside ONE local DB transaction, then relay to Kafka asynchronously',
    distractors: [
      'Write to Kafka first, then open a Postgres transaction with READ UNCOMMITTED',
      'Use `SELECT FOR UPDATE` across Postgres and Kafka brokers together',
      'Disable WAL logging so both complete in parallel',
    ],
    explanation: 'Dual-writing DB + Kafka can leave partial state on crashes. Saving the event to an Outbox table in the exact same ACID commit guarantees at-least-once event publishing via Debezium/poller.',
    shortcutTip: 'Mention **Transactional Outbox + Idempotent Consumers** whenever dual-writes come up in backend interviews!',
  },
  {
    subtopic: 'Read Replicas Consistency',
    difficulty: 'Medium',
    askedIn: 'Meta • Backend Systems',
    question: 'A user edits their profile (writes to Primary DB), refreshes the page, and hits an async Read Replica showing OLD data. How do you solve "Read-Your-Own-Writes"?',
    correct: 'Route that specific user’s reads to the Primary for a short sticky window (~5–10s after write) OR track LSN/replication-watermark tokens',
    distractors: [
      'Switch the database isolation level to READ UNCOMMITTED',
      'Disable connection pooling across all web servers',
      'Force browsers to wait 60 seconds before refreshing',
    ],
    explanation: 'Pinning recent writers to Primary (or waiting until replica LSN >= write LSN) preserves high replica scalability while eliminating user confusion.',
    shortcutTip: 'Classic patterns: **Sticky-after-write window** or **Monotonic LSN token**!',
  },
  {
    subtopic: 'MVCC & Postgres VACUUM',
    difficulty: 'Medium',
    askedIn: 'Databricks • Postgres Internals',
    question: 'Under MVCC (Multi-Version Concurrency Control), why don’t readers block writers, and why does heavy UPDATE churn require `VACUUM` in PostgreSQL?',
    correct: 'Readers read consistent older tuple snapshots while writers append new row versions — leaving obsolete dead tuples that VACUUM must later reclaim',
    distractors: [
      'Readers acquire shared table locks on every SELECT',
      'VACUUM rebuilds the entire SQL schema from SQL dumps',
      'MVCC keeps only 1 global row copy overwritten in-place',
    ],
    explanation: 'Snapshots give lock-free reads, but dead row versions accumulate table bloat until autovacuum reclaims space and updates transaction visibility maps.',
    shortcutTip: 'State clearly: **Readers never block writers, writers never block readers** under MVCC!',
  },
  {
    subtopic: 'Write Skew Anomaly',
    difficulty: 'Hard',
    askedIn: 'Fintech • CockroachDB / Postgres',
    question: 'Two doctors check on-call count (`SELECT count(*) >= 2`), both see 2 doctors on call, and both concurrently mark themselves off-call, leaving 0 doctors! Which isolation level stops this "Write Skew"?',
    correct: 'Serializable (SSI / 2PL) — Snapshot Isolation (Repeatable Read) allows Write Skew because both rows updated are disjoint!',
    distractors: [
      'Read Committed completely prevents Write Skew',
      'Repeatable Read / Snapshot Isolation always prevents Write Skew',
      'Read Uncommitted stops disjoint updates automatically',
    ],
    explanation: 'Snapshot Isolation only detects write-write conflicts on the EXACT SAME row. Updating two different rows based on a shared query predicate requires `SERIALIZABLE` or locking a guard row.',
    shortcutTip: 'Two disjoint writes violating an invariant (`A + B >= K`) = classic **Write Skew** -> needs `SERIALIZABLE`!',
  },
];

function genDbmsQuestion(): GeneratedInterviewQuestion {
  const roll = randInt(0, 12);

  if (roll === 0) {
    const colA = pick(['tenant_id', 'user_id', 'org_id']);
    const colB = pick(['created_at', 'order_date', 'status']);
    const colC = 'amount';
    const ans = `WHERE ${colA} = 42 AND ${colB} > '2026-01-01'`;
    const { options, correctIndex } = buildOptions(ans, [
      `WHERE ${colB} = '2026-01-01' AND ${colC} > 50`,
      `WHERE ${colC} = 999`,
      `ORDER BY ${colC} DESC`,
    ]);
    return {
      id: nextId('dbms'),
      category: 'DBMS & Indexing',
      subtopic: 'B+ Tree Leftmost Prefix Rule',
      difficulty: 'Medium',
      askedIn: 'Flipkart • Razorpay • Postgres',
      question: `A table has ONE composite B+ Tree index \`(${colA}, ${colB}, ${colC})\`. Which query can use this index efficiently via index seek?`,
      options,
      correctIndex,
      explanation: `Keys sort by \`${colA}\` first, then \`${colB}\`, then \`${colC}\`. Queries omitting the leftmost column \`${colA}\` cannot seek into the B+ Tree directly.`,
      shortcutTip: 'Order composite indexes as **Equality (`=`) columns BEFORE Range (`>`, `BETWEEN`) columns**!',
    };
  }

  if (roll === 1) {
    const fanout = pick([100, 200, 500]);
    const levels = 3;
    const cap = fanout ** levels;
    const capLabel = cap >= 1_000_000_000 ? `${cap / 1_000_000_000} Billion` : `${cap / 1_000_000} Million`;
    const ans = `${capLabel} rows (fanout^${levels} = ${fanout}^3)`;
    const { options, correctIndex } = buildOptions(ans, [
      `${fanout * levels} rows`,
      `${Math.round(Math.log2(fanout) * 1000)} rows`,
      `Only ${fanout * fanout} rows`,
    ]);
    return {
      id: nextId('dbms'),
      category: 'DBMS & Indexing',
      subtopic: 'B+ Tree Fan-Out Math',
      difficulty: 'Medium',
      askedIn: 'Storage Engines • Google',
      question: `Suppose each B+ Tree node holds a fan-out of ${fanout} child pointers. Roughly how many records can a shallow ${levels}-level B+ Tree index point to?`,
      options,
      correctIndex,
      explanation: `Because B+ Trees store only compact keys/pointers in internal nodes (not full row data!), high fan-out ${fanout} reaches ${fanout}^3 = ${cap.toLocaleString()} records in just ${levels}–4 disk/cache hops!`,
      shortcutTip: 'This massive fan-out (why B+ Trees beat Binary Search Trees!) keeps billions of rows 3–4 page hops deep.',
    };
  }

  if (roll === 2) {
    const anomalies = [
      {
        anom: 'Dirty Read (reading uncommitted rolled-back changes)',
        ans: 'Read Committed (and higher)',
        wrong: ['Read Uncommitted', 'Only Serializable prevents Dirty Reads', 'No isolation level prevents Dirty Reads'],
        why: 'Read Committed ensures transactions only see committed data snapshots/locks.',
      },
      {
        anom: 'Non-Repeatable Read (same row changes between two SELECTs inside 1 transaction)',
        ans: 'Repeatable Read (and Serializable)',
        wrong: ['Read Committed', 'Read Uncommitted', 'Auto-Commit Mode'],
        why: 'Repeatable Read holds read locks or MVCC transaction-start snapshots so re-reading a row returns identical values.',
      },
      {
        anom: 'Phantom Read (new rows inserted by another tx suddenly match your range predicate)',
        ans: 'Serializable (or Snapshot Repeatable Read in MVCC)',
        wrong: ['Read Uncommitted', 'Read Committed', 'Row-level Exclusive Locks only'],
        why: 'Traditional locking needs gap/range locks (`Serializable`) to stop new rows matching a `WHERE` range mid-transaction.',
      },
    ];
    const a = pick(anomalies);
    const { options, correctIndex } = buildOptions(a.ans, a.wrong);
    return {
      id: nextId('dbms'),
      category: 'DBMS & Indexing',
      subtopic: 'SQL Isolation Levels',
      difficulty: 'Easy',
      askedIn: 'Amazon • Banking / SQL',
      question: `What is the WEAKEST standard SQL isolation level that prevents **${a.anom}**?`,
      options,
      correctIndex,
      explanation: a.why,
      shortcutTip: 'Hierarchy: Read Uncommitted < Read Committed (no Dirty) < Repeatable Read (no Non-Repeatable) < Serializable (no Phantoms/Skew)!',
    };
  }

  return fromBank('dbms', 'DBMS & Indexing', pick(DBMS_BANK));
}

/* -------------------------------------------------------------------------- */
/* 6. NETWORKS & SECURITY (3 Procedural + 11 Deep Curated = 14 pools)         */
/* -------------------------------------------------------------------------- */

const NET_BANK: StaticBankItem[] = [
  {
    subtopic: 'TCP TIME_WAIT',
    difficulty: 'Medium',
    askedIn: 'Cisco • Backend Infra',
    question: 'Why does the active closer of a TCP socket wait in `TIME_WAIT` for `2 × MSL` instead of closing immediately?',
    correct: 'To allow its final ACK to arrive/retransmit and let old delayed packets from the dead socket expire before port reuse',
    distractors: [
      'To wait for the DNS TTL of the server hostname to expire',
      'Because TLS certificates must renegotiate before FIN',
      'To flush HTTP cookies back to disk',
    ],
    explanation: '2×MSL guards against stray delayed segments corrupting a brand-new connection on the same 4-tuple.',
    shortcutTip: 'This is why outbound HTTP clients & DB drivers use **Connection Pooling / Keep-Alive** — avoiding `TIME_WAIT` ephemeral port exhaustion!',
  },
  {
    subtopic: 'HTTP/2 vs HTTP/3 (QUIC)',
    difficulty: 'Medium',
    askedIn: 'Cloudflare • Meta',
    question: 'HTTP/2 fixed HTTP Head-of-Line blocking via stream multiplexing. Why did HTTP/3 move onto UDP-based QUIC?',
    correct: 'HTTP/2 multiplexes over ONE TCP socket, so a single lost TCP packet stalls ALL HTTP streams together',
    distractors: [
      'TCP does not support TLS 1.3 encryption',
      'UDP shrinks JSON response sizes automatically',
      'HTTP/2 cannot traverse L7 reverse proxies',
    ],
    explanation: 'TCP enforces global in-order byte delivery; QUIC handles loss recovery independently per stream over UDP + integrates 1-RTT/0-RTT TLS 1.3.',
    shortcutTip: 'HTTP/1.1 -> HTTP HoL. HTTP/2 -> fixes HTTP HoL, keeps TCP HoL. HTTP/3 (QUIC) -> fixes TCP HoL!',
  },
  {
    subtopic: 'XSS vs CSRF Defense',
    difficulty: 'Medium',
    askedIn: 'Razorpay • Atlassian • Security',
    question: 'Which pair blocks Cross-Site Request Forgery (CSRF) while ALSO preventing JavaScript (`document.cookie`) from stealing session tokens during an XSS bug?',
    correct: '`SameSite=Lax/Strict` + Anti-CSRF Token (for CSRF) AND `HttpOnly` cookie + CSP (for XSS token protection)',
    distractors: [
      '`Access-Control-Allow-Origin: *` stops both XSS and CSRF',
      'Storing JWTs in `localStorage` stops XSS scripts from reading tokens',
      'Disabling HTTPS stops CSRF preflights',
    ],
    explanation: '`HttpOnly` hides cookies from JS (`localStorage` is wide open to any XSS payload!). `SameSite` stops third-party sites from forging authenticated requests.',
    shortcutTip: 'Best-practice web auth: `HttpOnly; Secure; SameSite=Lax/Strict` cookies + strict CSP!',
  },
  {
    subtopic: 'HTTPS Symmetric vs Asymmetric',
    difficulty: 'Easy',
    askedIn: 'Amazon • Intuit',
    question: 'During HTTPS, why use Asymmetric crypto (ECDHE/RSA/ECDSA) for handshake and Symmetric crypto (AES/ChaCha20) for data?',
    correct: 'Asymmetric crypto verifies identity & derives a shared secret over untrusted wires, while symmetric crypto encrypts bulk traffic orders of magnitude faster',
    distractors: [
      'Symmetric keys are stored publicly inside SSL certificates',
      'Asymmetric encryption cannot encrypt images or JSON',
      'TCP routers drop AES-encrypted handshake frames',
    ],
    explanation: 'Handshake proves certificate authenticity and negotiates ephemeral symmetric session keys (giving Perfect Forward Secrecy via ECDHE).',
    shortcutTip: 'Remember **ECDHE** provides Perfect Forward Secrecy — leaking a server private key later won’t decrypt old captures!',
  },
  {
    subtopic: 'L4 vs L7 Load Balancing',
    difficulty: 'Easy',
    askedIn: 'AWS • System Design',
    question: 'When should you pick a Layer-7 (Application) Load Balancer over a Layer-4 (Transport) Load Balancer?',
    correct: 'When you need routing by URL path (`/api` vs `/static`), HTTP headers, cookies, rate limiting, or TLS termination',
    distractors: [
      'When routing raw non-HTTP TCP/UDP game streams at minimum latency',
      'When clients bypass DNS completely',
      'When you want load balancers never to inspect HTTP paths',
    ],
    explanation: 'L4 NAT/DSR forwards TCP/UDP packets insanely fast by IP:Port. L7 terminates HTTP/TLS to inspect URLs/cookies and split microservice traffic.',
    shortcutTip: 'Path/Host/Auth routing -> **L7 (ALB/Nginx)**. Raw ultra-high-PPS packet forwarding -> **L4 (NLB/IPVS)**.',
  },
  {
    subtopic: 'CORS Preflight (OPTIONS)',
    difficulty: 'Medium',
    askedIn: 'Frontend / Full-Stack • Uber',
    question: 'Why does a browser automatically fire an `OPTIONS` preflight request before your cross-origin `POST /api/pay` with `Authorization: Bearer ...`?',
    correct: 'Custom headers (`Authorization`) or non-simple content types (`application/json`) trigger CORS preflight so the server confirms allowed origin/methods first',
    distractors: [
      'OPTIONS encrypts the JSON body using TLS before POST runs',
      'Browsers always double-send every GET and POST request twice',
      'CORS is enforced by backend TCP firewalls, not browsers',
    ],
    explanation: 'Simple requests (GET/HEAD/POST with form content-type and zero custom headers) skip preflight; `application/json` or `Authorization` requires explicit server `Access-Control-Allow-*` headers.',
    shortcutTip: 'Remember: **CORS is strictly a browser security policy** — `curl`/Postman never enforce CORS!',
  },
  {
    subtopic: 'REST vs gRPC vs WebSockets vs SSE',
    difficulty: 'Medium',
    askedIn: 'Google • Microservices',
    question: 'For internal service-to-service microservice RPCs needing ultra-low serialization latency & strict typed schemas, which beats REST/JSON?',
    correct: 'gRPC (HTTP/2 binary multiplexing + compact Protobuf serialization)',
    distractors: [
      'Server-Sent Events (SSE) over HTTP/1.0',
      'Polling REST XML every 100ms',
      'SMTP Webhooks',
    ],
    explanation: 'gRPC avoids text JSON parsing overhead via binary Protobuf contracts and reuses persistent multiplexed HTTP/2 streams.',
    shortcutTip: 'Public API -> REST. Internal microservice mesh -> gRPC. Real-time chat -> WebSockets. One-way AI/stock stream -> SSE!',
  },
  {
    subtopic: 'TCP Flow Control vs Congestion Control',
    difficulty: 'Hard',
    askedIn: 'Cisco • Arista • Networks',
    question: 'How does TCP Flow Control (`rwnd`) differ from TCP Congestion Control (`cwnd`)?',
    correct: '`rwnd` prevents overwhelming a slow RECEIVER’s buffer; `cwnd` (Slow Start / AIMD) prevents overwhelming intermediate NETWORK routers/links',
    distractors: [
      '`rwnd` lives inside DNS packets while `cwnd` lives inside TLS certificates',
      'Both measure only receiver CPU temperature',
      '`cwnd` is chosen statically once during the SYN packet and never changes',
    ],
    explanation: 'Effective sending window = `min(rwnd, cwnd)`: throttled by whichever bottleneck (receiver buffer or network congestion) is tighter.',
    shortcutTip: 'Flow Control = **Receiver** (`rwnd`). Congestion Control = **Network** (`cwnd`, `Slow Start`, `AIMD`).',
  },
  {
    subtopic: 'DNS Record Types',
    difficulty: 'Easy',
    askedIn: 'Cloudflare • AWS',
    question: 'What is the difference between a DNS `A` record, `AAAA` record, and `CNAME` record?',
    correct: '`A` maps domain -> IPv4, `AAAA` maps domain -> IPv6, `CNAME` aliases domain -> another hostname',
    distractors: [
      '`A` maps IP -> domain, while `CNAME` handles SSL certificates',
      '`AAAA` maps domain -> 4 redundant IPv4 failover servers',
      '`CNAME` cannot point outside the same local subnet',
    ],
    explanation: 'Note that zone apex domains (`example.com`) historically cannot hold a bare `CNAME` alongside SOA/NS records — CDNs solve that via `ALIAS` / `ANAME` flattening.',
    shortcutTip: 'And remember DNS runs primarily over **UDP port 53** (falling back to TCP 53 for large payloads / zone transfers)!',
  },
  {
    subtopic: 'TCP Sliding Window & Nagle',
    difficulty: 'Medium',
    askedIn: 'Real-Time Games • HFT',
    question: 'Why do low-latency games and real-time terminal SSH streams enable `TCP_NODELAY`?',
    correct: 'Disables Nagle’s algorithm so tiny keystroke/packet updates send immediately without buffering ~40–200ms waiting for delayed ACKs',
    distractors: [
      'Bypasses TCP checksum verification on Ethernet cards',
      'Switches the socket transparently into UDP multicast',
      'Disables TLS handshake encryption',
    ],
    explanation: 'Nagle’s algorithm coalesces small writes until previous un-ACKed data returns — combining poorly with TCP Delayed ACKs to introduce 40–200ms stalls.',
    shortcutTip: 'Enable `TCP_NODELAY` on latency-sensitive interactive sockets!',
  },
  {
    subtopic: 'Stateful WebSockets Scaling',
    difficulty: 'Medium',
    askedIn: 'Slack • Discord • Chat',
    question: 'User A connects via WebSocket to Node 1 and User B connects to Node 2 behind a Load Balancer. How does a message from A reach B?',
    correct: 'Node 1 publishes the event onto a shared message broker (Redis Pub/Sub / Kafka) subscribed by Node 2, which pushes down B’s open socket',
    distractors: [
      'Round-robin DNS re-routes TCP sockets dynamically between servers without closing them',
      'Browser automatically discovers Node 2’s private IP via ARP',
      'User A opens a direct peer-to-peer HTTP POST into Node 2’s private VPC IP',
    ],
    explanation: 'Because WebSockets hold stateful in-memory TCP file descriptors per backend node, cross-node fan-out requires a shared Pub/Sub backplane.',
    shortcutTip: 'Sticky sessions keep 1 client pinned to 1 node on reconnects, while **Redis Pub/Sub** bridges messages between nodes!',
  },
];

function genNetworksQuestion(): GeneratedInterviewQuestion {
  const roll = randInt(0, 13);

  if (roll === 0) {
    const subnets = [
      { cidr: 24, usable: 254, total: 256 },
      { cidr: 25, usable: 126, total: 128 },
      { cidr: 26, usable: 62, total: 64 },
      { cidr: 27, usable: 30, total: 32 },
      { cidr: 28, usable: 14, total: 16 },
    ];
    const s = pick(subnets);
    const hostBits = 32 - s.cidr;
    const ans = `${s.usable} usable hosts (2^${hostBits} - 2)`;
    const { options, correctIndex } = buildOptions(ans, [
      `${s.total} usable hosts (all 2^${hostBits} addresses)`,
      `${s.usable - 2} usable hosts`,
      `${s.cidr * 2} usable hosts`,
    ]);
    return {
      id: nextId('net'),
      category: 'Networks & Security',
      subtopic: 'CIDR Subnet Math',
      difficulty: 'Easy',
      askedIn: 'AWS • Cisco • DevOps',
      question: `How many usable host IPv4 addresses exist inside a \`192.168.10.0/${s.cidr}\` subnet?`,
      options,
      correctIndex,
      explanation: `/${s.cidr} leaves 32 - ${s.cidr} = ${hostBits} host bits (2^${hostBits} = ${s.total} IPs). Subtracting the network address and broadcast address leaves ${s.usable} usable hosts.`,
      shortcutTip: 'Usable IPv4 hosts = `2^(32 - prefix) - 2` (note: AWS VPCs reserve 5 IPs per subnet instead of 2!).',
    };
  }

  if (roll === 1) {
    const bwMbps = pick([10, 40, 100]);
    const rttMs = pick([20, 40, 80]);
    // BDP in KB = (bwMbps * 1000 * 1000 / 8) * (rttMs / 1000) / 1000 = bwMbps * rttMs / 8 KB (approx decimal KB)
    const bdpKb = Math.round((bwMbps * 1000 * rttMs) / 8000);
    const ans = `~${bdpKb} KB`;
    const { options, correctIndex } = buildOptions(ans, [
      `~${bdpKb * 8} KB`,
      `~${Math.max(1, Math.round(bdpKb / 8))} KB`,
      `~${bwMbps * rttMs} KB`,
    ]);
    return {
      id: nextId('net'),
      category: 'Networks & Security',
      subtopic: 'TCP Bandwidth-Delay Product',
      difficulty: 'Medium',
      askedIn: 'Networking • Systems',
      question: `A ${bwMbps} Mbps link has an RTT of ${rttMs} ms. Roughly what Bandwidth-Delay Product (minimum un-ACKed TCP window bytes) is needed to keep the pipe 100% full?`,
      options,
      correctIndex,
      explanation: `BDP = Bandwidth × RTT = (${bwMbps} × 10^6 bits/s ÷ 8 bits/byte) × ${rttMs / 1000}s ≈ ${bdpKb} KB in flight simultaneously.`,
      shortcutTip: 'If classic TCP window caps at 64 KB without **TCP Window Scaling**, high-latency high-bandwidth links starve below full speed!',
    };
  }

  if (roll === 2) {
    const ans = 'DNS (0 if cached, else 1 RTT) + TCP SYN/SYN-ACK (1 RTT) + TLS 1.3 (1 RTT) + HTTP GET (1 RTT)';
    const { options, correctIndex } = buildOptions(ans, [
      'TLS 1.3 runs BEFORE TCP 3-way handshake, taking 1 total RTT',
      'HTTP GET executes simultaneously inside the initial TCP SYN packet by default',
      'Every HTTPS API call performs 4 sequential DNS lookups before TCP',
    ]);
    return {
      id: nextId('net'),
      category: 'Networks & Security',
      subtopic: 'Cold HTTPS Connection Latency',
      difficulty: 'Medium',
      askedIn: 'Google • Web Perf',
      question: 'From a cold cache on modern TLS 1.3 over TCP, what is the true sequence of network round trips (RTTs) before the first HTTPS byte returns?',
      options,
      correctIndex,
      explanation: 'On a cold connection: DNS lookup -> TCP handshake (1 RTT for SYN + SYN-ACK) -> TLS 1.3 (1 RTT, down from 2 in TLS 1.2!) -> HTTP Request/Response (1 RTT).',
      shortcutTip: 'HTTP Keep-Alive + HTTP/3 QUIC (0-RTT / 1-RTT combined transport+TLS) dramatically cut cold-start latency!',
    };
  }

  return fromBank('net', 'Networks & Security', pick(NET_BANK));
}

/* -------------------------------------------------------------------------- */
/* 7. SYSTEM DESIGN & SCALE (4 Procedural + 11 Deep Curated = 15 pools)       */
/* -------------------------------------------------------------------------- */

const SD_BANK: StaticBankItem[] = [
  {
    subtopic: 'Cache Stampede Prevention',
    difficulty: 'Medium',
    askedIn: 'Redis • High-Scale Backend',
    question: 'A hot homepage key expires in Redis and 5,000 concurrent requests miss cache simultaneously, crushing Postgres. Which combo solves this Cache Stampede?',
    correct: 'Singleflight request coalescing (mutex per key) + Jittered TTLs + Probabilistic early refresh',
    distractors: [
      'Switch Cache-Aside to HTTP 301 browser redirects',
      'Disable Redis eviction policies and set infinite TTL on all keys',
      'Double read replicas every time CPU spikes',
    ],
    explanation: 'Singleflight ensures only ONE request queries Postgres per expired key while 4,999 share its in-flight result. Random TTL jitter prevents synchronized expirations.',
    shortcutTip: 'Always say **"Singleflight + Jittered TTL"** in caching interviews!',
  },
  {
    subtopic: 'Hybrid Social Timeline Fan-Out',
    difficulty: 'Hard',
    askedIn: 'Twitter / Instagram • HLD',
    question: 'Why does a Twitter/X home timeline combine Push (Fan-out-on-Write) for normal users with Pull (Fan-out-on-Read) for celebrities?',
    correct: 'Pushing a celebrity tweet to 50M followers creates huge write storms & lag; pulling celebrity posts on read keeps writes O(1)',
    distractors: [
      'SQL databases cannot store follower rows above 10,000',
      'Normal user tweets bypass databases and live only in Kafka',
      'Fan-out-on-Read removes the need for Redis entirely',
    ],
    explanation: 'Pushing normal authors’ posts into followers’ Redis feeds achieves <20ms reads for 99% of traffic, while merging followed celebrities on read eliminates fan-out spikes.',
    shortcutTip: 'Give a crisp threshold rule: e.g. `followers > 100K` -> Pull on read + K-way merge!',
  },
  {
    subtopic: 'Consistent Hashing & Virtual Nodes',
    difficulty: 'Medium',
    askedIn: 'Dynamo • Memcached • Uber',
    question: 'Why does Consistent Hashing scatter "Virtual Nodes" across the hash ring instead of placing only 1 point per physical cache server?',
    correct: 'Prevents uneven skew / hot shards when few physical nodes exist AND spreads load evenly across surviving machines if one node crashes',
    distractors: [
      'Because consistent hashing rings only accept prime node counts',
      'Virtual nodes eliminate network hops between clients and cache',
      'Physical servers cannot hash 64-bit IPv4 addresses directly',
    ],
    explanation: 'With 100–200 virtual nodes per machine, key distribution variance shrinks drastically, and losing a node shifts fractions of traffic uniformly rather than hammering 1 neighbor.',
    shortcutTip: 'Virtual nodes also let **heterogeneous beefier servers** hold proportionally more vnodes!',
  },
  {
    subtopic: 'HTTP 301 vs 302 in TinyURL',
    difficulty: 'Easy',
    askedIn: 'System Design Classic',
    question: 'When designing TinyURL, why choose HTTP `302` (Found) instead of HTTP `301` (Moved Permanently) if the product tracks real-time click analytics?',
    correct: '301 tells browsers/CDNs to cache the redirect aggressively and bypass your backend on future clicks, whereas 302 hits your server every time',
    distractors: [
      '301 cannot redirect to external HTTPS domains',
      '302 compresses short URLs from 7 characters to 5',
      '301 requires database transactions on every GET redirect',
    ],
    explanation: 'Use 301 to cut origin load when analytics aren’t needed; use 302 (plus async Kafka click-logging) when accurate per-click telemetry matters!',
    shortcutTip: 'Great bonus signal: mention **Base62** + pre-allocated Snowflake/range IDs so zero DB collision checks occur!',
  },
  {
    subtopic: 'Rate Limiter Atomicity',
    difficulty: 'Medium',
    askedIn: 'Stripe • Cloudflare • API Gateway',
    question: 'Why must a Distributed Rate Limiter using Redis execute its Read-Check-Decrement logic inside a Redis Lua Script instead of 2 separate `GET` + `DECR` calls?',
    correct: 'Two separate network commands suffer race conditions under concurrency (2 requests both read remaining=1 and both pass); Lua executes atomically on Redis’s single thread',
    distractors: [
      'Redis does not support the GET and DECR commands over TCP',
      'Lua scripts persist data synchronously to S3 automatically',
      'Two commands double the size of HTTP cookies',
    ],
    explanation: 'A Lua script executes atomically without interleaving other clients, guaranteeing strict token-bucket / sliding-window bounds in 1 RTT.',
    shortcutTip: 'Always discuss **Fail-Open vs Fail-Closed** if Redis itself becomes temporarily unreachable!',
  },
  {
    subtopic: 'Kafka Consumer Groups & Ordering',
    difficulty: 'Medium',
    askedIn: 'LinkedIn • Uber • Streaming',
    question: 'In Apache Kafka, if a topic has 6 Partitions and you spin up 8 Consumers inside the SAME Consumer Group, how do partitions distribute?',
    correct: '6 consumers each read 1 partition in parallel (preserving per-partition ordering), while 2 consumers sit IDLE as hot standbys',
    distractors: [
      'All 8 consumers read the same partition simultaneously to boost speed',
      'Kafka dynamically splits 6 partitions into 8 partitions automatically',
      'Kafka crashes with a ConsumerOverflow exception',
    ],
    explanation: 'Max parallelism inside one consumer group equals Partition Count (`<= 6`). Partition key = `order_id` or `user_id` keeps per-entity events strictly ordered!',
    shortcutTip: 'Ordering in Kafka is guaranteed **within a single partition**, NOT across partitions!',
  },
  {
    subtopic: 'CAP & PACELC Theorems',
    difficulty: 'Medium',
    askedIn: 'Amazon • Distributed DB',
    question: 'What crucial real-world insight does **PACELC** add on top of the classic CAP theorem?',
    correct: 'Even when there is NO network partition (Else), distributed databases must still trade Latency vs Consistency on normal reads/writes',
    distractors: [
      'Databases can simultaneously guarantee Consistency, Availability, and Partition Tolerance via SSDs',
      'Network partitions never occur inside single cloud regions',
      'SQL databases are always AP while NoSQL databases are always CP',
    ],
    explanation: 'E.g., Dynamo/Cassandra choose Availability on Partition, and low Latency (async replication) Else -> `PA/EL`. Spanner/ZooKeeper choose `PC/EC`.',
    shortcutTip: 'Always mention PACELC — interviewers love hearing why consistency costs **replication RTT latency** even on healthy networks!',
  },
  {
    subtopic: 'Pre-Signed S3 Direct Uploads',
    difficulty: 'Easy',
    askedIn: 'Instagram • Dropbox • Backend',
    question: 'Why do scalable media platforms (images/videos) generate a short-lived S3 Pre-Signed URL instead of streaming 100MB files through Node/Express API servers?',
    correct: 'Offloads heavy upload bandwidth/connections directly from client to Object Storage (S3/CDN), preventing API worker starvation',
    distractors: [
      'Express cannot receive binary HTTP POST payloads',
      'Pre-signed URLs automatically transcode 4K video in the browser',
      'S3 rejects uploads sent from VPC EC2 instances',
    ],
    explanation: 'API servers stay lightweight (issuing auth metadata + 5-min signed URL), while S3 absorbs massive parallel upload streams + triggers async S3->Lambda/Kafka processing!',
    shortcutTip: 'Always decouple **Control Plane (API)** from **Data Plane (S3 Pre-Signed + CDN)**!',
  },
  {
    subtopic: 'Spatial Indexing (Uber / Yelp)',
    difficulty: 'Medium',
    askedIn: 'Uber • DoorDash • Maps',
    question: 'How do location services quickly find all drivers within 3 km of a rider instead of running a slow 2D bounding scan across millions of coordinates?',
    correct: 'Divide the earth into spatial grid cells (Geohash / Google S2 / Uber H3 hexagons) or Quadtree indexed by cell ID',
    distractors: [
      'Store latitude and longitude concatenated in a single alphabetical VARCHAR B+ Tree',
      'Compute Haversine distance against every driver on every request',
      'Use Consistent Hashing by driver phone number',
    ],
    explanation: 'Mapping `(lat, lon)` -> 1D Geohash / H3 hex cell lets Redis (`GEOADD`/`GEOSEARCH`) or DB query your cell + its 6/8 neighbors cleanly!',
    shortcutTip: 'Mention checking **current cell + surrounding neighbor cells** to avoid boundary misses near cell edges!',
  },
  {
    subtopic: 'Cache-Aside vs Write-Back',
    difficulty: 'Medium',
    askedIn: 'Backend Architecture • Meta',
    question: 'Under which caching strategy are writes acknowledged immediately in Redis and flushed to Postgres asynchronously in batches — trading potential data loss on crash for extreme write speed?',
    correct: 'Write-Back (Write-Behind) Cache',
    distractors: ['Cache-Aside (Lazy Loading)', 'Write-Through Cache', 'Read-Through Cache'],
    explanation: 'Great for view counters/analytics where occasional crash loss is tolerable; terrible for financial ledgers (where Write-Through or DB-first Write-Around fits).',
    shortcutTip: 'Financial/critical writes -> Write-Through or DB-first. High-volume counters -> Write-Back.',
  },
  {
    subtopic: 'Retries, Jitter & DLQ',
    difficulty: 'Medium',
    askedIn: 'AWS • Reliable Microservices',
    question: 'If 10,000 clients retry a failing downstream service at exact fixed 2s intervals, they cause a "Thundering Herd" outage loop. How do you prevent this cleanly?',
    correct: 'Exponential Backoff + Full Random Jitter + Circuit Breaker + Dead Letter Queue (DLQ) after max attempts',
    distractors: [
      'Retry infinitely in a tight `while(true)` loop with 0ms delay',
      'Increase HTTP request timeouts to 30 minutes',
      'Disable load balancer health checks completely',
    ],
    explanation: 'Random jitter spreads retry waves across time, Circuit Breakers shed load fast when a dependency is down, and DLQs isolate poison-pill messages.',
    shortcutTip: 'Poison-pill messages blocking queues? Route to a **Dead Letter Queue (DLQ)** after N retries so healthy messages keep flowing!',
  },
];

function genSystemDesignQuestion(): GeneratedInterviewQuestion {
  const roll = randInt(0, 14);

  if (roll === 0) {
    const dauM = pick([10, 20, 50, 100]);
    const reqPerUser = pick([10, 20, 40]);
    const totalDailyM = dauM * reqPerUser;
    const avgQps = Math.round((totalDailyM * 1_000_000) / 86400);
    const approxStr = avgQps >= 1000 ? `~${(avgQps / 1000).toFixed(1)}K QPS (Peak ~${((avgQps * 3) / 1000).toFixed(1)}K)` : `~${avgQps} QPS`;
    const wrong1 = avgQps >= 1000 ? `~${Math.max(1, Math.round(avgQps / 10000))} QPS` : `~${avgQps * 20} QPS`;
    const wrong2 = `~${(totalDailyM / 10).toFixed(0)}M QPS`;
    const wrong3 = `~${Math.round(avgQps * 12)} QPS`;

    const { options, correctIndex } = buildOptions(approxStr, [wrong1, wrong2, wrong3]);
    return {
      id: nextId('sd'),
      category: 'System Design & Scale',
      subtopic: 'Back-of-the-Envelope QPS',
      difficulty: 'Easy',
      askedIn: 'Meta • Google • HLD',
      question: `Your app has ${dauM}M DAU, and each user makes ${reqPerUser} API calls/day on average. What is the Average QPS (using 86,400 sec/day) and 3x Peak QPS?`,
      options,
      correctIndex,
      explanation: `Daily calls = ${dauM}M × ${reqPerUser} = ${totalDailyM}M/day. Dividing by 86,400s yields ~${avgQps.toLocaleString()} avg QPS (~${(avgQps * 3).toLocaleString()} peak at 3x burst).`,
      shortcutTip: 'Memorize: `1M req/day ≈ 12 QPS`! Multiply `Daily Millions × 12` to compute QPS in 2 seconds!',
    };
  }

  if (roll === 1) {
    const writesM = pick([10, 50, 100]);
    const kb = pick([1, 2, 4]);
    // Daily GB = (writesM * 10^6 * kb * 1024) / 10^9 ≈ writesM * kb MB -> writesM * kb / 1000 GB * 1000 -> wait:
    // 1M * 1KB = 1 GB! Easy mental math: (10^6) * (10^3 bytes) = 10^9 bytes = 1 GB!
    const dailyGb = writesM * kb;
    const yr5Tb = Math.round((dailyGb * 365 * 5 * 3) / 1000);
    const ans = `${dailyGb} GB/day (~${yr5Tb} TB over 5 years with 3x replication)`;
    const { options, correctIndex } = buildOptions(ans, [
      `${dailyGb * 10} TB/day (~${yr5Tb * 10} PB over 5 years)`,
      `${Math.max(1, Math.round(dailyGb / 10))} MB/day`,
      `${dailyGb} GB/day (~${Math.round(yr5Tb / 3)} GB over 5 years)`,
    ]);
    return {
      id: nextId('sd'),
      category: 'System Design & Scale',
      subtopic: 'Storage Capacity Sizing',
      difficulty: 'Easy',
      askedIn: 'System Design • AWS',
      question: `A service stores ${writesM}M new objects/day averaging ${kb} KB each. Using clean base-10 math (1M × 1 KB = 1 GB), how much daily and 5-year replicated (3x) storage is required?`,
      options,
      correctIndex,
      explanation: `${writesM}M × ${kb} KB = ${dailyGb} GB/day. Over 5 years (~1,825 days) with 3x replication: ${dailyGb} GB × 1825 × 3 ≈ ${yr5Tb.toLocaleString()} TB.`,
      shortcutTip: 'Memorize: `1 Million × 1 KB = 1 GB`! Instant zero-calculator storage estimation!',
    };
  }

  if (roll === 2) {
    const dailyReadsM = pick([100, 500, 1000]);
    const itemKb = pick([1, 2]);
    // 100M * 1KB = 100 GB; 20% hot working set = 20 GB!
    const hotGb = Math.round(dailyReadsM * itemKb * 0.2);
    const ans = `~${hotGb} GB of Redis RAM (caching hot 20% daily working set)`;
    const { options, correctIndex } = buildOptions(ans, [
      `~${hotGb * 100} TB of Redis RAM minimum`,
      `~${Math.max(1, Math.round(hotGb / 100))} MB of RAM`,
      `~${dailyReadsM * 365} GB for 1 day’s cache`,
    ]);
    return {
      id: nextId('sd'),
      category: 'System Design & Scale',
      subtopic: '80/20 Cache RAM Sizing',
      difficulty: 'Medium',
      askedIn: 'TinyURL • Twitter HLD',
      question: `Applying the 80/20 rule to cache the hottest 20% of ${dailyReadsM}M daily read objects (${itemKb} KB each), roughly how much Redis RAM is needed?`,
      options,
      correctIndex,
      explanation: `Daily read footprint = ${dailyReadsM}M × ${itemKb} KB = ${dailyReadsM * itemKb} GB. Caching 20% requires only ~${hotGb} GB — easily fitting on 1–4 modern cache nodes!`,
      shortcutTip: '80/20 Cache rule: size RAM for 20% of ONE day’s unique read data and evict cold items via LRU!',
    };
  }

  if (roll === 3) {
    const n = pick([3, 5, 7]);
    const w = n === 3 ? 2 : pick([2, 3]);
    const minR = n - w + 1;
    const ans = `R = ${minR} (since W + R = ${w + minR} > N = ${n})`;
    const { options, correctIndex } = buildOptions(ans, [
      `R = ${minR - 1} (since W + R = N = ${n} overlaps enough)`,
      'R = 1 (reads always see newest value automatically)',
      `R = ${n} (must block on all ${n} replicas)`,
    ]);
    return {
      id: nextId('sd'),
      category: 'System Design & Scale',
      subtopic: 'Quorum Replication (N, W, R)',
      difficulty: 'Medium',
      askedIn: 'DynamoDB • Cassandra • Uber',
      question: `In a replicated KV store with N = ${n} replicas and write quorum W = ${w}, what MINIMUM read quorum R guarantees strongly consistent overlap with the latest write?`,
      options,
      correctIndex,
      explanation: `By the Pigeonhole Principle, \`W + R > N\` ensures read and write sets intersect at >= 1 replica. With N=${n}, W=${w}, minimum R is ${n} - ${w} + 1 = ${minR}.`,
      shortcutTip: 'Always state `W + R > N` AND mention **Vector Clocks / Read Repair** to pick the winning version!',
    };
  }

  return fromBank('sd', 'System Design & Scale', pick(SD_BANK));
}

/* -------------------------------------------------------------------------- */
/* PUBLIC GENERATOR EXPORTS                                                   */
/* -------------------------------------------------------------------------- */

export function generateInterviewQuestion(
  category: InterviewQuizCategory | 'Mixed' = 'Mixed'
): GeneratedInterviewQuestion {
  const chosen = category === 'Mixed' ? pick(INTERVIEW_QUIZ_CATEGORIES) : category;
  switch (chosen) {
    case 'DSA Pattern & Complexity':
      return genDsaQuestion();
    case 'C++17 & Output Traps':
      return genCppQuestion();
    case 'SQL & Query Internals':
      return genSqlQuestion();
    case 'OS & Concurrency':
      return genOsQuestion();
    case 'DBMS & Indexing':
      return genDbmsQuestion();
    case 'Networks & Security':
      return genNetworksQuestion();
    case 'System Design & Scale':
    default:
      return genSystemDesignQuestion();
  }
}

export function generateInterviewBatch(
  category: InterviewQuizCategory | 'Mixed' = 'Mixed',
  count = 10
): GeneratedInterviewQuestion[] {
  const out: GeneratedInterviewQuestion[] = [];
  const seenPrompts = new Set<string>();
  let guard = 0;
  while (out.length < count && guard < count * 12) {
    guard += 1;
    const cat =
      category === 'Mixed'
        ? INTERVIEW_QUIZ_CATEGORIES[out.length % INTERVIEW_QUIZ_CATEGORIES.length]
        : category;
    const q = generateInterviewQuestion(cat);
    const sig = `${q.category}:${q.question}`;
    if (!seenPrompts.has(sig) || guard > count * 9) {
      seenPrompts.add(sig);
      out.push(q);
    }
  }
  return out;
}
