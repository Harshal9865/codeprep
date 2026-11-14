import { prisma } from './prisma.service';
import { TIMER_CONFIG } from '../config/timer.config';
import { Logger } from '../utils/logger';
import { UserProblemStateService } from './userProblemState.service';

export interface TimerStatus {
  problemId: number;
  activeSeconds: number;
  isPaused: boolean;
  isUnlocked: boolean;
  thresholdSeconds: number;
  remainingSeconds: number;
  isSolved: boolean;
  solvedWithAiHelp: boolean;
}

export class TimerService {
  /**
   * Records active time heartbeat from client.
   * Server-authoritative: client cannot increment time directly; elapsed time is computed
   * strictly from server timestamps and capped at MAX_HEARTBEAT_GAP_SECONDS.
   */
  static async recordHeartbeat(
    problemId: number,
    userId: string,
    isActive: boolean
  ): Promise<TimerStatus> {
    const now = new Date();

    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
      include: {
        submissions: {
          where: { userId, verdict: 'Accepted' },
          select: { id: true },
        },
      },
    });

    if (!problem) {
      throw new Error(`Problem #${problemId} does not exist.`);
    }

    const isSolved = problem.submissions.length > 0;
    const thresholdSeconds =
      TIMER_CONFIG.UNLOCK_THRESHOLDS[problem.difficulty] || TIMER_CONFIG.UNLOCK_THRESHOLDS.Medium;

    let timer = await prisma.problemActiveTimer.findUnique({
      where: { problemId_userId: { problemId, userId } },
    });

    if (!timer) {
      timer = await prisma.problemActiveTimer.create({
        data: {
          problemId,
          userId,
          activeSeconds: 0,
          lastHeartbeat: now,
          isPaused: !isActive,
        },
      });
    } else {
      let increment = 0;
      if (isActive && !timer.isPaused) {
        const deltaSeconds = Math.floor((now.getTime() - timer.lastHeartbeat.getTime()) / 1000);
        // Only credit time if delta is reasonable (client stayed alive and didn't sleep/jump clock)
        if (deltaSeconds > 0 && deltaSeconds <= TIMER_CONFIG.MAX_HEARTBEAT_GAP_SECONDS) {
          increment = deltaSeconds;
        }
      }

      timer = await prisma.problemActiveTimer.update({
        where: { id: timer.id },
        data: {
          activeSeconds: timer.activeSeconds + increment,
          lastHeartbeat: now,
          isPaused: !isActive,
        },
      });
    }

    const effectiveState = await UserProblemStateService.getEffectiveState(problemId, userId, problem);
    const isUnlocked =
      isSolved || timer.activeSeconds >= thresholdSeconds || effectiveState.unlockedAiSolution;
    const remainingSeconds = Math.max(0, thresholdSeconds - timer.activeSeconds);

    return {
      problemId,
      activeSeconds: timer.activeSeconds,
      isPaused: timer.isPaused,
      isUnlocked,
      thresholdSeconds,
      remainingSeconds,
      isSolved,
      solvedWithAiHelp: effectiveState.solvedWithAiHelp,
    };
  }

  static async getStatus(problemId: number, userId: string): Promise<TimerStatus> {
    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
      include: {
        submissions: {
          where: { userId, verdict: 'Accepted' },
          select: { id: true },
        },
        timers: {
          where: { userId },
        },
      },
    });

    if (!problem) {
      throw new Error(`Problem #${problemId} not found.`);
    }

    const isSolved = problem.submissions.length > 0;
    const thresholdSeconds =
      TIMER_CONFIG.UNLOCK_THRESHOLDS[problem.difficulty] || TIMER_CONFIG.UNLOCK_THRESHOLDS.Medium;

    const timer = problem.timers[0];
    const activeSeconds = timer ? timer.activeSeconds : 0;
    const isPaused = timer ? timer.isPaused : true;

    const effectiveState = await UserProblemStateService.getEffectiveState(problemId, userId, problem);
    const isUnlocked = isSolved || activeSeconds >= thresholdSeconds || effectiveState.unlockedAiSolution;
    const remainingSeconds = Math.max(0, thresholdSeconds - activeSeconds);

    return {
      problemId,
      activeSeconds,
      isPaused,
      isUnlocked,
      thresholdSeconds,
      remainingSeconds,
      isSolved,
      solvedWithAiHelp: effectiveState.solvedWithAiHelp,
    };
  }

  static async unlockAiSolution(problemId: number, userId: string): Promise<void> {
    const status = await this.getStatus(problemId, userId);

    await UserProblemStateService.markAiUnlocked(problemId, userId, !status.isSolved);

    Logger.info('TimerService', 'Reference solution unlocked for problem', {
      problemId,
      userId,
      unlockedEarly: !status.isSolved,
    });
  }
}

