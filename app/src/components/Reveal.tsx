import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from '@/lib/gsap'

/**
 * design.md §6.1 default reveal — children slide up 36px, opacity 0→1,
 * ease-out-expo, stagger 0.07s per child, trigger at top 80%, once.
 */
export default function Reveal({
  children,
  className,
  delay = 0,
  y = 36,
  stagger = 0.07,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
  y?: number
  stagger?: number
}) {
  const ref = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      if (!ref.current) return
      const targets = ref.current.children.length > 1 ? ref.current.children : ref.current
      gsap.fromTo(
        targets,
        { y, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.9,
          delay,
          stagger,
          ease: 'expo.out',
          scrollTrigger: { trigger: ref.current, start: 'top 80%', once: true },
        },
      )
    },
    { scope: ref },
  )

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}
