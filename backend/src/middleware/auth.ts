import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { prisma } from '../services/prisma.service';

export interface AuthenticatedUser {
  id: string;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const candidateTokens: string[] = [];

    // Collect Authorization Bearer token and httpOnly cookie fallback
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      candidateTokens.push(authHeader.substring(7));
    }
    if (req.cookies && req.cookies.access_token) {
      candidateTokens.push(req.cookies.access_token);
    }

    if (candidateTokens.length === 0) {
      res.status(401).json({ error: 'Authentication required. No session token provided.' });
      return;
    }

    for (const token of candidateTokens) {
      try {
        const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as { sub: string; email: string };
        const user = await prisma.user.findUnique({
          where: { id: decoded.sub },
          select: { id: true, email: true },
        });
        if (user) {
          req.user = user;
          next();
          return;
        }
      } catch {
        // Try fallback token source if available
      }
    }

    res.status(401).json({ error: 'Session expired or invalid token.' });
  } catch {
    res.status(401).json({ error: 'Session expired or invalid token.' });
  }
}

