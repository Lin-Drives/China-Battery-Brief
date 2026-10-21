import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { checkLimit } from "./lib/rate-limit";
import { subscribeEmail } from "./lib/subscribe";
import {
  countIssues,
  factoryStats,
  findIssueBySlug,
  findLatestIssue,
  listFactories,
  listIssues,
  listPolicyEvents,
  listTickerItems,
} from "./queries/content";

const PILLARS = ["overseas-capacity", "tech-routes", "geopolitics", "markets"] as const;

export const contentRouter = createRouter({
  /* ----- Issues ----- */
  "issues.list": publicQuery
    .input(
      z
        .object({
          pillar: z.enum(PILLARS).optional(),
          q: z.string().max(120).optional(),
          limit: z.number().int().min(1).max(100).optional(),
          offset: z.number().int().min(0).optional(),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const [rows, total] = await Promise.all([listIssues(input ?? {}), countIssues()]);
      return { issues: rows, total };
    }),

  "issues.latest": publicQuery.query(async () => {
    const latest = await findLatestIssue();
    if (!latest) return null;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { content: _c, contentZh: _cz, ...meta } = latest;
    return meta;
  }),

  "issues.bySlug": publicQuery
    .input(z.object({ slug: z.string().min(1).max(255) }))
    .query(async ({ input }) => {
      const issue = await findIssueBySlug(input.slug);
      if (!issue) throw new TRPCError({ code: "NOT_FOUND", message: "Issue not found" });
      return issue;
    }),

  /* ----- Factories ----- */
  "factories.list": publicQuery
    .input(
      z
        .object({
          company: z.string().max(100).optional(),
          status: z.enum(["operating", "construction", "announced", "paused", "suspended"]).optional(),
          region: z.string().max(100).optional(),
        })
        .optional(),
    )
    .query(({ input }) => listFactories(input ?? {})),

  "factories.stats": publicQuery.query(() => factoryStats()),

  /* ----- Policy / Risk Radar ----- */
  "policy.list": publicQuery
    .input(
      z
        .object({
          region: z.string().max(50).optional(),
          category: z.enum(["ira", "passport", "tariff", "export", "other"]).optional(),
        })
        .optional(),
    )
    .query(({ input }) => listPolicyEvents(input ?? {})),

  /* ----- Ticker ----- */
  "ticker.items": publicQuery.query(() => listTickerItems()),

  /* ----- Email capture (footer / free tier) — double opt-in ----- */
  "subscribe.email": publicQuery
    .input(
      z.object({
        email: z.string().email().max(320),
        lang: z.enum(["en", "zh"]).default("en"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { allowed, retryAfter } = checkLimit(
        `subscribe-email:${ctx.ip}`,
        60_000,
        5,
      );
      if (!allowed) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: `Too many subscribe attempts, retry in ${retryAfter}s`,
        });
      }
      return subscribeEmail(input.email, input.lang);
    }),
});
