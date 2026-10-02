import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

/**
 * Keeps a scroll box at its newest content while results stream in, unless the reader has scrolled up on purpose.
 *
 * - Following: when `version` changes (new rows, a new reply), the box glides to the bottom.
 * - Reading: scrolling up stops the following; nothing pulls the reader back. `hasNew` turns true when something
 *   arrives meanwhile, so the view can offer a "Jump to latest" button (`jump`).
 * - Reaching the bottom again, by hand or with `jump`, resumes following.
 */
export function useStickToBottom<T extends HTMLElement>(version: unknown, threshold = 96) {
  const ref = useRef<T>(null)
  const following = useRef(true)
  const lastTop = useRef(0)
  const first = useRef(true)
  const [hasNew, setHasNew] = useState(false)

  const atBottom = (el: HTMLElement) => el.scrollHeight - el.scrollTop - el.clientHeight <= threshold

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onScroll = () => {
      const top = el.scrollTop
      // Only the reader scrolls up: our own glides only ever go down.
      if (top < lastTop.current - 2 && !atBottom(el)) following.current = false
      if (atBottom(el)) {
        following.current = true
        setHasNew(false)
      }
      lastTop.current = top
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    if (first.current) {
      // Opening a chat lands on its latest content, without an animation.
      first.current = false
      el.scrollTop = el.scrollHeight
      lastTop.current = el.scrollTop
      return
    }
    if (following.current) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    } else {
      setHasNew(true)
    }
  }, [version])

  const jump = useCallback(() => {
    const el = ref.current
    if (!el) return
    following.current = true
    setHasNew(false)
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [])

  return { ref, hasNew, jump }
}
