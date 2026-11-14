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
  schemaDdl?: string;
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
  providerNote?: string;
  analysis?: MethodAnalysisReport;
}

interface GeminiGenerateResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
    finishReason?: string;
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
    const hasFailureVerdict = Boolean(req.verdict && req.verdict !== 'Accepted');
    const isCurrentAccepted = req.verdict === 'Accepted';

    // Never treat failing code as an accepted optimization task, even if the problem was solved previously.
    const mode: TeacherFeedbackResponse['mode'] = hasFailureVerdict
      ? req.requestMode === 'analyze'
        ? 'analyze'
        : 'coach'
      : req.requestMode === 'analyze'
        ? 'analyze'
        : isCurrentAccepted
          ? 'optimizer'
          : req.requestMode === 'hint'
            ? 'nudge'
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
      isSolved: isCurrentAccepted,
    });

    const apiKey = this.resolveApiKey();
    let providerNote: string | undefined;

    if (env.AI_PROVIDER === 'gemini' && apiKey) {
      const aiRes = await this.callGeminiCoach(req, mode, hintLevel, analysis, apiKey);
      if (aiRes.text) {
        return {
          message: aiRes.text,
          hintLevel,
          mode,
          provider: 'gemini',
          analysis,
        };
      }
      providerNote = aiRes.errorReason || 'Gemini unavailable; using local analyzer.';
    } else if (!apiKey) {
      providerNote = 'AI_API_KEY / GEMINI_API_KEY is not set on server; using local analyzer.';
    }

    const fallback = this.generateDeterministicGuidance(req, mode, hintLevel, analysis);
    return { ...fallback, provider: 'local', providerNote, analysis };
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
  ): Promise<{ text: string | null; errorReason?: string }> {
    const isSql = req.category === 'SQL';
    const prompt = this.buildCoachingPrompt(req, mode, hintLevel, isSql, analysis);
    return this.invokeGeminiPrompt(prompt, apiKey, 1000);
  }

  private static async invokeGeminiPrompt(
    prompt: string,
    apiKey: string,
    maxOutputTokens: number,
    options?: { jsonMode?: boolean }
  ): Promise<{ text: string | null; errorReason?: string }> {
    const modelCandidates = Array.from(
      new Set([
        env.AI_MODEL_NAME || 'gemini-2.5-flash',
        'gemini-2.5-flash',
        'gemini-2.5-flash-lite',
        'gemini-2.0-flash',
      ])
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
      for (const baseUrl of endpointsForModel(model)) {
        const sendRequest = async (includeThinkingConfig: boolean) => {
          const generationConfig: Record<string, unknown> = {
            temperature: options?.jsonMode ? 0.2 : 0.35,
            maxOutputTokens,
          };
          if (options?.jsonMode) {
            generationConfig.responseMimeType = 'application/json';
          }
          if (includeThinkingConfig && model.includes('2.5')) {
            generationConfig.thinkingConfig = { thinkingBudget: 0 };
          }

          return fetch(`${baseUrl}?key=${encodeURIComponent(apiKey)}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': apiKey,
            },
            signal: AbortSignal.timeout(15000),
            body: JSON.stringify({
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
              generationConfig,
            }),
          });
        };

        try {
          let res = await sendRequest(true);
          if (res.status === 400 && model.includes('2.5')) {
            const firstErr = await res.text().catch(() => '');
            if (firstErr.toLowerCase().includes('thinking')) {
              res = await sendRequest(false);
            } else {
              lastErrorReason = `Gemini HTTP 400 on ${model}: ${firstErr.slice(0, 140)}`;
              Logger.warn('AiTeacherService', lastErrorReason);
              continue;
            }
          }

          if (!res.ok) {
            const errBody = await res.text().catch(() => '');
            lastErrorReason = `Gemini HTTP ${res.status} on ${model}: ${errBody.slice(0, 140)}`;
            Logger.warn('AiTeacherService', `Gemini request failed (${res.status}) on '${model}'; trying next model/endpoint.`);
            continue;
          }

          const data = (await res.json()) as GeminiGenerateResponse;
          const candidate = data.candidates?.[0];
          const text = candidate?.content?.parts
            ?.map((p) => p.text || '')
            .join('')
            .trim();

          if (text) return { text };
          lastErrorReason = candidate?.finishReason
            ? `Gemini returned no text (${candidate.finishReason}).`
            : 'Empty response returned by Gemini model.';
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
    const schemaSnippet = isSql && req.schemaDdl ? `\nDatabase Schema DDL:\n${req.schemaDdl.slice(0, 900)}\n` : '';
    const numberedCode = (req.userCode || '')
      .split(/\r?\n/)
      .slice(0, 120)
      .map((line, idx) => `${idx + 1}: ${line}`)
      .join('\n')
      .slice(0, 3400);

    const execResult = req.executionResult as
      | (ExecutionResult & {
          error?: string;
          columns?: string[];
          expectedColumns?: string[];
          rows?: Array<Record<string, unknown>>;
          expectedRows?: Array<Record<string, unknown>>;
        })
      | undefined;

    const progressLine =
      typeof execResult?.passedTestCases === 'number' && typeof execResult?.totalTestCases === 'number' && execResult.totalTestCases > 0
        ? `Test Cases Passed: ${execResult.passedTestCases} / ${execResult.totalTestCases}\n`
        : '';

    const failureDetails = execResult?.compileError
      ? `${progressLine}Compiler/Syntax Error:\n${execResult.compileError.slice(0, 650)}`
      : execResult?.error
        ? `${progressLine}Execution / SQL Error:\n${execResult.error.slice(0, 650)}`
        : execResult?.failedTestCase
          ? `${progressLine}Failed Test Case (${req.verdict}):\nInput: ${execResult.failedTestCase.input}\nExpected: ${execResult.failedTestCase.expected}\nActual: ${execResult.failedTestCase.actual}`
          : execResult?.rows && execResult?.expectedRows && req.verdict === 'Wrong Answer'
            ? `${progressLine}SQL Wrong Answer:\nActual columns: ${JSON.stringify(execResult.columns || [])}\nExpected columns: ${JSON.stringify(execResult.expectedColumns || [])}\nActual rows (${execResult.rows.length}): ${JSON.stringify(execResult.rows.slice(0, 4))}\nExpected rows (${execResult.expectedRows.length}): ${JSON.stringify(execResult.expectedRows.slice(0, 4))}`
            : req.verdict
              ? `${progressLine}Latest Verdict: ${req.verdict}`
              : 'Not executed yet against test cases — inspect logic directly.';

    const staticFindings = analysis.mistakes.length > 0
      ? analysis.mistakes.map((m) => `- ${m.line ? `Line ${m.line}: ` : ''}${m.title} (${m.detail})`).join('\n')
      : 'No regex syntax issues caught, so DO YOUR OWN DEEP SEMANTIC & LINE-BY-LINE LOGIC CHECK.';

    const roleDirective =
      mode === 'analyze' || mode === 'coach'
        ? `Perform a strict real-time code audit of the candidate's current code. Pinpoint EVERY concrete logical mistake, syntax/runtime bug, off-by-one error, missing edge case, or SQL join/NULL/alias error by exact line number. If execution failed on a test case, trace the candidate's actual code step-by-step on that input to explain WHY it produced the wrong output (Actual vs Expected). Evaluate true Time & Space complexity vs target (${analysis.targetComplexity}) without sugarcoating.`
        : mode === 'optimizer'
          ? 'The current code passed all test cases (Verdict: Accepted). Give a crisp senior-engineer critique: exact Time & Space complexity of their code, subtle edge-case risks if any, and 1-2 concrete optimizations.'
          : hintLevel === 1
            ? 'Give Hint Level 1 (subtle intuition/pattern nudge + point out any clear bug in their current draft without spoiling the full solution).'
            : hintLevel === 2
              ? 'Give Hint Level 2 (key data structure, invariant, or SQL join/window strategy + flag any logical mistake in their draft without pasting the full code).'
              : 'Give Hint Level 3 (clear numbered step-by-step plan + edge cases to handle, keeping code snippets minimal).';

    return `You are a strict, accurate principal engineer coaching a candidate on a ${langLabel} problem in CodePrep.

CRITICAL TRUTHFULNESS RULES:
1. NEVER praise code or say "looks good", "clean", "correct", or "solid" if Latest Verdict is NOT Accepted, if the body is incomplete/stubbed, or if you find any logical bug!
2. NEVER label incomplete, uncompilable, or trivially stubbed code as "O(1)" — state the true complexity (or "Incomplete / Does not compile").
3. Base your critique ONLY on the exact lines in Candidate's current code below, citing line numbers (e.g. Line 6) and exact variable/column names.
4. Keep output crisp (under 250 words) using these headings:
- Verdict & Real Complexity
- Exact Mistakes Found (with Line Numbers)
- Trace / Why It Fails & How to Fix

Problem: #${req.problemId} ${req.problemTitle}
Category: ${req.category || 'DSA'} | Topic: ${req.topic || 'General'} | Pattern: ${req.pattern || 'General'}
${req.functionSignature ? `Required Signature: ${req.functionSignature}\n` : ''}Constraints: ${req.constraints || 'Standard limits'}
${req.userQuestion?.trim() ? `\nCandidate's Question: ${req.userQuestion.trim()}\n` : ''}
Statement summary:
${statementSnippet}
${schemaSnippet}
Candidate's current ${langLabel} code (with line numbers):
${numberedCode || '(empty editor)'}

Static pre-check notes:
Detected heuristic: ${analysis.detectedMethod} (${analysis.estimatedComplexity})
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
    const isCurrentAccepted = req.verdict === 'Accepted';
    const hasFailureVerdict = Boolean(req.verdict && req.verdict !== 'Accepted');

    // Always prioritize concrete mistake/failure diagnostics when analyzing, failing, or when static mistakes exist
    if (mode === 'analyze' || hasFailureVerdict || analysis.mistakes.length > 0) {
      return {
        message: analysis.summary,
        hintLevel,
        mode: hasFailureVerdict ? 'coach' : 'analyze',
      };
    }

    const isSql = req.category === 'SQL';

    if (mode === 'optimizer' && isCurrentAccepted) {
      return {
        message: isSql
          ? `${analysis.detectedMethod} passed all SQL assertions.\n\nOptimization checklist:\n1. Filter selective WHERE predicates before joins or window functions.\n2. Verify tie-breaking columns in ORDER BY so output stays deterministic.\n3. Compare your query structure with the Reference Solution.`
          : `All test cases passed (${analysis.detectedMethod} • ${analysis.estimatedComplexity}).\n\nNext steps to tighten complexity:\n1. Examine memory usage: can auxiliary arrays or maps be reduced toward O(1) extra space?\n2. Check inner loops and copies: pass containers by const reference and reserve hash capacities.\n3. Compare with Reference Solution for optimal interview trade-offs.`,
        hintLevel,
        mode: 'optimizer',
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
