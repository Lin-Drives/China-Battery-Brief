# China Battery Brief — 项目交付说明

> 每周一期的英文电池产业情报 Newsletter：解读中国电池厂海外建厂、技术路线（LFP vs 固态）、地缘政治（IRA / 欧盟电池护照）。模式 A：付费订阅，轻资产高毛利。
> 交付版本：`2e2f53b` · 2026-08-09 · 全栈（React 19 + Hono/tRPC + Drizzle/MySQL）

## 一、网站结构（10 页 + 认证/404）

| 路由 | 页面 | 数据源 | 亮点 |
|---|---|---|---|
| `/` | 营销首页 | 静态 + ticker API | R3F 粒子世界地图 Hero、三大支柱 pinned 场景、与 $3–15k/年行业终端的 "The Gap" 对比、倒计时 CTA |
| `/briefs` | 期刊档案库 | `issues.list` | 支柱筛选/搜索、列表/网格视图、FREE  stamp、付费锁标识 |
| `/briefs/:slug` | 阅读器（奶油纸质） | `issues.bySlug` | **服务端付费墙**：未授权只返回 ~40% 内容 + 黑条遮挡揭示交互 + `/pricing?from=` 回跳 |
| `/tracker` | 全球工厂追踪 | `factories.list/stats` | d3-geo 可缩放暗夜世界地图、19 个真实站点、时间轴 scrubber、详情抽屉 |
| `/tech` | 技术路线 LFP vs SSB | 静态策展 | 6 指标 pinned "对战" 滚动场景、时间线、公司押注表、术语表 |
| `/policy` | 政策追踪 | `policy.list` | 中国规则手册四条战线 + 12 条政策时间线（2024→2027）+ 编辑台解读（原 `/risk` 已废弃） |
| `/markets` | 市场信号 | 静态策展 | 格局（SNE 份额）、LFP/钠电/关税价格卡、资金动向表、The Take |
| `/pricing` | 定价转化页 | `billing.checkout` | $0 / $19 / $499 三档、月/年切换、对比表、FAQ |
| `/about` | 关于与方法论 | 静态 | 宣言、"missing middle" 商业透明、信源管线、团队、勘误日志 |
| `/account` | 订阅者仪表盘 | `billing.my/history` + `me.*` | 订阅状态、收藏、告警矩阵、API Keys（Desk 档）、账单；admin 角色额外见 DESK CONTROL 管理台（发刊/删刊/统计） |

## 二、后端（tRPC 路由一览）

- `content.*`：issues.list/latest/bySlug（**权限感知截断**）、factories.list/stats、policy.list、ticker.items、subscribe.email
- `billing.*`：plans、my、**checkout（模拟，Stripe 形状）**、cancel、history
- `me.*`：saved.list/add/remove、alerts.get/set、apiKeys.*（Desk 档门禁）
- `admin.*`：stats、issues/factories/policy CRUD（admin 角色）
- 认证：平台内置 Kimi OAuth（`Sign in with Kimi`），首个登录的创建者自动成为 admin

## 三、数据库（12 表，已灌种子）

users · issues(6 期英文样刊 No. 044–049，基于调研事实底座) · plans(5 档) · subscriptions · payments · factories(19 站点) · policy_events(12 条，title+date 唯一约束防 seed 重复) · ticker_items(8) · saved_briefs · alerts · api_keys · email_subscribers

## 四、真实 vs 模拟（边界诚实清单）

| 能力 | 状态 |
|---|---|
| 内容/工厂/政策数据 | ✅ 真实 DB（种子基于 2026-08 调研事实，admin 台可维护） |
| 登录/权限/付费墙截断 | ✅ 真实（平台 OAuth + JWT + 服务端截断） |
| 支付 | ⚠️ 模拟 checkout（平台不支持第三方支付；接口形状对齐 Stripe，替换点：`api/billing-router.ts` 的 `checkout`） |
| 邮件投递（周刊群发/欢迎信） | ❌ 未实现（需接入 Resend/SES 类服务） |
| CSV 导出、阅读进度统计 | ⚠️ 前端门禁/本地存储占位 |

## 五、下一步建议

1. 替换模拟支付为 Stripe Checkout + Webhook（结构已预留）
2. 接邮件服务实现周四 06:00 UTC 群发与事务邮件
3. 增加独立 `/admin` 路由与富文本编辑器（当前管理台在 `/account` 内）
4. 种子数据持续更新：每周发刊流程 = admin 台粘贴 markdown → 发布

## 六、工程结构

- 共享仓库：`/mnt/agents/output/app`（master = 交付版本）
- 设计稿：`/mnt/agents/output/design/`（10 份）
- 调研事实底座：`/mnt/agents/output/info.md`
- 样刊源稿：`/mnt/agents/output/seed-content/`
- 构建：动态版本由平台服务端构建；本地构建门禁已通过（`npm run build` ✓ `tsc -b` ✓）
