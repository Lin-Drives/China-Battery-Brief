import { useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import type { Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { dominantPillar, pillarColor, pillarLabel } from './pillar'

export type TocHeading = { id: string; text: string }

/** Optional per-chapter kicker, set in the markdown as a comment directly above
 *  the heading: `<!-- k:#C9F24B|PART 01 · SOUTHEAST ASIA -->`. When present it
 *  replaces the auto-generated chapter label. */
export type Kicker = { label: string; color: string }

export function extractKickers(markdown: string): Map<string, Kicker> {
  const kickers = new Map<string, Kicker>()
  const lines = markdown.split('\n')
  for (let i = 0; i < lines.length - 1; i++) {
    const m = lines[i].match(/^\s*<!--\s*k:([^|]+?)\|([\s\S]+?)\s*-->\s*$/)
    if (!m) continue
    const heading = lines[i + 1].match(/^##\s+(.+)$/)
    if (heading) kickers.set(heading[1].trim(), { color: m[1].trim(), label: m[2].trim() })
  }
  return kickers
}

/** Slugify a `##` heading for anchor ids (TOC scrollspy). */
export function headingSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

/** Extract `##` headings from markdown for the TOC rail. */
export function extractHeadings(markdown: string): TocHeading[] {
  return markdown
    .split('\n')
    .filter((l) => l.startsWith('## '))
    .map((l) => l.replace(/^##\s+/, '').trim())
    .filter(Boolean)
    .map((text) => ({ id: headingSlug(text), text }))
}

/** Remove dangling `[^n]` footnote refs (truncated previews lose the definitions). */
export function stripDanglingFootnoteRefs(markdown: string): string {
  const defined = new Set(
    [...markdown.matchAll(/^\[\^(\d+)\]:/gm)].map((m) => m[1]),
  )
  return markdown.replace(/\[\^(\d+)\]/g, (whole, n: string) =>
    defined.has(n) ? whole : '',
  )
}

/* Scoped reader styles that Tailwind can't express (drop cap, gfm footnotes).
   Everything is namespaced under .cbb-reader and driven by the sheet's CSS vars
   so the paper-tone flip (cream / sepia / night) keeps working. */
const READER_CSS = `
.cbb-reader h2.cbb-h2 + p::first-letter {
  font-family: Fraunces, 'Noto Serif SC', serif;
  font-weight: 600;
  font-size: 3.3em;
  float: left;
  line-height: 0.82;
  padding: 6px 12px 0 0;
  border-bottom: 3px solid var(--dropcap-color, #C9F24B);
}
.cbb-reader sup {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.62em;
  letter-spacing: 0.04em;
}
.cbb-reader sup a {
  color: var(--dropcap-color, #C9F24B);
  text-decoration: none;
  padding: 0 1px;
}
.cbb-footnotes ol { list-style: none; padding: 0; margin: 0; }
.cbb-footnotes li {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 11px;
  line-height: 1.75;
  color: var(--sheet-muted, #6B6558);
  margin-bottom: 10px;
  padding-left: 28px;
  position: relative;
  counter-increment: cbbfn;
}
.cbb-footnotes li::before {
  content: counter(cbbfn, decimal-leading-zero);
  position: absolute;
  left: 0;
  top: 0;
  color: var(--dropcap-color, #C9F24B);
}
.cbb-footnotes ol { counter-reset: cbbfn; }
.cbb-footnotes li p { display: inline; margin: 0; font: inherit; }
.cbb-footnotes a[data-footnote-backref] {
  margin-left: 6px;
  color: var(--dropcap-color, #C9F24B);
  text-decoration: none;
}
`

/**
 * brief-detail.md S4 — markdown body rendered in the paper type system:
 * Newsreader body 19px/1.78 (reader-size var), Fraunces section headings with
 * pillar kickers + scrollspy ids, hairline GFM tables, pullquote blockquotes,
 * ◆◆◆ dividers, mono footnotes (gfm) styled as the SOURCES ledger.
 */
export default function ReaderMarkdown({
  content,
  pillars,
  headings,
}: {
  content: string
  pillars: string[]
  headings: TocHeading[]
}) {
  const kickers = useMemo(() => extractKickers(content), [content])
  const components = useMemo<Components>(() => {
    return {
      h2({ node, children, ...props }) {
        const text = String(
          Array.isArray(children) ? children.join('') : children ?? '',
        )
        // gfm footnote label → styled SOURCES heading
        const isFootnoteLabel =
          (node?.properties?.id as string | undefined) === 'footnote-label'
        if (isFootnoteLabel) {
          return (
            <h2 id="sources" className="cbb-h2-footnotes mb-6 mt-0">
              <span className="flex items-center gap-3">
                <span
                  className="font-mono text-[11px] font-medium uppercase tracking-[0.16em]"
                  style={{ color: 'var(--sheet-muted)' }}
                >
                  SOURCES · REFERENCES
                </span>
                <span
                  aria-hidden
                  className="h-px w-10"
                  style={{ backgroundColor: 'var(--sheet-line)' }}
                />
              </span>
            </h2>
          )
        }
        const idx = headings.findIndex((h) => h.text === text)
        const id = idx >= 0 ? headings[idx].id : headingSlug(text)
        const kicker = kickers.get(text)
        const color = kicker?.color ?? pillarColor(dominantPillar(pillars))
        return (
          <h2 id={id} className="cbb-h2 mb-7 mt-14 scroll-mt-28 first:mt-0" {...props}>
            <span className="mb-3 flex items-center gap-3">
              <span
                className="font-mono text-[11px] font-medium uppercase tracking-[0.16em]"
                style={{ color }}
              >
                {kicker
                  ? kicker.label
                  : `${idx >= 0 ? String(idx + 1).padStart(2, '0') : '··'} · ${pillarLabel(dominantPillar(pillars))}`}
              </span>
              <span aria-hidden className="h-px w-10" style={{ backgroundColor: color }} />
            </span>
            <span
              className="block font-display text-[clamp(1.6rem,2.6vw,1.75rem)] font-medium leading-[1.15]"
              style={{ color: 'var(--sheet-ink)' }}
            >
              {children}
            </span>
          </h2>
        )
      },
      p({ node: _n, children, ...props }) {
        return (
          <p
            className="mb-7 font-serif leading-[1.78]"
            style={{ color: 'var(--sheet-ink)', fontSize: 'var(--reader-body, 19px)' }}
            {...props}
          >
            {children}
          </p>
        )
      },
      strong({ node: _n, children, ...props }) {
        return (
          <strong className="font-medium" {...props}>
            {children}
          </strong>
        )
      },
      a({ node: _n, children, ...props }) {
        return (
          <a
            className="underline decoration-1 underline-offset-4 transition-opacity hover:opacity-70"
            style={{ color: 'var(--sheet-ink)', textDecorationColor: 'var(--dropcap-color)' }}
            {...props}
          >
            {children}
          </a>
        )
      },
      blockquote({ node: _n, children, ...props }) {
        return (
          <blockquote
            className="my-10 border-l-2 py-1 pl-6 font-display text-[clamp(1.25rem,2.4vw,1.625rem)] italic leading-[1.35]"
            style={{
              borderColor: 'var(--dropcap-color)',
              color: 'var(--sheet-ink)',
            }}
            {...props}
          >
            {children}
          </blockquote>
        )
      },
      hr() {
        return (
          <div
            aria-hidden
            className="my-12 text-center font-mono text-[12px] tracking-[0.5em]"
            style={{ color: 'var(--sheet-muted)' }}
          >
            ◆ ◆ ◆
          </div>
        )
      },
      table({ node: _n, children, ...props }) {
        return (
          <div className="my-9 overflow-x-auto">
            <table
              className="w-full border-collapse font-mono text-[12.5px] leading-[1.6] tnum"
              style={{ color: 'var(--sheet-ink)' }}
              {...props}
            >
              {children}
            </table>
          </div>
        )
      },
      th({ node: _n, children, ...props }) {
        return (
          <th
            className="border px-3 py-2 text-left font-mono text-[10.5px] font-medium uppercase tracking-[0.1em]"
            style={{ borderColor: 'var(--sheet-line)', color: 'var(--sheet-muted)' }}
            {...props}
          >
            {children}
          </th>
        )
      },
      td({ node: _n, children, ...props }) {
        return (
          <td
            className="border px-3 py-2 align-top"
            style={{ borderColor: 'var(--sheet-line)' }}
            {...props}
          >
            {children}
          </td>
        )
      },
      ul({ node: _n, children, ...props }) {
        return (
          <ul
            className="mb-7 list-disc space-y-2 pl-6 font-serif leading-[1.78] marker:text-[color:var(--sheet-muted)]"
            style={{ color: 'var(--sheet-ink)', fontSize: 'var(--reader-body, 19px)' }}
            {...props}
          >
            {children}
          </ul>
        )
      },
      ol({ node: _n, children, ...props }) {
        return (
          <ol
            className="mb-7 list-decimal space-y-2 pl-6 font-serif leading-[1.78] marker:font-mono marker:text-[0.75em] marker:text-[color:var(--sheet-muted)]"
            style={{ color: 'var(--sheet-ink)', fontSize: 'var(--reader-body, 19px)' }}
            {...props}
          >
            {children}
          </ol>
        )
      },
      code({ node: _n, children, className, ...props }) {
        // Inline code only (no fenced blocks in brief copy, but stay safe)
        if (className?.includes('language-')) {
          return (
            <code className={className} {...props}>
              {children}
            </code>
          )
        }
        return (
          <code
            className="rounded-[2px] px-1.5 py-0.5 font-mono text-[0.82em]"
            style={{ backgroundColor: 'var(--sheet-2)', color: 'var(--sheet-ink)' }}
            {...props}
          >
            {children}
          </code>
        )
      },
      section({ node, children, ...props }) {
        const isFootnotes =
          node?.properties?.dataFootnotes !== undefined ||
          String(node?.properties?.className ?? '').includes('footnotes')
        if (isFootnotes) {
          return (
            <section
              className="cbb-footnotes mt-16 pt-8"
              style={{ borderTop: '1px solid var(--sheet-line)' }}
              {...props}
            >
              {children}
            </section>
          )
        }
        return <section {...props}>{children}</section>
      },
    }
  }, [headings, pillars, kickers])

  return (
    <div className="cbb-reader">
      <style>{READER_CSS}</style>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  )
}
