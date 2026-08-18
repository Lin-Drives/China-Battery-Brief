# TODO — China Battery Brief

> 定位：**短期执行台账**——本次会话任务、当前迭代动作、调试/调研记录。长期方向与队列见 `Kimi_Agent_一键中英切换/china-battery-brief/plan.md`「长期战略队列」；**一个任务只登记一处**（能本周动手的放这里，有触发条件/未到时机的放 plan.md）。

## 已完成（未推送）
- [x] 开发进度可视化展板：`devboard.mjs`（扫描 git/TODO/plan/deploy + 代码统计 → 生成纯 SVG/CSS 静态 `devboard.html`，暗色编辑部风，`node devboard.mjs` 重建）
- [x] VPS 部署 Step 3：MariaDB 加固 + 建库建用户 + `db:push` 建表 + 种子灌入（7 EN + 7 ZH 期）已验证；生产构建完成（schema 因 MariaDB 不兼容 `serial` 改为 `bigint().autoincrement()`，未提交）
- [x] VPS 部署 Step 6/7：VPS 同步到 `9d61cf0`（移除 Kimi OAuth）+ 重建；systemd `cbb.service` 常驻（www-data，3000 端口，`ping` + 期刊全量可读已验证）+ 备份 cron（每日 03:00，`/opt/cbb/backups/`）
- [x] **自托管正式上线**：https://chinabatterybrief.com 已可访问（广东网络正常）——Step 1 DNS（CF A 记录 @/www → 161.35.120.114）+ Step 4 Nginx 反代（80→3000，XFF 信任 CF 21 段）+ Step 5 CF SSL Flexible（访客↔CF 加密，回源走 80）；CSP ✓、`/api/oauth/begin` 404 ✓；HSTS 待 Full 模式后生效（plan.md 队列 E）
- [x] No. 048《再出口枢纽》EN + ZH（真实信源、SVG 程序化封面）
- [x] No. 049 / No. 050 EN + ZH（真实信源、SVG 程序化封面）
- [x] 四大支柱中文命名统一：产能地图 / 技术路线 / 政策追踪 / 市场信号
- [x] 全站发刊日期前移对齐：No. 044–050 序列改为 07-02 至 08-10
- [x] 修复 No. 050 脚注编号与来源账本错位，校正各支柱页相关简报
- [x] 统一产能地图统计口径为真实跟踪数据（19 站点 / 11 国 / 464 GWh）
- [x] 信源收敛：26 → 17 个零失败信源
- [x] 归档精选卡片封面 4:3 SVG 改用 object-contain 完整显示
- [x] 全 5 期中英「PART 签注」小标题（分组颜色，正文/左侧导航栏一致，每部分一次）
- [x] 翻译校对：直引号→全角、混排间距、长句顺化、信源时效约定（AGENTS.md）
- [x] 根 README（技术栈/部署/边界）、Git 初始化推送初始版
- [x] 安全设计前置一轮（44d95db）：限流 / 安全响应头+CSRF / OAuth state / 审计表 / 备份脚本 / security.md 应急手册；部署方案敲定后需复核 XFF、HTTPS/HSTS、OAuth redirect allowlist
- [x] 确认 scan 抓取定时任务已启动并运行正常：launchd `com.cbb.scan`（每周日 09:00），最近一次 17 源全跑、0 失败（整理层 `scan:digest` 仍需手动触发）

## 调试记录（No. 048 阅读页专项，已提交）
- [x] 修复 markdown HTML 注释泄漏（`skipHtml`）：PART 签注注释不再显示为正文文本
- [x] THE TAKE / 本刊观点：kicker 与标题同文时隐藏签注，只保留标题
- [x] 左侧导航（TocRail）：字号 15px、透明度 90%、加宽至 320px、标题不换行
- [x] 修复点击跳转：Lenis 接管滚动导致 `window.scrollTo` 失效 → 新增 `src/lib/scroll.ts` 单例；根因是中文标题 slug 生成空串 → `headingSlug` 改用 Unicode 属性保留 CJK
- [x] 修复来源重复：gfm 脚注列表与 `issue.sources` 双份渲染 → 抑制 footnotes section，上标改纯数字，`#sources` 锚点迁移
- [x] 删除阅读页顶部进度条 ProgressRail
- [x] 删除 /briefs 档案页跑马灯 TickerBar
- [x] 开发模式运行中（`npm run dev`，HMR 生效；本地验证基线 `npm run build && npm start` 仍适用）

## 新方向：多模态模型接入 opencode
- [x] 调研 opencode 是否支持 vision/多模态模型（providers 配置、模型支持情况）
- [x] 目标：让 AI 能读图——解决截图、封面图、设计稿无法理解的问题
- [x] 参考资料：opencode.ai 文档、customize-opencode skill、opencode.json 配置

## 读图能力落地（vision 子代理）
- [x] 新增 `~/.config/opencode/agent/vision.md`：vision 子代理，读图并输出版式/文字/配色/缺陷报告
- [x] 选定主模型：`opencode/minimax-m3`（Zen 按量，$0.30/$1.20 per 1M，约 $1/千张封面图）
- [x] 备选模型：`kimi-for-coding/kimi-for-coding`（Kimi K2.7 Code，支持读图）
- [x] Zen 免费档 `opencode/mimo-v2.5-free` 读图验证通过（受限流影响，仅作演示）
- [x] 免费档仅 `mimo-v2.5-free` 支持读图，其余 `-free` 后缀模型为纯文本或 401 不可用
- [x] 全局默认模型切换为 `deepseek/deepseek-v4-flash`（省成本）
- [x] 结论：Zen/Go 提供 61+ 模型按量或订阅访问，vision 子代理读封面图质量达标（配色、文字逐字、缺陷检测均准确）

## 生图调研（结论：暂缓）
- [x] 调研 NVIDIA NIM 生图：`qwen-image-edit` 已不在目录；`diffusiongemma-26b-a4b-it` 仅输出文本（离散扩散加速的对话/OCR 模型，非文生图）
- [x] 备选生图路线（未启用，需额外 key）：阿里百炼 `qwen-image-2.0`、字节 `seedream`、Vercel AI Gateway
- [x] 维持规范：新刊封面继续程序化 SVG（AGENTS.md 第七节）

## 当前迭代（短期，可动手）
- [x] 重启 opencode 启用 `scan:digest` 命令（`.opencode/command/scan:digest.md` 已建，需重启生效）
- [x] 跑一次 `scan:digest` 整理 No. 050 之后素材，产出下周选题池（2026-08-15，303 新增 → 10 story，见 scan/2026-08-15/digest.md；补登记 No.050 主题画像至 published-topics.md）
- [x] 补政府站 HTML 解析（商务部/工信部已接入首页 art 详情解析；发改委/国务院/新华社首页无列表结构，维持存档占位）
- [x] 固化 content-reviewer 复核流程为 opencode 命令（`.opencode/command/content:review.md`，已更新 AGENTS.md 引用）
- [x] 部署方案敲定：自有 VPS + Nginx + 新购域名 + VPS 同机 MariaDB，方案文档 `china-battery-brief/deploy.md`，在分支 `deploy/self-hosted` 开发（主线保持平台托管）
- [x] **去平台化登录第一步**（分支 `deploy/self-hosted`）：移除 Kimi OAuth 全部代码（`api/kimi/`、`boot.ts` 路由、env 变量），demo 免登录全站可读，`auth.*` 接口预留 stub，cookie 改 `cbb_sid`，Login 页改占位
- [ ] 购买 VPS 已办（DigitalOcean 161.35.120.114）→ 部署进行中：Step 3 MariaDB+seed、Step 6 systemd、Step 7 备份 cron、Step 1/4/5 DNS 迁 Cloudflare + Nginx + HTTPS
- [ ] 域名 `chinabatterybrief.com` 已注册 → DNS 迁 Cloudflare（A 记录指向 VPS）

## 暂停（暂不开发付费功能）
- 邮箱+密码认证（demo 免登录，接口已预留 stub）—— 队列 B
- 付费墙/权限单测 —— 搁置
- Stripe 支付、邮件群发、独立 /admin 属长期方向，登记在 plan.md「队列 B — 平台真实化」

## 约定
- 改动只提交本地，未获允许不 push 远端（本次已获用户明确授权推送）
- 信源优先近 3 个月；新刊封面一律程序化 SVG（无生图能力）
