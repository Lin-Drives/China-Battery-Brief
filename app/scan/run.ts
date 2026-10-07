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

import { config as dotenvConfig } from "dotenv";
import { mkdirSync, readdirSync, readFileSync, writeFileSync, existsSync, statSync } from "fs";
import { join } from "path";
import { createHash } from "crypto";
import { dirname } from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { RSSHUB_INSTANCES, EM_WATCHLIST, enabledSources } from "./config";
import type { SourceConfig } from "./config";
import { parseForSource, htmlItemsToScanned } from "./parse-html";

const __dirname = dirname(fileURLToPath(import.meta.url));
// 显式从 app/.env 加载，避免 launchd 等以非 app/ 为 cwd 启动时读不到密钥
dotenvConfig({ path: join(__dirname, "..", ".env") });
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

/** 最近一次该源存档的原始 HTML 文件路径（用于冷却期内重跑解析器，无需新请求）。 */
function latestHtmlArchive(src: SourceConfig): { html: string; date: string } | null {
  let best: { html: string; date: string } | null = null
  let bestAt = 0
  for (const d of readdirSync(ROOT)) {
    const p = join(ROOT, d, "raw-html", `${src.key}.html`)
    if (!existsSync(p)) continue
    const t = statSync(p).mtimeMs
    if (t <= bestAt) continue
    best = { html: readFileSync(p, "utf8"), date: d }
    bestAt = t
  }
  return best
}

async function fetchHtmlRaw(src: SourceConfig): Promise<ScannedItem[]> {
  // 冷却期检查：距上次抓取不足 cooldownDays 天 → 不发起新请求。
  if (src.cooldownDays && src.cooldownDays > 0) {
    const last = lastHtmlFetchAt(src)
    if (last > 0 && Date.now() - last < src.cooldownDays * 24 * 3600 * 1000) {
      // 优先：用最近存档的原始 HTML 重跑解析器（解析规则升级后无需等冷却期即可生效）
      const archive = latestHtmlArchive(src)
      if (archive) {
        const parsed = parseForSource(src, archive.html)
        const items = parsed.length > 0 ? htmlItemsToScanned(src, parsed) : null
        if (items) {
          console.log(`  ∿ ${src.key.padEnd(14)} ${src.name.padEnd(20)} COOLDOWN — reparse cached (${items.length} items)`)
          return items
        }
      }
      // 兜底：复用已落盘的条目
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

/* Firecrawl —— 无头渲染 + 反爬抓取（经官方 API）。
 * 用于原 RSS/HTML 抓不到的 JS 渲染、反爬、登录墙类信源。
 * 依赖环境变量 FIRECRAWL_API_KEY（firecrawl.dev 注册后生成）。
 */

interface FcLink {
  url?: string
  text?: string
}

async function fcRequest<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const key = process.env.FIRECRAWL_API_KEY
  if (!key) throw new Error("FIRECRAWL_API_KEY not set")
  const res = await fetch(`https://api.firecrawl.dev/v1${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60000),
  })
  if (!res.ok) throw new Error(`Firecrawl ${path} HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`)
  const json = (await res.json()) as T
  return json
}

/** 过滤掉导航/页脚/图片类链接，只保留像文章的条目。 */
function isArticleLike(url: string, text: string): boolean {
  const u = url.toLowerCase()
  if (/(?:\.(?:png|jpe?g|gif|svg|webp|avif|bmp|ico))(?:\?|#|$)/i.test(u)) return false
  const skipPath = [
    "/login", "/signup", "/register", "/logout", "/cart", "/account", "/privacy",
    "/terms", "/contact", "/about", "/careers", "/jobs", "/support", "/help", "/faq",
    "/cookie", "/advert", "/press", "/tag/", "/author", "/category", "/archive",
    "/newsletter", "/subscribe", "/search", "/download", "/rss", "/feed", "?page=", "#",
  ]
  for (const w of skipPath) if (u.includes(w)) return false
  const path = u.replace(/^https?:\/\/[^/]+\/?/, "")
  if (path.length < 12) return false
  const tl = text.toLowerCase()
  if (["home", "menu", "login", "sign in", "search", "subscribe", "newsletter", "privacy", "terms", "contact", "more", "read more", "slide image"].includes(tl)) return false
  return true
}

/** 从 URL 提取发布日期：兼容 reuters 的 -2026-07-01- 与 xinhua 的 20260701 段，取不到返回 null。 */
function dateFromUrl(url: string): Date | null {
  const dashed = /(20\d{2})[-/](\d{2})[-/](\d{2})/.exec(url)
  if (dashed) {
    const d = new Date(`${dashed[1]}-${dashed[2]}-${dashed[3]}`)
    if (!isNaN(d.getTime())) return d
  }
  const compact = /(?<!\d)(20\d{2})(\d{2})(\d{2})(?!\d)/.exec(url)
  if (compact) {
    const d = new Date(`${compact[1]}-${compact[2]}-${compact[3]}`)
    if (!isNaN(d.getTime())) return d
  }
  return null
}

/** 内容红线时效门禁：URL 可解析日期且超过 fcMaxAgeDays 天 → 丢弃（无法解析日期的条目不拦）。 */
function withinMaxAge(src: SourceConfig, url: string): boolean {
  if (!src.fcMaxAgeDays) return true
  const d = dateFromUrl(url)
  if (!d) return true
  return (Date.now() - d.getTime()) / 86400000 <= src.fcMaxAgeDays
}

async function fcScrape(src: SourceConfig): Promise<ScannedItem[]> {
  const json = await fcRequest<{
    success: boolean
    data?: { markdown?: string; links?: FcLink[]; error?: string }
  }>("/scrape", {
    url: src.url,
    formats: ["markdown", "links"],
    onlyMainContent: true,
    waitFor: 4000,
    timeout: 45000,
  })
  if (!json.success || !json.data) throw new Error(`Firecrawl scrape failed: ${json.data?.error ?? "no data"}`)
  const md = json.data.markdown ?? ""
  const discovered = stamp()
  // 从 clean markdown 提取 [text](url) 绝对链接（?<![!] 排除图片语法 ![alt](url)）
  const linkRe = /(?<![!])\[([^\]]{4,120})\]\((https?:\/\/[^)\s]+)\)/g
  const items: ScannedItem[] = []
  const seen = new Set<string>()
  let m: RegExpExecArray | null
  while ((m = linkRe.exec(md)) !== null) {
    const text = m[1].trim()
    const url = m[2].trim()
    if (!/^https?:\/\//i.test(url)) continue
    if (seen.has(url)) continue
    seen.add(url)
    // 按源 URL 规则：命中频道导航类链接直接排除（如新华网文章 URL 含日期段）
    if (src.fcUrlPattern && !new RegExp(src.fcUrlPattern).test(url)) continue
    if (!withinMaxAge(src, url)) continue
    if (!isArticleLike(url, text)) continue
    const pub = dateFromUrl(url)
    items.push({
      id: hashUrl(url),
      title: text,
      url,
      source: src.key,
      layer: src.layer,
      pillar: src.pillar,
      publishedAt: pub ? pub.toISOString() : null,
      discoveredAt: discovered,
      summary: null,
    })
  }
  return items.slice(0, 20)
}

async function fcSearch(src: SourceConfig): Promise<ScannedItem[]> {
  if (!src.fcQuery) throw new Error(`${src.key}: fcQuery missing`)
  const json = await fcRequest<{
    success: boolean
    data?: Array<{ title?: string; url?: string; description?: string }>
  }>("/search", { query: src.fcQuery, limit: 10 })
  if (!json.success || !json.data) throw new Error(`Firecrawl search failed for ${src.key}`)
  const discovered = stamp()
  return json.data
    .filter(
      (d) =>
        d.url &&
        d.title &&
        withinMaxAge(src, d.url!) &&
        (!src.fcAllowDomains || src.fcAllowDomains.some((dom) => d.url!.includes(dom))),
    )
    .slice(0, 10)
    .map((d) => {
      const pub = dateFromUrl(d.url!)
      return {
        id: hashUrl(d.url!),
        title: d.title!.trim(),
        url: d.url!,
        source: src.key,
        layer: src.layer,
        pillar: src.pillar,
        publishedAt: pub ? pub.toISOString() : null,
        discoveredAt: discovered,
        summary: d.description?.slice(0, 200) ?? null,
      }
    })
}

async function fetchFirecrawl(src: SourceConfig): Promise<ScannedItem[]> {
  if (src.kind === "firecrawl-search") return fcSearch(src)
  return fcScrape(src)
}

/* 东方财富公告 JSON（A 股）：np-anotice-stock 接口，无需渲染。 */
async function fetchEastmoneyAnn(src: SourceConfig): Promise<ScannedItem[]> {
  if (!src.code) throw new Error(`${src.key}: missing code`)
  const url = `https://np-anotice-stock.eastmoney.com/api/security/ann?sr=-1&page_size=50&page_index=1&ann_type=A&client_source=web&stock_list=${src.code}`
  const json = JSON.parse(await fetchText(url)) as {
    data?: { list?: Array<{ title?: string; notice_date?: string; art_code?: string }> }
  }
  const discovered = stamp()
  return (json.data?.list ?? [])
    .filter((d) => d.title && d.art_code)
    .slice(0, 30)
    .map((d) => {
      const link = `https://data.eastmoney.com/notices/detail/${src.code}/${d.art_code}.html`
      const pub = d.notice_date ? new Date(d.notice_date) : null
      return {
        id: hashUrl(link),
        title: d.title!.replace(/\s+/g, " ").trim(),
        url: link,
        source: src.key,
        layer: src.layer,
        pillar: src.pillar,
        publishedAt: pub && !isNaN(pub.getTime()) ? pub.toISOString() : null,
        discoveredAt: discovered,
        summary: null,
      } satisfies ScannedItem
    })
}

/* HKEXnews 官方公告（港股）：先代码换 stockId，再检索近 120 天公告。 */
async function fetchHkexAnn(src: SourceConfig): Promise<ScannedItem[]> {
  if (!src.code) throw new Error(`${src.key}: missing code`)
  const prefix = await fetchText(
    `https://www1.hkexnews.hk/search/prefix.do?callback=cb&lang=EN&type=A&name=${src.code}&market=SEHK`,
  )
  const idMatch = /"stockId":(\d+)/.exec(prefix)
  if (!idMatch) throw new Error(`${src.key}: stockId not found`)
  const ymd = (d: Date) =>
    `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`
  const from = ymd(new Date(Date.now() - 120 * 86400000))
  const to = ymd(new Date())
  const query =
    `https://www1.hkexnews.hk/search/titleSearchServlet.do?sortDir=0&sortByOptions=DateTime&category=0` +
    `&market=SEHK&stockId=${idMatch[1]}&documentType=-1&fromDate=${from}&toDate=${to}&title=&searchType=1` +
    `&t1code=-2&t2Gcode=-2&t2code=-2&rowRange=50&lang=EN`
  const json = JSON.parse(await fetchText(query)) as { result?: string }
  let rows: Array<{ DATE_TIME?: string; TITLE?: string; FILE_LINK?: string }> = []
  try {
    rows = JSON.parse(json.result ?? "[]")
  } catch {
    rows = []
  }
  const discovered = stamp()
  return rows
    .filter((r) => r.TITLE && r.FILE_LINK)
    .slice(0, 30)
    .map((r) => {
      const link = `https://www1.hkexnews.hk${r.FILE_LINK}`
      const dm = /(\d{2})\/(\d{2})\/(\d{4})/.exec(r.DATE_TIME ?? "") // DD/MM/YYYY
      const pub = dm ? new Date(`${dm[3]}-${dm[2]}-${dm[1]}`) : null
      return {
        id: hashUrl(link),
        title: (r.TITLE ?? "").replace(/\s+/g, " ").trim(),
        url: link,
        source: src.key,
        layer: src.layer,
        pillar: src.pillar,
        publishedAt: pub && !isNaN(pub.getTime()) ? pub.toISOString() : null,
        discoveredAt: discovered,
        summary: null,
      } satisfies ScannedItem
    })
}

/* ---------- 东方财富行情/持股（em-quotes / em-holdings） ---------- */

/** push2 ulist 请求的字段：最新价/涨跌幅/涨跌额/成交量/成交额/换手率/PE/代码/市场号/名称/高/低/开/昨收/总市值/流通市值/PB。 */
const EM_QUOTE_FIELDS = "f2,f3,f4,f5,f6,f8,f9,f12,f13,f14,f15,f16,f17,f18,f20,f21,f23";
/** 港币兑离岸人民币 secid（push2 外汇前缀 133），用于 H/A 溢价折算。 */
const EM_FX_SECID = "133.HKDCNH";
/** summary 末尾的结构化快照标记，供下次扫描解析做环比。 */
const QDATA_MARK = "[qdata]";

/** push2 ulist 行（行情快照）。字段值可能是数字或 "-" 字符串。 */
interface EmQuoteRow {
  f2?: number | string
  f3?: number | string
  f4?: number | string
  f5?: number | string
  f6?: number | string
  f8?: number | string
  f9?: number | string
  f12?: string
  f13?: number
  f14?: string
  f15?: number | string
  f16?: number | string
  f17?: number | string
  f18?: number | string
  f20?: number | string
  f21?: number | string
  f23?: number | string
}

/** datacenter RPT_MUTUAL_STOCK_HOLDRANKS 行（南向持股，INTERVAL_TYPE=1 日度）。 */
interface EmHoldingRow {
  SECURITY_CODE?: string
  SECURITY_NAME?: string
  TRADE_DATE?: string
  HOLD_SHARES?: number
  HOLD_MARKET_CAP?: number
  HOLD_SHARES_RATIO?: number | null
  ADD_SHARES_REPAIR?: number | null
  CLOSE_PRICE?: number | null
}

function num(v: unknown): number | null {
  const n = typeof v === "string" ? Number(v) : v
  return typeof n === "number" && isFinite(n) ? n : null
}

/** 金额格式化：≥1 万亿 → "1.35 万亿"，≥1 亿 → "86.14 亿"。 */
function fmtAmount(n: number | null): string {
  if (n === null) return "—"
  const abs = Math.abs(n)
  if (abs >= 1e12) return `${(n / 1e12).toFixed(2)} 万亿`
  if (abs >= 1e8) return `${(n / 1e8).toFixed(2)} 亿`
  if (abs >= 1e4) return `${(n / 1e4).toFixed(2)} 万`
  return n.toFixed(2)
}

/** 股数格式化：≥1 亿股 / ≥1 万股。 */
function fmtShares(n: number | null): string {
  if (n === null) return "—"
  const abs = Math.abs(n)
  if (abs >= 1e8) return `${(n / 1e8).toFixed(2)} 亿股`
  if (abs >= 1e4) return `${(n / 1e4).toFixed(2)} 万股`
  return `${Math.round(n)} 股`
}

/** 带符号百分比（如 "+2.31%" / "-0.45%"）。 */
function fmtSignedPct(n: number, digits = 2): string {
  return `${n > 0 ? "+" : ""}${n.toFixed(digits)}%`
}

/** 把结构化快照附在 summary 末尾（[qdata] JSON），供下次扫描读取做环比；展示层截断不会露出。 */
function withQdata(human: string, data: Record<string, unknown>): string {
  return `${human}\n${QDATA_MARK}${JSON.stringify(data)}`
}

/** 从条目 summary 解析 [qdata] 结构化快照。 */
function qdataOf(item: ScannedItem | undefined): Record<string, unknown> | null {
  if (!item?.summary) return null
  const i = item.summary.indexOf(QDATA_MARK)
  if (i < 0) return null
  try {
    return JSON.parse(item.summary.slice(i + QDATA_MARK.length)) as Record<string, unknown>
  } catch {
    return null
  }
}

/** 上一次扫描（今天之前最近一次）该源落盘的条目，用于环比；找不到返回 null。 */
function previousSnapshot(src: SourceConfig): ScannedItem[] | null {
  if (!existsSync(ROOT)) return null
  const today = todayDir()
  let best: ScannedItem[] | null = null
  let bestDate = ""
  for (const d of readdirSync(ROOT)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || d >= today || d <= bestDate) continue
    const p = join(ROOT, d, "raw", `${src.key}.json`)
    if (!existsSync(p)) continue
    try {
      best = JSON.parse(readFileSync(p, "utf8")) as ScannedItem[]
      bestDate = d
    } catch {
      /* 坏文件忽略 */
    }
  }
  return best
}

/** "0.300750" → { code: "300750", suffix: "SZ", quoteUrl: "https://quote.eastmoney.com/sz300750.html" } */
function secidInfo(secid: string): { code: string; suffix: "SZ" | "SH" | "HK"; quoteUrl: string } {
  const [market, code] = secid.split(".")
  if (market === "116") return { code, suffix: "HK", quoteUrl: `https://quote.eastmoney.com/hk${code}.html` }
  const suffix = market === "1" ? "SH" : "SZ"
  return { code, suffix, quoteUrl: `https://quote.eastmoney.com/${suffix.toLowerCase()}${code}.html` }
}

/* 东方财富行情快照：watchlist 全量 + 港币汇率一次请求；id 带扫描日期，每周扫描都计为新增。 */
export async function fetchEmQuotes(src: SourceConfig): Promise<ScannedItem[]> {
  const secids = EM_WATCHLIST.flatMap((w) => [w.aSecid, w.hkSecid].filter((x): x is string => x !== null))
  const url =
    `https://push2.eastmoney.com/api/qt/ulist.np/get?fltt=2&invt=2&fields=${EM_QUOTE_FIELDS}` +
    `&secids=${[...secids, EM_FX_SECID].join(",")}`
  const json = JSON.parse(await fetchText(url)) as { data?: { diff?: EmQuoteRow[] } }
  const rows = json.data?.diff ?? []
  if (rows.length === 0) throw new Error(`${src.key}: empty quote response`)
  const bySecid = new Map(rows.map((r) => [`${r.f13}.${r.f12}`, r]))
  const date = todayDir()
  const discovered = stamp()
  const prev = previousSnapshot(src)
  const hkdCny = num(bySecid.get(EM_FX_SECID)?.f2)
  const items: ScannedItem[] = []

  for (const w of EM_WATCHLIST) {
    // A+H 双上市标的在汇率缺失时，两条腿 summary 注明溢价条目被跳过
    const fxNote =
      w.aSecid && w.hkSecid && hkdCny === null ? "港币兑人民币汇率不可用，本次未生成 H/A 溢价条目。" : ""
    for (const secid of [w.aSecid, w.hkSecid].filter((x): x is string => x !== null)) {
      const r = bySecid.get(secid)
      const price = num(r?.f2)
      const pct = num(r?.f3)
      if (!r || price === null || pct === null) continue
      const info = secidInfo(secid)
      const ccy = info.suffix === "HK" ? "港元" : "元"
      const dir = pct > 0 ? "日涨" : pct < 0 ? "日跌" : "日平"
      // 环比：从历史最近一次 em-quotes.json 里找同一 secid 的快照
      const prevData = qdataOf(prev?.find((i) => qdataOf(i)?.secid === secid))
      const prevPrice = num(prevData?.price)
      const cmp =
        prevPrice !== null
          ? `环比上次扫描（${String(prevData?.date ?? "?")}）：${price - prevPrice > 0 ? "+" : ""}${(price - prevPrice).toFixed(2)} ${ccy}（${fmtSignedPct(((price - prevPrice) / prevPrice) * 100)}）。`
          : "首次快照，无环比。"
      const human =
        `开 ${num(r.f17)?.toFixed(2) ?? "—"} / 高 ${num(r.f15)?.toFixed(2) ?? "—"} / 低 ${num(r.f16)?.toFixed(2) ?? "—"}` +
        ` / 昨收 ${num(r.f18)?.toFixed(2) ?? "—"} ${ccy}；成交额 ${fmtAmount(num(r.f6))}${ccy}，` +
        `换手率 ${num(r.f8)?.toFixed(2) ?? "—"}%；PE ${num(r.f9)?.toFixed(2) ?? "—"}，PB ${num(r.f23)?.toFixed(2) ?? "—"}；` +
        `总市值 ${fmtAmount(num(r.f20))}${ccy}，流通市值 ${fmtAmount(num(r.f21))}${ccy}。${cmp}${fxNote}`
      items.push({
        id: hashUrl(`quote:${secid}:${date}`),
        title: `${w.nameZh}(${info.code}.${info.suffix})：收盘 ${price.toFixed(2)} ${ccy}，${dir} ${Math.abs(pct).toFixed(2)}%，总市值 ${fmtAmount(num(r.f20))}${ccy}`,
        url: info.quoteUrl,
        source: src.key,
        layer: src.layer,
        pillar: src.pillar,
        publishedAt: null,
        discoveredAt: discovered,
        summary: withQdata(human, { secid, price, date }),
      })
    }
    // H/A 溢价条目（仅 A+H 双上市标的，需要港币兑人民币汇率）
    if (w.aSecid && w.hkSecid && hkdCny !== null) {
      const aPrice = num(bySecid.get(w.aSecid)?.f2)
      const hPrice = num(bySecid.get(w.hkSecid)?.f2)
      if (aPrice === null || hPrice === null || aPrice === 0) continue
      const hCny = hPrice * hkdCny
      const premium = (hCny / aPrice - 1) * 100
      const prevData = qdataOf(prev?.find((i) => qdataOf(i)?.secid === `ha:${w.aSecid}`))
      const prevPremium = num(prevData?.premium)
      const cmp =
        prevPremium !== null
          ? `环比上次扫描（${String(prevData?.date ?? "?")}）：溢价 ${premium - prevPremium > 0 ? "+" : ""}${(premium - prevPremium).toFixed(2)} pct。`
          : "首次快照，无环比。"
      items.push({
        id: hashUrl(`ha-premium:${w.aSecid}:${date}`),
        title:
          `${w.nameZh} H/A 比价：H 股 ${hPrice.toFixed(2)} 港元 ≈ ${hCny.toFixed(2)} 元人民币，` +
          `较 A 股（${aPrice.toFixed(2)} 元）${premium >= 0 ? "溢价" : "折价"} ${Math.abs(premium).toFixed(1)}%`,
        url: secidInfo(w.aSecid).quoteUrl,
        source: src.key,
        layer: src.layer,
        pillar: src.pillar,
        publishedAt: null,
        discoveredAt: discovered,
        summary: withQdata(
          `H 股收盘 ${hPrice.toFixed(2)} 港元，按港币兑离岸人民币 ${hkdCny} 折算 ${hCny.toFixed(2)} 元；A 股收盘 ${aPrice.toFixed(2)} 元。溢价 = H 折算价 / A 价 - 1。${cmp}`,
          { secid: `ha:${w.aSecid}`, premium, date },
        ),
      })
    }
  }
  return items
}

/* 沪深港通持股：仅南向（北向个股持股东财数据止于 2024-08-16，见 config note）。
 * 每个港股标的取最新一条日度持股（RN=1 + TRADE_DATE 倒序）。 */
export async function fetchEmHoldings(src: SourceConfig): Promise<ScannedItem[]> {
  const prev = previousSnapshot(src)
  const discovered = stamp()
  const items: ScannedItem[] = []
  for (const w of EM_WATCHLIST) {
    if (!w.hkSecid) continue
    const code = w.hkSecid.split(".")[1]
    const filter = encodeURIComponent(`(RN=1)(SECURITY_CODE="${code}")(INTERVAL_TYPE="1")`)
    const url =
      `https://datacenter-web.eastmoney.com/api/data/v1/get?reportName=RPT_MUTUAL_STOCK_HOLDRANKS&columns=ALL` +
      `&filter=${filter}&pageNumber=1&pageSize=1&sortColumns=TRADE_DATE&sortTypes=-1&source=WEB&client=WEB`
    const json = JSON.parse(await fetchText(url)) as { result?: { data?: EmHoldingRow[] } }
    const row = json.result?.data?.[0]
    if (!row || !row.TRADE_DATE) continue
    const tradeDate = row.TRADE_DATE.slice(0, 10)
    const shares = num(row.HOLD_SHARES)
    const ratio = num(row.HOLD_SHARES_RATIO)
    const dayAdd = num(row.ADD_SHARES_REPAIR)
    const dayAddText =
      dayAdd === null ? "—" : dayAdd === 0 ? "持平" : `${dayAdd > 0 ? "+" : ""}${fmtShares(dayAdd)}`
    const prevData = qdataOf(prev?.find((i) => qdataOf(i)?.code === code))
    const prevShares = num(prevData?.shares)
    const prevRatio = num(prevData?.ratio)
    const cmp =
      prevShares !== null && shares !== null
        ? `环比上次扫描（${String(prevData?.tradeDate ?? "?")}）：持股 ${shares - prevShares > 0 ? "+" : ""}${fmtShares(shares - prevShares)}` +
          (prevRatio !== null && ratio !== null
            ? `，占比 ${ratio - prevRatio > 0 ? "+" : ""}${(ratio - prevRatio).toFixed(2)} pct`
            : "") +
          "。"
        : "首次快照，无环比。"
    const human =
      `截至 ${tradeDate}：南向（港股通）合计持股 ${shares !== null ? shares.toLocaleString("en-US") : "—"} 股，` +
      `持股市值 ${fmtAmount(num(row.HOLD_MARKET_CAP))}港元，占港股股本 ${ratio?.toFixed(2) ?? "—"}%；` +
      `当日收盘价 ${num(row.CLOSE_PRICE)?.toFixed(2) ?? "—"} 港元。${cmp}`
    items.push({
      id: hashUrl(`south-hold:${code}:${tradeDate}`),
      title: `${w.nameZh}(${code}.HK)：南向持股 ${fmtShares(shares)}，占港股股本 ${ratio?.toFixed(2) ?? "—"}%，较上日 ${dayAddText}`,
      url: "https://data.eastmoney.com/hsgtcg/",
      source: src.key,
      layer: src.layer,
      pillar: src.pillar,
      publishedAt: new Date(tradeDate).toISOString(),
      discoveredAt: discovered,
      summary: withQdata(human, { code, shares, ratio, tradeDate }),
    })
  }
  if (items.length === 0) throw new Error(`${src.key}: no southbound holdings rows`)
  return items
}

async function runTask(src: SourceConfig): Promise<{ src: SourceConfig; items: ScannedItem[] }> {
  if (src.kind === "rss") return { src, items: await fetchRss(src) }
  if (src.kind === "rsshub") return { src, items: await fetchRsshub(src) }
  if (src.kind === "eastmoney-ann") return { src, items: await fetchEastmoneyAnn(src) }
  if (src.kind === "hkex-ann") return { src, items: await fetchHkexAnn(src) }
  if (src.kind === "em-quotes") return { src, items: await fetchEmQuotes(src) }
  if (src.kind === "em-holdings") return { src, items: await fetchEmHoldings(src) }
  if (src.kind === "firecrawl" || src.kind === "firecrawl-search") {
    return { src, items: await fetchFirecrawl(src) }
  }
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
  let sources = enabledSources()
  const noFcKey = !process.env.FIRECRAWL_API_KEY
  if (noFcKey) {
    const fcOnes = sources.filter((s) => s.kind === "firecrawl" || s.kind === "firecrawl-search")
    if (fcOnes.length > 0) {
      console.log(`ℹ FIRECRAWL_API_KEY 未设置 — 跳过 ${fcOnes.length} 个 firecrawl 源：${fcOnes.map((s) => s.key).join(", ")}`)
    }
    sources = sources.filter((s) => s.kind !== "firecrawl" && s.kind !== "firecrawl-search")
  }
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

// 仅直接执行时跑全量扫描；被 import（如单源冒烟脚本）时不触发
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error("Scan failed:", e)
    process.exit(1)
  })
}
