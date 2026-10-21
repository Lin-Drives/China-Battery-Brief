import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { alerts, issues, savedBriefs } from "@db/schema";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";

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

});
