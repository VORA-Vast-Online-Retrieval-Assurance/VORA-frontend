import { useEffect, useRef } from 'react'

type Props = {
  /** One particle per this many square pixels. */
  density?: number
  /** How close two dots must be (px) before a line joins them. */
  proximity?: number
  dotColor?: string
  lineColor?: string
  className?: string
}

type Particle = { x: number; y: number; vx: number; vy: number; layer: number; px: number; py: number }

/**
 * A field of drifting dots joined by faint lines, with a gentle parallax toward the pointer. A small canvas port of
 * the "particleground" effect with no jQuery: sized to its parent, sharp on high-density screens, paused while
 * off-screen or in a background tab, and still (one frame) for people who prefer reduced motion.
 */
export function ParticleField({ density = 9000, proximity = 110, dotColor = 'rgba(255,251,245,0.85)', lineColor = 'rgba(201,160,220,0.35)', className = '' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const box = canvas?.parentElement
    const ctx = canvas?.getContext('2d')
    if (!canvas || !box || !ctx) return
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let width = 0
    let height = 0
    let particles: Particle[] = []
    let frame = 0
    let visible = true
    const pointer = { x: 0, y: 0 }

    const spawn = (): Particle => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.6 + (Math.random() < 0.5 ? -0.08 : 0.08),
      vy: (Math.random() - 0.5) * 0.6 + (Math.random() < 0.5 ? -0.08 : 0.08),
      layer: 1 + Math.floor(Math.random() * 3),
      px: 0,
      py: 0,
    })

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = box.clientWidth
      height = box.clientHeight
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      // Fewer dots on small screens; capped so the line pass stays cheap.
      const wanted = Math.min(140, Math.round((width * height) / density))
      particles = particles.filter((p) => p.x <= width && p.y <= height)
      while (particles.length < wanted) particles.push(spawn())
      particles.length = wanted
    }

    const draw = () => {
      ctx.clearRect(0, 0, width, height)
      const reach = proximity * proximity
      for (const p of particles) {
        if (!still) {
          // Ease toward a parallax offset: far layers move less.
          const tx = (pointer.x - width / 2) / (14 * p.layer)
          const ty = (pointer.y - height / 2) / (14 * p.layer)
          p.px += (tx - p.px) / 12
          p.py += (ty - p.py) / 12
          if (p.x + p.vx < 0 || p.x + p.vx > width) p.vx = -p.vx
          if (p.y + p.vy < 0 || p.y + p.vy > height) p.vy = -p.vy
          p.x += p.vx
          p.y += p.vy
        }
      }
      ctx.lineWidth = 1
      ctx.strokeStyle = lineColor
      ctx.beginPath()
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i]
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j]
          const dx = a.x - b.x
          const dy = a.y - b.y
          if (dx * dx + dy * dy < reach) {
            ctx.moveTo(a.x + a.px, a.y + a.py)
            ctx.lineTo(b.x + b.px, b.y + b.py)
          }
        }
      }
      ctx.stroke()
      ctx.fillStyle = dotColor
      for (const p of particles) {
        ctx.beginPath()
        ctx.arc(p.x + p.px, p.y + p.py, 1.6 + p.layer * 0.5, 0, Math.PI * 2)
        ctx.fill()
      }
      if (!still && visible && !document.hidden) frame = requestAnimationFrame(draw)
    }

    const start = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(draw)
    }
    const onPointer = (e: PointerEvent) => {
      const r = box.getBoundingClientRect()
      pointer.x = e.clientX - r.left
      pointer.y = e.clientY - r.top
    }
    const seen = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      if (visible) start()
    })
    const sized = new ResizeObserver(() => {
      resize()
      if (still) draw()
    })
    const onVisibility = () => { if (!document.hidden && visible) start() }

    resize()
    pointer.x = width / 2
    pointer.y = height / 2
    seen.observe(box)
    sized.observe(box)
    box.addEventListener('pointermove', onPointer, { passive: true })
    document.addEventListener('visibilitychange', onVisibility)
    start()
    return () => {
      cancelAnimationFrame(frame)
      seen.disconnect()
      sized.disconnect()
      box.removeEventListener('pointermove', onPointer)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [density, proximity, dotColor, lineColor])

  return <canvas ref={canvasRef} aria-hidden className={`pointer-events-none absolute inset-0 block ${className}`} />
}
