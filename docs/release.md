# China Battery Brief — 日常发刊手册

> 适用范围：每周发布新的 Newsletter 期数到自托管 VPS。服务器首次部署、Nginx、MariaDB、备份和基础设施变更见 `docs/deploy.md`；本文件只覆盖日常发刊。

## 一、唯一发布入口

```bash
cd /Users/hpp/Work/03_Projects/China-Battery-Brief/app
bash scripts/deploy-release.sh
```

不要用 `scp`、手工 `rsync`、手工灌库或单独重启 `cbb` 拼凑发布流程。脚本已固化完整顺序，使用 rsync 支持增量与断点续传。

## 二、发布前检查

1. 本期中英文源稿、`issues.json` 与 `issues-zh.json` 已完成核对，且目标期号、标题、摘要和脚注一致
2. 本轮完整改动已通过相应检查并完成 Git 提交；工作区干净
3. 若改动涉及功能、接口、构建配置或数据处理逻辑，已先修复测试失败项并完成复测
4. 明确区分两件事：部署脚本只发布站点，**不发信**；按周排期的摘要邮件由 VPS cron 在 `publishedAt` 到点后自动发送（见 6.1）。手动补发或重发才需要单独授权
5. 确认首页「本周档案」没有硬编码期号/标题/导语/highlights；该区块必须由 `content.issues.latest` 驱动
6. 已跑 `npm run review -- db/seed-content/issue-0NN.md db/seed-content-zh/issue-0NN-zh.md`：引用位置与序号（S7/S8）、引用标签首次出现递增、PART 小节数（S9）、标题不得代称（S10）、horizon 小方块、脚注与 `issues.json` 来源台账一致，均无 FAIL / warn

## 三、脚本实际执行的步骤

1. **变更清单**：查询生产库的期号、标题与正文 MD5，和本地 `db/seed-content*` 逐期比对，打印「新增 / 标题改动 / 正文改动」；没有变更就安全退出（这不是发布成功，是“无事可做”）
2. **确认**：交互式终端会列出清单并等你输入 `y`；`--yes` 跳过；launchd/cron 等非交互运行时自动继续
3. 本地运行 `npm run build`
4. 使用 rsync 同步 `dist/` 到 VPS `/opt/cbb/app/app/dist`
5. 同步 `db/seed-content/` 与 `db/seed-content-zh/`（`--only-new` 时只推新期）
6. 在 VPS 运行 `npm run db:seed`，以幂等方式写入内容（`--only-new` 时只写新期，随后把完整内容目录恢复回去但不重新灌库）
7. 修正部署文件属主并执行 `systemctl restart cbb`
8. 在 VPS 本机检查应用 HTTP 200，并确认生产库最大期号达到本地最新期号

### 常用参数

```bash
bash scripts/deploy-release.sh --dry-run      # 只打印变更清单，不构建、不同步、不重启
bash scripts/deploy-release.sh --yes          # 跳过交互确认（自动任务用）
bash scripts/deploy-release.sh --only-new     # 本次只把新期灌库，旧期改动留到下次全量
DEPLOY_FORCE=1 bash scripts/deploy-release.sh # 内容无变更时强制重发（只改了代码/构建时需要）
```

- 每周四 00:05 的 launchd 任务不带参数：变更清单照常打印到 `app/release.log`，确认环节因非交互自动跳过。
- 手动发布时如果想先看清单再决定，用 `--dry-run`，确认后再跑一次不带参数的。

脚本的默认 SSH 目标、密钥和远程目录可由 `DEPLOY_HOST`、`DEPLOY_KEY`、`DEPLOY_REMOTE` 覆盖。除非在排障或内容无变化却需要重发时，不使用 `DEPLOY_FORCE=1`。

**同一期号的更新**（只改标题、封面或正文，期号不变）：变更清单会把它识别为「标题改动 / 正文改动」，照常发布，不需要 `DEPLOY_FORCE`。`DEPLOY_FORCE` 只用于**内容没有任何变化**、但需要重新构建并重启站点的情况（例如只改了前端或 API 代码）。

**只发新期**：`--only-new` 会跳过旧期的标题与正文改动，那些改动留到下一次全量发布生效（清单里会提示有多少项被留下）。

报告时写明这是**强制重发同一期**，不要写成「新一期已发布」。

## 四、成功、跳过与失败的判定

| 结果 | 判定 | 应如何报告 |
|---|---|---|
| 发布成功 | 脚本完成，VPS 返回 HTTP 200，生产库最新期号达到本地最新期号 | 已发布，附期号与两项核验结果 |
| 正常跳过 | 输出 `Skip. No new issue to publish` | 无新一期，未执行发布 |
| 发布失败 | 构建、同步、灌库、重启或 HTTP 核验任一步失败 | 报告失败步骤与原始错误；不要称为已发布 |

**发布后首页核验（每期必做）**：打开 <https://chinabatterybrief.com/>，确认「本周档案」左右两侧为同一期——期号、标题、导语、日期一致；右侧要点、来源数、免费/付费标签与 CTA 均指向最新一期 slug。不一致视为发布未完成，先排查硬编码或接口缓存，修复后重新发布。

## 五、失败处理与回滚

- 网络或 rsync 中断：保留命令输出，排除网络/SSH 问题后从发布脚本重试；不要改用手工同步
- 重启后非 200：脚本会输出 `journalctl -u cbb` 的最近日志。先诊断并修复，再重新运行完整脚本
- 已发布内容需要回退：生产 VPS 保留上一版 `dist/` 与数据库备份；按 `docs/deploy.md` 的回滚说明执行。数据库恢复或覆盖生产文件属于高风险操作，必须先获得用户明确授权

## 六、邮件群发是独立步骤

`npm run email:blast` 会立即向订阅者发送邮件，不属于部署脚本。**手动补发或重发**只有在用户明确要求后才执行，并报告发送结果；按周排期的自动发送由 VPS cron 完成，见 6.1

### 6.1 长期定时群发（VPS cron）

生产环境不保留完整源码，邮件 CLI 由本地构建产出 `dist/send-blast.js`，随每次发版同步到 VPS。VPS 上已配置每周任务：

```cron
0 6 * * 4 /opt/cbb/app/app/scripts/weekly-blast.sh >> /opt/cbb/app/app/email-blast.log 2>&1
```

邮件是**摘要版**：期号与阅读时长、标题、导语、最多 3 条 `highlights`，以及“阅读完整简报”按钮；不发送全文和脚注，读者点进站点阅读。

`weekly-blast.sh` 的安全保护：`flock` 防并发、磁盘低于 512 MB 拒绝执行、只选 `publishedAt` 已到期的最新一期、该期已有成功发送记录则跳过、`nice` 降低优先级并将 Node 堆限制在 128 MB。`DRY_RUN=1` 可只打印决策不发送。

手动补发/测试（在 VPS 的 `/opt/cbb/app/app` 下）：

```bash
node dist/send-blast.js 59 --dry-run   # 渲染但不发信、不写审计
node dist/send-blast.js 59             # 真正发送
```

每次发送结果写入 `email-blast.log` 和数据库 `email_sends` 表。

### 6.2 发送时点与暂停

发送时点由**本期的 `publishedAt`** 决定，不是由发版时间决定：cron 每小时位置固定，但脚本只选 `publishedAt` 已到期的最新一期。因此提前发版不会提前发信，改 `publishedAt` 等于改发送时间。

核对某一期是否已发：

```bash
mysql -u root cbb -N -e "SELECT issueId, kind, status, COUNT(*) FROM email_sends GROUP BY issueId, kind, status ORDER BY issueId DESC LIMIT 5"
tail -n 20 /opt/cbb/app/app/email-blast.log
```

临时暂停或改期：编辑 VPS 的 crontab（`crontab -e`）注释掉 `weekly-blast.sh` 那一行，或把 `publishedAt` 往后调；恢复时改回即可。`DRY_RUN=1 /opt/cbb/app/app/scripts/weekly-blast.sh` 可以在不发送的情况下打印当期决策。

邮件排版示例（免费期 No. 047，中英可切换）：

- https://chinabatterybrief.com/email-preview?lang=zh
- https://chinabatterybrief.com/email-preview?lang=en

示例页也链在关于页底部。
