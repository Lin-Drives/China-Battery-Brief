import { describe, expect, it } from "vitest";
import { weeklyBlastEmail } from "./email-templates";

const links = {
  unsubUrl: "https://example.com/api/subscribe/unsubscribe?token=abc",
  viewOnlineUrl: "https://example.com/briefs/058",
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
});
