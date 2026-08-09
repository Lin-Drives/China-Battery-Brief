import { useRef } from 'react'
import { Link } from 'react-router'
import { useGSAP } from '@gsap/react'
import { gsap } from '@/lib/gsap'
import StatBlock from '@/components/StatBlock'
import { useLang } from '@/i18n/lang'

type Panel = {
  index: string
  beatKey: string
  color: string
  hAKey: string
  hEmKey: string
  hBKey: string
  bodyKey: string
  stats: { value: number; labelKey: string; prefix?: string; suffix?: string }[]
  to: string
}

const PANELS: Panel[] = [
  {
    index: '01',
    beatKey: 'beat1.kicker',
    color: 'var(--volt)',
    hAKey: 'beat1.hA',
    hEmKey: 'beat1.hEm',
    hBKey: 'beat1.hB',
    bodyKey: 'beat1.body',
    stats: [
      { value: 47, labelKey: 'beat1.s1' },
      { value: 1240, labelKey: 'beat1.s2' },
      { value: 23, labelKey: 'beat1.s3' },
    ],
    to: '/tracker',
  },
  {
    index: '02',
    beatKey: 'beat2.kicker',
    color: 'var(--lithium)',
    hAKey: 'beat2.hA',
    hEmKey: 'beat2.hEm',
    hBKey: 'beat2.hB',
    bodyKey: 'beat2.body',
    stats: [
      { value: 52, labelKey: 'beat2.s1', prefix: '$' },
      { value: 350, labelKey: 'beat2.s2', suffix: '+' },
      { value: 7, labelKey: 'beat2.s3' },
    ],
    to: '/tech',
  },
  {
    index: '03',
    beatKey: 'beat3.kicker',
    color: 'var(--signal)',
    hAKey: 'beat3.hA',
    hEmKey: 'beat3.hEm',
    hBKey: 'beat3.hB',
    bodyKey: 'beat3.body',
    stats: [
      { value: 45, labelKey: 'beat3.s1', prefix: '$' },
      { value: 2027, labelKey: 'beat3.s2' },
      { value: 25, labelKey: 'beat3.s3', suffix: '%' },
    ],
    to: '/policy',
  },
  {
    index: '04',
    beatKey: 'beat4.kicker',
    color: 'var(--amber)',
    hAKey: 'beat4.hA',
    hEmKey: 'beat4.hEm',
    hBKey: 'beat4.hB',
    bodyKey: 'beat4.body',
    stats: [
      { value: 40.7, labelKey: 'beat4.s1', suffix: '%' },
      { value: 55, labelKey: 'beat4.s2', suffix: '%' },
      { value: 52, labelKey: 'beat4.s3', prefix: '$' },
    ],
    to: '/markets',
  },
]

/**
 * home.md S4 — "Three Beats, One Supply Chain".
 * Pinned ScrollTrigger scene on lg+ (scrub 0.6, +=300%); stacked sections below lg.
 */
export default function Pillars() {
  const { t } = useLang()
  const rootRef = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', () => {
        const panels = gsap.utils.toArray<HTMLElement>('.pillar-panel')
        panels.forEach((panel, i) => {
          gsap.set(panel, { clipPath: i === 0 ? 'inset(0% 0% 0% 0%)' : 'inset(0% 0% 0% 100%)' })
        })

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: '.pillar-stage',
            start: 'top top',
            end: '+=300%',
            pin: true,
            scrub: 0.6,
          },
        })

        panels.forEach((panel, i) => {
          if (i === 0) return
          // incoming panel clip-wipes in from the right
          tl.to(panel, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1, ease: 'none' }, (i - 1) * 1.2)
          // ghost numeral parallax
          tl.fromTo(
            panel.querySelector('.ghost-num'),
            { y: '10%' },
            { y: '-10%', duration: 1, ease: 'none' },
            (i - 1) * 1.2,
          )
        })
        // index rail progress hairline fills vertically
        tl.fromTo(
          '.rail-progress',
          { scaleY: 0 },
          { scaleY: 1, duration: (panels.length - 1) * 1.2, ease: 'none', transformOrigin: 'top center' },
          0,
        )
      })
    },
    { scope: rootRef },
  )

  return (
    <section ref={rootRef} className="border-t border-line">
      <div className="pillar-stage relative lg:h-screen lg:overflow-hidden">
        {/* Chapter index rail (lg+) */}
        <div className="absolute left-[clamp(20px,4vw,48px)] top-1/2 z-20 hidden -translate-y-1/2 flex-col items-center gap-3 lg:flex">
          {PANELS.map((p) => (
            <span key={p.index} className="font-mono text-[11px] tracking-[0.16em] text-faint">
              {p.index}
            </span>
          ))}
          <span aria-hidden className="relative block h-24 w-px bg-line">
            <span className="rail-progress absolute inset-0 bg-volt" />
          </span>
        </div>

        {PANELS.map((panel) => (
          <div
            key={panel.index}
            className="pillar-panel relative flex items-center bg-ink-950 py-24 lg:absolute lg:inset-0 lg:py-0"
          >
            {/* Giant ghost numeral */}
            <span
              aria-hidden
              className="ghost-num pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 select-none font-display text-[40vw] font-light leading-none text-text opacity-[0.06] lg:text-[24vw]"
            >
              {panel.index}
            </span>

            <div className="relative z-10 mx-auto w-full max-w-container px-[clamp(20px,4vw,48px)] lg:pl-32">
              <p className="kicker" style={{ color: panel.color }}>
                {t(panel.beatKey)}
              </p>
              <h2 className="mt-6 max-w-3xl font-display text-[clamp(2.5rem,5vw,4.5rem)] font-normal leading-[1.02] tracking-[-0.015em] text-text">
                {t(panel.hAKey)}
                <em className="italic" style={{ color: panel.color }}>
                  {t(panel.hEmKey)}
                </em>
                {t(panel.hBKey)}
              </h2>
              <p className="mt-6 max-w-xl font-sans text-base leading-[1.65] text-text-muted">
                {t(panel.bodyKey)}
              </p>

              <div className="mt-10 grid max-w-2xl grid-cols-1 gap-6 sm:grid-cols-3">
                {panel.stats.map((s) => (
                  <div key={s.labelKey} className="border border-line p-4">
                    <StatBlock
                      value={s.value}
                      label={t(s.labelKey)}
                      prefix={s.prefix}
                      suffix={s.suffix}
                      color={panel.color}
                    />
                  </div>
                ))}
              </div>

              <Link
                to={panel.to}
                className="mt-10 inline-block font-mono text-[12px] font-semibold uppercase tracking-[0.1em] transition-transform duration-200 hover:translate-x-1"
                style={{ color: panel.color }}
              >
                {t('beat.explore')}
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
