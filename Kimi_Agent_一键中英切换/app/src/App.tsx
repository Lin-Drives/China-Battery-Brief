import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router'
import Lenis from 'lenis'
import { ScrollTrigger } from '@/lib/gsap'
import { setLenis } from '@/lib/scroll'
import Layout from '@/components/Layout'
import Home from '@/pages/Home'
import Briefs from '@/pages/Briefs'
import BriefDetail from '@/pages/BriefDetail'
import Tracker from '@/pages/Tracker'
import Tech from '@/pages/Tech'
import Risk from '@/pages/Risk'
import Pricing from '@/pages/Pricing'
import About from '@/pages/About'
import Account from '@/pages/Account'
import Login from '@/pages/Login'
import NotFound from '@/pages/NotFound'

export default function App() {
  // Global Lenis smooth scroll, synced with GSAP ScrollTrigger (design.md §6.1)
  useEffect(() => {
    const lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 0.9 })
    setLenis(lenis)
    lenis.on('scroll', ScrollTrigger.update)

    let rafId = 0
    const raf = (time: number) => {
      lenis.raf(time)
      rafId = requestAnimationFrame(raf)
    }
    rafId = requestAnimationFrame(raf)

    return () => {
      cancelAnimationFrame(rafId)
      lenis.destroy()
      setLenis(null)
    }
  }, [])

  return (
    <BrowserRouter>
      {/* Nested-route pattern: Layout renders <Outlet /> (react-dev.md contract B) */}
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="briefs" element={<Briefs />} />
          <Route path="briefs/:slug" element={<BriefDetail />} />
          <Route path="tracker" element={<Tracker />} />
          <Route path="tech" element={<Tech />} />
          <Route path="risk" element={<Risk />} />
          <Route path="pricing" element={<Pricing />} />
          <Route path="about" element={<About />} />
          <Route path="account" element={<Account />} />
          <Route path="login" element={<Login />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
