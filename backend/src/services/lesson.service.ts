import { prisma } from './prisma.service';
import { env } from '../config/env';
import { VERIFIED_5_LESSONS } from '../data/lessons5';
import { DSA_500_PROBLEMS } from '../data/dsa500';
import { SQL_100_PROBLEMS } from '../data/sql100';
import { findCuratedSolution, findBatchFallbackSolution } from '../data/curatedSolutions';
import { AiTeacherService } from './aiTeacher.service';
import { ProblemService } from './problem.service';
import { TimerService } from './timer.service';
import { Logger } from '../utils/logger';

interface LessonTopicGuide {
  intuition: string;
  recognition: string;
  mistakes: string;
  progression: string;
}

const TOPIC_GUIDES: Record<string, LessonTopicGuide> = {
  'Arrays and Hashing': {
    intuition: 'Trade O(N) auxiliary hash map or set space for O(1) lookup, frequency counting, or prefix accumulation.',
    recognition: 'Lookup pairs/duplicates, contiguous subarrays with target sum, or grouping items by canonical keys.',
    mistakes: 'Mutating container while iterating, missing negative prefix keys, or integer overflow on cumulative sums.',
    progression: '1. Brute Force: O(N^2) nested pairs.\n2. Sorting: O(N log N) two-pass when order can change.\n3. Optimal: O(N) single pass with unordered_map / prefix state.',
  },
  'Two Pointers': {
    intuition: 'Maintain two converging or co-directional indices so each element is visited at most a constant number of times.',
    recognition: 'Sorted arrays, palindrome checks, partitioning in-place, or bounded container/area pairs.',
    mistakes: 'Off-by-one loop conditions (left < right vs <=), duplicate skipping bugs, or moving the wrong boundary.',
    progression: '1. Brute Force: O(N^2) pair search.\n2. Optimal: O(N) time and O(1) extra space with pointer invariants.',
  },
  'Sliding Window': {
    intuition: 'Expand right pointer to include candidates and advance left pointer only while the window violates constraints.',
    recognition: 'Longest/shortest contiguous substring or subarray satisfying frequency or bound constraints.',
    mistakes: 'Recomputing window aggregate from scratch inside loop or failing to decrement frequency cleanly.',
    progression: '1. Brute Force: O(N^2) checking all substrings.\n2. Optimal: O(N) amortized two-pointer window.',
  },
  'Binary Search': {
    intuition: 'Exploit monotonicity to halve the candidate search space or binary-search over possible answer bounds.',
    recognition: 'Sorted/rotated collections, peak finding, or minimum feasible capacity/rate questions.',
    mistakes: 'Integer overflow in (lo + hi) / 2 instead of lo + (hi - lo) / 2, and infinite loop on hi = mid.',
    progression: '1. Linear Scan: O(N).\n2. Optimal: O(log N) over index or O(N log M) over monotonic answer space.',
  },
  'Stack and Queues': {
    intuition: 'Use LIFO stacks or monotonic deques to resolve pending elements immediately once a barrier/boundary appears.',
    recognition: 'Next greater element, parenthesis matching, histogram boundaries, or sliding window extrema.',
    mistakes: 'Storing values instead of indices, or reading stack.top() before checking !st.empty().',
    progression: '1. Brute Force: O(N^2) scanning backward/forward per index.\n2. Optimal: O(N) single push + single pop per element.',
  },
  'Graphs': {
    intuition: 'Model entities as vertices and relationships as adjacency lists; explore via BFS levels, DFS recursion, or topological ordering.',
    recognition: 'Connected components, shortest unweighted path, prerequisite cycles, or grid flood-fill.',
    mistakes: 'Forgetting visited marking BEFORE enqueueing in BFS (causing duplicate queue explosion) or skipping disconnected components.',
    progression: '1. Unbounded DFS: Exponential on cyclic graphs.\n2. Optimal: O(V + E) BFS/DFS/Kahn topological traversal.',
  },
  'Trees': {
    intuition: 'Decompose tree invariants recursively into left subtree + right subtree + node state combination.',
    recognition: 'Depth/diameter/balance, lowest common ancestor, BST validation bounds, or level-order BFS.',
    mistakes: 'Not handling nullptr leaf bases or comparing local child values instead of subtree bounds in BST checks.',
    progression: '1. Repeated Root Traversals: O(N^2).\n2. Optimal: O(N) post-order or level-order traversal passing bounds cleanly.',
  },
  'Backtracking': {
    intuition: 'Build partial choices incrementally along a state tree, prunning invalid branches early and undoing state upon return.',
    recognition: 'Subsets, permutations, combinations, or bounded grid/word path search under small N.',
    mistakes: 'Forgetting to restore visited flag / pop_back() after recursion returns or allowing duplicate branches.',
    progression: '1. Naive enumeration + post-filter.\n2. Optimal Backtracking: O(branch^depth) with early constraint pruning.',
  },
  '1-D Dynamic Programming': {
    intuition: 'Define dp[i] clearly as the optimal answer for prefix ending at i and derive recurrence from prior states.',
    recognition: 'Overlapping subproblems, counting ways, minimum cost to reach state n, or subsequence optimization.',
    mistakes: 'Missing base cases dp[0] or iterating weights/coins in the wrong loop order.',
    progression: '1. Recursion: Exponential O(2^N).\n2. Memoization/Tabulation: O(N) or O(N * K), often reducible to O(1) space.',
  },
  '2-D Dynamic Programming': {
    intuition: 'Track two independent indices/capacities dp[i][j] representing prefix alignments or knapsack capacity subproblems.',
    recognition: 'Two-string alignment, grid paths, or bounded weight/value selection.',
    mistakes: 'Swapping 1-indexed DP table offset vs 0-indexed string/array lookups.',
    progression: '1. Recursive Subtree: Exponential.\n2. 2D Tabulation: O(M * N) time, often compressible to O(N) rolling 1D array.',
  },
};

const DEFAULT_GUIDE: LessonTopicGuide = {
  intuition: 'Identify the core invariant preserving validity at each step, choose a matching container, and verify boundary inputs.',
  recognition: 'Look at constraint scale N to infer target complexity (10^5 implies O(N) or O(N log N); 10^3 implies O(N^2); <=20 implies backtracking/bitmask).',
  mistakes: 'Watch for empty collections, duplicate values, signed 32-bit overflow, and uninitialized accumulators.',
  progression: '1. Brute Force baseline matching exact specification.\n2. Eliminate repeated work via precomputation or monotonic state.\n3. Optimal single-pass or logarithmic solution.',
};

export class LessonService {
  private static safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
    if (!raw) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }

  private static isPlaceholderSolution(code: string | null | undefined): boolean {
    if (!code) return true;
    const trimmed = code.trim();
    return (
      trimmed.length < 30 ||
      trimmed.includes('// Reference Strategy Blueprint') ||
      trimmed.includes('// Optimal Strategy Blueprint') ||
      trimmed.includes('// Implement your solution here') ||
      trimmed.includes('// Write your solution here') ||
      trimmed.includes('// Your code here') ||
      trimmed.includes('// Apply ')
    );
  }

  static async seedLessons(): Promise<void> {
    try {
      for (const lesson of VERIFIED_5_LESSONS) {
        await prisma.aiLesson.upsert({
          where: { problemId: lesson.problemId },
          update: {
            techniqueLesson: lesson.techniqueLesson,
            visualTraceJson: lesson.visualTraceJson,
            workedExamples: lesson.workedExamples,
            approachProgression: lesson.approachProgression,
            verifiedSolution: lesson.verifiedSolution,
            similarProblemsJson: lesson.similarProblemsJson,
          },
          create: {
            problemId: lesson.problemId,
            techniqueLesson: lesson.techniqueLesson,
            visualTraceJson: lesson.visualTraceJson,
            workedExamples: lesson.workedExamples,
            approachProgression: lesson.approachProgression,
            verifiedSolution: lesson.verifiedSolution,
            similarProblemsJson: lesson.similarProblemsJson,
          },
        });
      }
      Logger.info('LessonService', 'Starter curated reference solutions synchronized into SQLite.');
    } catch (err) {
      Logger.error('LessonService', 'Notice during lesson seeding', err);
    }
  }

  private static async buildAndPersistDynamicLesson(problemId: number) {
    let dbProblem = await prisma.problem.findUnique({ where: { id: problemId } });
    if (!dbProblem) {
      await ProblemService.seedInitialProblems();
      dbProblem = await prisma.problem.findUnique({ where: { id: problemId } });
    }
    if (!dbProblem) {
      throw new Error(`Problem #${problemId} not found.`);
    }

    const dsaDef = DSA_500_PROBLEMS.find((p) => p.id === problemId);
    const sqlDef = SQL_100_PROBLEMS.find((p) => p.id === problemId);

    const guide = TOPIC_GUIDES[dbProblem.topic] || DEFAULT_GUIDE;
    let examples: Array<{ input?: string; output?: string; explanation?: string }> = [];
    try {
      examples = JSON.parse(dbProblem.examplesJson || '[]');
    } catch {
      examples = [];
    }

    const related = await prisma.problem.findMany({
      where: {
        topic: dbProblem.topic,
        id: { not: problemId },
      },
      select: { id: true, title: true },
      orderBy: { id: 'asc' },
      take: 3,
    });

    const fallbackRelated =
      related.length >= 3
        ? related
        : await prisma.problem.findMany({
            where: {
              category: dbProblem.category,
              id: { not: problemId },
            },
            select: { id: true, title: true },
            orderBy: { id: 'asc' },
            take: 3,
          });

    const isSql = dbProblem.category === 'SQL';
    let baseTechnique = `### Pattern: ${dbProblem.pattern || dbProblem.topic}

#### Core Intuition (${dbProblem.topic} • ${dbProblem.difficulty})
${guide.intuition}

#### Recognition Cues
${guide.recognition}

#### Common Pitfalls
${guide.mistakes}`;

    const workedExamplesText =
      examples.length > 0
        ? examples
            .map(
              (ex, i) =>
                `Example ${i + 1}:\n  Input: ${ex.input || '(see statement)'}\n  Output: ${ex.output || '(see statement)'}${ex.explanation ? `\n  Walkthrough: ${ex.explanation}` : ''}`
            )
            .join('\n\n')
        : isSql && sqlDef
        ? `Sample Schema:\n${sqlDef.schemaDdl}\n\nExpected Output Sample:\n${sqlDef.expectedResultJson}`
        : `Verify empty/minimal inputs, boundary values from constraints:\n${dbProblem.constraints}`;

    const visualTrace = {
      steps: [
        {
          step: 1,
          description: `Analyze constraints for ${dbProblem.title} (${dbProblem.topic})`,
          state: `Pattern selected: ${dbProblem.pattern || dbProblem.topic}`,
          decision: isSql ? 'Inspect target table columns, joins, and grouping grain.' : 'Initialize invariant container / pointers.',
        },
        {
          step: 2,
          description: 'Apply core transformation / pass over dataset',
          state: guide.intuition,
          decision: isSql ? 'Filter/aggregate rows and apply ORDER BY if required.' : 'Maintain loop invariant and avoid nested scans.',
        },
        {
          step: 3,
          description: 'Verify boundary conditions & finalize return value',
          state: `Check constraints: ${dbProblem.constraints.split('\n')[0] || 'Standard limits'}`,
          decision: 'Compare output structure cleanly against expected test format.',
        },
      ],
    };

    let approachProgression = guide.progression;
    let verifiedSolution = '';

    if (isSql && sqlDef) {
      verifiedSolution = `-- Reference Query for #${dbProblem.id}: ${dbProblem.title}\n${sqlDef.expectedQuery}`;
    } else {
      const curated = findCuratedSolution(dbProblem.id, dbProblem.slug);
      if (curated) {
        verifiedSolution = curated.code;
        if (curated.complexity) {
          approachProgression = `${curated.complexity}\n\n${guide.progression}`;
        }
      } else {
        const aiGenerated = await AiTeacherService.generateReferenceLessonContent({
          problemId: dbProblem.id,
          title: dbProblem.title,
          topic: dbProblem.topic,
          pattern: dbProblem.pattern,
          difficulty: dbProblem.difficulty,
          category: dbProblem.category,
          statement: dbProblem.statement,
          constraints: dbProblem.constraints,
          functionSignature: dbProblem.functionSignature,
          examples,
        });

        if (aiGenerated && !this.isPlaceholderSolution(aiGenerated.verifiedSolution)) {
          verifiedSolution = aiGenerated.verifiedSolution;
          if (aiGenerated.techniqueLesson) baseTechnique = aiGenerated.techniqueLesson;
          if (aiGenerated.approachProgression) approachProgression = aiGenerated.approachProgression;
        } else {
          const fallbackSolution = findBatchFallbackSolution({
            problemId: dbProblem.id,
            functionSignature: dbProblem.functionSignature,
            topic: dbProblem.topic,
          });
          verifiedSolution = fallbackSolution.code;
          if (fallbackSolution.complexity) {
            approachProgression = `${fallbackSolution.complexity}\n\n${guide.progression}`;
          }
        }
      }
    }

    const saved = await prisma.aiLesson.upsert({
      where: { problemId },
      update: {
        techniqueLesson: baseTechnique,
        visualTraceJson: JSON.stringify(visualTrace),
        workedExamples: workedExamplesText,
        approachProgression,
        verifiedSolution,
        similarProblemsJson: JSON.stringify(fallbackRelated),
      },
      create: {
        problemId,
        techniqueLesson: baseTechnique,
        visualTraceJson: JSON.stringify(visualTrace),
        workedExamples: workedExamplesText,
        approachProgression,
        verifiedSolution,
        similarProblemsJson: JSON.stringify(fallbackRelated),
      },
    });

    return saved;
  }

  static async getLessonByProblemId(problemId: number, userId: string) {
    // Ensure catalog is seeded if a cold boot receives a direct lesson request
    const probExists = await prisma.problem.findUnique({ where: { id: problemId }, select: { id: true } });
    if (!probExists) {
      await ProblemService.seedInitialProblems();
    }

    let timerStatus = await TimerService.getStatus(problemId, userId);

    // Unlock cleanly on explicit solution inspection instead of failing with 403
    if (!timerStatus.isUnlocked) {
      await TimerService.unlockAiSolution(problemId, userId);
      timerStatus = await TimerService.getStatus(problemId, userId);
    }

    let lesson = await prisma.aiLesson.findUnique({
      where: { problemId },
    });

    if (
      !lesson ||
      this.isPlaceholderSolution(lesson.verifiedSolution) ||
      !lesson.visualTraceJson ||
      !lesson.similarProblemsJson
    ) {
      lesson = await this.buildAndPersistDynamicLesson(problemId);
    }

    return {
      problemId: lesson.problemId,
      techniqueLesson: lesson.techniqueLesson,
      visualTrace: this.safeJsonParse(lesson.visualTraceJson, { steps: [] }),
      workedExamples: lesson.workedExamples,
      approachProgression: lesson.approachProgression,
      verifiedSolution: lesson.verifiedSolution,
      similarProblems: this.safeJsonParse(lesson.similarProblemsJson, []),
      isSolved: timerStatus.isSolved,
      solvedWithAiHelp: timerStatus.solvedWithAiHelp,
    };
  }
}
