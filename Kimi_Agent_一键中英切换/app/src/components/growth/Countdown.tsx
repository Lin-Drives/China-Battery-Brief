import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
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

/**
 * Compact countdown to the next weekly brief drop.
 * Compact twin of the home FinalCTA countdown (pricing.md S6, about pages reuse).
 */
export default function Countdown({ className }: { className?: string }) {
  const { t } = useLang()
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

  const cells = [
    { v: remaining.d, label: t('cta.days') },
    { v: remaining.h, label: t('cta.hrs') },
    { v: remaining.m, label: t('cta.min') },
    { v: remaining.s, label: t('cta.sec') },
  ]

  return (
    <div className={cn('inline-grid grid-cols-4 gap-px border border-line bg-line', className)}>
      {cells.map((cell) => (
        <div key={cell.label} className="flex flex-col items-center bg-ink-950 px-5 py-3.5">
          <span className="font-mono text-[24px] font-medium leading-none text-text tnum">
            {cell.v}
          </span>
          <span className="mt-1.5 font-mono text-[9px] tracking-[0.2em] text-faint">
            {cell.label}
          </span>
        </div>
      ))}
    </div>
  )
}
