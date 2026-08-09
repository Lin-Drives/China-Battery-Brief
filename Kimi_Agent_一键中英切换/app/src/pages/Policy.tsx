import { useEffect, useMemo, useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from '@/lib/gsap'
import KickerLine from '@/components/KickerLine'
import CBBButton from '@/components/Buttons'
import Reveal from '@/components/Reveal'
import PolicyTimeline, { type PolicyEventRow } from '@/components/intel/PolicyTimeline'
import RelatedBriefs from '@/components/intel/RelatedBriefs'
import { trpc } from '@/providers/trpc'
import { useLang } from '@/i18n/lang'

/* policy.md — Policy Desk: China's rulebook (/policy) */

const SIGNAL = '#FF5B45'

interface Front {
  key: string
  statusKey: string
  bodyKey: string
  tagsKey: string
}

const FRONTS: Front[] = [
  { key: 'f1', statusKey: 'policy.f1.status', bodyKey: 'policy.f1.body', tagsKey: 'policy.f1.tags' },
  { key: 'f2', statusKey: 'policy.f2.status', bodyKey: 'policy.f2.body', tagsKey: 'policy.f2.tags' },
  { key: 'f3', statusKey: 'policy.f3.status', bodyKey: 'policy.f3.body', tagsKey: 'policy.f3.tags' },
  { key: 'f4', statusKey: 'policy.f4.status', bodyKey: 'policy.f4.body', tagsKey: 'policy.f4.tags' },
]

const FALLBACK_EVENTS: PolicyEventRow[] = [
  { id: 1, region: 'CN', title: 'MIIT ~RMB 6bn all-solid-state special fund', date: new Date(2024, 5, 1), severity: 55, category: 'other', summary: 'Six players funded across sulfide/polymer routes; mid-term review Sept 2025.', link: null },
  { id: 2, region: 'CN', title: 'T/CSAE 434-2025 — world’s first all-solid-state definition', date: new Date(2025, 4, 9), severity: 45, category: 'other', summary: 'First group standard defining what counts as all-solid-state.', link: null },
  { id: 3, region: 'CN', title: 'LFP/LMFP cathode technology exports restricted', date: new Date(2025, 6, 15), severity: 80, category: 'export', summary: 'Two-step MOFCOM licensing covers JVs, licensing and tech-service agreements.', link: null },
  { id: 4, region: 'US', title: 'OBBBA signed — PFE regime targets licensed tech', date: new Date(2025, 6, 4), severity: 90, category: 'ira', summary: '§45X credits denied where tech is licensed from FEOCs; China answers with export controls.', link: null },
  { id: 5, region: 'CN', title: 'Exports of ≥300 Wh/kg batteries, cathode/anode, equipment controlled', date: new Date(2025, 9, 9), severity: 85, category: 'export', summary: 'MOFCOM Announcement No. 58: dual-use licensing for high-energy cells and manufacturing equipment.', link: null },
  { id: 6, region: 'CN', title: 'One-year suspension of Oct-9 controls', date: new Date(2025, 10, 7), severity: 60, category: 'export', summary: 'US-China trade truce pause — expires November 2026, mid-negotiation.', link: null },
  { id: 7, region: 'CN', title: 'Solid-state fund mid-term review', date: new Date(2025, 8, 5), severity: 50, category: 'other', summary: 'MIIT reviews the six funded players; a second tranche expected as pilot lines reach pre-production.', link: null },
  { id: 8, region: 'CN', title: 'CATL Na-ion first sodium chemistry to pass GB 38031-2025', date: new Date(2026, 1, 5), severity: 45, category: 'other', summary: 'Naxtra opens the certified lane for sodium-ion at scale.', link: null },
  { id: 9, region: 'CN', title: 'GB 38031-2025 safety standard takes effect', date: new Date(2026, 6, 1), severity: 55, category: 'other', summary: 'New EV-battery safety regime applies to every chemistry sold in China.', link: null },
  { id: 10, region: 'CN', title: 'Export-control suspension expires (projected)', date: new Date(2026, 10, 7), severity: 75, category: 'export', summary: 'The one-year truce pause lapses mid-negotiation; watch equipment and cathode clauses.', link: null },
  { id: 11, region: 'CN', title: 'NDRC + local funds — Zhuhai ¥5bn, Shanghai ¥3bn for solid-state', date: new Date(2026, 2, 1), severity: 40, category: 'other', summary: 'Local war chests stack on the national fund; NDRC bonds subsidize ~15% of solid-state capex.', link: null },
  { id: 12, region: 'CN', title: 'All-solid-state demo fleets & 2027 mass-production targets', date: new Date(2027, 0, 1), severity: 60, category: 'other', summary: 'CATL small-batch 2027, BYD demo fleets ~2027, SAIC/QingTao mass delivery target 2027.', link: null },
]

export default function Policy() {
  const { t } = useLang()
  const headerRef = useRef<HTMLDivElement>(null)

  const { data: policyData } = trpc.content['policy.list'].useQuery({})
  const events: PolicyEventRow[] = useMemo(
    () => (policyData?.length ? (policyData as PolicyEventRow[]) : FALLBACK_EVENTS),
    [policyData],
  )

  useEffect(() => {
    document.title = 'Policy — China Battery Brief'
  }, [])

  /* S0 header: line-mask reveals */
  useGSAP(
    () => {
      gsap.fromTo(
        '.plc-h-line',
        { y: '110%' },
        { y: '0%', duration: 0.9, stagger: 0.11, ease: 'expo.out', delay: 0.15 },
      )
      gsap.fromTo(
        '.plc-h-fade',
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
          <p className="plc-h-fade kicker text-signal">{t('policy.kicker')}</p>
          <h1 className="mt-6 font-display text-[clamp(3.25rem,7.5vw,7rem)] font-normal leading-[0.98] tracking-[-0.02em] text-text">
            <span className="block overflow-hidden">
              <span className="plc-h-line block">{t('policy.h1a')}</span>
            </span>
            <span className="block overflow-hidden">
              <span className="plc-h-line block">
                {t('policy.h1bA')}
                <em className="italic text-signal">{t('policy.h1bEm')}</em>
                {t('policy.h1bB')}
              </span>
            </span>
          </h1>
          <p className="plc-h-fade mx-auto mt-6 max-w-[62ch] font-sans text-[15px] leading-relaxed text-text-muted">
            {t('policy.sub')}
          </p>
          <p className="plc-h-fade mt-6 font-mono text-[11px] tracking-[0.14em] text-faint">
            {t('policy.meta')}
          </p>
        </div>
      </div>

      {/* ---------------- S1 · The Rulebook: four fronts ---------------- */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-container px-[clamp(20px,4vw,48px)] py-24">
          <KickerLine chapter="01" label={t('policy.frontKicker')} color={SIGNAL} />
          <h2 className="mt-5 mb-12 font-display text-[clamp(2.5rem,5vw,4.5rem)] font-normal leading-[1.02] text-text">
            {t('policy.frontHA')}
            <em className="italic text-signal">{t('policy.frontHEm')}</em>
            {t('policy.frontHB')}
          </h2>
          <div className="grid gap-5 md:grid-cols-2">
            {FRONTS.map((f, i) => (
              <Reveal key={f.key}>
                <div className="group relative flex h-full flex-col overflow-hidden border border-line bg-ink-900 p-6 transition-colors duration-200 hover:border-line-strong">
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    style={{
                      background:
                        'repeating-linear-gradient(to bottom, transparent 0 3px, rgba(255,91,69,0.03) 3px 4px)',
                    }}
                  />
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] tnum tracking-[0.14em] text-faint">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="rounded-sm border border-signal/50 px-2 py-[3px] font-mono text-[10px] tracking-[0.12em] text-signal">
                      {t(f.statusKey)}
                    </span>
                  </div>
                  <h3 className="mt-4 font-display text-[26px] leading-snug text-text">
                    {t(`policy.${f.key}.name`)}
                  </h3>
                  <p className="mt-4 flex-1 font-sans text-[14px] leading-relaxed text-text-muted">
                    {t(f.bodyKey)}
                  </p>
                  <p className="mt-5 border-t border-line pt-4 font-mono text-[10.5px] leading-relaxed tracking-[0.1em] text-faint">
                    {t(f.tagsKey)}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- S2 · Timeline ---------------- */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-container px-[clamp(20px,4vw,48px)] py-24">
          <KickerLine chapter="02" label={t('policy.timelineKicker')} color={SIGNAL} />
          <h2 className="mt-5 mb-12 font-display text-[clamp(2rem,4vw,3.25rem)] font-normal leading-[1.05] text-text">
            {t('policy.timelineHA')}
            <em className="italic text-signal">{t('policy.timelineHEm')}</em>
            {t('policy.timelineHB')}
          </h2>
          <PolicyTimeline
            events={events}
            relatedBrief={{
              num: 'No. 045',
              title: t('policyRel.045.title'),
              to: '/briefs/battery-passport-t-minus-200',
            }}
          />
        </div>
      </section>

      {/* ---------------- S3 · Editor's read ---------------- */}
      <section
        className="border-b border-line"
        style={{ background: 'linear-gradient(90deg, rgba(255,91,69,0.05), var(--volt-dim))' }}
      >
        <div className="mx-auto max-w-container px-[clamp(20px,4vw,48px)] py-24">
          <KickerLine chapter="03" label={t('policy.readKicker')} color={SIGNAL} />
          <h2 className="mt-5 mb-8 font-display text-[clamp(2.5rem,5vw,4.5rem)] font-normal leading-[1.02] text-text">
            {t('policy.readHA')}
            <em className="italic text-signal">{t('policy.readHEm')}</em>
            {t('policy.readHB')}
          </h2>
          <Reveal>
            <div className="flex flex-col gap-4 border-l-2 border-signal pl-6">
              {[1, 2, 3].map((n) => (
                <p key={n} className="font-sans text-[16px] leading-[1.75] text-text">
                  {t(`policy.r${n}`)}
                </p>
              ))}
              <p className="pt-2 font-mono text-[11px] tracking-[0.1em] text-faint">
                {t('policy.readDisclaim')}
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------------- S4 · Related briefs + CTA ---------------- */}
      <section>
        <div className="mx-auto max-w-container px-[clamp(20px,4vw,48px)] py-24">
          <KickerLine chapter="04" label={t('policy.relatedKicker')} color={SIGNAL} className="mb-10" />
          <RelatedBriefs
            items={[
              {
                num: 'No. 045',
                title: t('policyRel.045.title'),
                dek: t('policyRel.045.dek'),
                to: '/briefs/battery-passport-t-minus-200',
                cover: '/cover-045.png',
                minutes: 13,
              },
              {
                num: 'No. 049',
                title: t('policyRel.049.title'),
                dek: t('policyRel.049.dek'),
                to: '/briefs/the-scoreboard',
                cover: '/cover-049.svg',
                minutes: 14,
              },
              {
                num: 'No. 048',
                title: t('policyRel.048.title'),
                dek: t('policyRel.048.dek'),
                to: '/briefs/the-re-export-ring',
                cover: '/cover-048.svg',
                minutes: 14,
              },
            ]}
          />
        </div>
        <div className="border-t border-line bg-[rgba(255,91,69,0.06)]">
          <div className="mx-auto flex max-w-container flex-col items-start justify-between gap-6 px-[clamp(20px,4vw,48px)] py-16 lg:flex-row lg:items-center">
            <div>
              <h2 className="font-display text-[30px] leading-tight text-text">
                {t('policy.ctaA')}
                <em className="italic text-signal">{t('policy.ctaEm')}</em>
                {t('policy.ctaB')}
              </h2>
              <p className="mt-2 font-mono text-[11px] tracking-[0.14em] text-text-muted">
                {t('policy.ctaSub')}
              </p>
            </div>
            <CBBButton to="/pricing">{t('policy.ctaButton')}</CBBButton>
          </div>
        </div>
      </section>
    </>
  )
}
