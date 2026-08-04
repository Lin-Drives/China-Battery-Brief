import { useEffect } from 'react'
import AboutManifesto from '@/components/growth/AboutManifesto'
import AboutStats from '@/components/growth/AboutStats'
import AboutModel from '@/components/growth/AboutModel'
import MethodologyPipeline from '@/components/growth/MethodologyPipeline'
import CorrectionsEthics from '@/components/growth/CorrectionsEthics'
import AboutContact from '@/components/growth/AboutContact'

export default function About() {
  useEffect(() => {
    document.title = 'About — China Battery Brief'
  }, [])

  return (
    <>
      <AboutManifesto />
      <AboutStats />
      <AboutModel />
      <MethodologyPipeline />
      <CorrectionsEthics />
      <AboutContact />
    </>
  )
}
