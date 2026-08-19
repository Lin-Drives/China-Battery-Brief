import { memo, useMemo } from 'react'
import { Link } from 'react-router'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, X } from 'lucide-react'
import RubberStamp from '@/components/RubberStamp'
import { useLang } from '@/i18n/lang'

const CONFETTI_COLORS = ['#C9F24B', '#5ADFC3', '#FF5B45', '#F0A832', '#EDEBE3']

/** One-shot confetti burst — isolated + memoized per react-dev perf rules. */
const ConfettiBurst = memo(function ConfettiBurst() {
  const reduced = useReducedMotion()
  const pieces = useMemo(
    () =>
      Array.from({ length: 18 }).map((_, i) => ({
        x: (i / 17) * 100 + (Math.random() * 6 - 3), // % across the banner
        drift: Math.random() * 60 - 30,
        delay: Math.random() * 0.25,
        size: 4 + Math.random() * 5,
        rotate: Math.random() * 360,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        duration: 1.1 + Math.random() * 0.5,
      })),
    [],
  )

  if (reduced) return null

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((p, i) => (
        <motion.span
          key={i}
          initial={{ y: -12, x: 0, opacity: 1, rotate: 0 }}
          animate={{ y: 120, x: p.drift, opacity: 0, rotate: p.rotate }}
          transition={{ duration: p.duration, delay: p.delay, ease: 'easeIn' }}
          className="absolute top-0 block"
          style={{ left: `${p.x}%`, width: p.size, height: p.size * 0.6, backgroundColor: p.color }}
        />
      ))}
    </div>
  )
})

/**
 * account.md "Shared States" — post-checkout welcome (`/account?welcome=1`):
 * stamp slam `WELCOME TO THE DESK` + mono `PRO ACTIVE — EVERY FILE IS OPEN`.
 * `from=<slug>` adds the `YOUR FILE IS UNLOCKED →` deep-link banner.
 */
export default function WelcomeBanner({
  fromSlug,
  onDismiss,
}: {
  fromSlug?: string | null
  onDismiss: () => void
}) {
  const { t } = useLang()
  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="mb-10"
    >
      <div className="relative overflow-hidden border border-volt/40 bg-volt-dim px-6 py-8">
        <ConfettiBurst />
        <button
          type="button"
          aria-label={t('acct.welcomeDismiss')}
          onClick={onDismiss}
          className="absolute right-4 top-4 text-text-muted transition-colors hover:text-text"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:gap-8">
          {/* Stamp slam: oversized + rotated → settles at rest */}
          <motion.div
            initial={{ scale: 2.4, opacity: 0, rotate: -18 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.15 }}
          >
            <RubberStamp color="var(--volt)" rotate={-6} className="text-[14px]">
              {t('acct.welcomeStamp')}
            </RubberStamp>
          </motion.div>
          <div>
            <p className="font-mono text-[12px] font-medium uppercase tracking-[0.16em] text-text">
              {t('acct.welcomeTitle')}
            </p>
            <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.12em] text-text-muted">
              {t('acct.welcomeSub')}
            </p>
          </div>
        </div>
      </div>

      {fromSlug && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="border border-t-0 border-line bg-ink-900"
        >
          <Link
            to={`/briefs/${fromSlug}`}
            className="group flex items-center justify-between gap-4 px-6 py-4 transition-colors hover:bg-ink-800"
          >
            <span className="font-mono text-[12px] font-semibold uppercase tracking-[0.16em] text-volt">
              {t('acct.fileUnlocked')}
            </span>
            <ArrowRight className="h-4 w-4 text-volt transition-transform duration-200 group-hover:translate-x-1" />
          </Link>
        </motion.div>
      )}
    </motion.div>
  )
}
