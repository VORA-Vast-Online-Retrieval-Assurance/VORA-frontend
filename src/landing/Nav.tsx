import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { useLenis } from 'lenis/react'
import { Container } from '../ui/Container.tsx'
import { ButtonLink } from '../ui/Button.tsx'
import { Mark } from '../ui/Mark.tsx'
import { useSignedInHint } from './useSignedInHint.ts'
import { Logo } from '../ui/Logo.tsx'

const links = [
  { href: '#how', label: 'How it works' },
  { href: '#sources', label: 'Sources' },
  { href: '#faq', label: 'FAQ' },
]

const focusRing = 'rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink'

export function Nav() {
  const [scrolled, setScrolled] = useState(false)
  // Signed out: "Sign in" beside the button. Either way "Open the app" works: /app sends a
  // signed-out visitor to /login and back again afterwards.
  const signedIn = useSignedInHint()
  const { pathname } = useLocation()
  const lenis = useLenis()
  // Already on the landing page, the logo takes you back to the top (the route itself doesn't change).
  const toTop = () => {
    if (pathname !== '/') return
    if (lenis) lenis.scrollTo(0)
    else window.scrollTo({ top: 0 })
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={`sticky top-0 z-50 border-b border-edge bg-canvas transition-[box-shadow] duration-200 ease-soft ${scrolled ? 'shadow-soft' : ''}`}>
      <Container className="grid min-h-18 grid-cols-[auto_1fr_auto] items-center gap-2 py-2 sm:gap-4 md:gap-8">
        <Link to="/" onClick={toTop} aria-label="VORA home" className={`group flex items-center ${focusRing}`}>
          <Logo size={44} />
        </Link>
        <nav aria-label="Primary" className="hidden items-center justify-center gap-7 border-x border-edge px-6 md:flex">
          {links.map((l) => (
            <a key={l.href} href={l.href} className={`group text-small font-medium text-ink ${focusRing}`}>
              <Mark on={false} className="group-hover:mark-on group-focus-visible:mark-on">
                {l.label}
              </Mark>
            </a>
          ))}
        </nav>
        <div className="flex items-center justify-end gap-4">
          {!signedIn && (
            <Link to="/login" className={`group text-small font-semibold text-ink ${focusRing}`}>
              <Mark on={false} className="group-hover:mark-on group-focus-visible:mark-on">
                Sign in
              </Mark>
            </Link>
          )}
          <ButtonLink to="/app">Open the app</ButtonLink>
        </div>
      </Container>
    </header>
  )
}
