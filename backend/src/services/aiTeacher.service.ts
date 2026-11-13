import { ExecutionResult } from '../judge/types';

export interface TeacherFeedbackRequest {
  problemId: number;
  problemTitle: string;
  problemStatement: string;
  userCode: string;
  verdict?: string;
  executionResult?: ExecutionResult;
  hintLevel?: number; // 1 = Pattern Nudge, 2 = Key Observation, 3 = Step-by-Step Strategy
  isSolved: boolean;
  topic?: string;
  pattern?: string;
  category?: string;
}

export interface TeacherFeedbackResponse {
  message: string;
  hintLevel: number;
  mode: 'coach' | 'optimizer' | 'nudge';
}

export class StudyGuideService {
  /**
   * Generates deterministic compiler diagnostics, pattern hints, and complexity
   * checklists locally without external API dependencies.
   */
  static async getFeedback(req: TeacherFeedbackRequest): Promise<TeacherFeedbackResponse> {
    const hintLevel = req.hintLevel || 1;
    const mode = req.isSolved ? 'optimizer' : req.verdict ? 'coach' : 'nudge';
    return this.generateDeterministicGuidance(req, mode, hintLevel);
  }

  private static generateDeterministicGuidance(
    req: TeacherFeedbackRequest,
    mode: 'coach' | 'optimizer' | 'nudge',
    hintLevel: number
  ): TeacherFeedbackResponse {
    const isSql = req.category === 'SQL';

    if (mode === 'optimizer') {
      return {
        message: isSql
          ? `All SQL assertions passed. Optimization checklist:
1. Check whether selective WHERE predicates filter rows before joins or window functions.
2. Verify tie-breaking columns in ORDER BY so output stays deterministic on equal values.
3. Open Reference Solution to compare your query structure and aggregation approach.`
          : `All test cases passed. Next steps to tighten complexity:
1. Examine memory usage: can auxiliary arrays or maps be reduced to O(1) extra space?
2. Check inner loops and copies: pass containers by const reference and reserve capacities when needed.
3. Open Reference Solution to compare your approach against optimal interview benchmarks.`,
        hintLevel,
        mode,
      };
    }

    if (req.executionResult?.compileError) {
      const lineMatch = req.executionResult.compileError.match(/[Ll]ine\s*(\d+)/);
      return {
        message: `Compiler Diagnostic${lineMatch ? ` (line ${lineMatch[1]})` : ''}:
Check for syntax errors, mismatched return types, missing semicolons, or uninitialized variables. ${isSql ? 'Verify table aliases and column names match the schema panel.' : 'Standard C++ STL headers and Problem ListNode/TreeNode helpers are pre-included by the judge.'}`,
        hintLevel,
        mode,
      };
    }

    if (req.verdict === 'Time Limit Exceeded') {
      return {
        message: `Time Limit Exceeded on larger inputs.
Your current implementation likely runs in O(N^2) or higher time complexity:
1. Look for nested loops that can be flattened using a hash map or running state.
2. If data has monotonic order or sorted indices, consider binary search or two pointers for O(N) / O(log N).`,
        hintLevel,
        mode,
      };
    }

    if (req.verdict === 'Wrong Answer' && req.executionResult?.failedTestCase) {
      const tc = req.executionResult.failedTestCase;
      return {
        message: `Your output '${tc.actual}' differed from expected '${tc.expected}' on input: ${tc.input}.
Check boundary assumptions: empty inputs, single-element cases, duplicates, negative values, or off-by-one indices.`,
        hintLevel,
        mode,
      };
    }

    const topicNote = req.topic ? ` (${req.topic})` : '';
    const patternNote = req.pattern && req.pattern !== 'General' ? ` — Pattern: ${req.pattern}` : '';

    if (hintLevel === 1) {
      return {
        message: isSql
          ? `Hint 1 — Query Structure${topicNote}: Break down the required output grain first. Decide which tables must be joined before filtering or grouping rows.`
          : `Hint 1 — Pattern Nudge${topicNote}: Identify the lookup or traversal invariant required${patternNote}. Ask whether you need fast O(1) key lookup, monotonic state, or divide-and-conquer.`,
        hintLevel: 1,
        mode: 'nudge',
      };
    }

    if (hintLevel === 2) {
      return {
        message: isSql
          ? `Hint 2 — Aggregation & Filtering: Separate row-level WHERE filters from group-level HAVING filters, and watch for NULL handling when joining tables.`
          : `Hint 2 — Core Invariant${patternNote}: Focus on what state must be carried between steps so each element is processed minimal times without redundant nested scans.`,
        hintLevel: 2,
        mode: 'nudge',
      };
    }

    return {
      message: isSql
        ? `Hint 3 — Step-by-Step Query Plan:
1. Select the base relation and apply explicit JOIN conditions.
2. Aggregate with GROUP BY / window functions (OVER PARTITION BY) if ranking is needed.
3. Apply final ordering and NULL checks before comparing output columns.`
        : `Hint 3 — Step-by-Step Approach${patternNote}:
1. Initialize the minimal tracking state for ${req.topic || 'the problem'}.
2. Process elements systematically while maintaining the loop invariant.
3. Verify edge cases: empty input, single item, duplicates, and upper constraint bounds.`,
      hintLevel: 3,
      mode: 'nudge',
    };
  }
}

export const AiTeacherService = StudyGuideService;
