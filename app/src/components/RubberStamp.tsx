import { cn } from '@/lib/utils'

/**
 * Signature element §7.2 — rotated rubber stamp.
 * 1.5px border, mono 600 uppercase, 0.22em tracking, ink-bleed via SVG rough filter.
 */
export default function RubberStamp({
  children,
  color = 'var(--text)',
  rotate = -6,
  className,
}: {
  children: React.ReactNode
  color?: string
  rotate?: number
  className?: string
}) {
  return (
    <>
      {/* Shared rough-edge filter, defined once */}
      <svg aria-hidden className="absolute h-0 w-0">
        <defs>
          <filter id="stamp-rough">
            <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="3" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.2" />
          </filter>
        </defs>
      </svg>
      <span
        className={cn(
          'inline-block select-none px-3 py-1.5 font-mono text-[12px] font-semibold uppercase tracking-[0.22em]',
          className,
        )}
        style={{
          color,
          border: `1.5px solid ${color}`,
          borderRadius: 2,
          transform: `rotate(${rotate}deg)`,
          filter: 'url(#stamp-rough)',
          opacity: 0.9,
        }}
      >
        {children}
      </span>
    </>
  )
}
