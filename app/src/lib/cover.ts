import type { SyntheticEvent } from 'react'

/**
 * Localise a cover asset for Chinese readers: `/cover-056.svg` → `/cover-056-zh.svg`.
 * Non-cover assets and non-Chinese languages pass through unchanged. Pair with
 * `coverFallback` so a missing zh file degrades to the shared cover instead of a
 * broken image.
 */
export function localizedCover(
  asset: string | null | undefined,
  lang: string,
): string | undefined {
  if (!asset) return undefined
  if (lang !== 'zh') return asset
  const m = asset.match(/^(.*\/cover-\d+)(\.\w+)$/)
  return m ? `${m[1]}-zh${m[2]}` : asset
}

/** onError handler that swaps a missing localised cover back to the original. */
export function coverFallback(original: string | null | undefined) {
  return (e: SyntheticEvent<HTMLImageElement>) => {
    const el = e.currentTarget
    if (original && !el.dataset.fallback) {
      el.dataset.fallback = '1'
      el.src = original
    }
  }
}
