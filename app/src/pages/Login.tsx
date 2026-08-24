import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import CBBButton from '@/components/Buttons'
import { useLang } from '@/i18n/lang'
import { trpc } from '@/providers/trpc'

const inputCls =
  'w-full rounded-sm border border-line bg-ink-900 px-3.5 py-3 font-mono text-[13px] text-text caret-volt placeholder:uppercase placeholder:tracking-[0.08em] placeholder:text-faint focus:border-volt focus:outline-none'

/**
 * Email + password authentication (register / sign in). On success the app
 * redirects to /account where the admin-only desk control + email desk unlock
 * for the OWNER_EMAIL account.
 */
export default function Login() {
  const { t } = useLang()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const mapError = (code: string | undefined, fallback: string) => {
    if (code === 'CONFLICT') return t('login.errTaken')
    if (code === 'UNAUTHORIZED') return t('login.errInvalid')
    if (fallback) return fallback.toUpperCase()
    return t('login.errInvalid')
  }

  const login = trpc.auth.login.useMutation({
    onSuccess: () => navigate('/account'),
    onError: (e) => setError(mapError(e.data?.code, e.message)),
  })

  const register = trpc.auth.register.useMutation({
    onSuccess: () => navigate('/account'),
    onError: (e) => setError(mapError(e.data?.code, e.message)),
  })

  const pending = login.isPending || register.isPending

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!email.trim()) return setError(t('login.errEmail'))
    if (password.length < 8) return setError(t('login.errWeak'))
    if (mode === 'signup') {
      register.mutate({ email: email.trim(), password, name: name.trim() || undefined })
    } else {
      login.mutate({ email: email.trim(), password })
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="font-mono text-[12px] uppercase tracking-[0.16em]">
            {t(mode === 'signup' ? 'login.createTitle' : 'login.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <form onSubmit={submit} className="flex flex-col gap-4">
            {mode === 'signup' && (
              <label className="flex flex-col gap-1.5">
                <span className="kicker text-faint">{t('login.name')}</span>
                <input
                  className={inputCls}
                  value={name}
                  autoComplete="name"
                  placeholder={t('login.namePh')}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
            )}
            <label className="flex flex-col gap-1.5">
              <span className="kicker text-faint">{t('login.email')}</span>
              <input
                className={inputCls}
                type="email"
                value={email}
                autoComplete="email"
                placeholder={t('login.emailPh')}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="kicker text-faint">{t('login.password')}</span>
              <input
                className={inputCls}
                type="password"
                value={password}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                placeholder="••••••••"
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>

            {error && (
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-signal">{error}</p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="rounded-sm bg-volt px-6 py-3.5 font-mono text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-950 transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-40"
            >
              {pending
                ? t('login.submitting')
                : mode === 'signup'
                  ? t('login.createAccount')
                  : t('login.signin')}
            </button>
          </form>

          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setMode((m) => (m === 'signin' ? 'signup' : 'signin'))
              setError(null)
            }}
            className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-volt disabled:opacity-40"
          >
            {mode === 'signup' ? t('login.switchToSignin') : t('login.switchToSignup')}
          </button>

          <div className="border-t border-line pt-4 text-center">
            <CBBButton variant="paper" to="/">
              {t('login.backHome')}
            </CBBButton>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
