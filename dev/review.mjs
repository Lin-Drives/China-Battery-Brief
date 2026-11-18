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

/** Resolve a draft path from either the repo root or the current directory, so
 *  `npm run review -- db/seed-content/...` works from app/ as documented. */
function resolveInput(file) {
  const candidates = [path.resolve(ROOT, file), path.resolve(process.cwd(), file)];
  return candidates.find(p => fs.existsSync(p)) || candidates[0];
}

function load(file) {
  const raw = fs.readFileSync(resolveInput(file), "utf8");
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

/** Citation hygiene: a reference marker belongs before the sentence-ending
 *  punctuation, and several references at one spot must run in ascending
 *  order. Both are editorial hard rules; readers quote these numbers. */
function checkCitations(file) {
  const { body } = load(file);
  const zh = isZh(file);
  const issues = [];
  const afterPunct = new RegExp(
    "(" + (zh ? "[。！？]" : "[.!?]") + ")[ \\t]*((?:\\[\\^\\d+\\])+)",
    "g",
  );
  let m;
  while ((m = afterPunct.exec(body))) {
    const before = body.slice(Math.max(0, m.index - 24), m.index + 1);
    issues.push({
      rule: "L1.citation",
      level: "fail",
      text: (before + m[2]).replace(/\n/g, " "),
      detail: "引用标注放在句末标点之后，应紧贴被引内容、写在句末标点之前",
    });
  }

  const runs = /(?:\[\^\d+\]){2,}/g;
  while ((m = runs.exec(body))) {
    const nums = (m[0].match(/\d+/g) || []).map(Number);
    const sorted = nums.every((n, i) => i === 0 || nums[i - 1] < n);
    if (!sorted) {
      issues.push({
        rule: "L1.citation",
        level: "fail",
        text: m[0],
        detail: "多处引用必须按文献序号从小到大排列（当前 " + nums.join("、") + "）",
      });
    }
  }

  return issues;
}

/** Structural ceiling: at most three PART sections. THE TAKE and the retired
 *  ON THE HORIZON module are excluded; every other h2 counts as a section. */
function checkSections(file) {
  const { body } = load(file);
  const lines = body.split("\n");
  const issues = [];
  let kicker = "";
  let parts = 0;
  const h2 = [];
  for (const line of lines) {
    const k = line.match(/^<!--\s*k:[^|]*\|\s*(.+?)\s*-->\s*$/);
    if (k) {
      kicker = k[1];
      continue;
    }
    const h = line.match(/^##\s+(.+?)\s*$/);
    if (h) {
      const fixed = /^(the take|on the horizon|本刊观点|前瞻)$/i.test(kicker);
      if (/^part\b/i.test(kicker)) parts += 1;
      if (!fixed) h2.push(h[1]);
    }
  }
  if (parts > 3) {
    issues.push({
      rule: "L1.sections",
      level: "fail",
      text: parts + " 个 PART 小节：" + h2.join(" / "),
      detail: "正文小节最多 3 个，多出的内容应与相邻小节合并",
    });
  } else if (h2.length > 3) {
    issues.push({
      rule: "L1.sections",
      level: "fail",
      text: h2.length + " 个小节：" + h2.join(" / "),
      detail: "正文小节最多 3 个（THE TAKE 单列，不计入）",
    });
  }
  return issues;
}

/** Section titles must name their object. Counting what is inside ("two verbs",
 *  "three dates") turns the heading into a riddle the reader has to decode. */
const RIDDLE_HEADING =
  /[一两二三四五几]\s*个\s*(动词|日期|数字|信号|变化|故事|问题|答案|理由|动作|词|事)/;

function checkHeadings(file) {
  const { body } = load(file);
  const issues = [];
  for (const line of body.split("\n")) {
    const h = line.match(/^##\s+(.+?)\s*$/);
    if (!h) continue;
    const hit = h[1].match(RIDDLE_HEADING);
    if (hit) {
      issues.push({
        rule: "L1.heading",
        level: "fail",
        text: h[1],
        detail: "标题用「" + hit[0] + "」代称，读者不知道指什么；直接写对象本身",
      });
    }
  }
  return issues;
}

/** Body prose must not summarise itself with a count ("three numbers", "a
 *  paragraph") when the reader needs the actual content. Titles fail; body
 *  paragraphs warn. */
const VAGUE_REF =
  /[一两二三四五几]\s*(个|段|句|条|种|件)\s*(动词|日期|数字|信号|变化|故事|问题|答案|理由|动作|词|话|说法|事|结论)/;

function checkVagueRefs(file) {
  const { body } = load(file);
  const issues = [];
  for (const p of paragraphs(body)) {
    const hit = p.match(VAGUE_REF);
    if (!hit) continue;
    issues.push({
      rule: "L1.vague",
      level: "warn",
      text: p.slice(0, 90),
      detail: "用「" + hit[0] + "」指代内容，读者要回读；直接写出数字或事实",
    });
  }
  return issues;
}

/** The ON THE HORIZON box repeated the same three dates every issue and was
 *  retired in No.063. Kept as a warning so the module can come back later. */
function checkHorizon(file) {
  const { body } = load(file);
  if (!/<!--\s*horizon\s*-->/.test(body)) return [];
  return [
    {
      rule: "L1.horizon",
      level: "warn",
      text: "<!-- horizon -->",
      detail: "时间小方块已停用（每期重复、无信息增量），正文不再使用",
    },
  ];
}

/** The rendered "原文出处" ledger comes from `issues.json > sources`, not from the
 *  markdown footnote definitions. If the two drift, readers see superscripts that
 *  point past the ledger (or at the wrong entry), so compare count, order and URL. */
function issueMeta(file) {
  const base = path.basename(file);
  const readJson = p => JSON.parse(fs.readFileSync(p, "utf8"));
  const en = readJson(path.join(ROOT, "app", "db", "seed-content", "issues.json"));
  if (!isZh(file)) return en.find(i => i.contentFile === base) || null;
  const zh = readJson(
    path.join(ROOT, "app", "db", "seed-content-zh", "issues-zh.json"),
  );
  const z = zh.find(i => i.contentFileZh === base);
  if (!z) return null;
  return en.find(i => i.slug === z.slug) || null;
}

function checkSourceLedger(file) {
  const meta = issueMeta(file);
  if (!meta) return [];
  const { raw } = load(file);
  const defs = [...raw.matchAll(/^\[\^(\d+)\]\s*:\s*(.+)$/gm)]
    .map(m => ({ n: Number(m[1]), text: m[2] }))
    .sort((a, b) => a.n - b.n);
  const sources = meta.sources || [];
  const issues = [];

  if (defs.length !== sources.length) {
    issues.push({
      rule: "L1.sourceledger",
      level: "fail",
      text: "脚注 " + defs.length + " 条 / 来源 " + sources.length + " 条",
      detail:
        "正文脚注与 issues.json 的 sources 条数不一致：读者看到的编号对不上文末「原文出处」",
    });
  }

  const n = Math.min(defs.length, sources.length);
  for (let i = 0; i < n; i += 1) {
    const url = (defs[i].text.match(/\]\((https?:\/\/[^)]+)\)/) || [])[1];
    const want = sources[i].url;
    if (url && want !== url) {
      issues.push({
        rule: "L1.sourceledger",
        level: "fail",
        text: "脚注 [^" + defs[i].n + "] ↔ 来源 " + String(i + 1).padStart(2, "0"),
        detail: "第 " + (i + 1) + " 条来源 URL 不一致：脚注 " + url + " / sources " + want,
      });
      break;
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
    if (p.risky) continue;
    const enForms = [p.en, ...(p.en_aliases || [])].map(x => x.toLowerCase());
    const zhForms = [p.zh, ...(p.zh_aliases || [])];
    const inEn = enForms.some(x => en.includes(x));
    const inZh = zhForms.some(x => zh.includes(x));
    if (inEn !== inZh) {
      issues.push({
        rule: "L1.entity",
        level: "fail",
        text: p.en + " / " + p.zh,
        detail: (inEn ? "英文出现、中文缺失" : "中文出现、英文缺失") +
          (p.risky ? "（易误伤，已跳过）" : ""),
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
    ...checkCitations(file),
    ...checkSourceLedger(file),
    ...checkSections(file),
    ...checkHeadings(file),
    ...checkVagueRefs(file),
    ...checkHorizon(file),
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
      results[en + " ↔ " + zh] = parity;
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
