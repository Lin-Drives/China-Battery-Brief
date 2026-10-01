# China Battery Brief — 部署方案（自有 VPS + Nginx）

> 定位：**自托管部署形态的权威方案**，已作为主线 `main` 上线运行（https://chinabatterybrief.com）。
> 依据：`security.md` 第三节「部署时必复核的三项配置」——XFF 可信性 / HTTPS+HSTS / 应用内配置。

---

## 一、选型

| 项 | 选择 | 理由 |
|---|---|---|
| 托管形态 | 自有 VPS + Nginx 反向代理 | 完整落实 security.md 三项：可信反代覆盖 XFF、签发 HTTPS/HSTS |
| 应用运行 | 单进程 Node（`npm start`，Hono 托管静态 + tRPC） | 现状零改造，本地验证基线一致 |
| 数据库 | VPS 同机 MariaDB | 零额外成本、`db:backup` 脚本直接复用、单人维护足够；后续可迁 PlanetScale（代码已对齐 `mode: planetscale`） |
| 域名 | 独立域名 + Cloudflare DNS | 免费 CDN + WAF + 自动 TLS，省去一半配置 |
| 认证 | 平台内置邮箱+密码，JWT session cookie；首个用 `OWNER_EMAIL` 注册者自动成为 admin | 无外部 OAuth 依赖 |
| 部署方式 | 手动部署 + systemd 常驻 + cron 备份 | 单人可控；发版由 `deploy-release.sh` 自动完成 |

**不选**：PaaS（XFF/HSTS 受平台控制）、云 RDS（过度配置）、PlanetScale 起步（有按量费用）。

---

## 二、部署步骤

> 以下每步都是独立命令块。执行到一步，确认无错再下一步。所有命令在 VPS 上以 root 或 sudo 执行。

### Step 0 — 基础准备

```bash
# 更新系统
apt update && apt upgrade -y
# 安装基础工具
apt install -y curl git build-essential nginx mariadb-server certbot python3-certbot-nginx ufw
# 安装 Node 20 LTS（用官方源）
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
# 防火墙：只开 22/80/443
ufw allow OpenSSH && ufw allow 'Nginx Full' && ufw enable
```

### Step 1 — DNS 指向 VPS

在 Cloudflare 控制台把域名 A 记录指向 VPS 公网 IP：

```
类型 A    名称 @     内容 <VPS IP>    代理状态 Proxied（橙云）
类型 A    名称 www   内容 <VPS IP>    代理状态 Proxied
```

（Proxied = 走 Cloudflare CDN，自动获得 TLS 证书，且 Nginx 只对 Cloudflare 开放，更安全。）

### Step 2 — 部署代码 + 配置环境

```bash
# 在 VPS 建部署目录
mkdir -p /opt/cbb && cd /opt/cbb
git clone <你的私有仓库> app
cd app/app

# 生产环境变量（`.env.example` 被 gitignore，不随仓库走；直接在 app/ 下手写 `.env`）
cat > .env <<'EOF'
DATABASE_URL=mysql://cbb:<强密码>@localhost:3306/cbb
APP_SECRET=<≥32 字符随机串>
OWNER_EMAIL=<管理员邮箱>
EOF

# 安装依赖 + 构建
npm ci
npm run build
```

> 说明：仓库根 `/opt/cbb/app` 下是 `app/`（npm 项目）、`docs/`、`dev/` 等；所有构建/运行命令都在 `/opt/cbb/app/app/` 内执行。
>
> 认证说明：`APP_SECRET` 为 JWT 签名密钥，生产必填且 ≥32 字符（否则拒绝启动）；`OWNER_EMAIL` 指定的邮箱首次注册后自动成为 admin。

### Step 3 — 初始化数据库

```bash
# 启动并加固 MariaDB
systemctl enable --now mariadb
mysql_secure_installation   # 设 root 密码、删匿名用户、禁 root 远程

# 建库建用户（只给应用最小权限）
mysql -u root -p <<'SQL'
CREATE DATABASE cbb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'cbb'@'localhost' IDENTIFIED BY '<强密码>';
GRANT ALL PRIVILEGES ON cbb.* TO 'cbb'@'localhost';
FLUSH PRIVILEGES;
SQL
```

建表 + 灌种子（首次）：
```bash
cd /opt/cbb/app/app
# 库结构直接推（本项目用 db:push，不用 migrate）
npx drizzle-kit push
# 灌种子内容（English + 中文）
npm run db:seed
```

> 注意：`scripts/backup.sh` 默认找 `../.local-mysql/mysql/bin` 的 mysqldump。VPS 上要改成系统自带的，加环境变量：
> ```
> MYSQL_BIN=/usr/bin
> BACKUP_ROOT=/opt/cbb/backups
> ```

### Step 4 — Nginx 反向代理（落实 XFF + HTTPS）

新建 `/etc/nginx/sites-available/cbb`：

```nginx
# Cloudflare 是唯一可信来源：XFF 必须覆盖客户端传入值，防止伪造 IP 绕限流
set_real_ip_from 173.245.48.0/20;   # Cloudflare 官方 IP 段（以 CF 文档为准，需定期更新）
# ... 完整 Cloudflare IP 列表见 https://www.cloudflare.com/ips/
real_ip_header X-Forwarded-For;
real_ip_recursive on;

server {
    listen 80;
    server_name chinabatterybrief.com www.chinabatterybrief.com;
    # 下面由 certbot 自动补 443 与证书
}
```

关键安全配置点（对应 security.md 第三节）：
1. **XFF 可信性**：`set_real_ip_from` 只信任 Cloudflare IP 段 + `real_ip_recursive on`，Nginx 重写 XFF 头，应用只认第一跳 IP。**不做 = 攻击者换 XFF 值绕限流。**
2. **HTTPS/HSTS**：证书签发后（Step 5），在 Nginx 里确认 `Strict-Transport-Security` 头生效；`x-forwarded-proto: https` 时应用才会下发 HSTS（见 `api/lib/security-headers.ts`）。
3. **代理转发头**：给 `api/boot.ts` 正确转发 `X-Forwarded-For / X-Forwarded-Proto`，否则应用感知不到 HTTPS 与真实 IP。

启用：
```bash
ln -s /etc/nginx/sites-available/cbb /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

### Step 5 — 免费 HTTPS 证书（Let's Encrypt via Cloudflare）

方式 A（走 Cloudflare，推荐，自动续期）：
- Cloudflare 开启「Always Use HTTPS」+ 自动 TLS 证书即可，Nginx 侧用 443 直连 CF。

方式 B（不套 CDN，直连 VPS）：
```bash
certbot --nginx -d chinabatterybrief.com -d www.chinabatterybrief.com
# certbot 自动改 Nginx 配置 + 加 HSTS，证书 90 天自动续期（systemd timer）
```

验证：
```bash
curl -I https://chinabatterybrief.com
# 期望看到：HTTP/2 200、Strict-Transport-Security、以及应用的 CSP 头
```

### Step 6 — 应用常驻（systemd）

新建 `/etc/systemd/system/cbb.service`：

```ini
[Unit]
Description=China Battery Brief
After=network.target mariadb.service

[Service]
WorkingDirectory=/opt/cbb/app/app
Environment=NODE_ENV=production
ExecStart=/usr/bin/node dist/boot.js
Restart=always
RestartSec=5
User=www-data
# 密钥校验：生产环境 APP_SECRET <32 字符会拒绝启动（api/lib/env.ts）

[Install]
WantedBy=multi-user.target
```

```bash
systemctl enable --now cbb
systemctl status cbb          # active (running)
curl -I http://127.0.0.1:3000 # 应用在本机 3000 端口
```

### Step 7 — 备份 cron（落实 security.md 4.1）

> cron 走系统时区 UTC。**北京时间凌晨 3:00 = UTC 19:00**，下述任务因此写 `0 19 * * *`。VPS 上应用路径为 `/opt/cbb/app/app`。
>
> 保留策略（`scripts/backup.sh`）：DB dump 默认保留最近 7 份（`BACKUP_RETENTION`），assets 快照默认保留最近 3 份（`ASSET_RETENTION`，可从 git 重建，短保留）。assets 快照 ~30MB/份，是 VPS 磁盘的主要消耗，**必须靠该保留策略封顶**。

```bash
# 每天 03:00（北京时间）自动备份数据库 + 静态资源快照（自动清理旧档）
0 19 * * * cd /opt/cbb/app/app && /usr/bin/npm run db:backup >> /opt/cbb/app/app/backup.log 2>&1
```

**双轨之二——本地异地归档**（VPS 整机报废时的最后保险）：开发机 launchd 每天 21:00（北京时间）拉取 VPS 最新备份到本地 `backups/pull/`，保留最近 90 天（`PULL_RETENTION_DAYS`）。

```bash
# 开发机上执行一次（首次安装）：
plutil -lint ~/Library/LaunchAgents/com.cbb.pull-backup.plist
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.cbb.pull-backup.plist
launchctl kickstart -k gui/$(id -u)/com.cbb.pull-backup   # 立即跑一次验证
# 手动拉取：cd app && bash scripts/pull-backup.sh
```

> 注意：本地 launchd 计划任务在机器睡眠时会顺延到唤醒后补跑，不保证每天准点；漏拉几天没关系，VPS 轨兜底 7 天窗口。拉取依赖 `~/.ssh/cbb_vps` 免密与 VPS 在线。

---

## 三、安全三项核对清单（部署后必过）

| # | 项 | 核对方法 | 期望结果 |
|---|---|---|---|
| 1 | XFF 可信性 | Nginx 配置 `set_real_ip_from` + `real_ip_recursive`；请求日志 `ip` 字段显示真实访客 IP | 伪造 XFF 无法改变限流/审计所见 IP |
| 2 | HTTPS/HSTS | `curl -I https://<domain>` | 看到 `Strict-Transport-Security` + 应用 CSP |
| 3 | 认证 | 配置 `APP_SECRET` 与 `OWNER_EMAIL`，回归注册/登录全流程 | 认证可用；owner 邮箱账号为 admin |

---

## 四、迁移计划（本地 → 生产）

1. **数据**：`npm run db:backup` 在本地出 `.sql.gz`，scp 到 VPS 后 `npm run db:restore -- <file>` 灌入（或直接 `db:seed` 重灌种子）。
2. **内容**：issues/factories/policy 以种子为基线；日常发刊按 `docs/release.md` 的发布脚本执行，不手工同步或直接修改生产库。
3. **扫描定时任务**：本机 launchd 继续跑（数据在本机 MySQL）；如需在生产侧跑，把 `scan/` 与 MariaDB 迁移后改 systemd timer。
4. **验证**：`npm run build && npm start` 生产基线 → curl 首页 200 + tRPC ping 通 → 未订阅账号访问期刊只得截断内容、订阅/admin 全量可读。
