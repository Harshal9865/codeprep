import crypto from 'crypto';

export interface GeneratedHarness {
  fullCode: string;
  userCodeStartLine: number;
  userCodeEndLine: number;
  startMarker: string;
  endMarker: string;
  testSeparator: string;
}

export class HarnessGenerator {
  static generateHarness(
    userCode: string,
    functionSignature: string,
    _testCases: Array<{ input: string; expectedOutput: string }>
  ): GeneratedHarness {
    // Check for malicious main hijacking
    const sanitizedUserCode = userCode.trim();
    if (/\bint\s+main\s*\(/.test(sanitizedUserCode) || /#define\s+main\b/.test(sanitizedUserCode)) {
      throw new Error('Defining custom main() is prohibited. Please implement your method inside class Solution.');
    }

    const runId = crypto.randomBytes(8).toString('hex');
    const startMarker = `__CODEPREP_OUT_START_${runId}__`;
    const endMarker = `__CODEPREP_OUT_END_${runId}__`;
    const testSeparator = `__CODEPREP_TEST_SEP_${runId}__`;

    const prelude = `#include <iostream>
#include <vector>
#include <string>
#include <algorithm>
#include <queue>
#include <deque>
#include <stack>
#include <unordered_map>
#include <unordered_set>
#include <map>
#include <set>
#include <cmath>
#include <sstream>
#include <chrono>
#include <numeric>
#include <climits>
#include <cstring>
#include <cassert>
#include <iomanip>

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

class Node {
public:
    int val;
    vector<Node*> neighbors;
    Node() { val = 0; neighbors = vector<Node*>(); }
    Node(int _val) { val = _val; neighbors = vector<Node*>(); }
    Node(int _val, vector<Node*> _neighbors) { val = _val; neighbors = _neighbors; }
};

// Serialization / Deserialization Utilities
namespace CodePrepHelper {
    inline string trim(const string& s) {
        size_t start = s.find_first_not_of(" \\t\\r\\n");
        if (start == string::npos) return "";
        size_t end = s.find_last_not_of(" \\t\\r\\n");
        return s.substr(start, end - start + 1);
    }

    inline string parseString(const string& raw) {
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
                    out.push_back(nx);
                    ++i;
                } else {
                    out.push_back(inner[i]);
                }
            }
            return out;
        }
        return t;
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
        return t == "true" || t == "1";
    }

    inline vector<string> splitTopLevelArray(const string& t) {
        vector<string> items;
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
        for (const string& item : splitTopLevelArray(trim(s))) {
            if (!item.empty()) res.push_back(parseInt(item));
        }
        return res;
    }

    inline vector<long long> parseVectorLong(const string& s) {
        vector<long long> res;
        for (const string& item : splitTopLevelArray(trim(s))) {
            if (!item.empty()) res.push_back(parseLong(item));
        }
        return res;
    }

    inline vector<double> parseVectorDouble(const string& s) {
        vector<double> res;
        for (const string& item : splitTopLevelArray(trim(s))) {
            if (!item.empty()) res.push_back(parseDouble(item));
        }
        return res;
    }

    inline vector<string> parseVectorString(const string& s) {
        vector<string> res;
        for (const string& item : splitTopLevelArray(trim(s))) {
            res.push_back(parseString(item));
        }
        return res;
    }

    inline vector<char> parseVectorChar(const string& s) {
        vector<char> res;
        for (const string& item : splitTopLevelArray(trim(s))) {
            res.push_back(parseChar(item));
        }
        return res;
    }

    inline vector<vector<int>> parseVectorVectorInt(const string& s) {
        vector<vector<int>> res;
        for (const string& item : splitTopLevelArray(trim(s))) {
            if (!item.empty()) res.push_back(parseVectorInt(item));
        }
        return res;
    }

    inline vector<vector<string>> parseVectorVectorString(const string& s) {
        vector<vector<string>> res;
        for (const string& item : splitTopLevelArray(trim(s))) {
            if (!item.empty()) res.push_back(parseVectorString(item));
        }
        return res;
    }

    inline vector<vector<char>> parseVectorVectorChar(const string& s) {
        vector<vector<char>> res;
        for (const string& item : splitTopLevelArray(trim(s))) {
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

    inline TreeNode* parseTree(const string& s) {
        vector<string> tokens = splitTopLevelArray(trim(s));
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

    inline void printLinkedList(ListNode* head) {
        cout << "[";
        ListNode* curr = head;
        bool first = true;
        while (curr) {
            if (!first) cout << ",";
            cout << curr->val;
            first = false;
            curr = curr->next;
        }
        cout << "]";
    }

    inline void printTree(TreeNode* root) {
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

    inline void printJsonString(const string& s) {
        cout << '"';
        for (char c : s) {
            if (c == '"') cout << (char)92 << '"';
            else if (c == (char)92) cout << (char)92 << (char)92;
            else if (c == '\\n') cout << (char)92 << 'n';
            else if (c == '\\t') cout << (char)92 << 't';
            else cout << c;
        }
        cout << '"';
    }

    template <typename T>
    inline void printVector(const vector<T>& v) {
        cout << "[";
        for (size_t i = 0; i < v.size(); i++) {
            if (i > 0) cout << ",";
            cout << v[i];
        }
        cout << "]";
    }

    inline void printVectorBool(const vector<bool>& v) {
        cout << "[";
        for (size_t i = 0; i < v.size(); i++) {
            if (i > 0) cout << ",";
            cout << (v[i] ? "true" : "false");
        }
        cout << "]";
    }

    inline void printVectorString(const vector<string>& v) {
        cout << "[";
        for (size_t i = 0; i < v.size(); i++) {
            if (i > 0) cout << ",";
            printJsonString(v[i]);
        }
        cout << "]";
    }

    inline void printVectorChar(const vector<char>& v) {
        cout << "[";
        for (size_t i = 0; i < v.size(); i++) {
            if (i > 0) cout << ",";
            cout << '"' << v[i] << '"';
        }
        cout << "]";
    }

    inline void printVectorVectorInt(const vector<vector<int>>& vv) {
        cout << "[";
        for (size_t i = 0; i < vv.size(); i++) {
            if (i > 0) cout << ",";
            printVector(vv[i]);
        }
        cout << "]";
    }

    inline void printVectorVectorString(const vector<vector<string>>& vv) {
        cout << "[";
        for (size_t i = 0; i < vv.size(); i++) {
            if (i > 0) cout << ",";
            printVectorString(vv[i]);
        }
        cout << "]";
    }

    inline void printVectorVectorChar(const vector<vector<char>>& vv) {
        cout << "[";
        for (size_t i = 0; i < vv.size(); i++) {
            if (i > 0) cout << ",";
            printVectorChar(vv[i]);
        }
        cout << "]";
    }
}

// User Solution Code Injected Below
`;

    const preludeLines = prelude.split('\n').length;
    const userCodeLines = sanitizedUserCode.split('\n').length;
    const userCodeStartLine = preludeLines;
    const userCodeEndLine = userCodeStartLine + userCodeLines - 1;

    const postlude = `
// Harness Execution Engine
int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    Solution solver;
    const char* startMarker = "${startMarker}";
    const char* endMarker = "${endMarker}";
    const char* testSep = "${testSeparator}";

    string line;
    int testIndex = 0;

    while (getline(cin, line)) {
        if (line.empty()) continue;
        if (testIndex > 0) {
            cout << testSep << "\\n";
        }
        cout << startMarker;

        auto t_start = chrono::high_resolution_clock::now();

        ${HarnessGenerator.generateInvocationCode(functionSignature)}

        auto t_end = chrono::high_resolution_clock::now();
        double elapsed_ms = chrono::duration<double, milli>(t_end - t_start).count();

        cout << endMarker << "\\n";
        cout << "__TIME_MS__:" << fixed << setprecision(3) << elapsed_ms << "\\n";
        testIndex++;
    }

    return 0;
}
`;

    const fullCode = `${prelude}${sanitizedUserCode}\n${postlude}`;

    return {
      fullCode,
      userCodeStartLine,
      userCodeEndLine,
      startMarker,
      endMarker,
      testSeparator,
    };
  }

  private static splitTopLevelParams(paramsStr: string): string[] {
    const result: string[] = [];
    let angleDepth = 0;
    let start = 0;
    for (let i = 0; i < paramsStr.length; i++) {
      const ch = paramsStr[i];
      if (ch === '<') angleDepth++;
      else if (ch === '>') angleDepth = Math.max(0, angleDepth - 1);
      else if (ch === ',' && angleDepth === 0) {
        result.push(paramsStr.slice(start, i).trim());
        start = i + 1;
      }
    }
    const last = paramsStr.slice(start).trim();
    if (last) result.push(last);
    return result;
  }

  private static normalizeType(rawType: string): string {
    return rawType
      .replace(/\bconst\b/g, '')
      .replace(/[&\s]+$/g, '')
      .replace(/\s*<\s*/g, '<')
      .replace(/\s*>\s*/g, '>')
      .replace(/&\s*$/, '')
      .trim();
  }

  private static emitPrintStatement(expr: string, typeStr: string): string {
    const norm = this.normalizeType(typeStr);
    if (norm.includes('vector<vector<char>>')) {
      return `        CodePrepHelper::printVectorVectorChar(${expr});\n`;
    }
    if (norm.includes('vector<vector<string>>')) {
      return `        CodePrepHelper::printVectorVectorString(${expr});\n`;
    }
    if (norm.includes('vector<vector<int>>') || norm.includes('vector<vector<long')) {
      return `        CodePrepHelper::printVectorVectorInt(${expr});\n`;
    }
    if (norm.includes('vector<char>')) {
      return `        CodePrepHelper::printVectorChar(${expr});\n`;
    }
    if (norm.includes('vector<string>')) {
      return `        CodePrepHelper::printVectorString(${expr});\n`;
    }
    if (norm.includes('vector<bool>')) {
      return `        CodePrepHelper::printVectorBool(${expr});\n`;
    }
    if (norm.includes('vector<')) {
      return `        CodePrepHelper::printVector(${expr});\n`;
    }
    if (norm.includes('ListNode')) {
      return `        CodePrepHelper::printLinkedList(${expr});\n`;
    }
    if (norm.includes('TreeNode')) {
      return `        CodePrepHelper::printTree(${expr});\n`;
    }
    if (norm.includes('bool')) {
      return `        cout << (${expr} ? "true" : "false");\n`;
    }
    return `        cout << ${expr};\n`;
  }

  private static generateInvocationCode(sig: string): string {
    const match = sig.match(/^\s*([\w\s<>:*&]+?)\s+(\w+)\s*\((.*)\)\s*$/);
    if (!match) {
      return `cout << "error: unrecognized function signature";`;
    }

    const returnType = this.normalizeType(match[1]);
    const methodName = match[2].trim();
    const paramsStr = match[3].trim();

    if (!paramsStr) {
      if (returnType === 'void') {
        return `        solver.${methodName}();\n`;
      }
      return `        auto result = solver.${methodName}();\n${this.emitPrintStatement('result', returnType)}`;
    }

    const params = this.splitTopLevelParams(paramsStr);
    let code = `stringstream ss(line);\n`;
    const callArgs: string[] = [];
    const paramTypesNormalized: string[] = [];

    params.forEach((param, idx) => {
      const parts = param.split(/\s+/);
      const varName = parts[parts.length - 1].replace(/[*&]/g, '');
      const rawType = varName
        ? param.substring(0, param.lastIndexOf(varName)).trim()
        : param;
      const typeName = this.normalizeType(rawType);
      paramTypesNormalized.push(typeName);

      const argName = `arg_${idx}`;
      callArgs.push(argName);

      if (typeName.includes('vector<vector<char>>')) {
        code += `        string raw_${idx}; getline(ss, raw_${idx}, '|');\n`;
        code += `        auto ${argName} = CodePrepHelper::parseVectorVectorChar(raw_${idx});\n`;
      } else if (typeName.includes('vector<vector<string>>')) {
        code += `        string raw_${idx}; getline(ss, raw_${idx}, '|');\n`;
        code += `        auto ${argName} = CodePrepHelper::parseVectorVectorString(raw_${idx});\n`;
      } else if (typeName.includes('vector<vector<int>>')) {
        code += `        string raw_${idx}; getline(ss, raw_${idx}, '|');\n`;
        code += `        auto ${argName} = CodePrepHelper::parseVectorVectorInt(raw_${idx});\n`;
      } else if (typeName.includes('vector<char>')) {
        code += `        string raw_${idx}; getline(ss, raw_${idx}, '|');\n`;
        code += `        auto ${argName} = CodePrepHelper::parseVectorChar(raw_${idx});\n`;
      } else if (typeName.includes('vector<string>')) {
        code += `        string raw_${idx}; getline(ss, raw_${idx}, '|');\n`;
        code += `        auto ${argName} = CodePrepHelper::parseVectorString(raw_${idx});\n`;
      } else if (typeName.includes('vector<long')) {
        code += `        string raw_${idx}; getline(ss, raw_${idx}, '|');\n`;
        code += `        auto ${argName} = CodePrepHelper::parseVectorLong(raw_${idx});\n`;
      } else if (typeName.includes('vector<double')) {
        code += `        string raw_${idx}; getline(ss, raw_${idx}, '|');\n`;
        code += `        auto ${argName} = CodePrepHelper::parseVectorDouble(raw_${idx});\n`;
      } else if (typeName.includes('vector<int>')) {
        code += `        string raw_${idx}; getline(ss, raw_${idx}, '|');\n`;
        code += `        auto ${argName} = CodePrepHelper::parseVectorInt(raw_${idx});\n`;
      } else if (typeName.includes('TreeNode')) {
        code += `        string raw_${idx}; getline(ss, raw_${idx}, '|');\n`;
        code += `        TreeNode* ${argName} = CodePrepHelper::parseTree(raw_${idx});\n`;
      } else if (typeName.includes('ListNode')) {
        code += `        string raw_${idx}; getline(ss, raw_${idx}, '|');\n`;
        code += `        ListNode* ${argName} = CodePrepHelper::parseLinkedList(raw_${idx});\n`;
      } else if (typeName.includes('string')) {
        code += `        string raw_${idx}; getline(ss, raw_${idx}, '|');\n`;
        code += `        string ${argName} = CodePrepHelper::parseString(raw_${idx});\n`;
      } else if (typeName.includes('long')) {
        code += `        string raw_${idx}; getline(ss, raw_${idx}, '|');\n`;
        code += `        long long ${argName} = CodePrepHelper::parseLong(raw_${idx});\n`;
      } else if (typeName.includes('double')) {
        code += `        string raw_${idx}; getline(ss, raw_${idx}, '|');\n`;
        code += `        double ${argName} = CodePrepHelper::parseDouble(raw_${idx});\n`;
      } else if (typeName.includes('bool')) {
        code += `        string raw_${idx}; getline(ss, raw_${idx}, '|');\n`;
        code += `        bool ${argName} = CodePrepHelper::parseBool(raw_${idx});\n`;
      } else if (typeName.includes('char')) {
        code += `        string raw_${idx}; getline(ss, raw_${idx}, '|');\n`;
        code += `        char ${argName} = CodePrepHelper::parseChar(raw_${idx});\n`;
      } else {
        code += `        string raw_${idx}; getline(ss, raw_${idx}, '|');\n`;
        code += `        int ${argName} = CodePrepHelper::parseInt(raw_${idx});\n`;
      }
    });

    if (returnType === 'void') {
      code += `        solver.${methodName}(${callArgs.join(', ')});\n`;
      if (paramTypesNormalized.length > 0) {
        code += this.emitPrintStatement(callArgs[0], paramTypesNormalized[0]);
      }
    } else {
      code += `        auto result = solver.${methodName}(${callArgs.join(', ')});\n`;
      code += this.emitPrintStatement('result', returnType);
    }

    return code;
  }
}
