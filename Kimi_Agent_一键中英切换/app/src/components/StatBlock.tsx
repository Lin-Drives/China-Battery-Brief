import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from '@/lib/gsap'
import { cn } from '@/lib/utils'

/**
 * Signature element §7.6 — stat numeral + kicker label + optional ▲▼ delta.
 * Numerals count up from 0 on scroll into view (tabular-nums).
 */
export default function StatBlock({
  value,
  label,
  delta,
  prefix = '',
  suffix = '',
  color = 'var(--text)',
  className,
}: {
  value: number
  label: string
  delta?: 'up' | 'down'
  prefix?: string
  suffix?: string
  color?: string
  className?: string
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
          if (numRef.current) {
            numRef.current.textContent = Math.round(counter.v).toLocaleString('en-US')
          }
        },
      })
    },
    { scope: rootRef, dependencies: [value] },
  )

  return (
    <div ref={rootRef} className={cn('flex flex-col gap-1.5', className)}>
      <div className="flex items-baseline gap-2">
        <span
          className="font-display text-[clamp(2rem,3.5vw,3rem)] font-light leading-none tnum"
          style={{ color }}
        >
          {prefix}
          <span ref={numRef}>0</span>
          {suffix}
        </span>
        {delta && (
          <span
            className="font-mono text-[12px]"
            style={{ color: delta === 'up' ? 'var(--volt)' : 'var(--signal)' }}
          >
            {delta === 'up' ? '▲' : '▼'}
          </span>
        )}
      </div>
      <span className="kicker text-faint">{label}</span>
    </div>
  )
}
