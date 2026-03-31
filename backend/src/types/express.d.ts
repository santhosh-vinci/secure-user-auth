declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      id: string;
      email: string;
      role: string;
    };
    session?: {
      id: string;
      userId: string;
      tokenHash: string;
      ipAddress: string;
      userAgent: string;
      createdAt: Date;
      expiresAt: Date;
      lastActivityAt: Date;
    };
  }
}

export {};
