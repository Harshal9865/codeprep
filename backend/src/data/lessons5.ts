export interface LessonData {
  problemId: number;
  techniqueLesson: string;
  visualTraceJson: string;
  workedExamples: string;
  approachProgression: string;
  verifiedSolution: string;
  similarProblemsJson: string;
}

export const VERIFIED_5_LESSONS: LessonData[] = [
  {
    problemId: 1, // Two Sum
    techniqueLesson: `### Technique Breakdown: Hash Map Complement Lookup

#### 1. What the Pattern Is
The Complement Lookup pattern trades O(N) auxiliary space to reduce a quadratic O(N^2) pairwise search down to linear O(N) time. As we iterate through the sequence, for every value x, we determine its required complement: \`target - x\`. We then query our hash table to see if that complement has already been observed.

#### 2. When to Recognize It
- When asked to find two elements in an unsorted array that satisfy a specific sum, difference, or relationship.
- When an O(N^2) brute-force nested loop can be avoided by remembering historical elements in O(1) average lookup time.

#### 3. Reusable C++ Template
\`\`\`cpp
unordered_map<int, int> seen; // value -> index
for (int i = 0; i < (int)nums.size(); i++) {
    int complement = target - nums[i];
    if (seen.find(complement) != seen.end()) {
        return {seen[complement], i};
    }
    seen[nums[i]] = i;
}
return {};
\`\`\`

#### 4. Common Interview Mistakes
- **Self-matching**: Checking if \`target - nums[i]\` exists without verifying that the index differs from \`i\`. Storing elements after the check avoids this cleanly.
- **Duplicate elements**: Using an ordered map where duplicate keys overwrite necessary earliest occurrences. A single pass naturally uses the earliest seen index.`,
    visualTraceJson: JSON.stringify({
      steps: [
        {
          step: 1,
          description: "Initialize empty hash map seen = {}. Inspect index 0: nums[0] = 2. Complement = 9 - 2 = 7.",
          currentIndex: 0,
          currentValue: 2,
          complement: 7,
          hashMap: {},
          state: "7 not in map -> store seen[2] = 0"
        },
        {
          step: 2,
          description: "Inspect index 1: nums[1] = 7. Complement = 9 - 7 = 2.",
          currentIndex: 1,
          currentValue: 7,
          complement: 2,
          hashMap: { "2": 0 },
          state: "2 found in map at index 0! Target pair located: [0, 1]"
        }
      ]
    }),
    workedExamples: `#### Worked Example 1 (Standard):
- **Input**: nums = [2, 7, 11, 15], target = 9
- **Iteration 0**: num = 2, complement = 7. Map is empty. Insert seen[2] = 0.
- **Iteration 1**: num = 7, complement = 2. 2 exists in map at index 0. Return [0, 1].

#### Worked Example 2 (Negative Numbers & Zeroes):
- **Input**: nums = [-3, 4, 3, 90], target = 0
- **Iteration 0**: num = -3, complement = 3. Insert seen[-3] = 0.
- **Iteration 1**: num = 4, complement = -4. Insert seen[4] = 1.
- **Iteration 2**: num = 3, complement = -3. -3 exists in map at index 0. Return [0, 2].`,
    approachProgression: `### Approach Progression & Complexity

1. **Brute Force (Nested Loops)**:
   - Check every pair (i, j) with 0 <= i < j < n.
   - **Time Complexity**: O(N^2)
   - **Space Complexity**: O(1)
   - *Verdict*: Times out on N = 10^4 constraints.

2. **Optimal Approach (Single-Pass Hash Map)**:
   - Build hash map dynamically while checking for the complement.
   - **Time Complexity**: O(N) average time (O(1) hash map operations).
   - **Space Complexity**: O(N) to store up to N elements.
   - *Verdict*: Accepted, optimal for unsorted inputs.`,
    verifiedSolution: `class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        // Fast hash table storing: number -> original index
        unordered_map<int, int> seen;
        
        for (int i = 0; i < (int)nums.size(); ++i) {
            int complement = target - nums[i];
            
            // Check if complement was already encountered
            auto it = seen.find(complement);
            if (it != seen.end()) {
                return {it->second, i};
            }
            
            // Record current value and index for future lookups
            seen[nums[i]] = i;
        }
        
        return {};
    }
};`,
    similarProblemsJson: JSON.stringify([
      { id: 3, title: "Contains Duplicate" },
      { id: 6, title: "Two Sum II - Input Array Is Sorted" },
      { id: 7, title: "3Sum" }
    ])
  },
  {
    problemId: 2, // Best Time to Buy and Sell Stock
    techniqueLesson: `### Technique Breakdown: Dynamic Minimum Tracking (Greedy Single-Pass)

#### 1. What the Pattern Is
Tracking the minimum historical prefix element allows computing the maximum possible gain ending on any given day in O(1) time per step.

#### 2. When to Recognize It
- When asked to find the maximum difference \`A[j] - A[i]\` where \`j > i\`.
- Problems requiring decisions based strictly on prior historical state.

#### 3. Reusable C++ Template
\`\`\`cpp
int minVal = INT_MAX;
int maxDiff = 0;
for (int x : nums) {
    minVal = min(minVal, x);
    maxDiff = max(maxDiff, x - minVal);
}
return maxDiff;
\`\`\`

#### 4. Common Mistakes
- Initializing minPrice to 0 instead of INT_MAX (fails when all prices are positive).
- Trying to sell before buying (nested loop ordering bugs).`,
    visualTraceJson: JSON.stringify({
      steps: [
        { step: 1, day: 0, price: 7, minPrice: 7, profit: 0, maxProfit: 0 },
        { step: 2, day: 1, price: 1, minPrice: 1, profit: 0, maxProfit: 0 },
        { step: 3, day: 2, price: 5, minPrice: 1, profit: 4, maxProfit: 4 },
        { step: 4, day: 3, price: 3, minPrice: 1, profit: 2, maxProfit: 4 },
        { step: 5, day: 4, price: 6, minPrice: 1, profit: 5, maxProfit: 5 },
        { step: 6, day: 5, price: 4, minPrice: 1, profit: 3, maxProfit: 5 }
      ]
    }),
    workedExamples: `#### Worked Example:
- **Input**: prices = [7, 1, 5, 3, 6, 4]
- Min price observed drops to 1 on day 1.
- Day 4 price = 6 -> profit = 6 - 1 = 5.
- Max profit = 5.`,
    approachProgression: `### Complexity Analysis
- **Brute Force**: O(N^2) time, O(1) space.
- **Optimal (Single-Pass Min Tracking)**: O(N) time, O(1) space.`,
    verifiedSolution: `class Solution {
public:
    int maxProfit(vector<int>& prices) {
        int minPrice = INT_MAX;
        int maxProfit = 0;
        
        for (int price : prices) {
            if (price < minPrice) {
                minPrice = price;
            } else if (price - minPrice > maxProfit) {
                maxProfit = price - minPrice;
            }
        }
        
        return maxProfit;
    }
};`,
    similarProblemsJson: JSON.stringify([
      { id: 8, title: "Container With Most Water" },
      { id: 15, title: "Maximum Subarray" }
    ])
  },
  {
    problemId: 10, // Valid Parentheses
    techniqueLesson: `### Technique Breakdown: Last-In First-Out (Stack Matching)

#### 1. What the Pattern Is
A stack mirrors nested structural constraints. When an opening bracket is read, we expect its matching closing bracket. The most recently opened bracket must be the first one closed.

#### 2. Reusable C++ Template
\`\`\`cpp
stack<char> st;
for (char c : s) {
    if (c == '(') st.push(')');
    else if (c == '{') st.push('}');
    else if (c == '[') st.push(']');
    else {
        if (st.empty() || st.top() != c) return false;
        st.pop();
    }
}
return st.empty();
\`\`\``,
    visualTraceJson: JSON.stringify({
      steps: [
        { step: 1, char: "(", stack: [")"], status: "Pushed expected ')'" },
        { step: 2, char: "[", stack: [")", "]"], status: "Pushed expected ']'" },
        { step: 3, char: "]", stack: [")"], status: "Matched and popped ']'" },
        { step: 4, char: ")", stack: [], status: "Matched and popped ')'" }
      ]
    }),
    workedExamples: `#### Examples:
1. s = "()[]{}" -> All match properly. Returns true.
2. s = "([)]" -> ']' encounters ')' on stack top. Returns false.`,
    approachProgression: `### Complexity
- **Time Complexity**: O(N) - single pass over string.
- **Space Complexity**: O(N) - stack holds at most N elements.`,
    verifiedSolution: `class Solution {
public:
    bool isValid(string s) {
        stack<char> st;
        for (char c : s) {
            if (c == '(') st.push(')');
            else if (c == '{') st.push('}');
            else if (c == '[') st.push(']');
            else {
                if (st.empty() || st.top() != c) return false;
                st.pop();
            }
        }
        return st.empty();
    }
};`,
    similarProblemsJson: JSON.stringify([
      { id: 11, title: "Reverse Linked List" }
    ])
  },
  {
    problemId: 11, // Reverse Linked List
    techniqueLesson: `### Technique Breakdown: Three-Pointer In-Place Reversal

#### 1. What the Pattern Is
Reversing a singly-linked list requires redirecting each node's \`next\` pointer to its predecessor. To avoid losing the rest of the list, a temporary pointer stores the next node before overwriting.

#### 2. Invariants
- \`prev\`: points to the reversed head.
- \`curr\`: current node being redirected.
- \`nextTemp\`: stores \`curr->next\` to continue traversal.`,
    visualTraceJson: JSON.stringify({
      steps: [
        { step: 1, prev: "nullptr", curr: "1", next: "2", status: "1->next redirected to nullptr" },
        { step: 2, prev: "1", curr: "2", next: "3", status: "2->next redirected to 1" },
        { step: 3, prev: "2", curr: "3", next: "nullptr", status: "3->next redirected to 2" }
      ]
    }),
    workedExamples: `Input: 1 -> 2 -> 3 -> nullptr
- Step 1: 1 -> nullptr
- Step 2: 2 -> 1 -> nullptr
- Step 3: 3 -> 2 -> 1 -> nullptr
Result: 3 -> 2 -> 1 -> nullptr`,
    approachProgression: `### Complexity
- **Time Complexity**: O(N) - single traversal.
- **Space Complexity**: O(1) - strictly in-place pointer mutation.`,
    verifiedSolution: `class Solution {
public:
    ListNode* reverseList(ListNode* head) {
        ListNode* prev = nullptr;
        ListNode* curr = head;
        
        while (curr != nullptr) {
            ListNode* nextTemp = curr->next;
            curr->next = prev;
            prev = curr;
            curr = nextTemp;
        }
        
        return prev;
    }
};`,
    similarProblemsJson: JSON.stringify([
      { id: 12, title: "Merge Two Sorted Lists" }
    ])
  },
  {
    problemId: 15, // Maximum Subarray (Kadane's Algorithm)
    techniqueLesson: `### Technique Breakdown: Kadane's Algorithm (Dynamic Programming)

#### 1. What the Pattern Is
At each index \`i\`, the maximum subarray sum ending at \`i\` is either \`nums[i]\` alone (starting a new subarray) or \`currentSum + nums[i]\` (extending the existing subarray).

#### 2. Reusable Template
\`\`\`cpp
int currentSum = nums[0];
int maxSum = nums[0];
for (size_t i = 1; i < nums.size(); ++i) {
    currentSum = max(nums[i], currentSum + nums[i]);
    maxSum = max(maxSum, currentSum);
}
return maxSum;
\`\`\``,
    visualTraceJson: JSON.stringify({
      steps: [
        { step: 1, idx: 0, val: -2, currentSum: -2, maxSum: -2 },
        { step: 2, idx: 1, val: 1, currentSum: 1, maxSum: 1, decision: "Restart subarray at 1" },
        { step: 3, idx: 2, val: -3, currentSum: -2, maxSum: 1, decision: "Extend subarray" },
        { step: 4, idx: 3, val: 4, currentSum: 4, maxSum: 4, decision: "Restart subarray at 4" },
        { step: 5, idx: 4, val: -1, currentSum: 3, maxSum: 4 },
        { step: 6, idx: 5, val: 2, currentSum: 5, maxSum: 5 },
        { step: 7, idx: 6, val: 1, currentSum: 6, maxSum: 6 }
      ]
    }),
    workedExamples: `Input: [-2, 1, -3, 4, -1, 2, 1, -5, 4]
Optimal subarray: [4, -1, 2, 1] with sum = 6.`,
    approachProgression: `### Complexity
- **Brute Force**: O(N^3) or O(N^2) checking all subarrays.
- **Optimal (Kadane's Algorithm)**: O(N) time, O(1) space.`,
    verifiedSolution: `class Solution {
public:
    int maxSubArray(vector<int>& nums) {
        int currentSum = nums[0];
        int maxSum = nums[0];
        
        for (size_t i = 1; i < nums.size(); ++i) {
            currentSum = max(nums[i], currentSum + nums[i]);
            maxSum = max(maxSum, currentSum);
        }
        
        return maxSum;
    }
};`,
    similarProblemsJson: JSON.stringify([
      { id: 2, title: "Best Time to Buy and Sell Stock" },
      { id: 16, title: "Climbing Stairs" }
    ])
  }
];

