import { useState } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useLang } from '@/i18n/lang'

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number]

/**
 * Italic accent phrase with a mono margin-note tooltip (about.md §S0).
 * The tooltip only mounts after the masked line reveal finishes, so it
 * isn't clipped by the overflow-hidden wrapper.
 */
function Accent({
  color,
  note,
  children,
}: {
  color: string
  note: string
  children: React.ReactNode
}) {
  return (
    <span className="group relative inline-block">
      <em className="italic" style={{ color }}>
        {children}
      </em>
      <span
        role="note"
        className="pointer-events-none absolute left-1/2 top-full z-30 mt-3 w-max max-w-[280px] -translate-x-1/2 whitespace-normal border border-line-strong bg-ink-800 px-3 py-2 text-left font-mono text-[10px] not-italic leading-[1.6] tracking-[0.12em] text-text-muted opacity-0 shadow-paper-hard transition-opacity duration-150 group-hover:opacity-100"
      >
        {note}
      </span>
    </span>
  )
}

/** One masked manifesto line; unclips once the reveal lands so tooltips can escape. */
function MaskedLine({
  delay,
  className,
  innerClassName,
  onLanded,
  children,
}: {
  delay: number
  className?: string
  innerClassName?: string
  onLanded?: () => void
  children: React.ReactNode
}) {
  const [landed, setLanded] = useState(false)
  return (
    <span className={cn('block pb-[0.12em]', !landed && 'overflow-hidden', className)}>
      <motion.span
        className={cn('block', innerClassName)}
        initial={{ y: '110%' }}
        animate={{ y: '0%' }}
        transition={{ duration: 0.9, delay, ease: EASE }}
        onAnimationComplete={() => {
          setLanded(true)
          onLanded?.()
        }}
      >
        {children}
      </motion.span>
    </span>
  )
}

/** about.md S0 — manifesto hero: kinetic statement, line by line */
export default function AboutManifesto() {
  const { t } = useLang()
  const [finalLanded, setFinalLanded] = useState(false)

  return (
    <header className="relative overflow-hidden border-b border-line">
      <div aria-hidden className="graph-grid absolute inset-0" />
      <div className="relative z-10 mx-auto max-w-[960px] px-[clamp(20px,4vw,48px)] pb-28 pt-28 text-center">
        <motion.p
          className="kicker text-text-muted"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          {t('about.kicker')}
        </motion.p>

        <h1 className="mt-10 font-display text-[clamp(2.5rem,5vw,4.5rem)] font-normal leading-[1.08] tracking-[-0.015em] text-text">
          <MaskedLine delay={0.15}>{t('about.h1l1')}</MaskedLine>
          <MaskedLine delay={0.31}>
            {t('about.h1l2a')}
            <Accent color="var(--lithium)" note={t('about.accent1Note')}>
              {t('about.h1l2em')}
            </Accent>
            {t('about.h1l2b')}
          </MaskedLine>
          <MaskedLine delay={0.47}>
            {t('about.h1l3a')}
            <Accent color="var(--signal)" note={t('about.accent2Note')}>
              {t('about.h1l3em')}
            </Accent>
            {t('about.h1l3b')}
          </MaskedLine>
          <MaskedLine
            delay={0.63}
            className="mt-6"
            innerClassName="font-display text-[clamp(3.25rem,7.5vw,7rem)] leading-[0.98] tracking-[-0.02em]"
            onLanded={() => setFinalLanded(true)}
          >
            {t('about.h1l4a')}
            <motion.em
              className="italic text-volt"
              initial={{ scale: 0.96 }}
              animate={
                finalLanded
                  ? {
                      scale: 1,
                      textShadow: [
                        '0 0 0px rgba(201,242,75,0)',
                        '0 0 42px rgba(201,242,75,0.45)',
                        '0 0 14px rgba(201,242,75,0.18)',
                      ],
                    }
                  : {}
              }
              transition={{ duration: 1.1, ease: EASE }}
            >
              {t('about.h1l4em')}
            </motion.em>
            {t('about.h1l4b')}
          </MaskedLine>
        </h1>

        <motion.p
          className="mx-auto mt-10 max-w-[60ch] font-sans text-[16px] leading-[1.65] text-text-muted"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 1.15, ease: EASE }}
        >
          {t('about.sub')}
        </motion.p>

        {/* Scroll cue */}
        <motion.div
          className="mt-16 flex flex-col items-center gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1.6 }}
        >
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-faint">{t('hero.scroll')}</span>
          <span aria-hidden className="h-10 w-px bg-volt animate-scroll-cue" />
        </motion.div>
      </div>
    </header>
  )
}
