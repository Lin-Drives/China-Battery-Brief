# 写作语感规范（Voice）

> 目标读者是电池与储能行业的从业者与投资人。本文件把「像一家行业媒体那样写」拆成可执行的规则：先对齐结构与信息密度（S1–S6），再管语感（R1–R6）。所有规则都配了可测量的阈值，`dev/voice-check.mjs` 会逐条报。
>
> 适用范围：`app/db/seed-content/`、`app/db/seed-content-zh/` 下的稿件，以及 `issues.json` 里的 title / dek。

---

## 零、对标基线与实测

对标对象：**CnEVPost**（行业快讯）与 **BloombergNEF**（分析体）。2026-11-11 实测：CnEVPost 公开稿 5 篇（走 WP REST API，页面直取会卡在 100k 截断），BNEF 公开稿 6 篇（同理）。

| 指标 | CnEVPost 均值 | BNEF 均值 | No.062 初稿 | No.062 定稿 | 规则 |
|---|---|---|---|---|---|
| 平均句长（英文，词） | 23.8 | 24.2 | 22.3 | 17.2 | S5：20–25，单句 ≤ 35 |
| 含数字的句子占比 | **67%** | **37.2%** | **39%** | 40% | S2：新闻体 ≥ 55%，分析体 ≥ 40% |
| 破折号（每千词） | **0** | 0.3 | **4.2** | **0** | S4：≤ 1 |
| 首段是否含事实数字 | 是 | 是 | 是 | 是 | S1 |

两点结论：

1. 我们的句子不比对标对象长，甚至更短；**问题在数字太少、破折号太多**。初稿读起来像评论，根子在这里。
2. 分析体的数字密度天然低于快讯——BNEF 自己也只有 37.2%。我们把分析体门槛定在 40%，是**刻意略高于 BNEF**，不是给自己放宽。

---

## 一、结构规则（S1–S6）

### S1 · 首句即新闻
第一句必须能独立成立为一条快讯：**主体 + 动作 + 数字或生效时间**。

- 合格：`Democrats took both chambers in the November 3 midterms: at least 224 seats in the House, at least 53 in the Senate.`
- 不合格：`The United States voted on November 3.`（只有时间，没有新闻）

### S2 · 数字密度
每 100 词里至少要有 2 个具体数字（金额、台数、GWh、席位、日期、税率、天数）；含数字的句子占比：新闻体 ≥ 55%（CnEVPost 实测 67%），分析体 ≥ 40%（BNEF 实测 37.2%，门槛故意压在其上）。

对比与判断都要带数字，禁止「大幅增长」「显著下降」「远超」这类无刻度表述。

### S3 · 每个百分比都要有口径
写 `+58.6%` 必须同时给出基准：同比、环比、较某月、占总量、从 A 到 B。

- 合格：`Revenue rose 58.6% year on year to Rmb165.2bn.`
- 不合格：`Revenue rose 58.6%.`

### S4 · 破折号配额
英文 `—` 每千词 ≤ 1 次，中文 `——` 每千字 ≤ 1 次；且不得用破折号承担定义、举例、补充说明。

CnEVPost 五篇实测为 0。破折号是评论腔的标志物，简报里几乎不需要。

### S5 · 句子长度
英文平均 20–25 词，单句上限 35 词（引语可放宽到 40）；中文平均 40–60 字，单句上限 80 字。

超过上限的句子，优先拆成两句，而不是加逗号。

### S6 · 判断必须可追溯
- 事实句：能给出来源（脚注、具名机构、数据表）。
- 预测句：必须写明是谁的预测（`BloombergNEF expects…`），不得写成事实时态。
- 本刊自己的判断：允许，但要给出**证伪条件**——什么数据出现时这个判断就不成立。

BNEF 的写法是 `A new report from BloombergNEF, commissioned by …, indicates that demand is set to almost quadruple to 2,354 TWh by 2035`：谁、做什么、什么口径、什么时间点，一句话交代完。

---

## 二、语感规则（R1–R6）

### R1 · 反转句配额
「不是 A，而是 B」「not X but Y」「The point is not A. It is B.」：相邻两段不得重复出现，全文每 500 词 ≤ 1 次。

判断方法：删掉它，意思是否仍然成立。成立就删。

### R2 · 段末必须是新信息
段落最后一句只允许新事实、数字、引语，或明确的下一步动作。禁止「这就是……的意义」「说到底」「That is the whole story」这类总结句。

### R3 · 不指挥读者
禁止「把这张表从下往上读」「换句话说」「值得注意的是」「不难看出」。读者不需要被告知该怎么读。

### R4 · 首段不做气氛铺垫
禁止时间流逝式（`The United States voted on November 3.`）、提问式、悬念式开场。

### R5 · 排比与标题公式
同一段落三连排比 ≤ 1 次；标题不用「A and B: 解释」的抽象名词公式。标题优先给具体对象（`The Rules That Weren't on the Ballot` 好于 `Veto and Margin`）。

### R6 · 词表
英文避免：crucial, pivotal, underscore, testament, landscape, tapestry, delve, seamless, robust, significant, substantial, key, in today's, it is worth noting。
中文避免：值得注意的是、不难看出、不仅仅是、更是、赋能、闭环、显著、大幅、远超、某种意义上、可以说。

词表不是禁字表，是提醒：这些词出现时，那一句通常没有具体信息。

---

## 三、分析体补充（BNEF 式）

本刊的深度稿介于快讯与券商报告之间，额外三条：

1. **区分事实、预测与本刊判断**：三种语气不能混。预测写出预测者，判断写出理由。
2. **每个数字给时间窗**：`in the first nine months of 2026`、`by 2030`，不要留裸数字。
3. **结论要能被推翻**：给一个可观察的证伪条件（`if the December 7 comment period closes without batteries added`），而不是只给方向。

---

## 四、流程

1. 起草前读母本（No. 060 PART 01 的机制段、No. 061 THE TAKE 的判断段）。
2. 完稿跑 `node dev/voice-check.mjs app/db/seed-content/issue-0NN.md app/db/seed-content-zh/issue-0NN-zh.md`。
3. 逐条处理 S1–S6 的硬失败（首句无数字、数字密度不足、破折号超标、句长超标）。
4. 再读一遍改 R1–R6 的语感问题。
5. 交 `content-reviewer` 复核事实与红线。

脚本只报不判，最终由编辑裁决。

---

## 五、修订记录

- 2026-11-11 建立：因 No.062 初稿「标题、导言、前三段 AI 味重」。
- 2026-11-11 改版：加入 CnEVPost / BloombergNEF 对标基线与 S1–S6；破折号配额从 4/千词收紧到 1/千词；新增数字密度与百分比口径检查。
