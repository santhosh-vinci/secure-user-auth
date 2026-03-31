import type { Request, Response, NextFunction } from 'express';
import type { Role } from '@prisma/client';

interface AuthenticatedRequest extends Request {
  user?: { id: string; email: string; role: string };
}

export function requireRole(roles: Role[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    if (!roles.includes(req.user.role as Role)) {
      res.status(403).json({ error: 'Insufficient permissions.' });
      return;
    }

    next();
  };
}
