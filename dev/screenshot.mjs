#!/usr/bin/env node
/**
 * Playwright 视觉识别脚本（开发辅助，不装进 app/ 依赖）
 *
 * Playwright 不随仓库安装。本机首次使用先临时安装（放哪都行，目标机自会找到）：
 *   mkdir -p /tmp/cbb-pw && cd /tmp/cbb-pw && npm i playwright && npx playwright install chromium
 * 然后把安装目录传给 PLAYWRIGHT_DIR：
 *   PLAYWRIGHT_DIR=/tmp/cbb-pw node dev/screenshot.mjs
 *
 * 用法：
 *   node dev/screenshot.mjs 全站        # 首页/档案/详情/tracker/tech/policy/markets/pricing × desktop+mobile
 *   node dev/screenshot.mjs 滚动        # 各页滚动触发 ScrollTrigger 后按深度截图
 *   node dev/screenshot.mjs hero        # 首页 hero 卡文案 + DOM 校验（en/zh 双语）
 *   node dev/screenshot.mjs live        # 生产站首页 hero 校验（默认 URL 为 https://chinabatterybrief.com）
 *
 * 可选参数：
 *   --url <BASE>      目标站点（默认 dev: http://localhost:3000）
 *   --dir <OUT>       输出目录（默认 ./dev/shots）
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// Playwright 不随仓库安装。优先从 PLAYWRIGHT_DIR（临时安装）解析，否则回退项目 node_modules。
let chromium;
try {
  const pwDir = process.env.PLAYWRIGHT_DIR;
  ({ chromium } = pwDir
    ? require(path.join(pwDir, "node_modules/playwright"))
    : require("playwright"));
} catch (e) {
  console.error("找不到 playwright。请先临时安装并把目录传给 PLAYWRIGHT_DIR：");
  console.error("  mkdir -p /tmp/cbb-pw && cd /tmp/cbb-pw && npm i playwright && npx playwright install chromium");
  console.error("  PLAYWRIGHT_DIR=/tmp/cbb-pw node dev/screenshot.mjs 全站");
  process.exit(1);
}

const arg = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i > -1 ? process.argv[i + 1] : fallback;
};
const hasFlag = (name) => process.argv.includes(name);

const CMD = process.argv[2] || "全站";
const BASE = arg("--url", "http://localhost:3000");
const REPO_ROOT = path.resolve(__dirname, "..");
const OUT = path.resolve(REPO_ROOT, arg("--dir", "dev/shots"));

const ACTIONS = ["全站", "滚动", "hero", "live"];
if (!ACTIONS.includes(CMD)) {
  console.log(`未知命令 "${CMD}"，可用：${ACTIONS.join(" / ")}`);
  process.exit(1);
}

fs.mkdirSync(OUT, { recursive: true });

const routePages = [
  ["home", "/"],
  ["briefs", "/briefs"],
  ["brief-detail", "/briefs/the-governance-bottleneck"],
  ["tracker", "/tracker"],
  ["tech", "/tech"],
  ["policy", "/policy"],
  ["markets", "/markets"],
  ["pricing", "/pricing"],
  ["about", "/about"],
];
const desktop = { width: 1440, height: 900 };
const mobile = { width: 390, height: 844 };

const browser = await chromium.launch();
const errors = [];
const track = async (ctx) => {
  const page = await ctx.newPage();
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`[console] ${m.text()}`);
  });
  page.on("pageerror", (e) => errors.push(`[pageerror] ${e.message}`));
  return page;
};

async function snapAll() {
  for (const [name, route] of routePages) {
    for (const [sname, vp] of [
      ["desktop", desktop],
      ["mobile", mobile],
    ]) {
      const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 2, colorScheme: "dark" });
      const page = await track(ctx);
      try {
        await page.goto(BASE + route, { waitUntil: "networkidle", timeout: 30000 });
        await page.waitForTimeout(1200); // GSAP/Lenis settle
        await page.screenshot({ path: `${OUT}/${name}-${sname}.png` });
        console.log(`ok ${name}/${sname}`);
      } catch (e) {
        console.log(`FAIL ${name}/${sname}: ${e.message}`);
      }
      await ctx.close();
    }
  }
}

async function snapScroll() {
  for (const [name, route] of routePages.filter((p) => p[0] !== "brief-detail")) {
    const ctx = await browser.newContext({ viewport: desktop, deviceScaleFactor: 2, colorScheme: "dark" });
    const page = await track(ctx);
    await page.goto(BASE + route, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(800);
    const height = await page.evaluate(() => document.body.scrollHeight);
    for (let y = 0; y < height; y += 700) {
      await page.evaluate((yy) => window.scrollTo(0, yy), y);
      await page.waitForTimeout(260);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(600);
    for (const [i, yy] of [0, 900, 1800].entries()) {
      await page.evaluate((v) => window.scrollTo(0, v), yy);
      await page.waitForTimeout(600);
      await page.screenshot({ path: `${OUT}/${name}-scroll${i}.png` });
    }
    console.log(`ok scroll ${name}`);
    await ctx.close();
  }
}

async function snapHero() {
  for (const lang of ["en", "zh"]) {
    const ctx = await browser.newContext({ viewport: desktop, deviceScaleFactor: 2, colorScheme: "dark" });
    const page = await track(ctx);
    await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 30000 });
    await page.evaluate((l) => localStorage.setItem("cbb:lang", l), lang);
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${OUT}/hero-${lang}.png` });
    const rows = await page.$$eval(".hero-card-float ul li", (lis) =>
      lis.map((li) => li.textContent.trim().replace(/\s+/g, " ")),
    );
    // ChargeGauge label is a <span> like "56%" (not svg text) — match the percent text.
    const gauge = await page.$$eval(".hero-card-float span.tnum", (ts) => ts.map((t) => t.textContent)).catch(() => []);
    console.log(`[${lang}] rows:`, JSON.stringify(rows));
    console.log(`[${lang}] gauge:`, JSON.stringify(gauge));
    await ctx.close();
  }
}

async function snapLive() {
  const base = BASE;
  for (const lang of ["en", "zh"]) {
    const ctx = await browser.newContext({ viewport: desktop, deviceScaleFactor: 2, colorScheme: "dark" });
    const page = await track(ctx);
    const failed = [];
    page.on("requestfailed", (r) => failed.push(r.url()));
    await page.goto(base + "/", { waitUntil: "networkidle", timeout: 45000 });
    await page.evaluate((l) => localStorage.setItem("cbb:lang", l), lang);
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${OUT}/prod-hero-${lang}.png` });
    const rows = await page.$$eval(".hero-card-float ul li", (lis) =>
      lis.map((li) => li.textContent.trim().replace(/\s+/g, " ")),
    );
    const cover = await page.$eval(".hero-card-float img", (i) => i.getAttribute("src")).catch(() => null);
    console.log(`[${lang}] cover=${cover}`);
    console.log(`[${lang}] rows:`, JSON.stringify(rows));
    console.log(`[${lang}] failedReqs:`, failed.length ? failed.slice(0, 3) : "(none)");
    await ctx.close();
  }
}

try {
  const fn = { 全站: snapAll, 滚动: snapScroll, hero: snapHero, live: snapLive }[CMD];
  await fn();
} finally {
  await browser.close();
}
console.log("\n=== console/page errors ===");
console.log(errors.length ? errors.join("\n") : "(none)");
