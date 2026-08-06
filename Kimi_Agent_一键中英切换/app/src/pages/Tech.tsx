import { useEffect, useRef, useState } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from '@/lib/gsap'
import KickerLine from '@/components/KickerLine'
import CBBButton from '@/components/Buttons'
import TechBattle, { type TechBattleHandle } from '@/components/intel/TechBattle'
import TechTimeline from '@/components/intel/TechTimeline'
import CompanyBets from '@/components/intel/CompanyBets'
import TechGlossary from '@/components/intel/TechGlossary'
import RelatedBriefs from '@/components/intel/RelatedBriefs'
import { cn } from '@/lib/utils'
import { useLang } from '@/i18n/lang'

/* tech.md — Tech Routes: LFP vs Solid-State (/tech) */

/** Small count-up numeral (tabular), GSAP-driven, triggers on visibility. */
function TapeNumber({
  value,
  prefix = '',
  suffix = '',
  color,
}: {
  value: number
  prefix?: string
  suffix?: string
  color: string
}) {
  const rootRef = useRef<HTMLSpanElement>(null)
  const numRef = useRef<HTMLSpanElement>(null)

  useGSAP(
    () => {
      if (!numRef.current) return
      const counter = { v: 0 }
      gsap.to(counter, {
        v: value,
        duration: 1.2,
        ease: 'expo.out',
        scrollTrigger: { trigger: rootRef.current, start: 'top 85%', once: true },
        onUpdate: () => {
          if (numRef.current) numRef.current.textContent = Math.round(counter.v).toLocaleString('en-US')
        },
      })
    },
    { scope: rootRef, dependencies: [value] },
  )

  return (
    <span ref={rootRef} className="font-mono text-[15px] tnum tracking-wide" style={{ color }}>
      {prefix}
      <span ref={numRef}>0</span>
      {suffix}
    </span>
  )
}

const LFP_STATS = [
  { value: 52, prefix: '≈$', suffix: '/KWH CELL' },
  { value: 205, prefix: '190–', suffix: ' WH/KG' },
  { value: 6000, suffix: ' CYCLES' },
]
const SSB_STATS = [
  { value: 180, prefix: '≈$', suffix: '+/KWH PILOT' },
  { value: 500, prefix: '350–', suffix: ' WH/KG TARGET' },
  { value: 1500, prefix: '800–', suffix: ' CYCLES (PROTO)' },
]

export default function Tech() {
  const { t } = useLang()
  const headerRef = useRef<HTMLDivElement>(null)
  const tapeRef = useRef<HTMLDivElement>(null)
  const battleRef = useRef<TechBattleHandle>(null)
  const [hoverSide, setHoverSide] = useState<'lfp' | 'ssb' | null>(null)

  useEffect(() => {
    document.title = 'Tech Routes: LFP vs Solid-State — China Battery Brief'
  }, [])

  /* S0 header: line-mask reveals + meta fade */
  useGSAP(
    () => {
      gsap.fromTo(
        '.tech-h-line',
        { y: '110%' },
        { y: '0%', duration: 0.9, stagger: 0.11, ease: 'expo.out', delay: 0.15 },
      )
      gsap.fromTo(
        '.tech-h-fade',
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.8, stagger: 0.12, ease: 'expo.out', delay: 0.5 },
      )
    },
    { scope: headerRef },
  )

  /* S1 tape: halves wipe in from their edges; VS badge springs in */
  useGSAP(
    () => {
      gsap.fromTo(
        '.tape-left',
        { clipPath: 'inset(0 100% 0 0)' },
        {
          clipPath: 'inset(0 0% 0 0)',
          duration: 0.9,
          ease: 'expo.out',
          scrollTrigger: { trigger: tapeRef.current, start: 'top 75%', once: true },
        },
      )
      gsap.fromTo(
        '.tape-right',
        { clipPath: 'inset(0 0 0 100%)' },
        {
          clipPath: 'inset(0 0 0 0%)',
          duration: 0.9,
          ease: 'expo.out',
          scrollTrigger: { trigger: tapeRef.current, start: 'top 75%', once: true },
        },
      )
      gsap.fromTo(
        '.tape-vs',
        { scale: 0 },
        {
          scale: 1,
          duration: 0.6,
          delay: 0.5,
          ease: 'back.out(2.2)',
          scrollTrigger: { trigger: tapeRef.current, start: 'top 75%', once: true },
        },
      )
    },
    { scope: tapeRef },
  )

  const halfCls = (side: 'lfp' | 'ssb') =>
    cn(
      'relative flex-1 cursor-pointer px-6 py-10 transition-opacity duration-300 lg:px-12',
      hoverSide && hoverSide !== side ? 'opacity-60' : 'opacity-100',
    )

  return (
    <>
      {/* ---------------- S0 · Header ---------------- */}
      <div ref={headerRef} className="border-b border-line">
        <div className="mx-auto max-w-[900px] px-[clamp(20px,4vw,48px)] pb-16 pt-40 text-center">
          <p className="tech-h-fade kicker text-lithium">{t('tech.kicker')}</p>
          <h1 className="mt-6 font-display text-[clamp(3.25rem,7.5vw,7rem)] font-normal leading-[0.98] tracking-[-0.02em] text-text">
            <span className="block overflow-hidden">
              <span className="tech-h-line block">{t('tech.h1a')}</span>
            </span>
            <span className="block overflow-hidden">
              <span className="tech-h-line block">
                {t('tech.h1bA')}
                <em className="italic text-lithium">{t('tech.h1bEm')}</em>
                {t('tech.h1bB')}
              </span>
            </span>
          </h1>
          <p className="mt-4 overflow-hidden font-display text-[clamp(2.5rem,5vw,4.5rem)] font-normal italic leading-[1.02] text-lithium">
            <span className="tech-h-line block">{t('tech.h1c')}</span>
          </p>
          <p className="tech-h-fade mx-auto mt-6 max-w-[62ch] font-sans text-[15px] leading-relaxed text-text-muted">
            {t('tech.sub')}
          </p>
          <p className="tech-h-fade mt-6 font-mono text-[11px] tracking-[0.14em] text-faint">
            {t('tech.meta')}
          </p>
        </div>
      </div>

      {/* ---------------- S1 · Tale of the tape ---------------- */}
      <div ref={tapeRef} className="relative border-b border-line">
        <div className="flex flex-col lg:flex-row" onMouseLeave={() => setHoverSide(null)}>
          {/* LFP half */}
          <div
            className={cn(halfCls('lfp'), 'tape-left bg-volt-dim')}
            onMouseEnter={() => setHoverSide('lfp')}
            onClick={() => battleRef.current?.scrollToChapter(0)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && battleRef.current?.scrollToChapter(0)}
          >
            <p className="kicker text-volt">{t('tech.incumbent')}</p>
            <h2 className="mt-3 font-display text-[36px] leading-none text-text">LFP</h2>
            <p className="mt-2 font-mono text-[12px] tracking-[0.14em] text-faint">LiFePO₄ · OLIVINE</p>
            <div className="mt-6 flex flex-col gap-2">
              {LFP_STATS.map((s, i) => (
                <TapeNumber key={i} {...s} color="var(--volt)" />
              ))}
            </div>
          </div>
          {/* seam */}
          <div aria-hidden className="h-px w-full bg-line-strong lg:h-auto lg:w-px" />
          {/* SSB half */}
          <div
            className={cn(halfCls('ssb'), 'tape-right bg-[rgba(90,223,195,0.07)] lg:text-right')}
            onMouseEnter={() => setHoverSide('ssb')}
            onClick={() => battleRef.current?.scrollToChapter(1)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && battleRef.current?.scrollToChapter(1)}
          >
            <p className="kicker text-lithium">{t('tech.challenger')}</p>
            <h2 className="mt-3 font-display text-[36px] leading-none text-text">SOLID-STATE</h2>
            <p className="mt-2 font-mono text-[12px] tracking-[0.14em] text-faint">LLZO · Li₆PS₅Cl</p>
            <div className="mt-6 flex flex-col gap-2 lg:items-end">
              {SSB_STATS.map((s, i) => (
                <TapeNumber key={i} {...s} color="var(--lithium)" />
              ))}
            </div>
          </div>
        </div>
        {/* VS badge (centered via negative margins so GSAP scale composes) */}
        <div className="tape-vs absolute left-1/2 top-1/2 z-10" style={{ marginLeft: -28, marginTop: -28, transform: 'scale(0)' }}>
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-line-strong bg-ink-950">
            <span className="font-mono text-[13px] font-semibold tracking-[0.14em] text-text">VS</span>
          </div>
        </div>
      </div>

      {/* ---------------- S2 · The Battle (pinned) ---------------- */}
      <section className="mx-auto max-w-container px-[clamp(20px,4vw,48px)] py-16 lg:px-0 lg:py-0 lg:max-w-none">
        <div className="lg:hidden">
          <KickerLine chapter="02" label={t('tech.battleKicker')} className="mb-8" />
        </div>
        <TechBattle ref={battleRef} />
      </section>

      {/* ---------------- S3 · Road to 2030 ---------------- */}
      <section className="border-t border-line">
        <div className="mx-auto max-w-container px-[clamp(20px,4vw,48px)] py-24">
          <KickerLine chapter="03" label={t('tech.roadKicker')} />
          <h2 className="mb-14 mt-5 font-display text-[clamp(2.5rem,5vw,4.5rem)] font-normal leading-[1.02] text-text">
            {t('tech.roadHA')}
            <em className="italic text-lithium">{t('tech.roadHEm')}</em>
            {t('tech.roadHB')}
          </h2>
          <TechTimeline />
        </div>
      </section>

      {/* ---------------- S4 · Company bets ---------------- */}
      <section className="border-t border-line">
        <div className="mx-auto max-w-container px-[clamp(20px,4vw,48px)] py-24">
          <KickerLine chapter="04" label={t('tech.betsKicker')} />
          <h2 className="mb-10 mt-5 font-display text-[clamp(2rem,4vw,3.25rem)] font-normal leading-[1.05] text-text">
            {t('tech.betsHA')}
            <em className="italic text-lithium">{t('tech.betsHEm')}</em>
            {t('tech.betsHB')}
          </h2>
          <CompanyBets />
        </div>
      </section>

      {/* ---------------- S5 · Glossary ---------------- */}
      <section className="border-t border-line">
        <div className="mx-auto max-w-container px-[clamp(20px,4vw,48px)] py-24">
          <KickerLine chapter="05" label={t('tech.glossaryKicker')} />
          <h2 className="mb-10 mt-5 font-display text-[clamp(2rem,4vw,3.25rem)] font-normal leading-[1.05] text-text">
            {t('tech.glossaryHA')}
            <em className="italic text-lithium">{t('tech.glossaryHEm')}</em>
            {t('tech.glossaryHB')}
          </h2>
          <TechGlossary />
        </div>
      </section>

      {/* ---------------- S6 · Related briefs + CTA ---------------- */}
      <section className="border-t border-line">
        <div className="mx-auto max-w-container px-[clamp(20px,4vw,48px)] py-24">
          <KickerLine chapter="06" label={t('tech.relatedKicker')} className="mb-10" />
          <RelatedBriefs
            items={[
              {
                num: 'No. 046',
                title: t('techRel.046.title'),
                dek: t('techRel.046.dek'),
                to: '/briefs/solid-state-2027-consensus',
                cover: '/cover-046.png',
                minutes: 14,
              },
              {
                num: 'No. 042',
                title: t('techRel.042.title'),
                dek: t('techRel.042.dek'),
                to: '/briefs',
                minutes: 12,
              },
              {
                num: 'No. 041',
                title: t('techRel.041.title'),
                dek: t('techRel.041.dek'),
                to: '/briefs/battery-passport-t-minus-200',
                minutes: 11,
              },
            ]}
          />
        </div>
        <div className="border-t border-line bg-[rgba(90,223,195,0.06)]">
          <div className="mx-auto flex max-w-container flex-col items-start justify-between gap-6 px-[clamp(20px,4vw,48px)] py-16 lg:flex-row lg:items-center">
            <div>
              <h2 className="font-display text-[30px] leading-tight text-text">
                {t('tech.ctaA')}
                <em className="italic text-lithium">{t('tech.ctaEm')}</em>
                {t('tech.ctaB')}
              </h2>
              <p className="mt-2 font-mono text-[11px] tracking-[0.14em] text-text-muted">
                {t('tech.ctaSub')}
              </p>
            </div>
            <CBBButton to="/pricing">{t('tech.ctaButton')}</CBBButton>
          </div>
        </div>
      </section>
    </>
  )
}
