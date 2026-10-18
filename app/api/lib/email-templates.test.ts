import { describe, expect, it } from "vitest";
import { confirmEmail, smtpTestEmail, weeklyBlastEmail, welcomeEmail } from "./email-templates";

const switchLangUrls = {
  en: "https://example.com/api/subscribe/language?token=abc&lang=en",
  zh: "https://example.com/api/subscribe/language?token=abc&lang=zh",
};

const links = {
  unsubUrl: "https://example.com/api/subscribe/unsubscribe?token=abc",
  viewOnlineUrl: "https://example.com/briefs/058",
  switchLangUrls,
};

describe("weeklyBlastEmail", () => {
  it("localizes subject and kicker for Chinese subscribers", () => {
    const mail = weeklyBlastEmail(
      "zh",
      {
        number: 58,
        title: "中欧混动共识的两个基准",
        dek: "本期摘要",
        content: "正文内容",
        readingMinutes: 9,
      },
      links,
    );

    expect(mail.subject).toBe("第 58 期 · 中欧混动共识的两个基准");
    expect(mail.html).toContain("第 58 期 · 9 分钟阅读");
    expect(mail.html).toContain("中欧混动共识的两个基准");
    expect(mail.text).toContain("第 58 期 · 中欧混动共识的两个基准");
    expect(mail.text).toContain("取消订阅");
  });

  it("keeps the English format for English subscribers", () => {
    const mail = weeklyBlastEmail(
      "en",
      {
        number: 58,
        title: "Two Benchmarks in the China-EU Hybrid Consensus",
        dek: "This week's brief.",
        content: "Body copy.",
        readingMinutes: 9,
      },
      links,
    );

    expect(mail.subject).toBe(
      "Issue No. 58 · Two Benchmarks in the China-EU Hybrid Consensus",
    );
    expect(mail.html).toContain("ISSUE NO. 58 · 9 MIN READ");
    expect(mail.text).toContain("Unsubscribe");
  });

  it("omits reading time when it is unknown", () => {
    const mail = weeklyBlastEmail(
      "zh",
      { number: 58, title: "标题", content: "正文", readingMinutes: null },
      links,
    );

    expect(mail.html).not.toContain("分钟阅读");
  });

  it("includes language switch links in the footer", () => {
    const mail = weeklyBlastEmail(
      "zh",
      { number: 58, title: "标题", content: "正文", readingMinutes: 9 },
      links,
    );

    expect(mail.html).toContain("lang=en");
    expect(mail.html).toContain("lang=zh");
    expect(mail.html).toContain("English");
    expect(mail.html).toContain("中文");
  });
});

describe("confirmEmail", () => {
  it("lets a pending subscriber switch language before confirming", () => {
    const mail = confirmEmail("en", {
      email: "reader@example.com",
      confirmUrl: "https://example.com/api/subscribe/confirm?token=confirm",
      switchLangUrls,
    });

    expect(mail.subject).toBe("Confirm your subscription — China Battery Brief");
    expect(mail.html).toContain("lang=zh");
    expect(mail.text).toContain("中文");
  });
});

describe("welcomeEmail", () => {
  it("includes language and unsubscribe links", () => {
    const mail = welcomeEmail("zh", {
      switchLangUrls,
      unsubUrl: links.unsubUrl,
    });

    expect(mail.subject).toBe("订阅成功 — 中国电池出海简报");
    expect(mail.html).toContain("lang=en");
    expect(mail.html).toContain("取消订阅");
  });
});

describe("smtpTestEmail", () => {
  it("uses Chinese copy for Chinese test sends", () => {
    const mail = smtpTestEmail("zh");

    expect(mail.subject).toBe("SMTP 测试 — 中国电池出海简报");
    expect(mail.text).toContain("邮件通道已配置成功");
  });

  it("uses English copy for English test sends", () => {
    const mail = smtpTestEmail("en");

    expect(mail.subject).toBe("SMTP test — China Battery Brief");
    expect(mail.text).toContain("mail channel is configured");
  });
});
