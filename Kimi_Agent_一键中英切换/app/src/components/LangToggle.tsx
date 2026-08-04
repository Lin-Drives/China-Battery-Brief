import { motion } from 'framer-motion'
import { useLang } from '@/i18n/lang'
import type { Lang } from '@/i18n/lang'
import { cn } from '@/lib/utils'

const OPTIONS: { value: Lang; label: string; aria: string }[] = [
  { value: 'en', label: 'EN', aria: 'English' },
  { value: 'zh', label: '中', aria: '中文' },
]

/**
 * EN | 中 segmented control — IBM Plex Mono 11px, hairline border, 2px radius.
 * Active cell gets a volt pill that slides via a shared layoutId.
 */
export default function LangToggle({
  id = 'lang-toggle-pill',
  className,
}: {
  /** Unique layoutId scope — pass a distinct id when more than one instance is mounted. */
  id?: string
  className?: string
}) {
  const { lang, setLang } = useLang()

  return (
    <div
      role="group"
      aria-label="Language / 语言"
      className={cn('flex items-center rounded-sm border border-border bg-ink-900 p-[2px]', className)}
    >
      {OPTIONS.map((opt) => {
        const active = lang === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            aria-label={opt.aria}
            aria-pressed={active}
            onClick={() => setLang(opt.value)}
            className={cn(
              'relative min-w-[30px] px-2 py-1.5 text-center font-mono text-[11px] leading-none transition-colors duration-200',
              active ? 'text-ink-950' : 'text-text-muted hover:text-text',
            )}
          >
            {active && (
              <motion.span
                layoutId={id}
                transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
                className="absolute inset-0 rounded-[2px] bg-volt"
              />
            )}
            <span className="relative z-10">{opt.label}</span>
          </button>
        )
      })}
    </div>
  )
}
