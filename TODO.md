# TODO — China Battery Brief

## 已完成（本地 main，领先远端 5 个提交，未推送）
- [x] №048《再出口枢纽》EN + ZH（真实信源、SVG 程序化封面）
- [x] 全 5 期中英「PART 签注」小标题（分组颜色，正文/左侧导航栏一致，每部分一次）
- [x] 翻译校对：直引号→全角、混排间距、长句顺化、信源时效约定（AGENTS.md）
- [x] 根 README（技术栈/部署/边界）、Git 初始化推送初始版

## 调试记录（№048 阅读页专项，改动未提交）
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

## 暂停（暂不开发付费功能）
- 付费墙/权限单测、Stripe 支付、邮件群发、去平台化登录 —— 搁置

## 约定
- 改动只提交本地，未获允许不 push 远端（本次已获用户明确授权推送）
- 信源优先近 3 个月；新刊封面一律程序化 SVG（无生图能力）
