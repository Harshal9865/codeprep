import { ExecutionResult } from '../judge/types';
import { env } from '../config/env';
import { Logger } from '../utils/logger';
import { CodeAnalyzerService, MethodAnalysisReport } from './codeAnalyzer.service';

export interface TeacherFeedbackRequest {
  problemId: number;
  problemTitle: string;
  problemStatement: string;
  functionSignature?: string;
  constraints?: string;
  userCode: string;
  verdict?: string;
  executionResult?: ExecutionResult;
  hintLevel?: number; // 1 = Pattern Nudge, 2 = Key Observation, 3 = Step-by-Step Strategy
  requestMode?: 'analyze' | 'hint' | 'coach' | 'optimizer';
  userQuestion?: string;
  isSolved: boolean;
  topic?: string;
  pattern?: string;
  category?: string;
}

export interface TeacherFeedbackResponse {
  message: string;
  hintLevel: number;
  mode: 'analyze' | 'coach' | 'optimizer' | 'nudge';
  provider?: 'gemini' | 'local';
  analysis?: MethodAnalysisReport;
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
  private static resolveApiKey(): string {
    return (
      env.AI_API_KEY ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      ''
    ).trim();
  }

  /**
   * Generates live AI coaching via Google Gemini when AI_API_KEY is configured,
   * gracefully falling back to deterministic guidance on error or missing key.
   */
  static async getFeedback(req: TeacherFeedbackRequest): Promise<TeacherFeedbackResponse> {
    const hintLevel = req.hintLevel || 1;
    const mode: TeacherFeedbackResponse['mode'] =
      req.requestMode === 'analyze'
        ? 'analyze'
        : req.isSolved
          ? 'optimizer'
          : req.verdict
            ? 'coach'
            : 'nudge';

    const analysis = CodeAnalyzerService.analyze({
      problemId: req.problemId,
      problemTitle: req.problemTitle,
      problemStatement: req.problemStatement,
      functionSignature: req.functionSignature,
      constraints: req.constraints,
      topic: req.topic,
      pattern: req.pattern,
      category: req.category,
      userCode: req.userCode,
      verdict: req.verdict,
      executionResult: req.executionResult,
      userQuestion: req.userQuestion,
      isSolved: req.isSolved,
    });

    const apiKey = this.resolveApiKey();
    if (env.AI_PROVIDER === 'gemini' && apiKey) {
      const aiText = await this.callGeminiCoach(req, mode, hintLevel, analysis, apiKey);
      if (aiText) {
        return {
          message: aiText,
          hintLevel,
          mode,
          provider: 'gemini',
          analysis,
        };
      }
    }

    const fallback = this.generateDeterministicGuidance(req, mode, hintLevel, analysis);
    return { ...fallback, provider: 'local', analysis };
  }

  static async generateReferenceLessonContent(params: {
    problemId: number;
    title: string;
    topic: string;
    pattern: string;
    difficulty: string;
    category: string;
    statement: string;
    constraints: string;
    functionSignature: string;
    examples?: Array<{ input?: string; output?: string }>;
  }): Promise<{
    verifiedSolution: string;
    techniqueLesson: string;
    approachProgression: string;
  } | null> {
    const apiKey = this.resolveApiKey();
    if (env.AI_PROVIDER !== 'gemini' || !apiKey) return null;

    const isSql = params.category === 'SQL';
    const exampleSnippet = (params.examples || [])
      .slice(0, 2)
      .map((ex, i) => `Example ${i + 1}: Input=${ex.input || ''} -> Output=${ex.output || ''}`)
      .join('\n');

    const prompt = isSql
      ? `You are an expert SQL engineer. Generate a verified SQLite reference query and concise walkthrough for problem #${params.problemId}: ${params.title}.
Statement: ${params.statement.slice(0, 1200)}
Return STRICT JSON only (no markdown fences) with keys:
{"verifiedSolution": "...", "techniqueLesson": "...", "approachProgression": "..."}`
      : `You are a competitive programming & C++17 interviewer. Generate a complete, compilable LeetCode-style C++17 Solution class for #${params.problemId}: ${params.title}.
Exact signature inside class Solution { public: ... };: ${params.functionSignature}
Notice: standard C++ STL headers, ListNode, and TreeNode are already included by the judge—do NOT include #include or main(), and do NOT leave placeholder comments like "// Your code here".
Statement: ${params.statement.slice(0, 1200)}
${exampleSnippet ? `${exampleSnippet}\n` : ''}Constraints: ${params.constraints}
Return STRICT JSON only (no markdown fences) with keys:
{"verifiedSolution": "class Solution {\\npublic:\\n    ...\\n};", "techniqueLesson": "short intuition + pitfalls", "approachProgression": "1. Brute Force ...\\n2. Optimal ..."}`;

    const res = await this.invokeGeminiPrompt(prompt, apiKey, 1600, { jsonMode: true });
    if (!res.text) return null;

    const isUsableCode = (code: string) =>
      code.trim().length >= 30 &&
      !code.includes('// Your code here') &&
      !code.includes('// Implement your solution here');

    try {
      const cleaned = res.text
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      const jsonCandidate =
        firstBrace !== -1 && lastBrace > firstBrace
          ? cleaned.slice(firstBrace, lastBrace + 1)
          : cleaned;
      const parsed = JSON.parse(jsonCandidate) as {
        verifiedSolution?: string;
        techniqueLesson?: string;
        approachProgression?: string;
      };
      if (parsed.verifiedSolution && isUsableCode(parsed.verifiedSolution)) {
        return {
          verifiedSolution: parsed.verifiedSolution.trim(),
          techniqueLesson: (parsed.techniqueLesson || '').trim(),
          approachProgression: (parsed.approachProgression || '').trim(),
        };
      }
    } catch {
      const cppMatch = res.text.match(/```(?:cpp|c\+\+)?\s*([\s\S]*?)```/i);
      const classMatch = res.text.match(/class\s+Solution\s*\{[\s\S]*?\};/);
      const extracted = (cppMatch?.[1] || classMatch?.[0] || '').trim();
      if (extracted && isUsableCode(extracted)) {
        return {
          verifiedSolution: extracted,
          techniqueLesson: '',
          approachProgression: '',
        };
      }
    }
    return null;
  }

  static async coachInterviewAnswer(params: {
    topic: string;
    question: string;
    userAnswer: string;
    mode: 'critique' | 'ask';
  }): Promise<{ reply: string; provider: 'gemini' | 'local'; note?: string }> {
    const apiKey = this.resolveApiKey();
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
    mode: TeacherFeedbackResponse['mode'],
    hintLevel: number,
    analysis: MethodAnalysisReport,
    apiKey: string
  ): Promise<string | null> {
    const isSql = req.category === 'SQL';
    const prompt = this.buildCoachingPrompt(req, mode, hintLevel, isSql, analysis);
    const res = await this.invokeGeminiPrompt(prompt, apiKey, 900);
    return res.text;
  }

  private static async invokeGeminiPrompt(
    prompt: string,
    apiKey: string,
    maxOutputTokens: number,
    options?: { jsonMode?: boolean }
  ): Promise<{ text: string | null; errorReason?: string }> {
    const modelCandidates = Array.from(
      new Set([env.AI_MODEL_NAME || 'gemini-2.5-flash', 'gemini-2.5-flash', 'gemini-2.0-flash'])
    );

    const isExpressAuthKey = apiKey.startsWith('AQ.');
    const endpointsForModel = (model: string): string[] => {
      const encodedModel = encodeURIComponent(model);
      const studioUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodedModel}:generateContent`;
      const vertexExpressUrl = `https://aiplatform.googleapis.com/v1/publishers/google/models/${encodedModel}:generateContent`;
      return isExpressAuthKey ? [vertexExpressUrl, studioUrl] : [studioUrl, vertexExpressUrl];
    };

    let lastErrorReason = 'Gemini API request failed.';

    for (const model of modelCandidates) {
      const generationConfig: Record<string, unknown> = {
        temperature: options?.jsonMode ? 0.2 : 0.4,
        maxOutputTokens,
      };
      if (options?.jsonMode) {
        generationConfig.responseMimeType = 'application/json';
      }
      if (model.includes('2.5')) {
        generationConfig.thinkingConfig = { thinkingBudget: 0 };
      }

      for (const baseUrl of endpointsForModel(model)) {
        try {
          const res = await fetch(`${baseUrl}?key=${encodeURIComponent(apiKey)}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': apiKey,
            },
            signal: AbortSignal.timeout(14000),
            body: JSON.stringify({
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
              generationConfig,
            }),
          });

          if (res.status === 404 || res.status === 401 || res.status === 403 || res.status === 400) {
            const errBody = await res.text().catch(() => '');
            lastErrorReason = `Gemini HTTP ${res.status} on ${model}: ${errBody.slice(0, 160)}`;
            Logger.warn('AiTeacherService', `Gemini endpoint failed (${res.status}) on '${model}' at ${baseUrl}; trying fallback.`);
            continue;
          }

          if (!res.ok) {
            const errBody = await res.text().catch(() => '');
            Logger.warn('AiTeacherService', `Gemini request failed (${res.status}) on '${model}'. Falling back locally.`, errBody.slice(0, 240));
            return {
              text: null,
              errorReason: `Gemini API returned HTTP ${res.status} — verify AI_API_KEY on Render.`,
            };
          }

          const data = (await res.json()) as GeminiGenerateResponse;
          const text = data.candidates?.[0]?.content?.parts
            ?.map((p) => p.text || '')
            .join('')
            .trim();

          if (text) return { text };
          lastErrorReason = 'Empty response returned by Gemini model.';
        } catch (error) {
          Logger.warn('AiTeacherService', `Gemini request error on '${model}'. Trying fallback.`, error);
          lastErrorReason = 'Network or timeout calling Gemini API.';
        }
      }
    }

    return { text: null, errorReason: lastErrorReason };
  }

  private static buildCoachingPrompt(
    req: TeacherFeedbackRequest,
    mode: TeacherFeedbackResponse['mode'],
    hintLevel: number,
    isSql: boolean,
    analysis: MethodAnalysisReport
  ): string {
    const langLabel = isSql ? 'SQLite SQL' : 'C++17';
    const statementSnippet = (req.problemStatement || '').slice(0, 1400);
    const numberedCode = (req.userCode || '')
      .split(/\r?\n/)
      .slice(0, 120)
      .map((line, idx) => `${idx + 1}: ${line}`)
      .join('\n')
      .slice(0, 3200);

    const execResult = req.executionResult as
      | (ExecutionResult & {
          error?: string;
          rows?: Array<Record<string, unknown>>;
          expectedRows?: Array<Record<string, unknown>>;
        })
      | undefined;

    const failureDetails = execResult?.compileError
      ? `Compiler/Syntax Error:\n${execResult.compileError.slice(0, 600)}`
      : execResult?.error
        ? `Execution / SQL Error:\n${execResult.error.slice(0, 600)}`
        : execResult?.failedTestCase
          ? `Failed Test Case (${req.verdict}):\nInput: ${execResult.failedTestCase.input}\nExpected: ${execResult.failedTestCase.expected}\nActual: ${execResult.failedTestCase.actual}`
          : execResult?.rows && execResult?.expectedRows && req.verdict === 'Wrong Answer'
            ? `SQL Wrong Answer:\nActual rows (${execResult.rows.length}): ${JSON.stringify(execResult.rows.slice(0, 4))}\nExpected rows (${execResult.expectedRows.length}): ${JSON.stringify(execResult.expectedRows.slice(0, 4))}`
            : req.verdict
              ? `Latest Verdict: ${req.verdict}`
              : 'No submission attempted yet.';

    const staticFindings = analysis.mistakes.length > 0
      ? analysis.mistakes.map((m) => `- ${m.line ? `Line ${m.line}: ` : ''}${m.title} (${m.detail})`).join('\n')
      : 'None flagged statically.';

    const roleDirective =
      mode === 'analyze'
        ? `Carefully analyze the candidate's current method (${analysis.detectedMethod}). Answer any question they asked, pinpoint exact bugs/edge-case mistakes by line number, evaluate their time/space complexity vs target (${analysis.targetComplexity}), and guide them step-by-step on how to fix or optimize their approach without blindly dumping a full solution unless necessary.`
        : mode === 'optimizer'
          ? 'The candidate passed all tests. Give a crisp senior-engineer critique: estimate exact Time & Space complexity of their code, then list 1–2 concrete optimizations or cleaner edge-case improvements.'
          : mode === 'coach'
            ? 'Diagnose WHY the candidate’s code failed (or errored) without rewriting their entire solution for them. Point to the exact logical flaw, SQL clause, or off-by-one bug by line.'
            : hintLevel === 1
              ? 'Give Hint Level 1 (subtle intuition/pattern nudge only). Do NOT give away code or the exact algorithm steps yet.'
              : hintLevel === 2
                ? 'Give Hint Level 2 (key data structure, invariant, or SQL join/window strategy). Still do NOT paste the complete final code.'
                : 'Give Hint Level 3 (clear numbered step-by-step plan + edge cases to handle), keeping code snippets minimal so they still write it themselves.';

    return `You are a crisp technical interviewer coaching a candidate solving a ${langLabel} problem on CodePrep.
Keep your answer concise (under 240 words), practical, and structured with clear short sections:
- Method & Complexity
- Mistakes / Edge Cases Found
- Next Step to Fix

Problem: #${req.problemId} ${req.problemTitle}
Category: ${req.category || 'DSA'} | Topic: ${req.topic || 'General'} | Pattern: ${req.pattern || 'General'}
Constraints: ${req.constraints || 'Standard limits'}
${req.userQuestion?.trim() ? `\nCandidate's Question: ${req.userQuestion.trim()}\n` : ''}
Statement summary:
${statementSnippet}

Candidate's current ${langLabel} code (with line numbers):
${numberedCode || '(empty editor)'}

Static pre-check findings:
Detected: ${analysis.detectedMethod} (${analysis.estimatedComplexity})
${staticFindings}

Execution status:
${failureDetails}

Coaching goal:
${roleDirective}`;
  }

  private static generateDeterministicGuidance(
    req: TeacherFeedbackRequest,
    mode: TeacherFeedbackResponse['mode'],
    hintLevel: number,
    analysis: MethodAnalysisReport
  ): TeacherFeedbackResponse {
    if (mode === 'analyze') {
      return {
        message: analysis.summary,
        hintLevel,
        mode,
      };
    }

    const isSql = req.category === 'SQL';

    if (mode === 'optimizer') {
      return {
        message: isSql
          ? `${analysis.detectedMethod} passed all SQL assertions.\n\nOptimization checklist:\n1. Filter selective WHERE predicates before joins or window functions.\n2. Verify tie-breaking columns in ORDER BY so output stays deterministic.\n3. Compare your query structure with the Reference Solution.`
          : `All test cases passed (${analysis.detectedMethod} • ${analysis.estimatedComplexity}).\n\nNext steps to tighten complexity:\n1. Examine memory usage: can auxiliary arrays or maps be reduced toward O(1) extra space?\n2. Check inner loops and copies: pass containers by const reference and reserve hash capacities.\n3. Compare with Reference Solution for optimal interview trade-offs.`,
        hintLevel,
        mode,
      };
    }

    if (req.executionResult?.compileError || req.verdict === 'Time Limit Exceeded' || req.verdict === 'Wrong Answer') {
      return {
        message: analysis.summary,
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
