import { useEffect } from 'react'
import AboutManifesto from '@/components/growth/AboutManifesto'
import AboutOrigin from '@/components/growth/AboutOrigin'
import AboutAuthor from '@/components/growth/AboutAuthor'
import AboutSynthesis from '@/components/growth/AboutSynthesis'
import AboutContact from '@/components/growth/AboutContact'

export default function About() {
  useEffect(() => {
    document.title = 'About — China Battery Brief'
  }, [])

  return (
    <>
      <AboutManifesto />
      <AboutOrigin />
      <AboutAuthor />
      <AboutSynthesis />
      <AboutContact />
    </>
  )
}
