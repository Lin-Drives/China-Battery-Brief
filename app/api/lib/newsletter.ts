import { eq, lt } from "drizzle-orm";
import { emailSends, emailSubscribers, issues } from "@db/schema";
import { getDb } from "../queries/connection";
import { sendMail } from "./mailer";
import { absoluteUrl, weeklyBlastEmail, type Lang } from "./email-templates";

export type BlastSummary = {
  total: number;
  sent: number;
  failed: number;
  skipped: number;
};

export type BlastOptions = {
  /** Max in-flight SMTP sends at once. Defaults to DEFAULT_BLAST_CONCURRENCY. */
  concurrency?: number;
};

/** Cap concurrent sends bounding wall-clock time without spiking memory. */
export const DEFAULT_BLAST_CONCURRENCY = 5;
/** Keep send-audit logs this many days; older rows are pruned. */
export const DEFAULT_SEND_RETENTION_DAYS = 180;

async function processSend(
  issue: typeof issues.$inferSelect,
  sub: typeof emailSubscribers.$inferSelect,
  issueId: number,
): Promise<"sent" | "failed" | "skipped"> {
  const lang = (sub.lang || "en") as Lang;
  if (!sub.unsubToken) return "skipped";
  const content = lang === "zh" ? issue.contentZh ?? issue.content : issue.content;
  const unsubUrl = absoluteUrl(`/api/subscribe/unsubscribe?token=${sub.unsubToken}`);
  const viewOnlineUrl = absoluteUrl(`/briefs/${issue.slug}`);
  const mail = weeklyBlastEmail(lang, {
    number: issue.number,
    title: issue.title,
    dek: issue.dek,
    content,
    readingMinutes: issue.readingMinutes,
  }, { unsubUrl, viewOnlineUrl });

  const result = await sendMail({
    to: sub.email,
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
  });

  let status: "sent" | "failed" | "skipped" = "skipped";
  if (result.sent) status = "sent";
  else if (result.error) status = "failed";

  // Log the send; a logging failure must never take down the blast.
  try {
    await getDb().insert(emailSends).values({
      subscriberId: sub.id,
      email: sub.email,
      kind: "weekly",
      status,
      error: result.error ?? null,
      issueId,
    });
  } catch (error) {
    console.error("[email-sends] failed to log weekly send", error);
  }

  return status;
}

/**
 * Weekly blast framework: renders the chosen issue and sends it to every
 * verified subscriber in their language, logging each send. Bounded-concurrency
 * workers keep a large list from serializing the whole run into a long wall
 * clock, while still limitting how many SMTP connections open at once.
 * Drive it from an admin trigger or a cron/launchd job (see plan.md).
 */
export async function sendWeeklyBlast(issueId: number, opts: BlastOptions = {}): Promise<BlastSummary> {
  const db = getDb();
  const issue = (await db.select().from(issues).where(eq(issues.id, issueId)))[0];
  if (!issue) throw new Error(`Issue ${issueId} not found`);

  const subscribers = await db
    .select()
    .from(emailSubscribers)
    .where(eq(emailSubscribers.status, "verified"));

  const summary: BlastSummary = { total: subscribers.length, sent: 0, failed: 0, skipped: 0 };
  if (subscribers.length === 0) return summary;

  const concurrency = Math.min(
    Math.max(1, opts.concurrency ?? DEFAULT_BLAST_CONCURRENCY),
    subscribers.length,
  );

  const results = new Array<"sent" | "failed" | "skipped">(subscribers.length).fill("skipped");
  let cursor = 0;

  const worker = async () => {
    while (cursor < subscribers.length) {
      const idx = cursor++;
      results[idx] = await processSend(issue, subscribers[idx], issueId);
    }
  };

  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  for (const status of results) summary[status] += 1;
  return summary;
}

/** Delete email_sends rows older than `retentionDays` (audit-log hygiene). */
export async function pruneEmailSends(
  retentionDays: number = DEFAULT_SEND_RETENTION_DAYS,
): Promise<{ deleted: number }> {
  const cutoff = new Date(Date.now() - retentionDays * 86_400_000);
  const db = getDb();
  const res = await db.delete(emailSends).where(lt(emailSends.sentAt, cutoff));
  // mysql2 returns a ResultSetHeader; some drivers omit affectedRows.
  const deleted = (res as { affectedRows?: number }).affectedRows ?? 0;
  return { deleted };
}

/** Send a single test email to verify SMTP configuration (admin action). */
export async function sendTestEmail(email: string, lang: Lang = "en"): Promise<{ sent: boolean; error?: string }> {
  const mail = weeklyBlastEmail(lang, {
    number: 0,
    title: "Test — China Battery Brief",
    dek: "An SMTP test message.",
    content: "If you're reading this, your mail channel is configured.\n\nThank you.",
    readingMinutes: null,
  }, {
    unsubUrl: absoluteUrl("/"),
    viewOnlineUrl: absoluteUrl("/"),
  });
  const result = await sendMail({ to: email, subject: mail.subject, text: mail.text, html: mail.html });
  try {
    await getDb().insert(emailSends).values({
      subscriberId: null,
      email,
      kind: "test",
      status: result.sent ? "sent" : result.error ? "failed" : "skipped",
      error: result.error ?? null,
      issueId: null,
    });
  } catch (error) {
    console.error("[email-sends] failed to log test send", error);
  }
  return { sent: result.sent, error: result.error };
}
