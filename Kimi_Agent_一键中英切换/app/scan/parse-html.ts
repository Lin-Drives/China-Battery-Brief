/* China Battery Brief — HTML 信源解析器
 * 各官方站列表页结构差异大，按源编写解析函数（cheerio）。
 * 输出统一条目字段（与 rss 条目一致，供 toItems 复用）。
 */

import { load, type CheerioAPI } from "cheerio";
import { createHash } from "crypto";
import type { ScannedItem } from "./run";
import type { SourceConfig } from "./config";

export interface HtmlParsedItem {
  title: string
  url: string
  publishedAt?: string | null
  summary?: string | null
}

/** 从 HTML 提取条目。返回 null 表示该源解析不可用。 */
export type HtmlParser = (html: string, $: CheerioAPI, src: SourceConfig) => HtmlParsedItem[]

/** 通用日期解析：兼容 2026-08-01 / 2026.06.25 / 2026/08/01 等。 */
export function parseDate(raw: string | undefined): string | null {
  if (!raw) return null
  const m = /(20\d{2})[-\/.年](\d{1,2})[-\/.月](\d{1,2})/.exec(raw)
  if (!m) return null
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

/** 解析成 ScannedItem（供 run.ts 使用）。 */
export function htmlItemsToScanned(src: SourceConfig, items: HtmlParsedItem[]): ScannedItem[] {
  const discovered = new Date().toISOString()
  return items.map((it) => ({
    id: createHash("sha256").update(it.url).digest("hex").slice(0, 16),
    title: it.title,
    url: it.url,
    source: src.key,
    layer: src.layer,
    pillar: src.pillar,
    publishedAt: it.publishedAt ?? null,
    discoveredAt: discovered,
    summary: it.summary ?? null,
  }))
}

/* ---------------- 各源解析器 ---------------- */

/** CATL /news/ — 条目 `li > a.mc_e1_lisbox`，标题在 `p.mc_e1_txt`，日期在 `div.mc_e1_date`。 */
const catlParser: HtmlParser = (_html, $) => {
  const out: HtmlParsedItem[] = []
  $("a[href^='/news/']").each((_i, el) => {
    const $a = $(el)
    const href = $a.attr("href") ?? ""
    if (!/\/news\/\d+\.html$/.test(href)) return
    const title = $a.find("p.mc_e1_txt").first().text().trim() || $a.text().trim()
    if (!title || title.length < 6) return
    const dateRaw = $a.find("div.mc_e1_date").first().text().trim()
    out.push({ title, url: `https://www.catl.com${href}`, publishedAt: parseDate(dateRaw) })
  })
  return out
}

/** EVE /news/ — 三种结构：头条 `div.t_newstit`、轮播 `div.s_e1c1rtit h4`、列表 `div.s_e1c2nr p`；日期分别在 `s_e1c1rtime` / `s_e1c2wztime`。按 url 去重。 */
const eveParser: HtmlParser = (_html, $) => {
  const out: HtmlParsedItem[] = []
  const seen = new Set<string>()
  $("a[href^='/news-']").each((_i, el) => {
    const $a = $(el)
    const href = $a.attr("href") ?? ""
    if (!/^\/news-\d+/.test(href)) return
    if (seen.has(href)) return
    seen.add(href)

    let title = ""
    let dateRaw = ""
    const $t = $a.find("div.t_newstit").first()
    if ($t.length) {
      title = $t.text().replace(/\s+/g, " ").trim()
    } else {
      const $h = $a.find("div.s_e1c1rtit h4").first()
      const $n = $a.find("div.s_e1c2nr p").first()
      if ($h.length) {
        title = $h.text().replace(/\s+/g, " ").trim()
        dateRaw = $a.find("div.s_e1c1rtime").first().text().trim()
      } else if ($n.length) {
        title = $n.text().replace(/\s+/g, " ").trim()
        dateRaw = $a.find("div.s_e1c2wztime").first().text().trim()
      }
      if (!title) title = ($a.attr("title") ?? "").trim()
    }
    if (!title || title.length < 6) return
    out.push({ title, url: `https://www.evebattery.com${href}`, publishedAt: parseDate(dateRaw) })
  })
  return out
}

/** 华友 /news/corporate-news/ — 条目 `/news/corporate-news/<id>` + 标题 + 日期。 */
const huayouParser: HtmlParser = (_html, $) => {
  const out: HtmlParsedItem[] = []
  $("a[href*='/news/corporate-news/']").each((_i, el) => {
    const $a = $(el)
    const href = $a.attr("href") ?? ""
    if (!/\/news\/corporate-news\/\d+/.test(href)) return
    const title = $a.text().trim()
    if (!title || title.length < 6) return
    const block = $a.closest("li, div, dt, dd").length ? $a.closest("li, div, dt, dd").text() : title
    out.push({ title, url: `https://www.huayou.com${href}`, publishedAt: parseDate(block) })
  })
  return out
}

/** 中国储能网 — 条目 `/news/show-<id>.html`，标题在 li 内。 */
const escnParser: HtmlParser = (_html, $) => {
  const out: HtmlParsedItem[] = []
  $("a[href*='/news/show-']").each((_i, el) => {
    const $a = $(el)
    const href = $a.attr("href") ?? ""
    if (!/\/news\/show-\d+\.html/.test(href)) return
    const title = $a.text().replace(/\s+/g, " ").trim()
    if (!title || title.length < 8) return
    const block = $a.closest("li, div").length ? $a.closest("li, div").text() : title
    const abs = href.startsWith("http") ? href : `https://www.escn.com.cn${href}`
    out.push({ title, url: abs, publishedAt: parseDate(block) })
  })
  return out
}

/** SNE Research /en/insight/release/ — Press Release 列表，条目 `a[href*='release_view']`，标题 `p.font-score`，日期 `span.list-day`。 */
const sneParser: HtmlParser = (_html, $) => {
  const out: HtmlParsedItem[] = []
  $("a[href*='release_view']").each((_i, el) => {
    const $a = $(el)
    const href = $a.attr("href") ?? ""
    const title = $a.find("p.font-score").first().text().replace(/\s+/g, " ").trim()
    if (!title || title.length < 10) return
    const dateRaw = $a.find("span.list-day").first().text().trim()
    const abs = href.startsWith("http") ? href : `https://www.sneresearch.com${href}`
    out.push({ title, url: abs, publishedAt: parseDate(dateRaw) })
  })
  return out
}

/** 解析入口：按源 key 分发。无专用解析的源返回空（run.ts 落占位记录）。 */
export function parseForSource(src: SourceConfig, html: string): HtmlParsedItem[] {
  const $ = load(html)
  switch (src.key) {
    case "catl":
      return catlParser(html, $, src)
    case "eve":
      return eveParser(html, $, src)
    case "huayou":
      return huayouParser(html, $, src)
    case "escn":
      return escnParser(html, $, src)
    case "sne":
      return sneParser(html, $, src)
    default:
      return []
  }
}
