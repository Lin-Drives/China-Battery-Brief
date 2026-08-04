import { forwardRef, useImperativeHandle, useMemo, useRef, useState, useEffect } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap, ScrollTrigger } from '@/lib/gsap'
import { cn } from '@/lib/utils'
import { useLang, tpl } from '@/i18n/lang'

/* ------------------------------------------------------------------ */
/* tech.md S2 — "The Battle": pinned scroll tug-of-war between LFP and */
/* solid-state across six metrics. Pin duration 400vh, scrub 0.6.      */
/* Under lg / reduced-motion: unpinned stacked metric cards.           */
/* ------------------------------------------------------------------ */

interface Metric {
  key: string
  lfp: string
  ssb: string
  /** marker target, -1 (hard left/LFP) … +1 (hard right/SSB) */
  pos: number
  note: string
  winner: 'lfp' | 'ssb' | 'draw'
  wiggle?: boolean
  slam?: boolean
}

const METRICS: Metric[] = [
  {
    key: 'COST',
    lfp: '$52/kWh',
    ssb: '$180+/kWh (pilot best-case)',
    pos: -1,
    winner: 'lfp',
    note: 'SSB NEEDS ~3× COST-OUT TO COMPETE AT PACK LEVEL',
  },
  {
    key: 'ENERGY DENSITY',
    lfp: '205 Wh/kg',
    ssb: '350–500 Wh/kg target',
    pos: 1,
    winner: 'ssb',
    note: 'THE ENTIRE SSB THESIS LIVES HERE',
  },
  {
    key: 'CYCLE LIFE',
    lfp: '6,000',
    ssb: '800–1,500 (proto)',
    pos: -0.85,
    winner: 'lfp',
    note: 'SULFIDE INTERFACES DEGRADE; OXIDES CRACK UNDER PRESSURE',
  },
  {
    key: 'SAFETY',
    lfp: 'RUNAWAY ~270°C, RARE',
    ssb: 'NO FLAMMABLE LIQUID, BUT LI-METAL DENDRITES',
    pos: -0.25,
    winner: 'draw',
    wiggle: true,
    note: 'VERDICT: JURY OUT',
  },
  {
    key: 'FAST CHARGE',
    lfp: '4C (SHENXING)',
    ssb: 'UNPROVEN AT PRESSURE',
    pos: -0.9,
    winner: 'lfp',
    note: 'SHENXING DOES 10→80% IN ~12 MIN; SSB STACK PRESSURE UNSETTLED',
  },
  {
    key: 'SUPPLY CHAIN MATURITY',
    lfp: '95%',
    ssb: '15%',
    pos: -1,
    winner: 'lfp',
    slam: true,
    note: 'SCORE: 4–1–1. THE FORK IS REAL — BUT NOT THIS DECADE FOR MASS MARKET',
  },
]

/** Mini tug-bar widths for the stacked (mobile) cards: [lfp %, ssb %] */
const MOBILE_BARS: [number, number][] = [
  [92, 26],
  [42, 95],
  [95, 30],
  [58, 52],
  [88, 22],
  [95, 15],
]

export interface TechBattleHandle {
  scrollToChapter: (i: number) => void
}

const TechBattle = forwardRef<TechBattleHandle>(function TechBattle(_, ref) {
  const { t } = useLang()
  const wrapRef = useRef<HTMLDivElement>(null)
  const markerRef = useRef<HTMLDivElement>(null)
  const centerColRef = useRef<HTMLDivElement>(null)
  const lfpImgRef = useRef<HTMLImageElement>(null)
  const ssbImgRef = useRef<HTMLImageElement>(null)
  const takeawayRef = useRef<HTMLDivElement>(null)
  const labelRefs = useRef<(HTMLDivElement | null)[]>([])
  const panelRefs = useRef<(HTMLDivElement | null)[]>([])
  const dotRefs = useRef<(HTMLButtonElement | null)[]>([])
  const tlRef = useRef<gsap.core.Timeline | null>(null)
  const stackedRef = useRef<HTMLDivElement>(null)

  const reducedMotion = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  )
  const [pinned, setPinned] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(min-width: 1024px)').matches &&
      !reducedMotion,
  )

  useEffect(() => {
    if (reducedMotion) return
    const mq = window.matchMedia('(min-width: 1024px)')
    const onChange = () => setPinned(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [reducedMotion])

  /* Pinned scroll scene (lg+, motion allowed) */
  useGSAP(
    () => {
      if (!pinned) return
      const marker = markerRef.current
      const centerCol = centerColRef.current
      if (!marker || !centerCol || !wrapRef.current) return

      const maxX = () => Math.max(60, centerCol.offsetWidth / 2 - 20)

      const tl = gsap.timeline({
        defaults: { ease: 'power2.inOut' },
        scrollTrigger: {
          trigger: wrapRef.current,
          start: 'top top',
          end: '+=400%',
          pin: true,
          scrub: 0.6,
        },
      })
      tlRef.current = tl

      gsap.set(marker, { x: 0 })
      if (takeawayRef.current) gsap.set(takeawayRef.current, { autoAlpha: 0, scale: 0.92, y: 24 })

      METRICS.forEach((m, i) => {
        const at = i
        // metric label crossfade
        if (i > 0) tl.to(labelRefs.current[i - 1], { autoAlpha: 0, duration: 0.15 }, at)
        tl.fromTo(labelRefs.current[i], { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.15 }, at)
        // stat panel slide-up
        if (i > 0) tl.to(panelRefs.current[i - 1], { autoAlpha: 0, y: -24, duration: 0.2 }, at)
        tl.fromTo(
          panelRefs.current[i],
          { autoAlpha: 0, y: 40 },
          { autoAlpha: 1, y: 0, duration: 0.25 },
          at + 0.05,
        )
        // progress dot
        tl.to(dotRefs.current[i], { backgroundColor: '#C9F24B', scale: 1.3, duration: 0.15 }, at)

        // tug marker
        const tx = m.pos * maxX()
        if (m.wiggle) {
          // safety: oscillate ±6% twice, then settle center-left
          tl.to(marker, { x: tx + maxX() * 0.06, duration: 0.12, ease: 'sine.inOut' }, at + 0.1)
          tl.to(marker, { x: tx - maxX() * 0.06, duration: 0.24, ease: 'sine.inOut' }, at + 0.22)
          tl.to(marker, { x: tx + maxX() * 0.06, duration: 0.24, ease: 'sine.inOut' }, at + 0.46)
          tl.to(marker, { x: tx, duration: 0.3, ease: 'sine.out' }, at + 0.7)
        } else if (m.slam) {
          // supply chain: slam left + 200ms shake
          tl.to(marker, { x: tx, duration: 0.14, ease: 'power4.in' }, at + 0.1)
          tl.to(marker, {
            keyframes: [{ x: tx + 9 }, { x: tx - 7 }, { x: tx + 4 }, { x: tx }],
            duration: 0.2,
            ease: 'none',
          }, at + 0.24)
        } else {
          tl.to(marker, { x: tx, duration: 0.6, ease: 'power2.inOut' }, at + 0.1)
        }

        // image grades: winner brightens +15%, loser desaturates 20%
        const lfpFilter =
          m.winner === 'lfp'
            ? 'brightness(1.15) saturate(1)'
            : m.winner === 'ssb'
              ? 'brightness(0.9) saturate(0.8)'
              : 'brightness(1) saturate(0.9)'
        const ssbFilter =
          m.winner === 'ssb'
            ? 'brightness(1.15) saturate(1)'
            : m.winner === 'lfp'
              ? 'brightness(0.9) saturate(0.8)'
              : 'brightness(1) saturate(0.9)'
        tl.to(lfpImgRef.current, { filter: lfpFilter, duration: 0.6 }, at)
        tl.to(ssbImgRef.current, { filter: ssbFilter, duration: 0.6 }, at)
      })

      // Exit: note expands into takeaway card; marker springs back to center
      tl.to(panelRefs.current[METRICS.length - 1], { autoAlpha: 0, y: -24, duration: 0.25 }, 6)
      tl.to(
        takeawayRef.current,
        { autoAlpha: 1, scale: 1, y: 0, duration: 0.45, ease: 'expo.out' },
        6.15,
      )
      tl.to(marker, { x: 0, duration: 1, ease: 'elastic.out(1, 0.45)' }, 6.15)

      ScrollTrigger.refresh()
    },
    { scope: wrapRef, dependencies: [pinned] },
  )

  /* Stacked cards entry animation (< lg / reduced motion) */
  useGSAP(
    () => {
      if (pinned || !stackedRef.current) return
      const cards = gsap.utils.toArray<HTMLElement>('.metric-card', stackedRef.current)
      cards.forEach((card) => {
        gsap.fromTo(
          card,
          { y: 32, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.7,
            ease: 'expo.out',
            scrollTrigger: { trigger: card, start: 'top 85%', once: true },
          },
        )
        const bars = card.querySelectorAll('.tug-fill')
        gsap.fromTo(
          bars,
          { scaleX: 0 },
          {
            scaleX: (_i, el) => Number((el as HTMLElement).dataset.w ?? 0) / 100,
            duration: 0.9,
            ease: 'expo.out',
            stagger: 0.12,
            scrollTrigger: { trigger: card, start: 'top 80%', once: true },
          },
        )
      })
    },
    { scope: stackedRef, dependencies: [pinned] },
  )

  useImperativeHandle(ref, () => ({
    scrollToChapter: (i: number) => {
      const st = tlRef.current?.scrollTrigger
      if (st && pinned) {
        const target = st.start + ((i + 0.35) / 7) * (st.end - st.start)
        window.scrollTo({ top: target, behavior: 'smooth' })
      } else {
        wrapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    },
  }))

  return (
    <>
      {/* ---------------- pinned stage (lg+) ---------------- */}
      {pinned && (
        <div ref={wrapRef} className="relative">
          <div className="relative flex h-[100dvh] flex-col overflow-hidden">
            {/* columns */}
            <div className="relative flex flex-1">
              {/* LFP */}
              <div className="relative flex-1 border-r border-line">
                <img
                  ref={lfpImgRef}
                  src="/tech-lfp.png"
                  alt="LFP olivine crystal lattice blueprint"
                  className="absolute inset-0 h-full w-full object-cover opacity-70"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-transparent to-ink-950/60" />
                <div className="absolute left-6 top-6">
                  <p className="kicker text-volt">{t('tech.incumbent')} — LFP</p>
                  <p className="mt-1 font-mono text-[11px] tracking-[0.12em] text-faint">LiFePO₄ · OLIVINE</p>
                </div>
              </div>
              {/* SSB */}
              <div className="relative flex-1 border-l border-line">
                <img
                  ref={ssbImgRef}
                  src="/tech-ssb.png"
                  alt="Sulfide solid-state electrolyte stack blueprint"
                  className="absolute inset-0 h-full w-full object-cover opacity-70"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-transparent to-ink-950/60" />
                <div className="absolute right-6 top-6 text-right">
                  <p className="kicker text-lithium">{t('tech.challenger')} — SOLID-STATE</p>
                  <p className="mt-1 font-mono text-[11px] tracking-[0.12em] text-faint">LLZO · Li₆PS₅Cl</p>
                </div>
              </div>

              {/* center column: rail + marker + labels */}
              <div
                ref={centerColRef}
                className="absolute inset-y-0 left-1/2 z-10 w-[280px] -translate-x-1/2"
              >
                {/* vertical rail */}
                <div className="absolute inset-y-8 left-1/2 w-[2px] -translate-x-1/2 bg-line-strong" />
                {/* metric labels (crossfade) */}
                <div className="absolute left-1/2 top-1/2 w-[240px] -translate-x-1/2 -translate-y-1/2">
                  {METRICS.map((m, i) => (
                    <div
                      key={m.key}
                      ref={(el) => {
                        labelRefs.current[i] = el
                      }}
                      className="absolute inset-x-0 top-0 text-center opacity-0"
                      style={{ visibility: 'hidden' }}
                    >
                      <p className="font-mono text-[12px] tracking-[0.2em] text-text">
                        {String(i + 1).padStart(2, '0')} / {m.key}
                      </p>
                    </div>
                  ))}
                </div>
                {/* tug marker (centered via negative margins so GSAP x transforms compose) */}
                <div
                  ref={markerRef}
                  className="absolute left-1/2 top-1/2 z-20"
                  style={{ marginLeft: -8, marginTop: -8 }}
                >
                  <div className="h-4 w-4 rounded-full bg-volt shadow-[0_0_16px_rgba(201,242,75,0.7)]" />
                </div>
              </div>
            </div>

            {/* stat panels (center-bottom) */}
            <div className="pointer-events-none absolute inset-x-0 bottom-20 z-20 flex justify-center">
              {METRICS.map((m, i) => (
                <div
                  key={m.key}
                  ref={(el) => {
                    panelRefs.current[i] = el
                  }}
                  className="absolute bottom-0 w-[min(520px,90%)] rounded-sm border border-line-strong bg-ink-900/95 p-5 opacity-0 backdrop-blur-sm"
                  style={{ visibility: 'hidden' }}
                >
                  <p className="font-mono text-[10.5px] tracking-[0.18em] text-faint">
                    {tpl(t('tb.metric'), { n: String(i + 1).padStart(2, '0'), key: m.key })}
                  </p>
                  <div className="mt-3 flex items-baseline justify-between gap-6">
                    <div>
                      <p className={cn('font-display text-[26px] leading-tight', m.winner === 'lfp' ? 'text-volt' : 'text-text')}>
                        {m.lfp}
                      </p>
                      <p className="kicker mt-1 text-faint">LFP</p>
                    </div>
                    <div className="text-right">
                      <p className={cn('font-display text-[26px] leading-tight', m.winner === 'ssb' ? 'text-lithium' : 'text-text')}>
                        {m.ssb}
                      </p>
                      <p className="kicker mt-1 text-faint">SOLID-STATE</p>
                    </div>
                  </div>
                  <p className="mt-3 border-t border-line pt-3 font-mono text-[10.5px] leading-relaxed tracking-[0.08em] text-text-muted">
                    {m.note}
                  </p>
                </div>
              ))}
              {/* takeaway card (exit) */}
              <div
                ref={takeawayRef}
                className="absolute bottom-0 w-[min(560px,92%)] rounded-sm border border-volt/50 bg-ink-900/95 p-6 backdrop-blur-sm"
              >
                <p className="kicker text-volt">{t('tb.scorecard')}</p>
                <p className="mt-3 font-display text-[24px] leading-snug text-text">
                  The fork is real — but not this decade for the <em className="italic text-lithium">mass market</em>.
                </p>
                <p className="mt-2 font-mono text-[10.5px] leading-relaxed tracking-[0.06em] text-text-muted">
                  LFP HOLDS COST, CYCLES, FAST CHARGE AND SUPPLY CHAIN. SOLID-STATE WINS THE ONLY
                  METRIC THAT COULD MATTER LONG-TERM — DENSITY — AND TIES ON SAFETY. WE REVISE WEEKLY.
                </p>
              </div>
            </div>

            {/* progress dots */}
            <div className="absolute bottom-8 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3">
              {METRICS.map((m, i) => (
                <button
                  key={m.key}
                  ref={(el) => {
                    dotRefs.current[i] = el
                  }}
                  type="button"
                  aria-label={tpl(t('tb.jump'), { key: m.key })}
                  onClick={() => {
                    const st = tlRef.current?.scrollTrigger
                    if (!st) return
                    const target = st.start + ((i + 0.35) / 7) * (st.end - st.start)
                    window.scrollTo({ top: target, behavior: 'smooth' })
                  }}
                  className="h-2 w-2 rounded-full bg-ink-700 transition-colors hover:bg-volt"
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ---------------- stacked cards (< lg / reduced motion) ---------------- */}
      {!pinned && (
        <div ref={stackedRef} className="flex flex-col gap-5">
          {METRICS.map((m, i) => (
            <div key={m.key} className="metric-card rounded-sm border border-line bg-ink-900 p-5">
              <div className="flex items-baseline justify-between">
                <p className="font-mono text-[10.5px] tracking-[0.18em] text-faint">
                  {String(i + 1).padStart(2, '0')} / {m.key}
                </p>
                <p className="font-mono text-[10px] tracking-[0.14em]" style={{ color: m.winner === 'lfp' ? 'var(--volt)' : m.winner === 'ssb' ? 'var(--lithium)' : 'var(--amber)' }}>
                  {m.winner === 'draw' ? t('tb.juryOut') : m.winner === 'lfp' ? t('tb.pointLfp') : t('tb.pointSsb')}
                </p>
              </div>
              <div className="mt-4 flex flex-col gap-3">
                <div>
                  <div className="flex items-baseline justify-between">
                    <span className="font-display text-[20px] text-volt">{m.lfp}</span>
                    <span className="kicker text-faint">LFP</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink-700">
                    <div className="tug-fill h-full origin-left rounded-full bg-volt" data-w={MOBILE_BARS[i][0]} />
                  </div>
                </div>
                <div>
                  <div className="flex items-baseline justify-between">
                    <span className="font-display text-[20px] text-lithium">{m.ssb}</span>
                    <span className="kicker text-faint">SOLID-STATE</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink-700">
                    <div className="tug-fill h-full origin-left rounded-full bg-lithium" data-w={MOBILE_BARS[i][1]} />
                  </div>
                </div>
              </div>
              <p className="mt-4 border-t border-line pt-3 font-mono text-[10.5px] leading-relaxed tracking-[0.06em] text-text-muted">
                {m.note}
              </p>
            </div>
          ))}
          {/* takeaway */}
          <div className="metric-card rounded-sm border border-volt/50 bg-ink-900 p-6">
            <p className="kicker text-volt">{t('tb.scorecard')}</p>
            <p className="mt-3 font-display text-[22px] leading-snug text-text">
              The fork is real — but not this decade for the <em className="italic text-lithium">mass market</em>.
            </p>
          </div>
        </div>
      )}
    </>
  )
})

export default TechBattle
