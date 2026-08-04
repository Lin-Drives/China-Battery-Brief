import { useRef, useState } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from '@/lib/gsap'
import { zoneColor } from '@/components/intel/intel-utils'

/* ------------------------------------------------------------------ */
/* geopolitics.md S1 — 180° radial risk gauge, 0–100.                  */
/* Arc sweeps 0→value (1.4s expo), numeral counts in sync, needle      */
/* overshoots then settles (back ease). Zone colors: <40 volt,         */
/* 40–70 amber, >70 signal.                                            */
/* ------------------------------------------------------------------ */

const R = 90
const CX = 100
const CY = 100
const ARC_LEN = Math.PI * R

export default function RiskMeter({
  value,
  delay = 0,
  onSettled,
}: {
  value: number
  delay?: number
  onSettled?: () => void
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const fillRef = useRef<SVGPathElement>(null)
  const needleRef = useRef<SVGLineElement>(null)
  // Numeral is React state (not GSAP-mutated textContent) so it survives
  // re-renders — e.g. language switches and late-arriving query data.
  const [display, setDisplay] = useState(0)
  const clamped = Math.max(0, Math.min(100, value))
  const color = zoneColor(clamped)

  useGSAP(
    () => {
      if (!fillRef.current || !needleRef.current) return
      const sweep = { v: 0 }
      gsap.to(sweep, {
        v: clamped,
        duration: 1.4,
        delay,
        ease: 'expo.out',
        scrollTrigger: { trigger: rootRef.current, start: 'top 60%', once: true },
        onUpdate: () => {
          const v = sweep.v
          fillRef.current?.setAttribute('stroke-dashoffset', String(ARC_LEN * (1 - v / 100)))
          setDisplay(Math.round(v))
        },
        onComplete: () => onSettled?.(),
      })
      // needle with overshoot (+3) then spring settle
      const needle = { v: 0 }
      gsap.to(needle, {
        v: clamped,
        duration: 1.5,
        delay,
        ease: 'back.out(1.4)',
        scrollTrigger: { trigger: rootRef.current, start: 'top 60%', once: true },
        onUpdate: () => {
          const angle = -90 + (needle.v / 100) * 180
          needleRef.current?.setAttribute('transform', `rotate(${angle} ${CX} ${CY})`)
        },
      })
    },
    { scope: rootRef, dependencies: [clamped, delay] },
  )

  const ticks = [0, 25, 50, 75, 100].map((tv) => {
    const a = (-90 + (tv / 100) * 180) * (Math.PI / 180)
    // needle drawn pointing up; ticks around the arc
    const x1 = CX + (R + 6) * Math.sin(a)
    const y1 = CY - (R + 6) * Math.cos(a)
    const x2 = CX + (R + 12) * Math.sin(a)
    const y2 = CY - (R + 12) * Math.cos(a)
    return { x1, y1, x2, y2, key: tv }
  })

  return (
    <div ref={rootRef} className="relative mx-auto w-full max-w-[240px]">
      <svg viewBox="0 0 200 118" className="w-full">
        {/* track */}
        <path
          d={`M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`}
          fill="none"
          stroke="var(--ink-700)"
          strokeWidth={10}
          strokeLinecap="round"
        />
        {/* fill */}
        <path
          ref={fillRef}
          d={`M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`}
          fill="none"
          stroke={color}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={ARC_LEN}
          strokeDashoffset={ARC_LEN}
        />
        {/* ticks */}
        {ticks.map((t) => (
          <line
            key={t.key}
            x1={t.x1}
            y1={t.y1}
            x2={t.x2}
            y2={t.y2}
            stroke="var(--faint)"
            strokeWidth={1}
          />
        ))}
        {/* needle */}
        <line
          ref={needleRef}
          x1={CX}
          y1={CY}
          x2={CX}
          y2={CY - R + 18}
          stroke="var(--text)"
          strokeWidth={2}
          transform={`rotate(-90 ${CX} ${CY})`}
        />
        <circle cx={CX} cy={CY} r={4} fill="var(--text)" />
      </svg>
      {/* numeral — sits below the dial, clear of the needle sweep */}
      <div className="-mt-2 flex items-baseline justify-center gap-1">
        <span className="font-display text-[56px] font-light leading-none tnum" style={{ color }}>
          {display}
        </span>
        <span className="font-mono text-[12px] text-faint">/100</span>
      </div>
    </div>
  )
}
