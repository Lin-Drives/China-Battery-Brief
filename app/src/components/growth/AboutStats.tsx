import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from '@/lib/gsap'
import StatBlock from '@/components/StatBlock'
import { useLang } from '@/i18n/lang'

/** Decimal twin of the shared StatBlock — counts to one decimal place (1.3%). */
function DecimalStat({
  value,
  label,
  note,
  href,
}: {
  value: number
  label: string
  note?: string
  href?: string
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const numRef = useRef<HTMLSpanElement>(null)

  useGSAP(
    () => {
      if (!numRef.current) return
      const counter = { v: 0 }
      gsap.to(counter, {
        v: value,
        duration: 1.4,
        ease: 'expo.out',
        scrollTrigger: { trigger: rootRef.current, start: 'top 85%', once: true },
        onUpdate: () => {
          if (numRef.current) numRef.current.textContent = counter.v.toFixed(1)
        },
      })
    },
    { scope: rootRef, dependencies: [value] },
  )

  return (
    <div ref={rootRef} className="flex flex-col gap-1.5">
      <div className="flex items-baseline gap-2">
        <span className="font-display text-[clamp(2rem,3.5vw,3rem)] font-light leading-none text-text tnum">
          <span ref={numRef}>0.0</span>%
        </span>
      </div>
      <span className="kicker text-faint">{label}</span>
      {note && (
        <a
          href={href}
          className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-volt transition-opacity hover:opacity-80"
        >
          {note}
        </a>
      )}
    </div>
  )
}

/** about.md S1 — the numbers: 4-cell hairline stat band */
export default function AboutStats() {
  const { t } = useLang()
  return (
    <section className="border-b border-line">
      <div className="mx-auto grid max-w-container grid-cols-2 lg:grid-cols-4">
        <div className="border-b border-r border-line px-6 py-10 lg:border-b-0">
          <StatBlock value={62} label={t('about.stat1')} />
        </div>
        <div className="border-b border-line px-6 py-10 lg:border-b-0 lg:border-r">
          <StatBlock value={410} suffix="K" label={t('about.stat2')} />
        </div>
        <div className="border-r border-line px-6 py-10">
          <StatBlock value={47} label={t('about.stat3')} />
        </div>
        <div className="px-6 py-10">
          <DecimalStat
            value={1.3}
            label={t('about.stat4')}
            note={t('about.stat4Note')}
            href="#corrections"
          />
        </div>
      </div>
    </section>
  )
}
