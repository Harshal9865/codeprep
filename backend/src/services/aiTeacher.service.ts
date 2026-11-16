import { ExecutionResult } from '../judge/types';
import { env } from '../config/env';
import { Logger } from '../utils/logger';
import { CodeAnalyzerService, CodeMistakeItem, MethodAnalysisReport } from './codeAnalyzer.service';

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface TeacherFeedbackRequest {
  problemId: number;
  problemTitle: string;
  problemStatement: string;
  functionSignature?: string;
  constraints?: string;
  schemaDdl?: string;
  examples?: Array<{ input?: string; output?: string }>;
  userCode: string;
  verdict?: string;
  executionResult?: ExecutionResult;
  hintLevel?: number; // 1 = Pattern Nudge, 2 = Key Observation, 3 = Step-by-Step Strategy
  requestMode?: 'analyze' | 'hint' | 'coach' | 'optimizer';
  userQuestion?: string;
  conversationHistory?: ChatTurn[];
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
  analysis?: MethodAnalysisReport & {
    spaceComplexity?: string;
  };
}

export interface GeminiComplexityReport {
  timeComplexity: string;
  spaceComplexity: string;
  referenceComplexity: string;
  bottleneck: string;
  optimizationTip: string;
  provider: 'gemini' | 'local';
}

interface GeminiPart {
  text?: string;
}

interface GeminiGenerateResponse {
  candidates?: Array<{
    content?: {
      parts?: GeminiPart[];
    };
    finishReason?: string;
  }>;
  error?: { message?: string; code?: number };
}

interface StructuredCoachPayload {
  verdictSummary?: string;
  detectedMethod?: string;
  timeComplexity?: string;
  spaceComplexity?: string;
  targetComplexity?: string;
  mistakes?: Array<{
    line?: number;
    title?: string;
    detail?: string;
    fixHint?: string;
  }>;
  feedback?: string;
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
   * Generates live AI coaching via Google Gemini when configured,
   * merging structured complexity & line-level diagnostics with local static analysis.
   */
  static async getFeedback(req: TeacherFeedbackRequest): Promise<TeacherFeedbackResponse> {
    const hintLevel = req.hintLevel || 1;
    const hasFailureVerdict = Boolean(req.verdict && req.verdict !== 'Accepted');
    const isCurrentAccepted = req.verdict === 'Accepted';

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

    const staticAnalysis = CodeAnalyzerService.analyze({
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
      const aiRes = await this.callGeminiCoach(req, mode, hintLevel, staticAnalysis, apiKey);
      if (aiRes.text) {
        const parsed = this.tryParseCoachJson(aiRes.text);
        if (parsed && parsed.feedback) {
          const mergedMistakes: CodeMistakeItem[] = [];
          const seenTitles = new Set<string>();

          if (Array.isArray(parsed.mistakes)) {
            for (const m of parsed.mistakes) {
              if (!m || typeof m.title !== 'string' || typeof m.detail !== 'string') continue;
              const key = `${m.line ?? ''}:${m.title.toLowerCase()}`;
              seenTitles.add(key);
              mergedMistakes.push({
                line: typeof m.line === 'number' && m.line > 0 ? m.line : undefined,
                title: m.title.trim(),
                detail: m.detail.trim(),
                fixHint: typeof m.fixHint === 'string' ? m.fixHint.trim() : 'Review this logic.',
              });
            }
          }

          for (const sm of staticAnalysis.mistakes) {
            const key = `${sm.line ?? ''}:${sm.title.toLowerCase()}`;
            if (!seenTitles.has(key) && mergedMistakes.length < 6) {
              mergedMistakes.push(sm);
            }
          }

          const timeLabel = parsed.timeComplexity?.trim();
          const spaceLabel = parsed.spaceComplexity?.trim();
          const combinedComplexity =
            timeLabel && spaceLabel
              ? `${timeLabel} Time · ${spaceLabel} Space`
              : timeLabel || staticAnalysis.estimatedComplexity;

          const enhancedAnalysis: MethodAnalysisReport & { spaceComplexity?: string } = {
            detectedMethod: parsed.detectedMethod?.trim() || staticAnalysis.detectedMethod,
            estimatedComplexity: combinedComplexity,
            targetComplexity: parsed.targetComplexity?.trim() || staticAnalysis.targetComplexity,
            mistakes: mergedMistakes,
            guidanceSteps: staticAnalysis.guidanceSteps,
            summary: parsed.verdictSummary?.trim() || staticAnalysis.summary,
            spaceComplexity: spaceLabel,
          };

          return {
            message: parsed.feedback.trim(),
            hintLevel,
            mode,
            provider: 'gemini',
            analysis: enhancedAnalysis,
          };
        }

        // Plain-text fallback if Gemini returned markdown instead of JSON
        return {
          message: aiRes.text,
          hintLevel,
          mode,
          provider: 'gemini',
          analysis: staticAnalysis,
        };
      }
      providerNote = aiRes.errorReason || 'Gemini temporarily unavailable; using local analyzer.';
    } else if (!apiKey) {
      providerNote = 'GEMINI_API_KEY / AI_API_KEY is not configured on the server.';
    }

    const fallback = this.generateDeterministicGuidance(req, mode, hintLevel, staticAnalysis);
    return { ...fallback, provider: 'local', providerNote, analysis: staticAnalysis };
  }

  /**
   * Dedicated Gemini Big-O & bottleneck analyzer paired with PerformanceService empirical timings.
   */
  static async analyzeComplexityWithGemini(params: {
    problemTitle: string;
    problemStatement: string;
    constraints?: string;
    functionSignature?: string;
    userCode: string;
    empiricalPointsSummary?: string;
  }): Promise<GeminiComplexityReport> {
    const apiKey = this.resolveApiKey();
    const staticFallback = CodeAnalyzerService.analyze({
      problemId: 0,
      problemTitle: params.problemTitle,
      problemStatement: params.problemStatement,
      functionSignature: params.functionSignature,
      constraints: params.constraints,
      userCode: params.userCode,
      isSolved: false,
    });

    if (env.AI_PROVIDER !== 'gemini' || !apiKey || !params.userCode.trim()) {
      return {
        timeComplexity: staticFallback.estimatedComplexity,
        spaceComplexity: 'See local analysis',
        referenceComplexity: staticFallback.targetComplexity,
        bottleneck: staticFallback.mistakes[0]?.detail || staticFallback.detectedMethod,
        optimizationTip: staticFallback.guidanceSteps[0] || 'Check loop nesting and extra containers.',
        provider: 'local',
      };
    }

    const numberedCode = params.userCode
      .split(/\r?\n/)
      .slice(0, 120)
      .map((l, i) => `${i + 1}: ${l}`)
      .join('\n')
      .slice(0, 3500);

    const prompt = `Analyze the exact asymptotic Time and Auxiliary Space complexity of this C++17 solution.
Problem: ${params.problemTitle}
Constraints: ${params.constraints || 'Standard competitive limits'}
Signature: ${params.functionSignature || 'Solution method'}
Statement: ${(params.problemStatement || '').slice(0, 800)}
${params.empiricalPointsSummary ? `Measured C++ Runtime Benchmark: ${params.empiricalPointsSummary}\n` : ''}
Code:
${numberedCode}

Return STRICT JSON only:
{
  "timeComplexity": "exact Big-O e.g. O(N log N) or O(V + E)",
  "spaceComplexity": "exact auxiliary space e.g. O(N) or O(1)",
  "referenceComplexity": "optimal Big-O for this problem e.g. O(N) time, O(1) space",
  "bottleneck": "1 short sentence naming the exact loop, recursion, or data structure driving complexity (cite line number)",
  "optimizationTip": "1 concrete sentence on how to improve complexity or confirm it is already optimal"
}`;

    const res = await this.invokeGeminiPrompt(prompt, apiKey, 700, {
      jsonMode: true,
      thinkingBudget: 512,
    });

    if (res.text) {
      try {
        const cleaned = res.text
          .replace(/^```(?:json)?\s*/i, '')
          .replace(/\s*```$/i, '')
          .trim();
        const firstBrace = cleaned.indexOf('{');
        const lastBrace = cleaned.lastIndexOf('}');
        const candidate =
          firstBrace !== -1 && lastBrace > firstBrace
            ? cleaned.slice(firstBrace, lastBrace + 1)
            : cleaned;
        const parsed = JSON.parse(candidate) as Partial<GeminiComplexityReport>;
        if (parsed.timeComplexity) {
          return {
            timeComplexity: parsed.timeComplexity,
            spaceComplexity: parsed.spaceComplexity || 'O(1)',
            referenceComplexity: parsed.referenceComplexity || staticFallback.targetComplexity,
            bottleneck: parsed.bottleneck || staticFallback.detectedMethod,
            optimizationTip:
              parsed.optimizationTip || 'Complexity inspected against problem constraints.',
            provider: 'gemini',
          };
        }
      } catch {
        // Fall through to static report cleanly
      }
    }

    return {
      timeComplexity: staticFallback.estimatedComplexity,
      spaceComplexity: 'O(1) – O(N)',
      referenceComplexity: staticFallback.targetComplexity,
      bottleneck: staticFallback.detectedMethod,
      optimizationTip: staticFallback.guidanceSteps[0] || 'Check nested loops or extra storage.',
      provider: 'local',
    };
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

    const res = await this.invokeGeminiPrompt(prompt, apiKey, 1800, {
      jsonMode: true,
      thinkingBudget: 512,
    });
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
${params.question || 'Give me a crisp interview overview on this topic.'}

Respond clearly under 220 words with bullet points, concrete mechanisms, trade-offs, and one common interviewer trap.`
          : `You are a strict yet constructive interviewer grading a candidate's mock answer.
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

      const res = await this.invokeGeminiPrompt(prompt, apiKey, 700, { thinkingBudget: 256 });
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
      return `Study Checklist (${params.topic}):\n• Define the core mechanism in 1 crisp sentence before diving into implementation.\n• State exact time/space or latency/consistency trade-offs.\n• Highlight one edge case (NULLs, overflow, failover, or clock drift) proactively.`;
    }
    const len = (params.userAnswer || '').trim().split(/\s+/).filter(Boolean).length;
    return `Answer Checklist (${params.topic} — ${len} words):\n• Clarity & Structure: Aim for Definition -> Mechanism -> Concrete Trade-off -> Metrics.\n• Check whether you stated numbers or edge cases explicitly.\n• Follow-up: How does your design behave under a 10x traffic spike or partial failure?`;
  }

  private static tryParseCoachJson(raw: string): StructuredCoachPayload | null {
    try {
      const cleaned = raw
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      const candidate =
        firstBrace !== -1 && lastBrace > firstBrace
          ? cleaned.slice(firstBrace, lastBrace + 1)
          : cleaned;
      return JSON.parse(candidate) as StructuredCoachPayload;
    } catch {
      return null;
    }
  }

  private static async callGeminiCoach(
    req: TeacherFeedbackRequest,
    mode: TeacherFeedbackResponse['mode'],
    hintLevel: number,
    analysis: MethodAnalysisReport,
    apiKey: string
  ): Promise<{ text: string | null; errorReason?: string }> {
    const isSql = req.category === 'SQL';
    const systemAndContextPrompt = this.buildCoachingPrompt(req, mode, hintLevel, isSql, analysis);
    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

    // Include prior turns cleanly when user asks follow-ups in the drawer
    if (Array.isArray(req.conversationHistory) && req.conversationHistory.length > 0) {
      contents.push({
        role: 'user',
        parts: [{ text: systemAndContextPrompt }],
      });
      const recentTurns = req.conversationHistory.slice(-6);
      for (const turn of recentTurns) {
        contents.push({
          role: turn.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: turn.content.slice(0, 1200) }],
        });
      }
      if (req.userQuestion?.trim()) {
        contents.push({
          role: 'user',
          parts: [
            {
              text: `${req.userQuestion.trim()}\n\nRemember: return STRICT JSON matching the schema with updated complexity, exact line mistakes (if any), and concise "feedback".`,
            },
          ],
        });
      }
    } else {
      contents.push({
        role: 'user',
        parts: [{ text: systemAndContextPrompt }],
      });
    }

    return this.invokeGeminiContents(contents, apiKey, 1800, {
      jsonMode: true,
      thinkingBudget: 1024,
    });
  }

  private static async invokeGeminiPrompt(
    prompt: string,
    apiKey: string,
    maxOutputTokens: number,
    options?: { jsonMode?: boolean; thinkingBudget?: number }
  ): Promise<{ text: string | null; errorReason?: string }> {
    return this.invokeGeminiContents(
      [{ role: 'user', parts: [{ text: prompt }] }],
      apiKey,
      maxOutputTokens,
      options
    );
  }

  private static async invokeGeminiContents(
    contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>,
    apiKey: string,
    maxOutputTokens: number,
    options?: { jsonMode?: boolean; thinkingBudget?: number }
  ): Promise<{ text: string | null; errorReason?: string }> {
    const modelCandidates = Array.from(
      new Set([
        env.AI_MODEL_NAME || 'gemini-2.5-flash',
        'gemini-2.5-flash',
        'gemini-2.0-flash',
        'gemini-2.5-flash-lite',
      ])
    );

    const isExpressAuthKey = apiKey.startsWith('AQ.');
    const endpointsForModel = (model: string): string[] => {
      const encodedModel = encodeURIComponent(model);
      const studioUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodedModel}:generateContent`;
      const vertexExpressUrl = `https://aiplatform.googleapis.com/v1/publishers/google/models/${encodedModel}:generateContent`;
      return isExpressAuthKey ? [vertexExpressUrl, studioUrl] : [studioUrl];
    };

    let lastErrorReason = 'Gemini API request failed.';

    for (const model of modelCandidates) {
      for (const baseUrl of endpointsForModel(model)) {
        const sendRequest = async (includeThinkingConfig: boolean) => {
          const generationConfig: Record<string, unknown> = {
            temperature: options?.jsonMode ? 0.15 : 0.35,
            maxOutputTokens,
          };
          if (options?.jsonMode) {
            generationConfig.responseMimeType = 'application/json';
          }
          if (includeThinkingConfig && model.includes('2.5')) {
            generationConfig.thinkingConfig = {
              thinkingBudget: options?.thinkingBudget ?? 512,
            };
          }

          return fetch(`${baseUrl}?key=${encodeURIComponent(apiKey)}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': apiKey,
            },
            signal: AbortSignal.timeout(18000),
            body: JSON.stringify({
              contents,
              generationConfig,
            }),
          });
        };

        try {
          let res = await sendRequest(true);
          if (res.status === 400 && model.includes('2.5')) {
            const firstErr = await res.text().catch(() => '');
            if (firstErr.toLowerCase().includes('thinking') || firstErr.toLowerCase().includes('json')) {
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
            Logger.warn(
              'AiTeacherService',
              `Gemini request failed (${res.status}) on '${model}'; trying next model.`
            );
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
          Logger.warn(
            'AiTeacherService',
            `Gemini request error on '${model}'. Trying fallback.`,
            error
          );
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
    const schemaSnippet =
      isSql && req.schemaDdl ? `\nDatabase Schema DDL:\n${req.schemaDdl.slice(0, 900)}\n` : '';
    const examplesSnippet =
      Array.isArray(req.examples) && req.examples.length > 0
        ? `\nExamples:\n${req.examples
            .slice(0, 2)
            .map((e, i) => `Example ${i + 1}: Input: ${e.input || ''} | Expected: ${e.output || ''}`)
            .join('\n')}\n`
        : '';
    const numberedCode = (req.userCode || '')
      .split(/\r?\n/)
      .slice(0, 140)
      .map((line, idx) => `${idx + 1}: ${line}`)
      .join('\n')
      .slice(0, 4200);

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
      typeof execResult?.passedTestCases === 'number' &&
      typeof execResult?.totalTestCases === 'number' &&
      execResult.totalTestCases > 0
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
              ? `${progressLine}Latest Verdict: ${req.verdict}${typeof execResult?.runtimeMs === 'number' ? ` (${execResult.runtimeMs}ms)` : ''}`
              : 'Not executed yet against test cases — inspect logic directly.';

    const staticFindings =
      analysis.mistakes.length > 0
        ? analysis.mistakes
            .map((m) => `- ${m.line ? `Line ${m.line}: ` : ''}${m.title} (${m.detail})`)
            .join('\n')
        : 'None caught by regex pre-check; inspect semantics line-by-line.';

    const roleDirective =
      mode === 'analyze' || mode === 'coach'
        ? `Perform a strict real-time code audit. Pinpoint EVERY logical mistake, off-by-one bug, wrong data structure invariant, overflow risk, or SQL join/NULL/group bug by exact line number. If execution failed, trace their exact code step-by-step on the failing input to explain why Actual != Expected. State true Time & Space complexity honestly.`
        : mode === 'optimizer'
          ? `The code passed all tests (Accepted). Compute exact Time & Space complexity, verify whether it matches optimal constraints (${req.constraints || 'standard'}), and suggest 1-2 concrete algorithmic or C++/SQL optimizations.`
          : hintLevel === 1
            ? `Give Hint 1: high-level pattern/intuition nudge tailored to their current draft without revealing code.`
            : hintLevel === 2
              ? `Give Hint 2: key invariant, data structure, or SQL clause strategy + point out any mistake in their current draft without giving full solution.`
              : `Give Hint 3: clear numbered algorithm steps and edge cases tailored to their current draft.`;

    return `You are a senior software engineer coaching a candidate on a ${langLabel} coding problem.

RULES:
1. NEVER falsely praise broken, failing, or incomplete/stubbed code. Never report "O(1)" for empty stubs or failing drafts.
2. Inspect the candidate's actual code line by line, citing exact line numbers and variable/column names.
3. Return STRICT JSON ONLY (no markdown fences) with this exact schema:
{
  "verdictSummary": "1 crisp sentence summarizing current correctness & status",
  "detectedMethod": "Specific algorithm/approach detected in user's code",
  "timeComplexity": "Exact Big-O time complexity of user's current code",
  "spaceComplexity": "Exact auxiliary Big-O space complexity of user's current code",
  "targetComplexity": "Optimal Big-O time & space for problem constraints",
  "mistakes": [
    { "line": 12, "title": "Short bug title", "detail": "Why it fails on specific input/edge case", "fixHint": "Exact change needed" }
  ],
  "feedback": "Concise markdown explanation (under 220 words): failure trace or optimization advice or progressive hint"
}

Problem: #${req.problemId} ${req.problemTitle}
Category: ${req.category || 'DSA'} | Topic: ${req.topic || 'General'} | Pattern: ${req.pattern || 'General'}
${req.functionSignature ? `Signature: ${req.functionSignature}\n` : ''}Constraints: ${req.constraints || 'Standard limits'}
Statement: ${statementSnippet}
${examplesSnippet}${schemaSnippet}
Candidate's current ${langLabel} code (with line numbers):
${numberedCode || '(empty editor)'}

Static pre-check notes:
${staticFindings}

Execution status:
${failureDetails}
${req.userQuestion?.trim() ? `\nCandidate question: ${req.userQuestion.trim()}\n` : ''}
Task:
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
