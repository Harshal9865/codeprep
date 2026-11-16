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
  guidanceSteps?: string[];
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

          const aiGuidanceSteps = Array.isArray(parsed.guidanceSteps)
            ? parsed.guidanceSteps
                .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
                .map((s) => s.trim())
                .slice(0, 5)
            : [];

          const enhancedAnalysis: MethodAnalysisReport & { spaceComplexity?: string } = {
            detectedMethod: parsed.detectedMethod?.trim() || staticAnalysis.detectedMethod,
            estimatedComplexity: combinedComplexity,
            targetComplexity: parsed.targetComplexity?.trim() || staticAnalysis.targetComplexity,
            mistakes: mergedMistakes,
            guidanceSteps:
              aiGuidanceSteps.length > 0 ? aiGuidanceSteps : staticAnalysis.guidanceSteps,
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
              text: `Candidate follow-up question: ${req.userQuestion.trim()}\n\nAnswer this exact question thoroughly with concrete trace values from their latest code, then return STRICT JSON matching the schema (including "guidanceSteps" and markdown-formatted "feedback").`,
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

    return this.invokeGeminiContents(contents, apiKey, 2600, {
      jsonMode: true,
      thinkingBudget: 512,
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
    const isOop = req.category === 'OOP';
    const langLabel = isSql ? 'SQLite SQL' : isOop ? 'C++17 OOP / Class Design' : 'C++17';
    const statementSnippet = (req.problemStatement || '').slice(0, 1400);
    const schemaSnippet =
      isSql && req.schemaDdl ? `\nDatabase Schema DDL:\n${req.schemaDdl.slice(0, 1000)}\n` : '';
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
      .slice(0, 4400);

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
      ? `${progressLine}Compiler/Syntax Error:\n${execResult.compileError.slice(0, 700)}`
      : execResult?.error
        ? `${progressLine}Execution / SQL Error:\n${execResult.error.slice(0, 700)}`
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

    const domainNotes = isSql
      ? 'Check JOIN grain (INNER vs LEFT JOIN preserving zeros), NULL traps (NOT IN, COALESCE), WHERE vs HAVING filter placement, integer division (`1.0 * a / b`), deterministic ORDER BY, and exact column aliases.'
      : isOop
        ? 'Check class invariants, const-correctness, virtual destructors/overrides, object slicing, Rule of 3/5 move safety, edge inputs, and integer overflow.'
        : 'Check loop boundaries, off-by-one indices, overflow (`long long`), visited/base cases, container aliasing/invalidation, and true worst-case time & auxiliary space.';

    const roleDirective = req.userQuestion?.trim()
      ? `The candidate asked a direct question: "${req.userQuestion.trim()}". Answer this question directly first with a concrete trace using their exact variables/columns/lines, then update mistakes and guidanceSteps to reflect their current code.`
      : mode === 'analyze' || mode === 'coach'
        ? `Perform a sharp line-by-line engineering audit. If execution failed, walk through a short concrete trace on the failing test case showing exactly where Actual diverges from Expected. Pinpoint every bug by line number in "mistakes". In "feedback", structure cleanly with **Root Diagnosis**, **Trace / Evidence**, and **How to Fix** (include a tiny 3-6 line fenced patch snippet ONLY for the broken fragment, never a full rewrite).`
        : mode === 'optimizer'
          ? `The code passed all tests (Accepted). Compute exact Time & Auxiliary Space complexity, compare directly against optimal constraints (${req.constraints || 'standard'}), and give 1-2 concrete C++/SQL refinements (constant-factor memory, STL/index usage, or cleaner invariant).`
          : hintLevel === 1
            ? `Give Hint 1 (Pattern Nudge): 2-4 crisp sentences identifying the bottleneck or missing invariant in their current draft and pointing them toward the right data structure or SQL clause WITHOUT revealing code.`
            : hintLevel === 2
              ? `Give Hint 2 (Core Invariant & Bug Spotter): explain the exact state/invariant or JOIN/window partition strategy needed, call out any bug in their current draft by line number, and outline the transformation without giving a complete solution.`
              : `Give Hint 3 (Implementation Blueprint): provide a clear numbered 3-5 step plan mapped to their exact signature/tables plus critical boundary edge cases.`;

    return `You are a Principal Engineer mentoring a candidate live in an IDE on a ${langLabel} problem.

QUALITY BAR (CRITICAL):
1. Be concrete and evidence-driven. Reference exact line numbers, variable/column names, and failing input/row values. Never use generic filler ("check edge cases", "consider optimizing").
2. NEVER falsely praise empty stubs or broken code, and never label an incomplete draft as O(1).
3. ${domainNotes}
4. Format "feedback" as crisp, readable GitHub Markdown (short bold section titles, inline \`code\` tokens, concise bullets, and at most one tiny targeted snippet when fixing a concrete bug; keep under 260 words).
5. Return STRICT JSON ONLY (no markdown wrapper around the JSON) matching this schema:
{
  "verdictSummary": "1 crisp headline summarizing current status & main insight",
  "detectedMethod": "Specific algorithm, class design, or SQL pattern used in code",
  "timeComplexity": "Exact Big-O time complexity or SQL query plan complexity",
  "spaceComplexity": "Exact auxiliary space Big-O (e.g. O(N) hash map, O(1) extra)",
  "targetComplexity": "Optimal Big-O time & space for problem constraints",
  "mistakes": [
    { "line": 12, "title": "Concise bug title", "detail": "Exact reason it fails with input/column details", "fixHint": "Concrete fix" }
  ],
  "guidanceSteps": [
    "Actionable next step 1",
    "Actionable next step 2"
  ],
  "feedback": "Clean Markdown coaching response tailored to mode/question"
}

Problem: #${req.problemId} ${req.problemTitle}
Category: ${req.category || 'DSA'} | Topic: ${req.topic || 'General'} | Pattern: ${req.pattern || 'General'}
${req.functionSignature ? `Signature: ${req.functionSignature}\n` : ''}Constraints: ${req.constraints || 'Standard limits'}
Statement: ${statementSnippet}
${examplesSnippet}${schemaSnippet}
Candidate's current ${langLabel} code (numbered lines):
${numberedCode || '(empty editor)'}

Static pre-check notes:
${staticFindings}

Execution status:
${failureDetails}

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
    const isSql = req.category === 'SQL';
    const isOop = req.category === 'OOP';
    const execResult = req.executionResult as
      | (ExecutionResult & {
          error?: string;
          columns?: string[];
          expectedColumns?: string[];
          rows?: Array<Record<string, unknown>>;
          expectedRows?: Array<Record<string, unknown>>;
        })
      | undefined;

    if (req.userQuestion?.trim()) {
      const q = req.userQuestion.trim();
      const firstBug = analysis.mistakes[0];
      const traceNote = execResult?.failedTestCase
        ? `\n\n**Failing Test Trace**\n- Input: \`${execResult.failedTestCase.input}\`\n- Expected: \`${execResult.failedTestCase.expected}\`\n- Actual: \`${execResult.failedTestCase.actual}\``
        : '';
      return {
        message: [
          `**Offline Analysis for:** _"${q}"_`,
          `- **Detected Approach:** ${analysis.detectedMethod} (\`${analysis.estimatedComplexity}\` vs target \`${analysis.targetComplexity}\`)`,
          firstBug
            ? `- **Primary Signal${firstBug.line ? ` (Line ${firstBug.line})` : ''}:** **${firstBug.title}** — ${firstBug.detail}\n- **Fix:** ${firstBug.fixHint}`
            : `- **Next Check:** ${analysis.guidanceSteps[0] || 'Trace one concrete example line-by-line against the Loop/Join invariant.'}`,
        ].join('\n') + traceNote,
        hintLevel,
        mode: hasFailureVerdict ? 'coach' : 'analyze',
      };
    }

    if (mode === 'analyze' || hasFailureVerdict || analysis.mistakes.length > 0) {
      const lines: string[] = [
        `**Detected Method:** ${analysis.detectedMethod}`,
      ];
      if (execResult?.compileError) {
        lines.push(`\n**Compiler / Syntax Error**\n\`\`\`\n${execResult.compileError.slice(0, 320)}\n\`\`\``);
      } else if (execResult?.error) {
        lines.push(`\n**Execution Error**\n\`${execResult.error.slice(0, 260)}\``);
      } else if (execResult?.failedTestCase) {
        lines.push(
          `\n**Failing Case (${req.verdict})**\n- Input: \`${execResult.failedTestCase.input}\`\n- Expected: \`${execResult.failedTestCase.expected}\` | Actual: \`${execResult.failedTestCase.actual}\``
        );
      } else if (isSql && req.verdict === 'Wrong Answer' && execResult?.columns) {
        lines.push(
          `\n**Query Output Diff**\n- Columns got: \`[${execResult.columns.join(', ')}]\` vs expected: \`[${(execResult.expectedColumns || []).join(', ')}]\`\n- Rows got: \`${execResult.rows?.length ?? 0}\` vs expected: \`${execResult.expectedRows?.length ?? '?'}\``
        );
      }

      if (analysis.mistakes.length > 0) {
        lines.push(
          `\n**Key Issues (${analysis.mistakes.length})**\n` +
            analysis.mistakes
              .slice(0, 4)
              .map(
                (m, i) =>
                  `${i + 1}. ${m.line ? `\`Line ${m.line}\` ` : ''}**${m.title}:** ${m.detail} → _${m.fixHint}_`
              )
              .join('\n')
        );
      }

      if (analysis.guidanceSteps.length > 0) {
        lines.push(
          `\n**Next Steps**\n${analysis.guidanceSteps.map((s) => `- ${s}`).join('\n')}`
        );
      }

      return {
        message: lines.join('\n'),
        hintLevel,
        mode: hasFailureVerdict ? 'coach' : 'analyze',
      };
    }

    if (mode === 'optimizer' && isCurrentAccepted) {
      return {
        message: isSql
          ? `**Accepted · ${analysis.detectedMethod}**\n\n**Refinement Checklist**\n- Push selective \`WHERE\` predicates earlier before joins or window \`OVER (...)\` passes.\n- Verify tie-breakers in \`ORDER BY\` so output stays deterministic.\n- Check whether a single \`LEFT JOIN\` + \`GROUP BY\` replaces nested correlated subqueries.`
          : `**Accepted · ${analysis.detectedMethod} (\`${analysis.estimatedComplexity}\`)**\n\n**Optimization Checklist**\n- Compare against optimal target (\`${analysis.targetComplexity}\`): can auxiliary containers be eliminated toward \`O(1)\` space?\n- Pass read-only containers by \`const &\`, use \`reserve()\` where sizes are known, and avoid redundant passes.${isOop ? '\n- Verify `const`-correct observers, `virtual` destructors where polymorphic, and atomic invariant checks.' : ''}`,
        hintLevel,
        mode: 'optimizer',
      };
    }

    const topicNote = req.topic ? ` (${req.topic})` : '';
    const patternNote = req.pattern && req.pattern !== 'General' ? ` — \`${req.pattern}\`` : '';

    if (hintLevel === 1) {
      return {
        message: isSql
          ? `**Hint 1 — Output Grain${topicNote}**\nStart by identifying one row of the required result set: choose the base table and decide \`INNER JOIN\` vs \`LEFT JOIN\` (to retain zero/NULL rows) before aggregating.`
          : isOop
            ? `**Hint 1 — Class Boundary${topicNote}**\nIdentify the core class invariant first: which fields must remain \`private\`, what preconditions validate state transitions, and which queries should be \`const\`?`
            : `**Hint 1 — Pattern Nudge${topicNote}**\nIdentify the lookup or traversal invariant required${patternNote}. Ask whether you need \`O(1)\` hash state, two pointers / monotonic structure, or divide-and-conquer to reach \`${analysis.targetComplexity}\`.`,
        hintLevel: 1,
        mode: 'nudge',
      };
    }

    if (hintLevel === 2) {
      return {
        message: isSql
          ? `**Hint 2 — Clauses & NULLs**\nKeep row filters in \`WHERE\` (or \`ON\` for \`LEFT JOIN\` right-table filters!) and post-aggregation filters in \`HAVING\`. Use \`COALESCE(expr, 0)\` and \`1.0 * a / b\` for safe arithmetic.`
          : isOop
            ? `**Hint 2 — Ownership & Polymorphism**\nWatch for copy/move ownership (\`Rule of 0/5\`), virtual dispatch through references (\`Base&\`) rather than by-value slicing, and atomic rollback if validation fails.`
            : `**Hint 2 — Core Invariant${patternNote}**\nMaintain minimal loop state so each element is processed once or logarithmically instead of re-scanning with nested loops.`,
        hintLevel: 2,
        mode: 'nudge',
      };
    }

    return {
      message: isSql
        ? `**Hint 3 — Step-by-Step Query Plan**\n1. Build the base join grain (\`FROM\` + \`LEFT/INNER JOIN\`) with explicit join keys.\n2. Compute per-group or ranked metrics via \`GROUP BY\` / window \`OVER (PARTITION BY ... ORDER BY ...)\`.\n3. Project exact required column aliases, handle \`NULL\`s cleanly, and apply final \`ORDER BY\`.`
        : `**Hint 3 — Implementation Plan${patternNote}**\n1. Initialize clean tracking state sized for \`${req.topic || 'the problem'}\`.\n2. Process elements sequentially while maintaining your loop/class invariant.\n3. Verify boundaries: empty input, single element, duplicates, and \`${req.constraints || 'upper constraint bounds'}\`.`,
      hintLevel: 3,
      mode: 'nudge',
    };
  }
}

export const AiTeacherService = StudyGuideService;
