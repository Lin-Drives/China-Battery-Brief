import { auditLogs } from "@db/schema";
import { getDb } from "../queries/connection";

export type AuditEntry = {
  userId: number;
  actorName?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | number | null;
  ip?: string | null;
  meta?: Record<string, unknown>;
};

/**
 * Write an immutable audit entry to the DB and mirror it to stdout as JSON.
 * DB failures are logged but never allowed to break the caller.
 */
export async function audit(entry: AuditEntry): Promise<void> {
  const row = {
    userId: entry.userId,
    actorName: entry.actorName ?? null,
    action: entry.action,
    targetType: entry.targetType ?? null,
    targetId: entry.targetId != null ? String(entry.targetId) : null,
    ip: entry.ip ?? null,
    meta: entry.meta ?? null,
  };
  console.log(JSON.stringify({ level: "audit", ts: new Date().toISOString(), ...row }));
  try {
    await getDb().insert(auditLogs).values(row);
  } catch (error) {
    console.error("[audit] failed to persist audit entry", error);
  }
}
