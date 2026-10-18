import { useLang } from '@/i18n/lang'

export type EmailLang = 'en' | 'zh'

/** Language choice for the email itself, independent of the site UI language. */
export default function EmailLangChoice({
  value,
  onChange,
}: {
  value: EmailLang
  onChange: (next: EmailLang) => void
}) {
  const { t } = useLang()
  return (
    <div className="flex items-center gap-1.5" role="group" aria-label={t('email.langAria')}>
      {(['en', 'zh'] as const).map((l) => (
        <button
          key={l}
          type="button"
          aria-pressed={value === l}
          onClick={() => onChange(l)}
          className={`rounded-sm border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors ${
            value === l ? 'border-volt bg-volt/10 text-volt' : 'border-line text-faint hover:text-text'
          }`}
        >
          {l === 'en' ? 'EN' : '中文'}
        </button>
      ))}
    </div>
  )
}
