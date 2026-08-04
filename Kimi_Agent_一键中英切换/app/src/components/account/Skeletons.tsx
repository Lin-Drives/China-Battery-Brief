import { cn } from '@/lib/utils'

/**
 * account.md "Shared States" — hairline skeleton cards with a slow shimmer
 * (ink-800 ↔ ink-850). No spinners.
 */
export function SkeletonBlock({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-pulse rounded-sm bg-ink-800', className)} />
}

export function SectionSkeleton({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div aria-hidden className={cn('border border-line bg-ink-900 p-6', className)}>
      <SkeletonBlock className="h-3 w-28" />
      <div className="mt-6 space-y-4">
        {Array.from({ length: rows }).map((_, i) => (
          <SkeletonBlock key={i} className="h-4" />
        ))}
      </div>
    </div>
  )
}

/** Full-page neutral skeleton shown while the auth session resolves. */
export function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-container px-[clamp(20px,4vw,48px)] pb-24 pt-16">
      <SkeletonBlock className="h-3 w-40" />
      <SkeletonBlock className="mt-6 h-10 w-72" />
      <div className="mt-12 grid gap-6 lg:grid-cols-3">
        <SectionSkeleton className="lg:col-span-2" rows={4} />
        <SectionSkeleton rows={4} />
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <SectionSkeleton rows={3} />
        <SectionSkeleton rows={3} />
      </div>
    </div>
  )
}
