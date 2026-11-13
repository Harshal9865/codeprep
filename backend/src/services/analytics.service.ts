import { prisma } from './prisma.service';
import { ProblemService } from './problem.service';
import { Logger } from '../utils/logger';

export interface HeatmapDay {
  date: string; // YYYY-MM-DD
  count: number;
  acceptedCount: number;
  level: number; // 0 (none), 1 (1-2), 2 (3-5), 3 (6-9), 4 (10+)
}

export interface TopicStat {
  topic: string;
  total: number;
  solved: number;
  accuracy: number; // percentage 0-100
}

export interface BadgeProgressItem {
  badgeKey: string;
  title: string;
  description: string;
  category: 'solved' | 'streak' | 'specialty';
  unlocked: boolean;
  unlockedAt: string | null;
  current: number;
  target: number;
}

export interface DashboardAnalytics {
  totalSolved: number;
  totalProblems: number;
  dsaSolved: number;
  dsaTotal: number;
  sqlSolved: number;
  sqlTotal: number;
  dailyProblemId: number;
  randomPoolIds: number[];
  easySolved: number;
  easyTotal: number;
  mediumSolved: number;
  mediumTotal: number;
  hardSolved: number;
  hardTotal: number;
  currentStreak: number;
  longestStreak: number;
  heatmap: HeatmapDay[];
  topicStats: TopicStat[];
  badges: BadgeProgressItem[];
  recentSubmissions: Array<{
    id: number;
    title: string;
    difficulty: string;
    verdict: string;
    submittedAt: string;
    runtimeMs: number | null;
  }>;
  recommendedProblem: {
    id: number;
    title: string;
    difficulty: string;
    topic: string;
    reason: string;
  } | null;
  revisionQueue: Array<{
    id: number;
    title: string;
    difficulty: string;
    topic: string;
    reason: 'solved_with_ai' | 'bookmarked';
    lastAttemptedAt: string | null;
  }>;
}

interface BadgeDefinition {
  badgeKey: string;
  title: string;
  description: string;
  category: 'solved' | 'streak' | 'specialty';
  target: number;
  evaluate: (m: { totalSolved: number; longestStreak: number; currentStreak: number; sqlSolved: number; hardSolved: number }) => number;
}

const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    badgeKey: 'first-solve',
    title: 'First Accepted',
    description: 'Solve your very first coding or SQL problem',
    category: 'solved',
    target: 1,
    evaluate: (m) => m.totalSolved,
  },
  {
    badgeKey: 'solved-10',
    title: 'Getting Started (10)',
    description: 'Solve 10 problems across DSA and SQL',
    category: 'solved',
    target: 10,
    evaluate: (m) => m.totalSolved,
  },
  {
    badgeKey: 'solved-25',
    title: 'Pattern Builder (25)',
    description: 'Solve 25 problems cleanly',
    category: 'solved',
    target: 25,
    evaluate: (m) => m.totalSolved,
  },
  {
    badgeKey: 'solved-50',
    title: 'Half-Century (50)',
    description: 'Solve 50 problems in your workspace',
    category: 'solved',
    target: 50,
    evaluate: (m) => m.totalSolved,
  },
  {
    badgeKey: 'solved-100',
    title: 'Centurion (100)',
    description: 'Reach 100 solved problems',
    category: 'solved',
    target: 100,
    evaluate: (m) => m.totalSolved,
  },
  {
    badgeKey: 'solved-250',
    title: 'Master Craftsman (250)',
    description: 'Solve 250 problems across curriculum sets',
    category: 'solved',
    target: 250,
    evaluate: (m) => m.totalSolved,
  },
  {
    badgeKey: 'streak-3',
    title: '3-Day Momentum',
    description: 'Maintain an active coding streak for 3 consecutive days',
    category: 'streak',
    target: 3,
    evaluate: (m) => Math.max(m.longestStreak, m.currentStreak),
  },
  {
    badgeKey: 'streak-7',
    title: '7-Day Week Warrior',
    description: 'Practice every day for a full 7-day week',
    category: 'streak',
    target: 7,
    evaluate: (m) => Math.max(m.longestStreak, m.currentStreak),
  },
  {
    badgeKey: 'streak-14',
    title: '14-Day Consistency',
    description: 'Keep a 14-day submission streak alive',
    category: 'streak',
    target: 14,
    evaluate: (m) => Math.max(m.longestStreak, m.currentStreak),
  },
  {
    badgeKey: 'streak-30',
    title: '30-Day Unstoppable',
    description: 'Reach a 30-day active coding streak',
    category: 'streak',
    target: 30,
    evaluate: (m) => Math.max(m.longestStreak, m.currentStreak),
  },
  {
    badgeKey: 'sql-10',
    title: 'Query Crafter (10 SQL)',
    description: 'Solve 10 SQL database problems',
    category: 'specialty',
    target: 10,
    evaluate: (m) => m.sqlSolved,
  },
  {
    badgeKey: 'hard-5',
    title: 'Hard Breaker (5 Hard)',
    description: 'Solve 5 Hard difficulty problems',
    category: 'specialty',
    target: 5,
    evaluate: (m) => m.hardSolved,
  },
];

export class AnalyticsService {
  /**
   * Retrieves full aggregated dashboard analytics for the single user
   */
  static async getDashboardAnalytics(userId: string): Promise<DashboardAnalytics> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { timezone: true },
    });

    const timezone = user?.timezone || 'Asia/Kolkata';

    // 1. Fetch all problems and user submissions in parallel
    let [allProblems, allSubmissions] = await Promise.all([
      prisma.problem.findMany({
        select: {
          id: true,
          title: true,
          difficulty: true,
          category: true,
          topic: true,
          isBookmark: true,
          solvedWithAiHelp: true,
        },
        orderBy: { id: 'asc' },
      }),
      prisma.submission.findMany({
        where: { userId },
        select: {
          id: true,
          problemId: true,
          verdict: true,
          submittedAt: true,
        },
        orderBy: { submittedAt: 'asc' },
      }),
    ]);

    if (allProblems.length < 600) {
      await ProblemService.seedInitialProblems();
      allProblems = await prisma.problem.findMany({
        select: {
          id: true,
          title: true,
          difficulty: true,
          category: true,
          topic: true,
          isBookmark: true,
          solvedWithAiHelp: true,
        },
        orderBy: { id: 'asc' },
      });
    }

    // Track which problems are solved
    const solvedProblemIds = new Set<number>();
    const lastAttemptMap = new Map<number, Date>();

    for (const sub of allSubmissions) {
      if (sub.verdict === 'Accepted') {
        solvedProblemIds.add(sub.problemId);
      }
      const existing = lastAttemptMap.get(sub.problemId);
      if (!existing || new Date(sub.submittedAt) > existing) {
        lastAttemptMap.set(sub.problemId, new Date(sub.submittedAt));
      }
    }

    // 2. Difficulty Breakdown
    let easyTotal = 0;
    let easySolved = 0;
    let mediumTotal = 0;
    let mediumSolved = 0;
    let hardTotal = 0;
    let hardSolved = 0;

    const topicMap = new Map<string, { total: number; solved: number; totalAttempts: number; acceptedAttempts: number }>();

    for (const prob of allProblems) {
      if (prob.difficulty === 'Easy') {
        easyTotal++;
        if (solvedProblemIds.has(prob.id)) easySolved++;
      } else if (prob.difficulty === 'Medium') {
        mediumTotal++;
        if (solvedProblemIds.has(prob.id)) mediumSolved++;
      } else if (prob.difficulty === 'Hard') {
        hardTotal++;
        if (solvedProblemIds.has(prob.id)) hardSolved++;
      }

      if (!topicMap.has(prob.topic)) {
        topicMap.set(prob.topic, { total: 0, solved: 0, totalAttempts: 0, acceptedAttempts: 0 });
      }
      const t = topicMap.get(prob.topic)!;
      t.total++;
      if (solvedProblemIds.has(prob.id)) {
        t.solved++;
      }
    }

    // Count attempts per topic for accuracy
    const problemToTopic = new Map<number, string>();
    for (const p of allProblems) {
      problemToTopic.set(p.id, p.topic);
    }

    for (const sub of allSubmissions) {
      const topic = problemToTopic.get(sub.problemId);
      if (topic && topicMap.has(topic)) {
        const t = topicMap.get(topic)!;
        t.totalAttempts++;
        if (sub.verdict === 'Accepted') {
          t.acceptedAttempts++;
        }
      }
    }

    const topicStats: TopicStat[] = Array.from(topicMap.entries()).map(([topic, data]) => {
      const accuracy = data.totalAttempts > 0
        ? Math.round((data.acceptedAttempts / data.totalAttempts) * 100)
        : 0;
      return {
        topic,
        total: data.total,
        solved: data.solved,
        accuracy,
      };
    });

    // 3. Compute 365-day Submission Heatmap (UTC-noon stepping avoids DST/midnight skips)
    const now = new Date();
    const todayStr = AnalyticsService.formatDateInTimezone(now, timezone);
    const [todayY, todayM, todayD] = todayStr.split('-').map((n) => parseInt(n, 10));
    const anchorNoonMs = Date.UTC(todayY, todayM - 1, todayD, 12, 0, 0);
    const heatmapMap = new Map<string, { count: number; acceptedCount: number }>();

    // Initialize 365 consecutive days ending today in user's timezone
    for (let i = 364; i >= 0; i--) {
      const d = new Date(anchorNoonMs - i * 86_400_000);
      const dateStr = d.toISOString().split('T')[0];
      heatmapMap.set(dateStr, { count: 0, acceptedCount: 0 });
    }

    // Populate submissions into heatmap
    for (const sub of allSubmissions) {
      const dateStr = AnalyticsService.formatDateInTimezone(new Date(sub.submittedAt), timezone);
      if (heatmapMap.has(dateStr)) {
        const item = heatmapMap.get(dateStr)!;
        item.count++;
        if (sub.verdict === 'Accepted') {
          item.acceptedCount++;
        }
      }
    }

    const heatmap: HeatmapDay[] = Array.from(heatmapMap.entries()).map(([date, item]) => {
      let level = 0;
      if (item.count >= 10) level = 4;
      else if (item.count >= 6) level = 3;
      else if (item.count >= 3) level = 2;
      else if (item.count >= 1) level = 1;

      return {
        date,
        count: item.count,
        acceptedCount: item.acceptedCount,
        level,
      };
    });

    // 4. Compute Streaks
    const { currentStreak, longestStreak } = AnalyticsService.calculateStreaks(heatmap);

    // 5. Recommended Next Problem
    // Find un-solved problems in topics where user has lowest accuracy or 0 solved
    const unsolvedProblems = allProblems.filter((p) => !solvedProblemIds.has(p.id));
    let recommended: DashboardAnalytics['recommendedProblem'] = null;

    if (unsolvedProblems.length > 0) {
      // Sort topics by solved count ascending, then accuracy
      const sortedTopics = [...topicStats].sort((a, b) => {
        if (a.solved !== b.solved) return a.solved - b.solved;
        return a.accuracy - b.accuracy;
      });

      let candidate = null;
      let reason = 'Next recommended problem to build core foundation';

      for (const t of sortedTopics) {
        // Look for Easy first, then Medium, then Hard in this topic
        const inTopic = unsolvedProblems.filter((p) => p.topic === t.topic);
        if (inTopic.length > 0) {
          candidate = inTopic.find((p) => p.difficulty === 'Easy') ||
            inTopic.find((p) => p.difficulty === 'Medium') ||
            inTopic[0];
          reason = `Strengthen your grasp on ${t.topic} (${t.solved}/${t.total} solved)`;
          break;
        }
      }

      if (!candidate) {
        candidate = unsolvedProblems[0];
      }

      recommended = {
        id: candidate.id,
        title: candidate.title,
        difficulty: candidate.difficulty,
        topic: candidate.topic,
        reason,
      };
    }

    // 6. Spaced Repetition Revision Queue
    // Items with solvedWithAiHelp = true OR isBookmark = true
    const revisionQueue: DashboardAnalytics['revisionQueue'] = allProblems
      .filter((p) => p.solvedWithAiHelp || p.isBookmark)
      .map((p) => {
        const lastDate = lastAttemptMap.get(p.id);
        return {
          id: p.id,
          title: p.title,
          difficulty: p.difficulty,
          topic: p.topic,
          reason: p.solvedWithAiHelp ? ('solved_with_ai' as const) : ('bookmarked' as const),
          lastAttemptedAt: lastDate ? lastDate.toISOString() : null,
        };
      })
      .slice(0, 10);

    // 7. Recent Submissions with problem details
    const recentSubmissionsList = await prisma.submission.findMany({
      where: { userId },
      orderBy: { submittedAt: 'desc' },
      take: 10,
      include: {
        problem: {
          select: { id: true, title: true, difficulty: true },
        },
      },
    });

    const recentSubmissions = recentSubmissionsList.map((s) => ({
      id: s.problemId,
      title: s.problem?.title || `Problem #${s.problemId}`,
      difficulty: s.problem?.difficulty || 'Medium',
      verdict: s.verdict,
      submittedAt: s.submittedAt.toISOString(),
      runtimeMs: s.runtimeMs,
    }));

    let dsaTotal = 0;
    let dsaSolved = 0;
    let sqlTotal = 0;
    let sqlSolved = 0;

    for (const prob of allProblems) {
      if (prob.category === 'SQL') {
        sqlTotal++;
        if (solvedProblemIds.has(prob.id)) sqlSolved++;
      } else {
        dsaTotal++;
        if (solvedProblemIds.has(prob.id)) dsaSolved++;
      }
    }

    const todayKey = AnalyticsService.formatDateInTimezone(now, timezone);
    let dateHash = 0;
    for (let i = 0; i < todayKey.length; i++) {
      dateHash = (dateHash * 31 + todayKey.charCodeAt(i)) | 0;
    }
    const dsaProblems = allProblems.filter((p) => p.category !== 'SQL');
    const dailyPool = dsaProblems.length > 0 ? dsaProblems : allProblems;
    const dailyProblemId =
      dailyPool.length > 0
        ? dailyPool[Math.abs(dateHash) % dailyPool.length].id
        : 1;

    const randomPoolSource =
      unsolvedProblems.length > 0 ? unsolvedProblems : allProblems;
    const randomPoolIds = randomPoolSource.map((p) => p.id);

    const badges = await AnalyticsService.reconcileBadges(userId, {
      totalSolved: solvedProblemIds.size,
      longestStreak,
      currentStreak,
      sqlSolved,
      hardSolved,
    });

    return {
      totalSolved: solvedProblemIds.size,
      totalProblems: allProblems.length,
      dsaSolved,
      dsaTotal,
      sqlSolved,
      sqlTotal,
      dailyProblemId,
      randomPoolIds,
      easySolved,
      easyTotal,
      mediumSolved,
      mediumTotal,
      hardSolved,
      hardTotal,
      currentStreak,
      longestStreak,
      heatmap,
      topicStats,
      badges,
      recentSubmissions,
      recommendedProblem: recommended,
      revisionQueue,
    };
  }

  /**
   * Synchronizes earned UserBadge rows directly in SQLite after submissions.
   */
  static async syncBadgesForUser(userId: string): Promise<BadgeProgressItem[]> {
    const analytics = await this.getDashboardAnalytics(userId);
    return analytics.badges;
  }

  private static async reconcileBadges(
    userId: string,
    metrics: {
      totalSolved: number;
      longestStreak: number;
      currentStreak: number;
      sqlSolved: number;
      hardSolved: number;
    }
  ): Promise<BadgeProgressItem[]> {
    const existingMap = new Map<string, Date>();
    try {
      const stored = await prisma.userBadge.findMany({
        where: { userId },
      });
      for (const row of stored) {
        existingMap.set(row.badgeKey, row.unlockedAt);
      }

      for (const def of BADGE_DEFINITIONS) {
        const val = def.evaluate(metrics);
        if (val >= def.target && !existingMap.has(def.badgeKey)) {
          const created = await prisma.userBadge.upsert({
            where: {
              userId_badgeKey: { userId, badgeKey: def.badgeKey },
            },
            update: {},
            create: {
              userId,
              badgeKey: def.badgeKey,
              title: def.title,
              description: def.description,
              category: def.category,
            },
          });
          existingMap.set(def.badgeKey, created.unlockedAt);
        }
      }
    } catch (err) {
      Logger.warn('AnalyticsService', 'Could not persist UserBadge records cleanly', err);
    }

    return BADGE_DEFINITIONS.map((def) => {
      const unlockedAt = existingMap.get(def.badgeKey) || null;
      const currentVal = def.evaluate(metrics);
      const isUnlocked = unlockedAt !== null || currentVal >= def.target;
      return {
        badgeKey: def.badgeKey,
        title: def.title,
        description: def.description,
        category: def.category,
        unlocked: isUnlocked,
        unlockedAt: unlockedAt ? unlockedAt.toISOString() : null,
        current: isUnlocked ? def.target : Math.min(currentVal, def.target),
        target: def.target,
      };
    });
  }

  /**
   * Helper to format a date in the user's specific timezone (YYYY-MM-DD)
   */
  private static formatDateInTimezone(date: Date, timezone: string): string {
    try {
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      return formatter.format(date); // outputs YYYY-MM-DD in en-CA
    } catch {
      return date.toISOString().split('T')[0];
    }
  }

  /**
   * Calculates current streak and longest streak from the heatmap
   */
  private static calculateStreaks(heatmap: HeatmapDay[]): { currentStreak: number; longestStreak: number } {
    let longestStreak = 0;
    let currentStreak = 0;
    let tempStreak = 0;

    for (let i = 0; i < heatmap.length; i++) {
      if (heatmap[i].count > 0) {
        tempStreak++;
        if (tempStreak > longestStreak) {
          longestStreak = tempStreak;
        }
      } else {
        tempStreak = 0;
      }
    }

    // Current streak: check from the last day backwards
    // If today (last element) has submissions, streak counts from today.
    // If today is 0, but yesterday had submissions, the streak is still active from yesterday.
    const lastIdx = heatmap.length - 1;
    if (lastIdx >= 0) {
      let checkIdx = lastIdx;
      if (heatmap[checkIdx].count === 0 && checkIdx > 0 && heatmap[checkIdx - 1].count > 0) {
        checkIdx = lastIdx - 1;
      }

      while (checkIdx >= 0 && heatmap[checkIdx].count > 0) {
        currentStreak++;
        checkIdx--;
      }
    }

    return { currentStreak, longestStreak };
  }
}

