import { prisma } from './prisma.service';
import { DSA_500_PROBLEMS } from '../data/dsa500';
import { SQL_100_PROBLEMS } from '../data/sql100';
import { Logger } from '../utils/logger';
import { UserProblemStateService } from './userProblemState.service';
import { enrichProblemDetails } from './problemEnricher';

export interface ProblemFilterOptions {
  category?: string;
  topic?: string;
  difficulty?: string;
  status?: string; // 'solved' | 'unsolved' | 'ai-solved' | 'bookmarked'
  search?: string;
  track?: string;
  shuffleSeed?: number;
  includeMeta?: boolean;
  page?: number;
  pageSize?: number;
}

const PREP_SET_SLUGS: Record<string, string[]> = {
  'top-interview-classics': [
    'two-sum', 'contains-duplicate', 'valid-anagram', 'valid-palindrome',
    'best-time-to-buy-and-sell-stock', 'maximum-subarray', 'valid-parentheses',
    'longest-substring-without-repeating-characters', 'merge-intervals',
    'search-in-rotated-sorted-array', 'find-minimum-in-rotated-sorted-array',
    'number-of-islands', 'course-schedule', 'coin-change',
    'longest-increasing-subsequence', 'word-break', 'subsets',
    'kth-largest-element-in-an-array',
  ],
  'arrays-window-stack': [
    'two-sum', 'contains-duplicate', 'trapping-rain-water',
    'longest-substring-without-repeating-characters',
    'longest-repeating-character-replacement', 'minimum-window-substring',
    'sliding-window-maximum', 'merge-intervals', 'rotate-image',
    'generate-parentheses', 'daily-temperatures', 'largest-rectangle-in-histogram',
  ],
  'graphs-trees-dp': [
    'search-in-rotated-sorted-array', 'find-minimum-in-rotated-sorted-array',
    'koko-eating-bananas', 'kth-largest-element-in-an-array',
    'number-of-islands', 'rotting-oranges', 'course-schedule', 'word-ladder',
    'detect-cycle-in-undirected-graph-gfg', 'coin-change',
    'longest-increasing-subsequence', 'word-break', 'edit-distance',
    '0-1-knapsack-problem-gfg',
  ],
  'backtracking-greedy': [
    'subsets', 'combination-sum', 'word-search', 'generate-parentheses',
    'the-celebrity-problem-gfg', 'job-sequencing-problem-gfg',
  ],
};

function matchesSlugTail(slug: string, title: string, candidates: string[]): boolean {
  const s = slug.toLowerCase();
  const t = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return candidates.some((c) => s === c || s.endsWith(`-${c}`) || t.includes(c));
}

function matchesPrepSet(
  setId: string,
  p: { id: number; slug: string; title: string; category: string; topic: string }
): boolean {
  if (setId === 'top-interview-classics') {
    return matchesSlugTail(p.slug, p.title, PREP_SET_SLUGS['top-interview-classics']);
  }
  if (setId === 'arrays-window-stack') {
    return (
      matchesSlugTail(p.slug, p.title, PREP_SET_SLUGS['arrays-window-stack']) ||
      (p.category === 'DSA' &&
        (p.topic === 'Sliding Window' || p.topic === 'Stack and Queues') &&
        p.id <= 60)
    );
  }
  if (setId === 'graphs-trees-dp') {
    return (
      matchesSlugTail(p.slug, p.title, PREP_SET_SLUGS['graphs-trees-dp']) ||
      (p.category === 'DSA' &&
        (p.topic === 'Graphs' || p.topic === '1-D Dynamic Programming') &&
        p.id <= 125)
    );
  }
  if (setId === 'backtracking-greedy') {
    return (
      matchesSlugTail(p.slug, p.title, PREP_SET_SLUGS['backtracking-greedy']) ||
      (p.category === 'DSA' &&
        (p.topic === 'Backtracking' || p.topic === 'Greedy' || p.topic === 'Heap and Priority Queue') &&
        p.id <= 140)
    );
  }
  if (setId === 'core-600' || setId === 'core600') {
    return p.id >= 1 && p.id <= 600;
  }
  if (setId === 'core-dsa-500') {
    return p.id >= 1 && p.id <= 500;
  }
  if (setId === 'core-sql-100') {
    return p.id >= 501 && p.id <= 600;
  }
  if (setId === 'extended' || setId === 'extended-all') {
    return p.id > 600;
  }
  if (setId === 'blind75-ladder') {
    return p.category === 'DSA' && p.id >= 1 && p.id <= 75;
  }
  if (setId === 'sql-interview-50') {
    return p.category === 'SQL' && p.id >= 501 && p.id <= 550;
  }
  return false;
}

function shuffleIdsWithSeed(ids: number[], seed: number): number[] {
  const copy = [...ids];
  let s = seed >>> 0 || 1;
  for (let i = copy.length - 1; i > 0; i--) {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    const j = s % (i + 1);
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}

export class ProblemService {
  private static seedingPromise: Promise<void> | null = null;
  private static catalogReady = false;
  private static catalogMetaCache: Array<{
    id: number;
    slug: string;
    title: string;
    difficulty: string;
    category: string;
    topic: string;
    pattern: string;
  }> | null = null;

  static getTargetCatalogSize(): number {
    return DSA_500_PROBLEMS.length + SQL_100_PROBLEMS.length;
  }

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
        const existingRows =
          existingCount > 0
            ? await prisma.problem.findMany({ select: { id: true } })
            : [];
        const existingIdSet = new Set(existingRows.map((row) => row.id));
        const missingRecords = allRecords.filter((rec) => !existingIdSet.has(rec.id));

        // Insert missing problems in safe chunks of 50 records to balance speed and SQLite bind limits
        const CHUNK_SIZE = 50;
        for (let i = 0; i < missingRecords.length; i += CHUNK_SIZE) {
          const chunk = missingRecords.slice(i, i + CHUNK_SIZE);
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

      // Synchronize upgraded LeetCode-style batch descriptions & worked examples for problems 26..500
      const batchSentinel31 = existingCount >= totalTarget
        ? await prisma.problem.findUnique({ where: { id: 31 }, select: { statement: true, examplesJson: true } })
        : null;
      const expected31 = DSA_500_PROBLEMS.find((p) => p.id === 31);
      const needsBatchSync =
        Boolean(expected31) &&
        existingCount >= totalTarget &&
        (batchSentinel31?.statement !== expected31!.statement ||
          batchSentinel31?.examplesJson !== JSON.stringify(expected31!.examples));

      if (needsBatchSync) {
        const batchProblemsToSync = DSA_500_PROBLEMS.filter((p) => p.id >= 21 && p.id <= 500);
        for (const prob of batchProblemsToSync) {
          await prisma.problem.upsert({
            where: { id: prob.id },
            update: {
              slug: prob.slug,
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

      // Synchronize Very Easy Logic Building DSA additions (IDs 601+) without altering existing problems 1..600
      const logicSentinel = await prisma.problem.findUnique({ where: { id: 601 }, select: { id: true } });
      if (existingCount < totalTarget || !logicSentinel) {
        const logicEasyProblems = DSA_500_PROBLEMS.filter((p) => p.id >= 601);
        for (const prob of logicEasyProblems) {
          await prisma.problem.upsert({
            where: { id: prob.id },
            update: {
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
            },
            create: {
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
            },
          });
        }
      }

      const updatedCount = await prisma.problem.count();
      if (updatedCount >= totalTarget) {
        ProblemService.catalogReady = true;
      }
      ProblemService.catalogMetaCache = null;
      Logger.info('ProblemService', `Curriculum questions synchronized into SQLite (${updatedCount} total).`);
    } catch (err) {
      Logger.error('ProblemService', 'Error during problem seeding', err);
    }
  }

  private static async getCatalogMetadata() {
    if (ProblemService.catalogMetaCache && ProblemService.catalogMetaCache.length >= ProblemService.getTargetCatalogSize()) {
      return ProblemService.catalogMetaCache;
    }
    const rows = await prisma.problem.findMany({
      select: {
        id: true,
        slug: true,
        title: true,
        difficulty: true,
        category: true,
        topic: true,
        pattern: true,
      },
      orderBy: { id: 'asc' },
    });
    if (rows.length >= ProblemService.getTargetCatalogSize()) {
      ProblemService.catalogMetaCache = rows;
    }
    return rows;
  }

  static async listProblems(userId: string, options: ProblemFilterOptions = {}) {
    if (!ProblemService.catalogReady) {
      const totalCount = await prisma.problem.count();
      if (totalCount < ProblemService.getTargetCatalogSize()) {
        await ProblemService.seedInitialProblems();
      } else {
        ProblemService.catalogReady = true;
      }
    }

    const page = Math.max(1, options.page || 1);
    const pageSize = Math.min(200, Math.max(1, options.pageSize || 30));
    const skip = (page - 1) * pageSize;

    const statusLower = (options.status || '').toLowerCase();
    const [catalog, userSubmissions, bookmarkedIds] = await Promise.all([
      ProblemService.getCatalogMetadata(),
      prisma.submission.findMany({
        where: { userId, verdict: 'Accepted' },
        select: { problemId: true },
        distinct: ['problemId'],
      }),
      statusLower === 'bookmarked' || statusLower === 'saved'
        ? UserProblemStateService.getBookmarkedProblemIds(userId)
        : Promise.resolve([] as number[]),
    ]);

    const solvedSet = new Set(userSubmissions.map((s) => s.problemId));
    const bookmarkedSet = new Set(bookmarkedIds);

    const catFilter = (options.category || '').trim().toUpperCase();
    const trackFilter = (options.track || '').trim().toLowerCase();
    const diffFilter = (options.difficulty || '').trim().toLowerCase();
    const topicFilter = (options.topic || '').trim().toLowerCase();
    const searchQ = (options.search || '').trim().toLowerCase();

    const filtered = catalog.filter((p) => {
      if (catFilter && catFilter !== 'ALL' && p.category.toUpperCase() !== catFilter) {
        return false;
      }

      if (trackFilter && trackFilter !== 'all') {
        if (trackFilter === 'core-600' || trackFilter === 'core600') {
          if (p.id < 1 || p.id > 600) return false;
        } else if (trackFilter === 'core-dsa-500') {
          if (p.id < 1 || p.id > 500) return false;
        } else if (trackFilter === 'core-sql-100') {
          if (p.id < 501 || p.id > 600) return false;
        } else if (trackFilter === 'extended' || trackFilter === 'extended-all') {
          if (p.id <= 600) return false;
        } else if (trackFilter === 'database' || trackFilter === 'sql') {
          if (p.category !== 'SQL') return false;
        } else if (trackFilter === 'algorithms' || trackFilter === 'dsa') {
          if (p.category !== 'DSA') return false;
        } else if (trackFilter === 'oop' || trackFilter === 'oops') {
          if (p.category !== 'OOP') return false;
        } else if (trackFilter === 'logic-easy') {
          if (p.topic !== 'Logic Building' && !(p.id >= 601 && p.id <= 630)) return false;
        } else if (trackFilter === 'blind75') {
          if (p.id > 75) return false;
        } else if (trackFilter === 'neetcode150') {
          if (p.id > 150) return false;
        } else if (trackFilter === 'gfg') {
          if (p.id < 100 || p.id > 250) return false;
        } else if (!matchesPrepSet(trackFilter, p)) {
          return false;
        }
      }

      if (diffFilter && diffFilter !== 'all' && p.difficulty.toLowerCase() !== diffFilter) {
        return false;
      }

      if (topicFilter && topicFilter !== 'all') {
        if (
          !p.topic.toLowerCase().includes(topicFilter) &&
          !p.pattern.toLowerCase().includes(topicFilter)
        ) {
          return false;
        }
      }

      if (statusLower === 'solved' && !solvedSet.has(p.id)) return false;
      if (statusLower === 'unsolved' && solvedSet.has(p.id)) return false;
      if ((statusLower === 'bookmarked' || statusLower === 'saved') && !bookmarkedSet.has(p.id)) {
        return false;
      }

      if (searchQ) {
        const cleanNumQ = searchQ.startsWith('#') ? searchQ.slice(1) : searchQ;
        const hit =
          p.title.toLowerCase().includes(searchQ) ||
          p.topic.toLowerCase().includes(searchQ) ||
          p.pattern.toLowerCase().includes(searchQ) ||
          (cleanNumQ.length > 0 && String(p.id).includes(cleanNumQ));
        if (!hit) return false;
      }

      return true;
    });

    const total = filtered.length;
    let filteredSolvedCount = 0;
    for (const p of filtered) {
      if (solvedSet.has(p.id)) filteredSolvedCount++;
    }

    const orderedIds =
      options.shuffleSeed && options.shuffleSeed > 0
        ? shuffleIdsWithSeed(
            filtered.map((p) => p.id),
            options.shuffleSeed
          )
        : filtered.map((p) => p.id);

    const pageIds = orderedIds.slice(skip, skip + pageSize);
    const metaById = new Map(filtered.map((p) => [p.id, p]));

    const { stateMap, allowLegacy } = await UserProblemStateService.getStateMapForProblems(
      userId,
      pageIds
    );

    // Fetch legacy columns only for the 30 visible page rows if legacy fallback applies
    const dbPageRows =
      pageIds.length > 0 && allowLegacy
        ? await prisma.problem.findMany({
            where: { id: { in: pageIds } },
            select: {
              id: true,
              isBookmark: true,
              unlockedAiSolution: true,
              solvedWithAiHelp: true,
            },
          })
        : [];
    const legacyRowMap = new Map(dbPageRows.map((r) => [r.id, r]));

    const enriched = pageIds
      .map((id) => metaById.get(id))
      .filter((p): p is NonNullable<typeof p> => Boolean(p))
      .map((prob) => {
        const legacy = legacyRowMap.get(prob.id) || {
          isBookmark: false,
          unlockedAiSolution: false,
          solvedWithAiHelp: false,
        };
        const effective = UserProblemStateService.resolveEffectiveState(
          stateMap.get(prob.id),
          legacy,
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

    let meta: Record<string, unknown> | undefined;
    if (options.includeMeta) {
      let dsaTotal = 0;
      let dsaSolved = 0;
      let sqlTotal = 0;
      let sqlSolved = 0;
      let oopTotal = 0;
      let oopSolved = 0;
      let easyTotal = 0;
      let mediumTotal = 0;
      let hardTotal = 0;
      const topicCounts: Record<string, number> = {};
      const prepCounts: Record<string, { total: number; solved: number }> = {
        'core-600': { total: 0, solved: 0 },
        'top-interview-classics': { total: 0, solved: 0 },
        'arrays-window-stack': { total: 0, solved: 0 },
        'graphs-trees-dp': { total: 0, solved: 0 },
        'backtracking-greedy': { total: 0, solved: 0 },
      };

      let core600Total = 0;
      let core600Solved = 0;
      let core600DsaTotal = 0;
      let core600DsaSolved = 0;
      let core600SqlTotal = 0;
      let core600SqlSolved = 0;
      let core600NextUnsolvedId: number | null = null;
      let core600NextDsaId: number | null = null;
      let core600NextSqlId: number | null = null;

      for (const p of catalog) {
        const isSolved = solvedSet.has(p.id);
        if (p.category === 'SQL') {
          sqlTotal++;
          if (isSolved) sqlSolved++;
        } else if (p.category === 'OOP') {
          oopTotal++;
          if (isSolved) oopSolved++;
        } else {
          dsaTotal++;
          if (isSolved) dsaSolved++;
        }

        if (p.id >= 1 && p.id <= 600) {
          core600Total++;
          if (isSolved) core600Solved++;
          else if (core600NextUnsolvedId === null) core600NextUnsolvedId = p.id;

          if (p.id <= 500) {
            core600DsaTotal++;
            if (isSolved) core600DsaSolved++;
            else if (core600NextDsaId === null) core600NextDsaId = p.id;
          } else {
            core600SqlTotal++;
            if (isSolved) core600SqlSolved++;
            else if (core600NextSqlId === null) core600NextSqlId = p.id;
          }
        }

        if (!catFilter || catFilter === 'ALL' || p.category.toUpperCase() === catFilter) {
          topicCounts[p.topic] = (topicCounts[p.topic] || 0) + 1;
          if (p.difficulty === 'Easy') easyTotal++;
          else if (p.difficulty === 'Medium') mediumTotal++;
          else if (p.difficulty === 'Hard') hardTotal++;
        }

        for (const key of Object.keys(prepCounts)) {
          if (matchesPrepSet(key, p)) {
            prepCounts[key].total++;
            if (isSolved) prepCounts[key].solved++;
          }
        }
      }

      const randomMatchId =
        orderedIds.length > 0
          ? orderedIds[Math.floor(Math.random() * orderedIds.length)]
          : null;

      meta = {
        totalProblems: catalog.length,
        dsaTotal,
        sqlTotal,
        oopTotal,
        totalSolved: solvedSet.size,
        dsaSolved,
        sqlSolved,
        oopSolved,
        filteredSolvedCount,
        difficultyTotals: { Easy: easyTotal, Medium: mediumTotal, Hard: hardTotal },
        topicCounts,
        prepCounts,
        core600: {
          total: core600Total,
          solved: core600Solved,
          dsaTotal: core600DsaTotal,
          dsaSolved: core600DsaSolved,
          sqlTotal: core600SqlTotal,
          sqlSolved: core600SqlSolved,
          nextUnsolvedId: core600NextUnsolvedId ?? 1,
          nextDsaId: core600NextDsaId ?? 1,
          nextSqlId: core600NextSqlId ?? 501,
        },
        randomMatchId,
      };
    }

    return {
      problems: enriched,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
      ...(meta ? { meta } : {}),
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

    let dbExamples = [];
    try {
      dbExamples = JSON.parse(problem.examplesJson);
    } catch {
      dbExamples = [];
    }

    // Find in memory definition for sample/hidden test cases and up-to-date LeetCode specification
    const def = DSA_500_PROBLEMS.find((p) => p.id === id) || SQL_100_PROBLEMS.find((p) => p.id === id);
    const examples =
      def?.examples && def.examples.length > 0
        ? def.examples
        : dbExamples;

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

    const similarProblems = await prisma.problem.findMany({
      where: {
        topic: problem.topic,
        category: problem.category,
        id: { not: id },
      },
      select: {
        id: true,
        title: true,
        difficulty: true,
      },
      orderBy: { id: 'asc' },
      take: 4,
    });

    const effectiveStatement = def?.statement || problem.statement;
    const effectiveConstraints = def?.constraints || problem.constraints;
    const effectivePattern = def?.pattern || problem.pattern;
    const effectiveSignature = def?.functionSignature || problem.functionSignature;

    const enrichedDetails = enrichProblemDetails({
      id: problem.id,
      slug: problem.slug,
      title: problem.title,
      category: problem.category,
      topic: problem.topic,
      pattern: effectivePattern,
      constraints: effectiveConstraints,
      functionSignature: effectiveSignature,
    });

    return {
      ...problem,
      statement: effectiveStatement,
      constraints: effectiveConstraints,
      pattern: effectivePattern,
      functionSignature: effectiveSignature,
      isBookmark: effectiveState.isBookmark,
      userNotes: effectiveState.userNotes,
      unlockedAiSolution: effectiveState.unlockedAiSolution,
      solvedWithAiHelp: effectiveState.solvedWithAiHelp,
      examples,
      schemaDdl: def && 'schemaDdl' in def ? def.schemaDdl : undefined,
      expectedResult,
      defaultCodeStub: def?.defaultCodeStub || problem.cppHarnessTemplate || '',
      userDraftCode: draft ? draft.code : null,
      sampleTestCases,
      similarProblems,
      isSolved,
      recentSubmissions: submissions,
      aiLesson: lesson || null,
      ...enrichedDetails,
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
