#!/usr/bin/env node
/** 一次性：No.053 阅读页截图（EN/ZH × desktop/mobile） */
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const pwDir = process.env.PLAYWRIGHT_DIR || "/tmp/cbb-pw";
const { chromium } = require(path.join(pwDir, "node_modules/playwright"));

const BASE = "http://localhost:3000";
const OUT = "dev/shots";
const SLUG = "/briefs/dont-export-the-price-war";

const shots = [
  ["053-en-desktop", { width: 1440, height: 900 }, "en"],
  ["053-zh-desktop", { width: 1440, height: 900 }, "zh"],
  ["053-zh-mobile", { width: 390, height: 844 }, "zh"],
];

const browser = await chromium.launch();
for (const [name, vp, lang] of shots) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 2, colorScheme: "dark" });
  const page = await ctx.newPage();
  await page.addInitScript(l => localStorage.setItem("cbb:lang", l), lang);
  await page.goto(BASE + SLUG, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/${name}-top.png` });
  // 滚动到 THE TAKE 附近再截一张
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.45));
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/${name}-body.png` });
  console.log(`ok ${name}`);
  await ctx.close();
}
await browser.close();
