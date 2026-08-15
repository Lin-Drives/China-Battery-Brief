/* China Battery Brief — 信源抓取器（抓取层）
 * 用法：npm run scan:sources  → 抓取启用信源的最新条目，落盘 scan/<YYYY-MM-DD>/raw/
 *
 * 输出条目 schema：
 *   { id, title, url, source, layer, pillar, publishedAt, discoveredAt, summary }
 *   id = sha256(url) 前 16 位（增量去重键）
 *   双时间戳：publishedAt 原文发布时间 / discoveredAt 本机发现时间（处理慢推信源）
 *
 * 设计：并发（默认 4）+ 边抓边写——即使部分源失败，已完成的结果也已落盘。
 */

import { mkdirSync, readdirSync, readFileSync, writeFileSync, existsSync, statSync } from "fs";
import { join } from "path";
import { createHash } from "crypto";
import { dirname } from "path";
import { fileURLToPath } from "url";
import { RSSHUB_INSTANCES, enabledSources } from "./config";
import type { SourceConfig } from "./config";
import { parseForSource, htmlItemsToScanned } from "./parse-html";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "scan");
const CONCURRENCY = 4;
const FETCH_TIMEOUT_MS = 12000;
/** 慢速源（政府站等敏感站点）串行请求之间的最小间隔（毫秒），避免突发访问。 */
const SLOW_GAP_MS = 6000;
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

export interface ScannedItem {
  id: string
  title: string
  url: string
  source: string
  layer: string
  pillar: string
  publishedAt: string | null
  discoveredAt: string
  summary: string | null
}

interface RawFeedItem {
  title?: string
  link?: string
  pubDate?: string
  isoDate?: string
  summary?: string
}

function todayDir(): string {
  return new Date().toISOString().slice(0, 10)
}

async function fetchText(url: string, timeoutMs = FETCH_TIMEOUT_MS): Promise<string> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "*/*" },
      signal: ctrl.signal,
      redirect: "follow",
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.text()
  } finally {
    clearTimeout(timer)
  }
}

function parseRss(xml: string): RawFeedItem[] {
  const items: RawFeedItem[] = []
  const itemRe = /<item[^>]*>([\s\S]*?)<\/item>/gi
  let m: RegExpExecArray | null
  while ((m = itemRe.exec(xml)) !== null) {
    const block = m[1]
    const grab = (tag: string): string | undefined => {
      const r = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i").exec(block)
      return r ? r[1].trim() : undefined
    }
    items.push({
      title: grab("title")?.replace(/<!\[CDATA\[|\]\]>/g, "").trim(),
      link: grab("link")?.trim(),
      pubDate: grab("pubDate")?.trim() ?? grab("dc:date")?.trim(),
      isoDate: grab("isoDate")?.trim(),
      summary: grab("description")?.replace(/<!\[CDATA\[|\]\]>/g, "").trim(),
    })
  }
  return items
}

function normalizeUrl(raw: string | undefined): string | null {
  if (!raw) return null
  const u = raw.trim()
  if (!/^https?:\/\//i.test(u)) return null
  return u
}

function stamp(): string {
  return new Date().toISOString()
}

function hashUrl(url: string): string {
  return createHash("sha256").update(url).digest("hex").slice(0, 16)
}

function toItems(src: SourceConfig, feedItems: RawFeedItem[]): ScannedItem[] {
  const discovered = stamp()
  return feedItems
    .map((it) => {
      const url = normalizeUrl(it.link)
      if (!url || !it.title) return null
      const pub = it.isoDate ?? it.pubDate ?? null
      return {
        id: hashUrl(url),
        title: it.title,
        url,
        source: src.key,
        layer: src.layer,
        pillar: src.pillar,
        publishedAt: pub ? new Date(pub).toISOString() : null,
        discoveredAt: discovered,
        summary: it.summary ?? null,
      } satisfies ScannedItem
    })
    .filter((x): x is ScannedItem => x !== null)
}

async function fetchRss(src: SourceConfig): Promise<ScannedItem[]> {
  const xml = await fetchText(src.url)
  return toItems(src, parseRss(xml))
}

async function fetchRsshub(src: SourceConfig): Promise<ScannedItem[]> {
  if (!src.rsshubRoute) throw new Error(`${src.key}: missing rsshubRoute`)
  let lastErr: unknown = null
  for (const inst of RSSHUB_INSTANCES) {
    try {
      const xml = await fetchText(`${inst}/${src.rsshubRoute}`)
      const items = parseRss(xml)
      if (items.length === 0) throw new Error("empty feed")
      return toItems(src, items)
    } catch (e) {
      lastErr = e
    }
  }
  throw new Error(`${src.key}: all RSSHub instances failed — ${String(lastErr)}`)
}

/** 慢速源串行队列：同一时刻只允许一个慢速请求在执行，且相邻请求间隔 SLOW_GAP_MS。 */
let slowTail: Promise<void> = Promise.resolve()
function enqueueSlow<T>(task: () => Promise<T>): Promise<T> {
  const run = slowTail.then(async () => {
    // 间隔（错峰）：队头请求完成后等一个 gap 再发下一个
    await new Promise((r) => setTimeout(r, SLOW_GAP_MS))
    return task()
  })
  // 保证链式串行：即使本次失败也继续队列
  slowTail = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

/** 该源最近一次抓取时间戳（从 scan/<date>/raw-html/<key>.html 的 mtime 推断）。 */
function lastHtmlFetchAt(src: SourceConfig): number {
  let latest = 0
  for (const d of readdirSync(ROOT)) {
    const p = join(ROOT, d, "raw-html", `${src.key}.html`)
    if (!existsSync(p)) continue
    const t = statSync(p).mtimeMs
    if (t > latest) latest = t
  }
  return latest
}

/** 复用最近一次该源抓取的条目（用于冷却期内跳过请求时，不丢内容）。 */
function cachedHtmlItems(src: SourceConfig): ScannedItem[] | null {
  let best: ScannedItem[] | null = null
  let bestAt = 0
  for (const d of readdirSync(ROOT)) {
    const p = join(ROOT, d, "raw", `${src.key}.json`)
    if (!existsSync(p)) continue
    const t = statSync(p).mtimeMs
    if (t <= bestAt) continue
    try {
      const items = JSON.parse(readFileSync(p, "utf8")) as ScannedItem[]
      best = items
      bestAt = t
    } catch {
      /* 坏文件忽略 */
    }
  }
  return best
}

async function fetchHtmlRaw(src: SourceConfig): Promise<ScannedItem[]> {
  // 冷却期检查：距上次抓取不足 cooldownDays 天 → 不发起请求，复用缓存
  if (src.cooldownDays && src.cooldownDays > 0) {
    const last = lastHtmlFetchAt(src)
    if (last > 0 && Date.now() - last < src.cooldownDays * 24 * 3600 * 1000) {
      const cached = cachedHtmlItems(src)
      if (cached) {
        console.log(`  ∿ ${src.key.padEnd(14)} ${src.name.padEnd(20)} COOLDOWN — reuse cached (${cached.length} items)`)
        return cached
      }
    }
  }

  const html = await fetchText(src.url)
  const rawDir = join(ROOT, todayDir(), "raw-html")
  mkdirSync(rawDir, { recursive: true })
  writeFileSync(join(rawDir, `${src.key}.html`), html)

  const parsed = parseForSource(src, html)
  if (parsed.length === 0) {
    // 无解析规则或解析为空：落一个占位记录，标注待处理
    return [
      {
        id: hashUrl(`html:${src.key}:${todayDir()}`),
        title: `[HTML] ${src.name} — 列表页已存档，解析未命中`,
        url: src.url,
        source: src.key,
        layer: src.layer,
        pillar: src.pillar,
        publishedAt: null,
        discoveredAt: stamp(),
        summary: `已抓取 ${html.length} 字节到 scan/${todayDir()}/raw-html/${src.key}.html，待补充解析规则`,
      } satisfies ScannedItem,
    ]
  }
  return htmlItemsToScanned(src, parsed)
}

async function runTask(src: SourceConfig): Promise<{ src: SourceConfig; items: ScannedItem[] }> {
  if (src.kind === "rss") return { src, items: await fetchRss(src) }
  if (src.kind === "rsshub") return { src, items: await fetchRsshub(src) }
  // 慢速源（政府站等）串行 + 间隔，避免并发突发
  if (src.slow) return { src, items: await enqueueSlow(() => fetchHtmlRaw(src)) }
  return { src, items: await fetchHtmlRaw(src) }
}

async function loadSeenIds(): Promise<Set<string>> {
  const seen = new Set<string>()
  if (!existsSync(ROOT)) return seen
  for (const d of readdirSync(ROOT)) {
    const rawDir = join(ROOT, d, "raw")
    if (!existsSync(rawDir)) continue
    for (const f of readdirSync(rawDir)) {
      try {
        const items = JSON.parse(readFileSync(join(rawDir, f), "utf8")) as ScannedItem[]
        items.forEach((i) => seen.add(i.id))
      } catch {
        /* 忽略坏文件 */
      }
    }
  }
  return seen
}

async function main() {
  const date = todayDir()
  const outDir = join(ROOT, date, "raw")
  mkdirSync(outDir, { recursive: true })
  const sources = enabledSources()
  const seen = await loadSeenIds()
  console.log(`Scanning ${sources.length} enabled sources → scan/${date}/raw/ (concurrency=${CONCURRENCY})\n`)

  const fresh: ScannedItem[] = []
  const freshBySource = new Map<string, ScannedItem[]>()
  let fail = 0
  let idx = 0

  async function worker() {
    while (true) {
      const n = idx++
      if (n >= sources.length) return
      const src = sources[n]
      try {
        const { items } = await runTask(src)
        const newOnes = items.filter((i) => !seen.has(i.id))
        items.forEach((i) => seen.add(i.id))
        fresh.push(...newOnes)
        freshBySource.set(src.key, newOnes)
        // 边抓边写：立即落盘该源结果（含历史全量）
        writeFileSync(join(outDir, `${src.key}.json`), JSON.stringify(items, null, 2))
        console.log(
          `  ✓ ${src.key.padEnd(14)} ${src.name.padEnd(20)} ${String(items.length).padStart(4)} items, ${String(newOnes.length).padStart(4)} new`,
        )
      } catch (e) {
        fail++
        console.log(`  ✗ ${src.key.padEnd(14)} ${src.name.padEnd(20)} FAILED — ${String(e)}`)
      }
    }
  }

  const workers = Array.from({ length: Math.min(CONCURRENCY, sources.length) }, () => worker())
  await Promise.all(workers)

  // 汇总：_all.json 写当日抓到的全量（供整理层），_all_new.json 写当日新增
  const allToday = fresh.filter((i) => i.discoveredAt.startsWith(date))
  const todayFull: ScannedItem[] = []
  for (const src of sources) {
    try {
      const items = JSON.parse(readFileSync(join(outDir, `${src.key}.json`), "utf8")) as ScannedItem[]
      todayFull.push(...items)
    } catch {
      /* 该源失败无文件，跳过 */
    }
  }
  // 按 id 去重
  const seenFull = new Set<string>()
  const dedupedFull = todayFull.filter((i) => (seenFull.has(i.id) ? false : (seenFull.add(i.id), true)))
  writeFileSync(join(outDir, "_all.json"), JSON.stringify(dedupedFull, null, 2))
  writeFileSync(join(outDir, "_all_new.json"), JSON.stringify(allToday, null, 2))
  writeFileSync(join(outDir, "_summary.txt"), buildSummary(dedupedFull))

  console.log(
    `\nDone: ${sources.length} sources, ${dedupedFull.length} total today, ${allToday.length} new (dedup across history), ${fail} failed.`,
  )
  console.log(`Today's items → scan/${date}/raw/_all.json`)
}

function buildSummary(items: ScannedItem[]): string {
  const byPillar: Record<string, ScannedItem[]> = {}
  for (const i of items) {
    ;(byPillar[i.pillar] ??= []).push(i)
  }
  const pillarName: Record<string, string> = {
    "overseas-capacity": "① 产能地图",
    geopolitics: "② 政策追踪",
    markets: "③ 市场信号",
    storage: "④ 储能（筛电池出口相关）",
    mixed: "（综合/待分类）",
  }
  const lines = [
    `# 扫描简报 — ${todayDir()}`,
    `> 生成时间：${stamp()} · 新增 ${items.length} 条（历史去重后）`,
    "",
  ]
  for (const [pillar, list] of Object.entries(byPillar)) {
    lines.push(`## ${pillarName[pillar] ?? pillar}（${list.length}）`, "")
    for (const i of list) {
      lines.push(`- **${i.title}**`)
      lines.push(`  - 来源：${i.source} · ${i.layer} · 发布 ${i.publishedAt ?? "未知"} · 发现 ${i.discoveredAt}`)
      lines.push(`  - 链接：${i.url}`)
      if (i.summary) lines.push(`  - 摘要：${i.summary.slice(0, 160)}`)
      lines.push("")
    }
  }
  return lines.join("\n")
}

main().catch((e) => {
  console.error("Scan failed:", e)
  process.exit(1)
})
