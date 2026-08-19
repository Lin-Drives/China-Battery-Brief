import { createContext, useCallback, useContext, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

/**
 * design.md §8.7 — toast: bottom-right, mono 12px, ink-800 with left 2px
 * accent bar (volt success / signal error), slide-in 240ms, auto-dismiss 4s.
 * (The app shell mounts no global toaster, so the dashboard hosts its own.)
 */

type Tone = 'volt' | 'signal' | 'amber'

type ToastItem = {
  id: number
  message: string
  tone: Tone
  action?: { label: string; onClick: () => void }
}

type PushOptions = { tone?: Tone; action?: ToastItem['action'] }

const ToastContext = createContext<(message: string, opts?: PushOptions) => void>(() => {})

export function useToast() {
  return useContext(ToastContext)
}

const toneColor: Record<Tone, string> = {
  volt: 'var(--volt)',
  signal: 'var(--signal)',
  amber: 'var(--amber)',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(1)

  const dismiss = useCallback((id: number) => {
    setToasts((ts) => ts.filter((t) => t.id !== id))
  }, [])

  const push = useCallback(
    (message: string, opts?: PushOptions) => {
      const id = nextId.current++
      const toast: ToastItem = { id, message, tone: opts?.tone ?? 'volt', action: opts?.action }
      setToasts((ts) => [...ts.slice(-3), toast])
      window.setTimeout(() => dismiss(id), 4000)
    },
    [dismiss],
  )

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-6 right-6 z-[100] flex w-[min(360px,calc(100vw-48px))] flex-col gap-2">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              className="pointer-events-auto flex items-stretch overflow-hidden rounded-sm border border-line bg-ink-800"
            >
              <span aria-hidden className="w-0.5 shrink-0" style={{ backgroundColor: toneColor[t.tone] }} />
              <div className="flex flex-1 items-center justify-between gap-3 px-4 py-3">
                <p className="font-mono text-[12px] uppercase tracking-[0.08em] text-text">{t.message}</p>
                {t.action && (
                  <button
                    type="button"
                    onClick={() => {
                      t.action?.onClick()
                      dismiss(t.id)
                    }}
                    className="shrink-0 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-volt hover:underline"
                  >
                    {t.action.label}
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}
