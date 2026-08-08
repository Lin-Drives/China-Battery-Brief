# 首页读图 Review 记录（2026-08-05）

来源：vision 代理分析首页 1440×900 截图 + 对照源码核实后的结论。

## 待处理（低危）→ 已于 2026-08-08 处理完毕

1. **语言切换 `中` 字可读性**（`src/components/LangToggle.tsx`）
   - 11px 灰色下 `中` 极易被认成「JA」，与产品「中英切换」定位冲突。✅ 已改：字号 11px→12px，未激活色 `text-text-muted`→`text-text/80`。

2. **卡片 TECH 行文案**（`src/i18n/en.ts:111` `hero.ch2text`）
   - `SAIC's "solid-state" is semi` 在窄卡上像被截断。✅ 已改为 `is semi-solid`（与 zh 的「实为半固态」对齐）。

## 已排除的误读（无需处理）

- 「受众 chip 双空格」→ 实为 `·` 分隔符（`hero.proof`，en.ts:104）
- 「按钮下多余对勾图标」→ EmailCapture 正常 microcopy
- 「卡片右下角 245」→ ChargeGauge 的 `68%` 标签
- 「JA vs ZH」→ 确认是 `中`（LangToggle.tsx:8）
- 全站深色基调（`bg-ink-950`）与设计 token 一致，非偏差；无蓝紫渐变

## 截图

`/var/folders/vw/bzpjqyhj7dzg5ymml0nmk5vc0000gn/T/opencode/pw/home-full.png`
