import { ProblemDefinition, TestCase } from '../judge/types';

interface FamilySpec {
  topic: string;
  pattern: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  title: string;
  statement: string;
  constraints: string;
  signature: string;
  paramTypes: string[];
  returnType: string;
  stub: string;
  solutionCode: string;
  complexity: string;
  cases: Array<{ input: string; expectedOutput: string; explanation?: string }>;
}

const EXTENDED_DSA_SOLUTIONS = new Map<number, { complexity: string; code: string }>();

function slugify(id: number, title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${id}-${base}`;
}

const SAMPLE_ARRAYS: number[][] = [
  [3, 1, 4, 1, 5, 9, 2],
  [10, -3, 7, 2, 8, -1],
  [5],
  [],
  [-4, -2, -8, -1],
  [2, 4, 6, 8, 10, 12],
  [9, 7, 5, 3, 1],
  [1, 1, 1, 1, 1],
  [15, 22, 13, 19, 27, 31],
  [0, -5, 5, 10, -10, 20],
];

const POSITIVE_ARRAYS: number[][] = [
  [2, 5, 1, 8, 2, 9],
  [4, 2, 7, 1, 9, 3],
  [10, 20, 30],
  [1],
  [7, 7, 7, 7],
  [3, 8, 2, 5, 6, 4, 1],
  [12, 5, 8, 17, 3],
  [6, 1, 9, 2, 4, 8],
  [15, 10, 5, 20],
  [9, 3, 11, 2, 14, 7],
];

const SAMPLE_STRINGS: string[] = [
  'abacaba',
  'codeprep',
  'racecar',
  'programming',
  'a',
  'zzzzzz',
  'helloWorld',
  'mississippi',
  'algorithm',
  'levelup',
];

const SAMPLE_INTS: number[] = [0, 1, 7, 18, 29, 42, 105, 369, 1024, 9875];

function makeCases(
  inputs: string[],
  outputs: string[],
  firstExplanation?: string
): Array<{ input: string; expectedOutput: string; explanation?: string }> {
  return inputs.map((input, idx) => ({
    input,
    expectedOutput: outputs[idx],
    explanation: idx === 0 ? firstExplanation : undefined,
  }));
}

function buildDsaFamily(seq: number, id: number): FamilySpec {
  const family = seq % 14;
  const k = (seq % 7) + 2; // 2..8
  const offset = (seq % 11) + 1; // 1..11
  const threshold = ((seq % 9) + 1) * 2; // 2..18
  const tier = Math.floor(seq / 14);

  switch (family) {
    case 0: {
      // Logic Building: Weighted Alternating Digit/Element Filter
      const mod = (seq % 5) + 3; // 3..7
      const rem = seq % mod;
      const evalFn = (nums: number[]) =>
        nums.reduce((acc, v, i) => (Math.abs(v) % mod === rem ? acc + v + (i % 2 === 0 ? offset : -offset) : acc), 0);
      return {
        topic: 'Logic Building',
        pattern: 'Conditional Loop & Modular Rule',
        difficulty: 'Easy',
        title: `Modular Offset Accumulator (Mod ${mod} == ${rem}, Step #${tier + 1})`,
        statement: `Iterate through \`nums\`. Whenever \`abs(nums[i]) % ${mod} == ${rem}\`, add \`nums[i] + ${offset}\` if index \`i\` is even, or \`nums[i] - ${offset}\` if index \`i\` is odd. Return the final accumulated integer sum.`,
        constraints: '0 <= nums.size() <= 10^4\n-10^4 <= nums[i] <= 10^4',
        signature: 'int solve(vector<int>& nums)',
        paramTypes: ['vector<int>'],
        returnType: 'int',
        stub: `class Solution {\npublic:\n    int solve(vector<int>& nums) {\n        // Loop over nums applying the modular parity offset rule\n        return 0;\n    }\n};`,
        solutionCode: `class Solution {\npublic:\n    int solve(vector<int>& nums) {\n        long long total = 0;\n        for (int i = 0; i < static_cast<int>(nums.size()); ++i) {\n            if (abs(nums[i]) % ${mod} == ${rem}) {\n                total += nums[i] + ((i % 2 == 0) ? ${offset} : -${offset});\n            }\n        }\n        return static_cast<int>(total);\n    }\n};`,
        complexity: 'Time: O(N) | Space: O(1)',
        cases: makeCases(
          SAMPLE_ARRAYS.map((a) => JSON.stringify(a)),
          SAMPLE_ARRAYS.map((a) => JSON.stringify(evalFn(a))),
          `Filters elements with abs(val) % ${mod} == ${rem} and applies +/-${offset} by index parity.`
        ),
      };
    }

    case 1: {
      // Logic Building: Digit Reduction + Step Score
      const base = (seq % 4) + 2; // 2..5
      const evalDigit = (n: number) => {
        if (n === 0) return offset;
        let x = Math.abs(n);
        let score = 0;
        while (x > 0) {
          const d = x % 10;
          score += d % 2 === 0 ? d * base : d + offset;
          x = Math.floor(x / 10);
        }
        return score;
      };
      return {
        topic: 'Logic Building',
        pattern: 'Digit Extraction Arithmetic',
        difficulty: 'Easy',
        title: `Weighted Digit Parity Fold (Factor ${base}, +${offset}, Set #${tier + 1})`,
        statement: `Given a non-negative integer \`n\`, inspect each decimal digit of \`n\` (treat \`n = 0\` as single digit \`0\` with result \`${offset}\`). For every non-zero number \`n > 0\`: if a digit \`d\` is even add \`d * ${base}\`, otherwise add \`d + ${offset}\`. Return the total digit score.`,
        constraints: '0 <= n <= 10^9',
        signature: 'int solve(int n)',
        paramTypes: ['int'],
        returnType: 'int',
        stub: `class Solution {\npublic:\n    int solve(int n) {\n        // Extract decimal digits and fold with parity rule\n        return 0;\n    }\n};`,
        solutionCode: `class Solution {\npublic:\n    int solve(int n) {\n        if (n == 0) return ${offset};\n        long long x = abs(static_cast<long long>(n));\n        long long score = 0;\n        while (x > 0) {\n            int d = static_cast<int>(x % 10);\n            score += (d % 2 == 0) ? (d * ${base}) : (d + ${offset});\n            x /= 10;\n        }\n        return static_cast<int>(score);\n    }\n};`,
        complexity: 'Time: O(log10 N) | Space: O(1)',
        cases: makeCases(
          SAMPLE_INTS.map((x) => JSON.stringify(x)),
          SAMPLE_INTS.map((x) => JSON.stringify(evalDigit(x))),
          `Even digits contribute d*${base}; odd digits contribute d+${offset}.`
        ),
      };
    }

    case 2: {
      // Arrays and Hashing: Frequency Pair / Threshold Count
      const minFreq = (seq % 3) + 1;
      const evalArr = (nums: number[]) => {
        const freq = new Map<number, number>();
        for (const x of nums) freq.set(x, (freq.get(x) || 0) + 1);
        let ans = 0;
        for (const [val, cnt] of freq.entries()) {
          if (cnt >= minFreq) ans += val + offset;
        }
        return ans;
      };
      return {
        topic: 'Arrays and Hashing',
        pattern: 'Hash Map Frequency Filter',
        difficulty: minFreq >= 2 ? 'Medium' : 'Easy',
        title: `Frequency-Gated Distinct Sum (MinFreq ${minFreq}, Bias +${offset}, #${tier + 1})`,
        statement: `Count the occurrences of every distinct integer in \`nums\`. For each distinct value \`v\` appearing at least \`${minFreq}\` time(s), add \`v + ${offset}\` once to the answer. Return the resulting sum.`,
        constraints: '0 <= nums.size() <= 10^5\n-10^4 <= nums[i] <= 10^4',
        signature: 'int solve(vector<int>& nums)',
        paramTypes: ['vector<int>'],
        returnType: 'int',
        stub: `class Solution {\npublic:\n    int solve(vector<int>& nums) {\n        // Build unordered_map<int, int> frequencies\n        return 0;\n    }\n};`,
        solutionCode: `class Solution {\npublic:\n    int solve(vector<int>& nums) {\n        unordered_map<int, int> freq;\n        for (int x : nums) freq[x]++;\n        long long total = 0;\n        for (const auto& [val, cnt] : freq) {\n            if (cnt >= ${minFreq}) total += static_cast<long long>(val) + ${offset};\n        }\n        return static_cast<int>(total);\n    }\n};`,
        complexity: 'Time: O(N) | Space: O(N)',
        cases: makeCases(
          SAMPLE_ARRAYS.map((a) => JSON.stringify(a)),
          SAMPLE_ARRAYS.map((a) => JSON.stringify(evalArr(a))),
          `Sums (val + ${offset}) over distinct values occurring >= ${minFreq} times.`
        ),
      };
    }

    case 3: {
      // Two Pointers: Sorted Pair Sum Count <= threshold
      const limit = threshold + offset;
      const evalTwoPtr = (nums: number[]) => {
        const sorted = [...nums].sort((a, b) => a - b);
        let l = 0;
        let r = sorted.length - 1;
        let cnt = 0;
        while (l < r) {
          if (sorted[l] + sorted[r] <= limit) {
            cnt += r - l;
            l++;
          } else {
            r--;
          }
        }
        return cnt;
      };
      return {
        topic: 'Two Pointers',
        pattern: 'Sorted Converging Pointers',
        difficulty: 'Medium',
        title: `Bounded Pair Sum Count <= ${limit} (Batch #${tier + 1})`,
        statement: `Return the total number of index pairs \`(i, j)\` with \`0 <= i < j < nums.size()\` such that \`nums[i] + nums[j] <= ${limit}\`.`,
        constraints: '0 <= nums.size() <= 10^5\n-10^4 <= nums[i] <= 10^4',
        signature: 'int solve(vector<int>& nums)',
        paramTypes: ['vector<int>'],
        returnType: 'int',
        stub: `class Solution {\npublic:\n    int solve(vector<int>& nums) {\n        // Sort and sweep left/right pointers\n        return 0;\n    }\n};`,
        solutionCode: `class Solution {\npublic:\n    int solve(vector<int>& nums) {\n        sort(nums.begin(), nums.end());\n        int l = 0, r = static_cast<int>(nums.size()) - 1;\n        long long count = 0;\n        while (l < r) {\n            if (static_cast<long long>(nums[l]) + nums[r] <= ${limit}) {\n                count += (r - l);\n                l++;\n            } else {\n                r--;\n            }\n        }\n        return static_cast<int>(count);\n    }\n};`,
        complexity: 'Time: O(N log N) | Space: O(1) extra',
        cases: makeCases(
          SAMPLE_ARRAYS.map((a) => JSON.stringify(a)),
          SAMPLE_ARRAYS.map((a) => JSON.stringify(evalTwoPtr(a))),
          `Counts all pairs summing to <= ${limit} after sorting.`
        ),
      };
    }

    case 4: {
      // Sliding Window: Fixed-Size or Budget Window
      const win = (seq % 3) + 2; // 2..4
      const evalWindow = (nums: number[]) => {
        if (nums.length === 0) return 0;
        const w = Math.min(win, nums.length);
        let cur = 0;
        for (let i = 0; i < w; i++) cur += nums[i];
        let best = cur;
        for (let i = w; i < nums.length; i++) {
          cur += nums[i] - nums[i - w];
          if (cur > best) best = cur;
        }
        return best + offset;
      };
      return {
        topic: 'Sliding Window',
        pattern: 'Fixed Window Rolling Sum',
        difficulty: 'Easy',
        title: `Max Window Sum Length ${win} (+${offset}, Set #${tier + 1})`,
        statement: `Find the maximum contiguous subarray sum of length \`min(${win}, nums.size())\` (returning \`0\` if \`nums\` is empty), then add bonus \`${offset}\` if non-empty.`,
        constraints: '0 <= nums.size() <= 10^5\n-10^4 <= nums[i] <= 10^4',
        signature: 'int solve(vector<int>& nums)',
        paramTypes: ['vector<int>'],
        returnType: 'int',
        stub: `class Solution {\npublic:\n    int solve(vector<int>& nums) {\n        // Maintain rolling sum of width min(${win}, n)\n        return 0;\n    }\n};`,
        solutionCode: `class Solution {\npublic:\n    int solve(vector<int>& nums) {\n        if (nums.empty()) return 0;\n        int w = min(${win}, static_cast<int>(nums.size()));\n        long long cur = 0;\n        for (int i = 0; i < w; ++i) cur += nums[i];\n        long long best = cur;\n        for (int i = w; i < static_cast<int>(nums.size()); ++i) {\n            cur += nums[i] - nums[i - w];\n            best = max(best, cur);\n        }\n        return static_cast<int>(best + ${offset});\n    }\n};`,
        complexity: 'Time: O(N) | Space: O(1)',
        cases: makeCases(
          SAMPLE_ARRAYS.map((a) => JSON.stringify(a)),
          SAMPLE_ARRAYS.map((a) => JSON.stringify(evalWindow(a))),
          `Rolling window sum of size min(${win}, n) plus ${offset}.`
        ),
      };
    }

    case 5: {
      // Strings: Palindrome / Distinct Character Window Score
      const evalString = (s: string) => {
        const lower = s.toLowerCase();
        const vowels = new Set(['a', 'e', 'i', 'o', 'u']);
        let l = 0;
        let r = lower.length - 1;
        let mismatches = 0;
        while (l < r) {
          if (lower[l] !== lower[r]) mismatches++;
          l++;
          r--;
        }
        let vCount = 0;
        for (const ch of lower) if (vowels.has(ch)) vCount++;
        return vCount * k - mismatches * offset;
      };
      return {
        topic: 'Strings',
        pattern: 'Symmetric Two-Pointer Scan + Char Filter',
        difficulty: 'Easy',
        title: `String Vowel-Symmetry Score (x${k}, -${offset}, #${tier + 1})`,
        statement: `Convert string \`s\` to lowercase conceptually. Count total vowels \`V\` (\`a,e,i,o,u\`) and count mirrored index pairs \`(i, n-1-i)\` with \`i < n-1-i\` that differ (\`M\`). Return \`V * ${k} - M * ${offset}\`.`,
        constraints: '1 <= s.length() <= 10^5\nEnglish letters only.',
        signature: 'int solve(string s)',
        paramTypes: ['string'],
        returnType: 'int',
        stub: `class Solution {\npublic:\n    int solve(string s) {\n        // Count vowels and symmetric mismatches\n        return 0;\n    }\n};`,
        solutionCode: `class Solution {\npublic:\n    int solve(string s) {\n        int n = static_cast<int>(s.size());\n        int vowels = 0, mismatches = 0;\n        for (char c : s) {\n            char lc = static_cast<char>(tolower(static_cast<unsigned char>(c)));\n            if (lc == 'a' || lc == 'e' || lc == 'i' || lc == 'o' || lc == 'u') vowels++;\n        }\n        for (int i = 0; i < n / 2; ++i) {\n            char a = static_cast<char>(tolower(static_cast<unsigned char>(s[i])));\n            char b = static_cast<char>(tolower(static_cast<unsigned char>(s[n - 1 - i])));\n            if (a != b) mismatches++;\n        }\n        return vowels * ${k} - mismatches * ${offset};\n    }\n};`,
        complexity: 'Time: O(N) | Space: O(1)',
        cases: makeCases(
          SAMPLE_STRINGS.map((s) => JSON.stringify(s)),
          SAMPLE_STRINGS.map((s) => JSON.stringify(evalString(s))),
          `Scores vowels * ${k} minus symmetric mismatches * ${offset}.`
        ),
      };
    }

    case 6: {
      // Binary Search: Feasibility / Answer Space Search
      const trips = (seq % 4) + 2; // 2..5 partitions
      const evalBs = (nums: number[]) => {
        if (nums.length === 0) return 0;
        let lo = Math.max(...nums);
        let hi = nums.reduce((a, b) => a + b, 0);
        const canSplit = (cap: number) => {
          let parts = 1;
          let load = 0;
          for (const x of nums) {
            if (load + x > cap) {
              parts++;
              load = x;
            } else {
              load += x;
            }
          }
          return parts <= trips;
        };
        while (lo < hi) {
          const mid = lo + Math.floor((hi - lo) / 2);
          if (canSplit(mid)) hi = mid;
          else lo = mid + 1;
        }
        return lo;
      };
      return {
        topic: 'Binary Search',
        pattern: 'Binary Search on Answer Capacity',
        difficulty: trips >= 4 ? 'Hard' : 'Medium',
        title: `Minimize Max Partition Load Across ${trips} Segments (#${tier + 1})`,
        statement: `Given positive task weights \`nums\`, partition \`nums\` contiguously into at most \`${trips}\` non-empty segments so that the largest segment sum is minimized. Return that minimum possible maximum segment sum.`,
        constraints: `1 <= nums.size() <= 10^4\n1 <= nums[i] <= 10^4`,
        signature: 'int solve(vector<int>& nums)',
        paramTypes: ['vector<int>'],
        returnType: 'int',
        stub: `class Solution {\npublic:\n    int solve(vector<int>& nums) {\n        // Binary search capacity in [max(nums), sum(nums)]\n        return 0;\n    }\n};`,
        solutionCode: `class Solution {\npublic:\n    int solve(vector<int>& nums) {\n        if (nums.empty()) return 0;\n        long long lo = *max_element(nums.begin(), nums.end());\n        long long hi = accumulate(nums.begin(), nums.end(), 0LL);\n        auto feasible = [&](long long cap) {\n            int segs = 1;\n            long long cur = 0;\n            for (int x : nums) {\n                if (cur + x > cap) { segs++; cur = x; }\n                else cur += x;\n            }\n            return segs <= ${trips};\n        };\n        while (lo < hi) {\n            long long mid = lo + (hi - lo) / 2;\n            if (feasible(mid)) hi = mid;\n            else lo = mid + 1;\n        }\n        return static_cast<int>(lo);\n    }\n};`,
        complexity: 'Time: O(N log Sum) | Space: O(1)',
        cases: makeCases(
          POSITIVE_ARRAYS.map((a) => JSON.stringify(a)),
          POSITIVE_ARRAYS.map((a) => JSON.stringify(evalBs(a))),
          `Binary search minimum bottleneck capacity for <= ${trips} partitions.`
        ),
      };
    }

    case 7: {
      // Stack & Queue: Monotonic Next Greater Element Sum
      const evalMonotonic = (nums: number[]) => {
        const st: number[] = [];
        const nge = new Array(nums.length).fill(-1);
        for (let i = 0; i < nums.length; i++) {
          while (st.length > 0 && nums[st[st.length - 1]] < nums[i]) {
            const idx = st.pop()!;
            nge[idx] = nums[i];
          }
          st.push(i);
        }
        return nge.reduce((acc, v, idx) => acc + (v === -1 ? offset : v * ((idx % 2) + 1)), 0);
      };
      return {
        topic: 'Stack & Queue',
        pattern: 'Monotonic Decreasing Stack',
        difficulty: 'Medium',
        title: `Monotonic Next Greater Weighted Sum (Fallback +${offset}, #${tier + 1})`,
        statement: `For each index \`i\`, find the next strictly greater element to its right (\`nge[i]\`). If none exists, contribute \`${offset}\`; otherwise contribute \`nge[i] * 1\` (even index) or \`nge[i] * 2\` (odd index). Return the total sum.`,
        constraints: '0 <= nums.size() <= 10^5\n-10^4 <= nums[i] <= 10^4',
        signature: 'int solve(vector<int>& nums)',
        paramTypes: ['vector<int>'],
        returnType: 'int',
        stub: `class Solution {\npublic:\n    int solve(vector<int>& nums) {\n        // Use a monotonic decreasing index stack\n        return 0;\n    }\n};`,
        solutionCode: `class Solution {\npublic:\n    int solve(vector<int>& nums) {\n        int n = static_cast<int>(nums.size());\n        vector<int> nge(n, -1);\n        stack<int> st;\n        for (int i = 0; i < n; ++i) {\n            while (!st.empty() && nums[st.top()] < nums[i]) {\n                nge[st.top()] = nums[i];\n                st.pop();\n            }\n            st.push(i);\n        }\n        long long total = 0;\n        for (int i = 0; i < n; ++i) {\n            total += (nge[i] == -1) ? ${offset} : static_cast<long long>(nge[i]) * ((i % 2) + 1);\n        }\n        return static_cast<int>(total);\n    }\n};`,
        complexity: 'Time: O(N) | Space: O(N)',
        cases: makeCases(
          POSITIVE_ARRAYS.map((a) => JSON.stringify(a)),
          POSITIVE_ARRAYS.map((a) => JSON.stringify(evalMonotonic(a))),
          `Resolves Next Greater Elements in O(N) with monotonic stack.`
        ),
      };
    }

    case 8: {
      // Greedy: Jump Reach / Budget Task Maximizer
      const budget = threshold * 2 + offset;
      const evalGreedy = (nums: number[]) => {
        const sorted = [...nums].filter((x) => x > 0).sort((a, b) => a - b);
        let rem = budget;
        let taken = 0;
        for (const cost of sorted) {
          if (cost <= rem) {
            rem -= cost;
            taken++;
          } else {
            break;
          }
        }
        return taken;
      };
      return {
        topic: 'Greedy',
        pattern: 'Shortest Processing Time Greedy',
        difficulty: 'Easy',
        title: `Maximum Affordable Positive Tasks (Budget ${budget}, #${tier + 1})`,
        statement: `Given task costs \`nums\` (ignore any cost \`<= 0\` as invalid/free overhead already skipped), compute the maximum number of positive-cost tasks you can execute within total budget \`${budget}\`.`,
        constraints: '0 <= nums.size() <= 10^5',
        signature: 'int solve(vector<int>& nums)',
        paramTypes: ['vector<int>'],
        returnType: 'int',
        stub: `class Solution {\npublic:\n    int solve(vector<int>& nums) {\n        // Sort positive costs ascending and pick greedily\n        return 0;\n    }\n};`,
        solutionCode: `class Solution {\npublic:\n    int solve(vector<int>& nums) {\n        vector<int> valid;\n        for (int x : nums) if (x > 0) valid.push_back(x);\n        sort(valid.begin(), valid.end());\n        long long rem = ${budget};\n        int count = 0;\n        for (int c : valid) {\n            if (c <= rem) { rem -= c; count++; }\n            else break;\n        }\n        return count;\n    }\n};`,
        complexity: 'Time: O(N log N) | Space: O(N)',
        cases: makeCases(
          SAMPLE_ARRAYS.map((a) => JSON.stringify(a)),
          SAMPLE_ARRAYS.map((a) => JSON.stringify(evalGreedy(a))),
          `Greedily picks smallest positive costs under budget ${budget}.`
        ),
      };
    }

    case 9: {
      // Math & Bit Manipulation: Popcount + Parity Weighted Score
      const evalBit = (nums: number[]) => {
        let xorAll = 0;
        let bitScore = 0;
        for (const x of nums) {
          xorAll ^= x;
          let ux = x >>> 0;
          let bits = 0;
          while (ux) {
            ux &= ux - 1;
            bits++;
          }
          bitScore += bits * k;
        }
        return xorAll + bitScore;
      };
      return {
        topic: 'Math & Bit Manipulation',
        pattern: 'XOR Invariant + Brian Kernighan Popcount',
        difficulty: 'Medium',
        title: `Bitwise XOR + Set-Bit Weight Fold (x${k}, #${tier + 1})`,
        statement: `For \`nums\`, compute the bitwise XOR of all signed 32-bit elements (\`xorAll\`) plus \`${k}\` times the total count of 1-bits across the unsigned 32-bit representations of all elements. Return \`xorAll + totalBits * ${k}\`.`,
        constraints: '0 <= nums.size() <= 10^5',
        signature: 'int solve(vector<int>& nums)',
        paramTypes: ['vector<int>'],
        returnType: 'int',
        stub: `class Solution {\npublic:\n    int solve(vector<int>& nums) {\n        // Accumulate bitwise XOR and __builtin_popcount(unsigned(x))\n        return 0;\n    }\n};`,
        solutionCode: `class Solution {\npublic:\n    int solve(vector<int>& nums) {\n        int xorAll = 0;\n        long long bitScore = 0;\n        for (int x : nums) {\n            xorAll ^= x;\n            bitScore += static_cast<long long>(__builtin_popcount(static_cast<unsigned int>(x))) * ${k};\n        }\n        return static_cast<int>(static_cast<long long>(xorAll) + bitScore);\n    }\n};`,
        complexity: 'Time: O(N) | Space: O(1)',
        cases: makeCases(
          POSITIVE_ARRAYS.map((a) => JSON.stringify(a)),
          POSITIVE_ARRAYS.map((a) => JSON.stringify(evalBit(a))),
          `Combines array-wide XOR with weighted 32-bit popcount (*${k}).`
        ),
      };
    }

    case 10: {
      // Dynamic Programming: House Robber / Non-Adjacent Bonus Chain
      const cooldownBonus = offset;
      const evalDp = (nums: number[]) => {
        let take = 0;
        let skip = 0;
        for (const x of nums) {
          const val = Math.max(0, x) + cooldownBonus;
          const nextTake = skip + val;
          const nextSkip = Math.max(skip, take);
          take = nextTake;
          skip = nextSkip;
        }
        return Math.max(take, skip);
      };
      return {
        topic: 'Dynamic Programming',
        pattern: '1D Non-Adjacent Inclusion/Exclusion DP',
        difficulty: 'Medium',
        title: `Non-Adjacent Reward Maximizer (+${cooldownBonus}, #${tier + 1})`,
        statement: `Each element \`i\` offers reward \`max(0, nums[i]) + ${cooldownBonus}\`. You cannot select two adjacent indices \`i\` and \`i+1\`. Return the maximum total reward achievable.`,
        constraints: '0 <= nums.size() <= 10^5',
        signature: 'int solve(vector<int>& nums)',
        paramTypes: ['vector<int>'],
        returnType: 'int',
        stub: `class Solution {\npublic:\n    int solve(vector<int>& nums) {\n        // Rolling DP state: take vs skip\n        return 0;\n    }\n};`,
        solutionCode: `class Solution {\npublic:\n    int solve(vector<int>& nums) {\n        long long take = 0, skip = 0;\n        for (int x : nums) {\n            long long gain = max(0, x) + ${cooldownBonus};\n            long long nextTake = skip + gain;\n            long long nextSkip = max(skip, take);\n            take = nextTake;\n            skip = nextSkip;\n        }\n        return static_cast<int>(max(take, skip));\n    }\n};`,
        complexity: 'Time: O(N) | Space: O(1)',
        cases: makeCases(
          SAMPLE_ARRAYS.map((a) => JSON.stringify(a)),
          SAMPLE_ARRAYS.map((a) => JSON.stringify(evalDp(a))),
          `O(1)-space non-adjacent House Robber DP with per-pick bonus ${cooldownBonus}.`
        ),
      };
    }

    case 11: {
      // Dynamic Programming / Graph / Hard Path: Subarray Kadane + Skip-One OR Coin Ways
      // Let's make Case 11 Hard 1D/Grid DP: Maximum Subarray With At Most One Element Doubled/Adjusted!
      const evalHardDp = (nums: number[]) => {
        if (nums.length === 0) return 0;
        let noBoost = nums[0];
        let oneBoost = nums[0] * 2;
        let best = Math.max(noBoost, oneBoost);
        for (let i = 1; i < nums.length; i++) {
          const x = nums[i];
          const nextOneBoost = Math.max(noBoost + x * 2, x * 2, oneBoost + x);
          const nextNoBoost = Math.max(x, noBoost + x);
          noBoost = nextNoBoost;
          oneBoost = nextOneBoost;
          best = Math.max(best, noBoost, oneBoost);
        }
        return best;
      };
      return {
        topic: 'Dynamic Programming',
        pattern: 'State-Machine Kadane DP (0 vs 1 Boost)',
        difficulty: 'Hard',
        title: `Maximum Subarray With One Element Doubled (Variant #${tier + 1})`,
        statement: `Return the maximum sum of any non-empty contiguous subarray of \`nums\` (or \`0\` if empty) after optionally multiplying **at most one** element inside that subarray by \`2\`.`,
        constraints: '0 <= nums.size() <= 10^5\n-10^4 <= nums[i] <= 10^4',
        signature: 'int solve(vector<int>& nums)',
        paramTypes: ['vector<int>'],
        returnType: 'int',
        stub: `class Solution {\npublic:\n    int solve(vector<int>& nums) {\n        // Track best subarray sum ending here with 0 boosts vs 1 boost\n        return 0;\n    }\n};`,
        solutionCode: `class Solution {\npublic:\n    int solve(vector<int>& nums) {\n        if (nums.empty()) return 0;\n        long long noBoost = nums[0];\n        long long oneBoost = 2LL * nums[0];\n        long long best = max(noBoost, oneBoost);\n        for (size_t i = 1; i < nums.size(); ++i) {\n            long long x = nums[i];\n            long long nextBoost = max({noBoost + 2 * x, 2 * x, oneBoost + x});\n            long long nextPlain = max(x, noBoost + x);\n            noBoost = nextPlain;\n            oneBoost = nextBoost;\n            best = max({best, noBoost, oneBoost});\n        }\n        return static_cast<int>(best);\n    }\n};`,
        complexity: 'Time: O(N) | Space: O(1)',
        cases: makeCases(
          SAMPLE_ARRAYS.map((a) => JSON.stringify(a)),
          SAMPLE_ARRAYS.map((a) => JSON.stringify(evalHardDp(a))),
          `Two-state Kadane DP tracking plain vs single-doubled subarray sums.`
        ),
      };
    }

    case 12: {
      // Prefix Sum: Subarrays Divisible by K Count
      const evalPrefixMod = (nums: number[]) => {
        const cnt = new Map<number, number>([[0, 1]]);
        let pref = 0;
        let ans = 0;
        for (const x of nums) {
          pref = ((pref + x) % k + k) % k;
          const prev = cnt.get(pref) || 0;
          ans += prev;
          cnt.set(pref, prev + 1);
        }
        return ans;
      };
      return {
        topic: 'Prefix Sum',
        pattern: 'Modular Prefix Frequency Map',
        difficulty: 'Medium',
        title: `Subarray Sums Divisible by ${k} (#${tier + 1})`,
        statement: `Return the count of non-empty contiguous subarrays in \`nums\` whose element sum is divisible by \`${k}\`.`,
        constraints: `0 <= nums.size() <= 10^5\nModulus = ${k}`,
        signature: 'int solve(vector<int>& nums)',
        paramTypes: ['vector<int>'],
        returnType: 'int',
        stub: `class Solution {\npublic:\n    int solve(vector<int>& nums) {\n        // Count congruent prefix remainders modulo ${k}\n        return 0;\n    }\n};`,
        solutionCode: `class Solution {\npublic:\n    int solve(vector<int>& nums) {\n        vector<int> remCount(${k}, 0);\n        remCount[0] = 1;\n        long long pref = 0;\n        long long ans = 0;\n        for (int x : nums) {\n            pref = ((pref + x) % ${k} + ${k}) % ${k};\n            ans += remCount[pref];\n            remCount[pref]++;\n        }\n        return static_cast<int>(ans);\n    }\n};`,
        complexity: 'Time: O(N) | Space: O(K)',
        cases: makeCases(
          SAMPLE_ARRAYS.map((a) => JSON.stringify(a)),
          SAMPLE_ARRAYS.map((a) => JSON.stringify(evalPrefixMod(a))),
          `Counts matching positive remainders mod ${k}.`
        ),
      };
    }

    default: {
      // Intervals / Graphs / Recursion (alternated cleanly so all advanced topics get rich problems too!)
      const gapPenalty = offset;
      const isGraphLike = tier % 2 === 1;
      const evalMergedCount = (nums: number[]) => {
        // Pairwise intervals [nums[2i], nums[2i+1]] (normalized lo<=hi) -> merged union length sum
        const ivs: Array<[number, number]> = [];
        for (let i = 0; i + 1 < nums.length; i += 2) {
          const a = nums[i];
          const b = nums[i + 1];
          ivs.push([Math.min(a, b), Math.max(a, b)]);
        }
        if (ivs.length === 0) return 0;
        ivs.sort((p, q) => p[0] - q[0] || p[1] - q[1]);
        let curL = ivs[0][0];
        let curR = ivs[0][1];
        let mergedCount = 1;
        let totalSpan = 0;
        for (let i = 1; i < ivs.length; i++) {
          const [l, r] = ivs[i];
          if (l <= curR) {
            curR = Math.max(curR, r);
          } else {
            totalSpan += curR - curL + gapPenalty;
            curL = l;
            curR = r;
            mergedCount++;
          }
        }
        totalSpan += curR - curL + gapPenalty;
        return isGraphLike ? mergedCount : totalSpan;
      };
      return {
        topic: isGraphLike ? 'Graphs' : 'Intervals',
        pattern: isGraphLike ? 'Connected Interval Components' : 'Sorted Interval Sweep & Merge',
        difficulty: 'Hard',
        title: isGraphLike
          ? `Interval Intersection Component Count (Batch #${tier + 1})`
          : `Merged Interval Coverage Span (+${gapPenalty} per Block, #${tier + 1})`,
        statement: isGraphLike
          ? `Interpret consecutive pairs \`(nums[2i], nums[2i+1])\` as closed intervals \`[min(a,b), max(a,b)]\`. Two intervals belong to the same connected component if they intersect (including touching endpoints). Return the total number of connected components.`
          : `Interpret consecutive pairs \`(nums[2i], nums[2i+1])\` as closed intervals \`[min(a,b), max(a,b)]\`. Merge all overlapping/touching intervals, then return the sum of \`(end - start + ${gapPenalty})\` across all merged intervals.`,
        constraints: '0 <= nums.size() <= 10^4 (trailing odd element ignored if any)',
        signature: 'int solve(vector<int>& nums)',
        paramTypes: ['vector<int>'],
        returnType: 'int',
        stub: `class Solution {\npublic:\n    int solve(vector<int>& nums) {\n        // Build normalized intervals, sort, and sweep-merge\n        return 0;\n    }\n};`,
        solutionCode: `class Solution {\npublic:\n    int solve(vector<int>& nums) {\n        vector<pair<long long, long long>> ivs;\n        for (size_t i = 0; i + 1 < nums.size(); i += 2) {\n            long long a = nums[i], b = nums[i + 1];\n            ivs.push_back({min(a, b), max(a, b)});\n        }\n        if (ivs.empty()) return 0;\n        sort(ivs.begin(), ivs.end());\n        long long curL = ivs[0].first, curR = ivs[0].second;\n        long long components = 1, totalSpan = 0;\n        for (size_t i = 1; i < ivs.size(); ++i) {\n            if (ivs[i].first <= curR) {\n                curR = max(curR, ivs[i].second);\n            } else {\n                totalSpan += (curR - curL) + ${gapPenalty};\n                curL = ivs[i].first;\n                curR = ivs[i].second;\n                components++;\n            }\n        }\n        totalSpan += (curR - curL) + ${gapPenalty};\n        return static_cast<int>(${isGraphLike ? 'components' : 'totalSpan'});\n    }\n};`,
        complexity: 'Time: O(N log N) | Space: O(N)',
        cases: makeCases(
          SAMPLE_ARRAYS.map((a) => JSON.stringify(a)),
          SAMPLE_ARRAYS.map((a) => JSON.stringify(evalMergedCount(a))),
          `Sorts normalized endpoint pairs and merges touching/overlapping intervals.`
        ),
      };
    }
  }
}

export const DSA_EXTENDED_1970: ProblemDefinition[] = [];

for (let i = 0; i < 1970; i++) {
  const id = 1031 + i;
  const spec = buildDsaFamily(i, id);
  const cases: TestCase[] = spec.cases.map((c, idx) => ({
    id: idx + 1,
    input: c.input,
    expectedOutput: c.expectedOutput,
    isHidden: idx >= 2,
  }));

  DSA_EXTENDED_1970.push({
    id,
    slug: slugify(id, spec.title),
    title: spec.title,
    difficulty: spec.difficulty,
    category: 'DSA',
    topic: spec.topic,
    pattern: spec.pattern,
    statement: spec.statement,
    constraints: spec.constraints,
    examples: spec.cases.slice(0, 2).map((c) => ({
      input: c.input,
      output: c.expectedOutput,
      explanation: c.explanation,
    })),
    functionSignature: spec.signature,
    paramTypes: spec.paramTypes,
    returnType: spec.returnType,
    defaultCodeStub: spec.stub,
    sampleTestCases: cases.slice(0, 2),
    hiddenTestCases: cases.slice(2),
  });

  EXTENDED_DSA_SOLUTIONS.set(id, {
    complexity: spec.complexity,
    code: spec.solutionCode,
  });
}

export function getExtendedDsaSolution(problemId: number): { complexity: string; code: string } | null {
  return EXTENDED_DSA_SOLUTIONS.get(problemId) || null;
}
