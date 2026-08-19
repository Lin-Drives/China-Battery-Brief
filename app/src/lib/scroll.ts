import type Lenis from 'lenis'

let lenis: Lenis | null = null

export function setLenis(instance: Lenis | null) {
  lenis = instance
}

export function getLenis() {
  return lenis
}

/**
 * Smooth-scroll to an element. Prefers the global Lenis instance (which owns
 * the wheel scroll and would otherwise override a native `window.scrollTo`),
 * and falls back to the native API when Lenis is not running.
 */
export function scrollToEl(el: HTMLElement | string, offset = 0) {
  const target = typeof el === 'string' ? document.getElementById(el) : el
  if (!target) return
  if (lenis) {
    lenis.scrollTo(target, { offset })
  } else {
    window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY + offset, behavior: 'smooth' })
  }
}
