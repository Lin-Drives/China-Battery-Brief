#!/usr/bin/env node
/**
 * Voice checker for China Battery Brief drafts.
 * Implements R1-R4 and R6 from docs/voice.md. Reports only; exits 1 on a quota breach.
 *
 * Usage: node dev/voice-check.mjs app/db/seed-content/issue-062.md [more files...]
 */
import fs from "node:fs";

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("usage: node dev/voice-check.mjs <draft.md> [draft2.md ...]");
  process.exit(2);
}

const EN_BLACKLIST = ["crucial", "pivotal", "underscore", "testament", "landscape", "tapestry", "delve", "seamless", "robust", "in today's", "it is worth noting", "at the end of the day"];
const ZH_BLACKLIST = ["值得注意的是", "不难看出", "不仅仅是", "更是", "赋能", "闭环", "生态位", "某种意义上", "可以说"];

function analyse(file) {
  const raw = fs.readFileSync(file, "utf8");
  const isZh = /-zh\.md$/.test(file);
  const body = raw.split(/\n---\n/)[0];
  const words = isZh
    ? (body.match(/[\u4e00-\u9fff]/g) || []).length
    : body.split(/\s+/).filter(Boolean).length;

  const paras = body
    .split(/\n{2,}/)
    .map(function (p) { return p.trim(); })
    .filter(function (p) { return p && p.charAt(0) !== "#" && p.slice(0, 4) !== "<!--" && p.charAt(0) !== "|" && p.charAt(0) !== "!"; });

  const findings = [];
  function add(rule, para, snippet) {
    findings.push({ rule: rule, para: para, snippet: snippet.replace(/\s+/g, " ").slice(0, 110) });
  }

  // R1 - antithesis quota: 1 per 500 words
  const r1 = isZh
    ? [/不是[^。！？]{0,40}而是/g, /并非[^。！？]{0,40}而是/g]
    : [/(?:is|are|was|were|do|does|did|has|have)\s+not\b[^.!?]{0,70}[.!?]\s*(?:It|That|This|They)\b/gi, /\bnot\b[^.!?]{0,60}\bbut\b/gi];
  let r1hits = 0;
  paras.forEach(function (p, i) {
    r1.forEach(function (re) {
      const ms = p.match(re) || [];
      ms.forEach(function (m) { r1hits++; add("R1", i + 1, m); });
    });
  });

  // R2 - em dash density
  const dash = isZh ? (body.match(/——/g) || []).length : (body.match(/—/g) || []).length;
  const dashQuota = Math.ceil((words / 1000) * (isZh ? 3 : 4));

  // R3 - paragraph-final summary sentences
  const sentRe = isZh ? /[^。！？]*[。！？]/g : /[^.!?]+[.!?]/g;
  paras.forEach(function (p, i) {
    const ms = p.match(sentRe) || [];
    const last = (ms[ms.length - 1] || "").trim();
    const summaryEn = /^(That is|That's|This is|It is|In short|Ultimately)\b/.test(last);
    const summaryZh = /(这就是|这正是|说到底|归根结底|全部意义)/.test(last);
    if (summaryEn || summaryZh) add("R3", i + 1, last);
  });

  // R4 - opening must carry a fact (a digit)
  const first = (paras[0] || "").replace(/^[^\p{L}\p{N}]*/u, "");
  if (first && !/\d/.test(first.slice(0, 200))) add("R4", 1, first);

  // R6 - vocabulary
  const list = isZh ? ZH_BLACKLIST : EN_BLACKLIST;
  const lower = body.toLowerCase();
  list.forEach(function (w) {
    const idx = lower.indexOf(w.toLowerCase());
    if (idx >= 0) add("R6", "-", w + ": " + body.slice(Math.max(0, idx - 40), idx + 40));
  });

  const unit = isZh ? "字" : "词";
  console.log("");
  console.log(file + "  (" + (isZh ? "zh" : "en") + ", " + words + " " + unit + ")");
  const cap = Math.max(1, Math.floor(words / 500));
  console.log("  R1 反转句      " + r1hits + " 处 / 配额 " + cap + "  " + (r1hits <= cap ? "ok" : "超出"));
  console.log("  R2 破折号      " + dash + " 处 / 配额 " + dashQuota + "  " + (dash <= dashQuota ? "ok" : "超出"));
  console.log("  R3 段末升华    " + findings.filter(function (f) { return f.rule === "R3"; }).length + " 处");
  console.log("  R4 首句事实    " + (findings.some(function (f) { return f.rule === "R4"; }) ? "缺数字" : "ok"));
  console.log("  R6 词表        " + findings.filter(function (f) { return f.rule === "R6"; }).length + " 处");

  findings.filter(function (f) { return f.rule !== "R6"; }).slice(0, 8).forEach(function (f) {
    console.log("    " + f.rule + " P" + f.para + ": " + f.snippet);
  });
  findings.filter(function (f) { return f.rule === "R6"; }).slice(0, 3).forEach(function (f) {
    console.log("    R6: " + f.snippet);
  });

  return !(r1hits <= cap) || dash > dashQuota || findings.some(function (f) { return f.rule === "R4"; });
}

let bad = false;
for (const f of files) bad = analyse(f) || bad;
process.exit(bad ? 1 : 0);
