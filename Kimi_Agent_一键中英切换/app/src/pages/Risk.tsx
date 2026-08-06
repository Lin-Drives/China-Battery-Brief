import { useEffect, useMemo, useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from '@/lib/gsap'
import KickerLine from '@/components/KickerLine'
import CBBButton from '@/components/Buttons'
import RiskMeter from '@/components/intel/RiskMeter'
import { severityKey, zoneColor } from '@/components/intel/intel-utils'
import PolicyTimeline, { type PolicyEventRow } from '@/components/intel/PolicyTimeline'
import CountryCards, { type CountryExposure } from '@/components/intel/CountryCards'
import ScenarioAccordions from '@/components/intel/ScenarioAccordions'
import RelatedBriefs from '@/components/intel/RelatedBriefs'
import { trpc } from '@/providers/trpc'
import { cn } from '@/lib/utils'
import { useLang, tpl } from '@/i18n/lang'
import { pick } from '@/i18n/format'

/* geopolitics.md — Risk Radar (/risk) */

interface Threat {
  id: string
  label: string
  labelZh?: string
  score: number
  delta: number
  summary: string
  summaryZh?: string
}

/* Design mock fallbacks (geopolitics.md S1/S2/S4) while queries load */
const FALLBACK_THREATS: Threat[] = [
  {
    id: 'ira-feoc',
    label: 'US — IRA & FEOC',
    score: 78,
    delta: 4,
    summary:
      "Round-two guidance closed the light-licensing workaround: 'effective control' now covers royalty + veto combinations. §45X stays lucrative; FEOC status decides who can touch it.",
  },
  {
    id: 'eu-passport',
    label: 'EU — BATTERY PASSPORT',
    score: 54,
    delta: 2,
    summary:
      'Delegated acts on carbon classes are drifting right; the 2027 mandate date holds. Compliance tooling is the real bottleneck for smaller exporters.',
  },
  {
    id: 'tariffs',
    label: 'TARIFFS & EXPORT CONTROLS',
    score: 86,
    delta: 6,
    summary:
      'Section 301 review docket open; graphite export licenses tightened again; Mexico transshipment theory under formal US review.',
  },
]

const FALLBACK_EVENTS: PolicyEventRow[] = [
  { id: 1, region: 'US', title: 'IRA signed', date: new Date(2022, 7, 16), severity: 80, category: 'ira', summary: '$45/kWh §45X credit; North America assembly rules; FEOC concept appears.', link: null },
  { id: 2, region: 'US', title: 'FEOC proposed guidance', date: new Date(2023, 2, 31), severity: 65, category: 'ira', summary: '25% ownership threshold; licensing gray zone opens.', link: null },
  { id: 3, region: 'EU', title: 'EU Battery Regulation in force', date: new Date(2023, 7, 17), severity: 55, category: 'passport', summary: 'Carbon declarations, due diligence, passport mandate path set.', link: null },
  { id: 4, region: 'US', title: 'Section 301 escalates', date: new Date(2024, 4, 14), severity: 75, category: 'tariff', summary: 'EV batteries to 25%; non-EV to follow 2026; graphite tariffs.', link: null },
  { id: 5, region: 'US', title: 'FEOC final rules', date: new Date(2024, 11, 3), severity: 85, category: 'ira', summary: "'Effective control' defined; light-licensing workaround dies.", link: null },
  { id: 6, region: 'EU', title: 'Passport delegated acts consultation', date: new Date(2025, 1, 20), severity: 50, category: 'passport', summary: 'Carbon footprint classes A–E draft; industry pushes back.', link: null },
  { id: 7, region: 'CN', title: 'Graphite export licenses tighten', date: new Date(2025, 9, 9), severity: 70, category: 'export', summary: 'Synthetic graphite added; 60-day approval queue.', link: null },
  { id: 8, region: 'US', title: '301 review concludes', date: new Date(2026, 0, 15), severity: 80, category: 'tariff', summary: 'Watch: non-EV battery rate, transshipment language.', link: null },
  { id: 9, region: 'EU', title: 'EU passport mandatory', date: new Date(2027, 1, 18), severity: 90, category: 'passport', summary: 'No passport, no market. T-minus counter live in ticker.', link: null },
]

const FALLBACK_COUNTRIES: CountryExposure[] = [
  { code: 'US', name: 'United States', score: 88, status: 'paused', sites: 2, gwhAtRisk: 140, lastEvent: 'FEOC + 301 stacked; §45X still the prize. Licensing structures under review.' },
  { code: 'HU', name: 'Hungary', score: 42, status: 'construction', sites: 4, gwhAtRisk: 58, lastEvent: 'EU member, Chinese-friendly; grid capacity is the binding constraint, not Brussels.' },
  { code: 'ID', name: 'Indonesia', score: 55, status: 'construction', sites: 3, gwhAtRisk: 90, lastEvent: 'Export-ban leverage both ways; JV cap tables under FEOC scrutiny.' },
  { code: 'MA', name: 'Morocco', score: 38, status: 'construction', sites: 1, gwhAtRisk: 20, lastEvent: "Cleanest rules-of-origin play available; watch US review of 'substantial transformation'." },
  { code: 'MX', name: 'Mexico', score: 71, status: 'paused', sites: 1, gwhAtRisk: 40, lastEvent: 'Transshipment theory formalized; announced projects quietly re-scoping.' },
  { code: 'BR', name: 'Brazil', score: 33, status: 'operating', sites: 1, gwhAtRisk: 15, lastEvent: 'Tariff calculus favors local build; Mercosur demand real but price-capped.' },
]

export default function Risk() {
  const { t, lang } = useLang()
  const headerRef = useRef<HTMLDivElement>(null)
  const boardRef = useRef<HTMLDivElement>(null)

  const { data: riskData } = trpc.content['risk.scores'].useQuery()
  const { data: policyData } = trpc.content['policy.list'].useQuery({})

  const threats = riskData?.threats?.length ? riskData.threats : FALLBACK_THREATS
  const countries: CountryExposure[] = riskData?.countries?.length
    ? riskData.countries
    : FALLBACK_COUNTRIES
  const events: PolicyEventRow[] = useMemo(
    () => (policyData?.length ? (policyData as PolicyEventRow[]) : FALLBACK_EVENTS),
    [policyData],
  )

  useEffect(() => {
    document.title = 'Risk Radar — China Battery Brief'
  }, [])

  /* S0 header entrance + radar scan-line sweep */
  useGSAP(
    () => {
      gsap.fromTo('.risk-hero-img', { scale: 1.08 }, { scale: 1, duration: 1.2, ease: 'expo.out' })
      gsap.fromTo(
        '.risk-hero-el',
        { y: 36, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.9, stagger: 0.12, ease: 'expo.out', delay: 0.1 },
      )
      gsap.fromTo(
        '.risk-scanline',
        { top: '0%', opacity: 0.4 },
        { top: '100%', opacity: 0, duration: 1.4, ease: 'power1.inOut', delay: 0.3 },
      )
    },
    { scope: headerRef },
  )

  /* S1 stamps slam at the end of each dial sweep */
  useGSAP(
    () => {
      const stamps = gsap.utils.toArray<HTMLElement>('.threat-stamp', boardRef.current)
      stamps.forEach((stamp, i) => {
        gsap.fromTo(
          stamp,
          { scale: 1.6, opacity: 0 },
          {
            scale: 1,
            opacity: 1,
            duration: 0.26,
            delay: 1.4 + i * 0.2,
            ease: 'power3.out',
            scrollTrigger: { trigger: boardRef.current, start: 'top 60%', once: true },
          },
        )
      })
    },
    { scope: boardRef, dependencies: [threats.length] },
  )

  const scrollToScenarios = () =>
    document.getElementById('scenarios')?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <>
      {/* ---------------- S0 · Header band ---------------- */}
      <div ref={headerRef} className="relative -mt-16 h-[440px] overflow-hidden">
        <img
          src="/geopolitics-header.png"
          alt=""
          className="risk-hero-img absolute inset-0 h-full w-full object-cover"
        />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to bottom, rgba(7,9,13,0.25) 0%, rgba(7,9,13,0.55) 55%, var(--ink-950) 100%)',
          }}
        />
        {/* radar scan-line sweep */}
        <div
          aria-hidden
          className="risk-scanline absolute inset-x-0 h-px bg-signal"
          style={{ opacity: 0 }}
        />
        <div className="absolute inset-x-0 bottom-0">
          <div className="mx-auto max-w-container px-[clamp(20px,4vw,48px)] pb-10">
            <p className="risk-hero-el kicker text-signal">{t('risk.kicker')}</p>
            <h1 className="risk-hero-el mt-4 font-display text-[clamp(2.5rem,5.5vw,5rem)] font-normal leading-[0.98] tracking-[-0.02em] text-text">
              {t('risk.h1A')}
              <em className="italic text-signal">{t('risk.h1Em')}</em>
              {t('risk.h1B')}
            </h1>
            <p className="risk-hero-el mt-4 max-w-[56ch] font-sans text-[15px] leading-relaxed text-text-muted">
              {t('risk.sub')}
            </p>
          </div>
        </div>
      </div>

      {/* ---------------- S1 · Threat board ---------------- */}
      <section className="border-b border-line">
        <div
          ref={boardRef}
          className={cn(
            'mx-auto grid max-w-container gap-px bg-line lg:grid-cols-3',
            threats.length >= 4 && 'lg:grid-cols-4',
          )}
        >
          {threats.map((threat, i) => {
            const color = zoneColor(threat.score)
            return (
              <button
                key={threat.id}
                type="button"
                onClick={scrollToScenarios}
                className="group relative overflow-hidden bg-ink-950 p-6 text-left transition-shadow duration-300 hover:shadow-[inset_0_0_60px_rgba(255,91,69,0.06)]"
              >
                {/* hover scan-lines */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  style={{
                    background:
                      'repeating-linear-gradient(to bottom, transparent 0 3px, rgba(255,91,69,0.03) 3px 4px)',
                  }}
                />
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="kicker text-faint">{tpl(t('risk.threat'), { n: String(i + 1).padStart(2, '0') })}</p>
                    <h2 className="mt-2 font-display text-[24px] leading-tight text-text">{pick(lang, threat.labelZh, threat.label)}</h2>
                  </div>
                  <span
                    className="threat-stamp shrink-0 -rotate-6 rounded-sm border-[1.5px] px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.22em]"
                    style={{ color, borderColor: color, opacity: 0 }}
                  >
                    {t(severityKey(threat.score))}
                  </span>
                </div>
                <div className="mt-4 transition-[filter] duration-300 group-hover:drop-shadow-[0_0_18px_rgba(255,91,69,0.3)]">
                  <RiskMeter value={threat.score} delay={i * 0.2} />
                </div>
                <p className="mt-4 min-h-[3.75rem] font-sans text-[13px] leading-relaxed text-text-muted">
                  {pick(lang, threat.summaryZh, threat.summary)}
                </p>
                <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
                  <span className="font-mono text-[10px] tracking-[0.14em] text-faint">
                    {t('risk.lastUpdated')}
                  </span>
                  <span
                    className="font-mono text-[11px] tnum"
                    style={{ color: threat.delta > 0 ? 'var(--signal)' : 'var(--volt)' }}
                  >
                    {threat.delta > 0 ? '▲' : '▼'}
                    {Math.abs(threat.delta)} {t('risk.ww')}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </section>

      {/* ---------------- S2 · Policy timeline ---------------- */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-container px-[clamp(20px,4vw,48px)] py-24">
          <KickerLine chapter="02" label={t('risk.timelineKicker')} color="var(--signal)" />
          <h2 className="mb-12 mt-5 font-display text-[clamp(2rem,4vw,3.25rem)] font-normal leading-[1.05] text-text">
            {t('risk.timelineHA')}
            <em className="italic text-signal">{t('risk.timelineHEm')}</em>
            {t('risk.timelineHB')}
          </h2>
          <PolicyTimeline events={events} />
        </div>
      </section>

      {/* ---------------- S3 · Scenarios ---------------- */}
      <section id="scenarios" className="scroll-mt-24 border-b border-line">
        <div className="mx-auto max-w-container px-[clamp(20px,4vw,48px)] py-24">
          <KickerLine chapter="03" label={t('risk.scenKicker')} color="var(--signal)" />
          <h2 className="mb-10 mt-5 font-display text-[clamp(2.5rem,5vw,4.5rem)] font-normal leading-[1.02] text-text">
            {t('risk.scenHA')}
            <em className="italic text-signal">{t('risk.scenHEm')}</em>
            {t('risk.scenHB')}
          </h2>
          <ScenarioAccordions />
        </div>
      </section>

      {/* ---------------- S4 · Country exposure ---------------- */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-container px-[clamp(20px,4vw,48px)] py-24">
          <KickerLine chapter="04" label={t('risk.exposureKicker')} color="var(--signal)" />
          <h2 className="mb-12 mt-5 font-display text-[clamp(2.5rem,5vw,4.5rem)] font-normal leading-[1.02] text-text">
            {t('risk.exposureHA')}
            <em className="italic text-signal">{t('risk.exposureHEm')}</em>
            {t('risk.exposureHB')}
          </h2>
          <CountryCards countries={countries} />
        </div>
      </section>

      {/* ---------------- S5 · Alerts CTA ---------------- */}
      <section
        className="border-b border-line"
        style={{ background: 'linear-gradient(90deg, var(--volt-dim), rgba(255,91,69,0.08))' }}
      >
        <div className="mx-auto flex max-w-container flex-col items-start justify-between gap-6 px-[clamp(20px,4vw,48px)] py-16 lg:flex-row lg:items-center">
          <h2 className="font-display text-[28px] leading-tight text-text">
            {t('risk.alertsHA')}
            <em className="italic text-volt">{t('risk.alertsHEm')}</em>
            {t('risk.alertsHB')}
          </h2>
          <div className="flex flex-col items-start gap-4 lg:items-end">
            <p className="max-w-[46ch] font-mono text-[11px] leading-relaxed tracking-[0.1em] text-text-muted lg:text-right">
              {t('risk.alertsSub')}
            </p>
            <CBBButton to="/pricing">{t('risk.alertsCta')}</CBBButton>
          </div>
        </div>
      </section>

      {/* ---------------- S6 · Related briefs ---------------- */}
      <section>
        <div className="mx-auto max-w-container px-[clamp(20px,4vw,48px)] py-24">
          <KickerLine chapter="05" label={t('risk.relatedKicker')} color="var(--signal)" className="mb-10" />
          <RelatedBriefs
            items={[
              {
                num: 'No. 045',
                title: t('riskRel.045.title'),
                dek: t('riskRel.045.dek'),
                to: '/briefs/battery-passport-t-minus-200',
                cover: '/cover-045.png',
                minutes: 13,
              },
              {
                num: 'No. 041',
                title: t('riskRel.041.title'),
                dek: t('riskRel.041.dek'),
                to: '/briefs/battery-passport-t-minus-200',
                minutes: 11,
              },
              {
                num: 'No. 043',
                title: t('riskRel.043.title'),
                dek: t('riskRel.043.dek'),
                to: '/briefs',
                minutes: 10,
              },
            ]}
          />
        </div>
      </section>
    </>
  )
}
