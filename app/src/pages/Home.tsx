import { useEffect } from 'react'
import Hero from '@/components/home/Hero'
import LatestBrief from '@/components/home/LatestBrief'
import Pillars from '@/components/home/Pillars'
import DataProducts from '@/components/home/DataProducts'
import Gap from '@/components/home/Gap'
import WritingSample from '@/components/home/WritingSample'
import SocialProof from '@/components/home/SocialProof'
import FinalCTA from '@/components/home/FinalCTA'

/**
 * Home — `/` (home.md). Navbar is fixed chrome (Navbar owns them);
 * the Hero opts out of Layout's nav offset with -mt-16 (full-bleed).
 */
export default function Home() {
  useEffect(() => {
    document.title = 'China Battery Brief — Weekly intelligence on Chinese batteries going global'
  }, [])

  return (
    <>
      <Hero />
      <LatestBrief />
      <Pillars />
      <DataProducts />
      <Gap />
      <WritingSample />
      <SocialProof />
      <FinalCTA />
    </>
  )
}
