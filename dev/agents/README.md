# dev/agents

复核提示词的版本化目录。放在仓库里，换机器、换环境都能复现；此前只有一份在 `~/.config/opencode/agent/content-reviewer.md`，没有版本记录。

| 文件 | 用途 | 输出 |
|---|---|---|
| `content-reviewer.md` | L3 复核：抽取 / 中英对齐 / 语感，三遍独立执行 | 一个 JSON 对象，含 `passA` / `passB` / `passC` 与 `verdict` |

## 怎么跑

在 DSH 里，把提示词交给一个子代理，并要求它只返回 JSON：

```
读 dev/agents/content-reviewer.md，按其指示复核
app/db/seed-content/issue-063.md 与 app/db/seed-content-zh/issue-063-zh.md，只返回 JSON。
```

在 opencode 里，保留 `~/.config/opencode/agent/content-reviewer.md` 作为薄包装，引用本文件，避免两份清单各自演化。

## 分级（2026-11-18 定）

只有两类发现会阻断发刊：

1. 数字与所引来源矛盾；
2. 中英之间的数字、专名或限定词不一致。

其余都是 advisory，由编辑裁决。

## 和脚本的分工

- `dev/review.mjs`：机械项（段首空转、单句成段、元话语、配图、脚注、中英单位）。
- `dev/claims.mjs`：数字台账与来源引句。
- `content-reviewer.md`：只有模型能做的判断（抽取、对齐、语感），且必须绑定原文片段。
