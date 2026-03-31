import { prisma } from '../db/client';
import { logger } from '../config/logger';

export type AuditAction =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILURE'
  | 'LOGIN_LOCKED'
  | 'LOGOUT'
  | 'SIGNUP'
  | 'EMAIL_VERIFICATION_SENT'
  | 'EMAIL_VERIFIED'
  | 'PASSWORD_RESET_REQUESTED'
  | 'PASSWORD_RESET_SUCCESS'
  | 'PASSWORD_CHANGED'
  | 'ROLE_CHANGED'
  | 'SESSION_FINGERPRINT_MISMATCH'
  | 'SESSION_TERMINATED_SUSPICIOUS'
  | 'ACCOUNT_LOCKED';

interface AuditLogParams {
  userId?: string;
  ipAddress: string;
  userAgent: string;
  action: AuditAction;
  metadata?: Record<string, unknown>;
}

export async function createAuditLog(params: AuditLogParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId ?? null,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        actionType: params.action,
        metadata: (params.metadata ?? {}) as object,
      },
    });
  } catch (err) {
    // Audit logging must never crash the main request
    logger.error('Failed to write audit log', { error: err, ...params });
  }
}
