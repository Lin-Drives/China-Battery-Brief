import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useLang } from '@/i18n/lang'
import { OpenAccess } from '@contracts/constants'

/**
 * Signature element §7.4 — black redaction bar over blurred text.
 * Hover / tap reveals with a 160ms blur-out. Used for paywalled teasers.
 * During the open beta (OpenAccess.beta) the bar is dropped entirely.
 */
export default function RedactedText({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const { t } = useLang()
  const [revealed, setRevealed] = useState(false)

  if (OpenAccess.beta) {
    return <span className={className}>{children}</span>
  }

  return (
    <span
      role="button"
      tabIndex={0}
      data-cursor={t('redacted.cursor')}
      onMouseEnter={() => setRevealed(true)}
      onMouseLeave={() => setRevealed(false)}
      onClick={() => setRevealed((v) => !v)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') setRevealed((v) => !v)
      }}
      className={cn(
        'relative inline-block cursor-pointer select-none rounded-[2px] px-1 align-baseline',
        className,
      )}
      title={t('redacted.hint')}
    >
      <span
        className={cn(
          'transition-[filter,opacity] duration-200',
          revealed ? 'blur-0 opacity-100' : 'blur-[6px] opacity-70',
        )}
        style={{ transitionDuration: '160ms' }}
      >
        {children}
      </span>
      <span
        aria-hidden
        className={cn(
          'absolute inset-0 rounded-[2px] bg-paper-ink transition-opacity',
          revealed ? 'opacity-0' : 'opacity-90',
        )}
        style={{ transitionDuration: '160ms' }}
      />
    </span>
  )
}
