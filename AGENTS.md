# AGENTS.md — China Battery Brief

> 本文件面向 AI 编码代理，描述本仓库的结构、构建方式与开发约定。

## 一、项目概览

**China Battery Brief** 是一个中英双语（一键切换）的电池产业情报 Newsletter 全栈网站：每周一期英文周刊，三大内容支柱为海外建厂动态（Overseas Expansion）、技术路线（LFP vs 固态电池）、地缘政治与政策（IRA / 欧盟电池护照）。商业模式为付费订阅（Free / Pro $19 月 / Desk $499 月 三档）。

技术栈：**React 19 + TypeScript + Vite 7**（前端） + **Hono + tRPC 11**（后端） + **Drizzle ORM + MySQL**（数据库） + Tailwind CSS 3 + shadcn/ui 风格组件（Radix UI 全家桶）。动画用 GSAP + Lenis 平滑滚动，地图用 d3-geo / react-three-fiber，图表用 recharts。

### 仓库顶层结构（工作目录根）

注意：真正的代码库**不在仓库根目录**，而在子目录中：

```
Kimi_Agent_一键中英切换/        ← 项目主目录（目录名即功能："一键中英切换"）
├── app/                       ← 唯一可构建的应用代码库（npm 项目根）
│   ├── src/                   ← 前端（React SPA）
│   ├── api/                   ← 后端（Hono + tRPC，Node 运行时）
│   ├── db/                    ← Drizzle schema、relations、seed 脚本与种子内容
│   ├── contracts/             ← 前后端共享常量/类型/错误（constants.ts / types.ts / errors.ts）
│   ├── public/                ← 静态资源（封面图、logo、头像等）
│   └── package.json / vite.config.ts / drizzle.config.ts / ...
├── china-battery-brief/       ← 项目文档：README.md（交付说明，权威）+ plan.md（执行蓝图）+ security.md（安全应急手册）
├── seed-content/              ← 7 期英文样刊源稿（No. 044–050，与 app/db/seed-content 同源副本）
├── seed-content-zh/           ← 对应中文译文源稿
└── info.md                    ← 调研事实底座（所有内容的事实来源，带来源与日期标注）
Kimi_Agent_一键中英切换.zip    ← 上述目录的打包存档，勿改动
```

- 所有构建/测试命令都在 `Kimi_Agent_一键中英切换/app/` 下执行。
- `app/README.md` 是 Vite 脚手架默认 README，**没有信息量**；真正的项目说明在 `china-battery-brief/README.md`。

## 二、构建与运行

在 `Kimi_Agent_一键中英切换/app/` 目录下（依赖未安装时先 `npm install`）：

| 命令 | 说明 |
|---|---|
| `npm run dev` | 开发模式：Vite dev server（端口 3000），通过 `@hono/vite-dev-server` 把 `api/boot.ts` 挂进同一进程，HMR 同时覆盖前后端 |
| `npm run build` | 生产构建：`vite build` 输出前端到 `dist/public/`，再用 esbuild 把 `api/boot.ts` 打包成 `dist/boot.js`（ESM + createRequire banner） |
| `npm start` | 生产运行：`NODE_ENV=production node dist/boot.js`，由 Hono 静态托管 `dist/public` 并服务 API（`api/boot.ts` 中的 `env.isProduction` 分支） |
| `npm run check` | 类型检查 `tsc -b`（三个 tsconfig project：app / node / server）——**提交前必过的门禁** |
| `npm run lint` | ESLint（flat config：js + typescript-eslint recommended + react-hooks + react-refresh） |
| `npm run format` | Prettier 全量格式化 |
| `npm test` | `vitest run`（详见「测试」一节） |
| `npm run db:generate` / `db:migrate` / `db:push` | drizzle-kit 迁移生成/执行/直推；需要 `DATABASE_URL` 环境变量 |

### 环境变量

见 `app/.env.example`。关键项：`DATABASE_URL`（MySQL 连接串）、`APP_ID` / `APP_SECRET`（Kimi OAuth 应用）、`KIMI_AUTH_URL` / `KIMI_OPEN_URL`（后端）、`VITE_KIMI_AUTH_URL` / `VITE_APP_ID`（前端经 Vite 暴露）、`OWNER_UNION_ID`（首个登录的创建者自动获得 admin 角色）。`.env` 属于密钥文件，不要读取或提交。

## 三、运行时架构

- **单进程全栈**：dev 与 prod 都是「Hono 服务挂 tRPC + 静态文件」。入口 `api/boot.ts`：注册 OAuth 回调路由（`/api/oauth/callback`），把 `/api/trpc/*` 交给 `@trpc/server/adapters/fetch`，其余 `/api/*` 返回 404 JSON。
- **tRPC 路由**（`api/router.ts` 聚合）：`auth` / `content` / `billing` / `me` / `admin` + `ping`。过程分级定义在 `api/middleware.ts`：`publicQuery` → `authedQuery`（需登录）→ `adminQuery`（需 admin 角色）。序列化用 superjson。
- **认证**：平台内置 Kimi OAuth（`api/kimi/`：授权码换 token → JWKS 验签 → 签发 JWT session cookie `kimi_sid`，常量见 `contracts/constants.ts`）。`api/context.ts` 在每个请求上尝试解析用户，解析失败不报错（公开接口可用）。
- **付费墙（服务端强制）**：`content.issues.bySlug` 对未授权用户只返回约 40% 内容（服务端截断，不是前端遮挡）。授权判定在 `api/lib/entitlement.ts`：admin 永远放行；普通用户需存在 status ∈ {active, canceled, trialing} 且 `currentPeriodEnd` 在未来的订阅。
- **数据库**：`api/queries/connection.ts` 用 drizzle-orm/mysql2 单例（`mode: "planetscale"`）。Schema 在 `db/schema.ts`，共 12 表：users / issues（含 titleZh、dekZh、contentZh 中文字段）/ plans / subscriptions / payments / factories / policy_events / ticker_items / saved_briefs / alerts / api_keys / email_subscribers。种子脚本 `db/seed.ts` 从 `db/seed-content/`（英文）与 `db/seed-content-zh/`（中文）读 markdown + JSON 元数据灌库（幂等，onDuplicateKeyUpdate）。
- **前端路由**（`src/App.tsx`，react-router 7 嵌套在 `Layout` 下）：`/`、`/briefs`、`/briefs/:slug`、`/tracker`、`/tech`、`/risk`、`/pricing`、`/about`、`/account`、`/login`、`*`（404）。无独立 `/admin` 路由——管理台（发刊/删刊/统计）内嵌在 `/account` 页面对 admin 角色可见。
- **路径别名**：`@` → `src/`，`@contracts` → `contracts/`，`@db` / `db` → `db/`（vite、vitest、tsconfig 三处保持一致，新增别名要同步改）。

### 真实 vs 模拟（改动前必读）

- 内容/工厂/政策数据、登录、权限、付费墙截断：**真实实现**。
- 支付 checkout：**模拟**（平台不支持第三方支付；接口形状对齐 Stripe，替换点在 `api/billing-router.ts` 的 `checkout`）。
- 邮件群发/事务邮件：**未实现**（`subscribe.email` 只落库）。
- CSV 导出、阅读进度：前端门禁/本地存储占位。

## 四、前端组织与国际化（核心特性）

- `src/pages/` 一页面一文件；`src/components/` 按域分目录：`home/`、`briefs/`、`intel/`（Tracker/Tech/Risk 共用可视化组件，如 WorldMap、PolicyTimeline、RiskMeter）、`account/`、`growth/`、`ui/`（shadcn/ui 基础件）；跨页通用件在根（Navbar、Footer、TickerBar、LangToggle 等）。
- **i18n 机制**（`src/i18n/`）：自建轻量方案，无 i18next。`lang.tsx` 提供 `LangProvider` / `useLang()`，扁平 dot-key 字典 `en.ts` / `zh.ts`，**zh 缺失时回退 en，再回退 key 本身**；`tpl()` 做 `{var}` 插值。语言持久化在 localStorage 键 `cbb:lang`，切换时同步 `<html lang>` 并切换 `zh` class 做 CJK 排版微调。新增任何用户可见文案必须同时加到两个字典。
- 内容层双语：issues 表自带 `*Zh` 字段，英文先发、中文后补；`BriefDetail` 等页面按当前语言选字段。

## 五、代码风格约定

- **Prettier**（`.prettierrc`）：分号、双引号、`printWidth: 80`、`trailingComma: "es5"`、`arrowParens: "avoid"`、LF。注意 `src/` 下部分手写文件未严格遵循（单引号），改动时以不引入无关 diff 为准，批量重排用 `npm run format`。
- TypeScript 严格模式，`tsc -b` 是主门禁；ESLint 用 flat config，无 type-aware 规则。
- 服务端代码（`api/`、`db/`、`contracts/`）风格：双引号、分号、JSDoc 注释（英文）；前端组件风格更随意（单引号常见）。**跟随所在文件的既有风格**，不要跨风格统一。
- 设计基调（plan.md）：编辑部风格（Stratechery / The Information 气质），低饱和暖色调、大量留白，铜色（copper）为品牌点缀色，**禁止蓝紫渐变**。滚动动效用 Lenis + GSAP ScrollTrigger（`src/lib/gsap.ts` 统一注册插件）。
- 注释语言：代码注释英文为主，项目文档（README/plan/info.md）中文为主、术语保留英文。

## 六、测试

- 框架：Vitest（`vitest.config.ts`），`environment: "node"`，只收集 `api/**/*.test.ts` / `api/**/*.spec.ts`。
- **现状：仓库中尚无任何测试文件。** 新增测试应放在 `api/` 内、与被测模块同目录，命名 `*.test.ts`。
- 实际质量门禁是 `npm run check`（tsc）+ `npm run build` + `npm run lint`；改动后端逻辑后建议至少手测 tRPC 接口冒烟（`content.*` 的付费墙截断行为尤其要回归验证）。

## 七、内容工作流与安全注意

- 周刊发布流程：admin 在 `/account` 管理台粘贴 markdown → 发布；或更新 `db/seed-content*/` 后重跑 seed。事实内容必须溯源到 `info.md`（调研事实底座，每条带来源与日期）。
- **信源时效（内容红线）**：优先选用发布后 3 个月内的信息，时效越高越好。对「当前状态」的断言（在建/投产/搁浅/占比等），必须引用近 3 个月信源；历史事实（签约日、首产下线等）可作背景保留，但须与近期信源分开标注。无法核实真实 URL 的事实不得写入。
- **读者背景预设（写作红线）**：预设读者是专业从业者，但**不了解任何特定公司/项目的背景**。新企业、新项目、新专名首次出现时，先用一句简单语言介绍身份（如「安塔姆（Antam，印尼国有镍矿商）」「储能企业 HyperStrong」「商务部两步许可制」），再做具体论述；后续再提可沿用简称。英文同理（first mention 给身份从句）。
- **内容二次复核（交叉校验）**：新刊/改稿发布前，用 `content-reviewer` 子代理（`~/.config/opencode/agent/content-reviewer.md`，模型 `opencode/minimax-m3`）独立复核一遍，按 AGENTS.md 红线逐条检查（信源时效 / 读者背景预设 / 专业术语 / 中英一致性 / 表述清晰 / 事实溯源）；复核 agent 只读不改，**最终由主模型裁决并修正**。交叉校验利用不同模型互查，降低单一模型盲区。复核流程见第七节各红线条目。
- **封面图**：当前模型不具备位图生成能力；新刊封面一律程序化绘制 `public/cover-<期号>.svg`（4:3、站点色板：ink-900 底 `#0C1017` / 正文纸色 `#F4F0E6` / volt `#C9F24B` / 辅助 `#F0A832`、`#5ADFC3`、`#8E97A8`），`issues.json` 的 `coverAsset` 指向该 SVG；不依赖外部图片。
- 密钥：`.env` 与 `Kimi_Agent_一键中英切换.zip` 不要读取外传；`api_keys` 表只存哈希。
- 不要做 git mutation（commit/push/reset 等），除非用户明确要求。
- **Git 提交规范（用户指定）**：提交信息一律用**中文**，采用简洁的「动作 + 对象」标准格式（如 `修复首页语言切换按钮可读性`、`更新 info.md 竞品定价核实结果`）；允许多文件合并为一个主题提交；push 需用户明确授权。
- 部署由 Kimi Agent 平台服务端构建托管；本地验证以 `npm run build && npm start` 为准。README 中记录的交付基线：`npm run build` ✓、`tsc -b` ✓。
