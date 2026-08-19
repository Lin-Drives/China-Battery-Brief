import { cn } from '@/lib/utils'

/**
 * Signature element §7.9 — 12px L-shaped corner marks (dossier photo corners).
 * Place inside a `relative` parent around featured cards/images.
 * (Vector twin: /grid-corner.svg)
 */
export default function CornerTicks({
  color = 'var(--text)',
  className,
}: {
  color?: string
  className?: string
}) {
  const tick = 'absolute h-3 w-3 pointer-events-none'
  const style = { borderColor: color, borderStyle: 'solid' as const, borderWidth: 0 }
  return (
    <div aria-hidden className={cn('pointer-events-none absolute inset-0', className)}>
      <span className={cn(tick, '-top-1 -left-1 border-t-[1.5px] border-l-[1.5px]')} style={style} />
      <span className={cn(tick, '-top-1 -right-1 border-t-[1.5px] border-r-[1.5px]')} style={style} />
      <span className={cn(tick, '-bottom-1 -left-1 border-b-[1.5px] border-l-[1.5px]')} style={style} />
      <span className={cn(tick, '-bottom-1 -right-1 border-b-[1.5px] border-r-[1.5px]')} style={style} />
    </div>
  )
}
