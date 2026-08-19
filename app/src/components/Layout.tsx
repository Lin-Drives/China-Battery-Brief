import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

/**
 * Shared layout — nested-route pattern: this component renders <Outlet /> and
 * App.tsx declares child routes inside it (react-dev.md contract B).
 *
 * Navbar is `fixed` (design.md §8.1), so Layout owns the offset: the content
 * slot gets `pt-16` (64px nav height). Full-bleed heroes opt out inside the
 * page (e.g. with `-mt-16`), not by removing this padding.
 */
export default function Layout() {
  const { pathname } = useLocation()

  // Restore scroll position on route change
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="min-h-[100dvh] bg-ink-950 text-text">
      <Navbar />
      <main className="pt-16">
        <Outlet />
      </main>
      <Footer />
      {/* Global film grain overlay (design.md §5) */}
      <div aria-hidden className="grain-overlay" />
    </div>
  )
}
