import { useLayoutEffect, useRef, useState } from 'react'
import { motion, useMotionValueEvent, useScroll, useSpring, useTransform } from 'motion/react'
import { useLenis } from 'lenis/react'
import { Container } from '../../ui/Container.tsx'
import { STEPS } from '../how/steps.tsx'
import type { Step } from '../how/steps.tsx'
import { Section, SectionHead } from '../SectionHead.tsx'

// Scroll distance per step while the carousel holds the page.
const PER_STEP_VH = 70

/**
 * Ask → Plan → Run → Review → Use as a carousel. The section pins to the screen and scrolling moves the cards
 * sideways, so the page only continues once the last step has been shown. The dots jump to a step.
 */
export function HowItWorks() {
  const pinRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLOListElement>(null)
  const [distance, setDistance] = useState(0)
  const [active, setActive] = useState(0)
  const lenis = useLenis()
  const { scrollYProgress } = useScroll({ target: pinRef, offset: ['start start', 'end end'] })
  // A spring keeps the slide smooth between wheel ticks.
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.4 })
  const x = useTransform(progress, (p) => -p * distance)

  useMotionValueEvent(scrollYProgress, 'change', (p) => {
    setActive(Math.min(STEPS.length - 1, Math.max(0, Math.round(p * (STEPS.length - 1)))))
  })

  useLayoutEffect(() => {
    const measure = () => {
      const view = viewRef.current
      const track = trackRef.current
      if (view && track) setDistance(Math.max(0, track.scrollWidth - view.clientWidth))
    }
    measure()
    const observer = new ResizeObserver(measure)
    if (viewRef.current) observer.observe(viewRef.current)
    if (trackRef.current) observer.observe(trackRef.current)
    return () => observer.disconnect()
  }, [])

  const goTo = (index: number) => {
    const pin = pinRef.current
    if (!pin) return
    const top = pin.getBoundingClientRect().top + window.scrollY
    const span = pin.offsetHeight - window.innerHeight
    const target = top + (span * index) / (STEPS.length - 1)
    if (lenis) lenis.scrollTo(target, { duration: 1.1 })
    else window.scrollTo({ top: target, behavior: 'smooth' })
  }

  return (
    <Section id="how" labelledBy="how-title" fit={false}>
      <Container>
        <SectionHead
          id="how-title"
          index="01"
          kicker="How it works"
          title="Five steps. You approve the second."
          lede="VORA shows the plan first, runs only what you approve and hands back a dataset you can check, value by value."
        />
      </Container>

      <div ref={pinRef} className="relative mt-10" style={{ height: `calc(${STEPS.length * PER_STEP_VH}vh + 100dvh - 4.5rem)` }}>
        <div className="sticky top-[4.5rem] flex h-[calc(100dvh-4.5rem)] flex-col justify-center gap-8 overflow-hidden py-6">
          <div ref={viewRef} className="w-full overflow-visible px-[max(1.25rem,calc((100vw-84rem)/2+2rem))]">
            <motion.ol ref={trackRef} style={{ x }} className="flex w-max gap-5 sm:gap-7" aria-label="The five steps">
              {STEPS.map((step, i) => (
                <StepCard key={step.key} step={step} index={i} active={active} />
              ))}
            </motion.ol>
          </div>

          <Container className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-2" role="tablist" aria-label="Choose a step">
              {STEPS.map((step, i) => (
                <button
                  key={step.key}
                  type="button"
                  role="tab"
                  aria-selected={i === active}
                  aria-label={`Step ${i + 1}: ${step.name}`}
                  onClick={() => goTo(i)}
                  className={`h-2.5 rounded-full transition-[width,background-color] duration-500 ease-soft ${i === active ? 'w-10 bg-ink' : 'w-2.5 bg-edge-strong hover:bg-ink-3'}`}
                />
              ))}
            </div>
            <p className="font-mono text-small text-ink-3" aria-live="polite">
              {String(active + 1).padStart(2, '0')} / {String(STEPS.length).padStart(2, '0')} · {STEPS[active].name}
            </p>
          </Container>
        </div>
      </div>
    </Section>
  )
}

function StepCard({ step, index, active }: { step: Step; index: number; active: number }) {
  const on = index === active
  return (
    <li
      aria-current={on ? 'step' : undefined}
      className={`flex w-[min(84vw,34rem)] shrink-0 flex-col justify-between gap-8 rounded-panel border p-6 transition-[opacity,scale,box-shadow,background-color,border-color] duration-500 ease-soft sm:p-8 lg:w-[min(46vw,40rem)] ${
        on ? 'scale-100 border-edge-strong bg-surface opacity-100 shadow-lift' : 'scale-[0.96] border-edge bg-sunken/60 opacity-55'
      }`}
    >
      <div>
        <div className="flex items-baseline justify-between gap-4">
          <h3 className="font-display font-wide text-h1 font-extrabold text-ink">{step.name}</h3>
          <span className="font-mono text-small text-ink-3">{String(index + 1).padStart(2, '0')}</span>
        </div>
        <p className="mt-4 max-w-[44ch] text-lead text-ink-2">{step.line}</p>
      </div>
      <div className={`rounded-control border border-edge bg-canvas p-4 transition-opacity duration-500 ${on ? 'opacity-100' : 'opacity-60'}`}>
        {step.visual(on)}
      </div>
    </li>
  )
}
