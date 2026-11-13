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
    unique.add(`Option ${idx++}`);
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

/* -------------------------------------------------------------------------- */
/* PROCEDURAL + CURATED GENERATORS PER TECHNICAL CATEGORY                     */
/* -------------------------------------------------------------------------- */

function genDsaQuestion(): GeneratedInterviewQuestion {
  const mode = randInt(0, 2);

  // Procedural constraint-to-Big-O question
  if (mode === 0) {
    const tiers = [
      {
        n: pick(['N <= 10', 'N <= 11', 'N <= 12']),
        ans: 'O(N!) or O(2^N) (Backtracking / Permutations)',
        wrong: ['O(N^3) minimum', 'Strictly O(log N)', 'Must be O(N) greedy'],
        why: 'Under 10^8 ops/sec, N <= 12 comfortably permits factorial/exponential backtracking searches.',
      },
      {
        n: pick(['N <= 18', 'N <= 20', 'N <= 21']),
        ans: 'O(N · 2^N) (Bitmask DP / Meet-in-the-Middle)',
        wrong: ['O(N!) is still safe', 'Requires O(log N)', 'O(N^4) only'],
        why: '20 * 2^20 ≈ 2 × 10^7 operations, safely under a 1-second judge limit; N! would exceed 10^18.',
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
        why: 'Even a single O(N) loop over 10^9–10^18 elements times out (>10 seconds); logarithmic or O(1) math is mandatory.',
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
      question: `An online assessment gives input constraint ${t.n} with a 1-second limit (~10^8 ops/sec). What is the tightest acceptable time complexity you should target?`,
      options,
      correctIndex,
      explanation: t.why,
      shortcutTip: 'Always read input constraints FIRST before designing your algorithm — they reveal the intended complexity!',
    };
  }

  // Procedural recurrence / Heap vs Sort math
  if (mode === 1) {
    const n = pick([100000, 1000000]);
    const k = pick([8, 16, 32]);
    const ans = `O(N log K) time, O(K) space — using a Min-Heap of size ${k}`;
    const { options, correctIndex } = buildOptions(ans, [
      `O(N log N) using a Max-Heap of size ${k}`,
      `O(K log N) without reading all N elements`,
      `O(N^2) using bubble partition`,
    ]);
    return {
      id: nextId('dsa'),
      category: 'DSA Pattern & Complexity',
      subtopic: 'Top-K Priority Queue',
      difficulty: 'Medium',
      askedIn: 'Meta • Microsoft • Uber',
      question: `You need to find the ${k} LARGEST numbers from an unsorted stream of N = ${n.toLocaleString()} integers using minimal extra memory. Which approach is optimal?`,
      options,
      correctIndex,
      explanation: `Maintain a Min-Heap of size ${k}. Whenever a new element exceeds heap.top(), pop the smallest element in the top-${k} and push the new value. Each heap op costs O(log ${k}) and memory stays O(${k}).`,
      shortcutTip: 'Top-K LARGEST needs a MIN-heap (so the smallest of the top-K sits at top() ready to be evicted)!',
    };
  }

  const bank: StaticBankItem[] = [
    {
      subtopic: 'Prefix Sum vs Sliding Window',
      difficulty: 'Medium',
      askedIn: 'Amazon • Google',
      question: 'You must count contiguous subarrays summing to K in an array that contains POSITIVE, ZERO, and NEGATIVE integers. Why does standard two-pointer Sliding Window fail?',
      correct: 'Negative numbers break monotonicity — shrinking or expanding the window no longer moves the sum predictably',
      distractors: [
        'Sliding Window cannot handle K = 0 even with positive numbers',
        'Two pointers only works on sorted linked lists',
        'Sliding Window requires O(N log N) preprocessing',
      ],
      explanation: 'Sliding Window relies on window sum increasing on expansion and decreasing on shrink. With negatives, extending right can decrease sum. Prefix Sum + HashMap (`freq[pref - k]`) handles arbitrary integers in O(N).',
      shortcutTip: 'Positive-only subarray target -> Sliding Window (O(1) space). Contains negatives -> Prefix Sum + HashMap (`freq[0] = 1`).',
    },
    {
      subtopic: 'Monotonic Stack',
      difficulty: 'Medium',
      askedIn: 'Atlassian • Microsoft',
      question: 'Why do Monotonic Stack templates (Next Greater Element / Largest Rectangle in Histogram) push array INDICES onto the stack rather than element values?',
      correct: 'Indices give both the value a[st.top()] AND the width/distance (i - st.top() - 1) in O(1)',
      distractors: [
        'C++ std::stack cannot hold negative values cleanly',
        'Pushing indices avoids stack overflow on sorted arrays',
        'It reduces amortized time from O(N log N) to O(N)',
      ],
      explanation: 'Storing indices lets you compare values via `a[st.top()]` AND compute span distances (`i - prev_smaller_idx - 1`) without storing pairs.',
      shortcutTip: 'In any histogram/span problem, store indices on the stack and place sentinel boundaries (or flush at `i == n`).',
    },
    {
      subtopic: 'Dynamic Programming',
      difficulty: 'Medium',
      askedIn: 'Adobe • Flipkart',
      question: 'In 1D space-optimized 0/1 Knapsack (`dp[c]`), why MUST capacity `c` iterate BACKWARDS from `W` down to `wt[i]`?',
      correct: 'To guarantee each item is used at most once instead of reusing updated dp[c - wt[i]] from the same row',
      distractors: [
        'To improve CPU cache locality on modern x86 processors',
        'Forward iteration skips base case dp[0] = 0',
        'Backward iteration reduces time complexity from O(N·W) to O(N log W)',
      ],
      explanation: 'Iterating backwards reads `dp[c - wt[i]]` from the PREVIOUS item’s iteration before overwriting it. Forward iteration reuses the current item infinitely (Unbounded Knapsack / Coin Change).',
      shortcutTip: '0/1 Knapsack -> iterate capacity BACKWARDS. Unbounded / Coin Change -> iterate capacity FORWARDS.',
    },
    {
      subtopic: 'Graph BFS vs Dijkstra',
      difficulty: 'Medium',
      askedIn: 'Uber • Google',
      question: 'In a graph where every edge weight is strictly either 0 or 1, what finds shortest paths faster than standard Dijkstra O((V + E) log V)?',
      correct: '0-1 BFS using a std::deque in O(V + E): push_front for weight 0, push_back for weight 1',
      distractors: [
        'Bellman-Ford in O(V · E)',
        'Standard DFS with visited array in O(V + E)',
        'Topological Sort with Kahn’s algorithm on cyclic graphs',
      ],
      explanation: 'A double-ended queue keeps node distances monotonic without a log V heap. Zero-weight edges stay at the front; unit-weight edges go to the back.',
      shortcutTip: 'Unweighted -> Queue BFS. {0, 1} weights -> Deque 0-1 BFS. Arbitrary non-negative weights -> Min-Heap Dijkstra.',
    },
  ];
  const item = pick(bank);
  const { options, correctIndex } = buildOptions(item.correct, item.distractors);
  return {
    id: nextId('dsa'),
    category: 'DSA Pattern & Complexity',
    subtopic: item.subtopic,
    difficulty: item.difficulty,
    askedIn: item.askedIn,
    question: item.question,
    options,
    correctIndex,
    explanation: item.explanation,
    shortcutTip: item.shortcutTip,
  };
}

function genCppQuestion(): GeneratedInterviewQuestion {
  const mode = randInt(0, 1);

  if (mode === 0) {
    const a = randInt(3, 9);
    const b = randInt(2, 6);
    const ans = `${a + b}`;
    const { options, correctIndex } = buildOptions(ans, [
      `${a * 2}`,
      `${b * 2}`,
      'Undefined behavior / compile error',
    ]);
    return {
      id: nextId('cpp'),
      category: 'C++17 & Output Traps',
      subtopic: 'Reference Aliasing & Lambdas',
      difficulty: 'Easy',
      askedIn: 'Microsoft • Nvidia',
      question: 'What does this C++17 snippet print?',
      codeSnippet: `int x = ${a};\nauto& r = x;\nauto fn = [&, b = ${b}]() mutable { r += b; return r; };\ncout << fn();`,
      options,
      correctIndex,
      explanation: '`r` is an lvalue reference bound to `x`, captured by reference via `[&]`. `fn()` adds `b` to `x` and returns the updated value.',
      shortcutTip: 'Always trace whether lambda captures bind by value (`[=]`) or reference (`[&]`), especially with async callbacks!',
    };
  }

  const bank: StaticBankItem[] = [
    {
      subtopic: 'Unsigned Underflow Bug',
      difficulty: 'Medium',
      askedIn: 'Amazon • Qualcomm',
      question: 'What happens when `vector<int> v;` is EMPTY and this loop executes?',
      codeSnippet: `for (int i = 0; i <= v.size() - 1; ++i) {\n  process(v[i]);\n}`,
      correct: 'Infinite/out-of-bounds loop crash because `v.size() - 1` underflows unsigned size_t to ~1.84 × 10^19',
      distractors: [
        'Loop executes 0 times safely because `0 <= -1` is false',
        'Compiler throws `std::out_of_range` exception cleanly',
        'Loop executes once with `i = 0`',
      ],
      explanation: '`v.size()` returns unsigned `size_t`. When empty, `0ULL - 1` wraps around to `SIZE_MAX` (`2^64 - 1`), making `i <= SIZE_MAX` true and causing immediate UB/segfault!',
      shortcutTip: 'Write `i < (int)v.size() - 1` or `i + 1 < v.size()` — never subtract 1 from an unsigned `.size()`.',
    },
    {
      subtopic: 'Polymorphism & Destructors',
      difficulty: 'Medium',
      askedIn: 'Adobe • Morgan Stanley',
      question: 'What bug occurs if `Base` has virtual methods, `Derived` allocates heap memory, and `~Base()` is NOT marked `virtual`?',
      codeSnippet: `Base* ptr = new Derived();\ndelete ptr; // ~Base() is non-virtual`,
      correct: 'Only ~Base() runs — ~Derived() is skipped (Undefined Behavior & memory leak)',
      distractors: [
        'Compiler automatically makes ~Base() virtual when another virtual function exists',
        'Both ~Derived() and ~Base() still run via RTTI',
        'Compilation error: deleting incomplete polymorphic type',
      ],
      explanation: 'Non-virtual destructor dispatch is static based on pointer type (`Base*`). Marking `virtual ~Base() = default;` ensures vtable dispatch runs `~Derived()` first.',
      shortcutTip: 'Rule of thumb: any base class meant for polymorphic `Base*` ownership MUST have a virtual destructor.',
    },
    {
      subtopic: 'STL Performance Trap',
      difficulty: 'Medium',
      askedIn: 'Google • Codeforces',
      question: 'You have `std::set<int> s` of size N = 10^5. Why does `std::lower_bound(s.begin(), s.end(), x)` risk TLE compared to `s.lower_bound(x)`?',
      correct: 'std::set iterators are bidirectional (not random access), so std::lower_bound advances step-by-step in O(N)!',
      distractors: [
        'std::lower_bound locks internal mutexes on red-black tree nodes',
        's.lower_bound(x) caches previous lookups in an internal hashmap',
        'std::lower_bound sorts the set first before binary searching',
      ],
      explanation: 'Free function `std::lower_bound` calls `std::advance` linearly on non-random-access iterators, degrading from O(log N) to O(N) comparisons.',
      shortcutTip: 'For associative containers (`set`, `map`, `multiset`), ALWAYS call member `.lower_bound(x)` / `.upper_bound(x)`!',
    },
    {
      subtopic: 'Smart Pointers Internals',
      difficulty: 'Easy',
      askedIn: 'C++ Core • Nvidia',
      question: 'Why should you prefer `auto p = make_shared<User>(args);` over `shared_ptr<User> p(new User(args));`?',
      correct: 'make_shared performs 1 combined heap allocation for both User and the reference-count control block',
      distractors: [
        'make_shared returns a lock-free unique_ptr underneath',
        'new User() cannot invoke parameterized constructors inside shared_ptr',
        'make_shared prevents circular reference leaks automatically without weak_ptr',
      ],
      explanation: '`shared_ptr(new T)` does two separate heap allocations (one for `T`, one for control block). `make_shared` fuses them into a single cache-friendly allocation and avoids exception-leak hazards.',
      shortcutTip: 'Still use `weak_ptr` to break cyclic parent↔child graphs — `make_shared` cannot fix strong ref cycles.',
    },
  ];
  const item = pick(bank);
  const { options, correctIndex } = buildOptions(item.correct, item.distractors);
  return {
    id: nextId('cpp'),
    category: 'C++17 & Output Traps',
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

function genSqlQuestion(): GeneratedInterviewQuestion {
  const mode = randInt(0, 1);

  if (mode === 0) {
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
      question: `Given salaries [${scores.join(', ')}] ordered DESC, what ranks does ${targetFunc} assign?`,
      codeSnippet: `SELECT salary, ${targetFunc} OVER (ORDER BY salary DESC) AS rnk\nFROM Employees;`,
      options,
      correctIndex,
      explanation:
        'ROW_NUMBER() emits unique sequential numbers (1,2,3,4). RANK() ties equal values and skips gaps (1,1,3,4). DENSE_RANK() ties without gaps (1,1,2,3).',
      shortcutTip: 'Always reach for `DENSE_RANK()` when asked for "2nd/Nth highest salary" across tied earners!',
    };
  }

  const bank: StaticBankItem[] = [
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
      explanation: '`x NOT IN (1, 2, NULL)` expands to `x != 1 AND x != 2 AND x != NULL`. Anything compared to `NULL` via `!=` yields UNKNOWN, failing the WHERE filter for every row.',
      shortcutTip: 'Never use `NOT IN (subquery)` in interviews — write `WHERE NOT EXISTS (SELECT 1 FROM ...)` or `LEFT JOIN ... IS NULL`!',
    },
    {
      subtopic: 'Logical Execution Order',
      difficulty: 'Easy',
      askedIn: 'Microsoft • Oracle',
      question: 'Why does referencing a computed SELECT alias inside a `WHERE` clause fail in SQL?',
      codeSnippet: `SELECT salary * 12 AS annual\nFROM Employees\nWHERE annual > 1000000; -- ERROR!`,
      correct: 'WHERE executes BEFORE SELECT in SQL’s logical pipeline, so the alias `annual` does not exist yet',
      distractors: [
        'SQL aliases are only allowed inside JOIN conditions',
        'Arithmetic expressions cannot appear in SELECT lists',
        'You must use UNION ALL before filtering computed columns',
      ],
      explanation: 'Logical order: FROM/JOIN -> WHERE -> GROUP BY -> HAVING -> SELECT -> DISTINCT -> ORDER BY -> LIMIT. `ORDER BY` CAN see SELECT aliases, `WHERE` cannot.',
      shortcutTip: 'Wrap the calculation in a CTE (`WITH cte AS (...)`) or repeat `salary * 12` inside `WHERE`.',
    },
    {
      subtopic: 'LEFT JOIN Filter Placement',
      difficulty: 'Medium',
      askedIn: 'Meta • Swiggy',
      question: 'You want ALL users, plus only their `status = "completed"` orders if any exist. What happens if you put `o.status = "completed"` in `WHERE` instead of `ON`?',
      correct: 'Users with no completed orders are DROPPED — converting the LEFT JOIN into an INNER JOIN',
      distractors: [
        'No difference; SQL optimizer produces the exact same rows',
        'Users without orders appear twice with NULL columns',
        'SQLite raises an ambiguous column error',
      ],
      explanation: 'LEFT JOIN fills `o.*` with NULL when a user has no matching order. Putting `o.status = "completed"` in `WHERE` rejects those NULL rows afterward!',
      shortcutTip: 'Filter conditions on the RIGHT table of a LEFT JOIN belong in the `ON` clause, not `WHERE`.',
    },
  ];
  const item = pick(bank);
  const { options, correctIndex } = buildOptions(item.correct, item.distractors);
  return {
    id: nextId('sql'),
    category: 'SQL & Query Internals',
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

function genOsQuestion(): GeneratedInterviewQuestion {
  const mode = randInt(0, 1);

  // Procedural Effective Access Time (TLB + RAM)
  if (mode === 0) {
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
      `${hitRate * ram} ns`,
    ]);
    return {
      id: nextId('os'),
      category: 'OS & Concurrency',
      subtopic: 'TLB Effective Access Time',
      difficulty: 'Medium',
      askedIn: 'Gate / Microsoft / Systems',
      question: `A system has TLB hit ratio = ${hitPct}%, TLB lookup = ${tlb} ns, and RAM access = ${ram} ns (1-level page table). What is the Effective Memory Access Time (EAT)?`,
      options,
      correctIndex,
      explanation: `TLB Hit (${hitPct}%): TLB (${tlb}) + data RAM (${ram}) = ${tlb + ram} ns. TLB Miss (${Math.round(missRate * 100)}%): TLB (${tlb}) + page-table RAM (${ram}) + data RAM (${ram}) = ${tlb + 2 * ram} ns. Weighted EAT = ${hitRate}×${tlb + ram} + ${missRate.toFixed(2)}×${tlb + 2 * ram} = ${eat} ns.`,
      shortcutTip: 'Formula: EAT = α(t_TLB + t_MEM) + (1 - α)(t_TLB + 2·t_MEM).',
    };
  }

  const bank: StaticBankItem[] = [
    {
      subtopic: 'Deadlock Prevention',
      difficulty: 'Easy',
      askedIn: 'Amazon • Oracle • Cisco',
      question: 'Which Coffman Deadlock condition is broken in production systems when developers enforce acquiring locks strictly in ascending resource-ID order?',
      correct: 'Circular Wait',
      distractors: ['Mutual Exclusion', 'Hold and Wait', 'No Preemption'],
      explanation: 'Ordering locks globally (`lock(min(A,B))` then `lock(max(A,B))`) guarantees cycles can never form in the lock-wait graph.',
      shortcutTip: 'Always cite all 4 Coffman conditions cleanly, then say "production code breaks Circular Wait via canonical lock ordering".',
    },
    {
      subtopic: 'Condition Variables',
      difficulty: 'Medium',
      askedIn: 'Nvidia • Google Systems',
      question: 'When waiting on a POSIX / C++ `std::condition_variable`, why MUST you wrap `cv.wait()` in a `while (!ready)` loop rather than `if (!ready)`?',
      correct: 'Spurious wakeups or another thread consuming the work before wake-up can leave the predicate false',
      distractors: [
        'Condition variables release the mutex only if used inside a while loop',
        '`if` statements prevent priority inheritance',
        'C++ compiler rejects `cv.wait()` outside loops',
      ],
      explanation: 'OS schedulers allow spurious wakeups, and between `notify_all()` and reacquiring the mutex, another consumer thread may steal the condition.',
      shortcutTip: 'In C++, `cv.wait(lock, predicate)` expands internally to `while (!predicate()) wait(lock);`!',
    },
    {
      subtopic: 'Process Creation Internals',
      difficulty: 'Medium',
      askedIn: 'Systems • Uber',
      question: 'How does Linux `fork()` avoid immediately copying hundreds of megabytes of the parent process’s memory?',
      correct: 'Copy-on-Write (CoW): parent and child share read-only pages and copy only modified pages lazily',
      distractors: [
        'fork() swaps the parent process completely to disk first',
        'fork() shares a single modifiable stack between both processes',
        'fork() zeros out the child heap until malloc() is called',
      ],
      explanation: 'The kernel marks page tables read-only for both processes; any write triggers a protection fault that allocates a private page copy only for that 4KB frame.',
      shortcutTip: 'Mention CoW + TLB retention differences when comparing `fork()` process overhead vs `pthread_create()`.',
    },
  ];
  const item = pick(bank);
  const { options, correctIndex } = buildOptions(item.correct, item.distractors);
  return {
    id: nextId('os'),
    category: 'OS & Concurrency',
    subtopic: item.subtopic,
    difficulty: item.difficulty,
    askedIn: item.askedIn,
    question: item.question,
    options,
    correctIndex,
    explanation: item.explanation,
    shortcutTip: item.shortcutTip,
  };
}

function genDbmsQuestion(): GeneratedInterviewQuestion {
  const mode = randInt(0, 1);

  if (mode === 0) {
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
      question: `Suppose a table has ONE composite B+ Tree index \`(${colA}, ${colB}, ${colC})\`. Which query can efficiently use this B+ Tree index for filtering?`,
      options,
      correctIndex,
      explanation: `B+ Trees sort keys lexicographically by \`${colA}\` first, then \`${colB}\`, then \`${colC}\`. Queries missing the leftmost column \`${colA}\` cannot seek directly into the tree cleanly.`,
      shortcutTip: 'Put equality columns (`=`) BEFORE range columns (`>`, `BETWEEN`) in composite indexes!',
    };
  }

  const bank: StaticBankItem[] = [
    {
      subtopic: 'WAL & Crash Recovery',
      difficulty: 'Medium',
      askedIn: 'Amazon • Databricks',
      question: 'Why does Write-Ahead Logging (WAL) improve BOTH crash durability AND write throughput compared to flushing B+ Tree pages synchronously on every commit?',
      correct: 'Appending sequential WAL bytes to disk is vastly faster than random B+ Tree page I/O while allowing undo/redo recovery',
      distractors: [
        'WAL stores logs permanently in CPU L3 cache instead of SSD',
        'WAL removes the need for primary keys and unique constraints',
        'WAL bypasses ACID Isolation locks completely',
      ],
      explanation: 'Appending to a log is sequential disk I/O (high throughput), whereas modifying scattered data pages is random I/O flushed asynchronously in batches.',
      shortcutTip: 'Know the rule: Log record MUST hit durable storage BEFORE dirty buffer-pool page or commit ACK.',
    },
    {
      subtopic: 'UUID PK Fragmentation',
      difficulty: 'Hard',
      askedIn: 'Stripe • Backend Systems',
      question: 'Why can using random `UUIDv4` as a Clustered Primary Key in MySQL InnoDB degrade insert performance at tens of millions of rows?',
      correct: 'Random inserts strike arbitrary leaf pages causing frequent B+ Tree page splits and low page fill factor',
      distractors: [
        'MySQL refuses to index string/binary columns longer than 8 bytes',
        'UUIDv4 values collide frequently past 1M rows',
        'Clustered indexes only support auto-increment integers',
      ],
      explanation: 'Sequential PKs (auto-increment / Snowflake / UUIDv7) append neatly to the rightmost leaf page keeping hot pages in RAM.',
      shortcutTip: 'Recommend **UUIDv7 or Snowflake** when distributed IDs are needed without B+ Tree random fragmentation!',
    },
    {
      subtopic: 'Concurrency Control',
      difficulty: 'Medium',
      askedIn: 'BookMyShow • Fintech',
      question: 'Under high contention on a single inventory row (e.g., last flash-sale ticket), why might Pessimistic Locking (`SELECT FOR UPDATE`) beat Optimistic Locking (version column)?',
      correct: 'High contention causes massive Optimistic retry storms/rollbacks, whereas a brief row lock serializes cleanly',
      distractors: [
        'Optimistic locking requires two separate databases',
        'SELECT FOR UPDATE works without transactions',
        'Optimistic locking cannot guarantee Atomicity on single rows',
      ],
      explanation: 'Optimistic concurrency shines when conflicts are rare (zero lock overhead). Under heavy hot-row contention, 90% of optimistic commits abort and waste CPU retrying.',
      shortcutTip: 'Low contention -> Optimistic (`WHERE version = v`). High hot-row contention -> Pessimistic (`FOR UPDATE`) or atomic SQL decrement.',
    },
  ];
  const item = pick(bank);
  const { options, correctIndex } = buildOptions(item.correct, item.distractors);
  return {
    id: nextId('dbms'),
    category: 'DBMS & Indexing',
    subtopic: item.subtopic,
    difficulty: item.difficulty,
    askedIn: item.askedIn,
    question: item.question,
    options,
    correctIndex,
    explanation: item.explanation,
    shortcutTip: item.shortcutTip,
  };
}

function genNetworksQuestion(): GeneratedInterviewQuestion {
  const bank: StaticBankItem[] = [
    {
      subtopic: 'TCP TIME_WAIT',
      difficulty: 'Medium',
      askedIn: 'Cisco • Cloud / Backend',
      question: 'Why does the side initiating TCP connection teardown enter `TIME_WAIT` for `2 × MSL` instead of closing immediately?',
      correct: 'To ensure its final ACK arrives (or retransmits) and old delayed packets from the dead socket expire off the network',
      distractors: [
        'To give the DNS resolver time to clear its A-record TTL',
        'Because TLS certificates must be renegotiated before close',
        'To flush unread HTTP cookies back to disk',
      ],
      explanation: 'Waiting 2 Maximum Segment Lifetimes stops stray delayed packets from a previous connection from corrupting a new connection reusing the exact 4-tuple.',
      shortcutTip: 'This is also why microservices use HTTP Keep-Alive / DB connection pools — to avoid ephemeral port exhaustion from thousands of TIME_WAIT sockets!',
    },
    {
      subtopic: 'HTTP/2 vs HTTP/3 (QUIC)',
      difficulty: 'Medium',
      askedIn: 'Cloudflare • Meta',
      question: 'HTTP/2 solved HTTP-level Head-of-Line blocking via stream multiplexing. Why did HTTP/3 move to UDP-based QUIC anyway?',
      correct: 'HTTP/2 still runs over ONE TCP connection, so a single lost TCP packet stalls ALL multiplexed HTTP streams together',
      distractors: [
        'TCP does not support TLS 1.3 encryption',
        'UDP automatically compresses JSON payloads by 50%',
        'HTTP/2 cannot pass through L7 load balancers',
      ],
      explanation: 'TCP enforces strict in-order byte delivery across the whole socket. QUIC handles congestion & recovery per independent stream over UDP.',
      shortcutTip: 'HTTP/1.1 -> app HoL blocking. HTTP/2 -> fixes HTTP HoL, hits TCP HoL. HTTP/3 (QUIC) -> fixes TCP HoL + faster 1-RTT TLS!',
    },
    {
      subtopic: 'Web Security: XSS vs CSRF',
      difficulty: 'Medium',
      askedIn: 'Razorpay • Atlassian • Security',
      question: 'Which pair of cookie/header defenses blocks Cross-Site Request Forgery (CSRF) while ALSO preventing JavaScript (`document.cookie`) from stealing a session token during an XSS bug?',
      correct: '`SameSite=Lax/Strict` + Anti-CSRF Token (for CSRF) AND `HttpOnly` cookie + strict CSP (for XSS token protection)',
      distractors: [
        'CORS `Access-Control-Allow-Origin: *` alone stops both XSS and CSRF',
        'Storing JWTs in `localStorage` with `Secure` flag stops XSS reading tokens',
        'Disabling TLS 1.3 prevents CSRF preflight requests',
      ],
      explanation: '`HttpOnly` hides cookies from JS (`localStorage` is readable by any injected XSS script!). `SameSite` prevents third-party sites from triggering state-changing requests with your cookies.',
      shortcutTip: 'Never store sensitive session tokens in `localStorage` if avoidable; prefer `HttpOnly; Secure; SameSite` cookies.',
    },
    {
      subtopic: 'HTTPS Handshake',
      difficulty: 'Easy',
      askedIn: 'Amazon • Intuit',
      question: 'During HTTPS communication, why do browser and server use Asymmetric cryptography (ECDHE/RSA/ECDSA) at setup and Symmetric encryption (AES/ChaCha20) for page data?',
      correct: 'Asymmetric crypto solves key-exchange & identity verification over untrusted networks, while symmetric crypto is orders of magnitude faster for bulk traffic',
      distractors: [
        'Symmetric encryption keys are public inside X.509 certificates',
        'Asymmetric encryption cannot encrypt binary files or images',
        'TCP routers drop AES packets during the 3-way handshake',
      ],
      explanation: 'Public/private keys let both parties verify trust and derive a shared ephemeral session key safely, then AES-GCM encrypts megabytes at wire speed.',
      shortcutTip: 'Remember: TLS 1.3 uses Diffie-Hellman (ECDHE) for Perfect Forward Secrecy — leaking the server cert key later cannot decrypt past recorded sessions!',
    },
  ];
  const item = pick(bank);
  const { options, correctIndex } = buildOptions(item.correct, item.distractors);
  return {
    id: nextId('net'),
    category: 'Networks & Security',
    subtopic: item.subtopic,
    difficulty: item.difficulty,
    askedIn: item.askedIn,
    question: item.question,
    options,
    correctIndex,
    explanation: item.explanation,
    shortcutTip: item.shortcutTip,
  };
}

function genSystemDesignQuestion(): GeneratedInterviewQuestion {
  const mode = randInt(0, 1);

  // Procedural QPS / Storage estimation question
  if (mode === 0) {
    const dauM = pick([10, 20, 50, 100]);
    const reqPerUser = pick([10, 20, 40]);
    const totalDailyM = dauM * reqPerUser;
    const avgQps = Math.round((totalDailyM * 1_000_000) / 86400);
    const approxStr = avgQps >= 1000 ? `~${(avgQps / 1000).toFixed(1)}K QPS (Peak ~${((avgQps * 3) / 1000).toFixed(1)}K)` : `~${avgQps} QPS`;
    const wrong1 = avgQps >= 1000 ? `~${Math.round(avgQps / 10000)} QPS` : `~${avgQps * 20} QPS`;
    const wrong2 = `~${(totalDailyM / 10).toFixed(0)}M QPS`;
    const wrong3 = `~${Math.round(avgQps * 12)} QPS`;

    const { options, correctIndex } = buildOptions(approxStr, [wrong1, wrong2, wrong3]);
    return {
      id: nextId('sd'),
      category: 'System Design & Scale',
      subtopic: 'Back-of-the-Envelope QPS',
      difficulty: 'Easy',
      askedIn: 'Meta • Google • HLD',
      question: `Your app has ${dauM}M DAU, and each user makes ${reqPerUser} API calls/day on average. Roughly what is the Average QPS (using 86,400 sec/day ≈ 10^5 sec) and 3x Peak QPS?`,
      options,
      correctIndex,
      explanation: `Daily requests = ${dauM}M × ${reqPerUser} = ${totalDailyM}M requests/day. Dividing by 86,400 seconds gives ~${avgQps.toLocaleString()} avg QPS (~${(avgQps * 3).toLocaleString()} peak at 3x burst).`,
      shortcutTip: 'Memorize: 1M requests/day ≈ 12 QPS! Multiply `(Total M / day) × 12` to compute QPS in 2 seconds aloud.',
    };
  }

  const bank: StaticBankItem[] = [
    {
      subtopic: 'Quorum Replication',
      difficulty: 'Medium',
      askedIn: 'DynamoDB • Cassandra • Uber',
      question: 'In a distributed KV store with N = 5 replicas, if write quorum W = 3, what minimum read quorum R guarantees strongly consistent reads (read-after-write overlap)?',
      correct: 'R = 3 (since W + R = 6 > N = 5)',
      distractors: [
        'R = 1 (reads always hit primary)',
        'R = 2 (W + R = 5 = N is sufficient)',
        'R = 5 (every read must block on all nodes)',
      ],
      explanation: 'By the Pigeonhole Principle, when `W + R > N`, the read quorum MUST intersect with at least one replica holding the newest write.',
      shortcutTip: 'Always state `W + R > N` and mention **Read Repair + Vector Clocks / Timestamps** to resolve conflicting versions.',
    },
    {
      subtopic: 'Cache Stampede',
      difficulty: 'Medium',
      askedIn: 'Redis • High-Scale Backend',
      question: 'A viral homepage key expires in Redis and 5,000 concurrent requests miss the cache at once, crushing the Postgres DB. Which combination prevents this Cache Stampede?',
      correct: 'Singleflight request coalescing (mutex per key) + Jittered TTLs + Probabilistic early refresh',
      distractors: [
        'Switch from Redis Cache-Aside to HTTP 301 browser redirects',
        'Disable Redis eviction policies and remove all TTLs globally',
        'Double the number of database read replicas infinitely',
      ],
      explanation: 'Singleflight lets only ONE worker query Postgres per expired key while the other 4,999 wait on its in-flight result. Jittering TTL prevents synchronized mass expirations.',
      shortcutTip: 'Never forget the word **"Singleflight"** + **"TTL Jitter"** in HLD caching deep dives!',
    },
    {
      subtopic: 'Hybrid Fan-Out (Social Feed)',
      difficulty: 'Hard',
      askedIn: 'Twitter / Instagram • System Design',
      question: 'Why does a Twitter/Instagram timeline combine Push (Fan-out-on-Write) for regular users with Pull (Fan-out-on-Read) for celebrities?',
      correct: 'Pushing a celebrity’s post to 50M followers creates huge write amplification & lag; merging celebrity reads at query time keeps writes fast',
      distractors: [
        'SQL databases cannot store more than 10,000 follower rows',
        'Regular users are stored in Kafka instead of Redis',
        'Fan-out-on-Read eliminates the need for caching completely',
      ],
      explanation: 'Precomputing home timelines in Redis makes feed reads <20ms for 99% of authors, while pulling a small list of followed celebrities at read time avoids 50M-row fan-out spikes.',
      shortcutTip: 'Define a concrete threshold (e.g. >100k followers -> Pull celebrity cache and K-way merge at read time).',
    },
  ];
  const item = pick(bank);
  const { options, correctIndex } = buildOptions(item.correct, item.distractors);
  return {
    id: nextId('sd'),
    category: 'System Design & Scale',
    subtopic: item.subtopic,
    difficulty: item.difficulty,
    askedIn: item.askedIn,
    question: item.question,
    options,
    correctIndex,
    explanation: item.explanation,
    shortcutTip: item.shortcutTip,
  };
}

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
  while (out.length < count && guard < count * 8) {
    guard += 1;
    const cat =
      category === 'Mixed'
        ? INTERVIEW_QUIZ_CATEGORIES[out.length % INTERVIEW_QUIZ_CATEGORIES.length]
        : category;
    const q = generateInterviewQuestion(cat);
    const sig = `${q.category}:${q.question}`;
    if (!seenPrompts.has(sig) || guard > count * 5) {
      seenPrompts.add(sig);
      out.push(q);
    }
  }
  return out;
}

