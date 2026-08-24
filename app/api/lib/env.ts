import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value ?? "";
}

function optional(name: string): string {
  return process.env[name] ?? "";
}

export const env = {
  isProduction: process.env.NODE_ENV === "production",
  databaseUrl: required("DATABASE_URL"),
  // Reserved for the upcoming email+password auth (see plan.md). The demo
  // runs without login, so the secret is optional until that lands.
  appSecret: process.env.APP_SECRET ?? "",
  /**
   * Absolute base URL used to build emailed confirm/unsubscribe links.
   * Production MUST set PUBLIC_BASE_URL; dev falls back to the dev server.
   */
  publicBaseUrl: optional("PUBLIC_BASE_URL") || "http://localhost:3000",
  /**
   * SMTP mail channel. Chosen as the transport because it adapts to any
   * deliverability-friendly vendor (Aliyun DirectMail, Tencent Cloud, 163/QQ
   * corporate SMTP) so mail reaches Chinese domestic mailboxes. When any of
   * HOST/USER/PASS is absent, mailer runs in log-mode (never throws), which
   * keeps dev and an un-configured production deployment alive.
   */
  mail: {
    host: optional("SMTP_HOST"),
    port: parseInt(optional("SMTP_PORT") || "465", 10),
    secure: (optional("SMTP_SECURE") || "true") === "true",
    user: optional("SMTP_USER"),
    pass: optional("SMTP_PASS"),
    fromEmail: optional("MAIL_FROM") || "brief@chinabattery.com",
    fromName: optional("MAIL_FROM_NAME") || "China Battery Brief",
  },
} as const;

/**
 * True when a real SMTP transport is available. `MAIL_DISABLED=1` forces
 * log-mode (no send) — useful for dry-running a blast or testing without
 * spamming real inboxes.
 */
export function mailEnabled(): boolean {
  if (process.env.MAIL_DISABLED === "1") return false;
  return env.mail.host !== "" && env.mail.user !== "" && env.mail.pass !== "";
}
