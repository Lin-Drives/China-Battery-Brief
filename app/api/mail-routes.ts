import { Hono } from "hono";
import { absoluteUrl, type Lang } from "./lib/email-templates";
import { confirmSubscribe, unsubscribeByToken } from "./lib/subscribe";
import { rateLimit } from "./lib/rate-limit";

const INK = "#0C1017";
const PAPER = "#F4F0E6";
const VOLT = "#C9F24B";

type PageCopy = {
  title: string;
  message: string;
  button: string;
  note?: string;
};

const PAGES: Record<Lang, Record<string, PageCopy>> = {
  en: {
    confirmed: {
      title: "You're confirmed",
      message: "You're on the list. The next issue lands in your inbox Thursday 06:00 UTC.",
      button: "Go to the brief",
    },
    alreadyConfirmed: {
      title: "Already on the list",
      message: "Your email was already confirmed. Nothing more to do.",
      button: "Go to the brief",
    },
    unsubscribed: {
      title: "You've been unsubscribed",
      message: "You'll no longer receive the weekly brief. You can re-subscribe any time.",
      button: "Back to the brief",
    },
    alreadyUnsubscribed: {
      title: "Already unsubscribed",
      message: "You were already taken off the list.",
      button: "Back to the brief",
    },
    invalid: {
      title: "This link has expired",
      message: "The link you followed isn't valid or has already been used. Please re-subscribe from the site.",
      button: "Go to the brief",
    },
  },
  zh: {
    confirmed: {
      title: "已确认",
      message: "你已加入订阅名单。下一期简报将在每周四 06:00 UTC 送达你的收件箱",
      button: "前往简报",
    },
    alreadyConfirmed: {
      title: "已在名单上",
      message: "你的邮箱此前已确认，无需再操作",
      button: "前往简报",
    },
    unsubscribed: {
      title: "已取消订阅",
      message: "你以后不会再收到每周简报，随时可以重新订阅",
      button: "返回简报",
    },
    alreadyUnsubscribed: {
      title: "此前已取消",
      message: "你此前已从名单中移除",
      button: "返回简报",
    },
    invalid: {
      title: "链接已失效",
      message: "你访问的链接无效或已使用。请到网站重新订阅",
      button: "前往简报",
    },
  },
};

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function pageHtml(lang: Lang, copy: PageCopy): string {
  return `<!doctype html>
<html lang="${lang === "zh" ? "zh-CN" : "en"}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(copy.title)}</title>
  </head>
  <body style="margin:0;padding:0;background:${INK};color:${PAPER};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${INK}">
      <tr><td align="center" style="padding:64px 16px">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">
          <tr><td style="border-bottom:2px solid ${VOLT};padding-bottom:16px">
            <div style="font-size:13px;font-weight:700;letter-spacing:0.22em;color:${VOLT};text-transform:uppercase">CHINA BATTERY BRIEF</div>
          </td></tr>
          <tr><td style="padding:32px 0 0;font-size:28px;line-height:1.25;font-weight:700;color:${PAPER}">${escapeHtml(copy.title)}</td></tr>
          <tr><td style="padding:12px 0 20px;font-size:16px;line-height:1.7;color:${PAPER}">${escapeHtml(copy.message)}</td></tr>
          <tr><td>
            <a href="${escapeHtml(absoluteUrl("/"))}" style="display:inline-block;padding:13px 26px;background:${VOLT};color:${INK};font-size:14px;font-weight:700;letter-spacing:0.06em;text-decoration:none;text-transform:uppercase;border-radius:2px">${escapeHtml(copy.button)}</a>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

export const mailRoutes = new Hono();

mailRoutes.get(
  "/api/subscribe/confirm",
  rateLimit({ windowMs: 60_000, max: 30, prefix: "confirm-link" }),
  async (c) => {
    const token = c.req.query("token") ?? "";
    const result = await confirmSubscribe(token);
    const lang: Lang = result.ok ? result.lang : "en";
    const copy = result.ok
      ? result.state === "verified"
        ? PAGES[lang].confirmed
        : PAGES[lang].alreadyConfirmed
      : PAGES[lang].invalid;
    return c.html(pageHtml(lang, copy));
  },
);

mailRoutes.get(
  "/api/subscribe/unsubscribe",
  rateLimit({ windowMs: 60_000, max: 30, prefix: "unsub-link" }),
  async (c) => {
    const token = c.req.query("token") ?? "";
    const result = await unsubscribeByToken(token);
    const lang: Lang = result.ok ? result.lang : "en";
    const copy = result.ok
      ? result.state === "unsubscribed"
        ? PAGES[lang].unsubscribed
        : PAGES[lang].alreadyUnsubscribed
      : PAGES[lang].invalid;
    return c.html(pageHtml(lang, copy));
  },
);
