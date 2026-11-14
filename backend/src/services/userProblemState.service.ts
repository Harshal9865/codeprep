import { prisma } from './prisma.service';

export interface EffectiveProblemState {
  isBookmark: boolean;
  userNotes: string | null;
  unlockedAiSolution: boolean;
  solvedWithAiHelp: boolean;
}

export interface LegacyProblemStateFields {
  isBookmark: boolean;
  userNotes?: string | null;
  unlockedAiSolution?: boolean;
  solvedWithAiHelp: boolean;
}

export class UserProblemStateService {
  /**
   * Identifies the original instance owner (earliest created user) so pre-existing
   * global Problem columns remain backward-compatible without leaking into secondary users.
   */
  static async isPrimaryOwner(userId: string): Promise<boolean> {
    if (!userId) return false;
    const primary = await prisma.user.findFirst({
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    return Boolean(primary && primary.id === userId);
  }

  static resolveEffectiveState(
    userState: Partial<EffectiveProblemState> | null | undefined,
    legacyProblem: LegacyProblemStateFields | null | undefined,
    allowLegacyFallback: boolean
  ): EffectiveProblemState {
    if (userState) {
      return {
        isBookmark: Boolean(userState.isBookmark),
        userNotes: userState.userNotes ?? null,
        unlockedAiSolution: Boolean(userState.unlockedAiSolution),
        solvedWithAiHelp: Boolean(userState.solvedWithAiHelp),
      };
    }

    if (allowLegacyFallback && legacyProblem) {
      return {
        isBookmark: Boolean(legacyProblem.isBookmark),
        userNotes: legacyProblem.userNotes ?? null,
        unlockedAiSolution: Boolean(legacyProblem.unlockedAiSolution),
        solvedWithAiHelp: Boolean(legacyProblem.solvedWithAiHelp),
      };
    }

    return {
      isBookmark: false,
      userNotes: null,
      unlockedAiSolution: false,
      solvedWithAiHelp: false,
    };
  }

  static async getStateMapForProblems(userId: string, problemIds?: number[]): Promise<{
    stateMap: Map<number, EffectiveProblemState>;
    allowLegacy: boolean;
  }> {
    if (!userId) {
      return { stateMap: new Map(), allowLegacy: false };
    }

    const [rows, allowLegacy] = await Promise.all([
      prisma.userProblemState.findMany({
        where: {
          userId,
          ...(problemIds && problemIds.length > 0 ? { problemId: { in: problemIds } } : {}),
        },
      }),
      this.isPrimaryOwner(userId),
    ]);

    const stateMap = new Map<number, EffectiveProblemState>();
    for (const row of rows) {
      stateMap.set(row.problemId, {
        isBookmark: row.isBookmark,
        userNotes: row.userNotes ?? null,
        unlockedAiSolution: row.unlockedAiSolution,
        solvedWithAiHelp: row.solvedWithAiHelp,
      });
    }

    return { stateMap, allowLegacy };
  }

  static async getBookmarkedProblemIds(userId: string): Promise<number[]> {
    if (!userId) return [];

    const { stateMap, allowLegacy } = await this.getStateMapForProblems(userId);
    const ids = new Set<number>();

    for (const [problemId, state] of stateMap.entries()) {
      if (state.isBookmark) {
        ids.add(problemId);
      }
    }

    if (allowLegacy) {
      const legacyBookmarked = await prisma.problem.findMany({
        where: { isBookmark: true },
        select: { id: true },
      });
      for (const prob of legacyBookmarked) {
        if (!stateMap.has(prob.id)) {
          ids.add(prob.id);
        }
      }
    }

    return Array.from(ids);
  }

  static async getEffectiveState(
    problemId: number,
    userId: string,
    legacyProblem?: LegacyProblemStateFields | null
  ): Promise<EffectiveProblemState> {
    const [userState, allowLegacy, problemRow] = await Promise.all([
      userId
        ? prisma.userProblemState.findUnique({
            where: { problemId_userId: { problemId, userId } },
          })
        : Promise.resolve(null),
      this.isPrimaryOwner(userId),
      legacyProblem
        ? Promise.resolve(legacyProblem)
        : prisma.problem.findUnique({
            where: { id: problemId },
            select: {
              isBookmark: true,
              userNotes: true,
              unlockedAiSolution: true,
              solvedWithAiHelp: true,
            },
          }),
    ]);

    return this.resolveEffectiveState(userState, problemRow, allowLegacy);
  }

  static async toggleBookmark(problemId: number, userId: string): Promise<EffectiveProblemState> {
    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
      select: {
        isBookmark: true,
        userNotes: true,
        unlockedAiSolution: true,
        solvedWithAiHelp: true,
      },
    });
    if (!problem) throw new Error('Problem not found');

    const current = await this.getEffectiveState(problemId, userId, problem);
    const nextBookmark = !current.isBookmark;

    const updated = await prisma.userProblemState.upsert({
      where: { problemId_userId: { problemId, userId } },
      update: { isBookmark: nextBookmark },
      create: {
        problemId,
        userId,
        isBookmark: nextBookmark,
        userNotes: current.userNotes,
        unlockedAiSolution: current.unlockedAiSolution,
        solvedWithAiHelp: current.solvedWithAiHelp,
      },
    });

    return {
      isBookmark: updated.isBookmark,
      userNotes: updated.userNotes ?? null,
      unlockedAiSolution: updated.unlockedAiSolution,
      solvedWithAiHelp: updated.solvedWithAiHelp,
    };
  }

  static async saveNotes(problemId: number, userId: string, userNotes: string): Promise<EffectiveProblemState> {
    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
      select: {
        isBookmark: true,
        userNotes: true,
        unlockedAiSolution: true,
        solvedWithAiHelp: true,
      },
    });
    if (!problem) throw new Error('Problem not found');

    const current = await this.getEffectiveState(problemId, userId, problem);

    const updated = await prisma.userProblemState.upsert({
      where: { problemId_userId: { problemId, userId } },
      update: { userNotes },
      create: {
        problemId,
        userId,
        isBookmark: current.isBookmark,
        userNotes,
        unlockedAiSolution: current.unlockedAiSolution,
        solvedWithAiHelp: current.solvedWithAiHelp,
      },
    });

    return {
      isBookmark: updated.isBookmark,
      userNotes: updated.userNotes ?? null,
      unlockedAiSolution: updated.unlockedAiSolution,
      solvedWithAiHelp: updated.solvedWithAiHelp,
    };
  }

  static async markAiUnlocked(
    problemId: number,
    userId: string,
    solvedWithAiHelp: boolean
  ): Promise<void> {
    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
      select: {
        isBookmark: true,
        userNotes: true,
        unlockedAiSolution: true,
        solvedWithAiHelp: true,
      },
    });
    if (!problem) return;

    const current = await this.getEffectiveState(problemId, userId, problem);

    await prisma.userProblemState.upsert({
      where: { problemId_userId: { problemId, userId } },
      update: {
        unlockedAiSolution: true,
        solvedWithAiHelp,
      },
      create: {
        problemId,
        userId,
        isBookmark: current.isBookmark,
        userNotes: current.userNotes,
        unlockedAiSolution: true,
        solvedWithAiHelp,
      },
    });
  }
}

