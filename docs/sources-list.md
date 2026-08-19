# China Battery Brief — 信源清单（Sources List）

> 状态：v0.2（2026-08-09 初建，主编手工确认 + 抓取层已落地）。本清单是自动化扫描工作流的数据底座。
> 用途：每周内容流水线（周日扫描 → 周一/二编辑 → 周三校对 → 周四发刊）抓取信源时按本清单执行。
> 约定：`✅` 已确认启用；`⚠️` 待人工在浏览器验证（子代理访问失败多因反爬/境外 IP，非站点失效）；`🆕` 后续可加。

---

## 〇 自动化工作流（已落地）

> 实现参考：数字生命卡兹克 AIHOT / 衍生项目 finhot 的思路（多源聚类 + S0-S4 信源分层 + 双时间戳 + 强制溯源）。

### 分层
- **抓取层**（纯代码，cron 可全自动）：`npm run scan:sources`（`app/scan/run.ts` + `app/scan/config.ts`）并发抓取启用信源，增量去重（sha256(url)），落盘 `app/scan/<日期>/raw/<源>.json` + `_all.json` + `_summary.txt`。无 RSS 的官方站落原始 HTML 到 `raw-html/`。
- **整理层**（需 opencode）：`opencode run scan:digest`（`.opencode/command/scan:digest.md` → `app/scan/digest.md` 规范），读 raw 素材 → 多源聚类成 story → 四大分类 → 产出 `scan/<日期>/digest.md`。

### 目标节奏
周日抓取（可 cron 自动）→ 周一/二 `scan:digest` 整理 → 周三校对定稿 → 周四发刊。

### cron 配置示例（macOS launchd）
`scan:digest` 必须人工在 opencode 里跑（AI 层）。抓取层可无人值守，用 launchd 定时（示例：每周日 09:00）：

```xml
<!-- ~/Library/LaunchAgents/com.cbb.scan.plist -->
<plist version="1.0">
<dict>
  <key>Label</key><string>com.cbb.scan</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/zsh</string>
    <string>-lc</string>
    <string>cd /Users/hpp/Work/03_Projects/China-Battery-Brief/app &amp;&amp; npm run scan:sources</string>
  </array>
  <key>StartCalendarInterval</key>
  <dict><key>Weekday</key><integer>0</integer><key>Hour</key><integer>9</integer><key>Minute</key><integer>0</integer></dict>
</dict>
</plist>
```
```bash
launchctl load ~/Library/LaunchAgents/com.cbb.scan.plist
```

### 抓取层信源状态（2026-08-10 定稿）

**已接入（正常产出）**：CnEVPost / 华尔街见闻 / 东方财富 / CNBC / Energy-Storage.News（RSS）+ 财联社电报（RSSHub）+ CATL / EVE / 华友 / 中国储能网 / SNE（HTML 专用解析）。

**已修复（2026-08-10）**：SNE——原 URL 302 跳转 + 缺 `/en/insight/release/` 路径，改对后抓到 12 条全球份额/装机数据。

**判定跳过（不做专项）**：
- **JS 渲染源**：比亚迪、Gotion、欣旺达、盖世汽车——新闻由 JS 动态加载，静态抓取拿不到；需浏览器渲染（playwright），成本高且有反爬风险，跳过。
- **Reuters**：401 需登录/JS challenge，无免费公开 feed，跳过。
- **Global Trade Alert**：Angular 应用，路径全 404，需 API 逆向，跳过。
- **财联社电报**：RSSHub 返回 0 条（路由 200 但无条目），内容经财联社官网电报页可查，暂以官网为主。
- **Benchmark / CALB / 中伟**：Benchmark feed 超时（免费内容有限）；CALB/中伟交易所公告站反爬，优先级低，跳过。

---

## ① 海外建厂要闻（Overseas Expansion）

### 英文
| 站点 | URL | 语言 | 优先级 | 备注 |
|---|---|---|---|---|
| CnEVPost | cnevpost.com | 英 | ★★★ | 中国巨头海外动态当日全覆盖，首选时效源 |
| Benchmark Mineral Intelligence | benchmarkminerals.com | 英 | ★★ | 权威背书，免费内容有限（付费为主），交叉验证用 |

### 公司官方（全部收录）
| 公司 | URL | 状态 | 备注 |
|---|---|---|---|
| 宁德时代 CATL | catl.com | ✅ | 新闻中心，海外基地一手事实源 |
| 比亚迪 BYD | byd.com | ✅ | 海外整车/电池工厂 |
| 亿纬锂能 EVE | evebattery.com | ✅ | 匈牙利/马来西亚基地、储能扩产 |
| 国轩高科 Gotion | gotion.com | ✅ | 德国/美国/斯洛伐克/印尼基地 |
| 蜂巢能源 SVOLT | svolt.cn | ✅ | 泰国基地、储能 |
| 欣旺达 Sunwoda | sunwoda.com | ✅ | 动力/储能扩产 |
| 华友钴业 Huayou | huayou.com | ✅ | 印尼镍冶炼/前驱体、正极出海 |
| 中创新航 CALB | 港交所披露易 HKEX News（hkexnews.hk，3931.HK） | ✅ | 官网连通差，改用港交所公告作信源 |
| 中伟股份 CNGR | 深交所披露（cninfo.com.cn，300919） | ✅ | 官网连通差，改用深交所公告作信源 |

### 中文
| 站点 | URL | 语言 | 优先级 | 备注 |
|---|---|---|---|---|
| 财联社（电报） | cls.cn | 中 | ★★★ | 分钟级快讯，最先抓到建厂/扩产公告 |
| 盖世汽车 Gasgoo | gasgoo.com（auto.gasgoo.com） | 中 | ★★ | 整车/供应链出海、海外工厂动态 |

---

## ② 政策追踪（Policy）

### 官方一手
| 站点 | URL | 语言 | 优先级 | 备注 |
|---|---|---|---|---|
| 商务部 MOFCOM | mofcom.gov.cn | 中 | ★★★ | 出口管制/两步许可/反制第一手，日更 |
| 工信部 MIIT | miit.gov.cn | 中 | ★★★ | 国标/回收/行业准入 |
| 发改委 NDRC | ndrc.gov.cn | 中 | ★★ | 规划与补贴细则上位文件 |
| 国务院（中国政府网） | gov.cn | 中 | ★★ | 政策文件库与官方解读 |

### 政策媒体
| 站点 | URL | 语言 | 优先级 | 备注 |
|---|---|---|---|---|
| Global Trade Alert | globaltradealert.org | 英 | ★★★ | 中美欧关税/管制/反制结构化日更数据库，可订阅通知 |

### 中国侧反应
| 站点 | URL | 语言 | 优先级 | 备注 |
|---|---|---|---|---|
| 新华社（新华网） | xinhuanet.com | 中 | ★★★ | 官方口径与通稿，核实政策定调类表述 |

---

## ③ 市场信号（Markets）

| 站点 | URL | 语言 | 优先级 | 备注 |
|---|---|---|---|---|
| SNE Research | sneresearch.com | 英/韩 | ★★★ | 全球装机份额权威，免费 PR 含最新份额数据 |
| 财联社 | cls.cn | 中 | ★★★ | 与①中文重复，公告/业绩披露最快 |
| 东方财富 | eastmoney.com | 中 | ★★ | 财报/研报/公告聚合，免费 |
| 华尔街见闻 | wallstreetcn.com | 中 | ★★ | 国际信源中文编译，宏观/能源事件 |
| Reuters Markets | reuters.com/markets | 英 | ★★★ | Deals/融资/合资/资本开支一手，免费额度约 5 篇/月需控制 |
| CNBC | cnbc.com | 英 | ★★ | 美股/财报/能源/EV 供应链，免费 |

---

## ④ 储能（Energy Storage）

> **定位**：作为广泛扫描话题，不单独立柱。扫描到的储能新闻先经筛选——**只保留与「电池出口/中国电池企业出海」相关的**（如中国储能电芯/系统集成商在海外的大项目、订单、产能、政策影响），再分类归入 ① 海外建厂 / ② 政策 / ③ 市场信号 中已有内容。

| 站点 | URL | 语言 | 优先级 | 备注 |
|---|---|---|---|---|
| Energy-Storage.News | energy-storage.news | 英 | ★★★ | 全球储能垂直媒体头牌，订单/大项目/政策覆盖最全 |
| 中国储能网 | escn.com.cn | 中 | ★★★ | 栏目化建库友好，自带储能项目数据库、招标中标 |

---

## ⑤ 补充说明

- **未启用但调研过**：Electrive、EnergyTrend、pv magazine、MINING.COM、Argus、Fastmarkets、高工锂电（主用公众号）、鑫椤资讯、电池中国、晚点 LatePost、SPIR、Bloomberg/FT（付费墙高）、雪球（反爬，纪要最全）、财新（深度付费）、Rhodium/CSIS/ICCT 等智库、美国 .gov 系列（IRS/DOE/USTR/Federal Register）——如需随时可从调研记录补回。
- **储能候选未启用**：北极星储能网（中文招标中标价一手）、CNESA 中关村储能产业技术联盟（白皮书+全球储能数据库）、InfoLink 储能周度价格、国家能源局、BloombergNEF 免费部分、PV Tech、RenewEconomy、Utility Dive——储能话题扩大扫描时再加。
- **待人工浏览器验证**：高工锂电、鑫椤资讯、晚点、SPIR、美国 .gov 全部、Fluence、Tesla Megapack。
