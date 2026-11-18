# 专名对照表（dev/glossary.json）

字段：

- `en` / `zh`：主要写法，必填。
- `en_aliases` / `zh_aliases`：可接受的别名（如 `SCO` 对应「上海合作组织」「上合组织」「上合」）。
- `kind`：company / place / institution / law / person / org，仅作注释，脚本不读。
- `risky: true`：中文写法容易误伤（如「大众」也是普通词、「日产」也指日产量），检查时跳过。

匹配方式是子串：英文转小写后子串匹配，中文直接子串匹配。条目只在**被复核的中英对**里比较，一侧出现、另一侧缺失即报 `L1.entity`。

新增名字时优先用 `node dev/glossary-suggest.mjs` 抽候选，再补中文对应；不要凭空音译。
