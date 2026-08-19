import { cn } from '@/lib/utils'
import { STATUS_META } from '@/components/intel/intel-utils'
import type { FactoryStatus } from '@/components/intel/intel-utils'
import { useLang } from '@/i18n/lang'

/**
 * tracker.md S5 / design.md §4.4 — status pill with colored dot.
 */
export default function StatusPill({
  status,
  className,
}: {
  status: FactoryStatus
  className?: string
}) {
  const { t } = useLang()
  const meta = STATUS_META[status]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-sm border px-2 py-[3px] font-mono text-[10.5px] font-medium uppercase tracking-[0.12em]',
        className,
      )}
      style={{
        color: meta.color,
        borderColor: `color-mix(in srgb, ${meta.color} 60%, transparent)`,
        backgroundColor: `color-mix(in srgb, ${meta.color} 8%, transparent)`,
      }}
    >
      <span
        aria-hidden
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: meta.color }}
      />
      {t(`status.${status}`)}
    </span>
  )
}
