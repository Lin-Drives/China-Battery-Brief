# 安全架构与应急手册（Security & Incident Response）

> 对应根目录 TODO「安全设计前置」。面向公网部署前/后，写给**不一定熟悉安全术语**的维护者：每个概念都会先用大白话解释，再给操作步骤。术语保留英文以便检索。

---

## 〇、先认识几个词（新手速查）

| 术语 | 大白话 | 出现在哪 |
|---|---|---|
| **CSRF** | 「借刀杀人」：攻击者骗你的浏览器去访问你已登录的网站，替你执行操作。防护核心：让浏览器跨站发请求时**不带你的登录凭证**，或校验请求来源 | `SameSite=Lax`、`csrf.ts` |
| **SameSite** | Cookie 的一个开关：跨站请求带不带它。`Lax` = 仅同站 + 顶层跳转才带，够用且安全 | `cookies.ts` |
| **CSP（内容安全策略）** | 告诉浏览器「页面只允许加载哪些来源的脚本/图片/字体」，防止别人往你页面里塞代码 | `security-headers.ts` |
| **限流（Rate Limit）** | 一个 IP 一分钟最多访问 N 次，超出返回 429，防爆破/刷库/爬虫 | `rate-limit.ts` |
| **X-Forwarded-For（XFF）** | HTTP 头，代理链上记录「真实访客 IP」。**只有可信代理写入才可信** | `rate-limit.ts`、`ip-context.ts` |
| **JWT** | 一种「盖章的通行证」字符串，服务器验证签名即认账，本身不存服务器端 | `kimi/session.ts` |
| **审计（Audit）** | 敏感操作永久留痕：谁、何时、从哪、做了什么，事后可查可追责 | `audit_logs` 表、`audit.ts` |
| **HSTS** | 告诉浏览器「以后只准用 HTTPS 访问本站」，防止降级成明文 HTTP | `security-headers.ts` |
| **Origin 校验** | 看请求头里的「来源网址」和「本站网址」是否一致，不一致就拒绝（防 CSRF） | `csrf.ts` |

---

## 一、威胁模型

**我们要防什么**（按现实可能排序）：

- **自动扫描**：公网最常见的攻击。机器人到处试探 `/admin`、`/.env`、`/wp-login.php` 这类路径，找配置泄漏和弱口令。
- **爆破/刷接口**：反复试登录、狂刷订阅邮箱表单，打爆你的认证接口或数据库。
- **数据泄漏**：数据库被拖、接口被绕过权限把用户/订阅数据拿走。
- **CSRF/会话劫持**：拿到或借用到他人已登录的会话去干坏事。
- **爬虫搬运**：把付费内容抓走（内容类网站的慢性失血）。

**特别提示**：本项目优先防范来自**中国大陆以外**的攻击来源——它们多为上述「自动扫描 + 伪造 XFF」组合。因此加固专门设计了三条针对措施：**隐藏文件拦截**（路径探测直接 404）、**限流**（频率控制）、**Origin 校验**（拒假来源）。

---

## 二、已落地措施（对照 TODO：认证/密钥/限流/审计/备份/应急）

> 这一节只是索引，想知道「为什么」「怎么调」，去第四、五节。每行都写了对应代码文件，方便对照。

| 模块 | 措施 | 位置 |
|---|---|---|
| 认证 | 会话 Cookie `httpOnly` + `SameSite=Lax` + `Secure`（非本地），杜绝跨站携带凭证 | `api/lib/cookies.ts` |
| 认证 | OAuth 授权链接由后端签发：`GET /api/oauth/begin` 生成一次性 state nonce，回调时消费校验，并核对 `redirect_uri` 与访问 Host 一致（防登录 CSRF 与回调地址被篡改） | `api/kimi/auth.ts`、`api/kimi/state.ts` |
| 认证 | 客户端真实 IP 由 Hono 层解析后注入 tRPC 请求（`api/lib/ip-context.ts`），审计 `ip` 字段与订阅限流都依赖它，无法靠伪造请求头冒充 | `api/lib/ip-context.ts`、`api/boot.ts` |
| 密钥 | 生产环境强制 `APP_SECRET ≥ 32 字符`；启动时校验必需密钥最短长度，缺了直接拒绝启动 | `api/lib/env.ts` |
| 限流 | 内存固定窗口限流，按 IP：`/api/trpc` 600/min、OAuth begin 30/min、callback 20/min、`subscribe.email` 5/min；超限返回 429 并带 `Retry-After` | `api/lib/rate-limit.ts`、`boot.ts`、`content-router.ts` |
| 响应头 | `X-Content-Type-Options`/`X-Frame-Options`/`Referrer-Policy`/`Permissions-Policy`；生产加 CSP 与 HSTS；API 响应 `Cache-Control: no-store` | `api/lib/security-headers.ts` |
| CSRF | 对状态变更方法（POST/PUT/PATCH/DELETE）校验 Origin 与 Host 一致，不一致直接 403 | `api/lib/csrf.ts` |
| 载荷 | 请求体上限 `bodyLimit` 50MB → 2MB，防大包撑爆内存 | `api/boot.ts` |
| 日志 | 结构化请求日志**只记 pathname 不记 query**（OAuth 的 `code`/`state` 永不落日志）；生产环境把非预期的内部错误替换为通用文案，不外泄报错细节 | `api/lib/request-log.ts`、`api/middleware.ts` |
| 静态安全 | 静态目录下**任何以 `.` 或 `_` 开头的路径段**一律 404（`/.env`、`/.git/config`、`/_app`、`/_next` 等扫描目标全被拦） | `api/lib/vite.ts` |
| 审计 | `audit_logs` 表 + stdout 双写：admin 增删改、登录成功/失败；写库失败自动降级为只打日志、不影响请求 | `api/lib/audit.ts`、`admin-router.ts`、`kimi/auth.ts` |
| 备份 | `npm run db:backup`：mysqldump 一致性快照 + assets 打包 + 自动保留最近 N 份 | `scripts/backup.sh` |

---

## 三、部署时必复核的三项配置（部署方案未定时先搁置）

> 这三项和「你最终用什么域名/服务器/CDN」绑定。部署敲定后逐项核对；在此之前**不影响**本地与内网使用。

1. **X-Forwarded-For 可信性**（最重要）
   限流和审计都靠 XFF 的第一个 IP 认人。前提是它由**你信得过的反向代理**（Nginx / Cloudflare / 平台网关）写入，并且代理会**覆盖**而非追加客户端传来的 XFF。
   - 核对方法：在代理配置里确认 `X-Forwarded-For` 由代理生成、并清空客户端自带值。
   - 如果不做：攻击者每换一个 XFF 值就能绕开限流、污染审计里的 IP。

2. **HTTPS / HSTS**
   HSTS 头只在请求走 HTTPS（`x-forwarded-proto: https`）时才下发，纯 HTTP 阶段不会误发。证书/平台 TLS 就绪后，用 `curl -I` 看到 `Strict-Transport-Security` 即生效；稳定运行后再考虑加进 HSTS preload。

3. **OAuth 回调地址**
   `/api/oauth/begin` 按「访问 Host」拼出回调地址。**换域名 = 换回调地址**，必须同步去 Kimi OAuth 应用后台更新 redirect 白名单，并回归「点登录 → 授权 → 跳回首页」全流程。

---

## 四、运维手册

### 4.1 备份（建议每天跑）
```bash
cd app
npm run db:backup
# 成功输出示例：
# Backup written: .../backups/db/cbb-db-20260815-090000.sql.gz (64K)
# Assets snapshot: .../backups/db/cbb-assets-20260815-090000.tar.gz
```
- 保留份数：环境变量 `BACKUP_RETENTION`（默认 14，即保留最近 14 份）
- 输出目录：`BACKUP_ROOT`（默认 `../backups/db`）
- 上线后建议用 cron 每天自动跑一次，例如：
  ```bash
  0 3 * * * cd /path/to/app && /usr/bin/npm run db:backup
  ```
- 备份目录已 git 忽略，**不要把备份提交进代码仓库**。

### 4.2 恢复（危险操作，会覆盖当前库）
```bash
cd app
npm run db:restore -- ../backups/db/cbb-db-20260815-090000.sql.gz
```

### 4.3 密钥轮换（APP_SECRET / Kimi OAuth secret）
1. 在 Kimi OAuth 应用后台生成新 secret，更新 `app/.env` 的 `APP_SECRET`（≥32 字符）。
2. 重启服务。**所有已登录会话立即失效**，用户需重新登录——这是预期行为，不是故障。
3. 确认审计表里有新的 `auth.login` 记录后，再废弃旧 secret。

### 4.4 API Key 撤销（Desk 档）
- 用户自助：`/account` → API Keys → 删除。
- 管理员兜底：直接删 `api_keys` 表里对应行即可。库里只存哈希，反推不出明文，删除即永久失效。

### 4.5 限流调整
阈值集中在两个文件：`boot.ts`（全局 / begin / callback）与 `content-router.ts`（subscribe.email）。
调高之前先看 429 出现频率与来源 IP，确认是「真用户被误伤」而非「攻击在刷」，再动手。

### 4.6 审计复核
```sql
SELECT action, actorName, ip, createdAt, meta
FROM audit_logs ORDER BY id DESC LIMIT 50;
```
重点盯两件事：
- `auth.login_failed` 突然变多 → 可能有人在爆破
- `admin.*` 操作出现**非你本人**的 actorName / 陌生 IP → 优先排查，这比普通日志更紧急

### 4.7 IP 封禁
限流只做「频率控制」，**真正的封禁在网关/CDN 层**（Nginx `deny`、Cloudflare Firewall 等）。拿审计和请求日志里的 `ip` 字段去封禁即可。

---

## 五、应急响应流程（Runbook）

> 出事了按顺序走，别跳步。每一步都有具体产出。

1. **发现**：监控三个信号——429 突增、`audit_logs` 异常、日志里出现非预期来源 IP。
2. **隔离**：先在 CDN/网关封禁可疑 IP 段（快速止血）；必要时停服（`npm stop` 或平台侧停容器）。
3. **取证**：导出时间窗内的审计 + 请求日志存档；检查有没有未授权的 `/api/trpc` 写操作、admin 操作时间是否与真实人员操作对得上。
4. **止损**：轮换 `APP_SECRET`（让全部会话失效）；如确认账号泄漏，通知受影响用户重新登录，并核查订阅/支付记录。
5. **恢复**：数据如有损坏，用最近的 `npm run db:restore` 恢复。
6. **复盘**：定位攻击入口，回到第二节补对应措施，并把本次经过写进本文档。

---

## 六、已知限制（诚实清单）

> 设计上明确的取舍，先知道，别等到踩坑才发现。

- **限流是内存实现**：单实例有效；将来横向扩成多实例时，每台机器计数各自独立、限流会失效，需换成 Redis 等共享存储或网关限流。
- **XFF 依赖可信代理**：见第三节第 1 条，部署时务必落实。
- **`db:migrate` 在本项目会挂起**：库结构变更一律用 `npm run db:push`（纯增量、无风险）。
- **HSTS/CSP 只在 `isProduction` 生效**：本地开发不受影响、不做验证。
- **会话是 1 年期 JWT**：无法在服务端单独让某一个会话失效（除非轮换 secret 全体失效）。若将来需要「踢人下线」，引入 session 版本号或 DB 会话表即可。
- **支付/邮件为模拟或未实现**：接真实第三方后，需补「第三方凭证管理」和「回调验签」两节。
