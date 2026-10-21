import { useEffect } from 'react'
import { Link } from 'react-router'
import EmailCapture from '@/components/EmailCapture'
import { LOGIN_PATH } from '@/const'
import { useLang } from '@/i18n/lang'

const POINTS = [
  { titleKey: 'subscribe.point1Title', bodyKey: 'subscribe.point1Body' },
  { titleKey: 'subscribe.point2Title', bodyKey: 'subscribe.point2Body' },
  { titleKey: 'subscribe.point3Title', bodyKey: 'subscribe.point3Body' },
]

export default function Subscribe() {
  const { t } = useLang()

  useEffect(() => {
    document.title = 'Subscribe — China Battery Brief'
  }, [])

  return (
    <div className="bg-ink-950">
      <section className="mx-auto max-w-container px-[clamp(20px,4vw,48px)] pb-20 pt-32">
        <div className="max-w-3xl">
          <p className="kicker mb-5 text-volt">{t('subscribe.kicker')}</p>
          <h1 className="font-display text-[clamp(2.6rem,6.2vw,5.2rem)] font-normal leading-[0.98] tracking-[-0.02em] text-text">
            {t('subscribe.titleA')}
            <em className="italic text-volt">{t('subscribe.titleEm')}</em>
            {t('subscribe.titleB')}
          </h1>
          <p className="mt-7 max-w-xl font-sans text-[16px] leading-[1.8] text-text-muted">
            {t('subscribe.dek')}
          </p>
          <EmailCapture className="mt-9" />
        </div>
      </section>

      <section className="border-t border-line">
        <div className="mx-auto grid max-w-container gap-px border-b border-line bg-line px-[clamp(20px,4vw,48px)] md:grid-cols-3">
          {POINTS.map((point) => (
            <div key={point.titleKey} className="bg-ink-950 py-9 pr-6 md:px-7">
              <p className="kicker mb-3 text-faint">{t(point.titleKey)}</p>
              <p className="font-sans text-[15px] leading-[1.75] text-text-muted">{t(point.bodyKey)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto flex max-w-container flex-col gap-6 px-[clamp(20px,4vw,48px)] py-16 md:flex-row md:items-end md:justify-between">
        <div className="max-w-md">
          <p className="kicker mb-3 text-faint">{t('subscribe.sampleKicker')}</p>
          <p className="font-sans text-[15px] leading-[1.75] text-text-muted">{t('subscribe.sampleBody')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Link
            to="/briefs"
            className="rounded-sm border border-line-strong px-5 py-3 font-mono text-[12px] uppercase tracking-[0.1em] text-text transition-colors hover:border-volt hover:text-volt"
          >
            {t('subscribe.sampleCta')}
          </Link>
          <Link
            to={LOGIN_PATH}
            className="font-mono text-[11px] uppercase tracking-[0.12em] text-faint transition-colors hover:text-text"
          >
            {t('subscribe.loginCta')}
          </Link>
        </div>
      </section>
    </div>
  )
}
