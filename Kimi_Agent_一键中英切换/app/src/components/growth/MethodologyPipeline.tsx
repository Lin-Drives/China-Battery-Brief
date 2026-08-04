import { Fragment, useState } from 'react'
import { motion } from 'framer-motion'
import KickerLine from '@/components/KickerLine'
import { cn } from '@/lib/utils'
import { useLang, tpl } from '@/i18n/lang'

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number]

const STAGES = [
  {
    num: '01',
    titleKey: 'about.stage1T',
    bodyKey: 'about.stage1B',
    tags: ['中文', 'MAGYAR', 'B. INDONESIA', 'PORTUGUÊS', 'DEUTSCH', 'TÜRKÇE'],
    href: null as string | null,
  },
  {
    num: '02',
    titleKey: 'about.stage2T',
    bodyKey: 'about.stage2B',
    tags: ['SATELLITE', 'PERMITS', 'SUPPLIER CALLS'],
    href: null,
  },
  {
    num: '03',
    titleKey: 'about.stage3T',
    bodyKey: 'about.stage3B',
    tags: ['COST CURVES', 'PATENTS', 'RULE TEXT'],
    href: null,
  },
  {
    num: '04',
    titleKey: 'about.stage4T',
    bodyKey: 'about.stage4B',
    tags: ['FIX LOG', 'REVISION HISTORY'],
    href: '#corrections',
  },
]

/** Hairline connector: draws left→right, then a volt pulse dot travels it twice. */
function Connector({ index, highlighted }: { index: number; highlighted: boolean }) {
  const drawDelay = 0.6 + index * 0.3
  return (
    <>
      {/* Desktop: horizontal arrow */}
      <div className="relative mx-1 hidden w-10 shrink-0 self-center lg:block">
        <motion.div
          className={cn(
            'h-px w-full origin-left transition-colors duration-200',
            highlighted ? 'bg-volt' : 'bg-line-strong',
          )}
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true, margin: '-15% 0px' }}
          transition={{ duration: 0.3, delay: drawDelay, ease: EASE }}
        />
        <motion.span
          aria-hidden
          className={cn(
            'absolute -right-1 -top-[5px] font-mono text-[10px] transition-colors duration-200',
            highlighted ? 'text-volt' : 'text-faint',
          )}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: '-15% 0px' }}
          transition={{ duration: 0.2, delay: drawDelay + 0.28 }}
        >
          ›
        </motion.span>
        {/* Travelling volt pulse — runs twice, then stops */}
        <motion.span
          aria-hidden
          className="absolute -top-[2px] h-[5px] w-[5px] rounded-full bg-volt"
          initial={{ left: '0%', opacity: 0 }}
          whileInView={{ opacity: [0, 1, 1, 0], left: ['0%', '92%'] }}
          viewport={{ once: true, margin: '-15% 0px' }}
          transition={{
            duration: 1.2,
            delay: 0.6 + 3 * 0.3 + 0.4,
            repeat: 1,
            ease: 'easeInOut',
          }}
        />
      </div>
      {/* Mobile: downward arrow */}
      <div className="relative mx-auto my-1 h-10 w-px lg:hidden">
        <motion.div
          className={cn(
            'h-full w-px origin-top transition-colors duration-200',
            highlighted ? 'bg-volt' : 'bg-line-strong',
          )}
          initial={{ scaleY: 0 }}
          whileInView={{ scaleY: 1 }}
          viewport={{ once: true, margin: '-10% 0px' }}
          transition={{ duration: 0.3, delay: 0.2 + index * 0.15, ease: EASE }}
        />
        <span aria-hidden className="absolute -bottom-1 -left-[3px] font-mono text-[10px] text-faint">
          ˅
        </span>
      </div>
    </>
  )
}

/** about.md S3 — methodology pipeline: "How a file gets made" */
export default function MethodologyPipeline() {
  const { t } = useLang()
  const [hovered, setHovered] = useState<number | null>(null)

  return (
    <section id="methodology" className="border-b border-line py-28">
      <div className="mx-auto max-w-container px-[clamp(20px,4vw,48px)]">
        <KickerLine chapter="03" label={t('about.methKicker')} />
        <motion.h2
          className="mt-6 max-w-[20ch] font-display text-[clamp(2.5rem,5vw,4.5rem)] font-normal leading-[1.02] tracking-[-0.015em] text-text"
          initial={{ opacity: 0, y: 36 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-20% 0px' }}
          transition={{ duration: 0.9, ease: EASE }}
        >
          {t('about.methHA')}
          <em className="italic text-volt">{t('about.methHEm')}</em>
          {t('about.methHB')}
        </motion.h2>

        <div className="mt-14 flex flex-col lg:flex-row lg:items-stretch">
          {STAGES.map((stage, i) => (
            <Fragment key={stage.num}>
              <motion.div
                className="flex-1"
                initial={{ opacity: 0, y: 36 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-15% 0px' }}
                transition={{ duration: 0.7, delay: i * 0.1, ease: EASE }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              >
                {stage.href ? (
                  <a
                    href={stage.href}
                    className="group flex h-full flex-col border border-line bg-ink-850 p-6 transition-colors duration-300 hover:border-volt/60"
                  >
                    <StageInner stage={stage} linked />
                  </a>
                ) : (
                  <div className="flex h-full flex-col border border-line bg-ink-850 p-6 transition-colors duration-300 hover:border-line-strong">
                    <StageInner stage={stage} />
                  </div>
                )}
              </motion.div>
              {i < STAGES.length - 1 && <Connector index={i} highlighted={hovered === i} />}
            </Fragment>
          ))}
        </div>
      </div>
    </section>
  )
}

function StageInner({ stage, linked = false }: { stage: (typeof STAGES)[number]; linked?: boolean }) {
  const { t } = useLang()
  return (
    <>
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[11px] tracking-[0.16em] text-faint">{tpl(t('about.step'), { n: stage.num })}</span>
        {linked && (
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-volt opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            {t('about.fixLogLink')}
          </span>
        )}
      </div>
      <h3 className="mt-3 font-display text-[20px] font-medium leading-[1.15] text-text">
        {t(stage.titleKey)}
      </h3>
      <p className="mt-3 flex-1 font-sans text-[14px] leading-[1.6] text-text-muted">{t(stage.bodyKey)}</p>
      <div className="mt-5 flex flex-wrap gap-1.5">
        {stage.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-sm border border-line px-2 py-[3px] font-mono text-[10px] tracking-[0.1em] text-text-muted"
          >
            {tag}
          </span>
        ))}
      </div>
    </>
  )
}
