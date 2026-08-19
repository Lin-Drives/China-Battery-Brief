import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from '@/lib/gsap'
import { cn } from '@/lib/utils'

/**
 * Signature element §7.5 — battery-cell progress bar.
 * Fill animates 0 → value on scroll into view (1.2s ease-out-expo).
 */
export default function ChargeGauge({
  value,
  color = 'var(--volt)',
  className,
  showLabel = false,
}: {
  value: number // 0–100
  color?: string
  className?: string
  showLabel?: boolean
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const fillRef = useRef<HTMLDivElement>(null)
  const clamped = Math.max(0, Math.min(100, value))

  useGSAP(
    () => {
      if (!fillRef.current) return
      gsap.fromTo(
        fillRef.current,
        { scaleX: 0 },
        {
          scaleX: clamped / 100,
          duration: 1.2,
          ease: 'expo.out',
          scrollTrigger: { trigger: rootRef.current, start: 'top 85%', once: true },
        },
      )
    },
    { scope: rootRef, dependencies: [clamped] },
  )

  return (
    <div ref={rootRef} className={cn('flex items-center gap-2', className)}>
      <div className="relative h-3 flex-1 rounded-sm border border-line-strong p-[2px]">
        <div
          ref={fillRef}
          className="h-full rounded-[1px] origin-left"
          style={{ backgroundColor: color, transform: 'scaleX(0)' }}
        />
      </div>
      {/* battery nub */}
      <div className="h-1.5 w-[3px] rounded-r-[1px]" style={{ backgroundColor: 'var(--line-strong)' }} />
      {showLabel && (
        <span className="font-mono text-[11px] tnum" style={{ color }}>
          {clamped}%
        </span>
      )}
    </div>
  )
}
