# dev/agents

Versioned prompts for the review agents. Keeping them in the repo means the
review is reproducible across machines and model providers; the previous copy
lived at `~/.config/opencode/agent/content-reviewer.md` and was not versioned.

| File | Used by | Output |
|---|---|---|
| `content-reviewer.md` | L3 review (three passes: extraction, EN/ZH diff, voice) | one JSON object with `passA` / `passB` / `passC`, plus `verdict` |

## Running it

In DeepSeek Harness, pass the file to a subagent whose model differs from the
drafting model when possible:

```
读 dev/agents/content-reviewer.md，按其指示复核 app/db/seed-content/issue-063.md
与 app/db/seed-content-zh/issue-063-zh.md，只返回 JSON。
```

In opencode, keep a thin wrapper at `~/.config/opencode/agent/content-reviewer.md`
that includes this file (or symlink it), so the checklist has one source of truth.

## Grading (agreed 2026-11-18)

Only two findings block publication:

1. a number that contradicts its cited source;
2. an EN/ZH mismatch in numbers, entities or hedges.

Everything else is advisory and stays with the editor.
