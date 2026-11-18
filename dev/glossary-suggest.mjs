#!/usr/bin/env node
/**
 * dev/glossary-suggest.mjs — extract English proper-noun candidates from all
 * issue drafts, drop the ones already present in the Chinese drafts, and print
 * the remainder with frequency. Output feeds the glossary mapping step.
 *
 * Usage: node dev/glossary-suggest.mjs [--min 2] [--json]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EN_DIR = path.join(ROOT, "app", "db", "seed-content");
const ZH_DIR = path.join(ROOT, "app", "db", "seed-content-zh");

const args = process.argv.slice(2);
const min = Number((args[args.indexOf("--min") + 1] || "2")) || 2;
const asJson = args.includes("--json");

const STOP = new Set(("The This That These Those In On At By For With From As But And Or If When While After Before Since Until During Within Without Under Over Between Among Through Because Although Though However Meanwhile Still Yet So Then Thus Also Even Only Both Each Every Some Any All Most More Less Few Many Much Such Other Another Same Own Just Very Well Now Here There What Which Who Whom Whose Why How Where Is Are Was Were Be Been Being Do Does Did Have Has Had Will Would Can Could May Might Must Shall Should Not No Yes China Chinese America American Europe European Asia Asian Africa African India Indian Japan Japanese Korea Korean Germany German France French UK US EU United States Kingdom Republic Province City County District January February March April May June July August September October November December Monday Tuesday Wednesday Thursday Friday Saturday Sunday New Old North South East West Central Greater Greater".split(" ")));

const ISSUE_RE = /^issue-\d+\.md$/;

function clean(md) {
  return md
    .split(/\n---\n/)[0]
    .replace(/^\[\^\d+\]:.*$/gm, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/[#*_`>|-]/g, " ")
    .replace(/\s+/g, " ");
}

function enFiles() {
  return fs.readdirSync(EN_DIR).filter(f => ISSUE_RE.test(f));
}
function zhText() {
  return fs.readdirSync(ZH_DIR)
    .filter(f => /^issue-\d+-zh\.md$/.test(f))
    .map(f => fs.readFileSync(path.join(ZH_DIR, f), "utf8"))
    .join("\n");
}

const zh = zhText();
const counts = new Map();
for (const f of enFiles()) {
  const text = clean(fs.readFileSync(path.join(EN_DIR, f), "utf8"));
  for (const sent of text.split(/(?<=[.!?])\s+/)) {
    const body = sent.replace(/^[^A-Za-z]+/, "").split(/\s+/).slice(1).join(" ");
    const re = /\b[A-Z][a-zA-Z0-9&.-]*(?:\s+[A-Z][a-zA-Z0-9&.-]*){0,2}\b/g;
    let m;
    while ((m = re.exec(body))) {
      const t = m[0].replace(/[.,;:]+$/, "").trim();
      if (t.length < 3) continue;
      if (STOP.has(t)) continue;
      if (/\s/.test(t) && t.split(/\s+/).every(w => STOP.has(w))) continue;
      counts.set(t, (counts.get(t) || 0) + 1);
    }
  }
}

const out = [...counts.entries()]
  .filter(([t, n]) => n >= min && !new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(zh))
  .sort((a, b) => b[1] - a[1]);

if (asJson) {
  console.log(JSON.stringify(out.map(([en, n]) => ({ en, n })), null, 2));
} else {
  console.log(out.map(([en, n]) => n + "\t" + en).join("\n"));
  console.log("\n" + out.length + " candidates (freq >= " + min + ")");
}
