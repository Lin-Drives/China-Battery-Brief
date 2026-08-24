import { marked } from "marked";
import { env } from "./env";

export type Lang = "en" | "zh";

export type RenderedEmail = {
  subject: string;
  text: string;
  html: string;
};

/* ----- Brand palette (ink-900 / paper / volt) for inline-lit emails ----- */
const INK = "#0C1017";
const PAPER = "#F4F0E6";
const VOLT = "#C9F24B";
const MUTED = "#8E97A8";

const COPY: Record<Lang, Record<string, string>> = {
  en: {
    brandName: "CHINA BATTERY BRIEF",
    confirmSubject: "Confirm your subscription — China Battery Brief",
    confirmHeading: "Confirm your email",
    confirmIntro:
      "You're almost on the list. Tap the button below to confirm your email and start getting the weekly brief.",
    confirmButton: "CONFIRM MY EMAIL",
    confirmIgnore:
      "If you didn't ask for this, you can safely ignore this email. We won't add you to the list until you confirm.",
    welcomeSubject: "You're on the list — China Battery Brief",
    welcomeHeading: "Welcome aboard",
    welcomeIntro:
      "Your email is confirmed. The next issue lands in your inbox Thursday 06:00 UTC.",
    footerRights:
      "You're receiving this because you subscribed to the China Battery Brief.",
    unsubscribe: "Unsubscribe",
    viewOnline: "View online",
    sentBy: "Sent by",
  },
  zh: {
    brandName: "中国电池简报",
    confirmSubject: "确认订阅 — 中国电池简报",
    confirmHeading: "确认你的邮箱",
    confirmIntro:
      "你只差一步就到订阅名单了。点击下方按钮确认邮箱，即可开始收取每周简报",
    confirmButton: "确认我的邮箱",
    confirmIgnore:
      "如果这不是你的操作，可以放心忽略这封邮件。在你确认之前，我们不会把你加入订阅名单",
    welcomeSubject: "订阅成功 — 中国电池简报",
    welcomeHeading: "欢迎加入",
    welcomeIntro: "你的邮箱已确认。下一期简报将在每周四 06:00 UTC 送达你的收件箱",
    footerRights: "你收到这封邮件，是因为订阅了《中国电池简报》",
    unsubscribe: "取消订阅",
    viewOnline: "在线查看",
    sentBy: "发件方",
  },
};

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Minimal header/footer shell with inline styles for broad client support. */
function shell(opts: {
  preheader: string;
  brandName: string;
  heading: string;
  bodyHtml: string;
  footerHtml: string;
}): string {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(opts.heading)}</title>
  </head>
  <body style="margin:0;padding:0;background:${INK};color:${PAPER};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
    <span style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(opts.preheader)}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${INK}">
      <tr><td align="center" style="padding:32px 16px">
        <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%">
          <tr>
            <td style="padding-bottom:24px;border-bottom:2px solid ${VOLT}">
              <div style="font-size:14px;font-weight:700;letter-spacing:0.22em;color:${VOLT};text-transform:uppercase">${escapeHtml(opts.brandName)}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 0 8px;font-size:26px;line-height:1.25;font-weight:700;color:${PAPER}">${escapeHtml(opts.heading)}</td>
          </tr>
          <tr>
            <td style="padding:8px 0 24px;font-size:15px;line-height:1.7;color:${PAPER}">${opts.bodyHtml}</td>
          </tr>
          <tr>
            <td style="padding:20px 0 8px;border-top:1px solid rgba(244,240,230,0.14);font-size:12px;line-height:1.6;color:${MUTED}">${opts.footerHtml}</td>
          </tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

function buttonHtml(href: string, label: string): string {
  return `<a href="${escapeHtml(href)}" style="display:inline-block;margin:12px 0 8px;padding:14px 26px;background:${VOLT};color:${INK};font-size:14px;font-weight:700;letter-spacing:0.06em;text-decoration:none;text-transform:uppercase;border-radius:2px">${escapeHtml(label)}</a>`;
}

/* ----- Transactional: double opt-in confirmation ----- */
export function confirmEmail(
  lang: Lang = "en",
  opts: { email: string; confirmUrl: string },
): RenderedEmail {
  const c = COPY[lang];
  const bodyHtml =
    `<p>${escapeHtml(c.confirmIntro)}</p>` +
    buttonHtml(opts.confirmUrl, c.confirmButton) +
    `<p style="font-size:12px;color:${MUTED}">${escapeHtml(c.confirmIgnore)}</p>`;
  const footerHtml =
    `<p>${escapeHtml(c.footerRights)}</p>` +
    `<p><a href="${escapeHtml(opts.confirmUrl)}" style="color:${VOLT};text-decoration:none">${escapeHtml(c.confirmButton)}</a></p>`;
  return {
    subject: c.confirmSubject,
    text: `${c.confirmIntro}\n\n${opts.confirmUrl}\n\n${c.confirmIgnore}`,
    html: shell({
      preheader: c.confirmIntro,
      brandName: c.brandName,
      heading: c.confirmHeading,
      bodyHtml,
      footerHtml,
    }),
  };
}

/* ----- Transactional: verified / welcome ----- */
export function welcomeEmail(lang: Lang = "en"): RenderedEmail {
  const c = COPY[lang];
  const bodyHtml = `<p>${escapeHtml(c.welcomeIntro)}</p>`;
  const footerHtml = `<p>${escapeHtml(c.footerRights)}</p>`;
  return {
    subject: c.welcomeSubject,
    text: c.welcomeIntro,
    html: shell({
      preheader: c.welcomeIntro,
      brandName: c.brandName,
      heading: c.welcomeHeading,
      bodyHtml,
      footerHtml,
    }),
  };
}

/** Convert issue markdown to HTML (headings, lists, links, quotes, tables). */
function renderMarkdown(md: string): string {
  return marked.parse(md) as string;
}

/* ----- Weekly blast: the issue itself ----- */
export function weeklyBlastEmail(
  lang: Lang = "en",
  issue: { number: number; title: string; dek?: string | null; content: string; readingMinutes?: number | null },
  opts: { unsubUrl: string; viewOnlineUrl: string },
): RenderedEmail {
  const c = COPY[lang];
  const subject = `Issue No. ${issue.number} · ${issue.title}`;
  const dek = issue.dek ? `<div style="font-size:15px;line-height:1.7;color:${MUTED};margin:4px 0 20px">${escapeHtml(issue.dek)}</div>` : "";
  const bodyHtml =
    `<div style="font-size:13px;font-weight:700;letter-spacing:0.18em;color:${VOLT};text-transform:uppercase">ISSUE NO. ${issue.number}${issue.readingMinutes ? ` · ${issue.readingMinutes} MIN READ` : ""}</div>` +
    dek +
    `<div style="font-size:15px;line-height:1.8;color:${PAPER}">${renderMarkdown(issue.content)}</div>` +
    `<p style="margin:24px 0 0;font-size:13px"><a href="${escapeHtml(opts.viewOnlineUrl)}" style="color:${VOLT};text-decoration:none">${escapeHtml(c.viewOnline)} →</a></p>`;
  const footerHtml =
    `<p>${escapeHtml(c.footerRights)}</p>` +
    `<p><a href="${escapeHtml(opts.unsubUrl)}" style="color:${MUTED};text-decoration:underline">${escapeHtml(c.unsubscribe)}</a></p>`;
  return {
    subject,
    text: `Issue No. ${issue.number} · ${issue.title}\n\n${issue.dek ?? ""}\n\n${issue.content}\n\n${opts.viewOnlineUrl}\n\n${c.unsubscribe}: ${opts.unsubUrl}`,
    html: shell({
      preheader: subject,
      brandName: c.brandName,
      heading: issue.title,
      bodyHtml,
      footerHtml,
    }),
  };
}

/** Build an absolute app URL (uses PUBLIC_BASE_URL). */
export function absoluteUrl(path: string): string {
  const base = env.publicBaseUrl.replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
