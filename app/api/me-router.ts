import { createHash, randomBytes } from "crypto";
import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { alerts, apiKeys, issues, savedBriefs } from "@db/schema";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { getActiveSubscription } from "./lib/entitlement";

const PILLARS = ["overseas-capacity", "tech-routes", "geopolitics", "markets"] as const;

export const meRouter = createRouter({
  /* ----- Saved briefs ----- */
  "saved.list": authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    return db
      .select({
        savedAt: savedBriefs.savedAt,
        issue: {
          id: issues.id,
          number: issues.number,
          slug: issues.slug,
          title: issues.title,
          dek: issues.dek,
          publishedAt: issues.publishedAt,
          isFree: issues.isFree,
          pillars: issues.pillars,
          readingMinutes: issues.readingMinutes,
          coverAsset: issues.coverAsset,
        },
      })
      .from(savedBriefs)
      .innerJoin(issues, eq(savedBriefs.issueId, issues.id))
      .where(eq(savedBriefs.userId, ctx.user.id))
      .orderBy(desc(savedBriefs.savedAt));
  }),

  "saved.add": authedQuery
    .input(z.object({ issueId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db
        .insert(savedBriefs)
        .values({ userId: ctx.user.id, issueId: input.issueId })
        .onDuplicateKeyUpdate({ set: { savedAt: new Date() } });
      return { ok: true as const };
    }),

  "saved.remove": authedQuery
    .input(z.object({ issueId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await getDb()
        .delete(savedBriefs)
        .where(and(eq(savedBriefs.userId, ctx.user.id), eq(savedBriefs.issueId, input.issueId)));
      return { ok: true as const };
    }),

  /* ----- Alert preferences ----- */
  "alerts.get": authedQuery.query(({ ctx }) =>
    getDb().select().from(alerts).where(eq(alerts.userId, ctx.user.id)),
  ),

  "alerts.set": authedQuery
    .input(
      z.object({
        pillar: z.enum(PILLARS),
        channel: z.enum(["email", "web"]).default("email"),
        enabled: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db
        .insert(alerts)
        .values({ userId: ctx.user.id, pillar: input.pillar, channel: input.channel, enabled: input.enabled })
        .onDuplicateKeyUpdate({ set: { enabled: input.enabled } });
      return { ok: true as const };
    }),

  /* ----- API keys (Desk tier only) ----- */
  "apiKeys.list": authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const rows = await db
      .select({ id: apiKeys.id, label: apiKeys.label, scopes: apiKeys.scopes, lastUsedAt: apiKeys.lastUsedAt, createdAt: apiKeys.createdAt })
      .from(apiKeys)
      .where(eq(apiKeys.userId, ctx.user.id))
      .orderBy(desc(apiKeys.createdAt));
    return rows;
  }),

  "apiKeys.create": authedQuery
    .input(z.object({ label: z.string().min(1).max(120) }))
    .mutation(async ({ ctx, input }) => {
      const active = await getActiveSubscription(ctx.user.id);
      if (!active || active.plan.tier !== "desk") {
        throw new TRPCError({ code: "FORBIDDEN", message: "API keys require the Desk plan" });
      }
      const plain = `cbb_${randomBytes(24).toString("hex")}`;
      const keyHash = createHash("sha256").update(plain).digest("hex");
      await getDb()
        .insert(apiKeys)
        .values({ userId: ctx.user.id, keyHash, label: input.label, scopes: ["issues", "factories", "policy"] });
      return { key: plain }; // shown once, never again
    }),

  "apiKeys.remove": authedQuery
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await getDb()
        .delete(apiKeys)
        .where(and(eq(apiKeys.id, input.id), eq(apiKeys.userId, ctx.user.id)));
      return { ok: true as const };
    }),
});
