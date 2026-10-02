import { AnimatePresence, motion } from 'motion/react'

/** A small floating button shown while the reader is scrolled up and new content has arrived below. */
export function JumpToLatest({ show, onClick, label = 'New results' }: { show: boolean; onClick: () => void; label?: string }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.button
          type="button"
          onClick={onClick}
          initial={{ opacity: 0, y: 8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.96 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="absolute bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-small font-semibold text-on-ink shadow-lift hover:bg-ink-2"
        >
          {label} ↓
        </motion.button>
      )}
    </AnimatePresence>
  )
}
