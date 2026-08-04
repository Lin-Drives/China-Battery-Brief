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
