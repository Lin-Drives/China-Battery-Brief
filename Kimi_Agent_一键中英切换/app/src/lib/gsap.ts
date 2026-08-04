import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

// Register GSAP plugins once for the whole app (design.md §13)
gsap.registerPlugin(ScrollTrigger)

export const EASE_OUT_EXPO = 'cubic-bezier(0.16,1,0.3,1)'
export const EASE_IO = 'cubic-bezier(0.65,0,0.35,1)'

export { gsap, ScrollTrigger }
