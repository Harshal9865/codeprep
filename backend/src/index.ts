import express, { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { configureSecurityHeaders, configureCors } from './middleware/security';
import { apiLimiter } from './middleware/rateLimiter';
import { connectPrisma, disconnectPrisma } from './services/prisma.service';
import { Logger } from './utils/logger';

import authRoutes from './routes/auth.routes';
import healthRoutes from './routes/health.routes';
import problemsRoutes from './routes/problems.routes';
import submissionsRoutes from './routes/submissions.routes';
import aiRoutes from './routes/ai.routes';
import userRoutes from './routes/user.routes';
import analyticsRoutes from './routes/analytics.routes';
import { ProblemService } from './services/problem.service';
import { LessonService } from './services/lesson.service';
import { AuthService } from './services/auth.service';
import { SandboxRunner } from './judge/sandboxRunner';
import { SqlRunner } from './judge/sqlRunner';
import fs from 'fs';
import path from 'path';

const app = express();

if (env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Security and parser middlewares
app.use(configureSecurityHeaders);
app.use(configureCors);
app.use(cookieParser(env.COOKIE_SECRET));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Static uploads serving with safe headers (colocate with persistent DB disk in production)
const configuredSqliteFile = (process.env.DATABASE_URL || '').trim().startsWith('file:')
  ? (process.env.DATABASE_URL || '').trim().slice(5).split('?')[0]
  : '';
const uploadsRootDir = process.env.UPLOADS_DIR?.trim()
  ? path.resolve(process.env.UPLOADS_DIR.trim())
  : configuredSqliteFile &&
    configuredSqliteFile !== ':memory:' &&
    path.isAbsolute(configuredSqliteFile) &&
    !path.normalize(configuredSqliteFile).startsWith(path.resolve(process.cwd()))
    ? path.join(path.dirname(path.normalize(configuredSqliteFile)), 'uploads')
    : path.resolve(process.cwd(), 'uploads');

app.use('/uploads', express.static(uploadsRootDir, {
  dotfiles: 'ignore',
  index: false,
  maxAge: '7d',
}));

// Global rate limiting on API endpoints
app.use('/api', apiLimiter);

// Route registrations
app.use('/api/auth', authRoutes);
app.use('/api/problems', problemsRoutes);
app.use('/api/submissions', submissionsRoutes);
app.use('/api/study', aiRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/user', userRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/health', healthRoutes);
app.use('/api/health', healthRoutes);

// 404 handler for undefined API routes
app.use('/api/*', (_req: Request, res: Response) => {
  res.status(404).json({ error: 'Endpoint not found on this instance.' });
});

// Serve built frontend bundle in production when present (single-container / VPS mode)
if (env.NODE_ENV === 'production') {
  const staticCandidates = [
    path.resolve(process.cwd(), 'public'),
    path.resolve(process.cwd(), '../frontend/dist'),
  ];
  const staticRoot = staticCandidates.find((dir) => fs.existsSync(path.join(dir, 'index.html')));

  if (staticRoot) {
    app.use(
      express.static(staticRoot, {
        maxAge: '7d',
        index: 'index.html',
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          }
        },
      })
    );
    app.get('*', (req: Request, res: Response, next: NextFunction) => {
      if (
        req.path.startsWith('/api') ||
        req.path.startsWith('/health') ||
        req.path.startsWith('/uploads')
      ) {
        return next();
      }
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.sendFile(path.join(staticRoot, 'index.html'));
    });
  }
}

// Central error handling middleware
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  Logger.error('ExpressApp', 'Unhandled exception occurred', err);
  const message = err instanceof Error && env.NODE_ENV !== 'production' ? err.message : 'Internal Server Error';
  res.status(500).json({ error: message });
});

let server: ReturnType<typeof app.listen>;

async function startServer(): Promise<void> {
  try {
    await connectPrisma();

    // Start listening immediately so Vite proxy and health checks succeed without timeout
    server = app.listen(env.PORT, () => {
      Logger.info('ExpressApp', `CodePrep Backend running on port ${env.PORT} in [${env.NODE_ENV}] mode.`);
      Logger.info('ExpressApp', `Health check available at http://localhost:${env.PORT}/health`);
    });

    // Pre-warm C++17 precompiled header and seed default account / problems in background
    SandboxRunner.warmupCompilerCache().catch((error) => {
      Logger.warn('ExpressApp', 'C++17 PCH warmup skipped', error);
    });
    AuthService.seedDefaultUser().catch((error) => {
      Logger.error('ExpressApp', 'Failed default owner account verification', error);
    });
    ProblemService.seedInitialProblems()
      .then(() => LessonService.seedLessons())
      .catch((error) => {
        Logger.error('ExpressApp', 'Failed background curriculum/lesson seeding', error);
      });
  } catch (error) {
    Logger.error('ExpressApp', 'Failed to initialize server', error);
    process.exit(1);
  }
}

// Graceful shutdown handling
const gracefulShutdown = async (signal: string) => {
  Logger.info('ExpressApp', `Received ${signal}. Shutting down gracefully...`);
  if (server) {
    server.close(async () => {
      await SqlRunner.shutdown();
      await disconnectPrisma();
      Logger.info('ExpressApp', 'HTTP server and database connections closed. Process terminating.');
      process.exit(0);
    });
  } else {
    await SqlRunner.shutdown();
    await disconnectPrisma();
    process.exit(0);
  }
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

startServer();

export { app };

