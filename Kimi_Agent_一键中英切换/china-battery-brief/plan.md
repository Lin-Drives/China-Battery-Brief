# China Battery Brief — 全栈 Newsletter 网站执行蓝图

## 0. 产品定义（Orchestrator 直接设计，作为所有阶段的统一上下文）

- **产品**：China Battery Brief —— 每周一期英文电池产业情报 Newsletter
- **三大内容支柱**：
  1. 海外建厂动态（Overseas Expansion）：CATL/匈牙利、西班牙，BYD/巴西、土耳其、匈牙利，EVE、Gotion、CALB 等
  2. 技术路线（Tech Routes）：磷酸铁锂 LFP vs 固态电池 Solid-State，含钠离子、LMFP 等
  3. 地缘政治风险（Geopolitics & Policy）：美国 IRA / FEOC 条款、欧盟电池法规与电池护照（Battery Passport）
- **商业模式（模式 A）**：英文付费订阅，轻资产高毛利
  - Free：每周摘要（免费注册）
  - Pro：$29/月 或 $290/年（完整周刊 + 档案库）
  - Team/Enterprise：$990/年（5 席位）
- **目标读者**：海外投资人、供应链从业者、政策分析师（内容全英文）
- **设计基调**：编辑部风格（Stratechery / The Information 气质），低饱和暖色调、大量留白、清晰层级；铜色（copper）作为品牌点缀色，呼应电池金属；禁止蓝紫渐变

## 1. 功能范围（MVP）

| 模块 | 页面/能力 | 前端 | 后端 |
|---|---|---|---|
| 营销落地页 | `/` Hero、三大支柱、样刊预览、定价、FAQ | ✅ | — |
| 期刊档案 | `/issues` 列表 + 标签筛选 | ✅ | 文章 API |
| 文章阅读 | `/issues/:slug` 免费试读 + 付费墙 | ✅ | 权限判断 |
| 用户系统 | 注册/登录、`/account` 订阅管理 | ✅ | 邮箱+密码认证 |
| 付费订阅 | `/pricing` → 模拟 Checkout → 开通会员 | ✅ | 订阅/支付记录表 |
| 管理后台 | `/admin` 发布/编辑周刊（Markdown） | ✅ | 管理员角色 + CRUD API |
| 种子内容 | 4 期样刊（真实产业内容，英文） | — | DB Seed |

## 2. 阶段分解（Stage-Gate）

### Stage 1 — 编排与环境
- 加载 `vibecoding-webapp-swarm`（编排方法论 + product-knowledge.md）
- 加载 `swarm-workspace`，建立共享 git 仓库 + worktree 机制
- 产出：仓库就绪、技术约定文档

### Stage 2 — 设计（design-first）
- 派发 design 子代理：输出设计系统（色板/字体/组件风格/页面线框），写入仓库 `docs/design-system.md`
- Gate：主代理审核设计稿方向符合"编辑部风格 + 铜色点缀"方可进入下一阶段

### Stage 3 — 前端构建（`webapp-building-swarm`）
- 派发前端子代理，在 worktree 上实现全部前端页面（React + TS + Tailwind + shadcn/ui）
- 前端先行定义好后端 API 契约（tRPC 路由清单），便于后端对齐
- Gate：`npm run build` 通过

### Stage 4 — 后端嫁接（`backend-building-swarm`）
- 派发后端子代理：tRPC + Drizzle + Hono + MySQL
- 数据表：users / plans / subscriptions / payments / issues / email_subscribers
- 邮箱+密码认证（面向海外读者，不用 Kimi 登录）；管理员角色
- 模拟支付：checkout 接口写入 payments 并激活订阅（接口结构对齐 Stripe，便于日后替换）
- Gate：API 冒烟测试通过，前后端联调成功

### Stage 5 — 种子内容（与 Stage 3/4 并行）
- 派发 research 子代理（explore）：快速核查 2025–2026 中国电池厂海外建厂/固态电池/IRA·欧盟电池法规关键事实
- 派发 writer 子代理：产出 4 期英文样刊 Markdown + metadata JSON，交集成阶段灌库
- 注意：research 与 writing 分离

### Stage 6 — 集成与交付
- 合并分支、种子数据入库、整体构建、端到端检查
- `mshtools-website_version_manager`（type: dynamic）保存版本交付
- 产出：可预览的网站版本 + 项目说明（README）

## 7. 当前主线后续任务（2026-08-09 记录）

> 已完成：四大支柱（含 MARKETS）上线、`/policy` 替换 `/risk`、049 期、policy_events 去重。以下为后续开发队列。

### 队列 A — MARKETS 板块深化（待数据累积后触发）
- **独立 MARKETS 归档视图**：等 MARKETS 出到 5~6 期后，在 `/markets` 内或 `/markets/archive` 用铜色卡片列出全部 markets 期，不复用通用 IssueRow。
- **`markets` 真 API**：新建 `markets.overview` tRPC 接口 + 市场数据表，`Markets.tsx` 改 `useQuery`。价值：改数字不发版、数据可溯源带日期、能算周环比差异。触发条件：MARKETS 累积几期数据，或需支持 admin 台编辑市场数据。

### 队列 B — 平台真实化（README §五）
- 模拟支付 → Stripe Checkout + Webhook（`api/billing-router.ts` 替换点已预留）
- 邮件服务：周四 06:00 UTC 群发 + 事务邮件（当前 `subscribe.email` 只落库）
- 独立 `/admin` 路由 + 富文本编辑器

### 已否决
- Ticker 跑马灯增加 markets 行情项（主编明确不喜欢 Ticker）

## 8. 行动计划（2026-08-10 追加）

> 当前进度：全栈 + 4 支柱 + 7 期内容（044–050）+ 信源扫描工作流（17 源零失败 + 定时任务）+ 内容选题横向比对。以下为后续计划，按优先级排列。

### P0 — 收尾（半天）
- [x] push 待推 commit（封面修复 ce67ed3）
- [ ] 重启 opencode 启用 `scan:digest` 命令（`.opencode/command/scan:digest.md` 已建，需重启生效）

### P1 — 内容流水线增强（1-2 天）
- [ ] 跑一次 `scan:digest` 整理 050 之后素材，产出下周选题池
- [ ] 补政府站 HTML 解析（商务部/工信部/发改委/国务院——目前只有 HTML 存档无解析，政策支柱稳定内容依赖它）
- [ ] 固化 content-reviewer 复核流程为 opencode 命令（当前每次手动派）

### P2 — MARKETS 深化（等数据累积）
- [ ] 独立 MARKETS 归档视图（触发条件：MARKETS 出到 5~6 期，现 049/050 两期）
- [ ] `markets` 真 API（触发条件：需 admin 台编辑市场数据，或数据累积）

### P3 — 平台真实化（大工程，择期）
- [ ] Stripe 支付接入（`api/billing-router.ts` 替换点已预留）
- [ ] 邮件服务（周四群发 + 事务邮件，当前 `subscribe.email` 只落库）
- [ ] 独立 `/admin` 路由 + 富文本编辑器（当前管理台在 `/account` 内）

### 已记录决策
- 信源收敛：17 源启用，JS 渲染源（BYD/Gotion/欣旺达/盖世）、认证源（Reuters/GTA）、低价值源（Benchmark/CALB/中伟）跳过
- 四大支柱中文名：产能地图 / 技术路线 / 政策追踪 / 市场信号
- 封面统一 4:3 SVG 程序化生成；归档精选卡片用 object-contain 防横向裁切
