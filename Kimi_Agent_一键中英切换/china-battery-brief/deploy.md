# China Battery Brief — 部署方案（自有 VPS + Nginx 形态）

> 定位：**自托管部署形态的权威方案**。主线（Kimi Agent 平台托管）见根 README；本方案在 git 分支 `deploy/self-hosted` 上开发，敲定并验证后决定是否合并主线。
> 依据：`security.md` 第三节「部署时必复核的三项配置」——XFF 可信性 / HTTPS+HSTS / OAuth 回调白名单。
> 状态：🟡 方案已定，待购买资源（VPS + 域名）后按本文档逐步执行。

---

## 一、选型决策（已定）

| 项 | 选择 | 理由 |
|---|---|---|
| 托管形态 | 自有 VPS + Nginx 反向代理 | 能完整落实 security.md 三项：Nginx 作为可信反代覆盖 XFF、签发 HTTPS/HSTS、可控 OAuth 回调域名 |
| 应用运行 | 单进程 Node（`npm start`，Hono 托管静态 + tRPC） | 现状零改造，本地验证基线一致 |
| 数据库 | VPS 同机安装 MariaDB | 零额外成本、`db:backup` 脚本直接复用、单人维护足够；后续可迁 PlanetScale（代码已对齐 `mode: planetscale`） |
| 域名 | 新购独立域名（如 `chinabatterybrief.com`） | OAuth 回调地址直接绑定最终域名；换域名=换回调需回 Kimi 后台 |
| 部署方式 | 手动部署 + systemd 常驻 + cron 备份（先不接 CI/CD） | 冷启动阶段单人可控；CI/CD 留到队列 E |

**不选**：PaaS（XFF/HSTS 受平台控制）、云 RDS（过度配置）、PlanetScale 起步（有按量费用，先同机省成本）。

---

## 二、资源清单（待购买）

### 2.1 VPS（选一个）

| 提供商 | 起步配置 | 月费 | 备注 |
|---|---|---|---|
| **DigitalOcean**（推荐） | 1 vCPU / 1GB RAM / 25GB SSD | ~$6 | 老牌、文档全、新加坡/美西机房近读者 |
| Vultr | 1 vCPU / 1GB / 25GB | ~$5–6 | 最便宜入门档 |
| Hetzner | 2 vCPU / 4GB / 40GB | ~€4–5 | 欧洲机房，性价比高 |

购买要点：
- 系统镜像选 **Ubuntu 24.04 LTS**
- 机房选离目标读者近的：**新加坡**（亚太）或**美西**（欧美读者）
- 创建时**记下 root 密码 / 或配置 SSH key**
- 不要买额外带宽/快照（后续可加）

### 2.2 域名

- 注册商：**Cloudflare Registrar**（成本价，约 $10–15/年）或 Namecheap
- 域名建议：`chinabatterybrief.com`（先查可用性）
- 注册后 DNS 托管到 **Cloudflare**（免费 CDN + WAF + 自动 TLS 证书，后面三件套能省一半功夫）

---

## 三、部署步骤（购买资源后执行）

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
cd app

# 生产环境变量（照抄本地 app/.env 结构，改这三处）
#   DATABASE_URL = 指向本机 MariaDB（见 Step 3）
#   APP_SECRET   = 重新生成 ≥32 字符（不要复用本地！）
#   OWNER_UNION_ID = 你的 Union ID（首个登录成为 admin）
# 复制模板开始编辑：
cp .env.example .env && vim .env

# 安装依赖 + 构建
npm ci
npm run build
```

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

`.env` 的 `DATABASE_URL` 填：
```
DATABASE_URL=mysql://cbb:<强密码>@localhost:3306/cbb
```

建表 + 灌种子（首次）：
```bash
cd /opt/cbb/app
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
WorkingDirectory=/opt/cbb/app
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

```bash
# 每天 03:00 自动备份数据库 + 静态资源快照
0 3 * * * cd /opt/cbb/app && /usr/bin/npm run db:backup >> /opt/cbb/app/backup.log 2>&1
```

### Step 8 — OAuth 回调白名单（对应 security.md 第三节第 3 条）

1. 在 Kimi OAuth 应用后台，把回调/重定向地址更新为 `https://chinabatterybrief.com/api/oauth/callback`
2. 确认 `.env` 里 `KIMI_AUTH_URL` 指向 Kimi 授权服务器
3. 回归验证：清 cookie → 点「Sign in with Kimi」→ 授权 → 跳回首页 → 首登者成为 admin

---

## 四、安全三项核对清单（部署后必过）

| # | 项 | 核对方法 | 期望结果 |
|---|---|---|---|
| 1 | XFF 可信性 | Nginx 配置 `set_real_ip_from` + `real_ip_recursive`；请求日志 `ip` 字段显示真实访客 IP | 伪造 XFF 无法改变限流/审计所见 IP |
| 2 | HTTPS/HSTS | `curl -I https://<domain>` | 看到 `Strict-Transport-Security` + 应用 CSP |
| 3 | OAuth 回调 | 全流程登录回归 | 授权后能跳回首页，会话建立 |

---

## 五、迁移计划（本地 → 生产）

1. **数据**：`npm run db:backup` 在本地出 `.sql.gz`，scp 到 VPS 后 `npm run db:restore -- <file>` 灌入（或直接 `db:seed` 重灌种子）。
2. **内容**：issues/factories/policy 以种子为基线；发刊走 admin 台（生产库直接写入）。
3. **扫描定时任务**：本机 launchd 继续跑（数据在本机 MySQL）；如需在生产侧跑，把 `scan/` 与 MariaDB 迁移后改 systemd timer。
4. **验证**：`npm run build && npm start` 生产基线 → curl 首页 200 + tRPC ping 通 → 登录全流程。

---

## 六、回滚 / 双轨运行

- **主线不变**：`main` 分支保持 Kimi Agent 平台托管，本方案全部在 `deploy/self-hosted` 分支开发验证。
- 验证通过后，合并回主线或保留为独立交付形态（二选一，届时决定）。
- 回滚：生产 VPS 上保留上一次 `dist/` 与数据库备份，`npm run db:restore` + 重启即回退。

---

## 七、费用预估（月度）

| 项 | 月费 |
|---|---|
| VPS（DigitalOcean 入门） | ~$6 |
| 域名（Cloudflare Registrar） | ~$1（年付 $10–15 均摊） |
| TLS 证书 | $0（Let's Encrypt / Cloudflare） |
| MariaDB | $0（同机） |
| **合计** | **~$7/月** |

---

## 八、待办清单（本文档外部）

- [ ] 购买 VPS（DigitalOcean/Vultr/Hetzner）+ 记下 IP/root 凭据
- [ ] 购买域名 + 迁 Cloudflare DNS
- [ ] 按 Step 0–8 逐步执行
- [ ] 完成安全三项核对清单
- [ ] 决策：验证后分支合并 or 双轨保留
