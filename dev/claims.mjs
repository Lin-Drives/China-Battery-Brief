#!/usr/bin/env node
/**
 * dev/claims.mjs — L2 claim ledger checker.
 *
 * Every number in an issue must be registered in
 * app/db/seed-content/claims/<issue>.json with a source (URL + verbatim quote)
 * or a derivation (from other claim ids). This script fetches each source,
 * checks the quote appears on the page, checks the number can be parsed out of
 * the quote, and reports draft numbers that have no claim.
 *
 * Usage:
 *   node dev/claims.mjs 63                 # check issue 063
 *   node dev/claims.mjs 63 --offline       # use cached pages only
 *   node dev/claims.mjs 63 --strict        # coverage gaps fail the run
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CACHE = path.join(ROOT, "dev", ".cache", "claims");
const CLAIMS_DIR = path.join(ROOT, "app", "db", "seed-content", "claims");

const args = process.argv.slice(2);
const offline = args.includes("--offline");
const strict = args.includes("--strict");
const issue = args.find(a => /^\d+$/.test(a));
const num = issue ? String(issue).padStart(3, "0") : null;
if (!issue) {
  console.error("usage: node dev/claims.mjs <issue-number> [--offline] [--strict]");
  process.exit(2);
}

const UNIT = {
  "亿千瓦时": { u: "GWh", f: 100 },
  "亿千瓦": { u: "GW", f: 100 },
  "万千瓦时": { u: "GWh", f: 0.01 },
  "万千瓦": { u: "GW", f: 0.01 },
  GWH: { u: "GWh", f: 1 },
  MWH: { u: "GWh", f: 0.001 },
  KWH: { u: "GWh", f: 1e-6 },
  GW: { u: "GW", f: 1 },
  MW: { u: "GW", f: 0.001 },
  KW: { u: "GW", f: 1e-6 },
};
const NUM_RE = /(\d+(?:\.\d+)?)\s*(亿千瓦时|亿千瓦|万千瓦时|万千瓦|GWh|MWh|kWh|GW|MW|kW)/g;

function numbers(text) {
  const out = [];
  let m;
  NUM_RE.lastIndex = 0;
  while ((m = NUM_RE.exec(text))) {
    const spec = UNIT[m[2].toUpperCase()] || UNIT[m[2]];
    if (spec) out.push({ v: +(parseFloat(m[1]) * spec.f).toFixed(3), u: spec.u });
  }
  return out;
}

function strip(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ");
}

function norm(s) {
  return s.replace(/[\s\u3000]+/g, "").toLowerCase();
}

async function page(url) {
  fs.mkdirSync(CACHE, { recursive: true });
  const key = crypto.createHash("sha1").update(url).digest("hex");
  const file = path.join(CACHE, key + ".html");
  if (fs.existsSync(file)) return strip(fs.readFileSync(file, "utf8"));
  if (offline) return null;
  try {
    const res = await fetch(url, {
      headers: { "user-agent": "Mozilla/5.0 (China Battery Brief claim check)" },
      signal: AbortSignal.timeout(25000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    fs.writeFileSync(file, html);
    fs.writeFileSync(file + ".url", url);
    return strip(html);
  } catch {
    return null;
  }
}

async function firecrawl(url) {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) return null;
  const hash = crypto.createHash("sha1").update(url).digest("hex");
  const file = path.join(CACHE, hash + ".md");
  if (fs.existsSync(file)) return fs.readFileSync(file, "utf8");
  if (offline) return null;
  try {
    const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer " + key },
      body: JSON.stringify({ url, formats: ["markdown"] }),
      signal: AbortSignal.timeout(60000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const md = data?.data?.markdown || "";
    if (md) fs.writeFileSync(file, md);
    return md || null;
  } catch {
    return null;
  }
}

async function lookup(url, quote) {
  const text = await page(url);
  if (text && norm(text).includes(norm(quote))) return { text, via: "static" };
  const md = await firecrawl(url);
  if (md && norm(md).includes(norm(quote))) return { text: md, via: "firecrawl" };
  return { text: text, via: text ? "static" : "none" };
}

function near(a, b) {
  return Math.abs(a - b) <= Math.max(0.02, b * 0.015);
}

async function main() {
  const file = path.join(CLAIMS_DIR, num + ".json");
  if (!fs.existsSync(file)) {
    console.error("no claim ledger: " + path.relative(ROOT, file));
    process.exit(1);
  }
  const ledger = JSON.parse(fs.readFileSync(file, "utf8"));
  const claims = ledger.claims || [];
  const ids = new Set(claims.map(c => c.id));
  const fails = [];
  const warns = [];

  for (const c of claims) {
    if (!c.id || typeof c.value !== "number" || !c.unit || !c.basis) {
      fails.push(c.id + ": missing id/value/unit/basis");
      continue;
    }
    if (c.kind === "derived" || c.kind === "threshold" || c.kind === "range") {
      for (const from of c.from || []) if (!ids.has(from)) fails.push(c.id + ": unknown from " + from);
      if (c.kind === "derived" && !(c.from || []).length) fails.push(c.id + ": derived without from");
      continue;
    }
    if (c.pending) {
      warns.push(c.id + ": pending manual verification (" + (c.note || "no note") + ")");
      continue;
    }
    if (!c.url || !c.quote) {
      fails.push(c.id + ": source claim needs url + quote");
      continue;
    }
    const { text, via } = await lookup(c.url, c.quote);
    if (text === null) {
      warns.push(c.id + ": page unavailable (cached? " + (offline ? "offline" : "fetch failed") + ")");
      continue;
    }
    if (!norm(text).includes(norm(c.quote))) {
      fails.push(c.id + ": quote not found on " + c.url + (via === "static" ? " (static HTML; try --env-file for Firecrawl)" : ""));
      continue;
    }
    const parsed = numbers(c.quote);
    if (!parsed.some(p => p.u === c.unit && near(p.v, c.value))) {
      fails.push(c.id + ": quote does not contain " + c.value + c.unit);
    }
  }

  // coverage: every unit-bearing number in the drafts must have a claim
  const drafts = fs
    .readdirSync(path.join(ROOT, "app", "db", "seed-content"))
    .concat(fs.readdirSync(path.join(ROOT, "app", "db", "seed-content-zh")))
    .filter(f => f === "issue-" + num + ".md" || f === "issue-" + num + "-zh.md");
  const draftNums = [];
  for (const f of new Set(drafts)) {
    const base = fs.existsSync(path.join(ROOT, "app", "db", "seed-content", f))
      ? path.join(ROOT, "app", "db", "seed-content", f)
      : path.join(ROOT, "app", "db", "seed-content-zh", f);
    const body = fs.readFileSync(base, "utf8").split(/\n---\n/)[0];
    draftNums.push(...numbers(body));
  }
  const missing = [];
  for (const n of draftNums) {
    if (!claims.some(c => c.unit === n.u && near(c.value, n.v))) {
      const key = n.v + n.u;
      if (!missing.includes(key)) missing.push(key);
    }
  }

  console.log("claims " + num + "  (" + claims.length + " entries)");
  for (const f of fails) console.log("  FAIL " + f);
  for (const w of warns) console.log("  warn " + w);
  if (missing.length) console.log("  coverage gaps: " + missing.join(", "));
  else console.log("  coverage: all draft numbers have a claim");

  const bad = fails.length > 0 || (strict && missing.length > 0);
  console.log(bad ? "  result: FAIL" : "  result: ok");
  process.exit(bad ? 1 : 0);
}

main();
