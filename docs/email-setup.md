# 邮件发信配置手册（傻瓜版）

> 适用场景：网站已经上线，想让“订阅确认 / 欢迎信 / 每周群发”真正发到收件箱。
> 不配置也能开发和演示：程序会进入 **log-mode**，只把确认链接打印到服务器日志，不发送邮件。
> 相关代码：`app/api/lib/mailer.ts`、`app/api/lib/subscribe.ts`、`app/api/lib/newsletter.ts`。

---

## 一、先理解三样东西

| 东西 | 作用 | 谁来配 |
|---|---|---|
| SMTP 服务商 | 真正替你发邮件的服务，给你账号密码（SMTP 凭据） | 你注册一个账号 |
| Cloudflare DNS | 告诉收件方“这个服务有权代表你的域名发信” | 你在 Cloudflare 粘贴几条记录 |
| VPS `.env` | 把凭据交给网站程序 | 你在服务器填几行并重启 |

三者缺一不可。Cloudflare 和 VPS 本身不发邮件。

---

## 二、选一个 SMTP 服务商

推荐 **Resend**：有免费额度、注册不需要信用卡、后台会给现成的 DNS 记录和 SMTP 参数。

备选：Postmark（审核较严）、Amazon SES（便宜但配置复杂）、Mailgun / SendGrid。

以下以 Resend 为例，其他服务商流程相同，只是后台长相不同。

---

## 三、步骤 1：注册并验证发信域名

1. 打开 <https://resend.com> 注册账号。
2. 进入 **Domains → Add Domain**，填写你的域名 `chinabatterybrief.com`。
3. Resend 会列出几条 DNS 记录（通常包括 SPF 与 DKIM；DMARC 建议另加一条 TXT，内容用 `v=DMARC1; p=none; rua=mailto:你的邮箱`）。
4. 保持这个页面开着，下一步去 Cloudflare 粘贴。

---

## 四、步骤 2：在 Cloudflare 添加 DNS 记录

1. 登录 Cloudflare，选中 `chinabatterybrief.com`。
2. 进入 **DNS → Records → Add record**。
3. 按 Resend 页面给的“名称 / 类型 / 内容”逐条添加，**一字不改**。
4. 关键：这些记录如果是 CNAME，代理状态必须选 **DNS only（灰色云朵）**。发信不走网页代理，开了橙云会验证失败。
5. 全部添加后回到 Resend，点 **Verify**，等状态变成 Verified（通常几分钟，最长 24 小时）。

> 不要修改现有的网站 A 记录。若需要 `hello@chinabatterybrief.com` 收信而开启 Cloudflare Email Routing，可以与 Resend 发信共存：MX 只影响收信，不影响 Resend 发信；但必须把 Resend 的 SPF 与 Cloudflare 的 SPF **合并成一条 TXT**（同一条记录里 include 两个服务），不能让域名同时存在两条 SPF。

---

## 五、步骤 3：在 VPS 填配置

SSH 登录 VPS，编辑网站的环境变量文件：

```bash
cd /opt/cbb/app/app
nano .env
```

在文件末尾补上（把尖括号内容换成 Resend 给你的值）：

```dotenv
# 站点对外地址：确认/退订链接会用它拼接，必须是对外可访问的 https 域名
PUBLIC_BASE_URL=https://chinabatterybrief.com

# 推荐：Resend HTTP API（走 443，不受 VPS 封锁 SMTP 端口影响）
RESEND_API_KEY=<Resend 后台的 API Key，以 re_ 开头>

# 发件人：必须是你在 Resend 验证过的域名
MAIL_FROM=brief@chinabatterybrief.com
MAIL_FROM_NAME=China Battery Brief
```

> 如果 VPS 允许出站 SMTP（25/465/587），也可以不用 `RESEND_API_KEY`，改用
> `SMTP_HOST=smtp.resend.com`、`SMTP_PORT=465`、`SMTP_SECURE=true`、
> `SMTP_USER=resend`、`SMTP_PASS=<同一个 API Key>`。两种方式二选一。
> DigitalOcean 等云厂商常默认封锁 SMTP 端口，此时必须用 `RESEND_API_KEY`。

保存后重启服务：

```bash
systemctl restart cbb
systemctl status cbb --no-pager
```

> `PUBLIC_BASE_URL` 漏配会让确认链接指向 `localhost`，用户点了必然失败。
> 不要把 `.env` 提交到 Git，也不要把 API Key / `SMTP_PASS` 发到聊天或截图里。

---

## 六、步骤 4：验证

在 VPS 的项目目录执行（若该版本仓库包含 `scripts/send-test.ts`）：

```bash
cd /opt/cbb/app/app
npm run email:test -- 你的邮箱@example.com
```

也可以直接用网站验证：到任意订阅框用自己的邮箱走一遍。

1. 提交邮箱 → 应收到“确认你的邮箱”邮件。
2. 点击确认 → 应收到“欢迎加入”邮件。
3. 点击页脚“取消订阅” → 状态应变为已退订。

管理台 `/account` 的邮件台也可以发测试邮件，并选择 EN / ZH。

---

## 七、常见问题

| 现象 | 原因与处理 |
|---|---|
| 测试邮件显示“log-mode（未发送）” | `.env` 里 SMTP 没配全，或 `MAIL_DISABLED=1`。补全 `SMTP_HOST/USER/PASS` 后重启。 |
| 确认链接是 `localhost` | `PUBLIC_BASE_URL` 没配或写错。改成 `https://chinabatterybrief.com` 后重启。 |
| 邮件进了垃圾箱 | DNS 记录还没验证完，或 DMARC 未生效。等 Resend 显示 Verified，必要时从 `p=none` 开始观察。 |
| 发信超时 | VPS 封锁了 SMTP 端口（DO 常封 25/465/587）。改用 `RESEND_API_KEY` 走 HTTPS API，不要继续调 SMTP 端口。 |
| Resend 验证域名失败 | Cloudflare 里对应的 CNAME 开了橙云代理。改成 DNS only。 |
| 改完配置仍不生效 | 忘了 `systemctl restart cbb`。 |

---

## 八、上线前检查清单

- [ ] Resend 域名状态为 Verified
- [ ] Cloudflare 中 SPF / DKIM / DMARC 记录齐全，且为 DNS only
- [ ] VPS `.env` 含 `PUBLIC_BASE_URL` 与全部 `SMTP_*`
- [ ] `systemctl restart cbb` 后服务正常
- [ ] `npm run email:test` 收到中英文测试邮件
- [ ] 用真实邮箱完整走一遍订阅 → 确认 → 退订
- [ ] `.env` 未被提交到 Git
