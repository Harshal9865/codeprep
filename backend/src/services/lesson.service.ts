import { prisma } from './prisma.service';
import { VERIFIED_5_LESSONS } from '../data/lessons5';
import { DSA_500_PROBLEMS } from '../data/dsa500';
import { SQL_100_PROBLEMS } from '../data/sql100';
import { TimerService } from './timer.service';
import { Logger } from '../utils/logger';

interface LessonTopicGuide {
  intuition: string;
  recognition: string;
  mistakes: string;
  progression: string;
}

const TOPIC_GUIDES: Record<string, LessonTopicGuide> = {
  'Arrays and Hashing': {
    intuition: 'Trade O(N) auxiliary hash map or set space for O(1) lookup, frequency counting, or prefix accumulation.',
    recognition: 'Lookup pairs/duplicates, contiguous subarrays with target sum, or grouping items by canonical keys.',
    mistakes: 'Mutating container while iterating, missing negative prefix keys, or integer overflow on cumulative sums.',
    progression: '1. Brute Force: O(N^2) nested pairs.\n2. Sorting: O(N log N) two-pass when order can change.\n3. Optimal: O(N) single pass with unordered_map / prefix state.',
  },
  'Two Pointers': {
    intuition: 'Maintain two converging or co-directional indices so each element is visited at most a constant number of times.',
    recognition: 'Sorted arrays, palindrome checks, partitioning in-place, or bounded container/area pairs.',
    mistakes: 'Off-by-one loop conditions (left < right vs <=), duplicate skipping bugs, or moving the wrong boundary.',
    progression: '1. Brute Force: O(N^2) pair search.\n2. Optimal: O(N) time and O(1) extra space with pointer invariants.',
  },
  'Sliding Window': {
    intuition: 'Expand right pointer to include candidates and advance left pointer only while the window violates constraints.',
    recognition: 'Longest/shortest contiguous substring or subarray satisfying frequency or bound constraints.',
    mistakes: 'Recomputing window aggregate from scratch inside loop or failing to decrement frequency cleanly.',
    progression: '1. Brute Force: O(N^2) checking all substrings.\n2. Optimal: O(N) amortized two-pointer window.',
  },
  'Binary Search': {
    intuition: 'Exploit monotonicity to halve the candidate search space or binary-search over possible answer bounds.',
    recognition: 'Sorted/rotated collections, peak finding, or minimum feasible capacity/rate questions.',
    mistakes: 'Integer overflow in (lo + hi) / 2 instead of lo + (hi - lo) / 2, and infinite loop on hi = mid.',
    progression: '1. Linear Scan: O(N).\n2. Optimal: O(log N) over index or O(N log M) over monotonic answer space.',
  },
  'Stack and Queues': {
    intuition: 'Use LIFO stacks or monotonic deques to resolve pending elements immediately once a barrier/boundary appears.',
    recognition: 'Next greater element, parenthesis matching, histogram boundaries, or sliding window extrema.',
    mistakes: 'Storing values instead of indices, or reading stack.top() before checking !st.empty().',
    progression: '1. Brute Force: O(N^2) scanning backward/forward per index.\n2. Optimal: O(N) single push + single pop per element.',
  },
  'Graphs': {
    intuition: 'Model entities as vertices and relationships as adjacency lists; explore via BFS levels, DFS recursion, or topological ordering.',
    recognition: 'Connected components, shortest unweighted path, prerequisite cycles, or grid flood-fill.',
    mistakes: 'Forgetting visited marking BEFORE enqueueing in BFS (causing duplicate queue explosion) or skipping disconnected components.',
    progression: '1. Unbounded DFS: Exponential on cyclic graphs.\n2. Optimal: O(V + E) BFS/DFS/Kahn topological traversal.',
  },
  'Trees': {
    intuition: 'Decompose tree invariants recursively into left subtree + right subtree + node state combination.',
    recognition: 'Depth/diameter/balance, lowest common ancestor, BST validation bounds, or level-order BFS.',
    mistakes: 'Not handling nullptr leaf bases or comparing local child values instead of subtree bounds in BST checks.',
    progression: '1. Repeated Root Traversals: O(N^2).\n2. Optimal: O(N) post-order or level-order traversal passing bounds cleanly.',
  },
  'Backtracking': {
    intuition: 'Build partial choices incrementally along a state tree, prunning invalid branches early and undoing state upon return.',
    recognition: 'Subsets, permutations, combinations, or bounded grid/word path search under small N.',
    mistakes: 'Forgetting to restore visited flag / pop_back() after recursion returns or allowing duplicate branches.',
    progression: '1. Naive enumeration + post-filter.\n2. Optimal Backtracking: O(branch^depth) with early constraint pruning.',
  },
  '1-D Dynamic Programming': {
    intuition: 'Define dp[i] clearly as the optimal answer for prefix ending at i and derive recurrence from prior states.',
    recognition: 'Overlapping subproblems, counting ways, minimum cost to reach state n, or subsequence optimization.',
    mistakes: 'Missing base cases dp[0] or iterating weights/coins in the wrong loop order.',
    progression: '1. Recursion: Exponential O(2^N).\n2. Memoization/Tabulation: O(N) or O(N * K), often reducible to O(1) space.',
  },
  '2-D Dynamic Programming': {
    intuition: 'Track two independent indices/capacities dp[i][j] representing prefix alignments or knapsack capacity subproblems.',
    recognition: 'Two-string alignment, grid paths, or bounded weight/value selection.',
    mistakes: 'Swapping 1-indexed DP table offset vs 0-indexed string/array lookups.',
    progression: '1. Recursive Subtree: Exponential.\n2. 2D Tabulation: O(M * N) time, often compressible to O(N) rolling 1D array.',
  },
};

const DEFAULT_GUIDE: LessonTopicGuide = {
  intuition: 'Identify the core invariant preserving validity at each step, choose a matching container, and verify boundary inputs.',
  recognition: 'Look at constraint scale N to infer target complexity (10^5 implies O(N) or O(N log N); 10^3 implies O(N^2); <=20 implies backtracking/bitmask).',
  mistakes: 'Watch for empty collections, duplicate values, signed 32-bit overflow, and uninitialized accumulators.',
  progression: '1. Brute Force baseline matching exact specification.\n2. Eliminate repeated work via precomputation or monotonic state.\n3. Optimal single-pass or logarithmic solution.',
};

const CURATED_CPP_SOLUTIONS: Record<string, string> = {
  'contains-duplicate': `class Solution {
public:
    bool containsDuplicate(vector<int>& nums) {
        unordered_set<int> seen;
        seen.reserve(nums.size());
        for (int x : nums) {
            if (!seen.insert(x).second) return true;
        }
        return false;
    }
};`,
  'valid-anagram': `class Solution {
public:
    bool isAnagram(string s, string t) {
        if (s.size() != t.size()) return false;
        int freq[26] = {0};
        for (size_t i = 0; i < s.size(); ++i) {
            freq[s[i] - 'a']++;
            freq[t[i] - 'a']--;
        }
        for (int c : freq) {
            if (c != 0) return false;
        }
        return true;
    }
};`,
  'valid-palindrome': `class Solution {
public:
    bool isPalindrome(string s) {
        int l = 0, r = static_cast<int>(s.size()) - 1;
        while (l < r) {
            while (l < r && !isalnum(static_cast<unsigned char>(s[l]))) l++;
            while (l < r && !isalnum(static_cast<unsigned char>(s[r]))) r--;
            if (tolower(static_cast<unsigned char>(s[l])) != tolower(static_cast<unsigned char>(s[r]))) {
                return false;
            }
            l++;
            r--;
        }
        return true;
    }
};`,
  'trapping-rain-water': `class Solution {
public:
    int trap(vector<int>& height) {
        int l = 0, r = static_cast<int>(height.size()) - 1;
        int leftMax = 0, rightMax = 0, water = 0;
        while (l < r) {
            if (height[l] < height[r]) {
                leftMax = max(leftMax, height[l]);
                water += leftMax - height[l];
                l++;
            } else {
                rightMax = max(rightMax, height[r]);
                water += rightMax - height[r];
                r--;
            }
        }
        return water;
    }
};`,
  'longest-substring-without-repeating-characters': `class Solution {
public:
    int lengthOfLongestSubstring(string s) {
        vector<int> last(256, -1);
        int best = 0, start = 0;
        for (int i = 0; i < static_cast<int>(s.size()); ++i) {
            unsigned char ch = static_cast<unsigned char>(s[i]);
            if (last[ch] >= start) start = last[ch] + 1;
            last[ch] = i;
            best = max(best, i - start + 1);
        }
        return best;
    }
};`,
  'merge-intervals': `class Solution {
public:
    vector<vector<int>> merge(vector<vector<int>>& intervals) {
        sort(intervals.begin(), intervals.end());
        vector<vector<int>> merged;
        for (const auto& iv : intervals) {
            if (merged.empty() || merged.back()[1] < iv[0]) {
                merged.push_back(iv);
            } else {
                merged.back()[1] = max(merged.back()[1], iv[1]);
            }
        }
        return merged;
    }
};`,
  'search-in-rotated-sorted-array': `class Solution {
public:
    int search(vector<int>& nums, int target) {
        int l = 0, r = static_cast<int>(nums.size()) - 1;
        while (l <= r) {
            int mid = l + (r - l) / 2;
            if (nums[mid] == target) return mid;
            if (nums[l] <= nums[mid]) {
                if (nums[l] <= target && target < nums[mid]) r = mid - 1;
                else l = mid + 1;
            } else {
                if (nums[mid] < target && target <= nums[r]) l = mid + 1;
                else r = mid - 1;
            }
        }
        return -1;
    }
};`,
  'find-minimum-in-rotated-sorted-array': `class Solution {
public:
    int findMin(vector<int>& nums) {
        int l = 0, r = static_cast<int>(nums.size()) - 1;
        while (l < r) {
            int mid = l + (r - l) / 2;
            if (nums[mid] > nums[r]) l = mid + 1;
            else r = mid;
        }
        return nums[l];
    }
};`,
  'daily-temperatures': `class Solution {
public:
    vector<int> dailyTemperatures(vector<int>& temperatures) {
        int n = static_cast<int>(temperatures.size());
        vector<int> ans(n, 0);
        vector<int> st;
        for (int i = 0; i < n; ++i) {
            while (!st.empty() && temperatures[i] > temperatures[st.back()]) {
                int idx = st.back();
                st.pop_back();
                ans[idx] = i - idx;
            }
            st.push_back(i);
        }
        return ans;
    }
};`,
  'number-of-islands': `class Solution {
public:
    int numIslands(vector<vector<char>>& grid) {
        int m = static_cast<int>(grid.size()), n = static_cast<int>(grid[0].size());
        int islands = 0;
        auto dfs = [&](auto& self, int r, int c) -> void {
            if (r < 0 || c < 0 || r >= m || c >= n || grid[r][c] != '1') return;
            grid[r][c] = '0';
            self(self, r + 1, c);
            self(self, r - 1, c);
            self(self, r, c + 1);
            self(self, r, c - 1);
        };
        for (int r = 0; r < m; ++r) {
            for (int c = 0; c < n; ++c) {
                if (grid[r][c] == '1') {
                    islands++;
                    dfs(dfs, r, c);
                }
            }
        }
        return islands;
    }
};`,
  'coin-change': `class Solution {
public:
    int coinChange(vector<int>& coins, int amount) {
        const int INF = amount + 1;
        vector<int> dp(amount + 1, INF);
        dp[0] = 0;
        for (int i = 1; i <= amount; ++i) {
            for (int c : coins) {
                if (c <= i) dp[i] = min(dp[i], dp[i - c] + 1);
            }
        }
        return dp[amount] > amount ? -1 : dp[amount];
    }
};`,
  'longest-increasing-subsequence': `class Solution {
public:
    int lengthOfLIS(vector<int>& nums) {
        vector<int> tails;
        for (int x : nums) {
            auto it = lower_bound(tails.begin(), tails.end(), x);
            if (it == tails.end()) tails.push_back(x);
            else *it = x;
        }
        return static_cast<int>(tails.size());
    }
};`,
};

export class LessonService {
  static async seedLessons(): Promise<void> {
    try {
      for (const lesson of VERIFIED_5_LESSONS) {
        await prisma.aiLesson.upsert({
          where: { problemId: lesson.problemId },
          update: {
            techniqueLesson: lesson.techniqueLesson,
            visualTraceJson: lesson.visualTraceJson,
            workedExamples: lesson.workedExamples,
            approachProgression: lesson.approachProgression,
            verifiedSolution: lesson.verifiedSolution,
            similarProblemsJson: lesson.similarProblemsJson,
          },
          create: {
            problemId: lesson.problemId,
            techniqueLesson: lesson.techniqueLesson,
            visualTraceJson: lesson.visualTraceJson,
            workedExamples: lesson.workedExamples,
            approachProgression: lesson.approachProgression,
            verifiedSolution: lesson.verifiedSolution,
            similarProblemsJson: lesson.similarProblemsJson,
          },
        });
      }
      Logger.info('LessonService', 'Starter curated reference solutions synchronized into SQLite.');
    } catch (err) {
      Logger.error('LessonService', 'Notice during lesson seeding', err);
    }
  }

  private static findCuratedCppBySlug(slug: string): string | null {
    for (const [key, code] of Object.entries(CURATED_CPP_SOLUTIONS)) {
      if (slug === key || slug.endsWith(`-${key}`)) {
        return code;
      }
    }
    return null;
  }

  private static async buildAndPersistDynamicLesson(problemId: number) {
    const dbProblem = await prisma.problem.findUnique({ where: { id: problemId } });
    if (!dbProblem) {
      throw new Error(`Problem #${problemId} not found.`);
    }

    const dsaDef = DSA_500_PROBLEMS.find((p) => p.id === problemId);
    const sqlDef = SQL_100_PROBLEMS.find((p) => p.id === problemId);

    const guide = TOPIC_GUIDES[dbProblem.topic] || DEFAULT_GUIDE;
    let examples: Array<{ input?: string; output?: string; explanation?: string }> = [];
    try {
      examples = JSON.parse(dbProblem.examplesJson || '[]');
    } catch {
      examples = [];
    }

    const related = await prisma.problem.findMany({
      where: {
        topic: dbProblem.topic,
        id: { not: problemId },
      },
      select: { id: true, title: true },
      orderBy: { id: 'asc' },
      take: 3,
    });

    const fallbackRelated =
      related.length >= 3
        ? related
        : await prisma.problem.findMany({
            where: {
              category: dbProblem.category,
              id: { not: problemId },
            },
            select: { id: true, title: true },
            orderBy: { id: 'asc' },
            take: 3,
          });

    const isSql = dbProblem.category === 'SQL';
    const baseTechnique = `### Pattern: ${dbProblem.pattern || dbProblem.topic}

#### Core Intuition (${dbProblem.topic} • ${dbProblem.difficulty})
${guide.intuition}

#### Recognition Cues
${guide.recognition}

#### Common Pitfalls
${guide.mistakes}`;

    const workedExamplesText =
      examples.length > 0
        ? examples
            .map(
              (ex, i) =>
                `Example ${i + 1}:\n  Input: ${ex.input || '(see statement)'}\n  Output: ${ex.output || '(see statement)'}${ex.explanation ? `\n  Walkthrough: ${ex.explanation}` : ''}`
            )
            .join('\n\n')
        : isSql && sqlDef
        ? `Sample Schema:\n${sqlDef.schemaDdl}\n\nExpected Output Sample:\n${sqlDef.expectedResultJson}`
        : `Verify empty/minimal inputs, boundary values from constraints:\n${dbProblem.constraints}`;

    const visualTrace = {
      steps: [
        {
          step: 1,
          description: `Analyze constraints for ${dbProblem.title} (${dbProblem.topic})`,
          state: `Pattern selected: ${dbProblem.pattern || dbProblem.topic}`,
          decision: isSql ? 'Inspect target table columns, joins, and grouping grain.' : 'Initialize invariant container / pointers.',
        },
        {
          step: 2,
          description: 'Apply core transformation / pass over dataset',
          state: guide.intuition,
          decision: isSql ? 'Filter/aggregate rows and apply ORDER BY if required.' : 'Maintain loop invariant and avoid nested scans.',
        },
        {
          step: 3,
          description: 'Verify boundary conditions & finalize return value',
          state: `Check constraints: ${dbProblem.constraints.split('\n')[0] || 'Standard limits'}`,
          decision: 'Compare output structure cleanly against expected test format.',
        },
      ],
    };

    let verifiedSolution = '';
    if (isSql && sqlDef) {
      verifiedSolution = `-- Reference Query for #${dbProblem.id}: ${dbProblem.title}\n${sqlDef.expectedQuery}`;
    } else {
      verifiedSolution =
        this.findCuratedCppBySlug(dbProblem.slug) ||
        `// Reference Strategy Blueprint for #${dbProblem.id}: ${dbProblem.title}
// Pattern: ${dbProblem.pattern || dbProblem.topic}
${dbProblem.cppHarnessTemplate || dsaDef?.defaultCodeStub || `class Solution {\npublic:\n    ${dbProblem.functionSignature} {\n        // Apply ${dbProblem.pattern || dbProblem.topic}\n    }\n};`}`;
    }

    const saved = await prisma.aiLesson.upsert({
      where: { problemId },
      update: {
        techniqueLesson: baseTechnique,
        visualTraceJson: JSON.stringify(visualTrace),
        workedExamples: workedExamplesText,
        approachProgression: guide.progression,
        verifiedSolution,
        similarProblemsJson: JSON.stringify(fallbackRelated),
      },
      create: {
        problemId,
        techniqueLesson: baseTechnique,
        visualTraceJson: JSON.stringify(visualTrace),
        workedExamples: workedExamplesText,
        approachProgression: guide.progression,
        verifiedSolution,
        similarProblemsJson: JSON.stringify(fallbackRelated),
      },
    });

    return saved;
  }

  static async getLessonByProblemId(problemId: number, userId: string) {
    let timerStatus = await TimerService.getStatus(problemId, userId);

    // Unlock cleanly on explicit solution inspection instead of failing with 403
    if (!timerStatus.isUnlocked) {
      await TimerService.unlockAiSolution(problemId, userId);
      timerStatus = await TimerService.getStatus(problemId, userId);
    }

    let lesson = await prisma.aiLesson.findUnique({
      where: { problemId },
    });

    if (!lesson) {
      lesson = await this.buildAndPersistDynamicLesson(problemId);
    }

    return {
      problemId: lesson.problemId,
      techniqueLesson: lesson.techniqueLesson,
      visualTrace: JSON.parse(lesson.visualTraceJson),
      workedExamples: lesson.workedExamples,
      approachProgression: lesson.approachProgression,
      verifiedSolution: lesson.verifiedSolution,
      similarProblems: JSON.parse(lesson.similarProblemsJson),
      isSolved: timerStatus.isSolved,
      solvedWithAiHelp: timerStatus.solvedWithAiHelp,
    };
  }
}
