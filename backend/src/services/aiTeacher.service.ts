import { ExecutionResult } from '../judge/types';
import { env } from '../config/env';
import { Logger } from '../utils/logger';

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
  provider?: 'gemini' | 'local';
}

interface GeminiGenerateResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  error?: { message?: string; code?: number };
}

export class StudyGuideService {
  /**
   * Generates live AI coaching via Google Gemini when AI_API_KEY is configured,
   * gracefully falling back to deterministic guidance on error or missing key.
   */
  static async getFeedback(req: TeacherFeedbackRequest): Promise<TeacherFeedbackResponse> {
    const hintLevel = req.hintLevel || 1;
    const mode = req.isSolved ? 'optimizer' : req.verdict ? 'coach' : 'nudge';

    const apiKey = env.AI_API_KEY?.trim();
    if (env.AI_PROVIDER === 'gemini' && apiKey) {
      const aiText = await this.callGeminiCoach(req, mode, hintLevel, apiKey);
      if (aiText) {
        return {
          message: aiText,
          hintLevel,
          mode,
          provider: 'gemini',
        };
      }
    }

    const fallback = this.generateDeterministicGuidance(req, mode, hintLevel);
    return { ...fallback, provider: 'local' };
  }

  static async coachInterviewAnswer(params: {
    topic: string;
    question: string;
    userAnswer: string;
    mode: 'critique' | 'ask';
  }): Promise<{ reply: string; provider: 'gemini' | 'local'; note?: string }> {
    const apiKey = env.AI_API_KEY?.trim();
    if (env.AI_PROVIDER === 'gemini' && apiKey) {
      const prompt =
        params.mode === 'ask'
          ? `You are a Principal Software Engineer conducting an SDE interview prep session on CodePrep.
Topic: ${params.topic}
Candidate question:
${params.question || 'Give me a crisp interview masterclass on this topic.'}

Respond clearly under 220 words with bullet points, concrete mechanisms, trade-offs, and one common interviewer trap.`
          : `You are a strict yet constructive Bar-Raiser interviewer grading a candidate's mock answer.
Topic: ${params.topic}
Interview Question: ${params.question || 'General technical / behavioral question'}
Candidate's Answer:
${params.userAnswer || '(blank answer)'}

Provide:
1. Score (e.g. X/10) with 1-sentence verdict.
2. What was strong (max 2 bullets).
3. Missing depth / technical or metric gaps (max 2 bullets).
4. One realistic Follow-Up Curveball question an interviewer would ask next.
Keep total output concise (under 220 words).`;

      const res = await this.invokeGeminiPrompt(prompt, apiKey, 550);
      if (res.text) {
        return { reply: res.text, provider: 'gemini' };
      }

      return {
        reply: this.buildLocalInterviewCoachFallback(params),
        provider: 'local',
        note: res.errorReason,
      };
    }

    return {
      reply: this.buildLocalInterviewCoachFallback(params),
      provider: 'local',
      note: 'AI_API_KEY is not configured in environment.',
    };
  }

  private static buildLocalInterviewCoachFallback(params: {
    topic: string;
    question: string;
    userAnswer: string;
    mode: 'critique' | 'ask';
  }): string {
    if (params.mode === 'ask') {
      return `Local Study Checklist (${params.topic}):\n• Define the core mechanism in 1 crisp sentence before diving into implementation.\n• State exact time/space or latency/consistency trade-offs.\n• Highlight one edge case (NULLs, overflow, failover, or clock drift) proactively.`;
    }
    const len = (params.userAnswer || '').trim().split(/\s+/).filter(Boolean).length;
    return `Offline Answer Checklist (${params.topic} — ${len} words):\n• Clarity & Structure: Aim for Definition → Architecture/Mechanism → Concrete Trade-off → Metrics.\n• Check whether you stated numbers or edge cases explicitly.\n• Follow-up Curveball: How does your design behave under a 10x traffic spike or partial node failure?`;
  }

  private static async callGeminiCoach(
    req: TeacherFeedbackRequest,
    mode: 'coach' | 'optimizer' | 'nudge',
    hintLevel: number,
    apiKey: string
  ): Promise<string | null> {
    const isSql = req.category === 'SQL';
    const prompt = this.buildCoachingPrompt(req, mode, hintLevel, isSql);
    const res = await this.invokeGeminiPrompt(prompt, apiKey, 450);
    return res.text;
  }

  private static async invokeGeminiPrompt(
    prompt: string,
    apiKey: string,
    maxOutputTokens: number
  ): Promise<{ text: string | null; errorReason?: string }> {
    const modelCandidates = Array.from(
      new Set([env.AI_MODEL_NAME || 'gemini-2.5-flash', 'gemini-2.5-flash', 'gemini-2.0-flash'])
    );

    for (const model of modelCandidates) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        model
      )}:generateContent?key=${encodeURIComponent(apiKey)}`;

      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(9000),
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.4,
              maxOutputTokens,
            },
          }),
        });

        if (res.status === 404) {
          Logger.warn('AiTeacherService', `Gemini model '${model}' returned 404; trying next fallback model.`);
          continue;
        }

        if (!res.ok) {
          const errBody = await res.text().catch(() => '');
          Logger.warn('AiTeacherService', `Gemini request failed (${res.status}) on '${model}'. Falling back locally.`, errBody.slice(0, 240));
          return {
            text: null,
            errorReason: `Gemini API returned HTTP ${res.status} — verify AI_API_KEY is a valid Google AI Studio key (starts with AIza...) on Render.`,
          };
        }

        const data = (await res.json()) as GeminiGenerateResponse;
        const text = data.candidates?.[0]?.content?.parts
          ?.map((p) => p.text || '')
          .join('')
          .trim();

        if (text) return { text };
        return { text: null, errorReason: 'Empty response returned by Gemini model.' };
      } catch (error) {
        Logger.warn('AiTeacherService', `Gemini request error on '${model}'. Falling back locally.`, error);
        return { text: null, errorReason: 'Network or timeout calling Gemini API.' };
      }
    }

    return { text: null, errorReason: 'Configured Gemini models returned 404.' };
  }

  private static buildCoachingPrompt(
    req: TeacherFeedbackRequest,
    mode: 'coach' | 'optimizer' | 'nudge',
    hintLevel: number,
    isSql: boolean
  ): string {
    const langLabel = isSql ? 'SQLite SQL' : 'C++17';
    const statementSnippet = (req.problemStatement || '').slice(0, 1400);
    const codeSnippet = (req.userCode || '').trim().slice(0, 2800);

    const failureDetails = req.executionResult?.compileError
      ? `Compiler/Syntax Error:\n${req.executionResult.compileError.slice(0, 600)}`
      : req.executionResult?.failedTestCase
        ? `Failed Test Case (${req.verdict}):\nInput: ${req.executionResult.failedTestCase.input}\nExpected: ${req.executionResult.failedTestCase.expected}\nActual: ${req.executionResult.failedTestCase.actual}`
        : req.verdict
          ? `Latest Verdict: ${req.verdict}`
          : 'No submission attempted yet.';

    const roleDirective =
      mode === 'optimizer'
        ? 'The candidate passed all tests. Give a crisp senior-engineer critique: estimate exact Time & Space complexity of their code, then list 1–2 concrete optimizations or cleaner edge-case improvements.'
        : mode === 'coach'
          ? 'Diagnose WHY the candidate’s code failed (or errored) without rewriting their entire solution for them. Point to the exact logical flaw, SQL clause, or off-by-one bug.'
          : hintLevel === 1
            ? 'Give Hint Level 1 (subtle intuition/pattern nudge only). Do NOT give away code or the exact algorithm steps yet.'
            : hintLevel === 2
              ? 'Give Hint Level 2 (key data structure, invariant, or SQL join/window strategy). Still do NOT paste the complete final code.'
              : 'Give Hint Level 3 (clear numbered step-by-step plan + edge cases to handle), keeping code snippets minimal so they still write it themselves.';

    return `You are a crisp technical interviewer coaching a candidate solving a ${langLabel} problem on CodePrep.
Keep your answer concise (under 180 words), practical, and formatted with clean short bullet points. No fluff.

Problem: #${req.problemId} ${req.problemTitle}
Category: ${req.category || 'DSA'} | Topic: ${req.topic || 'General'} | Pattern: ${req.pattern || 'General'}

Statement summary:
${statementSnippet}

Candidate's current ${langLabel} code:
${codeSnippet || '(empty editor)'}

${failureDetails}

Coaching goal:
${roleDirective}`;
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
