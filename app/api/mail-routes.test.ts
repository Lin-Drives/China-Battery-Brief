import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./lib/subscribe", () => ({
  confirmSubscribe: vi.fn(),
  unsubscribeByToken: vi.fn(),
  setLanguageByToken: vi.fn(),
}));

import { mailRoutes } from "./mail-routes";
import { setLanguageByToken } from "./lib/subscribe";

const mockedSetLanguage = vi.mocked(setLanguageByToken);

async function postLanguage(body: Record<string, string>): Promise<Response> {
  return await mailRoutes.request("http://localhost/api/subscribe/language", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body).toString(),
  });
}

describe("language switch route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET renders a confirmation form without changing state", async () => {
    const res = await mailRoutes.request(
      "http://localhost/api/subscribe/language?token=abc&lang=zh",
    );

    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('name="token" value="abc"');
    expect(html).toContain('name="lang" value="zh"');
    expect(mockedSetLanguage).not.toHaveBeenCalled();
  });

  it("GET rejects an unsupported language", async () => {
    const res = await mailRoutes.request(
      "http://localhost/api/subscribe/language?token=abc&lang=fr",
    );

    expect(res.status).toBe(400);
  });

  it("POST updates the language and renders the updated page", async () => {
    mockedSetLanguage.mockResolvedValue({ ok: true, state: "updated", lang: "zh" });

    const res = await postLanguage({ token: "abc", lang: "zh" });

    expect(res.status).toBe(200);
    expect(mockedSetLanguage).toHaveBeenCalledWith("abc", "zh");
    expect(await res.text()).toContain("语言已更新");
  });

  it("POST returns 400 for an invalid token", async () => {
    mockedSetLanguage.mockResolvedValue({ ok: false, state: "invalid" });

    const res = await postLanguage({ token: "bad", lang: "en" });

    expect(res.status).toBe(400);
    expect(await res.text()).toContain("This link has expired");
  });
});
