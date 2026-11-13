import { prisma } from './prisma.service';
import { env } from '../config/env';
import fs from 'fs';
import os from 'os';

export interface ComponentHealth {
  status: 'healthy' | 'degraded' | 'down';
  message: string;
  latencyMs?: number;
  details?: Record<string, unknown>;
}

export interface SystemHealthReport {
  overallStatus: 'healthy' | 'degraded' | 'down';
  timestamp: string;
  uptimeSeconds: number;
  memory: {
    usedRssMb: number;
    heapUsedMb: number;
    systemFreeMb: number;
    systemTotalMb: number;
  };
  components: {
    database: ComponentHealth;
    aiProvider: ComponentHealth;
    dockerSandbox: ComponentHealth;
    fileStorage: ComponentHealth;
  };
}

export class HealthService {
  static async checkHealth(): Promise<SystemHealthReport> {
    const startTime = Date.now();

    // 1. Check SQLite Database
    let dbHealth: ComponentHealth;
    try {
      const dbStart = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      const dbLatency = Date.now() - dbStart;
      dbHealth = {
        status: 'healthy',
        message: 'SQLite database connection verified and responsive.',
        latencyMs: dbLatency,
      };
    } catch (error) {
      dbHealth = {
        status: 'down',
        message: error instanceof Error ? error.message : 'Database query failed.',
      };
    }

    // 2. Check AI Configuration
    let aiHealth: ComponentHealth;
    if (!env.AI_API_KEY || env.AI_API_KEY.trim() === '') {
      aiHealth = {
        status: 'degraded',
        message: 'AI API key is not configured in .env. AI hints and solutions will be unavailable.',
        details: { provider: env.AI_PROVIDER, model: env.AI_MODEL_NAME },
      };
    } else {
      aiHealth = {
        status: 'healthy',
        message: `AI provider (${env.AI_PROVIDER}) configured with model ${env.AI_MODEL_NAME}.`,
        details: { provider: env.AI_PROVIDER, model: env.AI_MODEL_NAME },
      };
    }

    // 3. Check Docker / Sandbox environment
    let sandboxHealth: ComponentHealth;
    const dockerSocketPath = process.platform === 'win32' ? '//./pipe/docker_engine' : '/var/run/docker.sock';
    const dockerSocketExists = fs.existsSync(dockerSocketPath);

    if (dockerSocketExists) {
      sandboxHealth = {
        status: 'healthy',
        message: 'Docker daemon communication pipe detected. Sandbox runner ready.',
        details: { type: env.SANDBOX_TYPE, socket: dockerSocketPath },
      };
    } else {
      // In local development or before Docker Desktop is started
      sandboxHealth = {
        status: 'degraded',
        message: 'Docker daemon pipe not currently detected. Docker Desktop may not be started yet.',
        details: {
          type: env.SANDBOX_TYPE,
          expectedPath: dockerSocketPath,
          recommendation: 'Start Docker Desktop with WSL 2 backend enabled.',
        },
      };
    }

    // 4. Check File Storage
    let storageHealth: ComponentHealth;
    try {
      const uploadsDir = './data';
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      storageHealth = {
        status: 'healthy',
        message: 'Local application data storage writable.',
      };
    } catch (error) {
      storageHealth = {
        status: 'degraded',
        message: error instanceof Error ? error.message : 'Storage directory inaccessible.',
      };
    }

    // Determine overall status
    let overallStatus: 'healthy' | 'degraded' | 'down' = 'healthy';
    if (dbHealth.status === 'down') {
      overallStatus = 'down';
    } else if (
      aiHealth.status === 'degraded' ||
      sandboxHealth.status === 'degraded' ||
      storageHealth.status === 'degraded'
    ) {
      overallStatus = 'degraded';
    }

    const mem = process.memoryUsage();
    return {
      overallStatus,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      memory: {
        usedRssMb: Math.round(mem.rss / 1024 / 1024),
        heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
        systemFreeMb: Math.round(os.freemem() / 1024 / 1024),
        systemTotalMb: Math.round(os.totalmem() / 1024 / 1024),
      },
      components: {
        database: dbHealth,
        aiProvider: aiHealth,
        dockerSandbox: sandboxHealth,
        fileStorage: storageHealth,
      },
    };
  }
}

