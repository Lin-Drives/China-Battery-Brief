import { randomBytes } from "crypto";
import { eq } from "drizzle-orm";
import { emailSends, emailSubscribers } from "@db/schema";
import { getDb } from "../queries/connection";
import { sendMail } from "./mailer";
import { absoluteUrl, confirmEmail, welcomeEmail, type Lang } from "./email-templates";

export type SubscribeResult = { ok: true; state: "pending" } | { ok: true; state: "already" };

export type ConfirmResult =
  | { ok: true; state: "verified" | "already-verified"; lang: Lang }
  | { ok: false; state: "invalid" };

export type UnsubscribeResult =
  | { ok: true; state: "unsubscribed" | "already"; lang: Lang }
  | { ok: false; state: "invalid" };

function newToken(): string {
  return randomBytes(32).toString("hex");
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function switchLangUrls(unsubToken: string) {
  return {
    en: absoluteUrl(`/api/subscribe/language?token=${unsubToken}&lang=en`),
    zh: absoluteUrl(`/api/subscribe/language?token=${unsubToken}&lang=zh`),
  };
}

function unsubscribeUrl(unsubToken: string): string {
  return absoluteUrl(`/api/subscribe/unsubscribe?token=${unsubToken}`);
}

async function recordSend(
  subscriberId: number | null,
  email: string,
  kind: "confirm" | "welcome" | "weekly" | "test",
  lang: Lang,
  result: { sent: boolean; messageId?: string; error?: string },
  issueId?: number,
): Promise<void> {
  try {
    await getDb()
      .insert(emailSends)
      .values({
        subscriberId,
        email,
        kind,
        lang,
        status: result.sent ? "sent" : result.error ? "failed" : "skipped",
        error: result.error ?? null,
        issueId: issueId ?? null,
      });
  } catch (error) {
    console.error("[email-sends] failed to log send", error);
  }
}

/**
 * Double opt-in capture. Creates (or re-activates) a pending subscriber, then
 * emails a confirmation link. An already-verified email is a no-op.
 */
export async function subscribeEmail(rawEmail: string, lang: Lang = "en"): Promise<SubscribeResult> {
  const email = normalizeEmail(rawEmail);
  const db = getDb();
  const existing = (await db.select().from(emailSubscribers).where(eq(emailSubscribers.email, email)))[0];

  if (existing?.status === "verified") return { ok: true, state: "already" };

  const confirmToken = newToken();
  const unsubToken = newToken();

  let id: number;
  if (existing) {
    // pending or unsubscribed → re-activate as pending with fresh tokens
    await db
      .update(emailSubscribers)
      .set({
        status: "pending",
        lang,
        confirmToken,
        unsubToken,
        verifiedAt: null,
        unsubscribedAt: null,
      })
      .where(eq(emailSubscribers.id, existing.id));
    id = existing.id;
  } else {
    const [row] = await db
      .insert(emailSubscribers)
      .values({ email, status: "pending", lang, confirmToken, unsubToken })
      .$returningId();
    id = row.id;
  }

  const confirmUrl = absoluteUrl(`/api/subscribe/confirm?token=${confirmToken}`);
  const mail = confirmEmail(lang, { email, confirmUrl, switchLangUrls: switchLangUrls(unsubToken) });
  const result = await sendMail({ to: email, subject: mail.subject, text: mail.text, html: mail.html });
  await recordSend(id, email, "confirm", lang, result);
  if (!result.sent) console.log(`[mail] confirm URL (log-mode): ${confirmUrl}`);

  return { ok: true, state: "pending" };
}

/** Verify a pending subscriber via its emailed token; sends a welcome email. */
export async function confirmSubscribe(token: string): Promise<ConfirmResult> {
  const db = getDb();
  const row = (await db.select().from(emailSubscribers).where(eq(emailSubscribers.confirmToken, token)))[0];
  if (!row || row.status === "unsubscribed") return { ok: false, state: "invalid" };
  const lang = (row.lang || "en") as Lang;
  if (row.status === "verified") return { ok: true, state: "already-verified", lang };

  await db
    .update(emailSubscribers)
    .set({ status: "verified", verifiedAt: new Date() })
    .where(eq(emailSubscribers.id, row.id));

  const mail = welcomeEmail(
    lang,
    row.unsubToken
      ? {
          switchLangUrls: switchLangUrls(row.unsubToken),
          unsubUrl: unsubscribeUrl(row.unsubToken),
        }
      : undefined,
  );
  const result = await sendMail({ to: row.email, subject: mail.subject, text: mail.text, html: mail.html });
  await recordSend(row.id, row.email, "welcome", lang, result);
  return { ok: true, state: "verified", lang };
}

/** Unsubscribe via the stable token embedded in outbound emails. */
export async function unsubscribeByToken(token: string): Promise<UnsubscribeResult> {
  const db = getDb();
  const row = (await db.select().from(emailSubscribers).where(eq(emailSubscribers.unsubToken, token)))[0];
  if (!row) return { ok: false, state: "invalid" };
  const lang = (row.lang || "en") as Lang;
  if (row.status === "unsubscribed") return { ok: true, state: "already", lang };

  await db
    .update(emailSubscribers)
    .set({ status: "unsubscribed", unsubscribedAt: new Date() })
    .where(eq(emailSubscribers.id, row.id));
  return { ok: true, state: "unsubscribed", lang };
}

export type LanguageSwitchResult =
  | { ok: true; state: "updated"; lang: Lang }
  | { ok: false; state: "invalid" };

/** Switch a subscriber's email language via the stable token in outbound mail. */
export async function setLanguageByToken(
  token: string,
  lang: Lang,
): Promise<LanguageSwitchResult> {
  const db = getDb();
  const row = (
    await db.select().from(emailSubscribers).where(eq(emailSubscribers.unsubToken, token))
  )[0];
  if (!row) return { ok: false, state: "invalid" };

  await db.update(emailSubscribers).set({ lang }).where(eq(emailSubscribers.id, row.id));
  return { ok: true, state: "updated", lang };
}
