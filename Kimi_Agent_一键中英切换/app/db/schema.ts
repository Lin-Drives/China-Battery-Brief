import {
  mysqlTable,
  mysqlEnum,
  bigint,
  varchar,
  text,
  longtext,
  timestamp,
  int,
  boolean,
  json,
  double,
  unique,
  index,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: bigint({ mode: "number", unsigned: true }).autoincrement().primaryKey(),
  // Reserved: was the Kimi OAuth union id. Kept NOT NULL for now; the
  // upcoming email+password auth (plan.md) will migrate this column away.
  unionId: varchar("unionId", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 320 }),
  avatar: text("avatar"),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  lastSignInAt: timestamp("lastSignInAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/* ================= China Battery Brief — app tables ================= */

/** A cited source: outlet name, report title, canonical URL and publication date. */
export interface SourceRef {
  outlet: string;
  title: string;
  url: string;
  date: string;
}

/** Weekly newsletter issues (long-form markdown content). */
export const issues = mysqlTable("issues", {
  id: bigint({ mode: "number", unsigned: true }).autoincrement().primaryKey(),
  number: int("number").notNull().unique(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  title: varchar("title", { length: 500 }).notNull(),
  dek: text("dek"),
  /** Chinese translations (nullable — issues ship EN first, ZH backfilled). */
  titleZh: varchar("titleZh", { length: 500 }),
  dekZh: text("dekZh"),
  publishedAt: timestamp("publishedAt").notNull(),
  isFree: boolean("isFree").default(false).notNull(),
  pillars: json("pillars").$type<string[]>().notNull(),
  readingMinutes: int("readingMinutes").default(8).notNull(),
  coverAsset: varchar("coverAsset", { length: 255 }),
  content: longtext("content").notNull(),
  contentZh: longtext("contentZh"),
  sources: json("sources").$type<SourceRef[]>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type Issue = typeof issues.$inferSelect;
export type InsertIssue = typeof issues.$inferInsert;

/** Subscription catalog. */
export const plans = mysqlTable("plans", {
  id: bigint({ mode: "number", unsigned: true }).autoincrement().primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(), // free | pro-monthly | pro-annual | desk-monthly | desk-annual
  name: varchar("name", { length: 100 }).notNull(),
  tier: mysqlEnum("tier", ["free", "pro", "desk"]).notNull(),
  priceCents: int("priceCents").notNull(),
  currency: varchar("currency", { length: 3 }).default("USD").notNull(),
  interval: mysqlEnum("interval", ["month", "year", "forever"]).notNull(),
  features: json("features").$type<string[]>(),
});

export type Plan = typeof plans.$inferSelect;

export const subscriptions = mysqlTable("subscriptions", {
  id: bigint({ mode: "number", unsigned: true }).autoincrement().primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  planId: bigint("planId", { mode: "number", unsigned: true }).notNull(),
  status: mysqlEnum("status", ["active", "canceled", "past_due", "trialing"]).notNull(),
  currentPeriodEnd: timestamp("currentPeriodEnd").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type Subscription = typeof subscriptions.$inferSelect;

/** Mock-checkout payment records (Stripe-shaped for later swap-in). */
export const payments = mysqlTable("payments", {
  id: bigint({ mode: "number", unsigned: true }).autoincrement().primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  planId: bigint("planId", { mode: "number", unsigned: true }).notNull(),
  amountCents: int("amountCents").notNull(),
  currency: varchar("currency", { length: 3 }).default("USD").notNull(),
  status: mysqlEnum("status", ["succeeded", "pending", "failed"]).notNull(),
  mockRef: varchar("mockRef", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Payment = typeof payments.$inferSelect;

/** Global Factory Tracker dataset. */
export const factories = mysqlTable(
  "factories",
  {
    id: bigint({ mode: "number", unsigned: true }).autoincrement().primaryKey(),
    company: varchar("company", { length: 100 }).notNull(),
    siteName: varchar("siteName", { length: 255 }).notNull(),
    country: varchar("country", { length: 100 }).notNull(),
    countryCode: varchar("countryCode", { length: 8 }),
    city: varchar("city", { length: 100 }),
    lat: double("lat"),
    lng: double("lng"),
    status: mysqlEnum("status", ["operating", "construction", "announced", "paused", "suspended"]).notNull(),
    capacityGwh: double("capacityGwh"),
    chemistry: json("chemistry").$type<string[]>(),
    sopDate: varchar("sopDate", { length: 20 }),
    partners: json("partners").$type<string[]>(),
    sourceUrls: json("sourceUrls").$type<string[]>(),
    notes: text("notes"),
    updatedAt: timestamp("updatedAt")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    uniqSite: unique("uniq_company_site").on(t.company, t.siteName),
  }),
);

export type Factory = typeof factories.$inferSelect;

/** Policy events for the Policy Desk timeline. */
export const policyEvents = mysqlTable(
  "policy_events",
  {
    id: bigint({ mode: "number", unsigned: true }).autoincrement().primaryKey(),
    region: varchar("region", { length: 50 }).notNull(), // US | EU | CN | GLOBAL
    title: varchar("title", { length: 500 }).notNull(),
    /** Chinese translations (nullable — policy events ship EN first, ZH backfilled). */
    titleZh: varchar("titleZh", { length: 500 }),
    date: timestamp("date").notNull(),
    severity: int("severity").notNull(), // 1-100
    category: mysqlEnum("category", ["ira", "passport", "tariff", "export", "other"]).notNull(),
    summary: text("summary"),
    /** Chinese translation of summary (nullable). */
    summaryZh: text("summaryZh"),
    link: varchar("link", { length: 500 }),
  },
  (t) => ({
    uniqEvent: unique("uniq_policy_title_date").on(t.title, t.date),
  }),
);

export type PolicyEvent = typeof policyEvents.$inferSelect;

/** TickerBar items. */
export const tickerItems = mysqlTable("ticker_items", {
  id: bigint({ mode: "number", unsigned: true }).autoincrement().primaryKey(),
  label: varchar("label", { length: 500 }).notNull(),
  delta: mysqlEnum("delta", ["up", "down", "none"]).default("none").notNull(),
  pillar: mysqlEnum("pillar", ["overseas-capacity", "tech-routes", "geopolitics", "markets", "none"])
    .default("none")
    .notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
});

export const savedBriefs = mysqlTable(
  "saved_briefs",
  {
    id: bigint({ mode: "number", unsigned: true }).autoincrement().primaryKey(),
    userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
    issueId: bigint("issueId", { mode: "number", unsigned: true }).notNull(),
    savedAt: timestamp("savedAt").defaultNow().notNull(),
  },
  (t) => ({ uniq: unique("uniq_user_issue").on(t.userId, t.issueId) }),
);

export const alerts = mysqlTable(
  "alerts",
  {
    id: bigint({ mode: "number", unsigned: true }).autoincrement().primaryKey(),
    userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
    pillar: mysqlEnum("pillar", ["overseas-capacity", "tech-routes", "geopolitics", "markets"]).notNull(),
    channel: mysqlEnum("channel", ["email", "web"]).default("email").notNull(),
    enabled: boolean("enabled").default(true).notNull(),
  },
  (t) => ({ uniq: unique("uniq_user_pillar_channel").on(t.userId, t.pillar, t.channel) }),
);

export const apiKeys = mysqlTable("api_keys", {
  id: bigint({ mode: "number", unsigned: true }).autoincrement().primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  keyHash: varchar("keyHash", { length: 255 }).notNull(),
  label: varchar("label", { length: 255 }),
  scopes: json("scopes").$type<string[]>(),
  lastUsedAt: timestamp("lastUsedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const emailSubscribers = mysqlTable("email_subscribers", {
  id: bigint({ mode: "number", unsigned: true }).autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/** Immutable security/compliance audit trail (admin actions, auth events). */
export const auditLogs = mysqlTable(
  "audit_logs",
  {
    id: bigint({ mode: "number", unsigned: true }).autoincrement().primaryKey(),
    userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
    actorName: varchar("actorName", { length: 255 }),
    action: varchar("action", { length: 100 }).notNull(),
    targetType: varchar("targetType", { length: 50 }),
    targetId: varchar("targetId", { length: 100 }),
    ip: varchar("ip", { length: 64 }),
    meta: json("meta").$type<Record<string, unknown>>(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => ({
    idxAction: index("idx_audit_action").on(t.action),
    idxCreatedAt: index("idx_audit_created").on(t.createdAt),
  }),
);

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;
