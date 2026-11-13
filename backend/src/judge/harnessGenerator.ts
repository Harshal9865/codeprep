import crypto from 'crypto';
import { InputParser, ParsedSignature } from './inputParser';

export interface GeneratedHarness {
  fullCode: string;
  userCodeStartLine: number;
  userCodeEndLine: number;
  startMarker: string;
  endMarker: string;
  testSeparator: string;
  isStandaloneMain?: boolean;
  caseStartMarker?: string;
  caseEndMarker?: string;
  memMarker?: string;
  caseBeginStderrMarker?: string;
}

export interface HarnessOptions {
  allowStandaloneMain?: boolean;
  usePrecompiledHeader?: boolean;
}

export class HarnessGenerator {
  private static readonly SERVER_RUN_SALT = crypto.randomBytes(8).toString('hex');

  static getSharedPchHeaderSource(): string {
    return `#ifndef CODEPREP_STD_HPP
#define CODEPREP_STD_HPP

${this.buildStandardIncludes()}
using namespace std;

// Standard Algorithm Data Structures
struct ListNode {
    int val;
    ListNode *next;
    ListNode() : val(0), next(nullptr) {}
    ListNode(int x) : val(x), next(nullptr) {}
    ListNode(int x, ListNode *next) : val(x), next(next) {}
};

struct TreeNode {
    int val;
    TreeNode *left;
    TreeNode *right;
    TreeNode() : val(0), left(nullptr), right(nullptr) {}
    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
    TreeNode(int x, TreeNode *left, TreeNode *right) : val(x), left(left), right(right) {}
};

${this.buildCodePrepHelper()}

#endif
`;
  }

  private static stripCommentsAndStrings(code: string): string {
    return code
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/\/\/[^\n\r]*/g, ' ')
      .replace(/"(?:\\.|[^"\\])*"/g, '""')
      .replace(/'(?:\\.|[^'\\])*'/g, "''");
  }

  static hasCustomMain(userCode: string): boolean {
    const stripped = this.stripCommentsAndStrings(userCode);
    return (
      /\b(?:int|signed)\s+main\s*\(/.test(stripped) ||
      /#define\s+main\b/.test(stripped)
    );
  }

  static generateHarness(
    userCode: string,
    functionSignature: string,
    _testCases: Array<{ input: string; expectedOutput: string }>,
    options: HarnessOptions = {}
  ): GeneratedHarness {
    const rawNormalized = userCode.replace(/\r\n/g, '\n');

    if (this.hasCustomMain(rawNormalized)) {
      if (!options.allowStandaloneMain) {
        throw new Error(
          'Defining custom main() is prohibited for graded submissions. Please implement your solution inside class Solution (you can still run standalone main() programs using Run).'
        );
      }
      return this.generateStandaloneHarness(rawNormalized, options.usePrecompiledHeader);
    }

    const runId = this.SERVER_RUN_SALT;
    const startMarker = `__CODEPREP_OUT_START_${runId}__`;
    const endMarker = `__CODEPREP_OUT_END_${runId}__`;
    const testSeparator = `__CODEPREP_TEST_SEP_${runId}__`;
    const caseStartMarker = `__CODEPREP_CASE_START_${runId}__`;
    const caseEndMarker = `__CODEPREP_CASE_END_${runId}__`;
    const memMarker = `__CODEPREP_MEM_KB_${runId}__`;
    const caseBeginStderrMarker = `__CP_CASE_BEGIN_${runId}__`;

    const parsedSig = InputParser.parseSignature(functionSignature);
    const sigAndCode = `${functionSignature}\n${rawNormalized}`;
    const needsGraphNode = /\bNode\s*\*/.test(sigAndCode) && /\bneighbors\b/.test(sigAndCode)
      ? true
      : /\bNode\s*\*/.test(functionSignature);

    const processedUserCode = this.preprocessUserCode(rawNormalized, needsGraphNode);
    const strippedUser = this.stripCommentsAndStrings(processedUserCode);
    const hasSolutionClass = /\b(?:class|struct)\s+Solution\b/.test(strippedUser);

    const graphNodeBlock = needsGraphNode
      ? `
class Node {
public:
    int val;
    vector<Node*> neighbors;
    Node() { val = 0; neighbors = vector<Node*>(); }
    Node(int _val) { val = _val; neighbors = vector<Node*>(); }
    Node(int _val, vector<Node*> _neighbors) { val = _val; neighbors = _neighbors; }
};`
      : '';

    const prelude = options.usePrecompiledHeader
      ? `#include "codeprep_std.hpp"${graphNodeBlock}

// User Solution Code Injected Below
`
      : `${this.buildStandardIncludes()}
using namespace std;

// Standard Algorithm Data Structures
struct ListNode {
    int val;
    ListNode *next;
    ListNode() : val(0), next(nullptr) {}
    ListNode(int x) : val(x), next(nullptr) {}
    ListNode(int x, ListNode *next) : val(x), next(next) {}
};

struct TreeNode {
    int val;
    TreeNode *left;
    TreeNode *right;
    TreeNode() : val(0), left(nullptr), right(nullptr) {}
    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
    TreeNode(int x, TreeNode *left, TreeNode *right) : val(x), left(left), right(right) {}
};
${graphNodeBlock}

${this.buildCodePrepHelper()}

// User Solution Code Injected Below
`;

    const preludeLines = prelude.split('\n').length;
    const userCodeLines = processedUserCode.split('\n').length;
    const userCodeStartLine = preludeLines;
    const userCodeEndLine = userCodeStartLine + userCodeLines - 1;

    const invocationBlock = this.generateBatchInvocationCode(
      parsedSig,
      functionSignature,
      hasSolutionClass
    );

    const postlude = `
// Harness Execution Engine
int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    int numTests = 0;
    if (!(cin >> numTests)) return 0;

    auto readLengthPrefixed = [&]() -> string {
        size_t len = 0;
        if (!(cin >> len)) return "";
        cin.get();
        string buf(len, '\\0');
        if (len > 0) {
            cin.read(&buf[0], static_cast<streamsize>(len));
        }
        return buf;
    };

    const int paramCount = ${parsedSig ? parsedSig.params.length : 0};
    vector<vector<string>> allTestArgs(numTests, vector<string>(paramCount));
    for (int t = 0; t < numTests; ++t) {
        for (int p = 0; p < paramCount; ++p) {
            allTestArgs[t][p] = readLengthPrefixed();
        }
    }

    const char* caseStartMarker = "${caseStartMarker}";
    const char* caseEndMarker = "${caseEndMarker}";
    const char* caseBeginStderr = "${caseBeginStderrMarker}";
    const char* memMarker = "${memMarker}";

    for (int testIndex = 0; testIndex < numTests; ++testIndex) {
        cerr << caseBeginStderr << ":" << testIndex << "\\n";
        cerr.flush();

        const vector<string>& args = allTestArgs[testIndex];
        (void)args;

${invocationBlock}
    }

    long peakMemKb = 0;
#if defined(__linux__)
    struct rusage ru;
    if (getrusage(RUSAGE_SELF, &ru) == 0) {
        peakMemKb = ru.ru_maxrss;
    }
#endif
    cout << memMarker << ":" << peakMemKb << "\\n";
    cout.flush();
    return 0;
}
`;

    const fullCode = `${prelude}${processedUserCode}\n${postlude}`;

    return {
      fullCode,
      userCodeStartLine,
      userCodeEndLine,
      startMarker,
      endMarker,
      testSeparator,
      isStandaloneMain: false,
      caseStartMarker,
      caseEndMarker,
      memMarker,
      caseBeginStderrMarker,
    };
  }

  private static generateStandaloneHarness(
    userCode: string,
    usePrecompiledHeader = false
  ): GeneratedHarness {
    const runId = this.SERVER_RUN_SALT;
    const hasIncludes = /^\s*#include\b/m.test(userCode);

    let prelude = '';
    if (!hasIncludes) {
      prelude = usePrecompiledHeader
        ? `#include "codeprep_std.hpp"\n\n`
        : `${this.buildStandardIncludes()}
using namespace std;

`;
    }

    const userCodeStartLine = prelude ? prelude.split('\n').length : 1;
    const userCodeEndLine = userCodeStartLine + userCode.split('\n').length - 1;
    const fullCode = `${prelude}${userCode}\n`;

    return {
      fullCode,
      userCodeStartLine,
      userCodeEndLine,
      startMarker: `__CODEPREP_OUT_START_${runId}__`,
      endMarker: `__CODEPREP_OUT_END_${runId}__`,
      testSeparator: `__CODEPREP_TEST_SEP_${runId}__`,
      isStandaloneMain: true,
    };
  }

  /**
   * Neutralizes duplicate #includes and uncommented ListNode/TreeNode (or graph Node)
   * boilerplate while preserving exact 1:1 line count for accurate error remapping.
   */
  private static preprocessUserCode(code: string, needsGraphNode: boolean): string {
    const lines = code.split('\n');
    const output = [...lines];

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (/^#include\s*[<"][^>"]+[>"]/.test(trimmed)) {
        output[i] = `// [platform include] ${trimmed}`;
      } else if (/^using\s+namespace\s+std\s*;/.test(trimmed)) {
        output[i] = `// [platform std]`;
      }
    }

    const targetStructs = needsGraphNode
      ? ['ListNode', 'TreeNode', 'Node']
      : ['ListNode', 'TreeNode'];

    let i = 0;
    while (i < output.length) {
      const trimmed = output[i].trim();
      const structRegex = new RegExp(
        `^(?:struct|class)\\s+(${targetStructs.join('|')})\\b`
      );
      if (structRegex.test(trimmed) && !trimmed.endsWith(';')) {
        let braceDepth = 0;
        let sawOpenBrace = false;
        let endIdx = i;

        for (let j = i; j < output.length; j++) {
          const line = output[j];
          for (let c = 0; c < line.length; c++) {
            if (line[c] === '{') {
              braceDepth++;
              sawOpenBrace = true;
            } else if (line[c] === '}') {
              braceDepth--;
            }
          }
          endIdx = j;
          if (sawOpenBrace && braceDepth <= 0 && line.includes(';')) {
            break;
          }
        }

        if (sawOpenBrace && braceDepth <= 0) {
          for (let k = i; k <= endIdx; k++) {
            output[k] = '// [using platform node definition]';
          }
          i = endIdx + 1;
          continue;
        }
      }
      i++;
    }

    return output.join('\n');
  }

  private static buildStandardIncludes(): string {
    return `#include <iostream>
#include <vector>
#include <string>
#include <string_view>
#include <algorithm>
#include <queue>
#include <deque>
#include <stack>
#include <list>
#include <forward_list>
#include <array>
#include <bitset>
#include <tuple>
#include <utility>
#include <unordered_map>
#include <unordered_set>
#include <map>
#include <set>
#include <cmath>
#include <sstream>
#include <chrono>
#include <numeric>
#include <functional>
#include <limits>
#include <climits>
#include <cstdint>
#include <cstring>
#include <cctype>
#include <cassert>
#include <cstdio>
#include <cstdlib>
#include <iomanip>
#include <iterator>
#include <random>
#include <memory>
#include <regex>
#include <optional>
#include <variant>
#include <type_traits>
#if defined(__linux__) || defined(__APPLE__)
#include <sys/resource.h>
#endif`;
  }

  private static buildCodePrepHelper(): string {
    return `// Serialization / Deserialization Utilities
namespace CodePrepHelper {
    inline string trim(const string& s) {
        size_t start = s.find_first_not_of(" \\t\\r\\n");
        if (start == string::npos) return "";
        size_t end = s.find_last_not_of(" \\t\\r\\n");
        return s.substr(start, end - start + 1);
    }

    inline string parseString(const string& raw) {
        if (!raw.empty() && raw.find_first_not_of(' ') == string::npos) {
            return raw;
        }
        string t = trim(raw);
        if (t.size() >= 2 && ((t.front() == '"' && t.back() == '"') || (t.front() == (char)39 && t.back() == (char)39))) {
            string inner = t.substr(1, t.size() - 2);
            string out;
            out.reserve(inner.size());
            for (size_t i = 0; i < inner.size(); ++i) {
                if (inner[i] == (char)92 && i + 1 < inner.size()) {
                    char nx = inner[i + 1];
                    if (nx == 'n') { out.push_back('\\n'); ++i; continue; }
                    if (nx == 't') { out.push_back('\\t'); ++i; continue; }
                    if (nx == 'r') { out.push_back('\\r'); ++i; continue; }
                    out.push_back(nx);
                    ++i;
                } else {
                    out.push_back(inner[i]);
                }
            }
            return out;
        }
        return raw.find_first_not_of(" \\t\\r\\n") == string::npos ? raw : t;
    }

    inline int parseInt(const string& raw) {
        try {
            string t = trim(raw);
            return t.empty() ? 0 : stoi(t);
        } catch (...) {
            return 0;
        }
    }

    inline long long parseLong(const string& raw) {
        try {
            string t = trim(raw);
            return t.empty() ? 0LL : stoll(t);
        } catch (...) {
            return 0LL;
        }
    }

    inline unsigned long long parseUnsignedLong(const string& raw) {
        try {
            string t = trim(raw);
            return t.empty() ? 0ULL : stoull(t);
        } catch (...) {
            return 0ULL;
        }
    }

    inline double parseDouble(const string& raw) {
        try {
            string t = trim(raw);
            return t.empty() ? 0.0 : stod(t);
        } catch (...) {
            return 0.0;
        }
    }

    inline char parseChar(const string& raw) {
        string s = parseString(raw);
        return s.empty() ? '\\0' : s[0];
    }

    inline bool parseBool(const string& raw) {
        string t = trim(raw);
        for (char& c : t) c = static_cast<char>(tolower(static_cast<unsigned char>(c)));
        return t == "true" || t == "1";
    }

    inline vector<string> splitTopLevelArray(const string& raw) {
        vector<string> items;
        string t = trim(raw);
        if (t.size() < 2 || t.front() != '[' || t.back() != ']') return items;
        string inner = trim(t.substr(1, t.size() - 2));
        if (inner.empty()) return items;

        int depth = 0;
        bool inQuotes = false;
        char quoteChar = '"';
        size_t start = 0;

        for (size_t i = 0; i < inner.size(); ++i) {
            char c = inner[i];
            if ((c == '"' || c == (char)39) && (i == 0 || inner[i - 1] != (char)92)) {
                if (!inQuotes) {
                    inQuotes = true;
                    quoteChar = c;
                } else if (quoteChar == c) {
                    inQuotes = false;
                }
            } else if (!inQuotes) {
                if (c == '[' || c == '{') depth++;
                else if (c == ']' || c == '}') depth--;
                else if (c == ',' && depth == 0) {
                    items.push_back(trim(inner.substr(start, i - start)));
                    start = i + 1;
                }
            }
        }
        items.push_back(trim(inner.substr(start)));
        return items;
    }

    inline vector<int> parseVectorInt(const string& s) {
        vector<int> res;
        for (const string& item : splitTopLevelArray(s)) {
            if (!item.empty()) res.push_back(parseInt(item));
        }
        return res;
    }

    inline vector<long long> parseVectorLong(const string& s) {
        vector<long long> res;
        for (const string& item : splitTopLevelArray(s)) {
            if (!item.empty()) res.push_back(parseLong(item));
        }
        return res;
    }

    inline vector<double> parseVectorDouble(const string& s) {
        vector<double> res;
        for (const string& item : splitTopLevelArray(s)) {
            if (!item.empty()) res.push_back(parseDouble(item));
        }
        return res;
    }

    inline vector<bool> parseVectorBool(const string& s) {
        vector<bool> res;
        for (const string& item : splitTopLevelArray(s)) {
            if (!item.empty()) res.push_back(parseBool(item));
        }
        return res;
    }

    inline vector<string> parseVectorString(const string& s) {
        vector<string> res;
        for (const string& item : splitTopLevelArray(s)) {
            res.push_back(parseString(item));
        }
        return res;
    }

    inline vector<char> parseVectorChar(const string& s) {
        vector<char> res;
        for (const string& item : splitTopLevelArray(s)) {
            res.push_back(parseChar(item));
        }
        return res;
    }

    inline pair<int, int> parsePairInt(const string& s) {
        vector<int> v = parseVectorInt(s);
        return { v.size() > 0 ? v[0] : 0, v.size() > 1 ? v[1] : 0 };
    }

    inline vector<pair<int, int>> parseVectorPairInt(const string& s) {
        vector<pair<int, int>> res;
        for (const string& item : splitTopLevelArray(s)) {
            if (!item.empty()) res.push_back(parsePairInt(item));
        }
        return res;
    }

    inline vector<vector<int>> parseVectorVectorInt(const string& s) {
        vector<vector<int>> res;
        for (const string& item : splitTopLevelArray(s)) {
            if (!item.empty()) res.push_back(parseVectorInt(item));
        }
        return res;
    }

    inline vector<vector<long long>> parseVectorVectorLong(const string& s) {
        vector<vector<long long>> res;
        for (const string& item : splitTopLevelArray(s)) {
            if (!item.empty()) res.push_back(parseVectorLong(item));
        }
        return res;
    }

    inline vector<vector<double>> parseVectorVectorDouble(const string& s) {
        vector<vector<double>> res;
        for (const string& item : splitTopLevelArray(s)) {
            if (!item.empty()) res.push_back(parseVectorDouble(item));
        }
        return res;
    }

    inline vector<vector<string>> parseVectorVectorString(const string& s) {
        vector<vector<string>> res;
        for (const string& item : splitTopLevelArray(s)) {
            if (!item.empty()) res.push_back(parseVectorString(item));
        }
        return res;
    }

    inline vector<vector<char>> parseVectorVectorChar(const string& s) {
        vector<vector<char>> res;
        for (const string& item : splitTopLevelArray(s)) {
            if (!item.empty()) res.push_back(parseVectorChar(item));
        }
        return res;
    }

    inline ListNode* parseLinkedList(const string& s) {
        vector<int> vals = parseVectorInt(s);
        if (vals.empty()) return nullptr;
        ListNode dummy(0);
        ListNode* curr = &dummy;
        for (int v : vals) {
            curr->next = new ListNode(v);
            curr = curr->next;
        }
        return dummy.next;
    }

    inline vector<ListNode*> parseVectorLinkedList(const string& s) {
        vector<ListNode*> res;
        for (const string& item : splitTopLevelArray(s)) {
            res.push_back(parseLinkedList(item));
        }
        return res;
    }

    inline TreeNode* parseTree(const string& s) {
        vector<string> tokens = splitTopLevelArray(s);
        if (tokens.empty() || tokens[0] == "null" || tokens[0] == "None") return nullptr;
        TreeNode* root = new TreeNode(parseInt(tokens[0]));
        queue<TreeNode*> q;
        q.push(root);
        size_t i = 1;
        while (!q.empty() && i < tokens.size()) {
            TreeNode* curr = q.front();
            q.pop();
            if (i < tokens.size()) {
                if (tokens[i] != "null" && tokens[i] != "None") {
                    curr->left = new TreeNode(parseInt(tokens[i]));
                    q.push(curr->left);
                }
                i++;
            }
            if (i < tokens.size()) {
                if (tokens[i] != "null" && tokens[i] != "None") {
                    curr->right = new TreeNode(parseInt(tokens[i]));
                    q.push(curr->right);
                }
                i++;
            }
        }
        return root;
    }

    inline vector<TreeNode*> parseVectorTree(const string& s) {
        vector<TreeNode*> res;
        for (const string& item : splitTopLevelArray(s)) {
            res.push_back(parseTree(item));
        }
        return res;
    }

    inline void printJsonString(const string& s) {
        cout << '"';
        for (unsigned char uc : s) {
            char c = static_cast<char>(uc);
            if (c == '"') cout << (char)92 << '"';
            else if (c == (char)92) cout << (char)92 << (char)92;
            else if (c == '\\n') cout << (char)92 << 'n';
            else if (c == '\\r') cout << (char)92 << 'r';
            else if (c == '\\t') cout << (char)92 << 't';
            else cout << c;
        }
        cout << '"';
    }

    inline void printValue(bool v) { cout << (v ? "true" : "false"); }

    inline void printValue(char c) {
        string s(1, c);
        printJsonString(s);
    }

    inline void printValue(const string& s) { printJsonString(s); }
    inline void printValue(const char* s) { printJsonString(s ? string(s) : ""); }

    inline void printValue(double d) {
        if (fabs(d) < 1e-9) d = 0.0;
        ios_base::fmtflags prevFlags = cout.flags();
        streamsize prevPrec = cout.precision();
        cout << fixed << setprecision(5) << d;
        cout.flags(prevFlags);
        cout.precision(prevPrec);
    }
    inline void printValue(float f) { printValue(static_cast<double>(f)); }
    inline void printValue(long double ld) { printValue(static_cast<double>(ld)); }

    template <typename T, typename enable_if<is_integral<T>::value, int>::type = 0>
    inline void printValue(T v) {
        cout << v;
    }

    inline void printValue(ListNode* head) {
        cout << "[";
        ListNode* curr = head;
        unordered_set<ListNode*> seen;
        bool first = true;
        int guard = 0;
        while (curr && guard < 100000) {
            if (!seen.insert(curr).second) break;
            if (!first) cout << ",";
            cout << curr->val;
            first = false;
            curr = curr->next;
            guard++;
        }
        cout << "]";
    }

    inline void printValue(TreeNode* root) {
        if (!root) { cout << "[]"; return; }
        vector<string> out;
        queue<TreeNode*> q;
        q.push(root);
        while (!q.empty()) {
            TreeNode* node = q.front();
            q.pop();
            if (node) {
                out.push_back(to_string(node->val));
                q.push(node->left);
                q.push(node->right);
            } else {
                out.push_back("null");
            }
        }
        while (!out.empty() && out.back() == "null") out.pop_back();
        cout << "[";
        for (size_t i = 0; i < out.size(); i++) {
            if (i > 0) cout << ",";
            cout << out[i];
        }
        cout << "]";
    }

    inline void printValue(const vector<bool>& v) {
        cout << "[";
        for (size_t i = 0; i < v.size(); i++) {
            if (i > 0) cout << ",";
            bool elem = v[i];
            printValue(elem);
        }
        cout << "]";
    }

    template <typename A, typename B>
    inline void printValue(const pair<A, B>& p);

    template <typename T>
    inline void printValue(const vector<T>& v) {
        cout << "[";
        for (size_t i = 0; i < v.size(); i++) {
            if (i > 0) cout << ",";
            printValue(v[i]);
        }
        cout << "]";
    }

    template <typename A, typename B>
    inline void printValue(const pair<A, B>& p) {
        cout << "[";
        printValue(p.first);
        cout << ",";
        printValue(p.second);
        cout << "]";
    }
}`;
  }

  private static emitArgDeserializer(idx: number, normType: string): string {
    const argName = `arg_${idx}`;
    const rawExpr = `args[${idx}]`;

    if (normType.includes('vector<vector<char>>')) {
      return `        auto ${argName} = CodePrepHelper::parseVectorVectorChar(${rawExpr});\n`;
    }
    if (normType.includes('vector<vector<string>>')) {
      return `        auto ${argName} = CodePrepHelper::parseVectorVectorString(${rawExpr});\n`;
    }
    if (normType.includes('vector<vector<long')) {
      return `        auto ${argName} = CodePrepHelper::parseVectorVectorLong(${rawExpr});\n`;
    }
    if (normType.includes('vector<vector<double')) {
      return `        auto ${argName} = CodePrepHelper::parseVectorVectorDouble(${rawExpr});\n`;
    }
    if (normType.includes('vector<vector<int>>')) {
      return `        auto ${argName} = CodePrepHelper::parseVectorVectorInt(${rawExpr});\n`;
    }
    if (normType.includes('vector<pair<int,int>>')) {
      return `        auto ${argName} = CodePrepHelper::parseVectorPairInt(${rawExpr});\n`;
    }
    if (normType.includes('vector<ListNode')) {
      return `        auto ${argName} = CodePrepHelper::parseVectorLinkedList(${rawExpr});\n`;
    }
    if (normType.includes('vector<TreeNode')) {
      return `        auto ${argName} = CodePrepHelper::parseVectorTree(${rawExpr});\n`;
    }
    if (normType.includes('vector<char>')) {
      return `        auto ${argName} = CodePrepHelper::parseVectorChar(${rawExpr});\n`;
    }
    if (normType.includes('vector<string>')) {
      return `        auto ${argName} = CodePrepHelper::parseVectorString(${rawExpr});\n`;
    }
    if (normType.includes('vector<long')) {
      return `        auto ${argName} = CodePrepHelper::parseVectorLong(${rawExpr});\n`;
    }
    if (normType.includes('vector<double')) {
      return `        auto ${argName} = CodePrepHelper::parseVectorDouble(${rawExpr});\n`;
    }
    if (normType.includes('vector<bool>')) {
      return `        auto ${argName} = CodePrepHelper::parseVectorBool(${rawExpr});\n`;
    }
    if (normType.includes('vector<int>')) {
      return `        auto ${argName} = CodePrepHelper::parseVectorInt(${rawExpr});\n`;
    }
    if (normType.includes('pair<int,int>')) {
      return `        auto ${argName} = CodePrepHelper::parsePairInt(${rawExpr});\n`;
    }
    if (normType.includes('TreeNode')) {
      return `        TreeNode* ${argName} = CodePrepHelper::parseTree(${rawExpr});\n`;
    }
    if (normType.includes('ListNode')) {
      return `        ListNode* ${argName} = CodePrepHelper::parseLinkedList(${rawExpr});\n`;
    }
    if (normType === 'string' || normType === 'std::string') {
      return `        string ${argName} = CodePrepHelper::parseString(${rawExpr});\n`;
    }
    if (normType.includes('unsigned long')) {
      return `        unsigned long long ${argName} = CodePrepHelper::parseUnsignedLong(${rawExpr});\n`;
    }
    if (normType.includes('long')) {
      return `        long long ${argName} = CodePrepHelper::parseLong(${rawExpr});\n`;
    }
    if (normType.includes('double') || normType.includes('float')) {
      return `        double ${argName} = CodePrepHelper::parseDouble(${rawExpr});\n`;
    }
    if (normType.includes('bool')) {
      return `        bool ${argName} = CodePrepHelper::parseBool(${rawExpr});\n`;
    }
    if (normType.includes('char')) {
      return `        char ${argName} = CodePrepHelper::parseChar(${rawExpr});\n`;
    }
    return `        int ${argName} = CodePrepHelper::parseInt(${rawExpr});\n`;
  }

  private static generateBatchInvocationCode(
    parsedSig: ParsedSignature | null,
    rawSig: string,
    hasSolutionClass: boolean
  ): string {
    if (!parsedSig) {
      return `        cout << "\\n" << caseStartMarker << ":" << testIndex << ":" << "error: unrecognized function signature (${rawSig.replace(/"/g, '')})" << caseEndMarker << ":" << testIndex << ":0.000\\n";`;
    }

    const { returnType, methodName, params } = parsedSig;
    let code = '';

    if (hasSolutionClass) {
      code += `        Solution solver;\n`;
    }

    const callArgs: string[] = [];
    params.forEach((p, idx) => {
      code += this.emitArgDeserializer(idx, p.normType);
      callArgs.push(`arg_${idx}`);
    });

    const targetCall = hasSolutionClass
      ? `solver.${methodName}(${callArgs.join(', ')})`
      : `${methodName}(${callArgs.join(', ')})`;

    code += `        auto t_start = chrono::high_resolution_clock::now();\n`;
    if (returnType === 'void') {
      code += `        ${targetCall};\n`;
    } else {
      code += `        auto result = ${targetCall};\n`;
    }
    code += `        auto t_end = chrono::high_resolution_clock::now();\n`;
    code += `        double elapsed_ms = chrono::duration<double, milli>(t_end - t_start).count();\n`;
    code += `        cout.flush();\n`;
    code += `        fflush(stdout);\n`;
    code += `        cout << "\\n" << caseStartMarker << ":" << testIndex << ":";\n`;
    if (returnType === 'void') {
      if (callArgs.length > 0) {
        code += `        CodePrepHelper::printValue(${callArgs[0]});\n`;
      }
    } else {
      code += `        CodePrepHelper::printValue(result);\n`;
    }
    code += `        cout << caseEndMarker << ":" << testIndex << ":" << fixed << setprecision(3) << elapsed_ms << "\\n";\n`;

    return code;
  }
}
