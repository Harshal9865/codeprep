export interface LogicEasySolutionEntry {
  code: string;
  complexity?: string;
}

export const LOGIC_EASY_SOLUTIONS: Record<number, LogicEasySolutionEntry> = {
  601: {
    complexity: 'Time: O(1) | Space: O(1)',
    code: `class Solution {
public:
    bool isEven(int n) {
        return n % 2 == 0;
    }
};`,
  },
  602: {
    complexity: 'Time: O(1) | Space: O(1)',
    code: `class Solution {
public:
    int sumToN(int n) {
        if (n <= 0) return 0;
        return n * (n + 1) / 2;
    }
};`,
  },
  603: {
    complexity: 'Time: O(log10 |N|) | Space: O(1)',
    code: `class Solution {
public:
    int countDigits(int n) {
        long long num = n < 0 ? -static_cast<long long>(n) : static_cast<long long>(n);
        if (num == 0) return 1;
        int digits = 0;
        while (num > 0) {
            digits++;
            num /= 10;
        }
        return digits;
    }
};`,
  },
  604: {
    complexity: 'Time: O(log10 |N|) | Space: O(1)',
    code: `class Solution {
public:
    int sumOfDigits(int n) {
        long long num = n < 0 ? -static_cast<long long>(n) : static_cast<long long>(n);
        int sum = 0;
        while (num > 0) {
            sum += static_cast<int>(num % 10);
            num /= 10;
        }
        return sum;
    }
};`,
  },
  605: {
    complexity: 'Time: O(log10 N) | Space: O(1)',
    code: `class Solution {
public:
    int reverseDigits(int n) {
        int rev = 0;
        while (n > 0) {
            rev = rev * 10 + (n % 10);
            n /= 10;
        }
        return rev;
    }
};`,
  },
  606: {
    complexity: 'Time: O(log10 N) | Space: O(1)',
    code: `class Solution {
public:
    bool isNumberPalindrome(int n) {
        if (n < 0) return false;
        int original = n;
        long long rev = 0;
        while (n > 0) {
            rev = rev * 10 + (n % 10);
            n /= 10;
        }
        return rev == original;
    }
};`,
  },
  607: {
    complexity: 'Time: O(N) | Space: O(1)',
    code: `class Solution {
public:
    int findLargest(vector<int>& nums) {
        int best = nums[0];
        for (int x : nums) {
            if (x > best) best = x;
        }
        return best;
    }
};`,
  },
  608: {
    complexity: 'Time: O(N) | Space: O(1)',
    code: `class Solution {
public:
    int findSmallest(vector<int>& nums) {
        int smallest = nums[0];
        for (int x : nums) {
            if (x < smallest) smallest = x;
        }
        return smallest;
    }
};`,
  },
  609: {
    complexity: 'Time: O(N) | Space: O(1)',
    code: `class Solution {
public:
    int sumArray(vector<int>& nums) {
        long long sum = 0;
        for (int x : nums) sum += x;
        return static_cast<int>(sum);
    }
};`,
  },
  610: {
    complexity: 'Time: O(N) | Space: O(1)',
    code: `class Solution {
public:
    int countEvenNumbers(vector<int>& nums) {
        int count = 0;
        for (int x : nums) {
            if (x % 2 == 0) count++;
        }
        return count;
    }
};`,
  },
  611: {
    complexity: 'Time: O(N) | Space: O(1)',
    code: `class Solution {
public:
    int secondLargest(vector<int>& nums) {
        int first = -1, second = -1;
        for (int x : nums) {
            if (x > first) {
                second = first;
                first = x;
            } else if (x < first && x > second) {
                second = x;
            }
        }
        return second;
    }
};`,
  },
  612: {
    complexity: 'Time: O(N) | Space: O(1)',
    code: `class Solution {
public:
    bool isSorted(vector<int>& nums) {
        for (size_t i = 1; i < nums.size(); ++i) {
            if (nums[i - 1] > nums[i]) return false;
        }
        return true;
    }
};`,
  },
  613: {
    complexity: 'Time: O(N) | Space: O(1)',
    code: `class Solution {
public:
    vector<int> reverseArray(vector<int>& nums) {
        int l = 0, r = static_cast<int>(nums.size()) - 1;
        while (l < r) {
            swap(nums[l], nums[r]);
            l++;
            r--;
        }
        return nums;
    }
};`,
  },
  614: {
    complexity: 'Time: O(N) | Space: O(1)',
    code: `class Solution {
public:
    int countTarget(vector<int>& nums, int target) {
        int count = 0;
        for (int x : nums) {
            if (x == target) count++;
        }
        return count;
    }
};`,
  },
  615: {
    complexity: 'Time: O(N) | Space: O(1)',
    code: `class Solution {
public:
    int firstIndex(vector<int>& nums, int target) {
        for (int i = 0; i < static_cast<int>(nums.size()); ++i) {
            if (nums[i] == target) return i;
        }
        return -1;
    }
};`,
  },
  616: {
    complexity: 'Time: O(N) | Space: O(1)',
    code: `class Solution {
public:
    int sumEvenIndices(vector<int>& nums) {
        int sum = 0;
        for (size_t i = 0; i < nums.size(); i += 2) {
            sum += nums[i];
        }
        return sum;
    }
};`,
  },
  617: {
    complexity: 'Time: O(N) | Space: O(1)',
    code: `class Solution {
public:
    int countVowels(string s) {
        int count = 0;
        for (char c : s) {
            char lc = static_cast<char>(tolower(static_cast<unsigned char>(c)));
            if (lc == 'a' || lc == 'e' || lc == 'i' || lc == 'o' || lc == 'u') {
                count++;
            }
        }
        return count;
    }
};`,
  },
  618: {
    complexity: 'Time: O(N) | Space: O(1)',
    code: `class Solution {
public:
    string reverseText(string s) {
        int l = 0, r = static_cast<int>(s.size()) - 1;
        while (l < r) {
            swap(s[l], s[r]);
            l++;
            r--;
        }
        return s;
    }
};`,
  },
  619: {
    complexity: 'Time: O(N) | Space: O(1)',
    code: `class Solution {
public:
    string toggleCase(string s) {
        for (char& c : s) {
            unsigned char uc = static_cast<unsigned char>(c);
            if (islower(uc)) c = static_cast<char>(toupper(uc));
            else if (isupper(uc)) c = static_cast<char>(tolower(uc));
        }
        return s;
    }
};`,
  },
  620: {
    complexity: 'Time: O(N) | Space: O(1)',
    code: `class Solution {
public:
    int countWords(string s) {
        int words = 0;
        bool inWord = false;
        for (char c : s) {
            if (c != ' ' && !inWord) {
                words++;
                inWord = true;
            } else if (c == ' ') {
                inWord = false;
            }
        }
        return words;
    }
};`,
  },
  621: {
    complexity: 'Time: O(1) | Space: O(1)',
    code: `class Solution {
public:
    bool isLeapYear(int year) {
        return (year % 400 == 0) || (year % 4 == 0 && year % 100 != 0);
    }
};`,
  },
  622: {
    complexity: 'Time: O(N) | Space: O(1)',
    code: `class Solution {
public:
    long long factorialN(int n) {
        long long ans = 1;
        for (int i = 2; i <= n; ++i) {
            ans *= i;
        }
        return ans;
    }
};`,
  },
  623: {
    complexity: 'Time: O(sqrt(N)) | Space: O(1)',
    code: `class Solution {
public:
    bool isPrime(int n) {
        if (n <= 1) return false;
        for (long long i = 2; i * i <= n; ++i) {
            if (n % i == 0) return false;
        }
        return true;
    }
};`,
  },
  624: {
    complexity: 'Time: O(log min(a, b)) | Space: O(1)',
    code: `class Solution {
public:
    int findGcd(int a, int b) {
        while (b != 0) {
            int rem = a % b;
            a = b;
            b = rem;
        }
        return a;
    }
};`,
  },
  625: {
    complexity: 'Time: O(1) | Space: O(1)',
    code: `class Solution {
public:
    vector<int> multiplicationRow(int n) {
        vector<int> ans;
        ans.reserve(10);
        for (int i = 1; i <= 10; ++i) {
            ans.push_back(n * i);
        }
        return ans;
    }
};`,
  },
  626: {
    complexity: 'Time: O(N) | Space: O(N)',
    code: `class Solution {
public:
    vector<string> fizzBuzzList(int n) {
        vector<string> ans;
        ans.reserve(n);
        for (int i = 1; i <= n; ++i) {
            if (i % 15 == 0) ans.push_back("FizzBuzz");
            else if (i % 3 == 0) ans.push_back("Fizz");
            else if (i % 5 == 0) ans.push_back("Buzz");
            else ans.push_back(to_string(i));
        }
        return ans;
    }
};`,
  },
  627: {
    complexity: 'Time: O(N) | Space: O(1)',
    code: `class Solution {
public:
    int maxMinDifference(vector<int>& nums) {
        if (nums.size() <= 1) return 0;
        int minVal = nums[0], maxVal = nums[0];
        for (int x : nums) {
            minVal = min(minVal, x);
            maxVal = max(maxVal, x);
        }
        return maxVal - minVal;
    }
};`,
  },
  628: {
    complexity: 'Time: O(N) | Space: O(N)',
    code: `class Solution {
public:
    vector<int> runningSumSimple(vector<int>& nums) {
        vector<int> ans;
        ans.reserve(nums.size());
        int sum = 0;
        for (int x : nums) {
            sum += x;
            ans.push_back(sum);
        }
        return ans;
    }
};`,
  },
  629: {
    complexity: 'Time: O(N) | Space: O(1)',
    code: `class Solution {
public:
    vector<int> zerosToFront(vector<int>& nums) {
        int writeIdx = static_cast<int>(nums.size()) - 1;
        for (int i = writeIdx; i >= 0; --i) {
            if (nums[i] != 0) {
                nums[writeIdx--] = nums[i];
            }
        }
        while (writeIdx >= 0) {
            nums[writeIdx--] = 0;
        }
        return nums;
    }
};`,
  },
  630: {
    complexity: 'Time: O(log10 N) | Space: O(1)',
    code: `class Solution {
public:
    bool isArmstrong(int n) {
        if (n < 0) return false;
        if (n == 0) return true;
        int temp = n, digits = 0;
        while (temp > 0) {
            digits++;
            temp /= 10;
        }
        long long sum = 0;
        temp = n;
        while (temp > 0) {
            int d = temp % 10;
            long long p = 1;
            for (int k = 0; k < digits; ++k) p *= d;
            sum += p;
            temp /= 10;
        }
        return sum == n;
    }
};`,
  },
};
