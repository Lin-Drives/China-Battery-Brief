import { useEffect, useRef, useState } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from '@/lib/gsap'
import EmailCapture from '@/components/EmailCapture'
import RubberStamp from '@/components/RubberStamp'
import { useLang } from '@/i18n/lang'

/** Next Thursday 06:00 UTC (weekly drop time, design.md §8.3) */
function nextDrop(): Date {
  const now = new Date()
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 6, 0, 0))
  const day = d.getUTCDay() // 4 = Thursday
  let delta = (4 - day + 7) % 7
  if (delta === 0 && d.getTime() <= now.getTime()) delta = 7
  d.setUTCDate(d.getUTCDate() + delta)
  return d
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

/** home.md S10 — "Thursday, 06:00 UTC" final CTA */
export default function FinalCTA() {
  const { t } = useLang()
  const rootRef = useRef<HTMLElement>(null)
  const [remaining, setRemaining] = useState({ d: '00', h: '00', m: '00', s: '00' })

  useEffect(() => {
    const target = nextDrop().getTime()
    const tick = () => {
      const ms = Math.max(0, target - Date.now())
      const totalSec = Math.floor(ms / 1000)
      setRemaining({
        d: pad(Math.floor(totalSec / 86400)),
        h: pad(Math.floor((totalSec % 86400) / 3600)),
        m: pad(Math.floor((totalSec % 3600) / 60)),
        s: pad(totalSec % 60),
      })
    }
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [])

  useGSAP(
    () => {
      gsap.fromTo(
        '.cta-line',
        { y: '110%' },
        {
          y: '0%',
          duration: 0.9,
          stagger: 0.12,
          ease: 'expo.out',
          scrollTrigger: { trigger: rootRef.current, start: 'top 75%', once: true },
        },
      )
    },
    { scope: rootRef },
  )

  const cells = [
    { v: remaining.d, label: t('cta.days') },
    { v: remaining.h, label: t('cta.hrs') },
    { v: remaining.m, label: t('cta.min') },
    { v: remaining.s, label: t('cta.sec') },
  ]

  return (
    <section ref={rootRef} className="relative overflow-hidden border-t border-line py-32">
      {/* volt-dim radial glow, breathing */}
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 h-[640px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full animate-breathe"
        style={{ background: 'radial-gradient(ellipse, var(--volt-dim) 0%, transparent 65%)' }}
      />

      <div className="relative z-10 mx-auto flex max-w-container flex-col items-center px-[clamp(20px,4vw,48px)] text-center">
        <h2 className="font-display text-[clamp(3.25rem,7.5vw,7rem)] font-normal leading-[0.98] tracking-[-0.02em] text-text">
          <span className="block overflow-hidden">
            <span className="cta-line block">{t('cta.titleA')}</span>
          </span>
          <span className="block overflow-hidden">
            <span className="cta-line block">
              <em className="italic text-volt">{t('cta.titleEm')}</em>
              {t('cta.titleB')}
            </span>
          </span>
        </h2>

        {/* Live countdown */}
        <div className="mt-10 grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-4">
          {cells.map((cell) => (
            <div key={cell.label} className="flex flex-col items-center bg-ink-950 px-8 py-5">
              <span className="font-mono text-[32px] font-medium leading-none text-text tnum">
                {cell.v}
              </span>
              <span className="mt-2 font-mono text-[10px] tracking-[0.2em] text-faint">
                {cell.label}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-3 font-mono text-[11px] tracking-wide text-faint">{t('cta.until')}</p>

        <div className="mt-10 flex w-full justify-center">
          <EmailCapture />
        </div>

        <div className="mt-12">
          <RubberStamp color="var(--text)" rotate={-6}>
            {t('stamp.noAds')}
          </RubberStamp>
        </div>
      </div>
    </section>
  )
}
