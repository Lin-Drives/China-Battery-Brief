import { Link } from 'react-router'
import { Bookmark } from 'lucide-react'
import CBBButton from '@/components/Buttons'
import { cn } from '@/lib/utils'
import { trpc } from '@/providers/trpc'
import { useAuth } from '@/hooks/useAuth'
import { LOGIN_PATH } from '@/const'
import { useLang } from '@/i18n/lang'

/**
 * Save-brief control (briefs.md S2 / brief-detail.md S0+S2).
 * Authenticated → toggles trpc.me['saved.add'] / ['saved.remove'] ({ issueId });
 * anonymous → links to LOGIN_PATH.
 */
export default function SaveButton({
  issueId,
  variant = 'button',
  className,
}: {
  issueId: number
  variant?: 'button' | 'icon' | 'link'
  className?: string
}) {
  const { isAuthenticated, isLoading } = useAuth()
  const { t } = useLang()
  const utils = trpc.useUtils()

  const savedQuery = trpc.me['saved.list'].useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
    staleTime: 60_000,
  })
  const saved = (savedQuery.data ?? []).some((row) => row.issue.id === issueId)

  const invalidate = () => utils.me['saved.list'].invalidate()
  const add = trpc.me['saved.add'].useMutation({ onSuccess: invalidate })
  const remove = trpc.me['saved.remove'].useMutation({ onSuccess: invalidate })
  const pending = add.isPending || remove.isPending

  const toggle = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (pending) return
    if (saved) remove.mutate({ issueId })
    else add.mutate({ issueId })
  }

  // Anonymous (or auth state unresolved) → sign-in path
  if (isLoading || !isAuthenticated) {
    const label = variant === 'link' ? t('save.save') : t('save.saveLater')
    if (variant === 'button') {
      return (
        <CBBButton variant="ghost" to={LOGIN_PATH} className={className}>
          <Bookmark /> {label}
        </CBBButton>
      )
    }
    if (variant === 'icon') {
      return (
        <Link
          to={LOGIN_PATH}
          aria-label={t('save.ariaAnon')}
          title={t('save.hintAnon')}
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-sm border border-line-strong text-text transition-colors hover:border-text hover:bg-text/5',
            className,
          )}
        >
          <Bookmark className="h-4 w-4" />
        </Link>
      )
    }
    return (
      <Link
        to={LOGIN_PATH}
        className={cn(
          'font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-paper-muted transition-colors hover:text-paper-ink',
          className,
        )}
      >
        {t('save.save')} <Bookmark className="inline h-3 w-3 align-[-1px]" />
      </Link>
    )
  }

  const label = saved ? t('save.saved') : variant === 'link' ? t('save.save') : t('save.saveLater')

  if (variant === 'button') {
    return (
      <CBBButton variant="ghost" onClick={toggle} className={cn(saved && 'border-volt text-volt', className)}>
        <Bookmark className={saved ? 'fill-current' : undefined} /> {label}
      </CBBButton>
    )
  }
  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-label={saved ? t('save.ariaRemove') : t('save.ariaSave')}
        aria-pressed={saved}
        title={saved ? t('save.hintSaved') : t('save.hintSave')}
        className={cn(
          'flex h-10 w-10 items-center justify-center rounded-sm border transition-colors',
          saved
            ? 'border-volt bg-volt-dim text-volt'
            : 'border-line-strong text-text hover:border-text hover:bg-text/5',
          className,
        )}
      >
        <Bookmark className={cn('h-4 w-4', saved && 'fill-current')} />
      </button>
    )
  }
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={saved}
      className={cn(
        'font-mono text-[11px] font-medium uppercase tracking-[0.16em] transition-colors',
        saved ? 'text-paper-ink underline underline-offset-4' : 'text-paper-muted hover:text-paper-ink',
        className,
      )}
    >
      {label} <Bookmark className={cn('inline h-3 w-3 align-[-1px]', saved && 'fill-current')} />
    </button>
  )
}
