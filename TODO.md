# TODO — China Battery Brief

> 定位：**短期执行台账**——本次会话任务、当前迭代动作、调试/调研记录。长期方向与队列见 `docs/plan.md`「长期战略队列」；**一个任务只登记一处**（能本周动手的放这里，有触发条件/未到时机的放 plan.md）。

## 待办

- [ ] **回补 No.055–062 的引用与来源台账**：055 以后把引用写在了句末标点之后（060 有 39 处、061 有 54 处、062 有 26 处）；13 期 `sources` 与脚注条数/顺序不一致；061、062 还是 4–5 个 PART 小节。做法：逐期跑 `npm run review`，按 `L1.citation` / `L1.citationorder` / `L1.sourceledger` / `L1.sections` 修到全绿，再决定随下期发布还是 `DEPLOY_FORCE=1` 同号重发
- [ ] **国内独立储能收入结构**：容量电价、现货价差、辅助服务各自的占比，现有脚注支撑不了；先找山东、广东、安徽 2–3 个省的结算披露或典型项目数据，再动笔
- [ ] **L3 三 pass 审稿**：抽取（claim→证据）、对齐（EN/ZH 数字/专名/限定词）、语感（R1–R8）各用独立上下文 + JSON schema，合并后按 blocking/advisory 分级
- [ ] **规则 ID 三处对齐**：`docs/voice.md`、`dev/review.mjs`、`docs/voice-samples/` 用同一套编号（现为 S1–S10 / R1–R8 / L1.*）
- [ ] **回归语料**：用 19 期既有稿 + 注入错误（改数字、错换算、段首空转、引用倒序）测召回与误报
- [ ] **指标**：每期记录 blocking 数、人工改动行数、模型与脚本分歧数，用来决定哪条规则值得留
- [ ] **CI/pre-commit**：L1 在提交前与 CI 跑，失败阻断
- [ ] **Cloudflare 边缘缓存仍 DYNAMIC**：缓存头已生效但 js/css/svg 全部 `cf-cache-status: DYNAMIC`，疑似 zone 有全局 Bypass 规则；到 Caching → Cache Rules 删掉 Bypass 或给 `/assets/` 建 Eligible for cache
- [ ] **VPS 磁盘 83%**：`backups/` 每日增长，过 90% 有 MariaDB 风险；缩短保留周期或 pull 回本地

## 最近完成

- [x] 2026-11-18 **No.063 上线**（标题改为「出口填不满规划产能」；PART 压缩到 3 个；去掉 horizon 小方块；补两类储能对照表、目标结构比例、配储收入口径；引用重排到 22 条并与来源逐条对齐）
- [x] 2026-11-18 **审稿 L1 扩到七条新检查**：`L1.citation`（引用在标点前）、`L1.citationorder`（标签按首现递增）、`L1.sourceledger`（脚注↔sources 逐条 URL）、`L1.sections`（PART ≤3）、`L1.heading`（标题不代称）、`L1.vague`（正文不代称）、`L1.horizon`（小方块停用）；fixtures 11 例全过，规则写进 AGENTS / voice.md / content-reviewer / 发刊清单

## 约定

- 改动只提交本地，push 需用户明确授权
- 信源优先近 3 个月；新刊封面一律程序化 SVG（无生图能力）
- 发版走 `app/scripts/deploy-release.sh`（见 `docs/release.md`）；VPS 454MB 内存，依赖 2GB swap，别在服务器上跑全量构建
