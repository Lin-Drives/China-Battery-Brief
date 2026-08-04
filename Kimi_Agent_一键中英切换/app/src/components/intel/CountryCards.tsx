import { useRef } from 'react'
import { useNavigate } from 'react-router'
import { useGSAP } from '@gsap/react'
import { gsap } from '@/lib/gsap'
import { zoneColor } from '@/components/intel/intel-utils'
import { cn } from '@/lib/utils'
import { useLang, tpl } from '@/i18n/lang'
import { pick } from '@/i18n/format'

/* ------------------------------------------------------------------ */
/* geopolitics.md S4 — country exposure cards.                         */
/* ------------------------------------------------------------------ */

export interface CountryExposure {
  code: string
  name: string
  nameZh?: string
  score: number
  status: string
  sites: number
  gwhAtRisk: number
  lastEvent: string
  lastEventZh?: string
}

export default function CountryCards({ countries }: { countries: CountryExposure[] }) {
  const { t, lang } = useLang()
  const rootRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useGSAP(
    () => {
      const cards = gsap.utils.toArray<HTMLElement>('.exposure-card', rootRef.current)
      gsap.fromTo(
        cards,
        { y: 28, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          stagger: 0.08,
          ease: 'expo.out',
          scrollTrigger: { trigger: rootRef.current, start: 'top 80%', once: true },
        },
      )
      const bars = gsap.utils.toArray<HTMLElement>('.exposure-fill', rootRef.current)
      bars.forEach((bar, i) => {
        gsap.fromTo(
          bar,
          { scaleX: 0 },
          {
            scaleX: Number(bar.dataset.w ?? 0) / 100,
            duration: 1,
            delay: 0.2 + i * 0.08,
            ease: 'expo.out',
            scrollTrigger: { trigger: rootRef.current, start: 'top 80%', once: true },
          },
        )
      })
    },
    { scope: rootRef, dependencies: [countries.length] },
  )

  return (
    <div ref={rootRef} className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
      {countries.map((c) => {
        const color = zoneColor(c.score)
        const hot = c.score > 70
        return (
          <button
            key={c.code}
            type="button"
            onClick={() => navigate(`/tracker?country=${c.code}`)}
            className="exposure-card group flex flex-col border border-line bg-ink-900 p-5 text-left transition-all duration-200 hover:-translate-y-1 hover:border-line-strong"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[12px] font-semibold tracking-[0.16em] text-text-muted">
                {c.code}
              </span>
              {/* abstract flag-adjacent color bar (3px gradient) */}
              <span
                className={cn('h-[3px] w-16', hot && 'animate-breathe')}
                style={{ background: `linear-gradient(90deg, ${color}, transparent)` }}
              />
            </div>
            <h3 className="mt-3 font-display text-[22px] leading-snug text-text">{pick(lang, c.nameZh, c.name)}</h3>

            {/* exposure score */}
            <div className="mt-4 flex items-baseline gap-2">
              <span className="font-mono text-[24px] tnum leading-none" style={{ color }}>
                {c.score}
              </span>
              <span className="font-mono text-[10px] tracking-[0.14em] text-faint">{t('cc.exposure')}</span>
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-ink-700">
              <div
                className="exposure-fill h-full origin-left rounded-full"
                data-w={c.score}
                style={{ backgroundColor: color, transform: 'scaleX(0)' }}
              />
            </div>

            <p className="mt-4 flex-1 font-sans text-[13px] leading-relaxed text-text-muted">
              {pick(lang, c.lastEventZh, c.lastEvent)}
            </p>

            <p className="mt-4 border-t border-line pt-3 font-mono text-[10.5px] tracking-[0.1em] text-faint">
              {tpl(t('cc.stats'), { sites: c.sites, gwh: c.gwhAtRisk })}
              <span className="ml-2 text-volt opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                {t('cc.toTracker')}
              </span>
            </p>
          </button>
        )
      })}
    </div>
  )
}
