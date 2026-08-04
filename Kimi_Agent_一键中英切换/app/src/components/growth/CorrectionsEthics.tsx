import { useState } from 'react'
import { motion } from 'framer-motion'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import KickerLine from '@/components/KickerLine'
import RubberStamp from '@/components/RubberStamp'
import { cn } from '@/lib/utils'
import { useLang } from '@/i18n/lang'

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number]

const ETHICS = [
  { qKey: 'about.eth1q', aKey: 'about.eth1a' },
  { qKey: 'about.eth2q', aKey: 'about.eth2a' },
  { qKey: 'about.eth3q', aKey: 'about.eth3a' },
  { qKey: 'about.eth4q', aKey: 'about.eth4a' },
]

const FIX_LOG = [
  { issue: '№044', fix: 'HPAL COST FIGURE RESTATED (SOURCE: COMPANY FILING REV.)', date: 'NOV 8' },
  { issue: '№039', fix: 'GOTION SOP YEAR CORRECTED 2025→2026', date: 'OCT 12' },
  { issue: '№037', fix: 'WH/KG TYPO FIXED', date: 'SEP 28' },
]

/** Report-an-error modal. The v1 backend ships no /corrections endpoint, so
 *  submission is mocked client-side behind the same interface. */
function ReportErrorDialog() {
  const { t } = useLang()
  const [open, setOpen] = useState(false)
  const [sent, setSent] = useState(false)
  const [fields, setFields] = useState({ issue: '', claim: '', source: '', email: '' })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    // Mock POST /corrections (design §Data Dependencies) — resolves locally.
    window.setTimeout(() => setSent(true), 400)
  }

  const inputCls =
    'w-full rounded-sm border border-line bg-ink-900 px-3.5 py-3 font-mono text-[13px] text-text caret-volt placeholder:uppercase placeholder:tracking-[0.08em] placeholder:text-faint focus:border-volt focus:outline-none'

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) {
          setSent(false)
          setFields({ issue: '', claim: '', source: '', email: '' })
        }
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-sm border border-signal/60 bg-transparent px-6 py-3.5 font-mono text-[12px] font-semibold uppercase tracking-[0.1em] text-signal transition-all duration-200 ease-out hover:border-signal hover:bg-signal/5"
        >
          {t('about.reportError')}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-[480px] rounded border-line-strong bg-ink-900">
        {sent ? (
          <div className="flex flex-col items-start gap-3 py-4">
            <RubberStamp color="var(--volt)" rotate={-4}>
              {t('about.reportLogged')}
            </RubberStamp>
            <p className="font-mono text-[12px] leading-[1.7] tracking-wide text-text-muted">
              {t('about.reportLoggedBody')}
            </p>
          </div>
        ) : (
          <>
            <DialogHeader className="text-left">
              <DialogTitle className="font-display text-[24px] font-medium text-text">
                {t('about.reportTitle')}
              </DialogTitle>
              <DialogDescription className="font-mono text-[11px] tracking-[0.08em] text-faint">
                {t('about.reportDesc')}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
              <input
                required
                value={fields.issue}
                onChange={(e) => setFields({ ...fields, issue: e.target.value })}
                placeholder={t('about.reportPhIssue')}
                aria-label={t('about.reportAriaIssue')}
                className={inputCls}
              />
              <textarea
                required
                value={fields.claim}
                onChange={(e) => setFields({ ...fields, claim: e.target.value })}
                placeholder={t('about.reportPhClaim')}
                aria-label={t('about.reportAriaClaim')}
                rows={3}
                className={cn(inputCls, 'resize-none')}
              />
              <input
                value={fields.source}
                onChange={(e) => setFields({ ...fields, source: e.target.value })}
                placeholder={t('about.reportPhSource')}
                aria-label={t('about.reportAriaSource')}
                className={inputCls}
              />
              <input
                required
                type="email"
                value={fields.email}
                onChange={(e) => setFields({ ...fields, email: e.target.value })}
                placeholder="YOUR@EMAIL.COM"
                aria-label={t('about.reportAriaEmail')}
                className={inputCls}
              />
              <button
                type="submit"
                className="mt-2 inline-flex items-center justify-center rounded-sm bg-volt px-6 py-3.5 font-mono text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-950 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-volt-pop active:translate-y-0 active:shadow-none"
              >
                {t('about.reportSubmit')}
              </button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

/** about.md S5 — corrections & ethics */
export default function CorrectionsEthics() {
  const { t } = useLang()
  return (
    <section id="corrections" className="border-b border-line py-24">
      <div className="mx-auto grid max-w-container gap-14 px-[clamp(20px,4vw,48px)] lg:grid-cols-2 lg:gap-16">
        {/* Left — ethics accordion */}
        <div>
          <KickerLine chapter="05" label={t('about.ethicsKicker')} />
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-15% 0px' }}
            transition={{ duration: 0.7, ease: EASE }}
          >
            <Accordion type="single" collapsible className="mt-8 border-t border-line">
              {ETHICS.map((item, i) => (
                <AccordionItem key={item.qKey} value={`ethics-${i}`} className="border-b border-line">
                  <AccordionTrigger className="rounded-sm py-4 font-mono text-[12px] font-semibold uppercase tracking-[0.12em] text-text hover:text-volt hover:no-underline [&>svg]:text-volt">
                    {t(item.qKey)}
                  </AccordionTrigger>
                  <AccordionContent className="pb-5 pr-6 font-sans text-[14px] leading-[1.65] text-text-muted">
                    {t(item.aKey)}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        </div>

        {/* Right — public fix log */}
        <div>
          <KickerLine chapter="06" label={t('about.fixlogKicker')} />
          <div className="mt-8 border-t border-line">
            {FIX_LOG.map((row, i) => (
              <motion.div
                key={row.issue}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-line py-3.5"
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-10% 0px' }}
                transition={{ duration: 0.45, delay: i * 0.06, ease: EASE }}
              >
                <span className="font-mono text-[12px] font-semibold text-volt tnum">{row.issue}</span>
                <span className="flex-1 font-mono text-[12px] leading-[1.6] tracking-[0.04em] text-text-muted">
                  {row.fix}
                </span>
                {/* Fix date flickers once volt on entry */}
                <motion.span
                  className="font-mono text-[11px] tracking-[0.1em] text-faint tnum"
                  initial={{ color: '#5A6376' }}
                  whileInView={{ color: ['#C9F24B', '#5A6376'] }}
                  viewport={{ once: true, margin: '-10% 0px' }}
                  transition={{ duration: 0.9, delay: 0.3 + i * 0.06, times: [0.25, 1] }}
                >
                  {row.date}
                </motion.span>
              </motion.div>
            ))}
          </div>
          <motion.div
            className="mt-6 flex flex-wrap items-center gap-4"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <ReportErrorDialog />
            <a
              href="mailto:corrections@cbbrief.com"
              className="font-mono text-[11px] uppercase tracking-[0.14em] text-faint transition-colors hover:text-volt"
            >
              {t('about.fullLog')}
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
