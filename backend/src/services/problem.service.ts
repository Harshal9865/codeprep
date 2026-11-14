import { prisma } from './prisma.service';
import { DSA_500_PROBLEMS } from '../data/dsa500';
import { SQL_100_PROBLEMS } from '../data/sql100';
import { Logger } from '../utils/logger';
import { UserProblemStateService } from './userProblemState.service';

export interface ProblemFilterOptions {
  category?: string;
  topic?: string;
  difficulty?: string;
  status?: string; // 'solved' | 'unsolved' | 'ai-solved' | 'bookmarked'
  search?: string;
  page?: number;
  pageSize?: number;
}

export class ProblemService {
  private static seedingPromise: Promise<void> | null = null;
  private static catalogReady = false;

  static async seedInitialProblems(): Promise<void> {
    if (this.seedingPromise) {
      return this.seedingPromise;
    }

    this.seedingPromise = this.runSeedInitialProblems().finally(() => {
      this.seedingPromise = null;
    });

    return this.seedingPromise;
  }

  private static async runSeedInitialProblems(): Promise<void> {
    try {
      const totalTarget = DSA_500_PROBLEMS.length + SQL_100_PROBLEMS.length;
      const existingCount = await prisma.problem.count();
      Logger.info('ProblemService', `Current problem count in database: ${existingCount} (Target: ${totalTarget})`);

      if (existingCount >= totalTarget) {
        ProblemService.catalogReady = true;
      } else {
        Logger.info('ProblemService', `Seeding missing questions (${DSA_500_PROBLEMS.length} DSA + ${SQL_100_PROBLEMS.length} SQL)...`);

        const dsaRecords = DSA_500_PROBLEMS.map((prob) => ({
          id: prob.id,
          slug: prob.slug,
          title: prob.title,
          difficulty: prob.difficulty,
          category: prob.category,
          topic: prob.topic,
          pattern: prob.pattern,
          statement: prob.statement,
          constraints: prob.constraints,
          examplesJson: JSON.stringify(prob.examples),
          functionSignature: prob.functionSignature,
          cppHarnessTemplate: prob.defaultCodeStub || null,
        }));

        const sqlRecords = SQL_100_PROBLEMS.map((prob) => ({
          id: prob.id,
          slug: prob.slug,
          title: prob.title,
          difficulty: prob.difficulty,
          category: prob.category,
          topic: prob.topic,
          pattern: prob.pattern,
          statement: prob.statement,
          constraints: prob.constraints,
          examplesJson: JSON.stringify(prob.examples),
          functionSignature: prob.functionSignature,
          cppHarnessTemplate: prob.defaultCodeStub || null,
        }));

        const allRecords = [...dsaRecords, ...sqlRecords];

        // Insert in safe chunks of 25 records to strictly respect SQLite parameter limits
        const CHUNK_SIZE = 25;
        for (let i = 0; i < allRecords.length; i += CHUNK_SIZE) {
          const chunk = allRecords.slice(i, i + CHUNK_SIZE);
          try {
            await prisma.problem.createMany({
              data: chunk,
            });
          } catch {
            // Fallback: upsert records individually in this chunk if batch insert encounters conflicts
            for (const r of chunk) {
              await prisma.problem.upsert({
                where: { id: r.id },
                update: r,
                create: r,
              });
            }
          }
        }
      }

      // Synchronize curated famous problems when initial seed runs or canonical examples change
      const { FAMOUS_DSA_PROBLEMS } = await import('../data/famousCurriculum');
      const sentinel130 = FAMOUS_DSA_PROBLEMS.find((p) => p.id === 130);
      const sentinel = existingCount >= totalTarget
        ? await prisma.problem.findUnique({ where: { id: 130 }, select: { slug: true, examplesJson: true } })
        : null;
      const needsCuratedSync =
        existingCount < totalTarget ||
        sentinel?.slug !== '130-job-sequencing-problem-gfg' ||
        (sentinel130 && sentinel?.examplesJson !== JSON.stringify(sentinel130.examples));

      if (needsCuratedSync) {
        for (const prob of FAMOUS_DSA_PROBLEMS) {
          const baseSlug = prob.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
          const slug = `${prob.id}-${baseSlug || 'problem'}`;
          await prisma.problem.upsert({
            where: { id: prob.id },
            update: {
              slug,
              title: prob.title,
              difficulty: prob.difficulty,
              topic: prob.topic,
              pattern: prob.pattern,
              statement: prob.statement,
              constraints: prob.constraints,
              examplesJson: JSON.stringify(prob.examples),
              functionSignature: prob.functionSignature,
              cppHarnessTemplate: prob.defaultCodeStub || null,
            },
            create: {
              id: prob.id,
              slug,
              title: prob.title,
              difficulty: prob.difficulty,
              category: prob.category,
              topic: prob.topic,
              pattern: prob.pattern,
              statement: prob.statement,
              constraints: prob.constraints,
              examplesJson: JSON.stringify(prob.examples),
              functionSignature: prob.functionSignature,
              cppHarnessTemplate: prob.defaultCodeStub || null,
            },
          });
        }
      }

      // Synchronize upgraded SQL 100 schemas, statements & worked examples when curriculum updates
      const sqlSentinel = existingCount >= totalTarget
        ? await prisma.problem.findUnique({ where: { id: 501 }, select: { slug: true, examplesJson: true } })
        : null;
      const firstSql = SQL_100_PROBLEMS[0];
      const expectedFirstSqlExamples = firstSql ? JSON.stringify(firstSql.examples) : '';
      const needsSqlSync =
        Boolean(firstSql) &&
        (existingCount < totalTarget ||
          sqlSentinel?.slug !== firstSql.slug ||
          sqlSentinel?.examplesJson !== expectedFirstSqlExamples);

      if (needsSqlSync) {
        for (const sqlProb of SQL_100_PROBLEMS) {
          await prisma.problem.upsert({
            where: { id: sqlProb.id },
            update: {
              slug: sqlProb.slug,
              title: sqlProb.title,
              difficulty: sqlProb.difficulty,
              topic: sqlProb.topic,
              pattern: sqlProb.pattern,
              statement: sqlProb.statement,
              constraints: sqlProb.constraints,
              examplesJson: JSON.stringify(sqlProb.examples),
              functionSignature: sqlProb.functionSignature,
              cppHarnessTemplate: sqlProb.defaultCodeStub || null,
            },
            create: {
              id: sqlProb.id,
              slug: sqlProb.slug,
              title: sqlProb.title,
              difficulty: sqlProb.difficulty,
              category: sqlProb.category,
              topic: sqlProb.topic,
              pattern: sqlProb.pattern,
              statement: sqlProb.statement,
              constraints: sqlProb.constraints,
              examplesJson: JSON.stringify(sqlProb.examples),
              functionSignature: sqlProb.functionSignature,
              cppHarnessTemplate: sqlProb.defaultCodeStub || null,
            },
          });
        }

        // Invalidate stale cached SQL reference lessons so updated expectedQuery regenerates on demand
        await prisma.aiLesson.deleteMany({
          where: { problemId: { gte: 501, lte: 600 } },
        });
      }

      const updatedCount = await prisma.problem.count();
      if (updatedCount >= totalTarget) {
        ProblemService.catalogReady = true;
      }
      Logger.info('ProblemService', `Curriculum questions synchronized into SQLite (${updatedCount} total).`);
    } catch (err) {
      Logger.error('ProblemService', 'Error during problem seeding', err);
    }
  }

  static async listProblems(userId: string, options: ProblemFilterOptions = {}) {
    if (!ProblemService.catalogReady) {
      const totalCount = await prisma.problem.count();
      if (totalCount < 600) {
        await ProblemService.seedInitialProblems();
      } else {
        ProblemService.catalogReady = true;
      }
    }

    const page = Math.max(1, options.page || 1);
    const pageSize = Math.max(1, options.pageSize || 30);
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = {};

    if (options.category) where.category = options.category;
    if (options.topic) where.topic = options.topic;
    if (options.difficulty) where.difficulty = options.difficulty;
    if (options.search) {
      where.OR = [
        { title: { contains: options.search } },
        { pattern: { contains: options.search } },
        { topic: { contains: options.search } },
      ];
    }

    const userSubmissions = await prisma.submission.findMany({
      where: { userId, verdict: 'Accepted' },
      select: { problemId: true },
      distinct: ['problemId'],
    });
    const solvedIds = userSubmissions.map((s) => s.problemId);
    const solvedSet = new Set(solvedIds);

    const statusLower = (options.status || '').toLowerCase();
    if (statusLower === 'solved') {
      where.id = { in: solvedIds };
    } else if (statusLower === 'unsolved') {
      if (solvedIds.length > 0) {
        where.id = { notIn: solvedIds };
      }
    } else if (statusLower === 'bookmarked' || statusLower === 'saved') {
      const bookmarkedIds = await UserProblemStateService.getBookmarkedProblemIds(userId);
      where.id = { in: bookmarkedIds };
    }

    const [total, problems] = await Promise.all([
      prisma.problem.count({ where }),
      prisma.problem.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { id: 'asc' },
        select: {
          id: true,
          slug: true,
          title: true,
          difficulty: true,
          category: true,
          topic: true,
          pattern: true,
          isBookmark: true,
          unlockedAiSolution: true,
          solvedWithAiHelp: true,
        },
      }),
    ]);

    const { stateMap, allowLegacy } = await UserProblemStateService.getStateMapForProblems(
      userId,
      problems.map((p) => p.id)
    );

    const enriched = problems.map((prob) => {
      const effective = UserProblemStateService.resolveEffectiveState(
        stateMap.get(prob.id),
        prob,
        allowLegacy
      );
      return {
        id: prob.id,
        slug: prob.slug,
        title: prob.title,
        difficulty: prob.difficulty,
        category: prob.category,
        topic: prob.topic,
        pattern: prob.pattern,
        isSolved: solvedSet.has(prob.id),
        isBookmark: effective.isBookmark,
        unlockedAiSolution: effective.unlockedAiSolution,
        solvedWithAiHelp: effective.solvedWithAiHelp,
      };
    });

    return {
      problems: enriched,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  static async getProblemById(id: number, userId: string) {
    const [problem, draft, submissions, lesson] = await Promise.all([
      prisma.problem.findUnique({
        where: { id },
      }),
      prisma.problemDraft.findUnique({
        where: {
          problemId_userId: {
            problemId: id,
            userId,
          },
        },
      }),
      prisma.submission.findMany({
        where: {
          problemId: id,
          userId,
        },
        orderBy: { submittedAt: 'desc' },
        take: 10,
      }),
      prisma.aiLesson.findUnique({
        where: { problemId: id },
      }),
    ]);

    if (!problem) return null;

    let examples = [];
    try {
      examples = JSON.parse(problem.examplesJson);
    } catch {
      examples = [];
    }

    // Find in memory definition for sample and hidden test cases, with fallback to examples
    const def = DSA_500_PROBLEMS.find((p) => p.id === id) || SQL_100_PROBLEMS.find((p) => p.id === id);

    const sampleTestCases =
      def?.sampleTestCases && def.sampleTestCases.length > 0
        ? def.sampleTestCases
        : examples.map((ex: { input?: string; output?: string }, idx: number) => ({
            id: idx + 1,
            input: ex.input || '',
            expectedOutput: ex.output || '',
          }));

    const isSolved = submissions.some((s) => s.verdict === 'Accepted');

    let expectedResult: Array<Record<string, unknown>> | undefined;
    if (def && 'expectedResultJson' in def && typeof def.expectedResultJson === 'string') {
      try {
        const parsed = JSON.parse(def.expectedResultJson);
        if (Array.isArray(parsed)) {
          expectedResult = parsed;
        }
      } catch {
        expectedResult = undefined;
      }
    }

    const effectiveState = await UserProblemStateService.getEffectiveState(id, userId, problem);

    return {
      ...problem,
      isBookmark: effectiveState.isBookmark,
      userNotes: effectiveState.userNotes,
      unlockedAiSolution: effectiveState.unlockedAiSolution,
      solvedWithAiHelp: effectiveState.solvedWithAiHelp,
      examples,
      schemaDdl: def && 'schemaDdl' in def ? def.schemaDdl : undefined,
      expectedResult,
      defaultCodeStub: problem.cppHarnessTemplate || def?.defaultCodeStub || '',
      userDraftCode: draft ? draft.code : null,
      sampleTestCases,
      isSolved,
      recentSubmissions: submissions,
      aiLesson: lesson || null,
    };
  }

  static async saveDraft(problemId: number, userId: string, code: string) {
    return prisma.problemDraft.upsert({
      where: {
        problemId_userId: {
          problemId,
          userId,
        },
      },
      update: { code },
      create: {
        problemId,
        userId,
        code,
      },
    });
  }

  static async toggleBookmark(problemId: number, userId: string) {
    return UserProblemStateService.toggleBookmark(problemId, userId);
  }

  static async saveNotes(problemId: number, userId: string, userNotes: string) {
    return UserProblemStateService.saveNotes(problemId, userId, userNotes);
  }
}
