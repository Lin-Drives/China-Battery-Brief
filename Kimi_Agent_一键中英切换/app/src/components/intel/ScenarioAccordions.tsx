import { Link } from 'react-router'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { cn } from '@/lib/utils'
import { useLang, tpl } from '@/i18n/lang'

/* ------------------------------------------------------------------ */
/* geopolitics.md S3 — "If This, Then GWh" scenario accordions.        */
/* Probability chip + 5-bar impact meter (bars fill staggered on open).*/
/* ------------------------------------------------------------------ */

interface Scenario {
  title: string
  probability: number
  impact: number // 1–5
  body: string
  brief: { num: string; to: string }
}

export default function ScenarioAccordions() {
  const { t } = useLang()

  const SCENARIOS: Scenario[] = [
    {
      title: t('scen.s1.title'),
      probability: 35,
      impact: 5,
      body: t('scen.s1.body'),
      brief: { num: '№045', to: '/briefs/battery-passport-t-minus-200' },
    },
    {
      title: t('scen.s2.title'),
      probability: 40,
      impact: 3,
      body: t('scen.s2.body'),
      brief: { num: '№045', to: '/briefs/battery-passport-t-minus-200' },
    },
    {
      title: t('scen.s3.title'),
      probability: 25,
      impact: 4,
      body: t('scen.s3.body'),
      brief: { num: '№045', to: '/briefs/battery-passport-t-minus-200' },
    },
  ]

  return (
    <Accordion type="single" collapsible className="border-t border-line">
      {SCENARIOS.map((s, i) => (
        <AccordionItem key={i} value={`scenario-${i}`} className="group border-b border-line">
          <AccordionTrigger className="py-5 hover:no-underline">
            <span className="flex flex-wrap items-center gap-4">
              <span className="font-mono text-[11px] tracking-[0.14em] text-faint">
                {tpl(t('scen.label'), { n: String(i + 1).padStart(2, '0') })}
              </span>
              <span className="font-display text-[20px] font-normal leading-snug text-text">
                “{s.title}”
              </span>
              <span className="rounded-sm border border-signal/60 bg-signal/10 px-2 py-[3px] font-mono text-[10.5px] tnum tracking-[0.12em] text-signal">
                P {s.probability}%
              </span>
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="pb-2">
              {/* impact meter */}
              <div className="mb-4 flex items-center gap-3">
                <span className="font-mono text-[10px] tracking-[0.16em] text-faint">{t('scen.impact')}</span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((b) => (
                    <span
                      key={b}
                      className={cn(
                        'h-2 w-8 origin-left scale-x-0 rounded-[1px] transition-transform duration-300 ease-out group-data-[state=open]:scale-x-100',
                        b <= s.impact ? 'bg-signal' : 'bg-ink-700',
                      )}
                      style={{ transitionDelay: `${b * 60}ms` }}
                    />
                  ))}
                </div>
                <span className="font-mono text-[10.5px] tnum text-signal">{s.impact}/5</span>
              </div>
              <p className="max-w-[72ch] font-sans text-[14px] leading-relaxed text-text-muted">
                {s.body}
              </p>
              <Link
                to={s.brief.to}
                className="mt-4 inline-block font-mono text-[11px] tracking-[0.12em] text-volt hover:underline"
              >
                {tpl(t('scen.briefLink'), { no: s.brief.num })}
              </Link>
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}
