import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { payments, plans, subscriptions } from "@db/schema";
import { createRouter, authedQuery, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { getActiveSubscription } from "./lib/entitlement";

const PAID_INTERVAL_MS: Record<string, number> = {
  month: 31 * 24 * 3600 * 1000,
  year: 366 * 24 * 3600 * 1000,
};

export const billingRouter = createRouter({
  /** Public plan catalog. */
  plans: publicQuery.query(() => getDb().select().from(plans)),

  /** Current user's subscription + plan (or null). */
  my: authedQuery.query(({ ctx }) => getActiveSubscription(ctx.user.id)),

  /**
   * MOCK checkout — Stripe-shaped so a real Stripe session can replace the
   * body later. Creates a succeeded payment + activates/renews the
   * subscription immediately, then returns the redirect URL the frontend
   * should navigate to.
   */
  checkout: authedQuery
    .input(z.object({ planCode: z.string().min(1).max(50), from: z.string().max(255).optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const plan = await db.query.plans.findFirst({ where: eq(plans.code, input.planCode) });
      if (!plan) throw new TRPCError({ code: "NOT_FOUND", message: "Unknown plan" });
      if (plan.tier === "free") throw new TRPCError({ code: "BAD_REQUEST", message: "Free plan needs no checkout" });

      const periodEnd = new Date(Date.now() + (PAID_INTERVAL_MS[plan.interval] ?? PAID_INTERVAL_MS.month));
      const mockRef = `mock_cs_${Date.now().toString(36)}`;

      await db.insert(payments).values({
        userId: ctx.user.id,
        planId: plan.id,
        amountCents: plan.priceCents,
        currency: plan.currency,
        status: "succeeded",
        mockRef,
      });

      const existing = await db
        .select()
        .from(subscriptions)
        .where(and(eq(subscriptions.userId, ctx.user.id), eq(subscriptions.status, "active")));

      if (existing.length > 0) {
        await db
          .update(subscriptions)
          .set({ planId: plan.id, status: "active", currentPeriodEnd: periodEnd })
          .where(eq(subscriptions.id, existing[0].id));
      } else {
        await db.insert(subscriptions).values({
          userId: ctx.user.id,
          planId: plan.id,
          status: "active",
          currentPeriodEnd: periodEnd,
        });
      }

      const from = input.from ? `&from=${encodeURIComponent(input.from)}` : "";
      return { url: `/account?welcome=1${from}`, mockRef };
    }),

  /** Cancel auto-renew — access continues until currentPeriodEnd. */
  cancel: authedQuery.mutation(async ({ ctx }) => {
    const active = await getActiveSubscription(ctx.user.id);
    if (!active) throw new TRPCError({ code: "NOT_FOUND", message: "No active subscription" });
    await getDb()
      .update(subscriptions)
      .set({ status: "canceled" })
      .where(eq(subscriptions.id, active.subscription.id));
    return { ok: true as const, currentPeriodEnd: active.subscription.currentPeriodEnd };
  }),

  /** Billing history for /account. */
  history: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    return db
      .select({ payment: payments, plan: plans })
      .from(payments)
      .innerJoin(plans, eq(payments.planId, plans.id))
      .where(eq(payments.userId, ctx.user.id))
      .orderBy(desc(payments.createdAt))
      .limit(24);
  }),
});
