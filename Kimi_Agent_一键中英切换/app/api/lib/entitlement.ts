import { and, eq, gt, inArray } from "drizzle-orm";
import { plans, subscriptions } from "@db/schema";
import { getDb } from "../queries/connection";

/**
 * Entitlement rule: a user can read paywalled content while their latest
 * subscription's currentPeriodEnd is in the future and status is active or
 * canceled (canceled keeps access until period end). Admins always entitled.
 */
export async function getActiveSubscription(userId: number) {
  const db = getDb();
  const rows = await db
    .select({ subscription: subscriptions, plan: plans })
    .from(subscriptions)
    .innerJoin(plans, eq(subscriptions.planId, plans.id))
    .where(
      and(
        eq(subscriptions.userId, userId),
        inArray(subscriptions.status, ["active", "canceled", "trialing"]),
        gt(subscriptions.currentPeriodEnd, new Date()),
      ),
    )
    .orderBy(subscriptions.currentPeriodEnd)
    .limit(1);
  return rows[0] ?? null;
}

export async function isEntitled(user?: { id: number; role: string } | null): Promise<boolean> {
  if (!user) return false;
  if (user.role === "admin") return true;
  return (await getActiveSubscription(user.id)) !== null;
}
