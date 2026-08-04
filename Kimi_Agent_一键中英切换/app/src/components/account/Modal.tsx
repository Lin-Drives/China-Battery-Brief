import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'

/**
 * design.md §8.7 — modal: centered, ink-900, 1px --line-strong, radius 4px,
 * scale 0.96→1 + fade (220ms), ink scrim.
 */
export default function AccountModal({
  open,
  onClose,
  children,
  labelledBy,
  dismissable = true,
}: {
  open: boolean
  onClose: () => void
  children: ReactNode
  labelledBy?: string
  dismissable?: boolean
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismissable) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, dismissable])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          className="fixed inset-0 z-[95] flex items-center justify-center bg-ink-950/70 p-4 backdrop-blur-[4px]"
          onClick={() => dismissable && onClose()}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelledBy}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-md rounded border border-line-strong bg-ink-900 p-7"
            onClick={(e) => e.stopPropagation()}
          >
            {dismissable && (
              <button
                type="button"
                aria-label="Close"
                onClick={onClose}
                className="absolute right-4 top-4 text-text-muted transition-colors hover:text-text"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
