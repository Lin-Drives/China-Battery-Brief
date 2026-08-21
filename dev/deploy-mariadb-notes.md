# 部署与 MariaDB 经验备忘

> 2026-08-22 首页 Hero 动态取数上线复盘。VPS 出刊 / 跑 seed / 改 schema 前必读。

## 一、发版（VPS 不能编译，本地构建后推产物）

```bash
# 本地 app/
npm run build && npm run check

# VPS（key ~/.ssh/cbb_vps，root@161.35.120.114）
rsync -az -e "ssh -i ~/.ssh/cbb_vps" dist/ root@.../opt/cbb/app/app/dist/
rsync -az -e "ssh -i ~/.ssh/cbb_vps" api/ db/ root@.../opt/cbb/app/app/
ssh ... 'chown -R www-data:www-data dist; systemctl restart cbb'
```

- 改前端必推 `dist`；改后端/DB 必推 `api/`、`db/`。前端没变时 bundle hash 不变，正常。
- systemd `cbb.service`：`node dist/boot.js`，用户 `www-data`。

## 二、MariaDB 陷阱（与本地 MySQL 8 不同）

1. `drizzle-kit push` 在 MariaDB 静默失败（卡 "Pulling schema" 无报错）→ **改 schema 用 SQL 直改生产库**。
2. `.default([])` 是客户端默认，INSERT 会生成 SQL 关键字 `default`，MariaDB 无真实 DB 默认值就报 `Field 'X' doesn't have a default value` → **删掉 `.default([])`，让 drizzle 显式传值**（`pillars`/`sources` 无 default 一直正常）。
3. 补列 SQL：`ADD COLUMN x longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT '[]'`（`json()` 映射为 longtext + `json_valid` CHECK）。
4. 写 JSON 用 `UPDATE ... SET x='[合法JSON]'`，避开 drizzle INSERT 的 `default` 关键字。

## 三、seed 同步完整性（本次最坑）

- seed 读两套目录：`db/seed-content/`（EN）+ `db/seed-content-zh/`（ZH）。**改 seed 必须整目录 rsync `db/`**，只推一侧会让 `onDuplicateKeyUpdate` 把另一侧写成 NULL，清空已发布数据。

## 四、改 NOT NULL 列必查调用点

加不带 `.default` 的 NOT NULL 列后，所有 `db.insert(issues)` 都要补字段，否则 tsc 报 missing：`db/seed.ts` + `api/admin-router.ts`（`issueInput` 校验 + `issues.create`）。
- 本次加 `highlights`(默认`[]`)/`highlightsZh`(可选)，4 个 tag：`capacity/tech/risk/markets`，`gauge` 可选。

## 五、验证

- 本地：`npm run build` + `npm run check`（tsc）+ lint。
- 公网：首页 200、`ping` 通、`content.issues.latest` 返回 `highlights`+`highlightsZh`、无 `pageerror`。

## 关键路径

- 部署根 `/opt/cbb/app/app/`；产物 `dist/`；env `.env`（`DATABASE_URL`，勿读明文）；VPS key `~/.ssh/cbb_vps`。
