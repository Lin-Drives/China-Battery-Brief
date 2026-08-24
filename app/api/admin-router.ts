import { TRPCError } from "@trpc/server";
import { count, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { emailSubscribers, emailSends, factories, issues, payments, policyEvents, users } from "@db/schema";
import { createRouter, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { audit } from "./lib/audit";
import { sendTestEmail, sendWeeklyBlast, pruneEmailSends } from "./lib/newsletter";

const issueInput = z.object({
  number: z.number().int().positive(),
  slug: z.string().min(1).max(255),
  title: z.string().min(1).max(500),
  dek: z.string().optional(),
  publishedAt: z.coerce.date(),
  isFree: z.boolean().default(false),
  pillars: z.array(z.string()).min(1),
  readingMinutes: z.number().int().min(1).max(120).default(8),
  coverAsset: z.string().max(255).optional(),
  content: z.string().min(1),
  highlights: z
    .array(z.object({ tag: z.enum(["capacity", "tech", "risk", "markets"]), text: z.string(), gauge: z.number().optional() }))
    .default([]),
  highlightsZh: z
    .array(z.object({ tag: z.enum(["capacity", "tech", "risk", "markets"]), text: z.string(), gauge: z.number().optional() }))
    .optional(),
  sources: z
    .array(z.object({ outlet: z.string(), title: z.string(), url: z.string(), date: z.string() }))
    .optional(),
});

const factoryInput = z.object({
  company: z.string().min(1).max(100),
  siteName: z.string().min(1).max(255),
  country: z.string().min(1).max(100),
  countryCode: z.string().max(8).optional(),
  city: z.string().max(100).optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  status: z.enum(["operating", "construction", "announced", "paused", "suspended"]),
  capacityGwh: z.number().optional(),
  chemistry: z.array(z.string()).optional(),
  sopDate: z.string().max(20).optional(),
  partners: z.array(z.string()).optional(),
  sourceUrls: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

const policyInput = z.object({
  region: z.string().min(1).max(50),
  title: z.string().min(1).max(500),
  date: z.coerce.date(),
  severity: z.number().int().min(1).max(100),
  category: z.enum(["ira", "passport", "tariff", "export", "other"]),
  summary: z.string().optional(),
  link: z.string().max(500).optional(),
});

export const adminRouter = createRouter({
  /* ----- Dashboard stats ----- */
  stats: adminQuery.query(async () => {
    const db = getDb();
    const [[u], [i], [e], [p]] = await Promise.all([
      db.select({ n: count() }).from(users),
      db.select({ n: count() }).from(issues),
      db.select({ n: count() }).from(emailSubscribers),
      db.select({ total: sql<number>`coalesce(sum(${payments.amountCents}),0)` }).from(payments),
    ]);
    return {
      users: u?.n ?? 0,
      issues: i?.n ?? 0,
      emailSubscribers: e?.n ?? 0,
      revenueCents: Number(p?.total ?? 0),
    };
  }),

  /* ----- Issues CMS ----- */
  "issues.create": adminQuery.input(issueInput).mutation(async ({ ctx, input }) => {
    const db = getDb();
    const [row] = await db.insert(issues).values(input).$returningId();
    await audit({
      userId: ctx.user.id,
      actorName: ctx.user.name,
      action: "admin.issue.create",
      targetType: "issue",
      targetId: row.id,
      ip: ctx.ip,
      meta: { number: input.number, slug: input.slug },
    });
    return { id: row.id };
  }),

  "issues.update": adminQuery
    .input(z.object({ id: z.number().int().positive(), data: issueInput.partial() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.update(issues).set(input.data).where(eq(issues.id, input.id));
      await audit({
        userId: ctx.user.id,
        actorName: ctx.user.name,
        action: "admin.issue.update",
        targetType: "issue",
        targetId: input.id,
        ip: ctx.ip,
        meta: { changed: Object.keys(input.data) },
      });
      return { ok: true as const };
    }),

  "issues.delete": adminQuery
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await getDb().delete(issues).where(eq(issues.id, input.id));
      await audit({
        userId: ctx.user.id,
        actorName: ctx.user.name,
        action: "admin.issue.delete",
        targetType: "issue",
        targetId: input.id,
        ip: ctx.ip,
      });
      return { ok: true as const };
    }),

  /** Admin list includes content for editing. */
  "issues.list": adminQuery.query(async () => {
    return getDb().select().from(issues).orderBy(issues.number);
  }),

  /* ----- Factories CMS ----- */
  "factories.create": adminQuery.input(factoryInput).mutation(async ({ ctx, input }) => {
    const [row] = await getDb().insert(factories).values(input).$returningId();
    await audit({
      userId: ctx.user.id,
      actorName: ctx.user.name,
      action: "admin.factory.create",
      targetType: "factory",
      targetId: row.id,
      ip: ctx.ip,
      meta: { company: input.company, siteName: input.siteName },
    });
    return { id: row.id };
  }),

  "factories.update": adminQuery
    .input(z.object({ id: z.number().int().positive(), data: factoryInput.partial() }))
    .mutation(async ({ ctx, input }) => {
      await getDb().update(factories).set(input.data).where(eq(factories.id, input.id));
      await audit({
        userId: ctx.user.id,
        actorName: ctx.user.name,
        action: "admin.factory.update",
        targetType: "factory",
        targetId: input.id,
        ip: ctx.ip,
        meta: { changed: Object.keys(input.data) },
      });
      return { ok: true as const };
    }),

  "factories.delete": adminQuery
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await getDb().delete(factories).where(eq(factories.id, input.id));
      await audit({
        userId: ctx.user.id,
        actorName: ctx.user.name,
        action: "admin.factory.delete",
        targetType: "factory",
        targetId: input.id,
        ip: ctx.ip,
      });
      return { ok: true as const };
    }),

  /* ----- Policy events CMS ----- */
  "policy.create": adminQuery.input(policyInput).mutation(async ({ ctx, input }) => {
    const [row] = await getDb().insert(policyEvents).values(input).$returningId();
    await audit({
      userId: ctx.user.id,
      actorName: ctx.user.name,
      action: "admin.policy.create",
      targetType: "policy_event",
      targetId: row.id,
      ip: ctx.ip,
      meta: { title: input.title },
    });
    return { id: row.id };
  }),

  "policy.update": adminQuery
    .input(z.object({ id: z.number().int().positive(), data: policyInput.partial() }))
    .mutation(async ({ ctx, input }) => {
      await getDb().update(policyEvents).set(input.data).where(eq(policyEvents.id, input.id));
      await audit({
        userId: ctx.user.id,
        actorName: ctx.user.name,
        action: "admin.policy.update",
        targetType: "policy_event",
        targetId: input.id,
        ip: ctx.ip,
        meta: { changed: Object.keys(input.data) },
      });
      return { ok: true as const };
    }),

  "policy.delete": adminQuery
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await getDb().delete(policyEvents).where(eq(policyEvents.id, input.id));
      await audit({
        userId: ctx.user.id,
        actorName: ctx.user.name,
        action: "admin.policy.delete",
        targetType: "policy_event",
        targetId: input.id,
        ip: ctx.ip,
      });
      return { ok: true as const };
    }),

  "factories.list": adminQuery.query(() => getDb().select().from(factories)),
  "policy.list": adminQuery.query(() => getDb().select().from(policyEvents)),

  /* ----- Email subscribers (double opt-in) ----- */
  "email.stats": adminQuery.query(async () => {
    const db = getDb();
    const byStatus = await db
      .select({ status: emailSubscribers.status, n: count() })
      .from(emailSubscribers)
      .groupBy(emailSubscribers.status);
    const sends = await db
      .select({ kind: emailSends.kind, n: count() })
      .from(emailSends)
      .groupBy(emailSends.kind);
    const statusMap: Record<string, number> = {};
    for (const r of byStatus) statusMap[r.status] = r.n;
    const sendMap: Record<string, number> = {};
    for (const r of sends) sendMap[r.kind] = r.n;
    return { byStatus: statusMap, sends: sendMap };
  }),

  "email.list": adminQuery.query(async () => {
    return getDb()
      .select({
        id: emailSubscribers.id,
        email: emailSubscribers.email,
        status: emailSubscribers.status,
        lang: emailSubscribers.lang,
        verifiedAt: emailSubscribers.verifiedAt,
        unsubscribedAt: emailSubscribers.unsubscribedAt,
        createdAt: emailSubscribers.createdAt,
      })
      .from(emailSubscribers)
      .orderBy(desc(emailSubscribers.createdAt))
      .limit(500);
  }),

  "email.test": adminQuery
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ ctx, input }) => {
      const result = await sendTestEmail(input.email);
      await audit({
        userId: ctx.user.id,
        actorName: ctx.user.name,
        action: "admin.email.test",
        targetType: "email",
        meta: { email: input.email, sent: result.sent },
      });
      return result;
    }),

  "email.blast": adminQuery
    .input(z.object({ issueId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const summary = await sendWeeklyBlast(input.issueId);
      // Opportunistic audit-log hygiene: never let a prune failure fail the blast.
      try {
        await pruneEmailSends();
      } catch (error) {
        console.error("[email-sends] prune failed after blast", error);
      }
      await audit({
        userId: ctx.user.id,
        actorName: ctx.user.name,
        action: "admin.email.blast",
        targetType: "issue",
        targetId: input.issueId,
        meta: summary,
      });
      return summary;
    }),
});

// Unused-import guard (keeps TS happy if TRPCError not thrown in future edits)
void TRPCError;
