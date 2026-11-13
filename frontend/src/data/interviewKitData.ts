export type CsSubject =
  | 'All'
  | 'OS'
  | 'DBMS'
  | 'Networks'
  | 'C++ & OOPs'
  | 'System Design'
  | 'SQL Internals';

export interface CsFlashcard {
  id: string;
  subject: Exclude<CsSubject, 'All'>;
  frequency: 'Very High' | 'High' | 'Medium';
  question: string;
  answer: string;
  trap: string;
}

export interface PatternPlaybookItem {
  id: string;
  pattern: string;
  triggerSignals: string[];
  complexity: string;
  templateSnippet: string;
  pitfall: string;
  topicKeywords: string[];
}

export interface SystemDesignBlueprint {
  id: string;
  kind: 'HLD' | 'LLD';
  title: string;
  scope: string;
  coreComponents: string[];
  deepDive: string;
  tradeoffs: string;
  followUpQuestion: string;
}

export interface StlCheatsheetItem {
  name: string;
  ops: string;
  whenToUse: string;
  gotcha: string;
}

export interface SqlPatternItem {
  title: string;
  syntax: string;
  gotcha: string;
}

export interface ConstraintScaleRow {
  constraint: string;
  maxComplexity: string;
  typicalAlgo: string;
}

export interface BrainTeaserItem {
  id: string;
  category: 'Probability' | 'Logic' | 'Bitwise / Math' | 'Estimation';
  title: string;
  prompt: string;
  hint: string;
  solution: string;
}

export interface CompanyArchetypeItem {
  company: string;
  focus: string;
  roundsBreakdown: string[];
  winningHabit: string;
}

export const CS_FLASHCARDS: CsFlashcard[] = [
  {
    id: 'os-1',
    subject: 'OS',
    frequency: 'Very High',
    question: 'Process vs Thread — what is shared and what stays isolated?',
    answer:
      'Processes own isolated virtual address spaces, file descriptor tables, and PCBs. Threads within one process share code, heap, globals, and open files, while each thread keeps its own stack, registers, and program counter.',
    trap: 'Switching threads in the same process is faster mainly because page tables / TLB entries stay valid.',
  },
  {
    id: 'os-2',
    subject: 'OS',
    frequency: 'Very High',
    question: 'What are the 4 Coffman conditions required for Deadlock?',
    answer:
      '1) Mutual Exclusion, 2) Hold and Wait, 3) No Preemption, 4) Circular Wait. Breaking ANY one prevents deadlock—production systems typically break Circular Wait by enforcing strict global lock acquisition ordering.',
    trap: 'Livelock keeps threads running without making progress; starvation means a thread never gets scheduled; deadlock blocks permanently.',
  },
  {
    id: 'os-3',
    subject: 'OS',
    frequency: 'High',
    question: 'Explain Virtual Memory, Page Faults, TLB & Thrashing.',
    answer:
      'MMU translates virtual pages to physical frames via Page Tables cached in the hardware TLB. Accessing an unmapped/swapped page raises a page fault trap to load it from disk. When total working sets exceed RAM, constant page faults cause thrashing.',
    trap: 'Belady’s Anomaly: adding more frames can occasionally increase page faults under FIFO replacement (never under LRU/Optimal).',
  },
  {
    id: 'os-4',
    subject: 'OS',
    frequency: 'High',
    question: 'Mutex vs Binary Semaphore vs Condition Variable?',
    answer:
      'A Mutex has ownership: only the locking thread should unlock it (supports priority inheritance). A Semaphore is a signaling counter without strict ownership (one thread can post/signal for another). Condition variables sleep until a shared predicate changes.',
    trap: 'Always check condition variables inside a while(...) loop, never if(...), to guard against spurious wakeups.',
  },
  {
    id: 'os-5',
    subject: 'OS',
    frequency: 'High',
    question: 'How does Copy-on-Write (CoW) make fork() fast?',
    answer:
      'fork() does NOT eagerly copy the parent’s physical RAM. Parent and child initially share read-only page table mappings; the OS duplicates a physical page lazily only when either process attempts a write (page fault).',
    trap: 'Combined with exec(), CoW avoids wasted memory copies entirely when spawning child compilers/workers.',
  },
  {
    id: 'os-6',
    subject: 'OS',
    frequency: 'Medium',
    question: 'Blocking I/O vs Non-blocking vs epoll / I/O Multiplexing?',
    answer:
      'One-thread-per-connection hits C10K context-switch and stack limits. select()/poll() scan O(N) descriptors each wake-up, whereas Linux epoll_wait maintains a kernel ready-list and returns only ready FDs in O(1)/O(ready).',
    trap: 'Node.js, Nginx, and Redis achieve massive concurrency via event loops backed by epoll/kqueue on non-blocking sockets.',
  },
  {
    id: 'dbms-1',
    subject: 'DBMS',
    frequency: 'Very High',
    question: 'Explain ACID properties and how WAL guarantees Atomicity + Durability.',
    answer:
      'Atomicity (all-or-nothing), Consistency (constraints/invariants hold), Isolation (concurrent transactions look serialized per isolation level), Durability (committed writes survive crashes). Write-Ahead Logging appends undo/redo records sequentially before dirty data pages flush.',
    trap: 'Sequential log appends are orders of magnitude faster than random B-Tree page writes on commit.',
  },
  {
    id: 'dbms-2',
    subject: 'DBMS',
    frequency: 'Very High',
    question: 'Why do databases use B+ Trees instead of Hash Indexes or B-Trees?',
    answer:
      'B+ Trees store row pointers only in linked leaf nodes, leaving internal nodes compact with high fan-out (3-4 levels for millions of rows). Linked leaves enable fast range scans (BETWEEN, >, ORDER BY) that hash indexes cannot support.',
    trap: 'Composite index (a, b) helps queries filtering on (a) or (a, b), NOT (b) alone (leftmost prefix rule).',
  },
  {
    id: 'dbms-3',
    subject: 'DBMS',
    frequency: 'High',
    question: 'Dirty Read vs Non-Repeatable Read vs Phantom Read (Isolation Levels)?',
    answer:
      'Dirty Read: reading uncommitted changes (prevented by Read Committed). Non-Repeatable Read: same row read twice shows updated values (prevented by Repeatable Read / MVCC snapshots). Phantom Read: new rows match a range predicate on re-query (prevented by Serializable / gap locks).',
    trap: 'PostgreSQL MVCC Repeatable Read actually prevents phantoms too via snapshot isolation, though write skew still needs Serializable.',
  },
  {
    id: 'dbms-4',
    subject: 'DBMS',
    frequency: 'High',
    question: 'Clustered vs Non-Clustered Index & Covering Index (Index-Only Scan)?',
    answer:
      'A Clustered Index physically orders table rows by the key (only 1 per table, e.g., InnoDB PK). A Non-Clustered index stores key → PK/row-pointer requiring a second lookup unless it is a Covering Index containing all SELECTed columns.',
    trap: 'Using random UUIDv4 as a Clustered PK causes B+ Tree page splits and fragmentation; prefer monotonic ULID/UUIDv7.',
  },
  {
    id: 'dbms-5',
    subject: 'DBMS',
    frequency: 'High',
    question: 'Pessimistic (SELECT FOR UPDATE / 2PL) vs Optimistic Concurrency Control?',
    answer:
      'Pessimistic locking acquires row locks before reading/updating (best under high contention like seat booking). Optimistic locking reads a version column and checks `UPDATE ... WHERE id=? AND version=?` at commit (best under low contention, zero lock waits).',
    trap: '2-Phase Locking prevents non-serializable schedules, whereas Optimistic retries on version mismatch.',
  },
  {
    id: 'dbms-6',
    subject: 'DBMS',
    frequency: 'Medium',
    question: 'Database Sharding vs Partitioning — and how to handle Hot Shards?',
    answer:
      'Partitioning splits a table within one DB instance (e.g., by month); Sharding distributes slices horizontally across independent servers. Mitigate celebrity/hot shards with composite shard keys + key salting (e.g., `user_id + hash%10`) or read-replica caching.',
    trap: 'Avoid distributed 2-Phase Commit (2PC) across shards on critical paths—use Saga / Outbox pattern for eventual consistency.',
  },
  {
    id: 'sql-1',
    subject: 'SQL Internals',
    frequency: 'Very High',
    question: 'What is the exact logical execution order of an SQL SELECT query?',
    answer:
      'FROM / JOIN → WHERE → GROUP BY → HAVING → SELECT (window functions run here) → DISTINCT → ORDER BY → LIMIT / OFFSET.',
    trap: 'You cannot reference a SELECT column alias inside WHERE because WHERE executes before SELECT; HAVING or a CTE solves it.',
  },
  {
    id: 'sql-2',
    subject: 'SQL Internals',
    frequency: 'High',
    question: 'DELETE vs TRUNCATE vs DROP — rollback, locks, and triggers?',
    answer:
      'DELETE is DML (row-by-row, fires triggers, keeps structure, rollbackable). TRUNCATE is DDL/deallocation (minimal logging, resets auto-increment, locks whole table, no per-row triggers). DROP removes data, schema, indexes, and permissions.',
    trap: 'Never use WHERE col NOT IN (SELECT nullable_col ...) — if the subquery yields a single NULL, the whole NOT IN evaluates to UNKNOWN (0 rows)! Use NOT EXISTS.',
  },
  {
    id: 'sql-3',
    subject: 'SQL Internals',
    frequency: 'High',
    question: 'WHERE vs HAVING & UNION vs UNION ALL — performance differences?',
    answer:
      'WHERE filters raw rows BEFORE grouping (can use indexes); HAVING filters groups AFTER aggregation. UNION sorts/hashes to deduplicate rows across result sets, while UNION ALL simply concatenates them in O(N) without deduplication overhead.',
    trap: 'Always default to UNION ALL when sets are disjoint or duplicates are fine.',
  },
  {
    id: 'net-1',
    subject: 'Networks',
    frequency: 'Very High',
    question: 'Walk through TCP 3-Way Handshake and why TIME_WAIT exists.',
    answer:
      'Client sends SYN(x) → Server sends SYN-ACK(x+1, y) → Client sends ACK(y+1). During close, the initiator waits 2*MSL in TIME_WAIT so duplicate delayed packets from the old socket die out and the peer receives the final ACK.',
    trap: 'Too many short-lived outbound connections can exhaust ephemeral ports via TIME_WAIT; use HTTP Keep-Alive / connection pooling.',
  },
  {
    id: 'net-2',
    subject: 'Networks',
    frequency: 'Very High',
    question: 'What happens end-to-end when you open https://example.com?',
    answer:
      'Browser/OS DNS cache lookup → recursive DNS query (UDP/53 or DoH) → TCP handshake (443) → TLS 1.3 handshake (key exchange + X.509 certificate verification) → HTTP request → server/CDN response → HTML/CSSOM/JS parse & paint.',
    trap: 'Asymmetric cryptography (RSA/ECDSA/ECDHE) only authenticates and agrees on keys; bulk traffic uses fast symmetric AES/ChaCha20.',
  },
  {
    id: 'net-3',
    subject: 'Networks',
    frequency: 'High',
    question: 'REST vs gRPC vs WebSockets vs SSE — when to pick each?',
    answer:
      'REST (HTTP/JSON): public APIs & cacheable CRUD. gRPC (HTTP/2 + Protobuf): low-latency internal microservices & streaming. WebSockets: full-duplex chat/gaming/collab editing. SSE: lightweight server → client live feeds over plain HTTP.',
    trap: 'WebSockets are stateful connections—load balancers need sticky sessions or shared pub/sub (Redis) across nodes.',
  },
  {
    id: 'net-4',
    subject: 'Networks',
    frequency: 'High',
    question: 'HTTP/1.1 vs HTTP/2 vs HTTP/3 (QUIC) — Head-of-Line Blocking?',
    answer:
      'HTTP/1.1 suffers application HoL blocking (1 active request per TCP connection unless pipelined). HTTP/2 multiplexes streams over 1 TCP socket, fixing HTTP HoL but still stalling on TCP packet loss. HTTP/3 uses UDP-based QUIC so each stream recovers packet loss independently.',
    trap: 'QUIC also combines transport + TLS 1.3 into a 1-RTT (or 0-RTT resumed) handshake.',
  },
  {
    id: 'net-5',
    subject: 'Networks',
    frequency: 'High',
    question: 'L4 vs L7 Load Balancer & XSS vs CSRF mitigation?',
    answer:
      'L4 LBs route raw TCP/UDP packets by IP:Port at extreme speed. L7 LBs terminate TLS/HTTP to route by URL path, headers, or cookies. Mitigate XSS with output escaping + strict CSP; mitigate CSRF with SameSite cookies + anti-CSRF tokens.',
    trap: 'HttpOnly stops JS (`document.cookie`) from reading session cookies during an XSS bug, while SameSite defends CSRF.',
  },
  {
    id: 'cpp-1',
    subject: 'C++ & OOPs',
    frequency: 'Very High',
    question: 'How do virtual functions, vptr, and vtable work under the hood?',
    answer:
      'Every polymorphic class generates a static vtable array of function pointers. Each object embeds a hidden vptr pointing to its dynamic class vtable. Virtual calls resolve dynamically via obj->vptr[slot](obj).',
    trap: 'Always declare base-class destructors virtual when deleting derived instances through base pointers, else derived resources leak (UB).',
  },
  {
    id: 'cpp-2',
    subject: 'C++ & OOPs',
    frequency: 'Very High',
    question: 'unique_ptr vs shared_ptr vs weak_ptr — internals and cycle trap?',
    answer:
      'unique_ptr gives zero-overhead exclusive ownership (move-only). shared_ptr manages a thread-safe atomic control block with strong & weak refcounts. weak_ptr observes without owning and must call lock() to safely acquire a temporary shared_ptr.',
    trap: 'Prefer make_shared<T>() over shared_ptr<T>(new T()): it merges control block + object into a single heap allocation.',
  },
  {
    id: 'cpp-3',
    subject: 'C++ & OOPs',
    frequency: 'High',
    question: 'Explain lvalues, rvalues, std::move, and Rule of Five.',
    answer:
      'lvalues have identifiable memory addresses; rvalues are temporaries about to expire. std::move casts an lvalue to an rvalue reference (T&&) so move constructors steal pointers in O(1) instead of deep-copying. If a class manages raw resources, define destructor, copy/move ctors, and copy/move assignment (Rule of 0/5).',
    trap: 'Never call std::move on a local return variable when NRVO/RVO applies—it disables copy elision!',
  },
  {
    id: 'cpp-4',
    subject: 'C++ & OOPs',
    frequency: 'High',
    question: 'Stack vs Heap memory & static keyword in C++?',
    answer:
      'Stack grows automatically per function call (LIFO, fast pointer bump, small size limit ~1–8MB). Heap uses malloc/new (flexible lifetime, slower allocator + fragmentation risk). static preserves lifetime across calls, limits file linkage, or shares class state across instances.',
    trap: 'Never return a reference or pointer to a local stack variable—it becomes a dangling reference immediately on return.',
  },
  {
    id: 'cpp-5',
    subject: 'C++ & OOPs',
    frequency: 'Very High',
    question: 'SOLID Principles in 60 seconds with concrete code intuition?',
    answer:
      'S: Single Responsibility (separate InvoicePrinter from InvoiceCalc). O: Open/Closed (extend behavior via Strategy interface without modifying switch statements). L: Liskov Substitution (Square shouldn’t break Rectangle height/width invariants). I: Interface Segregation (split fat interfaces). D: Dependency Inversion (depend on PaymentGateway interface, inject Stripe/Razorpay).',
    trap: 'Composition + Dependency Injection satisfies Open/Closed and Dependency Inversion simultaneously in machine coding rounds.',
  },
  {
    id: 'cpp-6',
    subject: 'C++ & OOPs',
    frequency: 'High',
    question: 'How does std::vector grow & why is push_back O(1) amortized?',
    answer:
      'When size == capacity, vector allocates a new buffer typically 1.5x or 2x larger, moves/copies existing elements (using noexcept move if available), and frees old storage. Across N pushes, geometric doubling moves O(1 + 2 + 4 + ... + N) = O(2N) elements total → O(1) amortized per push.',
    trap: 'Mark move constructors `noexcept` so std::vector moves instead of falling back to slow deep copies during reallocation!',
  },
  {
    id: 'sd-1',
    subject: 'System Design',
    frequency: 'Very High',
    question: 'Explain CAP Theorem & PACELC with real database examples.',
    answer:
      'During a network Partition (P), choose Consistency (CP: ZooKeeper, etcd, HBase) or Availability (AP: Cassandra, DynamoDB). PACELC adds: Else (no partition), trade Latency vs Consistency (e.g., async replication stays fast, sync replication prioritizes strong reads).',
    trap: 'Even an RDBMS with primary + read replicas behaves as eventual consistency on replica reads unless pinned to primary.',
  },
  {
    id: 'sd-2',
    subject: 'System Design',
    frequency: 'Very High',
    question: 'Cache-Aside vs Write-Through vs Write-Back & Cache Stampede?',
    answer:
      'Cache-Aside: app reads cache, loads DB on miss, populates cache. Write-Through: synchronous write to cache + DB. Write-Back: write cache now, flush DB asynchronously (fastest, crash loss risk). Cache Stampede happens when a hot key expires and 1000 requests hit DB at once—mitigate with singleflight locks, jittered TTLs, or early refresh.',
    trap: 'Set eviction policies (LRU/LFU) and TTLs explicitly so Redis never OOMs or serves stale state forever.',
  },
  {
    id: 'sd-3',
    subject: 'System Design',
    frequency: 'High',
    question: 'How does Consistent Hashing work and why use Virtual Nodes?',
    answer:
      'Keys and servers hash onto a 0..2^32-1 ring; each key maps clockwise to the first server. Adding/removing a server moves only ~K/N keys instead of rehashing everything. Virtual nodes give each physical machine multiple ring points to avoid uneven hotspots.',
    trap: 'Weighted virtual nodes let beefier machines carry proportionally higher shard traffic.',
  },
  {
    id: 'sd-4',
    subject: 'System Design',
    frequency: 'Very High',
    question: 'How do Message Queues (Kafka) achieve ordering, scale, and reliability?',
    answer:
      'Topics split into ordered Partitions replicated across brokers (ISR). Key-based partitioning guarantees strict ordering per user/order ID. Consumer Groups assign at most 1 consumer per partition for parallel horizontal scaling, committing offsets after idempotent processing.',
    trap: 'At-least-once delivery means duplicates CAN arrive after consumer crashes—always pair handlers with idempotency keys.',
  },
  {
    id: 'sd-5',
    subject: 'System Design',
    frequency: 'High',
    question: 'How does Quorum Replication (N, W, R) give Tunable Consistency?',
    answer:
      'Store data across N replicas; writes succeed after W acks, reads query R replicas. Choosing W + R > N guarantees the read quorum overlaps with the latest write quorum (strong read-after-write via highest vector clock/timestamp + read repair).',
    trap: 'Setting W=1, R=N optimizes ultra-fast writes; W=N, R=1 optimizes read-heavy low latency; W+R <= N gives eventual consistency.',
  },
];

export const PATTERN_PLAYBOOK: PatternPlaybookItem[] = [
  {
    id: 'sliding-window',
    pattern: 'Sliding Window & Two Pointers',
    triggerSignals: ['Contiguous subarray / substring', 'Longest/shortest with condition', 'Sorted pair / triplet sum'],
    complexity: 'O(N) time • O(1) or O(K) space',
    templateSnippet: `int l = 0, best = 0;
for (int r = 0; r < (int)nums.size(); ++r) {
  // expand window with nums[r]
  while (windowInvalid()) {
    // shrink nums[l++]
  }
  best = max(best, r - l + 1);
}`,
    pitfall: 'Works cleanly only when expanding hurts and shrinking restores validity (monotonicity); negative numbers break fixed-sign sum windows—use Prefix Sum + HashMap instead.',
    topicKeywords: ['Sliding Window', 'Two Pointers', 'Substring'],
  },
  {
    id: 'prefix-hashmap',
    pattern: 'Prefix Sum + HashMap',
    triggerSignals: ['Subarray sum equals K (with negatives)', 'Count subarrays divisible by K', 'Equal 0s and 1s'],
    complexity: 'O(N) time • O(N) space',
    templateSnippet: `unordered_map<long long, int> freq = {{0, 1}};
long long pref = 0, ans = 0;
for (int x : nums) {
  pref += x;
  ans += freq[pref - k];
  freq[pref]++;
}`,
    pitfall: 'Always initialize freq[0] = 1 so subarrays starting from index 0 are counted, and use long long for cumulative sums.',
    topicKeywords: ['Arrays and Hashing', 'Prefix', 'Subarray', 'Two Sum'],
  },
  {
    id: 'binary-search-ans',
    pattern: 'Binary Search on Answer Space',
    triggerSignals: ['Minimize maximum / maximize minimum', 'Monotonic check(mid) feasibility', 'Rotated sorted array'],
    complexity: 'O(N log(Range)) time • O(1) space',
    templateSnippet: `long long lo = minVal, hi = maxVal, ans = hi;
while (lo <= hi) {
  long long mid = lo + (hi - lo) / 2;
  if (feasible(mid)) { ans = mid; hi = mid - 1; }
  else lo = mid + 1;
}`,
    pitfall: 'Double-check invariant bounds (inclusive [lo, hi]) and overflow in mid calculation.',
    topicKeywords: ['Binary Search', 'Search'],
  },
  {
    id: 'monotonic-stack',
    pattern: 'Monotonic Stack',
    triggerSignals: ['Next greater / smaller element', 'Histogram largest rectangle', 'Daily temperatures / stock span'],
    complexity: 'O(N) amortized time • O(N) space',
    templateSnippet: `stack<int> st; // store indices!
for (int i = 0; i < n; ++i) {
  while (!st.empty() && a[st.top()] < a[i]) {
    ans[st.top()] = a[i];
    st.pop();
  }
  st.push(i);
}`,
    pitfall: 'Store indices (not values) in the stack so distance/width calculations work cleanly.',
    topicKeywords: ['Stack', 'Monotonic', 'Parentheses', 'Histogram'],
  },
  {
    id: 'intervals-sweep',
    pattern: 'Merge Intervals & Sweep Line',
    triggerSignals: ['Merge overlapping ranges', 'Minimum meeting rooms / platforms', 'Burst balloons / arrows'],
    complexity: 'O(N log N) time • O(N) space',
    templateSnippet: `sort(intervals.begin(), intervals.end());
vector<vector<int>> res;
for (const auto& iv : intervals) {
  if (res.empty() || res.back()[1] < iv[0]) res.push_back(iv);
  else res.back()[1] = max(res.back()[1], iv[1]);
}`,
    pitfall: 'Decide upfront whether touching endpoints `[1, 3]` & `[3, 5]` count as overlapping (`<=` vs `<`), and sort by END time for greedy non-overlapping selection.',
    topicKeywords: ['Intervals', 'Greedy', 'Merge'],
  },
  {
    id: 'heap-topk',
    pattern: 'Two Heaps / Top-K Priority Queue',
    triggerSignals: ['K-th largest / smallest', 'Merge K sorted lists', 'Running median / greedy scheduling'],
    complexity: 'O(N log K) time • O(K) space',
    templateSnippet: `priority_queue<int, vector<int>, greater<int>> minHeap;
for (int x : nums) {
  minHeap.push(x);
  if ((int)minHeap.size() > k) minHeap.pop();
}`,
    pitfall: 'Remember C++ priority_queue is MAX-heap by default! Top-K largest needs a MIN-heap of size K.',
    topicKeywords: ['Heap', 'Priority Queue', 'Kth', 'Merge K'],
  },
  {
    id: 'graph-bfs-topo',
    pattern: 'BFS / Topological Sort / Grid Traversal',
    triggerSignals: ['Shortest path unweighted', 'Course prerequisites / DAG order', 'Connected components / islands'],
    complexity: 'O(V + E) time • O(V + E) space',
    templateSnippet: `// Kahn's Topological Sort
queue<int> q;
for (int i = 0; i < n; ++i) if (indeg[i] == 0) q.push(i);
while (!q.empty()) {
  int u = q.front(); q.pop();
  for (int v : adj[u]) if (--indeg[v] == 0) q.push(v);
}`,
    pitfall: 'Mark BFS nodes visited when PUSHING onto the queue, not when popping—otherwise duplicates explode memory.',
    topicKeywords: ['Graphs', 'Islands', 'Course Schedule'],
  },
  {
    id: 'dsu-union-find',
    pattern: 'Union-Find (Disjoint Set Union)',
    triggerSignals: ['Dynamic connectivity / edges added', 'Cycle detection in undirected graph', 'Kruskal MST / Accounts Merge'],
    complexity: 'O(α(N)) ≈ O(1) per union/find',
    templateSnippet: `struct DSU {
  vector<int> p, sz;
  DSU(int n) : p(n), sz(n, 1) { iota(p.begin(), p.end(), 0); }
  int find(int x) { return p[x] == x ? x : p[x] = find(p[x]); }
  bool unite(int a, int b) {
    a = find(a); b = find(b);
    if (a == b) return false;
    if (sz[a] < sz[b]) swap(a, b);
    p[b] = a; sz[a] += sz[b];
    return true;
  }
};`,
    pitfall: 'Check `if (a == b) return false` BEFORE merging `sz[a] += sz[b]`, otherwise component size doubles on self-loops.',
    topicKeywords: ['Graphs', 'Union', 'Connected', 'Cycle'],
  },
  {
    id: 'dijkstra-shortest',
    pattern: 'Dijkstra & Weighted Shortest Path',
    triggerSignals: ['Non-negative edge weights min cost', 'Network delay / Cheapest flights', 'Min-effort grid path'],
    complexity: 'O((V + E) log V) time • O(V + E) space',
    templateSnippet: `using P = pair<long long, int>;
priority_queue<P, vector<P>, greater<P>> pq;
vector<long long> dist(n, LLONG_MAX);
dist[src] = 0; pq.push({0, src});
while (!pq.empty()) {
  auto [d, u] = pq.top(); pq.pop();
  if (d > dist[u]) continue; // skip stale entry!
  for (auto [v, w] : adj[u])
    if (d + w < dist[v]) pq.push({dist[v] = d + w, v});
}`,
    pitfall: 'Never omit `if (d > dist[u]) continue;` and never use Dijkstra when negative weights exist (use Bellman-Ford / SPFA instead).',
    topicKeywords: ['Graphs', 'Dijkstra', 'Path'],
  },
  {
    id: 'trees-lca-dp',
    pattern: 'Binary Trees, Post-Order Info & LCA',
    triggerSignals: ['Diameter / Max path sum / Balanced tree', 'Lowest Common Ancestor', 'Serialize / Build from preorder+inorder'],
    complexity: 'O(N) time • O(H) stack space',
    templateSnippet: `TreeNode* lca(TreeNode* root, TreeNode* p, TreeNode* q) {
  if (!root || root == p || root == q) return root;
  TreeNode* L = lca(root->left, p, q);
  TreeNode* R = lca(root->right, p, q);
  return (L && R) ? root : (L ? L : R);
}`,
    pitfall: 'For Diameter / Max Path Sum, the function returns the best SINGLE branch upward while updating the global V-shaped answer inside!',
    topicKeywords: ['Trees', 'Binary Tree', 'BST'],
  },
  {
    id: 'trie-prefix',
    pattern: 'Trie (Prefix Tree) & Search Dict',
    triggerSignals: ['Autocomplete / startsWith prefix', 'Word Search II on board', 'Maximum XOR of two numbers (Bit Trie)'],
    complexity: 'O(L) insert/search per word',
    templateSnippet: `struct TrieNode {
  TrieNode* ch[26] = {};
  bool isEnd = false;
};
void insert(TrieNode* cur, const string& s) {
  for (char c : s) {
    if (!cur->ch[c - 'a']) cur->ch[c - 'a'] = new TrieNode();
    cur = cur->ch[c - 'a'];
  }
  cur->isEnd = true;
}`,
    pitfall: 'In Word Search II, prune/delete leaf counts in the Trie as words are found so repeated grid DFS doesn’t TLE.',
    topicKeywords: ['Trie', 'Word', 'Prefix'],
  },
  {
    id: 'dp-recipes',
    pattern: 'Dynamic Programming Recipes',
    triggerSignals: ['Count ways / min cost / max profit', 'Overlapping subproblems', 'Choices: take/skip, partitions, grids'],
    complexity: 'O(States × Transitions)',
    templateSnippet: `// Always define before coding:
// 1. Meaning of dp[i] (or dp[i][cap])
// 2. Base case (dp[0])
// 3. Transition & iteration order (0/1 vs Unbounded!)`,
    pitfall: '0/1 Knapsack iterates capacity BACKWARDS (for c = W..w); Unbounded Knapsack / Coin Change iterates FORWARDS.',
    topicKeywords: ['Dynamic Programming', 'DP', 'Stairs', 'House Robber'],
  },
  {
    id: 'backtracking-bitmask',
    pattern: 'Backtracking & Pruning',
    triggerSignals: ['Small N (<= 20)', 'Generate all subsets / permutations / combinations', 'Word search / N-Queens'],
    complexity: 'O(2^N) or O(N!) time',
    templateSnippet: `void dfs(int start, vector<int>& path) {
  res.push_back(path);
  for (int i = start; i < n; ++i) {
    if (i > start && nums[i] == nums[i - 1]) continue; // dedup
    path.push_back(nums[i]);
    dfs(i + 1, path);
    path.pop_back();
  }
}`,
    pitfall: 'Sort input first and skip `if (i > start && a[i] == a[i-1])` to eliminate duplicate combinations without extra sets.',
    topicKeywords: ['Backtracking', 'Subsets', 'Permutations'],
  },
  {
    id: 'bit-tricks',
    pattern: 'Bit Manipulation & XOR Algebra',
    triggerSignals: ['Single number appearing once', 'Power of 2 / count set bits', 'Submask / subset enumeration (N <= 18)'],
    complexity: 'O(1) bitwise / O(3^N) submask loop',
    templateSnippet: `// x & -x            -> isolate lowest set bit
// x & (x - 1)       -> clear lowest set bit
// __builtin_popcount(x) -> count set bits in O(1)
for (int sub = mask; sub; sub = (sub - 1) & mask) {
  // visits every non-empty submask in O(3^n) total!
}`,
    pitfall: 'Never shift signed `1 << 31` in C++ (undefined behavior); always write `1ULL << k` or `1LL << k` for shifts >= 31.',
    topicKeywords: ['Bit Manipulation', 'XOR', 'Bits'],
  },
];

export const SYSTEM_DESIGN_BLUEPRINTS: SystemDesignBlueprint[] = [
  {
    id: 'hld-url',
    kind: 'HLD',
    title: 'Design a URL Shortener (TinyURL)',
    scope: '100M writes/mo • 10:1 read-heavy • <10ms redirect latency',
    coreComponents: [
      'API Gateway + Rate Limiter',
      'Distributed ID Generator (Snowflake / ZooKeeper Range Allocator)',
      'Base62 Encoder (7 chars -> 62^7 ≈ 3.5T keys)',
      'Redis Hot Cache (80/20 rule) + Sharded DB (Cassandra/Postgres)',
    ],
    deepDive:
      'Use HTTP 301 (permanent, browser caches, lowers origin load) vs HTTP 302 (temporary, hits backend every time—required if tracking click analytics!). Partition database by shortCode hash so lookups never cross shards.',
    tradeoffs: 'Random hash + collision retry vs pre-allocated ID ranges (zero DB collision check overhead).',
    followUpQuestion: 'How do you handle custom vanity aliases safely under race conditions?',
  },
  {
    id: 'hld-ratelimit',
    kind: 'HLD',
    title: 'Design a Distributed Rate Limiter',
    scope: 'Sub-millisecond check • Multi-region API nodes • Burst tolerance',
    coreComponents: [
      'API Gateway Middleware',
      'Token Bucket or Sliding Window Counter in Redis',
      'Atomic Redis Lua Script (avoid read-then-write race)',
      '429 Retry-After + X-RateLimit-Remaining headers',
    ],
    deepDive:
      'Token Bucket fits bursty APIs cleanly while Sliding Window Log guarantees exact boundary accuracy (higher memory). Execute check-and-decrement inside a single Redis Lua script so concurrent requests stay race-free.',
    tradeoffs: 'Fail-open (allow traffic if Redis goes down to protect availability) vs Fail-closed (strict security endpoints).',
    followUpQuestion: 'What if Redis shards across multiple data centers—eventual sync vs sticky routing?',
  },
  {
    id: 'hld-chat',
    kind: 'HLD',
    title: 'Design Real-Time Chat / Presence (WhatsApp)',
    scope: 'Persistent 1:1 & small groups • Delivery receipts • Offline sync',
    coreComponents: [
      'WebSocket Stateful Chat Servers',
      'Redis Pub/Sub Message Router + Presence Heartbeat TTL',
      'Sequence ID Service + Cassandra/Dynamo partitioned by (chat_id, msg_id)',
      'Push Notification Worker (APNs/FCM) for offline users',
    ],
    deepDive:
      'Maintain a User→Gateway mapping in Redis. When A sends to B, A’s gateway persists message with monotonic chat_id sequence, then routes via Pub/Sub to B’s gateway (or queues push notification if B is offline).',
    tradeoffs: 'Pull-based presence vs WebSocket heartbeat; group fan-out works cleanly in-memory for <500 members.',
    followUpQuestion: 'How do you guarantee exact message ordering across devices when clocks drift?',
  },
  {
    id: 'hld-feed',
    kind: 'HLD',
    title: 'Design News Feed / Social Timeline (Twitter / X)',
    scope: '300M DAU • Celebrity hot-key reads • <200ms timeline load',
    coreComponents: [
      'Hybrid Fan-out Service (Push for normal users, Pull for celebrities >100k followers)',
      'Redis Lists caching top ~500 post IDs per active home timeline',
      'Post Metadata DB + Media Object Store (S3) behind CDN',
      'Kafka async pipeline decoupling tweet write from fan-out workers',
    ],
    deepDive:
      'Pure fan-out-on-write stalls when a celebrity with 50M followers tweets; pure fan-out-on-read stalls timeline rendering. Hybrid pushes post IDs into followers’ Redis feeds for normal authors, and merges celebrity posts on read.',
    tradeoffs: 'Cursor pagination (`created_at < cursor`) avoids offset drift as new posts arrive.',
    followUpQuestion: 'How do you invalidate a deleted or edited post already pushed to millions of Redis timeline lists?',
  },
  {
    id: 'hld-notif',
    kind: 'HLD',
    title: 'Design Scalable Notification & Delayed Job Engine',
    scope: 'Multi-channel (Email/SMS/Push) • Retries/DLQ • Priority lanes',
    coreComponents: [
      'Notification API + User Preference & Rate-Cap Check',
      'Priority Kafka Topics (OTP Urgent vs Marketing Batch)',
      'Channel Workers (FCM / SES / Twilio) with Exponential Backoff + DLQ',
      'Redis Idempotency Dedupe Store + Template Service',
    ],
    deepDive:
      'Isolate transactional OTPs onto dedicated high-priority queues so bulk promotional blasts never starve verification emails. Enforce per-request idempotency keys to guarantee users never receive duplicate SMS alerts on worker retry.',
    tradeoffs: 'At-least-once delivery + deduplication window vs strict single attempt.',
    followUpQuestion: 'How do you schedule 10M reminders to fire accurately at 9:00 AM user local time?',
  },
  {
    id: 'hld-snowflake',
    kind: 'HLD',
    title: 'Design Distributed Unique ID Generator (Snowflake)',
    scope: 'Time-sortable 64-bit IDs • 1M+ IDs/sec/node • Zero central DB bottleneck',
    coreComponents: [
      '64-bit Layout: 1 sign + 41 timestamp ms + 10 datacenter/worker ID + 12 sequence',
      'Worker ID lease via ZooKeeper/etcd at startup',
      'Local Atomic Sequence Counter generating 4096 IDs/ms per machine',
    ],
    deepDive:
      'Because the high bits are epoch timestamp milliseconds, Snowflake IDs are roughly time-ordered—meaning B+ Tree database primary keys append sequentially at the rightmost leaf instead of fragmenting index pages.',
    tradeoffs: 'Clocks can drift backwards via NTP—reject or wait briefly if `now < lastTimestamp` before issuing IDs.',
    followUpQuestion: 'What happens to sortable IDs if NTP jumps a worker clock backward by 50ms?',
  },
  {
    id: 'lld-lru',
    kind: 'LLD',
    title: 'Thread-Safe LRU Cache & O(1) Operations',
    scope: 'O(1) get & put • Capacity eviction • Concurrency safety',
    coreComponents: [
      'Doubly Linked List (std::list) tracking recency order',
      'HashMap (key -> list iterator) for O(1) lookup',
      'std::mutex / shared_mutex (or sharded buckets for high throughput)',
    ],
    deepDive:
      'On get(k): look up iterator in hash map, call list.splice() to move node to front in O(1). On put(k,v): update or insert at front; if full, pop_back() and erase tail key from map. Shard into 16/64 hash stripes to minimize mutex contention.',
    tradeoffs: 'LFU needs frequency buckets + minFreq pointer; LRU is simpler and handles temporal locality well.',
    followUpQuestion: 'How would you extend this to add per-key TTL expiration without scanning all entries?',
  },
  {
    id: 'lld-booking',
    kind: 'LLD',
    title: 'BookMyShow / Inventory Seat Locking System',
    scope: 'Zero double-booking • 10-minute temporary holds • High read-to-write',
    coreComponents: [
      'Show, Screen, Seat, SeatLock, Booking, Payment Entities',
      'Distributed Lease / DB Row Lock (`SELECT FOR UPDATE`) or Redis `SET NX EX 600`',
      'BookingStateMachine (CREATED → HELD → CONFIRMED / EXPIRED)',
    ],
    deepDive:
      'Lock selected seat IDs in deterministic sorted order (prevents deadlocks when two users select {A1, A2} and {A2, A1} simultaneously!). Store temporary lock TTL in Redis or `locked_until` timestamp so abandoned checkouts release automatically.',
    tradeoffs: 'Optimistic version checks + DB unique constraint `(show_id, seat_id)` as final safety net.',
    followUpQuestion: 'What happens if the payment webhook arrives 2 seconds after the 10-minute seat lock expired?',
  },
  {
    id: 'lld-machine',
    kind: 'LLD',
    title: 'Machine Coding Patterns (Parking Lot / Splitwise)',
    scope: 'Clean OOP • Extensible pricing/splitting • Concurrency & SOLID',
    coreComponents: [
      'Domain Entities (Vehicle, Spot, Ticket, Receipt / Expense, Split)',
      'Strategy Pattern (PricingStrategy / SplitValidator: Exact, Percent, Equal)',
      'Factory + Repository Separation (decouple storage from rules)',
    ],
    deepDive:
      'Keep entities slim and push business rules into Strategy interfaces so adding ElectricSpotPricing or HourlyCap requires zero edits to ParkingLot. Always lock spot allocation atomically (or optimistic version column in DB).',
    tradeoffs: 'Avoid over-engineering deep inheritance trees—prefer composition over inheritance.',
    followUpQuestion: 'How do you prevent two entrance gates from assigning the exact same spot concurrently?',
  },
];

export const HLD_FRAMEWORK_STEPS = [
  { letter: 'R', title: 'Requirements & Scope (4m)', desc: 'Clarify functional flows, non-functional targets (Latency, Availability vs Consistency), and DAU.' },
  { letter: 'E', title: 'Estimations & Scale (3m)', desc: 'Compute Read/Write QPS, peak 3x spike, daily storage, and cache memory (80/20 rule).' },
  { letter: 'A', title: 'API & Data Model (5m)', desc: 'Define core REST/RPC endpoints, entities, primary/shard keys, and SQL vs NoSQL choice.' },
  { letter: 'D', title: 'High-Level Design (10m)', desc: 'Draw Client → LB → Gateway → Services → Cache/Queue/DB end-to-end and walk happy paths.' },
  { letter: 'D+', title: 'Deep Dives & Bottlenecks (15m)', desc: 'Proactively tackle SPOFs, sharding hot keys, idempotency, caching invalidation, and backpressure.' },
];

export const LATENCY_NUMBERS = [
  { label: 'L1 / L2 Cache Reference', value: '0.5 – 7 ns' },
  { label: 'Main Memory (RAM) Reference', value: '~100 ns' },
  { label: 'Redis / Memcached (Same AZ)', value: '~0.5 – 1 ms' },
  { label: 'NVMe SSD Random Read', value: '~100 µs' },
  { label: 'Intra-Datacenter Round Trip', value: '~0.5 ms' },
  { label: 'Cross-Continent Internet RTT', value: '80 – 150 ms' },
  { label: '1M Requests / Day', value: '~12 QPS avg (~35 peak)' },
  { label: '100M Users × 1 KB/day', value: '~100 GB/day (~36 TB/yr)' },
];

export const STL_CHEATSHEET: StlCheatsheetItem[] = [
  {
    name: 'std::vector<T>',
    ops: 'Index O(1) • push_back O(1) amort. • insert/erase mid O(N)',
    whenToUse: 'Default sequential container (cache-friendly contiguous RAM).',
    gotcha: 'Reallocation invalidates pointers & iterators; call reserve(n) when size is known.',
  },
  {
    name: 'std::unordered_map<K, V>',
    ops: 'Avg O(1) Lookup/Insert • Worst-case O(N) on collisions',
    whenToUse: 'Frequency maps, prefix sums, Two Sum, graph adjacency lookups.',
    gotcha: 'Adversarial tests can blow up default hash—add custom splitmix64 hash on tight TLE limits.',
  },
  {
    name: 'std::map / std::set',
    ops: 'Insert/Erase/Find/lower_bound O(log N)',
    whenToUse: 'Need sorted order, predecessor/successor, or range erasing.',
    gotcha: 'Use m.lower_bound(x), NOT std::lower_bound(m.begin(), m.end(), x) which runs in O(N)!',
  },
  {
    name: 'std::priority_queue<T>',
    ops: 'top() O(1) • push/pop O(log N)',
    whenToUse: 'Dijkstra, Top-K elements, Merge K Lists, Greedy intervals.',
    gotcha: 'Max-heap by default. Min-heap: priority_queue<int, vector<int>, greater<int>>.',
  },
  {
    name: 'std::deque<T>',
    ops: 'push/pop both ends O(1) • Random access O(1)',
    whenToUse: 'Sliding window maximum, 0-1 BFS (push_front on weight 0, push_back on weight 1).',
    gotcha: 'Not contiguous in memory like vector; higher constant factor if you only push_back.',
  },
  {
    name: 'std::sort / std::nth_element',
    ops: 'sort O(N log N) • nth_element O(N) average',
    whenToUse: 'Sorting intervals, K-th smallest/closest points without full sort.',
    gotcha: 'Comparator MUST be strict weak ordering (`a < b`, never `a <= b` or segfaults happen!).',
  },
  {
    name: 'std::bitset<N>',
    ops: 'Bitwise AND/OR/count in O(N / 64)',
    whenToUse: 'Subset sum booleans, fast graph reachability when N <= 10^4.',
    gotcha: 'Size N must be compile-time constant (pick upper constraint bound).',
  },
  {
    name: 'Binary Search Helpers',
    ops: 'O(log N) on sorted random-access range',
    whenToUse: 'lower_bound (>= x) and upper_bound (> x). Count of x = upper - lower.',
    gotcha: 'Write mid = lo + (hi - lo) / 2 and cast intermediate products to 1LL to prevent overflow.',
  },
];

export const CPP_INTERVIEW_SNIPPETS = [
  {
    id: 'fast-io',
    title: 'Fast I/O + Safe Anti-Hack unordered_map',
    code: `struct CustomHash {
  size_t operator()(uint64_t x) const {
    x += 0x9e3779b97f4a7c15ULL;
    x = (x ^ (x >> 30)) * 0xbf58476d1ce4e5b9ULL;
    x = (x ^ (x >> 27)) * 0x94d049bb133111ebULL;
    return x ^ (x >> 31);
  }
};
unordered_map<long long, int, CustomHash> mp;`,
  },
  {
    id: 'custom-pq',
    title: 'Custom Min-Heap Comparator for Structs / Pairs',
    code: `struct Node { int cost, id; };
auto cmp = [](const Node& a, const Node& b) {
  return a.cost > b.cost; // NOTE: true means 'a' has LOWER priority!
};
priority_queue<Node, vector<Node>, decltype(cmp)> pq(cmp);`,
  },
];

export const CPP_COMMON_BUGS = [
  { bug: '`i <= vec.size() - 1` when `vec` is empty', fix: 'Unsigned size_t `0 - 1` underflows to `1.8e19`! Cast `(int)vec.size()` or write `i < vec.size()`.' },
  { bug: 'Returning `abs(INT_MIN)` in 32-bit `int`', fix: '`-(-2147483648)` overflows signed 32-bit int! Cast to `long long` before negating.' },
  { bug: 'Using `s = s + char` inside a loop', fix: 'Prefer `s += ch` or `s.push_back(ch)` — `s = s + ch` copies the whole string making loops O(N^2).' },
  { bug: 'Comparator returning `a.x <= b.x`', fix: 'Violates strict weak ordering; std::sort walks past array bounds and segfaults.' },
];

export const CONSTRAINT_SCALE_TABLE: ConstraintScaleRow[] = [
  { constraint: 'N <= 10 – 12', maxComplexity: 'O(N!) or O(2^N)', typicalAlgo: 'Permutations, Backtracking' },
  { constraint: 'N <= 20 – 22', maxComplexity: 'O(N · 2^N)', typicalAlgo: 'Bitmask DP, Meet-in-the-Middle' },
  { constraint: 'N <= 400 – 1,000', maxComplexity: 'O(N^2)', typicalAlgo: '2D DP, Floyd-Warshall, Pair Loops' },
  { constraint: 'N <= 10^5 – 5·10^5', maxComplexity: 'O(N log N)', typicalAlgo: 'Sort, Heap, Segment Tree, Binary Search' },
  { constraint: 'N <= 10^6 – 10^7', maxComplexity: 'O(N)', typicalAlgo: 'Two Pointers, Sliding Window, HashMap' },
  { constraint: 'N <= 10^9 – 10^18', maxComplexity: 'O(log N) or O(1)', typicalAlgo: 'Binary Search on Answer, Math, Matrix Exp' },
];

export const SQL_PATTERNS: SqlPatternItem[] = [
  {
    title: 'Nth Highest / Top-K Per Group (Window Functions)',
    syntax: `WITH ranked AS (
  SELECT *, DENSE_RANK() OVER (PARTITION BY dept_id ORDER BY salary DESC) AS rnk
  FROM Employees
)
SELECT * FROM ranked WHERE rnk <= 3;`,
    gotcha: 'ROW_NUMBER gives 1,2,3 (breaks ties arbitrarily); RANK gives 1,1,3; DENSE_RANK gives 1,1,2.',
  },
  {
    title: 'Running Totals & Previous Row Comparison',
    syntax: `SELECT order_date, amount,
  SUM(amount) OVER (ORDER BY order_date) AS running_total,
  LAG(amount, 1, 0) OVER (ORDER BY order_date) AS prev_amount
FROM Orders;`,
    gotcha: 'Adding PARTITION BY resets the window per user/category cleanly.',
  },
  {
    title: 'Safe Anti-Join (Find Missing Records Without NULL Bug)',
    syntax: `SELECT c.id, c.name
FROM Customers c
WHERE NOT EXISTS (
  SELECT 1 FROM Orders o WHERE o.customer_id = c.id
);`,
    gotcha: 'NOT IN returns 0 rows if any subquery value is NULL! Prefer NOT EXISTS or LEFT JOIN ... IS NULL.',
  },
  {
    title: 'Conditional Aggregation (Pivot / Conversion Rate)',
    syntax: `SELECT user_id,
  SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) AS accepted_cnt,
  ROUND(AVG(CASE WHEN status = 'accepted' THEN 1.0 ELSE 0.0 END), 2) AS accept_rate
FROM Submissions
GROUP BY user_id;`,
    gotcha: 'Multiply by 1.0 (or CAST AS REAL) before division in SQLite/Postgres to avoid integer truncation (1/2 = 0).',
  },
  {
    title: 'Consecutive Days / Streaks (Gaps & Islands)',
    syntax: `WITH grouped AS (
  SELECT user_id, login_date,
    julianday(login_date) - ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY login_date) AS grp
  FROM (SELECT DISTINCT user_id, login_date FROM Logins)
)
SELECT user_id, COUNT(*) AS streak_len
FROM grouped GROUP BY user_id, grp;`,
    gotcha: 'Deduplicate multiple logins on the same date BEFORE assigning ROW_NUMBER(), or same-day rows break the streak math.',
  },
  {
    title: 'Self-Join & Hierarchical Org Tree (Recursive CTE)',
    syntax: `WITH RECURSIVE org AS (
  SELECT id, name, manager_id, 0 AS depth FROM Employees WHERE manager_id IS NULL
  UNION ALL
  SELECT e.id, e.name, e.manager_id, o.depth + 1
  FROM Employees e JOIN org o ON e.manager_id = o.id
)
SELECT * FROM org;`,
    gotcha: 'Remember to cap depth or track visited IDs if data can accidentally contain cycles.',
  },
];

export const BRAIN_TEASERS: BrainTeaserItem[] = [
  {
    id: 'bt-eggs',
    category: 'Logic',
    title: '2 Eggs & 100-Story Building (Worst-Case Min Drops)',
    prompt: 'You have 2 identical eggs and a 100-floor building. Find the highest safe floor minimizing worst-case drops.',
    hint: 'Decrease step sizes by 1 after every non-breaking drop so worst-case total remains constant: x + (x-1) + ... + 1 >= 100.',
    solution: '14 drops! Drop Egg 1 at floors 14, 27, 39, 50, 60, 69, 77, 84, 90, 95, 99, 100. If Egg 1 breaks at floor 14, Egg 2 checks floors 1..13 (max 1+13 = 14 drops). At any breakpoint k, total drops stays <= 14.',
  },
  {
    id: 'bt-horses',
    category: 'Logic',
    title: '25 Horses — Find Top 3 Fastest (No Stopwatch)',
    prompt: '25 horses race on a 5-lane track (no timer). Minimum races needed to know the exact 1st, 2nd, and 3rd fastest horses?',
    hint: 'Race 5 groups first, then race the 5 winners together to eliminate hopeless horses.',
    solution: '7 races! Races 1..5 find top-3 of each group. Race 6 races the 5 winners (say A1 > B1 > C1 > D1 > E1). Only 5 candidates remain for 2nd & 3rd place: {A2, A3, B1, B2, C1}. Race 7 races those 5!',
  },
  {
    id: 'bt-wine',
    category: 'Bitwise / Math',
    title: '1000 Wine Bottles & 1 Poisoned (Binary Encoding)',
    prompt: '1000 bottles, 1 poisoned (kills tester after 24h). What is the minimum number of testers to identify it in 24 hours?',
    hint: 'A tester can either live (0) or die (1) after 24 hours — each tester represents 1 bit!',
    solution: '10 testers! Since 2^10 = 1024 >= 1000, label bottles 0..999 in 10-bit binary and give bottle i to tester k iff bit k of i is 1. Read the dead testers as a 10-bit integer to reveal the exact bottle.',
  },
  {
    id: 'bt-ropes',
    category: 'Logic',
    title: 'Burn 2 Non-Uniform 60-Min Ropes to Measure 45 Minutes',
    prompt: 'Two ropes each take 60 minutes to burn completely, but burn at non-uniform rates. Measure exactly 45 minutes.',
    hint: 'Lighting a rope from BOTH ends halves its remaining burn time regardless of density.',
    solution: 'At t=0, light Rope A at BOTH ends AND Rope B at ONE end. Rope A finishes in 30 mins. Immediately light Rope B’s second end — its remaining 30 minutes burns out in 15 mins → 30 + 15 = 45 minutes!',
  },
  {
    id: 'bt-coin',
    category: 'Probability',
    title: 'Expected Coin Flips Until Consecutive Heads (HH)',
    prompt: 'Fair coin tossed repeatedly until you see two Heads in a row (HH). What is the expected number of tosses?',
    hint: 'Let E be expected tosses from start. Condition on 1st flip: Tails wastes 1 flip (back to E); Heads puts you 1 step closer.',
    solution: '6 tosses! Wait state E = 0.5*(1 + E) [got T] + 0.5*(0.5*(2 + 0) [got HH] + 0.5*(2 + E) [got HT]). Solving: E = 0.5 + 0.5E + 0.5 + 0.5 + 0.25E → 0.25E = 1.5 → E = 6.',
  },
  {
    id: 'bt-monty',
    category: 'Probability',
    title: 'Monty Hall 3 Doors — Should You Switch?',
    prompt: '1 car behind 3 doors, 2 goats. You pick Door 1. Host (who knows where the car is) opens Door 3 showing a goat. Switch to Door 2?',
    hint: 'Your initial choice had 1/3 chance; the remaining closed door concentrates the remaining 2/3 probability.',
    solution: 'YES — switching doubles your win odds from 1/3 to 2/3! Initially you had a 2/3 chance of picking a goat; whenever you did, the host is FORCED to reveal the other goat, leaving the car behind the switch door.',
  },
];

export const COMPANY_ARCHETYPES: CompanyArchetypeItem[] = [
  {
    company: 'Google / Meta',
    focus: 'Clean algorithmic thinking, optimal time/space, zero bugs on dry run',
    roundsBreakdown: [
      '2–3 Coding rounds (45m): 1–2 Medium/Hard DSA without running code — trace cleanly!',
      'HLD round (for SDE-2+) + Googleyness / Behavioral collaboration',
    ],
    winningHabit: 'State brute force in 60s, discuss edge cases BEFORE typing, write modular helper functions, and hand-trace a tricky test case.',
  },
  {
    company: 'Amazon / AWS',
    focus: 'Leadership Principles (50% weight!) + Scalable Systems + Medium DSA',
    roundsBreakdown: [
      'Every round mixes 15–20m LP Behavioral stories + 25–30m DSA or LLD',
      'Bar Raiser evaluates Ownership, Dive Deep, and Deliver Results',
    ],
    winningHabit: 'Speak in "I" (not "We"), quantify every STAR result with metrics, and connect technical choices to customer obsession.',
  },
  {
    company: 'Atlassian / Flipkart / Razorpay',
    focus: 'Practical Machine Coding (LLD), clean SOLID extensible OOP, DB/API design',
    roundsBreakdown: [
      '60–90m Machine Coding: build working extensible code (Splitwise, Rate Limiter, Parking Lot)',
      'HLD + Concurrency + CS Fundamentals deep-dive',
    ],
    winningHabit: 'Keep classes modular, separate Models / Services / Strategies, handle concurrency explicitly, and write clean driver tests.',
  },
  {
    company: 'Microsoft / Adobe / Oracle',
    focus: 'Core CS (OS, DBMS, Networks, C++ internals), Trees/Graphs, clean debugging',
    roundsBreakdown: [
      'OA + 3 Technical interviews mixing DSA, SQL/DBMS queries, OS threads/deadlocks, C++ OOPs',
      'AA (As Appropriate) final design + resume project defense',
    ],
    winningHabit: 'Know your resume projects inside out—why Redis vs SQL, why indexing worked, and exact C++ memory mechanics.',
  },
];

export const THINK_ALOUD_RUBRIC = [
  { step: '1. Clarify & Edge Cases (2m)', detail: 'Ask input bounds, duplicates, negatives, sortedness, and empty input behavior before coding.' },
  { step: '2. Brute Force First (1m)', detail: 'Briefly state the naive O(N^2) / O(2^N) baseline so the interviewer knows you see the problem clearly.' },
  { step: '3. Optimize & State Big-O (3m)', detail: 'Explain target data structure, exact Time + Auxiliary Space complexity, and get nod to code.' },
  { step: '4. Clean Modular Code (15m)', detail: 'Use descriptive names, helper functions if non-trivial, and narrate non-obvious loop invariants.' },
  { step: '5. Trace & Stress Test (4m)', detail: 'Walk through a tiny trace + edge cases (empty, 1 element, all equal, INT_MAX overflow).' },
];

export const RECOVERY_PHRASES = [
  {
    moment: 'When stuck for >60s on optimal approach',
    phrase: '“Right now I have the O(N^2) baseline. The repeated work comes from [re-scanning X]. Could we precompute or maintain [HashMap / Monotonic Stack / Prefix] to drop that inner loop to O(1)?”',
  },
  {
    moment: 'When you spot an off-by-one bug during dry run',
    phrase: '“Good catch during my trace—at i = n-1 this reads out of bounds. Let me fix the loop invariant to `< n` and re-verify the boundary.”',
  },
  {
    moment: 'When short on time at the end of a round',
    phrase: '“Since we have 4 minutes left, I’ll finish implementing the core DP transition cleanly, skip boilerplate helper setup, and walk through complexity + test cases.”',
  },
];

export const DEFAULT_STAR_PROMPTS = [
  {
    id: 'intro',
    title: 'Tell Me About Yourself (60s Elevator Pitch)',
    prompt:
      "Hi, I'm Harshal Patel, a B.Tech ICT student at Dhirubhai Ambani University. I enjoy building full-stack developer tools and solving algorithmic problems in C++ and SQL. Recently I engineered CodePrep—a containerized C++17 & SQLite compiler and interview training platform—and I'm excited to bring strong backend fundamentals and product ownership to a software engineering role.",
  },
  {
    id: 'challenge',
    title: 'Hardest Technical Bug & Debugging Story (STAR)',
    prompt:
      'Situation: Production builds passed locally on Windows yet failed inside Linux containers.\nTask: Isolate why module imports & runtime binaries behaved differently.\nAction: Audited .gitignore path anchoring and Prisma OpenSSL binary targets, standardized multi-stage Docker verification.\nResult: Fixed CI/CD builds cleanly and documented container invariants.',
  },
  {
    id: 'tradeoff',
    title: 'Architecture / Design Trade-off You Made',
    prompt:
      'Situation: Needed isolated fast code execution without heavy container-per-request overhead.\nTask: Balance compilation safety vs sub-second latency.\nAction: Implemented queued worker execution with strict CPU/wall timeouts, output caps, and read-only SQLite sandbox transactions.\nResult: Sub-second feedback while bounding resource abuse.',
  },
  {
    id: 'team',
    title: 'Ownership, Feedback & Tight Deadline Story',
    prompt:
      'Situation: Overlapping feature scope before release demo.\nTask: Ship reliable core flows without regressions.\nAction: Ranked P0 correctness tests (auth, judge, SQL safety), deferred polish behind clean iterations, and automated smoke checks.\nResult: Shipped on schedule with zero critical bugs.',
  },
  {
    id: 'conflict',
    title: 'Disagreement / Code Review Conflict (Data-Driven Resolution)',
    prompt:
      'Situation: Teammate favored client-side sorting across paginated items; I saw it broke multi-page consistency.\nTask: Align cleanly without stalling the sprint.\nAction: Built a 10-minute benchmark showing pagination drift and server-side indexed query latency (<15ms).\nResult: Agreed on SQL ordering + composite index, cutting frontend bundle complexity.',
  },
  {
    id: 'proud',
    title: 'Project Deep-Dive: What You Built & Would Scale Next',
    prompt:
      'Architecture: React/TypeScript UI + Node/Express + Prisma/SQLite + C++17/SQL execution sandbox.\nImpact: 500 DSA + 100 SQL challenges, AI hints/complexity critique, POTD streaks, and full placement kit.\nNext Scale Step: Offload g++ runners to horizontal Firecracker/Docker worker pool behind Redis queue + Postgres.',
  },
];

export const QUESTIONS_TO_ASK_INTERVIEWER = [
  {
    category: 'Engineering & Impact',
    questions: [
      'What does a successful first 90 days look like for someone joining your team in this role?',
      'What is one of the biggest technical bottlenecks or scaling trade-offs the team is tackling this quarter?',
      'How do you balance shipping product features quickly with paying down tech debt and automated testing?',
    ],
  },
  {
    category: 'Team & Culture',
    questions: [
      'How are design docs, code reviews, and architectural decisions handled on the team?',
      'How does on-call / production debugging work, and what tools help engineers diagnose incidents fastest?',
      'What separates engineers who do great work on your team from those who truly stand out?',
    ],
  },
  {
    category: 'Architecture & Career Growth',
    questions: [
      'When your team runs post-mortems after an incident, what tends to be the hardest systemic lesson learned recently?',
      'How much autonomy do junior/new-grad engineers get to own an end-to-end service or design proposal?',
    ],
  },
];

export const PRE_INTERVIEW_CHECKLIST = [
  'Read constraints carefully: N <= 10^5 means O(N log N) or O(N), never O(N^2).',
  'Check 32-bit overflow (`1LL * a * b` or `long long` prefix sums).',
  'Clarify edge cases aloud: empty array/string, size 1, duplicates, cycles, negative numbers.',
  'Never stay silent for >30 seconds—narrate intuition, trade-offs, and dry-run steps.',
  'Test your finished code line-by-line by hand on 1 normal case + 1 edge case BEFORE saying "I am done".',
  'Prepare 2 crisp questions to ask your interviewer at the end—never say "No questions, I am good".',
];
