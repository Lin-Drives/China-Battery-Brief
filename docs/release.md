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
4. 确认本次授权仅限站点发布；邮件群发是另一项外部动作，不能随发布自动执行

## 三、脚本实际执行的步骤

1. 读取本地 `db/seed-content/issues.json` 的最新期号，并查询 VPS 生产库的最大期号
2. 若生产库期号已不小于本地最新期号，安全退出：这是“无新一期，跳过发布”，不是发布成功
3. 本地运行 `npm run build`
4. 使用 rsync 同步 `dist/`、`db/seed-content/` 和 `db/seed-content-zh/` 到 VPS `/opt/cbb/app/app`
5. 在 VPS 运行 `npm run db:seed`，以幂等方式写入本期内容
6. 修正部署文件属主并执行 `systemctl restart cbb`
7. 在 VPS 本机检查应用 HTTP 200，并确认生产库最大期号达到本地最新期号

脚本的默认 SSH 目标、密钥和远程目录可由 `DEPLOY_HOST`、`DEPLOY_KEY`、`DEPLOY_REMOTE` 覆盖。除非在排障或重复发布时有明确理由，不使用 `DEPLOY_FORCE=1` 绕过期号保护。

## 四、成功、跳过与失败的判定

| 结果 | 判定 | 应如何报告 |
|---|---|---|
| 发布成功 | 脚本完成，VPS 返回 HTTP 200，生产库最新期号达到本地最新期号 | 已发布，附期号与两项核验结果 |
| 正常跳过 | 输出 `Skip. No new issue to publish` | 无新一期，未执行发布 |
| 发布失败 | 构建、同步、灌库、重启或 HTTP 核验任一步失败 | 报告失败步骤与原始错误；不要称为已发布 |

## 五、失败处理与回滚

- 网络或 rsync 中断：保留命令输出，排除网络/SSH 问题后从发布脚本重试；不要改用手工同步
- 重启后非 200：脚本会输出 `journalctl -u cbb` 的最近日志。先诊断并修复，再重新运行完整脚本
- 已发布内容需要回退：生产 VPS 保留上一版 `dist/` 与数据库备份；按 `docs/deploy.md` 的回滚说明执行。数据库恢复或覆盖生产文件属于高风险操作，必须先获得用户明确授权

## 六、邮件群发是独立步骤

`npm run email:blast` 会向订阅者发送邮件，不属于部署脚本，也不应随发刊自动运行。只有在用户明确要求发送本期邮件后，才单独执行，并报告发送结果
