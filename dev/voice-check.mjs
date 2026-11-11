#!/usr/bin/env node
/**
 * Voice + briefing checker for China Battery Brief drafts.
 * Implements S1-S6 and R1-R6 from docs/voice.md, calibrated against CnEVPost (2026-11-11).
 *
 * Usage: node dev/voice-check.mjs <draft.md> [draft2.md ...] [--news]
 *   --news  raise the number-density target to 55% (news items) instead of 45% (analysis).
 * Exits 1 on a hard failure; warnings never change the exit code.
 */
import fs from "node:fs";

const args = process.argv.slice(2);
const newsMode = args.includes("--news");
const files = args.filter(function (a) { return a !== "--news"; });
if (files.length === 0) {
  console.error("usage: node dev/voice-check.mjs <draft.md> [draft2.md ...] [--news]");
  process.exit(2);
}

const EN_BLACKLIST = ["crucial", "pivotal", "underscore", "testament", "landscape", "tapestry", "delve", "seamless", "robust", "significant", "substantial", "in today's", "it is worth noting"];
const ZH_BLACKLIST = ["值得注意的是", "不难看出", "不仅仅是", "更是", "赋能", "闭环", "显著", "大幅", "远超", "某种意义上", "可以说"];
const EN_BASE = /(year on year|yoy|quarter on quarter|qoq|compared|versus|\bvs\b|from|of|to|in the|since|share)/i;
const ZH_BASE = /(同比|环比|较|上年|去年|占|从|至|到)/;

function analyse(file) {
  const raw = fs.readFileSync(file, "utf8");
  const isZh = /-zh\.md$/.test(file);
  const body = raw.split(/\n---\n/)[0];
  const text = body
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/^#+ .*$/gm, " ")
    .replace(/^\|.*$/gm, " ")
    .replace(/^!\[.*$/gm, " ")
    .replace(/\[\^\d+\]/g, "")
    .replace(/\*\*/g, "");

  const words = isZh ? (text.match(/[\u4e00-\u9fff]/g) || []).length : text.split(/\s+/).filter(Boolean).length;
  const unit = isZh ? "字" : "词";

  const sentences = (isZh ? text.split(/(?<=[。！？])/) : text.split(/(?<=[.!?])\s+/))
    .map(function (s) { return s.trim(); })
    .filter(function (s) { return s.length > 0; });

  const lens = sentences.map(function (s) {
    return isZh ? s.replace(/\s/g, "").length : s.split(/\s+/).filter(Boolean).length;
  });
  const avg = lens.length ? lens.reduce(function (a, b) { return a + b; }, 0) / lens.length : 0;
  const max = lens.length ? Math.max.apply(null, lens) : 0;

  const numRe = isZh ? /(\d|亿|万|%)/ : /\d/;
  const withNum = sentences.filter(function (s) { return numRe.test(s); }).length;
  const numPct = sentences.length ? Math.round((withNum / sentences.length) * 100) : 0;

  const dash = isZh ? (text.match(/——/g) || []).length : (text.match(/—/g) || []).length;
  const dashPer1k = +((dash / words) * 1000).toFixed(1);
  const dashQuota = Math.max(1, Math.ceil(words / 1000));

  const r1 = isZh
    ? [/不是[^。！？]{0,40}而是/g, /并非[^。！？]{0,40}而是/g]
    : [/(?:is|are|was|were|do|does|did|has|have)\s+not\b[^.!?]{0,70}[.!?]\s*(?:It|That|This|They)\b/gi, /\bnot\b[^.!?]{0,60}\bbut\b/gi];
  let r1hits = 0;
  sentences.forEach(function (s) { r1.forEach(function (re) { r1hits += (s.match(re) || []).length; }); });
  const r1Quota = Math.max(1, Math.floor(words / 500));

  const longLim = isZh ? 80 : 35;
  const longSents = sentences.map(function (s, i) { return { s: s, i: i, n: lens[i] }; })
    .filter(function (o) { return o.n > longLim; })
    .sort(function (a, b) { return b.n - a.n; });

  const pctSentences = sentences.filter(function (s) { return /%/.test(s); });
  const pctNoBase = pctSentences.filter(function (s) { return !(isZh ? ZH_BASE : EN_BASE).test(s); });

  const predRe = isZh ? /(预计|预测|将|可能|有望)/ : /\b(will|expected|forecast|likely|should)\b/i;
  const paras = text.split(/\n{2,}/).map(function (p) { return p.trim(); }).filter(Boolean);
  const predNoCite = [];
  paras.forEach(function (p) {
    if (/\[\^\d+\]/.test(p)) return;
    (isZh ? p.split(/(?<=[。！？])/) : p.split(/(?<=[.!?])\s+/)).forEach(function (s) {
      if (predRe.test(s)) predNoCite.push(s.trim());
    });
  });

  const blacklist = isZh ? ZH_BLACKLIST : EN_BLACKLIST;
  const lower = text.toLowerCase();
  const hits = blacklist.filter(function (w) { return lower.indexOf(w.toLowerCase()) >= 0; });

  const boldStart = paras.filter(function (p) { return /^\*\*[^*]{1,40}\*\*/.test(p); }).length;

  const refs = [];
  (body.match(/\[\^(\d+)\]/g) || []).forEach(function (m) {
    const n = Number(m.replace(/[^0-9]/g, ""));
    if (refs.indexOf(n) < 0) refs.push(n);
  });
  const defs = [];
  (raw.match(/^\[\^(\d+)\]:/gm) || []).forEach(function (m) {
    defs.push(Number(m.replace(/[^0-9]/g, "")));
  });
  const missingDefs = refs.filter(function (n) { return defs.indexOf(n) < 0; });
  const unusedDefs = defs.filter(function (n) { return refs.indexOf(n) < 0; });

  const firstPara = paras[0] || "";
  const s1ok = numRe.test(firstPara.split(isZh ? /(?<=[。！？])/ : /(?<=[.!?])\s+/)[0] || "");

  const target = newsMode ? 55 : 40;
  const fails = [];
  if (!s1ok) fails.push("S1 首句无数字");
  if (numPct < target) fails.push("S2 数字密度 " + numPct + "% < " + target + "%");
  if (dashPer1k > dashQuota) fails.push("S4 破折号 " + dashPer1k + "/千词 > " + dashQuota);
  if (avg > (isZh ? 65 : 26)) fails.push("S5 平均句长 " + avg.toFixed(1) + " 超标");
  if (max > (isZh ? 110 : 45)) fails.push("S5 最长句 " + max + " 超标");
  if (r1hits > r1Quota) fails.push("R1 反转句 " + r1hits + " > " + r1Quota);
  if (boldStart > 0) fails.push("R6 段首粗体标签 " + boldStart + " 处");
  if (missingDefs.length) fails.push("脚注缺定义: " + missingDefs.join(","));
  if (unusedDefs.length) fails.push("脚注无引用: " + unusedDefs.join(","));

  const warnings = [];
  if (pctNoBase.length) warnings.push("S3 无口径百分比 " + pctNoBase.length + " 处: " + pctNoBase[0].slice(0, 80));
  if (predNoCite.length) warnings.push("S6 无来源预测 " + predNoCite.length + " 处: " + predNoCite[0].slice(0, 80));
  if (longSents.length) warnings.push("S5 超长句 " + longSents.length + " 处（最长 " + longSents[0].n + "）: " + longSents[0].s.slice(0, 80));
  if (hits.length) warnings.push("R6 词表: " + hits.join(", "));

  console.log("");
  console.log(file + "  (" + (isZh ? "zh" : "en") + ", " + words + " " + unit + (newsMode ? ", news" : ", analysis") + ")");
  console.log("  S1 首句事实    " + (s1ok ? "ok" : "缺数字"));
  console.log("  S2 数字密度    " + numPct + "%  (目标 ≥" + target + "%)  " + (numPct >= target ? "ok" : "不足"));
  console.log("  S4 破折号      " + dashPer1k + "/千" + unit + "  (≤" + dashQuota + ")  " + (dashPer1k <= dashQuota ? "ok" : "超标"));
  console.log("  S5 句长        平均 " + avg.toFixed(1) + " / 最长 " + max + "  (上限 " + (isZh ? "65 / 110" : "26 / 45") + ")");
  console.log("  R1 反转句      " + r1hits + " 处  (配额 " + r1Quota + ")");
  console.log("  R6 段首标签    " + boldStart + " 处  (应为 0)");
  console.log("  R7 词表        " + hits.length + " 处");
  console.log("  脚注编号      引用 " + refs.length + " / 定义 " + defs.length + "  " + (missingDefs.length || unusedDefs.length ? "不一致" : "ok"));
  warnings.forEach(function (w) { console.log("  ! " + w); });
  fails.forEach(function (f) { console.log("  FAIL " + f); });

  return fails.length === 0;
}

let ok = true;
files.forEach(function (f) { ok = analyse(f) && ok; });
process.exit(ok ? 0 : 1);
