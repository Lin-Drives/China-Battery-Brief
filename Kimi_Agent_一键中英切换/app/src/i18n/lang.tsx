import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { en } from './en'
import { zh } from './zh'

export type Lang = 'en' | 'zh'

const STORAGE_KEY = 'cbb:lang'

export type LangContextValue = {
  lang: Lang
  setLang: (next: Lang) => void
  /** Flat dot-key lookup: zh falls back to en, then to the key itself. */
  t: (key: string) => string
}

const LangContext = createContext<LangContextValue | null>(null)

function initialLang(): Lang {
  if (typeof window === 'undefined') return 'en'
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'zh' ? 'zh' : 'en'
  } catch {
    return 'en'
  }
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang)

  // Reflect the language on <html>: lang attribute + `zh` class for CJK CSS tweaks
  useEffect(() => {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en'
    document.documentElement.classList.toggle('zh', lang === 'zh')
  }, [lang])

  const setLang = useCallback((next: Lang) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* private mode — state still flips */
    }
    setLangState(next)
  }, [])

  const t = useCallback(
    (key: string): string => {
      if (lang === 'zh') return zh[key] ?? en[key] ?? key
      return en[key] ?? key
    },
    [lang],
  )

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t])
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>
}

export function useLang(): LangContextValue {
  const ctx = useContext(LangContext)
  if (!ctx) throw new Error('useLang must be used within <LangProvider>')
  return ctx
}

/** Template interpolation: tpl(t('paywall.body'), { words: '1,200' }) */
export function tpl(template: string, vars: Record<string, string | number>): string {
  let out = template
  for (const [k, v] of Object.entries(vars)) out = out.replaceAll(`{${k}}`, String(v))
  return out
}
