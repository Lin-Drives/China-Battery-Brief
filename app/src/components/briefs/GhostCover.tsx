import { cn } from '@/lib/utils'
import { dominantPillar, pillarColor } from './pillar'

/**
 * briefs.md S3b — generative placeholder cover for issues without art:
 * ink bg + giant ghost issue numeral + pillar bar. Pure CSS, no assets.
 */
export default function GhostCover({
  number,
  pillars,
  className,
}: {
  number: number
  pillars: string[]
  className?: string
}) {
  const color = pillarColor(dominantPillar(pillars))
  return (
    <div
      aria-hidden
      className={cn('relative h-full w-full overflow-hidden bg-ink-900', className)}
    >
      {/* faint graph grid */}
      <div
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            'linear-gradient(rgba(237,235,227,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(237,235,227,0.05) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />
      {/* giant ghost numeral */}
      <span
        className="absolute -bottom-[12%] -right-[4%] select-none font-display font-light leading-none"
        style={{ fontSize: '9rem', color: 'rgba(237,235,227,0.06)' }}
      >
        {String(number).padStart(3, '0')}
      </span>
      {/* pillar bar */}
      <span className="absolute left-0 top-0 h-full w-[3px]" style={{ backgroundColor: color }} />
    </div>
  )
}
