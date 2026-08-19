import { useEffect, useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from '@/lib/gsap'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import KickerLine from '@/components/KickerLine'
import CBBButton from '@/components/Buttons'
import StatBlock from '@/components/StatBlock'
import Reveal from '@/components/Reveal'
import RelatedBriefs from '@/components/intel/RelatedBriefs'
import { useLang } from '@/i18n/lang'

/* markets.md — Markets & Finance (/markets) */

const AMBER = '#F0A832'

/** SNE Research — global EV battery usage share (%). */
const SHARE_SERIES = [
  { period: '2024 FY', CATL: 37.9, BYD: 17.2 },
  { period: 'Q1 2026', CATL: 40.7, BYD: 13.7 },
  { period: 'JAN–MAY 26', CATL: 40.2, BYD: 14.4 },
]

const SCORE_STATS = [
  { value: 40.7, suffix: '%', labelKey: 'markets.score1' },
  { value: 54.6, suffix: '%', labelKey: 'markets.score2' },
  { value: 55, suffix: '%', labelKey: 'markets.score3' },
  { value: 1.2, suffix: ' TWH', labelKey: 'markets.score4' },
]

const PRICE_CARDS = [
  { key: 'p1', value: '≈$52', unit: '/KWH', noteKey: 'markets.price1note' },
  { key: 'p2', value: '≈-30%', unit: ' VS LFP', noteKey: 'markets.price2note' },
  { key: 'p3', value: '25%', unit: ' US 301', noteKey: 'markets.price3note' },
]

const MONEY_ROWS = [
  { who: 'CATL', whatKey: 'markets.flow1what', sum: '€7.34BN', where: 'HUNGARY', tagKey: 'markets.flow1tag' },
  { who: 'BYD', whatKey: 'markets.flow2what', sum: '€4BN', where: 'HUNGARY', tagKey: 'markets.flow2tag' },
  { who: 'CATL', whatKey: 'markets.flow3what', sum: '$6BN', where: 'INDONESIA', tagKey: 'markets.flow3tag' },
  { who: 'CALB', whatKey: 'markets.flow4what', sum: '€2.07BN', where: 'PORTUGAL', tagKey: 'markets.flow4tag' },
  { who: 'EVE', whatKey: 'markets.flow5what', sum: '$1.2BN', where: 'MALAYSIA', tagKey: 'markets.flow5tag' },
]

export default function Markets() {
  const { t } = useLang()
  const headerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    document.title = 'Markets — China Battery Brief'
  }, [])

  /* S0 header: line-mask reveals */
  useGSAP(
    () => {
      gsap.fromTo(
        '.mk-h-line',
        { y: '110%' },
        { y: '0%', duration: 0.9, stagger: 0.11, ease: 'expo.out', delay: 0.15 },
      )
      gsap.fromTo(
        '.mk-h-fade',
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.8, stagger: 0.12, ease: 'expo.out', delay: 0.5 },
      )
    },
    { scope: headerRef },
  )

  return (
    <>
      {/* ---------------- S0 · Header ---------------- */}
      <div ref={headerRef} className="border-b border-line">
        <div className="mx-auto max-w-[900px] px-[clamp(20px,4vw,48px)] pb-16 pt-40 text-center">
          <p className="mk-h-fade kicker text-amber">{t('markets.kicker')}</p>
          <h1 className="mt-6 font-display text-[clamp(3.25rem,7.5vw,7rem)] font-normal leading-[0.98] tracking-[-0.02em] text-text">
            <span className="block overflow-hidden">
              <span className="mk-h-line block">{t('markets.h1a')}</span>
            </span>
            <span className="block overflow-hidden">
              <span className="mk-h-line block">
                {t('markets.h1bA')}
                <em className="italic text-amber">{t('markets.h1bEm')}</em>
                {t('markets.h1bB')}
              </span>
            </span>
          </h1>
          <p className="mk-h-fade mx-auto mt-6 max-w-[62ch] font-sans text-[15px] leading-relaxed text-text-muted">
            {t('markets.sub')}
          </p>
          <p className="mk-h-fade mt-6 font-mono text-[11px] tracking-[0.14em] text-faint">
            {t('markets.meta')}
          </p>
        </div>
      </div>

      {/* ---------------- S1 · Scoreboard ---------------- */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-container px-[clamp(20px,4vw,48px)] py-24">
          <KickerLine chapter="01" label={t('markets.scoreKicker')} color={AMBER} />
          <h2 className="mt-5 mb-12 font-display text-[clamp(2.5rem,5vw,4.5rem)] font-normal leading-[1.02] text-text">
            {t('markets.scoreHA')}
            <em className="italic text-amber">{t('markets.scoreHEm')}</em>
            {t('markets.scoreHB')}
          </h2>
          <Reveal className="grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-4">
            {SCORE_STATS.map((s, i) => (
              <div key={s.labelKey} className="bg-ink-950 p-6">
                <StatBlock value={s.value} label={t(s.labelKey)} suffix={s.suffix} color={AMBER} />
                <p className="mt-4 border-t border-line pt-3 font-mono text-[10px] tracking-[0.12em] text-faint">
                  {t(`markets.score${i + 1}src`)}
                </p>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* ---------------- S2 · Share chart ---------------- */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-container px-[clamp(20px,4vw,48px)] py-24">
          <KickerLine chapter="02" label={t('markets.chartKicker')} color={AMBER} />
          <h2 className="mt-5 mb-8 font-display text-[clamp(2rem,4vw,3.25rem)] font-normal leading-[1.05] text-text">
            {t('markets.chartHA')}
            <em className="italic text-amber">{t('markets.chartHEm')}</em>
            {t('markets.chartHB')}
          </h2>
          <div className="border border-line bg-ink-900 p-6">
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={SHARE_SERIES} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                  <defs>
                    <linearGradient id="catlFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={AMBER} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={AMBER} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(237,235,227,0.08)" />
                  <XAxis
                    dataKey="period"
                    tick={{ fill: 'var(--faint)', fontSize: 11, fontFamily: 'IBM Plex Mono' }}
                    axisLine={{ stroke: 'rgba(237,235,227,0.18)' }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 50]}
                    tick={{ fill: 'var(--faint)', fontSize: 11, fontFamily: 'IBM Plex Mono' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => `${v}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#101623',
                      border: '1px solid rgba(237,235,227,0.18)',
                      borderRadius: 2,
                      fontSize: 12,
                      fontFamily: 'IBM Plex Mono',
                      color: '#EDEBE3',
                    }}
                    labelStyle={{ color: '#5A6376', fontSize: 10 }}
                    formatter={(value: number, name: string) => [`${value}%`, name]}
                  />
                  <Area
                    type="monotone"
                    dataKey="CATL"
                    stroke={AMBER}
                    strokeWidth={2}
                    fill="url(#catlFill)"
                  />
                  <Area
                    type="monotone"
                    dataKey="BYD"
                    stroke="var(--lithium)"
                    strokeWidth={2}
                    fill="transparent"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-4 font-mono text-[11px] leading-relaxed tracking-[0.08em] text-faint">
              {t('markets.chartNote')}
            </p>
          </div>
        </div>
      </section>

      {/* ---------------- S3 · Prices & costs ---------------- */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-container px-[clamp(20px,4vw,48px)] py-24">
          <KickerLine chapter="03" label={t('markets.priceKicker')} color={AMBER} />
          <h2 className="mt-5 mb-12 font-display text-[clamp(2.5rem,5vw,4.5rem)] font-normal leading-[1.02] text-text">
            {t('markets.priceHA')}
            <em className="italic text-amber">{t('markets.priceHEm')}</em>
            {t('markets.priceHB')}
          </h2>
          <div className="grid gap-5 md:grid-cols-3">
            {PRICE_CARDS.map((c) => (
              <Reveal key={c.key}>
                <div className="flex h-full flex-col justify-between border border-line bg-ink-800 p-6">
                  <div>
                    <p className="font-display text-[40px] font-light leading-none text-text tnum">
                      {c.value}
                      <span className="ml-2 font-mono text-[13px] tracking-[0.1em] text-faint">{c.unit}</span>
                    </p>
                  </div>
                  <p className="mt-6 font-sans text-[13.5px] leading-relaxed text-text-muted">
                    {t(`markets.price.${c.key}`)}
                  </p>
                  <p className="mt-3 font-mono text-[10px] tracking-[0.12em] text-faint">
                    {t(`markets.price.${c.key}note`)}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- S4 · Money moves ---------------- */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-container px-[clamp(20px,4vw,48px)] py-24">
          <KickerLine chapter="04" label={t('markets.flowKicker')} color={AMBER} />
          <h2 className="mt-5 mb-10 font-display text-[clamp(2rem,4vw,3.25rem)] font-normal leading-[1.05] text-text">
            {t('markets.flowHA')}
            <em className="italic text-amber">{t('markets.flowHEm')}</em>
            {t('markets.flowHB')}
          </h2>
          <Reveal className="flex flex-col border border-line bg-ink-900">
            {MONEY_ROWS.map((row, i) => (
              <div
                key={row.who + i}
                className="grid gap-2 border-b border-line px-6 py-5 last:border-b-0 md:grid-cols-[110px_1fr_auto] md:items-center"
              >
                <p className="font-mono text-[13px] font-semibold tracking-[0.14em] text-amber">{row.who}</p>
                <p className="font-sans text-[14px] leading-relaxed text-text">{t(row.whatKey)}</p>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[12px] tnum tracking-[0.1em] text-text">{row.sum}</span>
                  <span className="font-mono text-[10px] tracking-[0.14em] text-faint">{row.where}</span>
                </div>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* ---------------- S5 · The take ---------------- */}
      <section
        className="border-b border-line"
        style={{ background: 'linear-gradient(90deg, rgba(240,168,50,0.06), var(--volt-dim))' }}
      >
        <div className="mx-auto max-w-container px-[clamp(20px,4vw,48px)] py-24">
          <KickerLine chapter="05" label={t('markets.takeKicker')} color={AMBER} />
          <h2 className="mt-5 mb-8 font-display text-[clamp(2.5rem,5vw,4.5rem)] font-normal leading-[1.02] text-text">
            {t('markets.takeHA')}
            <em className="italic text-amber">{t('markets.takeHEm')}</em>
            {t('markets.takeHB')}
          </h2>
          <Reveal>
            <div className="grid gap-8 lg:grid-cols-2">
              <div className="flex flex-col gap-5 border-l-2 border-amber pl-6">
                <p className="font-sans text-[17px] leading-[1.7] text-text">{t('markets.take1')}</p>
                <p className="font-sans text-[15px] leading-[1.7] text-text-muted">{t('markets.take2')}</p>
                <p className="font-mono text-[11px] tracking-[0.1em] text-faint">{t('markets.takeDisclaim')}</p>
              </div>
              <div className="flex flex-col gap-4">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="flex items-baseline gap-4 border border-line bg-ink-900 p-5">
                    <span className="font-mono text-[11px] tnum text-amber">{String(n).padStart(2, '0')}</span>
                    <p className="font-sans text-[14px] leading-relaxed text-text">{t(`markets.takeItem${n}`)}</p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------------- S6 · Related briefs + CTA ---------------- */}
      <section>
        <div className="mx-auto max-w-container px-[clamp(20px,4vw,48px)] py-24">
          <KickerLine chapter="06" label={t('markets.relatedKicker')} color={AMBER} className="mb-10" />
          <RelatedBriefs
            items={[
              {
                num: 'No. 050',
                title: t('marketsRel.050.title'),
                dek: t('marketsRel.050.dek'),
                to: '/briefs/storage-shift-non-china-majority',
                cover: '/cover-050.svg',
                minutes: 8,
              },
              {
                num: 'No. 049',
                title: t('marketsRel.049.title'),
                dek: t('marketsRel.049.dek'),
                to: '/briefs/the-scoreboard',
                cover: '/cover-049.svg',
                minutes: 7,
              },
            ]}
          />
        </div>
        <div className="border-t border-line bg-[rgba(240,168,50,0.06)]">
          <div className="mx-auto flex max-w-container flex-col items-start justify-between gap-6 px-[clamp(20px,4vw,48px)] py-16 lg:flex-row lg:items-center">
            <div>
              <h2 className="font-display text-[30px] leading-tight text-text">
                {t('markets.ctaA')}
                <em className="italic text-amber">{t('markets.ctaEm')}</em>
                {t('markets.ctaB')}
              </h2>
              <p className="mt-2 font-mono text-[11px] tracking-[0.14em] text-text-muted">
                {t('markets.ctaSub')}
              </p>
            </div>
            <CBBButton to="/pricing">{t('markets.ctaButton')}</CBBButton>
          </div>
        </div>
      </section>
    </>
  )
}
