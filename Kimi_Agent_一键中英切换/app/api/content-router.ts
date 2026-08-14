import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { emailSubscribers } from "@db/schema";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { checkLimit } from "./lib/rate-limit";
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
import { isEntitled } from "./lib/entitlement";
import { OpenAccess } from "@contracts/constants";

/** Keep ~40% of markdown blocks for the free preview. */
function truncateContent(markdown: string): string {
  const blocks = markdown.split(/\n{2,}/);
  const keep = Math.max(2, Math.ceil(blocks.length * 0.4));
  return blocks.slice(0, keep).join("\n\n");
}

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
    const { content: _c, contentZh: _cz, ...meta } = latest;
    return meta;
  }),

  "issues.bySlug": publicQuery
    .input(z.object({ slug: z.string().min(1).max(255) }))
    .query(async ({ ctx, input }) => {
      const issue = await findIssueBySlug(input.slug);
      if (!issue) throw new TRPCError({ code: "NOT_FOUND", message: "Issue not found" });
      const entitled = OpenAccess.beta || issue.isFree || (await isEntitled(ctx.user));
      if (entitled) {
        return { ...issue, paywalled: false as const };
      }
      return {
        ...issue,
        content: truncateContent(issue.content),
        contentZh: issue.contentZh ? truncateContent(issue.contentZh) : null,
        paywalled: true as const,
      };
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

  /* ----- Email capture (footer / free tier) ----- */
  "subscribe.email": publicQuery
    .input(z.object({ email: z.string().email().max(320) }))
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
      const db = getDb();
      await db
        .insert(emailSubscribers)
        .values({ email: input.email })
        .onDuplicateKeyUpdate({ set: { email: input.email } });
      return { ok: true as const };
    }),
});
