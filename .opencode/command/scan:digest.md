---
description: 生成当周扫描简报（读 scan/<日期>/raw/，聚类分类产出 digest.md）
agent: build
---

执行 China Battery Brief 的整理层工作：读取当日抓取素材，聚类分类，产出《当周扫描简报》。

## 完整指令

先读取 `/Users/hpp/Work/03_Projects/China-Battery-Brief/app/scan/digest.md`，其中定义了整理层的完整任务规范（多源聚类、四大分类、强制溯源、输出格式），严格按它执行。

**工作目录**：`app/scan/`

**步骤**：
1. 找到 `scan/<最新日期>/raw/` 目录，确认里面有 `_all.json`（当日新增条目）。若 `_all.json` 为空或缺失，先运行 `npm run scan:sources`（在 `app/` 下）再继续。
2. 按 `digest.md` 规范，把当日 raw 素材整理成 `scan/<日期>/digest.md`：
   - 多源聚类：同一事件多源报道聚合为一个 story，标 `[多源]`/`[单源]`
   - 四大分类：① 海外建厂要闻 ② 政策追踪 ③ 市场财务 ④ 储能（只筛电池出口相关，其余丢弃并记录）
   - 每条带标题/来源/双时间戳/原文链接/中文摘要
   - 强制溯源：摘要里的数字、政策条款、公司名必须能在原文链接查到，查不到标"待核实"
3. 写完 `digest.md` 后，向用户报告：共几条 story、几个多源、哪些待核实。

**约束**：不改动 `raw/` 原始数据；只新增 `digest.md`；如需读取 `raw-html/*.html`（官方站存档）从中抽取真实条目，抽取结果归入对应分类。
