import { forwardRef } from 'react'
import { Link } from 'react-router'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'ghost' | 'signal' | 'paper'

const variantClasses: Record<Variant, string> = {
  // §8.4 Primary (volt)
  primary:
    'bg-volt text-ink-950 hover:-translate-y-0.5 hover:shadow-volt-pop active:translate-y-0 active:shadow-none',
  // §8.4 Ghost
  ghost:
    'border border-line-strong bg-transparent text-text hover:border-text hover:bg-text/5',
  // §8.4 Signal — destructive / alert CTAs only
  signal:
    'bg-signal text-ink-950 hover:-translate-y-0.5 hover:shadow-[4px_4px_0_rgba(255,91,69,0.28)] active:translate-y-0 active:shadow-none',
  // §8.4 On-paper primary
  paper:
    'bg-paper-ink text-paper hover:-translate-y-0.5 hover:shadow-paper-pop active:translate-y-0 active:shadow-none',
}

const baseClasses =
  'inline-flex items-center justify-center gap-2 rounded-sm px-6 py-3.5 font-mono text-[12px] font-semibold uppercase tracking-[0.1em] transition-all duration-200 ease-out [&_svg]:h-3.5 [&_svg]:w-3.5'

export interface CBBButtonProps {
  variant?: Variant
  to?: string
  href?: string
  type?: 'button' | 'submit'
  onClick?: React.MouseEventHandler
  className?: string
  children: React.ReactNode
}

/**
 * design.md §8.4 button system. Renders a <Link> when `to` is set,
 * an <a> for external `href`, otherwise a <button>.
 */
const CBBButton = forwardRef<HTMLButtonElement, CBBButtonProps>(function CBBButton(
  { variant = 'primary', to, href, type = 'button', onClick, className, children },
  ref,
) {
  const cls = cn(baseClasses, variantClasses[variant], className)
  if (to) {
    return (
      <Link to={to} className={cls} onClick={onClick}>
        {children}
      </Link>
    )
  }
  if (href) {
    return (
      <a href={href} className={cls} onClick={onClick}>
        {children}
      </a>
    )
  }
  return (
    <button ref={ref} type={type} className={cls} onClick={onClick}>
      {children}
    </button>
  )
})

export default CBBButton
