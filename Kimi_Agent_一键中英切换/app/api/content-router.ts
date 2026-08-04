import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { emailSubscribers } from "@db/schema";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import {
  countIssues,
  factoryStats,
  findIssueBySlug,
  findLatestIssue,
  listFactories,
  listIssues,
  listPolicyEvents,
  listTickerItems,
} from "./queries/content";
import { isEntitled } from "./lib/entitlement";
import { OpenAccess } from "@contracts/constants";

/** Keep ~40% of markdown blocks for the free preview. */
function truncateContent(markdown: string): string {
  const blocks = markdown.split(/\n{2,}/);
  const keep = Math.max(2, Math.ceil(blocks.length * 0.4));
  return blocks.slice(0, keep).join("\n\n");
}

const PILLARS = ["overseas-capacity", "tech-routes", "geopolitics"] as const;

export const contentRouter = createRouter({
  /* ----- Issues ----- */
  "issues.list": publicQuery
    .input(
      z
        .object({
          pillar: z.enum(PILLARS).optional(),
          q: z.string().max(120).optional(),
          limit: z.number().int().min(1).max(100).optional(),
          offset: z.number().int().min(0).optional(),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const [rows, total] = await Promise.all([listIssues(input ?? {}), countIssues()]);
      return { issues: rows, total };
    }),

  "issues.latest": publicQuery.query(async () => {
    const latest = await findLatestIssue();
    if (!latest) return null;
    const { content: _c, contentZh: _cz, ...meta } = latest;
    return meta;
  }),

  "issues.bySlug": publicQuery
    .input(z.object({ slug: z.string().min(1).max(255) }))
    .query(async ({ ctx, input }) => {
      const issue = await findIssueBySlug(input.slug);
      if (!issue) throw new TRPCError({ code: "NOT_FOUND", message: "Issue not found" });
      const entitled = OpenAccess.beta || issue.isFree || (await isEntitled(ctx.user));
      if (entitled) {
        return { ...issue, paywalled: false as const };
      }
      return {
        ...issue,
        content: truncateContent(issue.content),
        contentZh: issue.contentZh ? truncateContent(issue.contentZh) : null,
        paywalled: true as const,
      };
    }),

  /* ----- Factories ----- */
  "factories.list": publicQuery
    .input(
      z
        .object({
          company: z.string().max(100).optional(),
          status: z.enum(["operating", "construction", "announced", "paused", "suspended"]).optional(),
          region: z.string().max(100).optional(),
        })
        .optional(),
    )
    .query(({ input }) => listFactories(input ?? {})),

  "factories.stats": publicQuery.query(() => factoryStats()),

  /* ----- Policy / Risk Radar ----- */
  "policy.list": publicQuery
    .input(
      z
        .object({
          region: z.string().max(50).optional(),
          category: z.enum(["ira", "passport", "tariff", "export", "other"]).optional(),
        })
        .optional(),
    )
    .query(({ input }) => listPolicyEvents(input ?? {})),

  /** Curated threat-board + country exposure scores (updated weekly by the desk). */
  "risk.scores": publicQuery.query(() => ({
    threats: [
      { id: "ira-feoc", label: "US — OBBBA / PFE licensing rules", labelZh: "美国 — OBBBA / PFE 许可规则", score: 86, delta: 4, summary: "45X credits now deny projects using FEOC-licensed technology; Ford-CATL LRS structure is the test case.", summaryZh: "45X 税收抵免如今拒绝采用 FEOC 许可技术的项目；福特—宁德时代 LRS 授权结构成为试金石。" },
      { id: "eu-tariffs", label: "EU — BEV & PHEV anti-subsidy duties", labelZh: "欧盟 — 纯电与插混反补贴税", score: 78, delta: 6, summary: "BEV duties up to 45.3% stand while price-undertaking talks stall; PHEV probe would close the last loophole.", summaryZh: "纯电车最高 45.3% 的反补贴税维持不变，价格承诺谈判停滞；针对插混的调查将堵住最后一个漏洞。" },
      { id: "cn-export", label: "China — battery tech export controls", labelZh: "中国 — 电池技术出口管制", score: 62, delta: -8, summary: "LFP/LMFP cathode tech licensed only; Oct-2025 equipment controls suspended one year under the trade truce.", summaryZh: "LFP/LMFP 正极技术只能以许可方式输出；2025 年 10 月的设备管制依贸易休战暂停一年。" },
      { id: "eu-passport", label: "EU — battery passport (2027-02-18)", labelZh: "欧盟 — 电池护照（2027-02-18）", score: 54, delta: 3, summary: "Fixed statutory date, methodology acts still missing; declaration duties slide, the passport does not.", summaryZh: "法定日期雷打不动，方法论授权法案仍然缺席；碳足迹申报义务可以顺延，电池护照不行。" },
    ],
    countries: [
      { code: "HU", name: "Hungary", nameZh: "匈牙利", score: 34, status: "construction", sites: 4, gwhAtRisk: 0, lastEvent: "BYD Szeged trial production Jan 2026", lastEventZh: "比亚迪塞格德 2026 年 1 月启动试生产" },
      { code: "DE", name: "Germany", nameZh: "德国", score: 41, status: "operating", sites: 3, gwhAtRisk: 0, lastEvent: "Gotion Göttingen BESS series output May 2026", lastEventZh: "国轩哥廷根 2026 年 5 月量产 5 MWh 储能柜" },
      { code: "ES", name: "Spain", nameZh: "西班牙", score: 45, status: "construction", sites: 2, gwhAtRisk: 0, lastEvent: "CATL-Stellantis groundbreaking Nov 2025", lastEventZh: "宁德时代—Stellantis 合资厂 2025 年 11 月奠基" },
      { code: "US", name: "United States", nameZh: "美国", score: 88, status: "paused", sites: 3, gwhAtRisk: 60, lastEvent: "Gotion Michigan cancelled; PFE rules hit licensing", lastEventZh: "国轩密歇根项目取消；PFE 规则冲击技术许可模式" },
      { code: "BR", name: "Brazil", nameZh: "巴西", score: 57, status: "operating", sites: 1, gwhAtRisk: 0, lastEvent: "BYD on dirty list Apr 2026; 100k vehicles Jul 2026", lastEventZh: "比亚迪 2026 年 4 月被列入“脏名单”；7 月第 10 万辆下线" },
      { code: "ID", name: "Indonesia", nameZh: "印度尼西亚", score: 38, status: "construction", sites: 3, gwhAtRisk: 0, lastEvent: "CATL $6bn integrated project EPC underway", lastEventZh: "宁德时代 60 亿美元一体化项目 EPC 施工推进中" },
      { code: "MA", name: "Morocco", nameZh: "摩洛哥", score: 30, status: "construction", sites: 1, gwhAtRisk: 0, lastEvent: "Gotion Kenitra targets Q3 2026 production", lastEventZh: "国轩盖尼特拉工厂瞄准 2026 年三季度投产" },
      { code: "PT", name: "Portugal", nameZh: "葡萄牙", score: 33, status: "announced", sites: 1, gwhAtRisk: 0, lastEvent: "CALB Sines €350m incentives formalized Jan 2026", lastEventZh: "中创新航锡尼什 3.5 亿欧元补贴 2026 年 1 月正式落地" },
      { code: "TR", name: "Turkey", nameZh: "土耳其", score: 71, status: "paused", sites: 1, gwhAtRisk: 20, lastEvent: "BYD Manisa on hold; Hungary prioritized", lastEventZh: "比亚迪马尼萨项目搁置；匈牙利被列为一号优先" },
    ],
  })),

  /* ----- Ticker ----- */
  "ticker.items": publicQuery.query(() => listTickerItems()),

  /* ----- Email capture (footer / free tier) ----- */
  "subscribe.email": publicQuery
    .input(z.object({ email: z.string().email().max(320) }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db
        .insert(emailSubscribers)
        .values({ email: input.email })
        .onDuplicateKeyUpdate({ set: { email: input.email } });
      return { ok: true as const };
    }),
});
