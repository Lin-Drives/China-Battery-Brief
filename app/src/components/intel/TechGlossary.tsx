import { useState } from 'react'
import { Check, Link2 } from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { useLang, tpl } from '@/i18n/lang'

/* ------------------------------------------------------------------ */
/* tech.md S5 — Glossary accordion ("Speak Electrochemistry").         */
/* ------------------------------------------------------------------ */

const TERM_IDS = [
  'lfp',
  'lmfp',
  'nmc',
  'na-ion',
  'semi-solid',
  'solid-state',
  'dendrite',
  'ctp',
  'energy-density',
  'cycle-life',
] as const

export default function TechGlossary() {
  const { t } = useLang()
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const TERMS: { id: string; term: string; def: string }[] = TERM_IDS.map((id) => ({
    id,
    term: t(`gloss.${id}.term`),
    def: t(`gloss.${id}.def`),
  }))

  const copyLink = (id: string) => {
    const url = `${window.location.origin}${window.location.pathname}#glossary-${id}`
    navigator.clipboard?.writeText(url).catch(() => {})
    setCopiedId(id)
    window.setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 1500)
  }

  return (
    <Accordion type="single" collapsible className="grid grid-cols-1 gap-x-10 md:grid-cols-2">
      {TERMS.map((term) => (
        <AccordionItem
          key={term.id}
          value={term.id}
          id={`glossary-${term.id}`}
          className="group relative border-b border-line"
        >
          <AccordionTrigger className="py-4 hover:no-underline">
            <span className="flex items-center gap-3">
              <span className="font-mono text-[12px] tracking-[0.14em] text-lithium">
                {term.term.split(' ')[0].split('(')[0]}
              </span>
              <span className="font-display text-[18px] font-normal text-text">{term.term}</span>
            </span>
          </AccordionTrigger>
          {/* copy-link icon (hover) — outside the trigger button */}
          <button
            type="button"
            aria-label={tpl(t('tg.copyLink'), { term: term.term })}
            onClick={() => copyLink(term.id)}
            className="absolute right-7 top-4 shrink-0 text-faint opacity-0 transition-opacity duration-150 hover:text-volt group-hover:opacity-100"
          >
            {copiedId === term.id ? (
              <Check className="h-3.5 w-3.5 text-volt" />
            ) : (
              <Link2 className="h-3.5 w-3.5" />
            )}
          </button>
          <AccordionContent>
            <p className="font-sans text-[14px] leading-relaxed text-text-muted">{term.def}</p>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}
