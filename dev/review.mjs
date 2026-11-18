#!/usr/bin/env node
/**
 * dev/review.mjs — L1 mechanical review for China Battery Brief drafts.
 *
 * These checks are deterministic: no model involved. They cover the failure
 * modes that used to be caught by reading, so that human and model review can
 * spend their attention on judgement calls.
 *
 * Usage:
 *   node dev/review.mjs app/db/seed-content/issue-063.md app/db/seed-content-zh/issue-063-zh.md
 *   node dev/review.mjs --fixtures
 *   node dev/review.mjs --json <files...>
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC_DIR = path.join(ROOT, "app", "public");

const META_ZH = [
  "换句话说",
  "值得注意的是",
  "不难看出",
  "说到底",
  "某种意义上",
  "可以说",
  "应该说",
  "其实",
];
const VERDICT_ZH = /(看上去|其实|说到底|并不是|才是|真正的|换句话说|值得注意的是|显然|当然|意味着|说明|可见|问题在于|这正是)/;
const VERDICT_EN = /\b(the point|the real|matters|in short|of course|is not|that is not|means|shows|the question)\b/i;
const META_EN = [
  "in other words",
  "it is worth noting",
  "that is the whole story",
  "the point is",
  "needless to say",
  "in short",
];

function isZh(file) {
  return /-zh\.md$/.test(file);
}

function load(file) {
  const raw = fs.readFileSync(path.resolve(ROOT, file), "utf8");
  const body = raw.split(/\n---\n/)[0];
  return { raw, body };
}

function paragraphs(body) {
  return body
    .split(/\n{2,}/)
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .filter(s => !s.startsWith("<!--") && !s.startsWith("#") && !s.startsWith("|") && !s.startsWith("!["));
}

const ABBREVIATIONS = [/\bNo\./g, /\bU\.S\./g, /\bU\.K\./g, /\bMr\./g, /\bDr\./g, /\bInc\./g, /\bLtd\./g, /\bvs\./g, /\be\.g\./g, /\bi\.e\./g];

function sentences(text, zh) {
  let t = text.replace(/<!--[\s\S]*?-->/g, " ").replace(/\[\^\d+\]/g, "");
  ABBREVIATIONS.forEach(re => { t = t.replace(re, m => m.replace(/\./g, "\u0001")); });
  return t
    .split(zh ? /(?<=[。！？])/ : /(?<=[.!?])\s+/)
    .map(s => s.replace(/\u0001/g, ".").trim())
    .filter(Boolean);
}

const DIGIT = /\d/;

function hasDigit(s) {
  return DIGIT.test(s);
}

function wordCount(s) {
  return s.split(/\s+/).filter(Boolean).length;
}

// ---- checks -------------------------------------------------------------

function checkParagraphs(file) {
  const zh = isZh(file);
  const { body } = load(file);
  const paras = paragraphs(body);
  const issues = [];

  paras.forEach((p, i) => {
    const ss = sentences(p, zh);
    const first = ss[0] || "";
    const firstLen = zh ? first.replace(/\s/g, "").length : wordCount(first);
    const limit = zh ? 20 : 8;

    if (!hasDigit(first) && firstLen <= limit) {
      const verdict = zh ? VERDICT_ZH.test(first) : VERDICT_EN.test(first);
      issues.push({
        rule: "L1.opener",
        level: verdict ? "fail" : "warn",
        para: i + 1,
        text: first.slice(0, 80),
        detail: verdict ? "段首是评价性判断，先表态后给证据" : "段首句无数字且过短，需要事实支撑",
      });
    }

    if (ss.length === 1 && !hasDigit(p)) {
      const len = zh ? p.replace(/\s/g, "").length : wordCount(p);
      if (len <= (zh ? 30 : 12)) {
        issues.push({
          rule: "L1.single-sentence",
          level: "fail",
          para: i + 1,
          text: p.slice(0, 80),
          detail: "单句成段且无数字，只有总结/判断",
        });
      }
    }

    const meta = zh ? META_ZH : META_EN;
    const hit = meta.find(m => first.toLowerCase().includes(m));
    if (hit) {
      issues.push({
        rule: "L1.meta",
        level: "warn",
        para: i + 1,
        text: first.slice(0, 80),
        detail: "段首出现元话语：" + hit,
      });
    }
  });

  return issues;
}

function checkAssets(file) {
  const { body } = load(file);
  const issues = [];
  const re = /!\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  let m;
  while ((m = re.exec(body))) {
    const target = m[1];
    if (!target.startsWith("/")) continue;
    const abs = path.join(PUBLIC_DIR, target.replace(/^\//, ""));
    if (!fs.existsSync(abs)) {
      issues.push({ rule: "L1.asset", level: "fail", text: target, detail: "配图路径不存在" });
    }
  }
  return issues;
}

function checkFootnotes(file) {
  const { raw } = load(file);
  const body = raw.split(/\n---\n/)[0];
  const refs = new Set((body.match(/\[\^(\d+)\]/g) || []).map(m => m.replace(/[^0-9]/g, "")));
  const defs = new Set((raw.match(/^\[\^(\d+)\]\s*:/gm) || []).map(m => m.replace(/[^0-9]/g, "")));
  const missing = [...refs].filter(n => !defs.has(n));
  const unused = [...defs].filter(n => !refs.has(n));
  const issues = [];
  if (missing.length) {
    issues.push({ rule: "L1.footnote", level: "fail", text: missing.join(","), detail: "脚注缺定义" });
  }
  if (unused.length) {
    issues.push({ rule: "L1.footnote", level: "fail", text: unused.join(","), detail: "脚注无引用" });
  }
  return issues;
}

const NUM_RE = /(\d+(?:\.\d+)?)\s*(亿千瓦时|亿千瓦|万千瓦时|万千瓦|GWh|MWh|kWh|GW|MW|kW)/g;
const NUM_FACTOR = {
  "亿千瓦时": { unit: "GWh", f: 100 },
  "亿千瓦": { unit: "GW", f: 100 },
  "万千瓦时": { unit: "GWh", f: 0.01 },
  "万千瓦": { unit: "GW", f: 0.01 },
  GWH: { unit: "GWh", f: 1 },
  MWH: { unit: "GWh", f: 0.001 },
  KWH: { unit: "GWh", f: 1e-6 },
  GW: { unit: "GW", f: 1 },
  MW: { unit: "GW", f: 0.001 },
  KW: { unit: "GW", f: 1e-6 },
};

function numbersIn(text) {
  const out = [];
  const src = text.replace(/<!--[\s\S]*?-->/g, " ");
  let m;
  NUM_RE.lastIndex = 0;
  while ((m = NUM_RE.exec(src))) {
    const spec = NUM_FACTOR[m[2].toUpperCase()] || NUM_FACTOR[m[2]];
    if (!spec) continue;
    out.push({ value: +(parseFloat(m[1]) * spec.f).toFixed(3), unit: spec.unit });
  }
  return out;
}

const HEDGE = {
  approximate: { zh: /约|大约|近|左右|接近/, en: /\b(about|around|roughly|approximately|near|nearly|some|close to)\b/i },
  lower_bound: { zh: /超过|逾|至少|以上/, en: /\b(more than|over|at least|above)\b/i },
  forecast: { zh: /预计|预期|有望/, en: /\b(expected|forecast|projected|likely)\b/i },
  possibility: { zh: /可能|也许/, en: /\b(may|might|could|possibly)\b/i },
};

function hedgeOf(text, zh) {
  const out = [];
  for (const [cat, pair] of Object.entries(HEDGE)) {
    const base = zh ? pair.zh : pair.en;
    const r = new RegExp(base.source, base.flags.includes("g") ? base.flags : base.flags + "g");
    let m;
    while ((m = r.exec(text))) out.push({ cat, i: m.index });
  }
  return out;
}

function hedgedNumbers(text, zh) {
  text = text.replace(/^!\[.*$/gm, " ").replace(/^#+ .*$/gm, " ");
  const spec = {
    "亿千瓦时": { u: "GWh", f: 100 },
    "亿千瓦": { u: "GW", f: 100 },
    "万千瓦时": { u: "GWh", f: 0.01 },
    "万千瓦": { u: "GW", f: 0.01 },
    GWH: { u: "GWh", f: 1 }, MWH: { u: "GWh", f: 0.001 }, KWH: { u: "GWh", f: 1e-6 },
    GW: { u: "GW", f: 1 }, MW: { u: "GW", f: 0.001 }, KW: { u: "GW", f: 1e-6 },
  };
  const re = zh
    ? /(\d+(?:\.\d+)?)\s*(亿千瓦时|亿千瓦|万千瓦时|万千瓦|GWh|MWh|kWh|GW|MW|kW)/gi
    : /(\d+(?:\.\d+)?)\s*(GWh|MWh|kWh|GW|MW|kW)\b/gi;
  const hedges = hedgeOf(text, zh);
  const out = [];
  let m;
  while ((m = re.exec(text))) {
    const s2 = spec[(m[2] || "").toUpperCase()] || spec[m[2]];
    if (!s2) continue;
    const i = m.index;
    const len = m[0].length;
    const cats = [...new Set(
      hedges
        .filter(h => h.i >= i - 8 && h.i < i + len + 4)
        .map(h => h.cat)
    )].sort();
    out.push({ key: +(parseFloat(m[1]) * s2.f).toFixed(3) + "|" + s2.u, cats });
  }
  return out;
}

function checkHedges(enFile, zhFile) {
  const en = hedgedNumbers(load(enFile).body, false);
  const zh = hedgedNumbers(load(zhFile).body, true);
  const group = list => {
    const m = new Map();
    for (const x of list) {
      if (!m.has(x.key)) m.set(x.key, []);
      m.get(x.key).push(x.cats);
    }
    return m;
  };
  const enG = group(en);
  const zhG = group(zh);
  const issues = [];
  for (const [key, zhList] of zhG) {
    const enList = enG.get(key) || [];
    const n = Math.min(enList.length, zhList.length);
    for (let i = 0; i < n; i++) {
      const a = enList[i].join() || "无";
      const b = zhList[i].join() || "无";
      if (a !== b) {
        issues.push({
          rule: "L1.hedge",
          level: "fail",
          text: key + "（第 " + (i + 1) + " 次）英文 " + a + " / 中文 " + b,
          detail: "同一数字在中英两侧的限定词不一致",
        });
      }
    }

  }
  return issues;
}

function footnoteUrls(file) {
  const { raw } = load(file);
  const urls = [];
  const re = /^\[\^(\d+)\]\s*:[\s\S]*?(https?:\/\/[^\s)]+)/gm;
  let m;
  while ((m = re.exec(raw))) urls.push(m[2].replace(/[.,;]+$/, ""));
  return urls;
}

function checkSourceParity(enFile, zhFile) {
  const en = footnoteUrls(enFile);
  const zh = footnoteUrls(zhFile);
  const norm = u => u.replace(/\/$/, "");
  const enSet = new Set(en.map(norm));
  const zhSet = new Set(zh.map(norm));
  const onlyEn = [...enSet].filter(u => !zhSet.has(u));
  const onlyZh = [...zhSet].filter(u => !enSet.has(u));
  const issues = [];
  if (en.length !== zh.length || onlyEn.length || onlyZh.length) {
    issues.push({
      rule: "L1.sources",
      level: "fail",
      text: "EN " + en.length + " 条 / ZH " + zh.length + " 条",
      detail: "中英脚注来源不一致" +
        (onlyEn.length ? "；仅英文: " + onlyEn.slice(0, 3).join(", ") : "") +
        (onlyZh.length ? "；仅中文: " + onlyZh.slice(0, 3).join(", ") : ""),
    });
  }
  return issues;
}

function checkEntities(enFile, zhFile) {
  const en = load(enFile).body.toLowerCase();
  const zh = load(zhFile).body;
  const glossaryFile = path.join(ROOT, "dev", "glossary.json");
  if (!fs.existsSync(glossaryFile)) return [];
  const pairs = JSON.parse(fs.readFileSync(glossaryFile, "utf8"));
  const issues = [];
  for (const p of pairs) {
    const inEn = en.includes(p.en.toLowerCase());
    const inZh = zh.includes(p.zh);
    if (inEn !== inZh) {
      issues.push({
        rule: "L1.entity",
        level: "fail",
        text: p.en + " / " + p.zh,
        detail: inEn ? "英文出现、中文缺失" : "中文出现、英文缺失",
      });
    }
  }
  return issues;
}

function checkParity(enFile, zhFile) {
  const en = numbersIn(load(enFile).body);
  const zh = numbersIn(load(zhFile).body);
  const key = n => n.value + n.unit;
  const enSet = new Set(en.map(key));
  const zhSet = new Set(zh.map(key));
  const onlyEn = [...enSet].filter(k => !zhSet.has(k));
  const onlyZh = [...zhSet].filter(k => !enSet.has(k));
  const issues = [];
  if (onlyEn.length || onlyZh.length) {
    issues.push({
      rule: "L1.parity",
      level: "fail",
      text: "仅英文: " + (onlyEn.slice(0, 6).join(", ") || "—") + " / 仅中文: " + (onlyZh.slice(0, 6).join(", ") || "—"),
      detail: "同一数字在两种语言里未对齐（单位已换算为 GW/GWh）",
    });
  }
  return issues;
}

// ---- runner -------------------------------------------------------------

function reviewFile(file) {
  return [
    ...checkParagraphs(file),
    ...checkAssets(file),
    ...checkFootnotes(file),
  ];
}

function reviewAll(files) {
  const results = {};
  for (const f of files) results[f] = reviewFile(f);
  if (files.length === 2) {
    const en = files.find(f => !isZh(f));
    const zh = files.find(f => isZh(f));
    if (en && zh) {
      const parity = [
        ...checkParity(en, zh),
        ...checkHedges(en, zh),
        ...checkSourceParity(en, zh),
        ...checkEntities(en, zh),
      ];
      results[en] = results[en].concat(parity);
      results[zh] = results[zh].concat(parity);
    }
  }
  return results;
}

function run(files, asJson) {
  const results = reviewAll(files);
  let failed = false;
  for (const issues of Object.values(results)) {
    if (issues.some(i => i.level === "fail")) failed = true;
  }
  if (asJson) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    for (const [f, issues] of Object.entries(results)) {
      console.log("\n" + f);
      if (!issues.length) console.log("  L1 ok");
      for (const i of issues) {
        const tag = i.level === "fail" ? "FAIL" : "warn";
        const where = i.para ? "第 " + i.para + " 段 · " : "";
        console.log("  " + tag + " " + i.rule + " " + where + "「" + i.text + "」 — " + i.detail);
      }
    }
  }
  return !failed;
}

function fixtures() {
  const file = path.join(ROOT, "dev", "fixtures", "review-cases.json");
  const cases = JSON.parse(fs.readFileSync(file, "utf8"));
  let pass = 0;
  for (const c of cases) {
    const files = c.pair ? c.pair.map(f => path.join(ROOT, f)) : [path.join(ROOT, c.file)];
    const results = reviewAll(files);
    const fired = new Set(Object.values(results).flat().map(i => i.rule));
    const missing = (c.expect || []).filter(r => !fired.has(r));
    const unexpected = c.clean ? [...fired].filter(r => r !== "L1.meta") : [];
    const ok = missing.length === 0 && unexpected.length === 0;
    console.log((ok ? "ok   " : "FAIL ") + c.id + (ok ? "" : "  missing=" + missing.join(",") + " unexpected=" + unexpected.join(",")));
    if (ok) pass += 1;
  }
  console.log("\n" + pass + "/" + cases.length + " fixtures passed");
  return pass === cases.length;
}

const args = process.argv.slice(2);
if (args[0] === "--fixtures") {
  process.exit(fixtures() ? 0 : 1);
}
const asJson = args.includes("--json");
const files = args.filter(a => !a.startsWith("--"));
if (!files.length) {
  console.error("usage: node dev/review.mjs [--json] <file...> | --fixtures");
  process.exit(2);
}
process.exit(run(files, asJson) ? 0 : 1);
