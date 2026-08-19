#!/usr/bin/env node
/**
 * CBB DevBoard — 生成开发进度可视化展板（静态 HTML，纯 SVG/CSS，无外部依赖）。
 * 用法：node devboard.mjs [out.html]
 * 数据来源：git log / TODO.md / plan.md / deploy.md / app 代码目录（实时扫描）。
 * 设计基调对齐站点：编辑部暗色（ink-900 #0C1017 / 纸色 #F4F0E6）+ volt #C9F24B 点缀 + 铜色系。
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const APP = path.join(ROOT, "app");
const OUT = process.argv[2] || path.join(__dirname, "devboard.html");

/* ── 调色板 ─────────────────────────────────────────────── */
const C = {
  bg: "#0C1017",
  panel: "#131A24",
  panel2: "#1A222F",
  line: "#232D3D",
  paper: "#F4F0E6",
  dim: "#8E97A8",
  faint: "#4A5568",
  volt: "#C9F24B",
  copper: "#C08552",
  amber: "#F0A832",
  teal: "#5ADFC3",
  red: "#E5694B",
};

/* ── 工具函数 ───────────────────────────────────────────── */
const sh = (cmd, cwd = ROOT) => {
  try {
    return execSync(cmd, { cwd, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }).trim();
  } catch {
    return "";
  }
};

/** 简单 HTML 转义 */
const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** 中位数均分一个数字序列 */
const histo = (arr, bins) => {
  if (!arr.length) return new Array(bins).fill(0);
  const min = Math.min(...arr);
  const max = Math.max(...arr);
  const range = max - min || 1;
  const out = new Array(bins).fill(0);
  for (const v of arr) out[Math.min(bins - 1, Math.floor(((v - min) / range) * bins))]++;
  return out;
};

/* ── 数据收集：Git ──────────────────────────────────────── */
const gitLog = sh('git log --pretty=format:"%ad|%s" --date=format:"%Y-%m-%d"')
  .split("\n")
  .filter(Boolean)
  .map((line) => {
    const [date, ...rest] = line.split("|");
    return { date, subject: rest.join("|") };
  });
const commitCount = gitLog.length;
const dates = [...new Set(gitLog.map((c) => c.date))].sort();
const commitsByDate = dates.map((d) => gitLog.filter((c) => c.date === d).length);

const gitTypes = (() => {
  const kw = [
    ["内容", ["内容", "期刊", "issue", "封", "信源", "翻译", "校对"]],
    ["前端", ["前端", "页面", "组件", "UI", "样式", "阅读", "路由"]],
    ["安全", ["安全", "限流", "CSRF", "OAuth", "审计", "加固"]],
    ["部署", ["部署", "VPS", "MariaDB", "Nginx", "systemd", "平台"]],
    ["流水线", ["扫描", "scan", "解析", "抓取", "流水线", "自动化"]],
    ["文档", ["文档", "docs", "README", "plan", "TODO", "登记"]],
  ];
  const counts = {};
  for (const [name] of kw) counts[name] = 0;
  let other = 0;
  for (const c of gitLog) {
    const hit = kw.find(([, keys]) => keys.some((k) => c.subject.toLowerCase().includes(k)));
    if (hit) counts[hit[0]]++;
    else other++;
  }
  counts["其他"] = other;
  return Object.entries(counts).filter(([, v]) => v > 0);
})();

const branchSummary = sh("git branch --show-current") || "?";
const branches = sh("git for-each-ref --format='%(refname:short)' refs/heads")
  .split("\n")
  .filter(Boolean);
const remotes = sh("git remote -v").includes("github.com") ? 1 : 0;

/* ── 数据收集：TODO / plan / deploy 勾选状态 ────────────── */
const readMd = (p) => (fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "");
const countChecks = (txt) => {
  const done = (txt.match(/^\s*- \[x\]/gm) || []).length;
  const todo = (txt.match(/^\s*- \[ \]/gm) || []).length;
  return { done, todo, total: done + todo };
};
const todoMd = readMd(path.join(ROOT, "TODO.md"));
const todoChecks = countChecks(todoMd);
const planMd = readMd(path.join(ROOT, "docs/plan.md"));
const deployMd = readMd(path.join(ROOT, "docs/deploy.md"));

/* deploy.md 的 Step 状态（依据 Step 行的勾选 + 末尾待办清单） */
const deploySteps = ["Step 0", "Step 1", "Step 2", "Step 3", "Step 4", "Step 5", "Step 6", "Step 7", "Step 8"];
const todoSections = deployMd.split("## ").find((sec) => sec.startsWith("八、")) || "";
// 待办清单里所有已勾选行（支持 "Step 1/4/5" 合并写法 → 展开为多个 Step）
const doneStepNums = new Set();
for (const l of todoSections.split("\n")) {
  if (!l.includes("[x]")) continue;
  const m = l.match(/Step\s+([0-9/]+)/g);
  if (!m) continue;
  for (const token of m) {
    for (const n of token.replace(/^Step\s*/, "").split("/")) {
      if (n) doneStepNums.add(parseInt(n, 10));
    }
  }
}
const stepStatus = deploySteps.map((s) => {
  const headerLine = deployMd.split("\n").find((l) => l.startsWith(`### ${s}`)) || "";
  const name = headerLine.replace(`### ${s} — `, "").replace(`### ${s} —`, "").trim();
  const num = parseInt(s.replace("Step ", ""), 10);
  const state = doneStepNums.has(num) ? "done" : "pending";
  return { step: s, name, state };
});

/* plan.md 队列勾选 */
const queues = ["A", "B", "C", "D", "E"].map((q) => {
  const sec = (planMd.match(new RegExp(`### 队列 ${q} — [^\\n]*\\n([\\s\\S]*?)(?=\\n### |\\n## )`)) || [])[1] || "";
  const c = countChecks(sec);
  return { q, done: c.done, todo: c.todo };
});

/* ── 数据收集：代码与内容 ───────────────────────────────── */
const countLoc = (dir) => {
  const exts = [".ts", ".tsx"];
  const files = [];
  const walk = (d) => {
    if (!fs.existsSync(d)) return;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.name === "node_modules" || e.name.startsWith(".")) continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (exts.includes(path.extname(e.name))) files.push(p);
    }
  };
  walk(path.join(APP, dir));
  const lines = files.reduce((acc, f) => acc + fs.readFileSync(f, "utf8").split("\n").length, 0);
  return { files: files.length, lines };
};
const loc = {
  src: countLoc("src"),
  api: countLoc("api"),
  db: countLoc("db"),
  contracts: countLoc("contracts"),
  scan: countLoc("scan"),
};
const totalLoc = Object.values(loc).reduce((a, x) => a + x.lines, 0);

const countByExt = (dir, exts) => {
  const out = {};
  const walk = (d) => {
    if (!fs.existsSync(d)) return;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.name === "node_modules" || e.name.startsWith(".")) continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else {
        const ext = path.extname(e.name).slice(1);
        if (exts.includes(ext)) out[ext] = (out[ext] || 0) + 1;
      }
    }
  };
  walk(path.join(APP, dir));
  return out;
};

const pageCount = (() => {
  const p = path.join(APP, "src/pages");
  return fs.existsSync(p) ? fs.readdirSync(p).filter((f) => f.endsWith(".tsx")).length : 0;
})();
const componentCount = (() => {
  const p = path.join(APP, "src/components");
  if (!fs.existsSync(p)) return 0;
  let n = 0;
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p2 = path.join(d, e.name);
      if (e.isDirectory()) walk(p2);
      else if (e.name.endsWith(".tsx")) n++;
    }
  };
  walk(p);
  return n;
})();

const tableCount = (() => {
  const s = readMd(path.join(APP, "db/schema.ts"));
  return (s.match(/mysqlTable\(/g) || []).length;
})();

const routes = (() => {
  const s = readMd(path.join(APP, "src/App.tsx"));
  const m = [...s.matchAll(/path=\{?"([^"?}]+)/g)].map((x) => x[1]);
  return m.length;
})();

const seedIssues = (() => {
  const dir = path.join(APP, "db/seed-content");
  return fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.startsWith("issue-")).length : 0;
})();
const seedIssuesZh = (() => {
  const dir = path.join(APP, "db/seed-content-zh");
  return fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.startsWith("issue-")).length : 0;
})();
const sources = (() => {
  const p = path.join(APP, "scan/config.ts");
  const s = readMd(p);
  const m = [...s.matchAll(/id:\s*["']([^"']+)["']/g)];
  return m.length;
})();

const coverSvg = (() => {
  const dir = path.join(APP, "public");
  if (!fs.existsSync(dir)) return 0;
  return fs.readdirSync(dir).filter((f) => /^cover-.*\.svg$/.test(f)).length;
})();

/* ── SVG 生成器 ─────────────────────────────────────────── */

/** 圆形仪表环（中心大数字） */
const gauge = (pct, label, num, sub, color, size = 150) => {
  const r = (size - 26) / 2;
  const cx = size / 2;
  const circ = 2 * Math.PI * r;
  const dash = (circ * pct) / 100;
  return `
  <svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
    <circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="${C.panel2}" stroke-width="10"/>
    <circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="${color}" stroke-width="10"
      stroke-linecap="round" stroke-dasharray="${dash} ${circ}" transform="rotate(-90 ${cx} ${cx})"/>
    <text x="${cx}" y="${cx - 4}" text-anchor="middle" fill="${C.paper}" font-size="30" font-weight="700">${esc(num)}</text>
    <text x="${cx}" y="${cx + 22}" text-anchor="middle" fill="${C.dim}" font-size="12">${esc(label)}</text>
    ${sub ? `<text x="${cx}" y="${cx + 40}" text-anchor="middle" fill="${color}" font-size="10">${esc(sub)}</text>` : ""}
  </svg>`;
};

/** Git 活跃度点阵（x=日期 y=强度，仿贡献热力图） */
const dotMatrix = (dates, counts) => {
  const cell = 26;
  const gap = 10;
  const pad = 46;
  const w = dates.length * (cell + gap) + pad;
  const h = 150;
  const maxC = Math.max(...counts, 1);
  let cells = "";
  dates.forEach((d, i) => {
    const n = counts[i];
    const lvl = n / maxC;
    const fill = n === 0 ? C.faint : lvl > 0.66 ? C.volt : lvl > 0.33 ? C.copper : C.amber;
    const x = pad + i * (cell + gap);
    const y = 78;
    const r = n === 0 ? 5 : 7 + lvl * 5;
    cells += `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" opacity="${n === 0 ? 0.35 : 0.85}">
      <title>${d} · ${n} commit${n === 1 ? "" : "s"}</title></circle>`;
    cells += `<text x="${x}" y="116" text-anchor="middle" fill="${C.dim}" font-size="10">${d.slice(5)}</text>`;
  });
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}">
    <text x="${pad}" y="34" fill="${C.paper}" font-size="15" font-weight="700">Git 活跃度 · ${dates.length} 个活跃日</text>
    <line x1="${pad}" y1="78" x2="${w - 10}" y2="78" stroke="${C.line}" stroke-width="1"/>
    ${cells}
  </svg>`;
};

/** 环形工作流进度条（四象限两两一组） */
const rings = (items) => {
  const n = items.length;
  const cols = n <= 2 ? 2 : 3;
  let out = "";
  items.forEach((it, i) => {
    const g = gauge(it.pct, it.label, `${it.pct}%`, it.sub, it.color, 130);
    out += `<div class="ring-cell">${g}</div>`;
  });
  return `<div class="rings" style="grid-template-columns:repeat(${Math.min(cols, n)},1fr)">${out}</div>`;
};

/** 地铁线路式部署轨道 */
const metro = (steps) => {
  let segs = "";
  const stationW = 96;
  steps.forEach((s, i) => {
    const color = s.state === "done" ? C.volt : s.state === "paused" ? C.amber : C.faint;
    const big = s.state === "paused";
    const statusMark = s.state === "done" ? "●" : s.state === "paused" ? "‖" : "○";
    segs += `
    <g>
      ${i < steps.length - 1 ? `<line x1="${stationW * (i + 0.5)}" y1="52" x2="${stationW * (i + 1.5)}" y2="52" stroke="${s.state === "done" && steps[i + 1].state !== "pending" ? C.copper : C.line}" stroke-width="6"/>` : ""}
      <circle cx="${stationW * (i + 0.5)}" cy="52" r="${big ? 12 : 9}" fill="${color}" opacity="0.9">
        <title>${s.step} — ${s.name || ""} [${s.state}]</title></circle>
      <text x="${stationW * (i + 0.5)}" y="52" text-anchor="middle" dominant-baseline="central" fill="${C.bg}" font-size="10" font-weight="700">${statusMark}</text>
      <text x="${stationW * (i + 0.5)}" y="84" text-anchor="middle" fill="${s.state === "pending" ? C.faint : C.paper}" font-size="11" font-weight="${s.state === "done" ? 700 : 400}">${s.step}</text>
    </g>`;
  });
  const w = steps.length * stationW;
  return `<svg viewBox="0 0 ${w} 110" width="100%">
    <text x="0" y="18" fill="${C.paper}" font-size="15" font-weight="700">VPS 部署轨道</text>
    ${segs}
  </svg>`;
};

/** 堆叠横条（按占比着色） */
const stackedBars = (items, label) => {
  const total = items.reduce((a, x) => a + x.value, 0) || 1;
  const barH = 26;
  let segs = "";
  for (const it of items) {
    const w = (it.value / total) * 100;
    if (w <= 0.1) continue;
    segs += `<div class="stack-seg" style="width:${w.toFixed(2)}%;background:${it.color}" title="${it.label} · ${it.value.toLocaleString()} 行"></div>`;
  }
  const legend = items
    .filter((it) => it.value > 0)
    .map(
      (it) =>
        `<span class="legend"><i style="background:${it.color}"></i>${it.label} ${it.value.toLocaleString()}</span>`,
    )
    .join("");
  return `
    <div class="stack-wrap">
      <div class="stack-head"><b>${esc(label)}</b><span class="dim">${total.toLocaleString()} 行</span></div>
      <div class="stack-bar">${segs}</div>
      <div class="stack-legend">${legend}</div>
    </div>`;
};

/** 内容支柱四宫格 */
const pillarCells = () => {
  const cells = [
    { name: "产能地图", sub: "Tracker", color: C.volt, facts: [["19", "站点"], ["11", "国家"], ["464", "GWh"]] },
    { name: "技术路线", sub: "Tech", color: C.copper, facts: [["LFP", "vs"], ["固态", "SSB"]] },
    { name: "政策追踪", sub: "Policy", color: C.teal, facts: [["12", "事件"], ["IRA /", "护照"]] },
    { name: "市场信号", sub: "Markets", color: C.amber, facts: [["2", "期"], ["044–050", "全覆盖"]] },
  ];
  return cells
    .map(
      (c) => `
      <div class="pillar" style="border-color:${c.color}">
        <div class="pillar-head"><span class="pillar-dot" style="background:${c.color}"></span>
          <div><b>${c.name}</b><span class="dim">${c.sub}</span></div></div>
        <div class="pillar-facts">
          ${c.facts.map(([n, l]) => `<div><b>${n}</b><span>${l}</span></div>`).join("")}
        </div>
      </div>`,
    )
    .join("");
};

/** 队列勾选迷你进度环 */
const queueCell = (q, done, todo) => {
  const total = done + todo;
  const pct = total ? Math.round((done / total) * 100) : 0;
  return `<div class="queue-cell">
    <div class="q-gauge" style="--pct:${pct}">
      <div class="q-inner"><b>${pct}%</b></div>
    </div>
    <div class="q-meta"><b>队列 ${q}</b><span>${done}/${total} 项</span></div>
  </div>`;
};

/* ── 组装页面 ───────────────────────────────────────────── */
const locItems = [
  { label: "前端 src", value: loc.src.lines, color: C.volt },
  { label: "后端 api", value: loc.api.lines, color: C.copper },
  { label: "数据库 db", value: loc.db.lines, color: C.teal },
  { label: "契约 contracts", value: loc.contracts.lines, color: C.amber },
  { label: "扫描 scan", value: loc.scan.lines, color: C.dim },
];

const deployPct = Math.round((stepStatus.filter((s) => s.state === "done").length / stepStatus.length) * 100);

const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>CBB DevBoard</title>
<style>
  :root { color-scheme: dark; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { background:${C.bg}; color:${C.paper}; font-family:-apple-system,"SF Pro SC","PingFang SC","Helvetica Neue",sans-serif; line-height:1.5; }
  .wrap { max-width:1200px; margin:0 auto; padding:36px 28px 80px; }
  .top { display:flex; align-items:baseline; justify-content:space-between; border-bottom:1px solid ${C.line}; padding-bottom:20px; margin-bottom:28px; }
  .top h1 { font-size:22px; letter-spacing:0.05em; font-weight:800; }
  .top h1 span { color:${C.volt}; }
  .top .meta { color:${C.dim}; font-size:12px; text-align:right; }
  .gauge-row { display:flex; flex-wrap:wrap; gap:8px; justify-content:space-between; margin-bottom:34px; }
  .gauge-row > div { flex:1 1 130px; display:flex; justify-content:center; }
  section { margin-bottom:34px; }
  .panel { background:${C.panel}; border:1px solid ${C.line}; border-radius:16px; padding:22px; }
  .panel h2 { font-size:15px; margin-bottom:18px; font-weight:700; letter-spacing:0.02em; }
  .panel h2 em { color:${C.dim}; font-style:normal; font-size:12px; font-weight:400; margin-left:8px; }
  .rings { display:grid; gap:14px; }
  .ring-cell { display:flex; justify-content:center; }
  .stack-wrap { margin-bottom:16px; }
  .stack-head { display:flex; justify-content:space-between; align-items:baseline; margin-bottom:6px; font-size:13px; }
  .stack-head .dim { color:${C.dim}; font-size:11px; }
  .stack-bar { background:${C.panel2}; border-radius:6px; overflow:hidden; height:26px; width:100%; display:flex; }
  .stack-seg { height:100%; }
  .stack-legend { display:flex; flex-wrap:wrap; gap:12px; margin-top:8px; font-size:11px; color:${C.dim}; }
  .legend { display:inline-flex; align-items:center; gap:5px; }
  .legend i { width:9px; height:9px; border-radius:2px; display:inline-block; }
  .pillars { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:14px; }
  .pillar { background:${C.panel2}; border:1px solid ${C.line}; border-left-width:3px; border-radius:12px; padding:16px; }
  .pillar-head { display:flex; align-items:center; gap:10px; margin-bottom:14px; }
  .pillar-dot { width:12px; height:12px; border-radius:3px; }
  .pillar-head b { display:block; font-size:15px; }
  .pillar-head .dim { font-size:11px; }
  .pillar-facts { display:flex; gap:18px; }
  .pillar-facts b { font-size:20px; display:block; color:${C.paper}; }
  .pillar-facts span { font-size:11px; color:${C.dim}; }
  .queues { display:grid; grid-template-columns:repeat(auto-fit,minmax(120px,1fr)); gap:14px; }
  .queue-cell { background:${C.panel2}; border-radius:12px; padding:14px; text-align:center; }
  .q-gauge { width:64px; height:64px; margin:0 auto 8px; border-radius:50%;
    background:conic-gradient(${C.volt} calc(var(--pct)*1%), ${C.panel} 0); display:grid; place-items:center; }
  .q-inner { width:50px; height:50px; border-radius:50%; background:${C.panel2}; display:grid; place-items:center; }
  .q-inner b { font-size:15px; }
  .q-meta b { display:block; font-size:13px; }
  .q-meta span { color:${C.dim}; font-size:11px; }
  .foot { color:${C.faint}; font-size:11px; margin-top:30px; text-align:center; }
  .foot code { background:${C.panel2}; padding:2px 6px; border-radius:4px; }
</style>
</head>
<body>
<div class="wrap">
  <div class="top">
    <h1>CBB <span>DEVBOARD</span></h1>
    <div class="meta">生成于 ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC<br/>分支 ${esc(branchSummary)}</div>
  </div>

  <div class="gauge-row">
    <div>${gauge(100, "提交", commitCount, `${dates.length} 活跃日`, C.volt)}</div>
    <div>${gauge(Math.min(100, Math.round(totalLoc / 300)), "代码行", totalLoc.toLocaleString(), `${loc.files + loc.api.files + loc.db.files} 文件`, C.copper)}</div>
    <div>${gauge(100, "期刊内容", seedIssues, `${seedIssuesZh} 期中译`, C.teal)}</div>
    <div>${gauge(100, "前端组件", componentCount, `${pageCount} 页面 · ${routes} 路由`, C.amber)}</div>
    <div>${gauge(100, "数据表", tableCount, `${sources} 信源`, C.dim)}</div>
    <div>${gauge(deployPct, "部署", deployPct + "%", "Step 0–8", C.volt)}</div>
  </div>

  <section class="panel">
    ${dotMatrix(dates, commitsByDate)}
  </section>

  <section class="panel">
    <h2>工作流完成度<em>按近期提交关键词归类</em></h2>
    ${rings(
      gitTypes.map(([label, n], i) => ({
        pct: Math.round((n / commitCount) * 100),
        label,
        sub: `${n} 提交`,
        color: [C.volt, C.copper, C.teal, C.amber, C.dim, C.red][i % 6],
      })),
    )}
  </section>

  <section class="panel">
    <h2>任务台账<em>TODO.md</em></h2>
    ${rings([
      { pct: Math.round((todoChecks.done / (todoChecks.total || 1)) * 100), label: "已完成", sub: `${todoChecks.done} 项`, color: C.volt },
      { pct: Math.round((todoChecks.todo / (todoChecks.total || 1)) * 100), label: "待办", sub: `${todoChecks.todo} 项`, color: C.amber },
    ])}
  </section>

  <section class="panel">
    ${metro(stepStatus)}
  </section>

  <section class="panel">
    <h2>内容支柱<em>四大板块</em></h2>
    <div class="pillars">${pillarCells()}</div>
  </section>

  <section class="panel">
    <h2>代码构成<em>按目录</em></h2>
    ${stackedBars(locItems, "TypeScript / React 代码分布")}
  </section>

  <section class="panel">
    <h2>长期战略队列<em>plan.md</em></h2>
    <div class="queues">${queues.map((q) => queueCell(q.q, q.done, q.todo)).join("")}</div>
  </section>

  <div class="foot">
    DevBoard · 数据自动扫描 <code>node devboard.mjs</code> 重建 · ${branchSummary} 分支 · ${remotes ? "已关联 GitHub 远端" : "无远端"} · 分支：${branches.map((b) => esc(b)).join(" / ")}
  </div>
</div>
</body>
</html>`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, html, "utf8");
console.log(`✓ DevBoard 已生成：${OUT}`);
console.log(`  ${commitCount} commits / ${totalLoc.toLocaleString()} 行 / ${seedIssues} 期 / ${tableCount} 表`);
