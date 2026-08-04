# China Battery Brief — 项目规范

中英双语电池出海新闻网站。React 19 + Vite 前端，Hono + tRPC 后端，Drizzle ORM + MySQL。

## 常用命令

```bash
npm run dev        # 开发服务器（localhost:3000，含 API）
npm run check      # tsc 类型检查（改动后必须通过）
npm run db:start   # 启动项目内绿色版 MySQL（../.local-mysql）
npm run db:seed    # 灌入种子数据
```

## i18n 工作方式

- 文案集中在 `src/i18n/en.ts` 与 `src/i18n/zh.ts`（键必须一一对应），组件用 `t('key')` 取值、`tpl(t('key'), {...})` 插值。
- **禁止在组件里写用户可见的硬编码文案**（alt/aria/document.title 除外），一律走 i18n 键。
- 标题常用 A/Em/B 三段拼接结构（Em 是高亮短语），三段拼起来必须是一句通顺的话。

## 中文排版规范（zh 文案必须遵守）

1. **标题类文案句尾不加句号**：h1、章节标题、卡片标题、按钮、印章、kicker、图注，句尾不加「。」或其它收尾标点（「！？」也尽量不用）。
2. **正文段落**：句中标点正常使用；段落最后一句的句尾「。」去掉（如「……只对读者负责」，不写「……只对读者负责。」）。
3. **字符串不得以标点开头**（，。、；：！？）。A/Em/B 分段拼接时，标点只能落在段尾或句中，避免换行后标点挂在行首。
4. **占位符原样保留**：`{n}` `{no}` `{sites}` `{gwh}` `{v}` 等不可翻译、不可删除。
5. **专有名词保持英文原样**：CATL、BYD、LFP、OBBBA、§45X、GWh、FEOC 等不翻译、不强行中文化。
6. **拒绝翻译腔**：中文必须是自然的编辑书面语（反例：「政策驱动的 GWh，已超过地质。」；正例：「产能的指挥棒，已从地质交给政策」）。
7. CSS 侧已配置：`html.zh` 下标题/正文启用 `line-break: strict` 与 `hanging-punctuation: first allow-end`（CJK 避头尾），新增中文样式不要破坏这两条。

## 内测开关

`contracts/constants.ts` 的 `OpenAccess.beta`：为 `true` 时全站内容免费开放（无限时免费标注），付费墙、涂黑 teaser 均停用。恢复付费时改为 `false`。
