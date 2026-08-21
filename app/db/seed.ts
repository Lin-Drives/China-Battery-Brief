import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { sql } from "drizzle-orm";
import { getDb } from "../api/queries/connection";
import { factories, issues, plans, policyEvents, tickerItems } from "./schema";
import type { Highlight, SourceRef } from "./schema";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function seed() {
  const db = getDb();
  console.log("Seeding China Battery Brief database...");

  /* ---------- Plans ---------- */
  await db
    .insert(plans)
    .values([
      { code: "free", name: "The Sample", tier: "free", priceCents: 0, interval: "forever", features: ["One open brief every month", "Weekly headline digest email", "Tracker: browse all sites"] },
      { code: "pro-monthly", name: "The Brief", tier: "pro", priceCents: 1900, interval: "month", features: ["Every weekly brief, full, Thursday 06:00 UTC", "Complete archive", "Full tracker: timelines, sources, CSV export", "Risk radar email alerts", "Save & annotate briefs"] },
      { code: "pro-annual", name: "The Brief (Annual)", tier: "pro", priceCents: 19000, interval: "year", features: ["Everything in Pro monthly", "2 months free"] },
      { code: "desk-monthly", name: "The Desk", tier: "desk", priceCents: 49900, interval: "month", features: ["Everything in Pro", "5 seats, shared workspace", "REST API — issues, factories, policy feed", "Quarterly bespoke memo", "Monthly analyst call"] },
      { code: "desk-annual", name: "The Desk (Annual)", tier: "desk", priceCents: 499000, interval: "year", features: ["Everything in Desk monthly", "2 months free"] },
    ])
    .onDuplicateKeyUpdate({ set: { name: sql`values(name)` } });
  console.log("plans ✓");

  /* ---------- Issues (from db/seed-content) ---------- */
  const meta = JSON.parse(readFileSync(join(__dirname, "seed-content", "issues.json"), "utf8")) as Array<{
    number: number; slug: string; title: string; dek: string; publishedAt: string;
    isFree: boolean; pillars: string[]; readingMinutes: number; coverAsset: string;
    contentFile: string; sources: SourceRef[]; highlights: Highlight[];
  }>;
  /* Chinese translations (optional — present after i18n backfill). */
  let zhMeta: Array<{ slug: string; titleZh: string; dekZh: string; contentFileZh: string; highlightsZh: Highlight[] }> = [];
  try {
    zhMeta = JSON.parse(readFileSync(join(__dirname, "seed-content-zh", "issues-zh.json"), "utf8"));
  } catch {
    console.log("no seed-content-zh — skipping zh backfill");
  }
  for (const m of meta) {
    const content = readFileSync(join(__dirname, "seed-content", m.contentFile), "utf8");
    const zh = zhMeta.find((z) => z.slug === m.slug);
    const contentZh = zh ? readFileSync(join(__dirname, "seed-content-zh", zh.contentFileZh), "utf8") : null;
    await db
      .insert(issues)
      .values({
        number: m.number,
        slug: m.slug,
        title: m.title,
        dek: m.dek,
        titleZh: zh?.titleZh ?? null,
        dekZh: zh?.dekZh ?? null,
        publishedAt: new Date(m.publishedAt),
        isFree: m.isFree,
        pillars: m.pillars,
        readingMinutes: m.readingMinutes,
        coverAsset: m.coverAsset,
        content,
        contentZh,
        highlights: m.highlights,
        highlightsZh: zh?.highlightsZh ?? null,
        sources: m.sources,
      })
      .onDuplicateKeyUpdate({
        set: {
          title: m.title,
          content,
          dek: m.dek,
          pillars: m.pillars,
          isFree: m.isFree,
          publishedAt: new Date(m.publishedAt),
          readingMinutes: m.readingMinutes,
          coverAsset: m.coverAsset,
          sources: m.sources,
          titleZh: zh?.titleZh ?? null,
          dekZh: zh?.dekZh ?? null,
          contentZh,
          highlights: m.highlights,
          highlightsZh: zh?.highlightsZh ?? null,
        },
      });
  }
  console.log(`issues ✓ (${meta.length}, zh: ${zhMeta.length})`);

  /* ---------- Factories (Global Factory Tracker, 2026-08 fact base) ---------- */
  await db
    .insert(factories)
    .values([
      { company: "CATL", siteName: "Debrecen P1", country: "Hungary", countryCode: "HU", city: "Debrecen", lat: 47.53, lng: 21.63, status: "construction", capacityGwh: 100, chemistry: ["LFP", "NMC"], sopDate: "2026", partners: ["BMW (reported)", "Mercedes-Benz (reported)"], sourceUrls: ["https://www.china-ceec.org"], notes: "Phase-1 40 GWh fully booked; cell production early 2026; €7.34bn total investment." },
      { company: "CATL", siteName: "Zaragoza JV (Contemporary Star Energy)", country: "Spain", countryCode: "ES", city: "Figueruelas", lat: 41.65, lng: -0.88, status: "construction", capacityGwh: 50, chemistry: ["LFP"], sopDate: "2026-2028", partners: ["Stellantis (50/50)"], sourceUrls: ["https://electrive.com"], notes: "€4.1bn; groundbreaking 2025-11-26; >€300m EU funding." },
      { company: "CATL", siteName: "Karawang (Dragon project)", country: "Indonesia", countryCode: "ID", city: "Karawang", lat: -6.35, lng: 107.3, status: "construction", capacityGwh: 6.9, chemistry: ["NMC"], sopDate: "2026-2028", partners: ["Antam", "IBC"], sourceUrls: ["https://batterytechonline.com"], notes: "~$6bn nickel-to-battery integration; phase-1 6.9 GWh/yr." },
      { company: "CATL (lic.)", siteName: "BlueOval Battery Park Michigan", country: "USA", countryCode: "US", city: "Marshall, MI", lat: 42.27, lng: -84.96, status: "construction", capacityGwh: 20, chemistry: ["LFP"], sopDate: "2026", partners: ["Ford (LRS licensee)"], sourceUrls: ["https://fordauthority.com"], notes: "Wholly Ford-owned; CATL LFP licensing (LRS). Cut from 35→20 GWh; PFE rules threaten 45X." },
      { company: "CATL", siteName: "Erfurt (CATT)", country: "Germany", countryCode: "DE", city: "Arnstadt", lat: 50.83, lng: 10.95, status: "operating", capacityGwh: 14, chemistry: ["NMC"], sopDate: "2022", partners: [], sourceUrls: [], notes: "CATL's first European plant, ~€1.8bn." },
      { company: "BYD", siteName: "Camaçari", country: "Brazil", countryCode: "BR", city: "Camaçari, Bahia", lat: -12.7, lng: -38.32, status: "operating", capacityGwh: 15, chemistry: ["LFP"], sopDate: "2025", partners: [], sourceUrls: ["https://globalchinaev.com"], notes: "100,000th vehicle 2026-07-16; on Brazil 'dirty list' Apr 2026 over contractor labor abuses." },
      { company: "BYD", siteName: "Szeged", country: "Hungary", countryCode: "HU", city: "Szeged", lat: 46.25, lng: 20.15, status: "construction", capacityGwh: 30, chemistry: ["LFP"], sopDate: "2026 Q2", partners: [], sourceUrls: ["https://electrive.com"], notes: "Trial production Jan 2026; series production Q2 2026; up to 300k vehicles/yr planned." },
      { company: "BYD", siteName: "Manisa", country: "Turkey", countryCode: "TR", city: "Manisa", lat: 38.61, lng: 27.43, status: "paused", capacityGwh: 20, chemistry: ["LFP"], sopDate: "—", partners: [], sourceUrls: ["https://turkiyetoday.com"], notes: "$1bn deal signed Jul 2024; on hold — Hungary prioritized." },
      { company: "BYD", siteName: "Subang", country: "Indonesia", countryCode: "ID", city: "Subang, West Java", lat: -6.57, lng: 107.76, status: "construction", capacityGwh: 10, chemistry: ["LFP"], sopDate: "2026 Q3", partners: [], sourceUrls: [], notes: "$1bn; RHD export hub; mass production targeted Q3 2026." },
      { company: "BYD", siteName: "Rayong", country: "Thailand", countryCode: "TH", city: "Rayong", lat: 12.68, lng: 101.25, status: "operating", capacityGwh: 6, chemistry: ["LFP"], sopDate: "2024", partners: [], sourceUrls: [], notes: "150k vehicles/yr; exports to Europe began Aug 2025." },
      { company: "EVE", siteName: "Debrecen (46xx cylindrical)", country: "Hungary", countryCode: "HU", city: "Debrecen", lat: 47.55, lng: 21.6, status: "construction", capacityGwh: 28, chemistry: ["NMC 46xx"], sopDate: "2027", partners: ["BMW program"], sourceUrls: ["https://en.evebattery.hu"], notes: "~€1bn; construction start Sept 2025; mass production 2027." },
      { company: "EVE", siteName: "Kulim", country: "Malaysia", countryCode: "MY", city: "Kulim, Kedah", lat: 5.36, lng: 100.55, status: "operating", capacityGwh: 10, chemistry: ["LFP", "cylindrical 21700"], sopDate: "2025", partners: [], sourceUrls: ["https://cnevpost.com"], notes: "First cell 2025-02-16; Phase II completed Feb 2026 (684m cells/yr design)." },
      { company: "Gotion", siteName: "Göttingen", country: "Germany", countryCode: "DE", city: "Göttingen", lat: 51.53, lng: 9.93, status: "operating", capacityGwh: 5, chemistry: ["LFP"], sopDate: "2023", partners: ["Volkswagen (~26% shareholder)"], sourceUrls: [], notes: "First European base; 5-MWh BESS series output May 2026 with TÜV cert." },
      { company: "Gotion", siteName: "Kenitra", country: "Morocco", countryCode: "MA", city: "Kenitra", lat: 34.26, lng: -6.58, status: "construction", capacityGwh: 20, chemistry: ["LFP"], sopDate: "2026 Q3", partners: [], sourceUrls: ["https://reuters.com"], notes: "Africa's first gigafactory; $1.3bn initial, scalable to 100 GWh." },
      { company: "Gotion", siteName: "Manteno", country: "USA", countryCode: "US", city: "Manteno, IL", lat: 41.25, lng: -87.83, status: "paused", capacityGwh: 40, chemistry: ["LFP"], sopDate: "2027", partners: [], sourceUrls: [], notes: "Pack Line A running (BESS focus); cell output pushed to 2027; SFE listing blocks 45X." },
      { company: "SVOLT", siteName: "Ueberherrn", country: "Germany", countryCode: "DE", city: "Ueberherrn", lat: 49.24, lng: 6.7, status: "suspended", capacityGwh: 24, chemistry: ["NMC"], sopDate: "—", partners: [], sourceUrls: [], notes: "Suspended." },
      { company: "CALB", siteName: "Sines", country: "Portugal", countryCode: "PT", city: "Sines", lat: 37.96, lng: -8.87, status: "announced", capacityGwh: 15, chemistry: ["LFP", "NMC"], sopDate: "2027-2028", partners: [], sourceUrls: ["https://ess-news.com"], notes: "€2.07bn 'Zero-Carbon AI Gigafactory'; €350m incentives formalized Jan 2026; Phase-1 build to Jul 2028." },
      { company: "Sunwoda", siteName: "Nyíregyháza", country: "Hungary", countryCode: "HU", city: "Nyíregyháza", lat: 47.95, lng: 21.72, status: "construction", capacityGwh: 20, chemistry: ["NMC"], sopDate: "2026-2027", partners: [], sourceUrls: ["https://euractiv.com"], notes: "~€1.43bn greenfield; EU approved €264m state aid Aug 2025." },
      { company: "Envision AESC", siteName: "Bowling Green", country: "USA", countryCode: "US", city: "Bowling Green, KY", lat: 36.98, lng: -86.44, status: "construction", capacityGwh: 30, chemistry: ["NMC"], sopDate: "2026-2027", partners: ["Nissan"], sourceUrls: [], notes: "Under construction as of Apr 2026." },
    ])
    .onDuplicateKeyUpdate({ set: { status: sql`values(status)`, capacityGwh: sql`values(capacityGwh)`, notes: sql`values(notes)` } });
  console.log("factories ✓");

  /* ---------- Policy events (Policy Desk — China's rulebook) ---------- */
  await db
    .insert(policyEvents)
    .values([
      { region: "CN", title: "MIIT ~RMB 6bn all-solid-state special fund", titleZh: "工信部约 60 亿元全固态专项基金", date: new Date("2024-06-01"), severity: 55, category: "other", summary: "Six players (CATL, BYD, FAW, SAIC, WeLion, Geely) funded across sulfide/polymer routes; mid-term review Sept 2025.", summaryZh: "宁德时代、比亚迪、一汽、上汽、卫蓝、吉利六家入选，覆盖硫化物与聚合物路线；2025 年 9 月中期审查", link: "" },
      { region: "CN", title: "T/CSAE 434-2025 — world's first all-solid-state definition", titleZh: "T/CSAE 434-2025——全球首个全固态电池判定团标", date: new Date("2025-05-09"), severity: 45, category: "other", summary: "China Society of Automotive Engineers issues the first group standard defining what counts as all-solid-state.", summaryZh: "中国汽车工程学会发布全球首个团体标准，明确「何为全固态电池」的判定方法", link: "" },
      { region: "CN", title: "China restricts LFP/LMFP cathode technology exports", titleZh: "中国限制磷酸铁锂（LFP/LMFP）正极技术出口", date: new Date("2025-07-15"), severity: 80, category: "export", summary: "Two-step MOFCOM licensing now covers JVs, licensing and tech-service agreements for LFP/LMFP preparation tech.", summaryZh: "商务部两步许可制覆盖合资、技术许可与技术服务协议——凡涉 LFP/LMFP 制备技术出海均需审批", link: "" },
      { region: "US", title: "OBBBA signed — PFE regime targets licensed tech", titleZh: "美国 OBBBA 签署——PFE 新规针对授权技术", date: new Date("2025-07-04"), severity: 90, category: "ira", summary: "§45X survives but credits denied where technology is licensed from FEOCs — the Ford-CATL test case. China answers with export controls.", summaryZh: "§45X 保留，但凡技术来自「受关注外国实体」（FEOC）授权即失去抵免资格——福特—宁德时代授权案成试金石。中国的回应是出口管制", link: "" },
      { region: "CN", title: "China controls exports of ≥300 Wh/kg batteries, cathode/anode, equipment", titleZh: "中国对≥300 Wh/kg 电池及正负极、设备实施出口管制", date: new Date("2025-10-09"), severity: 85, category: "export", summary: "MOFCOM Announcement No. 58: dual-use licensing for high-energy batteries, artificial graphite anodes and manufacturing equipment.", summaryZh: "商务部公告第 58 号：高能量密度电池、人造石墨负极与制造设备纳入两用物项许可管理", link: "" },
      { region: "CN", title: "China suspends Oct-9 battery/materials controls for one year", titleZh: "中国暂停 10 月 9 日电池与材料管制一年", date: new Date("2025-11-07"), severity: 60, category: "export", summary: "US-China trade truce pause — the suspension expires November 2026, mid-negotiation.", summaryZh: "中美贸易休战暂停令——2026 年 11 月到期，正逢谈判胶着期", link: "" },
      { region: "CN", title: "Solid-state special fund mid-term review", titleZh: "全固态专项基金中期审查", date: new Date("2025-09-05"), severity: 50, category: "other", summary: "MIIT reviews the six funded players' progress; a second tranche is expected as pilot lines reach pre-production.", summaryZh: "工信部对六家入选企业进行中期评审；随着中试线进入试产，预计追加第二批资金", link: "" },
      { region: "CN", title: "CATL Na-ion passes GB 38031-2025 — first sodium chemistry certified", titleZh: "宁德时代钠电池通过 GB 38031-2025——首个获证钠离子化学体系", date: new Date("2026-02-05"), severity: 45, category: "other", summary: "Naxtra becomes the first sodium-ion battery to pass the 2026 safety standard, opening the certified lane for scale production.", summaryZh: "钠新成为首个通过 2026 年安全标准的钠离子电池，为规模化量产打开获证通道", link: "" },
      { region: "CN", title: "GB 38031-2025 safety standard takes effect", titleZh: "GB 38031-2025 安全标准正式生效", date: new Date("2026-07-01"), severity: 55, category: "other", summary: "New EV-battery safety regime applies — any chemistry sold in China must pass, raising the bar for sodium-ion and beyond.", summaryZh: "新版车用电池安全标准生效——在中国销售的任何化学体系都必须通过，抬高钠离子等新路线的门槛", link: "" },
      { region: "CN", title: "Export-control suspension expires (projected)", titleZh: "出口管制暂停期到期（预测）", date: new Date("2026-11-07"), severity: 75, category: "export", summary: "The one-year truce pause on Oct-9 controls lapses mid-negotiation; watch whether Beijing re-locks the door on equipment and cathodes.", summaryZh: "10 月 9 日管制的一年休战暂停令到期，正逢谈判胶着；留意北京是否重锁设备与正极出口", link: "" },
      { region: "CN", title: "NDRC + local funds — Zhuhai RMB 5bn, Shanghai RMB 3bn for solid-state", titleZh: "发改委与地方资金——珠海 50 亿、上海 30 亿投向固态电池", date: new Date("2026-03-01"), severity: 40, category: "other", summary: "Local subsidy war chests stack on the national fund; NDRC ultra-long-term bonds subsidize ~15% of solid-state project capex.", summaryZh: "地方补贴在国家级基金之上层层加码；发改委超长期特别国债补贴固态项目约 15% 的资本开支", link: "" },
      { region: "CN", title: "All-solid-state demo fleets & 2027 mass-production targets", titleZh: "全固态示范车队与 2027 量产目标", date: new Date("2027-01-01"), severity: 60, category: "other", summary: "CATL small-batch 2027, BYD demo fleets ~2027, SAIC/QingTao mass delivery target 2027 — the standards regime now has a production schedule.", summaryZh: "宁德时代 2027 小批量、比亚迪约 2027 示范车队、上汽/清陶 2027 量产交付——标准体系如今有了量产时间表", link: "" },
    ])
    .onDuplicateKeyUpdate({ set: { title: sql`values(title)`, titleZh: sql`values(titleZh)`, summary: sql`values(summary)`, summaryZh: sql`values(summaryZh)` } });
  console.log("policy events ✓");

  /* ---------- Ticker ---------- */
  await db
    .insert(tickerItems)
    .values([
      { label: "LFP CELL $52/kWh ▼1.9%", delta: "down", pillar: "tech-routes", sortOrder: 1 },
      { label: "CATL DEBRECEN RAMP — P1 FULLY BOOKED ▲", delta: "up", pillar: "overseas-capacity", sortOrder: 2 },
      { label: "EU PASSPORT T-200 DAYS", delta: "none", pillar: "geopolitics", sortOrder: 3 },
      { label: "GOTION MOROCCO Q3-2026 SOP", delta: "up", pillar: "overseas-capacity", sortOrder: 4 },
      { label: "SSB PILOT LINES: 7 TRACKED", delta: "none", pillar: "tech-routes", sortOrder: 5 },
      { label: "OBBBA PFE RULES — 45X LICENSING CLAUSE LIVE", delta: "down", pillar: "geopolitics", sortOrder: 6 },
      { label: "BYD SZEGED SERIES Q2-2026", delta: "up", pillar: "overseas-capacity", sortOrder: 7 },
      { label: "CN EXPORT-CONTROL TRUCE EXPIRES NOV-2026", delta: "down", pillar: "geopolitics", sortOrder: 8 },
    ])
    .onDuplicateKeyUpdate({ set: { label: sql`values(label)` } });
  console.log("ticker ✓");

  console.log("Seed complete.");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
