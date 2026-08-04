import { Link } from 'react-router'
import { motion } from 'framer-motion'
import { ArrowRight, Lock } from 'lucide-react'
import RedactedText from '@/components/RedactedText'
import RubberStamp from '@/components/RubberStamp'
import CBBButton from '@/components/Buttons'
import { LOGIN_PATH } from '@/const'
import { useLang, tpl } from '@/i18n/lang'

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number]

/**
 * brief-detail.md S5 — the paywall gate. Rendered where the server-truncated
 * preview (~40% of content) ends: the text visually dissolves into a gradient,
 * then the on-paper lock card with redaction bars, teaser reveals and plan row.
 */
export default function PaywallGate({
  slug,
  remainingWords,
  sourcesCount,
}: {
  slug: string
  remainingWords: number
  sourcesCount: number
}) {
  const { t } = useLang()
  const pricing = `/pricing?from=${slug}`

  return (
    <div className="relative">
      {/* Preview dissolves into the sheet (200px gradient, S5) */}
      <div
        aria-hidden
        className="pointer-events-none relative z-10 -mt-[200px] h-[200px]"
        style={{
          background:
            'linear-gradient(to bottom, transparent 0%, var(--sheet-bg) 82%)',
        }}
      />

      <motion.div
        initial={{ y: 40, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.6, ease: EASE }}
        className="relative z-20 mx-auto max-w-[560px] border p-8 md:p-10"
        style={{
          borderColor: 'var(--sheet-line)',
          backgroundColor: 'var(--sheet-2)',
        }}
      >
        {/* Redaction bars across fake text lines */}
        <div aria-hidden className="mb-8 flex flex-col gap-3">
          {[92, 100, 78].map((w, i) => (
            <motion.span
              key={i}
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.15 + i * 0.09, ease: EASE }}
              className="block h-3.5 origin-left"
              style={{ width: `${w}%`, backgroundColor: 'var(--sheet-ink)' }}
            />
          ))}
        </div>

        <div className="flex flex-col items-center text-center">
          <motion.span
            initial={{ y: -20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.45 }}
            className="mb-5 flex h-14 w-14 items-center justify-center rounded-sm border"
            style={{ borderColor: 'var(--sheet-line)', color: 'var(--sheet-ink)' }}
          >
            <Lock className="h-7 w-7" />
          </motion.span>
          <motion.span
            initial={{ scale: 1.6, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.28, delay: 0.55, ease: EASE }}
            className="mb-6"
          >
            <RubberStamp color="var(--signal)">{t('stamp.paywalled')}</RubberStamp>
          </motion.span>

          <h2
            className="font-display text-[30px] font-normal leading-[1.15]"
            style={{ color: 'var(--sheet-ink)' }}
          >
            {t('paywall.titleA')}
            <em className="italic">{t('paywall.titleEm')}</em>
            {t('paywall.titleB')}
          </h2>
          <p
            className="mt-4 font-mono text-[13px] leading-[1.7]"
            style={{ color: 'var(--sheet-muted)' }}
          >
            {tpl(t('paywall.body'), {
              words: remainingWords.toLocaleString(),
              sources: sourcesCount > 0 ? tpl(t('paywall.sourcesPart'), { n: sourcesCount }) : '',
            })}
          </p>

          {/* Teaser redactions (hover reveals, then re-blurs) */}
          <div
            className="mt-6 flex w-full flex-col gap-2 border-t pt-5 font-mono text-[11px] tracking-[0.08em]"
            style={{ borderColor: 'var(--sheet-line)', color: 'var(--sheet-ink)' }}
          >
            <span className="text-left">
              {t('paywall.teaser1a')}{' '}
              <RedactedText>THE GRID CONNECTION QUEUE, NOT THE PERMITS</RedactedText>
            </span>
            <span className="text-left">
              {t('paywall.teaser2a')}{' '}
              <RedactedText>THE OEM SCENARIO MATRIX IN §03</RedactedText>
            </span>
          </div>

          {/* Plan mini-row */}
          <div className="mt-8 grid w-full gap-3 sm:grid-cols-2">
            <div
              className="flex flex-col items-center gap-3 border p-4"
              style={{ borderColor: 'var(--sheet-line)' }}
            >
              <span
                className="font-mono text-[11px] tracking-[0.16em]"
                style={{ color: 'var(--sheet-muted)' }}
              >
                PRO — $19/MO
              </span>
              <CBBButton variant="paper" to={pricing} className="group/gate w-full px-4 py-3">
                {t('paywall.unlock')}{' '}
                <ArrowRight className="transition-transform duration-200 group-hover/gate:translate-x-1" />
              </CBBButton>
            </div>
            <div
              className="flex flex-col items-center gap-3 border p-4"
              style={{ borderColor: 'var(--sheet-line)' }}
            >
              <span
                className="font-mono text-[11px] tracking-[0.16em]"
                style={{ color: 'var(--sheet-muted)' }}
              >
                DESK — $499/MO
              </span>
              <Link
                to={pricing}
                className="font-mono text-[12px] font-semibold uppercase tracking-[0.1em] underline underline-offset-4 transition-opacity hover:opacity-70"
                style={{ color: 'var(--sheet-ink)' }}
              >
                {t('paywall.forTeams')}
              </Link>
            </div>
          </div>

          <Link
            to={LOGIN_PATH}
            className="mt-6 font-mono text-[11px] uppercase tracking-[0.14em] underline underline-offset-4 transition-opacity hover:opacity-70"
            style={{ color: 'var(--sheet-muted)' }}
          >
            {t('paywall.already')}
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
