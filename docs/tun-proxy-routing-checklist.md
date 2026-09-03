# TUN 代理分流调整 — 排障记录

> 目的：保持 TUN 模式常开，同时能正常操作自有 VPS / GitHub，并能正常使用 AI 对话工具。
> 背景：此前诊断确认「端口通但 SSH banner 永不返回 / ipify 被解析成 198.18.0.80 / github 超时」，
> 根因是代理的 TUN + Fake-IP 分流规则把本应直连的对象喂进了代理/黑洞，而非 VPS 或网络本身故障。
> 关掉 TUN 后一切恢复正常，故只需修 TUN 的**分段路由规则**即可两全。

---

## 一、现象回顾（诊断结论）

| 探测 | 异常表现 | 正常时应为 |
|---|---|---|
| 到 VPS `161.35.120.114` 的 TCP 22/443/3306 | 0ms「OPEN」但 banner 永不返回 | 收到 `SSH-2.0` banner |
| `api.ipify.org` | 被解析为 `198.18.0.80`（Fake-IP 保留段） | 真实公网 IP（如 `172.67.74.152`） |
| GitHub | 超时 000 | 200 |
| Google | 200 | 200 |
| 关闭 TUN 后 | 全部恢复正常、banner OK、网站 200 | —— |

结论：**TUN 模式本身没问题，是其分流规则不全 / fallback 策略不当 / Fake-IP 未对真实 IP 还原**，
导致应当直连的 VPS 与 GitHub 被劫持进不放行的代理通道而黑洞。

---

## 二、待确认信息（已核清）

1. **使用的客户端**：Clash 系代理客户端（下文通用「代理客户端」）。
2. **配置所在**：Clash 类客户端的 profile 目录（因涉及具体路径/订阅文件名，一律以「配置文件」代称，不记录具体路径）。
3. **当前分流策略**（已确认）：
   - 有 `rules:` 段，走规则模式（rule）
   - 启用了 `fake-ip`（`dns.enhanced-mode: fake-ip`）
   - 兜底规则为 `MATCH`，指向代理出口组

---

## 三、待加入的直连规则（示例，按客户端语法微调）

> 关键点：`no-resolve` 让真实 IP 直连不走代理 DNS；这些规则要放在 `rules:` 列表**最前**（先到先得），否则会被后面的兜底规则抢先。

```yaml
rules:
  # 自己的 VPS —— 按真实 IP 直连，避免走代理黑洞
  - IP-CIDR,161.35.120.114/32,DIRECT,no-resolve
  # 需要直连的域名，避免 Fake-IP 吞掉
  - DOMAIN-SUFFIX,api.ipify.org,DIRECT
  - DOMAIN-SUFFIX,github.com,DIRECT
  - DOMAIN-SUFFIX,githubusercontent.com,DIRECT
  - DOMAIN-SUFFIX,objects.githubusercontent.com,DIRECT
  ...（原有规则继续）
```

- **Fake-IP 规避**：如开启 `fake-ip`，对需直连域名可考虑关闭其 Fake-IP 或加入 `fake-ip-filter` 白名单，让真实 IP 直连。
- **fallback**：确认无匹配时的默认走向（建议 `DIRECT` 或一个可用节点，避免黑洞）。

---

## 四、VPS 直连规则（已生效）

> 最终结论：**规则已落地并通过代理内核权威验证。**

- **生效位置**：当前激活的代理订阅配置文件 → `rules:` 段**第一行**（具体订阅文件因涉及个人订阅信息，此处以「订阅配置文件」代称）。
- **规则内容**：`- IP-CIDR,161.35.120.114/32,DIRECT,no-resolve`
- **验证结果**（查代理内核 rules 接口）：
  ```
  {"type":"IPCIDR","payload":"161.35.120.114/32","proxy":"DIRECT","size":-1}
  ```
  - ✅ VPS IP 命中 `IPCIDR → DIRECT`，直接走直连，不再进代理。
  - ✅ 规则排在 `category-ads-all`、`MATCH` 兜底**之前**（先到先得）。
  - ✅ 订阅原有规则（GeoSite/GeoIP/`MATCH`）完好，未被替换。
- **效果**：`pull-backup`（30MB）/ `deploy`（几十 MB）大流量走直连，不趟住宅节点代理多一跳；日常交互流量仍走住宅节点（IP 稳定）。

### ⚠️ 重要坑：刷新订阅会覆盖规则

- 该订阅是 `remote` 类型，由订阅服务商远端提供，支持自动更新。
- **点「刷新」会整份重新拉取远端 YAML，覆盖本地订阅文件，把我加的 VPS 规则冲掉**（服务商侧不含你的 VPS IP）。
- 实测该订阅**仍活着**（拉得到完整配置），刷新能跟上服务商换的新服务器，但代价是规则被冲。

### 临时方案（用户已采纳）

- **平时不要手动刷新**该订阅；节点当前可用就保持不动。
- 仅当「服务商明确换了服务器导致连不上」时，才手动点一次刷新，然后用下面的方法**重新加回 VPS 直连规则**。

### 重新加回规则的方法（刷新后）

编辑当前激活的订阅配置文件，把 `rules:` 第一行加入（`MATCH` 之前）：

```yaml
rules:
  - IP-CIDR,161.35.120.114/32,DIRECT,no-resolve
  - GEOSITE,category-ads-all,REJECT
  ...
```

然后在代理客户端 GUI 重载一次即生效。

### 踩坑记录（勿再用）

- **`prepend-rules:`**：当前离线代理内核 **不认识**，静默忽略，规则不生效（仍残留为顶层字段）。
- **Merge 里裸 `rules:`**：某款代理客户端的 merge 对 `rules` 是**替换**语义——会把订阅原有的 24 条规则全部清掉，只剩 merge 里那一条。**绝对不要用。**
- **正确做法**：直接在订阅文件的 `rules:` 里插第一行（如上），不依赖 merge。

---

## 五、改完后的验证步骤

1. DNS 是否还原：`python3 -c "import socket; print(socket.gethostbyname('api.ipify.org'))"` → 应为真实 IP，非 `198.18.x`
2. SSH banner：perl 裸连 `161.35.120.114:22` → 应收到 `SSH-2.0`
3. GitHub 可达：`curl -I https://github.com` → 200
4. **VPS 是否走直连（权威）**：
   ```
   curl -s --unix-socket /tmp/verge/verge-mihomo.sock http://localhost/rules | python3 -m json.tool | grep -i 161.35
   ```
   应出现 `"payload":"161.35.120.114/32","proxy":"DIRECT"`。
5. 完整 pull：`cd app && bash scripts/pull-backup.sh`（会触发 VPS 新备份并写入本地）。

---

## 六、备注

- 本清单为「有空再确认」挂起项；代理侧已确认并落地。
- 若客户端为 Surge，语法为 `IP-CIDR,161.35.120.114/32,DIRECT`（无需 `-` 前缀的列表键），`no-resolve` 写法一致。
