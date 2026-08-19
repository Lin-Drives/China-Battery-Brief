/* China Battery Brief — 信源抓取配置
 * 与 ../docs/sources-list.md 保持同步（该文档为人工确认版，本文件为机器可读版）。
 *
 * kind:
 *   rss      — 直接 RSS/Atom URL
 *   rsshub   — 经 RSSHub 公共实例抓取（多实例容错）
 *   html     — 抓取 HTML 页面，用 selector 提取列表（尚未接入解析，先存原始 HTML）
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
  kind: "rss" | "rsshub" | "html"
  url: string
  layer: "S0" | "S1" | "S2" | "S3"
  pillar: "overseas-capacity" | "geopolitics" | "markets" | "storage" | "mixed"
  /** rsshub 专属：路由（不含实例前缀）。 */
  rsshubRoute?: string
  /** html 专属：列表页条目 selector（预留）。 */
  htmlSelector?: string
  /**
   * 冷却期（天）：距上次抓取不足该天数则跳过本次请求，复用缓存条目。
   * 面向高频敏感站点（如政府站），避免 ad-hoc 手动扫描时反复打扰。
   */
  cooldownDays?: number
  /**
   * 串行抓取（慢速源）：置 true 时本源的 HTML 请求会进入独立串行队列，
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
  { key: "benchmark", name: "Benchmark Mineral", kind: "rss", url: "https://www.benchmarkminerals.com/feed", layer: "S1", pillar: "mixed", enabled: false, note: "feed 超时，免费内容有限，跳过" },
  { key: "cls", name: "财联社电报", kind: "rsshub", url: "", rsshubRoute: "cls/telegraph", layer: "S3", pillar: "mixed", enabled: true, note: "分钟级快讯，最先抓到建厂/扩产公告" },
  { key: "gasgoo", name: "盖世汽车", kind: "rsshub", url: "", rsshubRoute: "gasgoo/news", layer: "S2", pillar: "overseas-capacity", enabled: false, note: "JS 渲染 + RSSHub 不可用，跳过" },

  /* 公司官方（S0） */
  { key: "catl", name: "宁德时代 CATL", kind: "html", url: "https://www.catl.com/news", layer: "S0", pillar: "overseas-capacity", enabled: true, note: "官网新闻中心，/news/<id>.html 列表" },
  { key: "byd", name: "比亚迪 BYD", kind: "html", url: "https://www.byd.com/cn/news", layer: "S0", pillar: "overseas-capacity", enabled: false, note: "JS 渲染，跳过" },
  { key: "eve", name: "亿纬锂能 EVE", kind: "html", url: "https://www.evebattery.com/news", layer: "S0", pillar: "overseas-capacity", enabled: true, note: "官网新闻中心，/news-<id> 列表" },
  { key: "gotion", name: "国轩高科 Gotion", kind: "html", url: "https://www.gotion.com/news/", layer: "S0", pillar: "overseas-capacity", enabled: false, note: "JS 渲染 + RSS 坏（只有 2018 测试帖），跳过" },
  { key: "svolt", name: "蜂巢能源 SVOLT", kind: "rss", url: "https://www.svolt.cn/rss.xml", layer: "S0", pillar: "overseas-capacity", enabled: true },
  { key: "sunwoda", name: "欣旺达 Sunwoda", kind: "html", url: "https://www.sunwoda.com/about/news", layer: "S0", pillar: "overseas-capacity", enabled: false, note: "JS 渲染（/about/news 可达但新闻需 JS），跳过" },
  { key: "huayou", name: "华友钴业 Huayou", kind: "html", url: "https://www.huayou.com/news/corporate-news", layer: "S0", pillar: "overseas-capacity", enabled: true, note: "官网企业新闻，/news/corporate-news/<id> 列表" },
  { key: "calb", name: "中创新航 CALB (HKEX)", kind: "html", url: "https://www1.hkexnews.hk", layer: "S0", pillar: "overseas-capacity", enabled: false, note: "交易所公告反爬，跳过" },
  { key: "cngr", name: "中伟股份 CNGR (SZ)", kind: "html", url: "http://www.cninfo.com.cn", layer: "S0", pillar: "overseas-capacity", enabled: false, note: "深交所公告反爬，跳过" },

  /* ---------- ② 政策追踪 ---------- */
  { key: "mofcom", name: "商务部 MOFCOM", kind: "html", url: "https://www.mofcom.gov.cn", layer: "S0", pillar: "geopolitics", enabled: true, cooldownDays: 7, slow: true, note: "出口管制/反制公告第一手，首页 art 详情解析已接入" },
  { key: "miit", name: "工信部 MIIT", kind: "html", url: "https://www.miit.gov.cn", layer: "S0", pillar: "geopolitics", enabled: true, cooldownDays: 7, slow: true, note: "国标/回收/行业准入，首页 art 详情解析已接入" },
  { key: "ndrc", name: "发改委 NDRC", kind: "html", url: "https://www.ndrc.gov.cn", layer: "S0", pillar: "geopolitics", enabled: true, cooldownDays: 7, slow: true, note: "规划与补贴细则，待接入" },
  { key: "govcn", name: "国务院（中国政府网）", kind: "html", url: "https://www.gov.cn", layer: "S0", pillar: "geopolitics", enabled: true, cooldownDays: 7, slow: true, note: "政策文件库与官方解读，待接入" },
  { key: "gta", name: "Global Trade Alert", kind: "html", url: "https://globaltradealert.org", layer: "S1", pillar: "geopolitics", enabled: false, note: "Angular 应用，路径 404，跳过" },
  { key: "xinhua", name: "新华社（新华网）", kind: "html", url: "https://www.xinhuanet.com", layer: "S0", pillar: "geopolitics", enabled: true, cooldownDays: 7, slow: true, note: "官方口径与通稿，待接入（403 反爬）" },

  /* ---------- ③ 市场信号 ---------- */
  { key: "sne", name: "SNE Research", kind: "html", url: "https://www.sneresearch.com/en/insight/release/", layer: "S1", pillar: "markets", enabled: true, note: "Press Release 列表，含全球装机份额" },
  { key: "eastmoney", name: "东方财富", kind: "rsshub", url: "", rsshubRoute: "eastmoney/report/industry", layer: "S3", pillar: "markets", enabled: true, note: "财报/研报/公告聚合" },
  { key: "wallstreetcn", name: "华尔街见闻", kind: "rsshub", url: "", rsshubRoute: "wallstreetcn/live", layer: "S3", pillar: "markets", enabled: true },
  { key: "reuters", name: "Reuters Markets", kind: "html", url: "https://www.reuters.com/markets/", layer: "S1", pillar: "markets", enabled: false, note: "401 需登录，跳过" },
  { key: "cnbc", name: "CNBC Energy", kind: "rss", url: "https://www.cnbc.com/id/100003114/device/rss/rss.html", layer: "S3", pillar: "markets", enabled: true, note: "美股/财报/能源/EV 供应链" },

  /* ---------- ④ 储能（广泛扫描，筛电池出口相关后归入已有内容） ---------- */
  { key: "esnews", name: "Energy-Storage.News", kind: "rss", url: "https://www.energy-storage.news/feed/", layer: "S2", pillar: "storage", enabled: true, note: "全球储能垂直媒体头牌" },
  { key: "escn", name: "中国储能网", kind: "html", url: "https://www.escn.com.cn", layer: "S2", pillar: "storage", enabled: true, note: "自带储能项目数据库，招标中标、政策" },
]

export function enabledSources(): SourceConfig[] {
  return SOURCES.filter((s) => s.enabled)
}
