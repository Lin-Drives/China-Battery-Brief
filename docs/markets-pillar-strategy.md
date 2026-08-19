# MARKETS 支柱：定位聚焦与投研方向（战略方案）

> 状态：**已实施**（2026-08-09）。本文件为战略依据；落地范围见下文「已落地改动」。
> 决策链条：第四支柱命名为 **MARKETS（市场与财务）**，深度为**产业逻辑层**，形态为**内容支柱**（非独立产品/非新增定价档位）。

---

## 一、为什么是 MARKETS，不是「投研」

原有三支柱（CAPACITY / TECH / GEOPOLITICS）本质都是**投资决策的输入量**：投资人看 CATL 不会分三个抽屉，只问三件事——**谁会赢？值多少？什么时候兑现？**

- 前三支柱回答了「谁会赢」的前半（产能、技术、政策共同决定竞争力）。
- 缺的是市场端**兑现信号**：份额、价格、资金流向、财报与资本开支。
- 「投研」一词对新闻媒体有合规与信任风险（易被误读为投资建议）；**MARKETS（市场与财务）** 与现有三支柱平行、语义准确、红线清晰——产业逻辑层，不做个股买卖建议。

## 二、目标读者画像（重新聚焦）

当前文案同时声称服务机构与个人，自相矛盾。MARKETS 支柱的定位锚定**中间层决策者**：

| 画像 | 他们要什么 | MARKETS 提供什么 |
|---|---|---|
| 中等规模供应链企业决策者（电池/材料/设备厂中高层） | 竞争对手与客户动向、产能与价格信号 | 份额记分牌、资金动向、谁在建谁在买单 |
| 新能源领域咨询顾问 | 快速可信的行业事实 + 判断 | 带来源的份额/价格数据、每周观点 |
| 小型基金/独立分析师 | 西方研究台读不到的中文信源 | 中国公告、券商纪要、MIIT 文件解读 |
| 政府经贸官员 / 行业媒体记者 | 政策如何影响产业经济 | 把监管条文翻译成工厂经济学 |

**明确不服务**：能报销 $5k/年的机构 PM（他们直接买 Benchmark/SNE）——那是「原始数据」生意；MARKETS 卖的是「理解」。

## 三、差异化（护城河不是「写得通俗」，是「读得懂中文信源」）

| 竞品 | 定价 | 空白点 |
|---|---|---|
| Benchmark / Rho / SNE | $3k–20k/年 | 有原始数据，不解释「为什么」；无中文信源解读 |
| Stratechery | $12/月 | 单作者泛科技战略，非垂直产业 |
| The Information | $399/年 | 科技商业新闻，不做电池垂直数据 |
| The Limiting Factor | 免费 YouTube | 只讲电化学，不讲产业与资金 |

MARKETS 的独特生态位：**跨语言情报差**。雪球、券商研报、MIIT 公告、中国上市公司业绩说明会纪要——这些 Western desks 读不了的一手信源，是 $19/月的成立理由。这正是 info.md 事实底座里最大块未展开的投资侧素材。

## 四、内容矩阵（每周产出）

| 板块 | 形态 | 素材底座 |
|---|---|---|
| **The Scoreboard** | 全球装机份额/出货的月度变盘点（谁升谁降、为什么） | SNE Research 数据（info.md §2.1） |
| **Prices & Costs** | 电芯/大宗商品价格驱动因素（不只报数，讲因果） | LFP $52/kWh、钠电 -30%、§45X $35/kWh |
| **Money Moves** | 财报、capex、融资、JV 股本、订单合同（谁在烧钱、谁在回血） | 印尼 $6bn、CALB €2.07bn、EVE $1.2bn |
| **The Take** | 每周一个产业逻辑判断（**非投资建议**，保持新闻立场） | 编辑台综合分析 |

**合规红线**：页面显式声明 "THIS PAGE IS JOURNALISM, NOT INVESTMENT ADVICE"。不做个股目标价、不做买卖建议、不做收益预测。

## 五、品牌记忆点

- 视觉：铜色（amber `#F0A832`）作为第四支柱色——铜呼应电池金属，也是品牌既有点缀色，不引入蓝紫渐变。
- 语言：MARKETS 与 CAPACITY/TECH/GEOPOLITICS 四支柱并列，kicker 统一 `BEAT 04 / MARKETS`。
- 内容记忆点：**「记分牌 + 资金流向」**——"Follow the money, not the hype"。

## 六、已落地改动（全站同步升级）

1. **类型/数据层**：`ApiPillar`/`PillarSlug` 增加 `markets`；`pillar.ts`、`account/utils.ts`、`PillarTag.tsx` 增加 copper 映射；`content-router.ts`、`me-router.ts` 的 `PILLARS` 数组加入 `markets`；`db/schema.ts` 两处 mysqlEnum 增加 `markets` 并 `db:push`。
2. **i18n**：`en.ts`/`zh.ts` 新增 pillar/label/short/tag、`beat4.*`、`nav.markets`、`route.markets`、`markets.*` 全量文案（zh 遵守无句号/无翻译腔规范）。
3. **首页**：Pillars 四面板（BEAT 04 / MARKETS，铜色，to `/markets`）；StatBlock 支持小数（40.7%）。
4. **新页面** `/markets`：Header + Scoreboard（4 统计卡，SNE 数据）+ recharts 份额曲线（CATL 37.9→40.7→40.2 / BYD）+ 价格卡（LFP/钠电/关税）+ 资金动向表（5 笔）+ The Take（非建议声明）+ 相关简报 + CTA。Navbar 链接与 App 路由已接入。
5. **内容**：新增 No. 049《The Scoreboard: Two Firms, Half a Market》EN + ZH（真实信源：SNE、IEA、C2ES、新华社、BatteryTech 等），程序化 SVG 封面 `cover-049.svg`，`issues.json`/`issues-zh.json` 已登记。
6. **数据库**：enum 更新 + reseed（6 期，含 No. 049 `["markets"]`）。

## 七、验证

- `npm run check`（tsc -b）✓
- `npm run build` ✓
- `npm run lint`：与改动前同为 49 个存量错误，0 净新增
- 冒烟：`content.issues.list?pillar=markets` 返回 No. 049 ✓；`issues.latest` 为 No. 049 ✓；`/markets` 200（SPA fallback）✓

## 八、后续可做（未实施）

- `/briefs` 档案页已自动支持 MARKETS 过滤（PILLAR_ORDER 驱动），但暂无独立「MARKETS 归档」视图。**待 MARKETS 累积到 5~6 期后做**：在 `/markets` 页内（或独立 `/markets/archive` 路由）用铜色卡片列出所有 `pillars` 含 `markets` 的期数，而非复用通用 IssueRow。
- Desk 档 REST API 的 `markets` 数据源（当前无专门 markets API；数据为静态策展）。**待 MARKETS 累积几期数据或需支持 admin 台编辑市场数据时做**：新建 `markets.overview` tRPC 接口 + 市场数据表，前端 `Markets.tsx` 改 `useQuery`，让份额/价格/资金动向可溯源、可更新、可做周环比差异，无需每次改数字都发版。
- Ticker 可增加一条 markets 行情项（如 `NA+ LFP CELL $52/kWh`），需更新 `db/seed.ts` ticker 数组。**已决策：不做**——主编明确不喜欢 Ticker 跑马灯。
- 若未来要做「含估值判断」档位，需先引入合规审核流程与免责声明体系。

---

# 附：Policy Desk（政策追踪）改造（2026-08-09）

## 决策

- 用户判断「风险雷达」意义不大 → 保留地缘政治内容、砍掉量化外壳。
- 路由 `/risk` → `/policy`；删除评分类组件；内容聚焦**中国对规则的反制与执行**（出口管制、审批、标准、补贴细则）。

## 与 MARKETS 的区分（两条线）

1. **时序**：政策 = 规则的**前因**（立法、谈判、倒计时、合规细节）；MARKETS = 钱的**后果**（份额、价格、资金、财报）。政策回答「为什么」，MARKETS 回答「值多少」。
2. **信源**：西方规则本身是公开信息（西方读者自己可读）；政策栏只做**中国一侧的反应与执行**——MOFCOM 出口管制公告、工信部标准、MIIT 专项资金、补贴细则——这是中文信源护城河真正适用的地方。

## 已落地改动

1. **路由/导航**：`/risk` → `/policy`；Navbar「Risk Radar」→「Policy（政策追踪）」；Footer、首页 Pillars 第 3 面板链接同步更新。
2. **删除**：`RiskMeter`（仪表）、`CountryCards`（国家敞口卡）、`ScenarioAccordions`（概率情景）三个组件；`intel-utils.ts` 的 `zoneColor`/`severityLabel`/`severityKey`；`content-router.ts` 的 `risk.scores` 接口。
3. **新页面** `/policy`（`src/pages/Policy.tsx`）：
   - Header（新定位文案）+ **The Rulebook · 四条战线**（出口管制 / 审批许可 / 标准 / 补贴细则，每条带 status + 解读 + 关键词）
   - **时间线**（复用 `PolicyTimeline`，相关简报改为可配置 prop）
   - **The Editor's Read**（三条编辑判断 + 非建议声明）
   - 相关简报 + CTA
4. **seed 数据**：`policy_events` 重排为 12 条聚焦中国政策事件（MIIT 基金、T/CSAE 434-2025、GB 38031-2025、出口管制三步、休战暂停期、地方补贴）；清理了表内历史重复行（原表无唯一键导致 seed 累计重复）。
5. **i18n**：`policy.*` 全量新增（en/zh），移除 `risk.*`/`scen.*`/`cc.*`/`severity.*` 键。

## 验证

- `npm run check` ✓、`npm run build` ✓、`npm run lint` 与改动前持平（49 存量，0 净新增）
- 冒烟：`/policy` 200、`/risk` 不再路由、`risk.scores` 404（已移除）、`policy.list` 返回 12 条中国事件 ✓
