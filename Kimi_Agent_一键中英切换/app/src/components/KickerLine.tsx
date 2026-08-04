import { cn } from '@/lib/utils'

/**
 * Signature element §7.8 — mono kicker + 40px hairline + optional chapter number.
 * Precedes every section headline, e.g. `01 / THIS WEEK`.
 */
export default function KickerLine({
  chapter,
  label,
  color = 'var(--volt)',
  className,
}: {
  chapter?: string
  label: string
  color?: string
  className?: string
}) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      {chapter && (
        <span className="kicker" style={{ color }}>
          {chapter}
        </span>
      )}
      {chapter && <span className="kicker text-faint">/</span>}
      <span className="kicker text-text-muted">{label}</span>
      <span aria-hidden className="h-px w-10 bg-line-strong" />
    </div>
  )
}
