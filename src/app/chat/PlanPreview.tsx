import { useEffect, useState } from 'react'
import { backend } from '../../api/backend.ts'
import type { GoalPlan } from '../../api/backend.ts'
import { Chip } from '../manage/parts.tsx'

const SHAPE: Record<string, string> = {
  quantities: 'Numbers over time or by group',
  records: 'A list of things (documents, events, places…)',
  either: 'A list of things, with numbers where they exist',
}

/**
 * How VORA reads the request, shown while it is being typed: what a row is, the subject, the time window and any
 * named source. It is the same planner the run uses, without the language model, so it costs nothing to ask.
 */
export function PlanPreview({ goal }: { goal: string }) {
  const [plan, setPlan] = useState<{ for: string; plan: GoalPlan } | null>(null)
  const text = goal.trim()

  useEffect(() => {
    if (text.length < 8) return
    let live = true
    const timer = window.setTimeout(() => {
      backend
        .analyze(text)
        .then((p) => live && setPlan({ for: text, plan: p }))
        .catch(() => live && setPlan(null))
    }, 500)
    return () => {
      live = false
      window.clearTimeout(timer)
    }
  }, [text])

  const p = text.length >= 8 && plan?.for === text ? plan.plan : null
  if (!p) return null
  const ts = p.time_scope
  const window_ = ts?.start && ts?.end ? `${ts.start.slice(0, 10)} → ${ts.end.slice(0, 10)}` : null
  const measures = p.concepts.filter((c) => c.kind === 'measure').map((c) => c.name)
  return (
    <section aria-label="How VORA reads this" className="mt-3 rounded-panel border border-dashed border-line-strong p-3">
      <p className="text-micro font-semibold text-ink-3">How VORA reads this</p>
      <ul className="mt-2 flex flex-wrap gap-1.5">
        <li title="What each row will be">
          <Chip tone="good">{SHAPE[p.answer_shape] ?? p.answer_shape}</Chip>
        </li>
        {p.subject_terms.slice(0, 6).map((s) => (
          <li key={s}>
            <Chip>about: {s}</Chip>
          </li>
        ))}
        {measures.map((m) => (
          <li key={m}>
            <Chip>measure: {m.replace(/_/g, ' ')}</Chip>
          </li>
        ))}
        {window_ && (
          <li title={ts?.policy}>
            <Chip>when: {window_}</Chip>
          </li>
        )}
        {p.entities.map((e) => (
          <li key={e}>
            <Chip>{e}</Chip>
          </li>
        ))}
        {p.geography.map((g) => (
          <li key={g}>
            <Chip>where: {g}</Chip>
          </li>
        ))}
        {p.source_mentions.map((m) => (
          <li key={m} title="VORA will look for this site first">
            <Chip tone="warn">from: {m}</Chip>
          </li>
        ))}
      </ul>
    </section>
  )
}
