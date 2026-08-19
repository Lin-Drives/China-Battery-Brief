/* China Battery Brief — 信源抓取配置
 * 与 ../docs/sources-list.md 保持同步（该文档为人工确认版，本文件为机器可读版）。
 *
 * kind:
 *   rss      — 直接 RSS/Atom URL
 *   rsshub   — 经 RSSHub 公共实例抓取（多实例容错）
 *   html     — 抓取 HTML 页面，用 selector 提取列表（尚未接入解析，先存原始 HTML）
 *   firecrawl        — 经 Firecrawl API 抓取（无头渲染 + 反爬），从 clean markdown 提取链接
 *   firecrawl-search — 经 Firecrawl API 搜索（解决交易所/登录墙类反爬源）
 *
 * layer (S0-S4，参考 finhot):
 *   S0 权威原始源（官方公告/交易所）
 *   S1 行业数据与研究机构
 *   S2 行业媒体
 *   S3 快讯/财经
 */

export interface SourceConfig {
  key: string
  name: string
  kind: "rss" | "rsshub" | "html" | "firecrawl" | "firecrawl-search"
  url: string
  layer: "S0" | "S1" | "S2" | "S3"
  pillar: "overseas-capacity" | "geopolitics" | "markets" | "storage" | "mixed"
  /** rsshub 专属：路由（不含实例前缀）。 */
  rsshubRoute?: string
  /** html 专属：列表页条目 selector（预留）。 */
  htmlSelector?: string
  /** firecrawl-search 专属：搜索查询词。 */
  fcQuery?: string
  /** firecrawl 专属：URL 必须匹配的正则（如含日期段）才算文章，用于过滤频道导航。 */
  fcUrlPattern?: string
  /** firecrawl 专属：从 URL 可解析出发布日期的条目，超过该天数（默认 90）丢弃（内容红线：3 个月内信源）。 */
  fcMaxAgeDays?: number
  /** firecrawl-search 专属：只保留 URL 含这些域名的结果（如搜索串入第三方站时限定本源）。 */
  fcAllowDomains?: string[]
  /**
   * 冷却期（天）：距上次抓取不足该天数则跳过本次请求，复用缓存条目。
   * 面向高频敏感站点（如政府站），避免 ad-hoc 手动扫描时反复打扰。
   */
  cooldownDays?: number
  /**
   * 串行抓取（慢速源）：置 true 时本源站的 HTML 请求会进入独立串行队列，
   * 每次请求间隔 `SLOW_GAP_MS`（见 run.ts），与其余并发源错峰。
   */
  slow?: boolean
  /** 是否启用（来源清单人工确认）。 */
  enabled: boolean
  note?: string
}

/** RSSHub 公共实例（容错顺序）。 */
export const RSSHUB_INSTANCES = [
  "https://rsshub.liumingye.cn",
  "https://rsshub.rssforever.com",
  "https://rsshub.app",
]

export const SOURCES: SourceConfig[] = [
  /* ---------- ① 产能地图 ---------- */
  { key: "cnevpost", name: "CnEVPost", kind: "rss", url: "https://cnevpost.com/feed/", layer: "S2", pillar: "overseas-capacity", enabled: true, note: "中国巨头海外动态当日全覆盖，首选时效源" },
  { key: "benchmark", name: "Benchmark Mineral", kind: "firecrawl", url: "https://www.benchmarkminerals.com/media-and-news", layer: "S1", pillar: "mixed", enabled: false, note: "Firecrawl 实验：媒体页仅图片无文本链接，0 条，禁用" },
  { key: "cls", name: "财联社电报", kind: "rsshub", url: "", rsshubRoute: "cls/telegraph", layer: "S3", pillar: "mixed", enabled: true, note: "分钟级快讯，最先抓到建厂/扩产公告" },
  { key: "gasgoo", name: "盖世汽车", kind: "firecrawl", url: "https://news.gasgoo.com/news/", layer: "S2", pillar: "overseas-capacity", enabled: false, note: "Firecrawl 实验：scrape no data（页面结构不适配），禁用" },

  /* 公司官方（S0） */
  { key: "catl", name: "宁德时代 CATL", kind: "html", url: "https://www.catl.com/news", layer: "S0", pillar: "overseas-capacity", enabled: true, note: "官网新闻中心，/news/<id>.html 列表" },
  { key: "byd", name: "比亚迪 BYD", kind: "firecrawl", url: "https://www.byd.com/cn/news", layer: "S0", pillar: "overseas-capacity", enabled: true, note: "Firecrawl 实验：JS 渲染页" },
  { key: "eve", name: "亿纬锂能 EVE", kind: "html", url: "https://www.evebattery.com/news", layer: "S0", pillar: "overseas-capacity", enabled: true, note: "官网新闻中心，/news-<id> 列表" },
  { key: "gotion", name: "国轩高科 Gotion", kind: "firecrawl", url: "https://www.gotion.com/news/", layer: "S0", pillar: "overseas-capacity", enabled: false, note: "Firecrawl 实验：抓到页面但 0 条（JS 渲染/结构问题），需调参，禁用" },
  { key: "svolt", name: "蜂巢能源 SVOLT", kind: "rss", url: "https://www.svolt.cn/rss.xml", layer: "S0", pillar: "overseas-capacity", enabled: true },
  { key: "sunwoda", name: "欣旺达 Sunwoda", kind: "firecrawl", url: "https://www.sunwoda.com/about/news", layer: "S0", pillar: "overseas-capacity", enabled: false, note: "Firecrawl 实验：抓到页面但 0 条（onlyMainContent 过滤列表），需调参，禁用" },
  { key: "huayou", name: "华友钴业 Huayou", kind: "html", url: "https://www.huayou.com/news/corporate-news", layer: "S0", pillar: "overseas-capacity", enabled: true, note: "官网企业新闻，/news/corporate-news/<id> 列表" },
  { key: "calb", name: "中创新航 CALB (HKEX)", kind: "firecrawl-search", url: "", fcQuery: "中创新航 CALB 港股公告 hkexnews", layer: "S0", pillar: "overseas-capacity", enabled: true, note: "Firecrawl 实验：交易所反爬，改用搜索" },
  { key: "cngr", name: "中伟股份 CNGR (SZ)", kind: "firecrawl-search", url: "", fcQuery: "中伟股份 CNGR 深交所公告", layer: "S0", pillar: "overseas-capacity", enabled: true, note: "Firecrawl 实验：深交所反爬，改用搜索" },

  /* ---------- ② 政策追踪 ---------- */
  { key: "mofcom", name: "商务部 MOFCOM", kind: "html", url: "https://www.mofcom.gov.cn", layer: "S0", pillar: "geopolitics", enabled: true, cooldownDays: 7, slow: true, note: "出口管制/反制公告第一手，首页 art 详情解析已接入" },
  { key: "miit", name: "工信部 MIIT", kind: "html", url: "https://www.miit.gov.cn", layer: "S0", pillar: "geopolitics", enabled: true, cooldownDays: 7, slow: true, note: "国标/回收/行业准入，首页 art 详情解析已接入" },
  { key: "ndrc", name: "发改委 NDRC", kind: "html", url: "https://www.ndrc.gov.cn", layer: "S0", pillar: "geopolitics", enabled: true, cooldownDays: 7, slow: true, note: "规划与补贴细则，待接入" },
  { key: "govcn", name: "国务院（中国政府网）", kind: "html", url: "https://www.gov.cn", layer: "S0", pillar: "geopolitics", enabled: true, cooldownDays: 7, slow: true, note: "政策文件库与官方解读，待接入" },
  { key: "gta", name: "Global Trade Alert", kind: "firecrawl", url: "https://www.globaltradealert.org/", layer: "S1", pillar: "geopolitics", enabled: true, note: "Firecrawl 实验：Angular SPA" },
  { key: "xinhua", name: "新华社（新华网）", kind: "firecrawl", url: "https://www.news.cn/energy/", layer: "S0", pillar: "geopolitics", enabled: true, fcUrlPattern: "\\d{8}", fcMaxAgeDays: 90, note: "Firecrawl 实验：403 已解锁；URL 日期段过滤导航 + 90 天时效" },

  /* ---------- ③ 市场信号 ---------- */
  { key: "sne", name: "SNE Research", kind: "html", url: "https://www.sneresearch.com/en/insight/release/", layer: "S1", pillar: "markets", enabled: true, note: "Press Release 列表，含全球装机份额" },
  { key: "eastmoney", name: "东方财富", kind: "rsshub", url: "", rsshubRoute: "eastmoney/report/industry", layer: "S3", pillar: "markets", enabled: true, note: "财报/研报/公告聚合" },
  { key: "wallstreetcn", name: "华尔街见闻", kind: "rsshub", url: "", rsshubRoute: "wallstreetcn/live", layer: "S3", pillar: "markets", enabled: true },
  { key: "reuters", name: "Reuters Markets", kind: "firecrawl-search", url: "", fcQuery: "reuters battery electric vehicle supply chain markets", layer: "S1", pillar: "markets", enabled: true, fcMaxAgeDays: 90, fcAllowDomains: ["reuters.com"], note: "Firecrawl 实验：401 反爬，改搜索；90 天时效 + 限定本源域名" },
  { key: "cnbc", name: "CNBC Energy", kind: "rss", url: "https://www.cnbc.com/id/100003114/device/rss/rss.html", layer: "S3", pillar: "markets", enabled: true, note: "美股/财报/能源/EV 供应链" },

  /* ---------- ④ 储能（广泛扫描，筛电池出口相关后归入已有内容） ---------- */
  { key: "esnews", name: "Energy-Storage.News", kind: "rss", url: "https://www.energy-storage.news/feed/", layer: "S2", pillar: "storage", enabled: true, note: "全球储能垂直媒体头牌" },
  { key: "escn", name: "中国储能网", kind: "html", url: "https://www.escn.com.cn", layer: "S2", pillar: "storage", enabled: true, note: "自带储能项目数据库，招标中标、政策" },
]

export function enabledSources(): SourceConfig[] {
  return SOURCES.filter((s) => s.enabled)
}
