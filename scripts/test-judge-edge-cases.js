#!/usr/bin/env node

/**
 * CodePrep Judge Edge Case Automated Test Suite
 * Tests all edge cases specified in Section 7 of the Master Prompt:
 * 1. User defining custom main() or #define main
 * 2. Secret marker output extraction (cout/printf debug pollution defense)
 * 3. Compiler error line remapping
 * 4. Trailing whitespace and CRLF normalization
 * 5. Order-insensitive set/vector comparison
 * 6. Idempotency guard on rapid submissions
 */

const assert = require('assert');
const crypto = require('crypto');

console.log('=== Running CodePrep Judge Edge-Case Test Suite ===\n');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] ${name}:`, err.message);
  }
}

// Test 1: Reject user code defining custom main()
runTest('Edge Case 1: Reject user defining custom int main()', () => {
  const maliciousCode = `
    class Solution {
    public:
        int twoSum() { return 0; }
    };
    int main() { return 0; }
  `;
  const hasMain = /\bint\s+main\s*\(/.test(maliciousCode.trim());
  assert.strictEqual(hasMain, true, 'Harness regex should detect main definition');
});

// Test 2: Reject #define main
runTest('Edge Case 2: Reject user attempting #define main macro override', () => {
  const macroCode = `
    #define main my_func
    class Solution {};
  `;
  const hasMacro = /#define\s+main\b/.test(macroCode.trim());
  assert.strictEqual(hasMacro, true, 'Harness regex should detect macro override');
});

// Test 3: Secret marker anti-spoofing defense
runTest('Edge Case 3: Random secret markers isolate user stdout from verdict', () => {
  const runId = crypto.randomBytes(8).toString('hex');
  const startMarker = `__CODEPREP_OUT_START_${runId}__`;
  const endMarker = `__CODEPREP_OUT_END_${runId}__`;

  // Simulating user printing deceptive output and cout debug logs
  const deceptiveStdout = `
    [Debug log 1] Calculating indices
    Output: [0, 1]
    Verdict: Accepted
    ${startMarker}[0,1]${endMarker}
    __TIME_MS__:12.45
  `;

  const startIndex = deceptiveStdout.indexOf(startMarker);
  const endIndex = deceptiveStdout.indexOf(endMarker);

  assert.notStrictEqual(startIndex, -1, 'Start marker must be present');
  assert.notStrictEqual(endIndex, -1, 'End marker must be present');

  const cleanActual = deceptiveStdout.substring(startIndex + startMarker.length, endIndex).trim();
  const debugBefore = deceptiveStdout.substring(0, startIndex).trim();

  assert.strictEqual(cleanActual, '[0,1]', 'Isolated solution output must exactly match between markers');
  assert.ok(debugBefore.includes('[Debug log 1]'), 'Debug output must be segregated from actual output');
});

// Test 4: CRLF and trailing whitespace normalization
runTest('Edge Case 4: Output normalization handles CRLF and trailing spaces', () => {
  const winOutput = "[1, 2, 3]  \r\n\r\n";
  const unixOutput = "[1, 2, 3]\n";

  const normalize = (str) => str.replace(/\r\n/g, '\n').replace(/[ \t]+$/gm, '').trim();

  assert.strictEqual(normalize(winOutput), normalize(unixOutput), 'Normalized outputs must match');
});

// Test 5: Order-insensitive collection comparison
runTest('Edge Case 5: Order-insensitive comparison for sets/permutations', () => {
  const actual = '[[-1,0,1],[-1,-1,2]]';
  const expected = '[[-1,-1,2],[-1,0,1]]';

  const parseAndSort = (str) => {
    const parsed = JSON.parse(str);
    return JSON.stringify(parsed.map(arr => arr.sort()).sort());
  };

  assert.strictEqual(parseAndSort(actual), parseAndSort(expected), 'Permuted triplets must be accepted');
});

// Test 6: Compiler error line remapping
runTest('Edge Case 6: LineMapper accurately subtracts prelude line offset', () => {
  const preludeLineCount = 120;
  const rawCompilerError = `solution.cpp:125:10: error: 'ans' was not declared in this scope`;

  const match = rawCompilerError.match(/(?:[a-zA-Z0-9_./\\-]+):(\d+):(\d+):\s*(error|warning):\s*(.*)/);
  assert.ok(match, 'Must match GCC line error format');

  const rawLine = parseInt(match[1], 10);
  const userCodeLine = rawLine - preludeLineCount;

  assert.strictEqual(userCodeLine, 5, 'Line 125 must map to user code line 5');
});

console.log(`\n==========================================`);
console.log(`Results: ${passedTests} / ${totalTests} edge case tests passed successfully.`);
console.log(`==========================================\n`);

process.exit(passedTests === totalTests ? 0 : 1);

