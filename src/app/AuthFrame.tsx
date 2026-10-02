import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Container } from '../ui/Container.tsx'
import { Logo } from '../ui/Logo.tsx'

/** The frame for sign-in screens: the wordmark home link on a 2px rule, then one narrow column. */
export function AuthFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="border-b border-edge bg-surface">
        <Container className="flex h-18 items-center">
          <Link
            to="/"
            aria-label="VORA home"
            className="group rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
          >
            <Logo size={44} />
          </Link>
        </Container>
      </header>
      <main id="main" className="flex flex-1 items-center py-16">
        <Container className="grid gap-10 lg:grid-cols-12 lg:items-center">
          <aside className="lg:col-span-5">
            <p className="mb-5 font-mono text-micro font-bold uppercase tracking-widest text-ink-2">A research desk for the open web</p>
            <Logo size={120} className="mb-6" />
            <p className="max-w-[12ch] font-display font-wide text-h1 font-extrabold">Ask. Track. Verify.</p>
          </aside>
          <div className="neo-panel min-w-0 p-6 sm:p-9 lg:col-span-7">{children}</div>
        </Container>
      </main>
    </div>
  )
}
