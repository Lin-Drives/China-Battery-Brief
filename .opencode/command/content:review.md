---
description: 内容复核（派 content-reviewer 子代理交叉校验 EN/ZH 稿件，主模型裁决并修正）
agent: build
---

执行 China Battery Brief 的内容复核流程：对一期周刊稿件（EN/ZH 配对）做独立二次复核，按 AGENTS.md 第七节红线逐条检查，最后主模型裁决并修正。

## 完整指令

**输入**：一期稿件，默认取 `app/db/seed-content/` 与 `seed-content-zh/` 中最新一期（如 issue-051.md / issue-051-zh.md），或用户指定的期号/文件路径。

**步骤**：
1. 读取 `AGENTS.md` 第七节「内容工作流与安全注意」，明确红线：信源时效（近 3 个月）、读者背景预设（first mention 身份从句）、专业术语、中英一致性、事实溯源。
2. 用 `content-reviewer` 子代理对稿件做独立复核（它只读不改，按红线逐条输出违规报告）：
   - 派发对象：`content-reviewer`（`~/.config/opencode/agent/content-reviewer.md`，模型 `opencode/minimax-m3`）
   - 提供：EN 与 ZH 稿件全文、`info.md` 事实底座路径、要求输出结构化 Review（Red-line violations / Passed / Verdict）
3. 主模型裁决并修正：
   - **PASS** → 无需改动，直接收尾
   - **MINOR/MAJOR** → 逐条复核子代理的每项违规；确认属实的按红线修正稿件，误报的驳回并在报告里注明理由；禁止盲从子代理结论
4. 修正后再跑一轮复核确认（若改动较大）；将最终复核结论（通过了哪几条、修正了什么）汇总给用户。

**输出**：向用户报告 — 子代理 verdict、主模型修正了哪些点、遗留待人工确认项。

**约束**：
- `content-reviewer` 子代理只读不改；改动一律由主模型（本 agent）在稿件文件上完成
- 不提交 git；改完稿件后如需发布，走既有发布流程
