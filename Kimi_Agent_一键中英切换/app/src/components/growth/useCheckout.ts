import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useAuth } from '@/hooks/useAuth'
import { trpc } from '@/providers/trpc'
import { LOGIN_PATH } from '@/const'

export type PlanCode = 'pro-monthly' | 'pro-annual' | 'desk-monthly' | 'desk-annual'

export type Billing = 'monthly' | 'annual'

export function planCodeFor(tier: 'pro' | 'desk', billing: Billing): PlanCode {
  return `${tier}-${billing}` as PlanCode
}

/**
 * Mock-checkout flow (pricing.md §Checkout):
 * - anon  → navigate to LOGIN_PATH (OAuth auto-provisions on first login),
 *           preserving plan + `from` in the query for continuity.
 * - authed → trpc.billing.checkout mutation { planCode, from } → server
 *           returns `/account?welcome=1[&from=…]` and we navigate there.
 * Exposes the pending plan code so the clicked card can show a processing state.
 */
export function useCheckout() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const [pendingPlan, setPendingPlan] = useState<PlanCode | null>(null)

  const from = searchParams.get('from') ?? undefined

  const checkout = trpc.billing.checkout.useMutation({
    onSuccess: (data) => {
      navigate(data.url)
    },
    onSettled: () => setPendingPlan(null),
  })

  const startCheckout = (planCode: PlanCode) => {
    if (!isAuthenticated) {
      const qs = new URLSearchParams()
      qs.set('plan', planCode)
      if (from) qs.set('from', from)
      navigate(`${LOGIN_PATH}?${qs.toString()}`)
      return
    }
    setPendingPlan(planCode)
    checkout.mutate({ planCode, from })
  }

  return {
    startCheckout,
    pendingPlan,
    isProcessing: checkout.isPending,
    checkoutError: checkout.error,
    isAuthenticated,
    authLoading,
    from,
  }
}
