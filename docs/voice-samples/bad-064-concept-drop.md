# 反例：No. 064 初稿的「概念突现」

- 来源：本刊 No. 064 初稿（2026-11-25，已废弃）
- 类型：反例
- 违反规则：R9（概念先落地）、R2（段末须是新信息）
- 说明：术语与参照系都没交代就下判断，读者必须先知道 LTSA 是什么、第一位业主的持有期有多长，才能读懂这句比较。R9 因这一段建立。

## 原文（不要这样写）

> 22 年服务协议长过设备第一位业主的持有期。这已经不是发集装箱的生意，服务协议与订单同时签下。

英文稿同一处：

> A 22-year service agreement outlives the equipment's first owner. That is a different business from shipping containers, and it is being signed at the same time as the order.

## 为什么坏

三个问题叠在一句里：

1. LTSA 是什么、22 年里谁负责运维、备件与性能，前文从未交代；
2. 「设备第一位业主的持有期」是读者无法自行计算的参照系，比较因此不成立；
3. 「已经不是发集装箱的生意」是结论，不是新信息（R2）；后半句「服务协议与订单同时签下」也没有给出谁、签了多久、覆盖什么。

## 改后（发布版本）

> 三笔订单里期限最长的一份合同，是阿特斯附在设备上的 22 年长期服务协议（LTSA）。这类协议把设备交付之后的运维、备件与性能责任留在集成商身上，项目在协议期内转手，责任随资产走。买方拿到的是 1.43GWh 系统加 22 年运营承诺，供方留下的是 22 年成本敞口。

英文：

> The longest contract in the three deals is the 22-year long-term service agreement e-STORAGE attached to its system package. It keeps operations, spares and performance with the integrator after the equipment is handed over, and the obligation follows the asset if the project changes hands. The buyer gets 1.43GWh of equipment and 22 years of cover; the supplier keeps 22 years of cost exposure.

三句分工：**是什么 / 跟谁走 / 对价是什么**。比较基准从「第一位业主的持有期」换成了合同本身。

## 同稿的同类问题

「交付界面就是产品」「界面溢价」是同一类毛病的另一种形态：行话先出场、后解释，读者要先把「界面」翻译成「系统集成与长期服务」才读得懂。已改成「卖系统的人拿单」「系统与服务的溢价」。概念类行话清单见 `docs/voice.md` R9。
