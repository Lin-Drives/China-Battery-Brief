import { and, desc, eq, like, sql, asc } from "drizzle-orm";
import { factories, issues, policyEvents, tickerItems } from "@db/schema";
import { getDb } from "./connection";

/* ---------- Issues ---------- */

export async function listIssues(opts: { pillar?: string; q?: string; limit?: number; offset?: number }) {
  const db = getDb();
  const conds = [];
  if (opts.pillar) conds.push(sql`JSON_CONTAINS(${issues.pillars}, JSON_QUOTE(${opts.pillar}))`);
  if (opts.q) conds.push(like(issues.title, `%${opts.q}%`));
  return db
    .select({
      id: issues.id,
      number: issues.number,
      slug: issues.slug,
      title: issues.title,
      dek: issues.dek,
      titleZh: issues.titleZh,
      dekZh: issues.dekZh,
      publishedAt: issues.publishedAt,
      isFree: issues.isFree,
      pillars: issues.pillars,
      readingMinutes: issues.readingMinutes,
      coverAsset: issues.coverAsset,
    })
    .from(issues)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(issues.number))
    .limit(opts.limit ?? 50)
    .offset(opts.offset ?? 0);
}

export async function countIssues() {
  const db = getDb();
  const [row] = await db.select({ n: sql<number>`count(*)` }).from(issues);
  return row?.n ?? 0;
}

export async function findIssueBySlug(slug: string) {
  const db = getDb();
  return db.query.issues.findFirst({ where: eq(issues.slug, slug) });
}

export async function findLatestIssue() {
  const db = getDb();
  const rows = await db.select().from(issues).orderBy(desc(issues.number)).limit(1);
  return rows[0] ?? null;
}

/* ---------- Factories ---------- */

export async function listFactories(opts: { company?: string; status?: string; region?: string }) {
  const db = getDb();
  const conds = [];
  if (opts.company) conds.push(eq(factories.company, opts.company));
  if (opts.status) conds.push(eq(factories.status, opts.status as never));
  if (opts.region) conds.push(eq(factories.country, opts.region));
  return db
    .select()
    .from(factories)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(factories.capacityGwh));
}

export async function factoryStats() {
  const db = getDb();
  const rows = await db
    .select({
      status: factories.status,
      n: sql<number>`count(*)`,
      gwh: sql<number>`coalesce(sum(${factories.capacityGwh}),0)`,
    })
    .from(factories)
    .groupBy(factories.status);
  const totalGwh = rows.reduce((s, r) => s + Number(r.gwh), 0);
  const totalSites = rows.reduce((s, r) => s + Number(r.n), 0);
  const byStatus = Object.fromEntries(rows.map((r) => [r.status, { count: Number(r.n), gwh: Number(r.gwh) }]));
  const companies = await db.selectDistinct({ c: factories.company }).from(factories);
  return { totalSites, totalGwh, byStatus, companies: companies.map((c) => c.c) };
}

/* ---------- Policy events ---------- */

export async function listPolicyEvents(opts: { region?: string; category?: string }) {
  const db = getDb();
  const conds = [];
  if (opts.region) conds.push(eq(policyEvents.region, opts.region));
  if (opts.category) conds.push(eq(policyEvents.category, opts.category as never));
  return db
    .select()
    .from(policyEvents)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(asc(policyEvents.date));
}

/* ---------- Ticker ---------- */

export async function listTickerItems() {
  const db = getDb();
  return db.select().from(tickerItems).orderBy(asc(tickerItems.sortOrder));
}
