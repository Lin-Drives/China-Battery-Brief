import { useEffect } from 'react'
import { useSearchParams } from 'react-router'
import PricingHero from '@/components/growth/PricingHero'
import TierCards from '@/components/growth/TierCards'
import ComparisonTable from '@/components/growth/ComparisonTable'
import TrustRow from '@/components/growth/TrustRow'
import PricingFaq from '@/components/growth/PricingFaq'
import PricingFinalCta from '@/components/growth/PricingFinalCta'
import type { Billing } from '@/components/growth/useCheckout'
import { useLang } from '@/i18n/lang'
import { OpenAccess } from '@contracts/constants'

export default function Pricing() {
  const { t } = useLang()
  const [searchParams, setSearchParams] = useSearchParams()

  useEffect(() => {
    document.title = 'Pricing — China Battery Brief'
  }, [])

  // pricing.md §S1 — `?billing=annual` param persists; annual is the default
  // when arriving from a brief paywall gate (`?from=<slug>`).
  const explicit = searchParams.get('billing')
  const from = searchParams.get('from')
  const billing: Billing = explicit === 'annual' || explicit === 'monthly'
    ? explicit
    : from
      ? 'annual'
      : 'monthly'

  const onBillingChange = (next: Billing) => {
    const params = new URLSearchParams(searchParams)
    params.set('billing', next)
    setSearchParams(params, { replace: true })
  }

  return (
    <>
      {OpenAccess.beta && (
        <div className="border-b border-volt/40 bg-volt/10 px-[clamp(20px,4vw,48px)] py-3 text-center font-mono text-[11px] uppercase tracking-[0.16em] text-volt">
          {t('pricing.betaBanner')}
        </div>
      )}
      <PricingHero />
      <TierCards billing={billing} onBillingChange={onBillingChange} />
      <ComparisonTable />
      <TrustRow />
      <PricingFaq />
      <PricingFinalCta billing={billing} />
    </>
  )
}
