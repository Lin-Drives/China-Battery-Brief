import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import RubberStamp from '@/components/RubberStamp'
import { cn } from '@/lib/utils'
import { trpc } from '@/providers/trpc'
import { useLang } from '@/i18n/lang'

/**
 * Email capture used in the home hero (S2.1) and final CTA (S10).
 * Wired (backend Phase-5): persists to email_subscribers via
 * trpc.content["subscribe.email"].
 */
export default function EmailCapture({
  microcopy,
  buttonLabel,
  className,
}: {
  microcopy?: string
  buttonLabel?: string
  className?: string
}) {
  const { t } = useLang()
  const micro = microcopy ?? t('email.microcopy')
  const label = buttonLabel ?? t('email.button')
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'error' | 'done'>('idle')
  const subscribe = trpc.content['subscribe.email'].useMutation({
    onSuccess: () => setState('done'),
    onError: () => setState('error'),
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    if (!valid) {
      setState('error')
      return
    }
    subscribe.mutate({ email })
  }

  if (state === 'done') {
    return (
      <div className={cn('flex flex-col items-start gap-3', className)}>
        <RubberStamp color="var(--volt)" rotate={-4}>
          {t('stamp.onTheList')}
        </RubberStamp>
        <p className="font-mono text-[12px] tracking-wide text-text-muted">{t('email.successNote')}</p>
      </div>
    )
  }

  return (
    <div className={className}>
      <form onSubmit={submit} className="flex w-full max-w-[460px] gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            setState('idle')
          }}
          placeholder={t('email.placeholder')}
          aria-label={t('email.aria')}
          className={cn(
            'w-full rounded-sm border bg-ink-900 px-3.5 py-3 font-mono text-[13px] text-text caret-volt placeholder:uppercase placeholder:tracking-[0.08em] placeholder:text-faint focus:outline-none',
            state === 'error' ? 'border-signal' : 'border-line focus:border-volt',
          )}
        />
        <button
          type="submit"
          className="flex shrink-0 items-center gap-2 rounded-sm bg-volt px-6 py-3 font-mono text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-950 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-volt-pop active:translate-y-0 active:shadow-none"
        >
          {label.replace(' →', '')}
          <ArrowRight aria-hidden className="h-3.5 w-3.5" />
        </button>
      </form>
      {state === 'error' ? (
        <p className="mt-2 font-mono text-[11px] tracking-wide text-signal">{t('email.error')}</p>
      ) : (
        <p className="mt-2 font-mono text-[11px] tracking-wide text-faint">{micro}</p>
      )}
    </div>
  )
}
