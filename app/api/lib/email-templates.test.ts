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
  it("sends a short Chinese summary with highlights, not the full body", () => {
    const mail = weeklyBlastEmail(
      "zh",
      {
        number: 58,
        title: "中欧混动共识的两个基准",
        dek: "本期摘要",
        readingMinutes: 9,
        highlights: [
          { tag: "capacity", text: "一期产能已售罄" },
          { tag: "risk", text: "下一道门槛是 70%" },
        ],
      },
      links,
    );

    expect(mail.subject).toBe("第 58 期 · 中欧混动共识的两个基准");
    expect(mail.html).toContain("第 58 期 · 9 分钟阅读");
    expect(mail.html).toContain("本期要点");
    expect(mail.html).toContain("产能");
    expect(mail.html).toContain("一期产能已售罄");
    expect(mail.html).toContain("阅读完整简报");
    expect(mail.text).toContain("[产能] 一期产能已售罄");
    expect(mail.text).toContain("取消订阅");
  });

  it("keeps the English summary format for English subscribers", () => {
    const mail = weeklyBlastEmail(
      "en",
      {
        number: 58,
        title: "Two Benchmarks in the China-EU Hybrid Consensus",
        dek: "This week's brief.",
        readingMinutes: 9,
        highlights: [{ tag: "capacity", text: "Phase one is fully booked" }],
      },
      links,
    );

    expect(mail.subject).toBe(
      "Issue No. 58 · Two Benchmarks in the China-EU Hybrid Consensus",
    );
    expect(mail.html).toContain("ISSUE NO. 58 · 9 MIN READ");
    expect(mail.html).toContain("IN THIS ISSUE");
    expect(mail.html).toContain("CAPACITY");
    expect(mail.html).toContain("READ THE FULL ISSUE");
    expect(mail.text).toContain("Unsubscribe");
  });

  it("omits reading time and the highlight block when both are missing", () => {
    const mail = weeklyBlastEmail(
      "zh",
      { number: 58, title: "标题", readingMinutes: null },
      links,
    );

    expect(mail.html).not.toContain("分钟阅读");
    expect(mail.html).not.toContain("本期要点");
  });

  it("caps the summary at three highlights", () => {
    const mail = weeklyBlastEmail(
      "en",
      {
        number: 58,
        title: "Title",
        highlights: [
          { tag: "capacity", text: "One" },
          { tag: "tech", text: "Two" },
          { tag: "risk", text: "Three" },
          { tag: "markets", text: "Four" },
        ],
      },
      links,
    );

    expect(mail.html).toContain("One");
    expect(mail.html).toContain("Three");
    expect(mail.html).not.toContain("Four");
  });

  it("includes language switch links in the footer", () => {
    const mail = weeklyBlastEmail(
      "zh",
      { number: 58, title: "标题", readingMinutes: 9 },
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
