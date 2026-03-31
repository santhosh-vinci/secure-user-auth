import { prisma } from '../db/client';
import { logger } from '../config/logger';

const RETENTION_DAYS = 90;
const RUN_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

async function pruneAuditLogs(): Promise<void> {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
  try {
    const { count } = await prisma.auditLog.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
    if (count > 0) {
      logger.info(`Audit log retention: pruned ${count} records older than ${RETENTION_DAYS} days`);
    }
  } catch (err) {
    logger.error('Audit log retention job failed', { error: err });
  }
}

export function startAuditLogRetention(): void {
  // Run once shortly after startup, then every 24 hours
  setTimeout(() => {
    void pruneAuditLogs();
    setInterval(() => { void pruneAuditLogs(); }, RUN_INTERVAL_MS);
  }, 60 * 1000); // 1 minute after startup
}
