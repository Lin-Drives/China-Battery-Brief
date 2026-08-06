import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { ExternalLink, X } from 'lucide-react'
import StatusPill from '@/components/intel/StatusPill'
import CBBButton from '@/components/Buttons'
import type { FactoryRow } from '@/components/intel/intel-utils'
import {
  fmtMonoDate,
  formatGwh,
  parseSopYear,
  regionOf,
} from '@/components/intel/intel-utils'
import { useLang, tpl } from '@/i18n/lang'

/* ------------------------------------------------------------------ */
/* tracker.md S3 — right-side 480px site file drawer.                  */
/* ------------------------------------------------------------------ */

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as [number, number, number, number]

type Milestone = { date: string; label: string; future?: boolean }

/** Derive a plausible verification timeline from status + dates we actually track. */
function buildTimeline(f: FactoryRow, t: (key: string) => string): Milestone[] {
  const dt = f.updatedAt instanceof Date ? f.updatedAt : new Date(f.updatedAt)
  const updYear = Number.isNaN(dt.getTime()) ? 2025 : dt.getFullYear()
  const sop = parseSopYear(f.sopDate)
  switch (f.status) {
    case 'operating':
      return [
        { date: String(updYear - 4), label: t('fd.ms.announced') },
        { date: String(updYear - 2), label: t('fd.ms.constructionStart') },
        { date: f.sopDate && sop ? f.sopDate : String(updYear - 1), label: t('fd.ms.sop') },
        { date: String(updYear), label: t('fd.ms.operating') },
      ]
    case 'construction':
      return [
        { date: String(updYear - 3), label: t('fd.ms.announced') },
        { date: String(updYear - 1), label: t('fd.ms.permits') },
        { date: String(updYear), label: t('fd.ms.underway') },
        { date: f.sopDate ?? '—', label: t('fd.ms.sopTarget'), future: true },
      ]
    case 'announced':
      return [
        { date: String(updYear), label: t('fd.ms.announced') },
        { date: String(updYear + 1), label: t('fd.ms.permitWindow'), future: true },
        { date: f.sopDate ?? '—', label: t('fd.ms.sopTarget'), future: true },
      ]
    case 'paused':
    case 'suspended':
      return [
        { date: String(updYear - 3), label: t('fd.ms.announced') },
        { date: String(updYear - 1), label: t('fd.ms.buildout') },
        { date: String(updYear), label: tpl(t('fd.ms.statusTo'), { s: t(`status.${f.status}`) }) },
        { date: '—', label: t('fd.ms.reeval'), future: true },
      ]
  }
}

const RELATED = [
  { num: 'No. 047', title: 'SOLD OUT IN DEBRECEN: CATL’S EUROPE IS REAL NOW', to: '/briefs/debrecen-sold-out' },
  { num: 'No. 044', title: 'NICKEL, BLACKLISTS AND KENITRA', to: '/briefs/the-governance-bottleneck' },
]

export default function FactoryDrawer({
  factory,
  onClose,
}: {
  factory: FactoryRow | null
  onClose: () => void
}) {
  const { t } = useLang()
  return (
    <AnimatePresence>
      {factory && (
        <>
          {/* scrim */}
          <motion.div
            key="scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[70] bg-ink-950/70 backdrop-blur-[4px]"
            onClick={onClose}
          />
          {/* panel */}
          <motion.aside
            key="panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.32, ease: EASE_OUT_EXPO }}
            className="fixed inset-y-0 right-0 z-[80] flex w-full flex-col border-l border-line-strong bg-ink-900 sm:w-[480px]"
            role="dialog"
            aria-label={tpl(t('fd.ariaFile'), { n: factory.siteName })}
          >
            {/* header */}
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-line px-5">
              <span className="kicker text-faint">
                {tpl(t('fd.file'), { n: String(factory.id).padStart(3, '0') })}
              </span>
              <button
                type="button"
                aria-label="Close file"
                onClick={onClose}
                className="text-text-muted transition-colors hover:text-text"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {/* keyed body: correction state resets when the site changes */}
            <DrawerBody key={factory.id} factory={factory} onClose={onClose} />
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

function DrawerBody({ factory: f, onClose }: { factory: FactoryRow; onClose: () => void }) {
  const { t } = useLang()
  const [correctionOpen, setCorrectionOpen] = useState(false)
  const [correctionSent, setCorrectionSent] = useState(false)

  // ESC closes modal first, then the drawer (tracker.md S3)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (correctionOpen) setCorrectionOpen(false)
        else onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [correctionOpen, onClose])

  const milestones = buildTimeline(f, t)
  const sources =
    f.sourceUrls && f.sourceUrls.length > 0
      ? f.sourceUrls
      : [t('fd.src1'), t('fd.src2'), t('fd.src3')]

  return (
    <>
      <motion.div
        className="flex-1 overflow-y-auto px-5 py-6"
        initial="closed"
        animate="open"
        variants={{ open: { transition: { staggerChildren: 0.04 } } }}
      >
        <motion.div variants={{ closed: { y: 16, opacity: 0 }, open: { y: 0, opacity: 1 } }}>
          <div className="flex flex-wrap items-center gap-3">
            <StatusPill status={f.status} />
            <span className="font-mono text-[11px] tracking-[0.12em] text-faint">
              {tpl(t('fd.updated'), { d: fmtMonoDate(f.updatedAt) })}
            </span>
          </div>
          <h2 className="mt-4 font-display text-[28px] leading-tight text-text">
            {t(`company.${f.company}`)} {f.siteName}
          </h2>
          <div className="mt-3 flex flex-wrap items-center gap-2 font-mono text-[11px] tracking-[0.1em]">
            <span className="rounded-sm border border-line-strong px-2 py-1 text-text">
              {t(`company.${f.company}`).toUpperCase()}
            </span>
            {f.partners && f.partners.length > 0 && (
              <span className="text-faint">{f.partners.join(' · ').toUpperCase()}</span>
            )}
          </div>
        </motion.div>

        {/* stat grid 2×2 */}
        <motion.div
          variants={{ closed: { y: 16, opacity: 0 }, open: { y: 0, opacity: 1 } }}
          className="mt-6 grid grid-cols-2 border-l border-t border-line"
        >
          {[
            { v: `${formatGwh(f.capacityGwh)} GWH`, l: t('fd.plannedCapacity') },
            { v: f.chemistry?.length ? f.chemistry.join(' + ') : '—', l: t('fd.chemistry') },
            { v: f.sopDate ?? '—', l: t('fd.sop') },
            { v: regionOf(f.countryCode) ?? f.country, l: t('tf.region') },
          ].map((cell) => (
            <div key={cell.l} className="border-b border-r border-line p-4">
              <p className="font-display text-[20px] leading-tight text-text">{cell.v}</p>
              <p className="kicker mt-1.5 text-faint">{cell.l}</p>
            </div>
          ))}
        </motion.div>

        {/* location */}
        <motion.div variants={{ closed: { y: 16, opacity: 0 }, open: { y: 0, opacity: 1 } }} className="mt-6">
          <p className="data-text text-text-muted">
            {f.lat != null && f.lng != null
              ? `${Math.abs(f.lat).toFixed(2)}°${f.lat >= 0 ? 'N' : 'S'} ${Math.abs(f.lng).toFixed(2)}°${f.lng >= 0 ? 'E' : 'W'} · `
              : ''}
            {[f.city, f.country].filter(Boolean).join(', ').toUpperCase()}
          </p>
          {/* CSS-only mini map crop */}
          <div className="graph-grid relative mt-3 h-24 overflow-hidden rounded-sm border border-line bg-ink-950">
            <span
              className="absolute h-2 w-2 rounded-full bg-volt animate-pulse-dot"
              style={{
                left: `${(((f.lng ?? 0) + 180) / 360) * 100}%`,
                top: `${((90 - (f.lat ?? 0)) / 180) * 100}%`,
              }}
            />
            <span className="absolute bottom-2 right-2 font-mono text-[9px] tracking-[0.14em] text-faint">
              {t('fd.gridRef')}
            </span>
          </div>
        </motion.div>

        {/* notes */}
        {f.notes && (
          <motion.p
            variants={{ closed: { y: 16, opacity: 0 }, open: { y: 0, opacity: 1 } }}
            className="mt-6 border-l-2 border-volt pl-4 font-sans text-[14px] leading-relaxed text-text-muted"
          >
            {f.notes}
          </motion.p>
        )}

        {/* timeline */}
        <motion.div variants={{ closed: { y: 16, opacity: 0 }, open: { y: 0, opacity: 1 } }} className="mt-8">
          <p className="kicker mb-4 text-faint">{t('fd.siteTimeline')}</p>
          <div className="relative border-l border-line-strong pl-5">
            {milestones.map((m, i) => (
              <div key={i} className="relative pb-4 last:pb-0">
                <span
                  className="absolute -left-[26px] top-1 h-2 w-2 rounded-full border"
                  style={{
                    borderColor: m.future ? 'var(--faint)' : 'var(--volt)',
                    backgroundColor: m.future ? 'transparent' : 'var(--volt)',
                    borderStyle: m.future ? 'dashed' : 'solid',
                  }}
                />
                <p
                  className="font-mono text-[11px] tnum tracking-[0.1em]"
                  style={{ color: m.future ? 'var(--faint)' : 'var(--text-muted)' }}
                >
                  {m.date}
                </p>
                <p
                  className="font-mono text-[12px] tracking-[0.08em]"
                  style={{ color: m.future ? 'var(--faint)' : 'var(--text)' }}
                >
                  {m.label}
                </p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* sources */}
        <motion.div variants={{ closed: { y: 16, opacity: 0 }, open: { y: 0, opacity: 1 } }} className="mt-8">
          <p className="kicker mb-3 text-faint">{t('fd.sources')}</p>
          <ol className="flex flex-col gap-1.5">
            {sources.map((s, i) => {
              const isUrl = /^https?:\/\//.test(s)
              const label = isUrl ? s.replace(/^https?:\/\//, '') : s
              return (
                <li key={i} className="flex items-start gap-2 font-mono text-[11px] leading-relaxed text-text-muted">
                  <span className="text-faint">{['¹', '²', '³', '⁴', '⁵'][i] ?? `${i + 1}.`}</span>
                  {isUrl ? (
                    <a
                      href={s}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 break-all transition-colors hover:text-volt"
                    >
                      {label.toUpperCase()}
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  ) : (
                    <span>{label}</span>
                  )}
                </li>
              )
            })}
          </ol>
        </motion.div>

        {/* related briefs */}
        <motion.div variants={{ closed: { y: 16, opacity: 0 }, open: { y: 0, opacity: 1 } }} className="mt-8">
          <p className="kicker mb-3 text-faint">{t('fd.related')}</p>
          <div className="flex flex-col border-t border-line">
            {RELATED.map((r) => (
              <Link
                key={r.num}
                to={r.to}
                className="group flex items-baseline gap-3 border-b border-line py-3"
              >
                <span className="font-mono text-[11px] tnum text-volt">{r.num}</span>
                <span className="flex-1 font-mono text-[11px] leading-relaxed tracking-[0.06em] text-text-muted transition-colors group-hover:text-text">
                  {r.title}
                </span>
                <span className="font-mono text-[10px] text-faint transition-transform duration-200 group-hover:translate-x-1 group-hover:text-volt">
                  →
                </span>
              </Link>
            ))}
          </div>
        </motion.div>

        {/* footer */}
        <motion.div variants={{ closed: { y: 16, opacity: 0 }, open: { y: 0, opacity: 1 } }} className="mt-8 pb-4">
          <CBBButton variant="ghost" className="w-full" onClick={() => setCorrectionOpen(true)}>
            {t('fd.correctionBtn')}
          </CBBButton>
        </motion.div>
      </motion.div>

      {/* correction modal */}
      <AnimatePresence>
        {correctionOpen && (
          <motion.div
            key="correction"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[90] flex items-center justify-center bg-ink-950/70 px-4 backdrop-blur-[4px]"
            onClick={() => setCorrectionOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="w-full max-w-md rounded-sm border border-line-strong bg-ink-900 p-6"
              onClick={(e) => e.stopPropagation()}
            >
              {correctionSent ? (
                <div className="py-6 text-center">
                  <p className="font-mono text-[12px] tracking-[0.14em] text-volt">
                    {t('fd.logged')}
                  </p>
                  <CBBButton variant="ghost" className="mt-6" onClick={() => setCorrectionOpen(false)}>
                    {t('fd.close')}
                  </CBBButton>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    setCorrectionSent(true)
                  }}
                >
                  <p className="kicker text-faint">{tpl(t('fd.correctionK'), { n: String(f.id).padStart(3, '0') })}</p>
                  <p className="mt-2 font-display text-[20px] text-text">{f.siteName}</p>
                  <textarea
                    required
                    rows={4}
                    placeholder={t('fd.correctionPh')}
                    className="mt-4 w-full rounded-sm border border-line bg-ink-950 p-3 font-mono text-[13px] text-text placeholder:text-faint focus:border-volt focus:outline-none"
                  />
                  <input
                    type="email"
                    placeholder={t('fd.emailPh')}
                    className="mt-3 w-full rounded-sm border border-line bg-ink-950 p-3 font-mono text-[13px] text-text placeholder:text-faint focus:border-volt focus:outline-none"
                  />
                  <div className="mt-5 flex justify-end gap-3">
                    <CBBButton variant="ghost" onClick={() => setCorrectionOpen(false)}>
                      {t('fd.cancel')}
                    </CBBButton>
                    <CBBButton type="submit">{t('fd.fileCorrection')}</CBBButton>
                  </div>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
