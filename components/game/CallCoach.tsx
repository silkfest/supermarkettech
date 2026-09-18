'use client'
import { useState } from 'react'
import { GraduationCap, HelpCircle, X } from 'lucide-react'

/** What each stage of a call is for, in the words you would use to a first-year
 *  standing next to you. Shown open on a first shift, and behind a Stuck? button
 *  after that, so it teaches once and stays available without nagging. */
const COACH: Record<string, { head: string; body: string; hints: string[] }> = {
  ticket: {
    head: 'This is the call as dispatch took it',
    body: 'The store tells you what they noticed, which is rarely what is wrong. Read it for what it rules in, then start diagnosing.',
    hints: ['Note what the store says changed, and when.', 'Press “Start diagnosing” to walk up to the equipment.']
  },
  diagnose: {
    head: 'Readings first, then checks',
    body: 'Every reading has an “expect” beside it — the ones that are off are the fault talking. Checks buy you more, but each one costs shift time, so spend them on the ones that separate two likely causes.',
    hints: [
      'Compare each reading against its expect line before you run anything.',
      'Run the checks that would tell two candidate causes apart, not every check on the list.',
      'Name the cause that explains every off reading, not just the loudest one.'
    ]
  },
  fix: {
    head: 'Choose the repair',
    body: 'The right diagnosis still leaves a choice about what to actually do. A wrong part costs the customer money and you the time to fit it.',
    hints: [
      'The fix should follow from the cause you named.',
      'A repair that only treats the symptom will show up again on a later shift.'
    ]
  },
  verify: {
    head: 'Prove it worked',
    body: 'Watch the readings move the right way before you call it done. This is the part techs skip and get called back for.',
    hints: ['Look for the numbers that were off to come back into range.']
  },
  log: {
    head: 'Write it up',
    body: 'Found, did, verified. The report is what the next tech and the store manager actually read.',
    hints: ['Say what you found, what you changed, and what you confirmed afterwards.']
  }
}

export default function CallCoach({
  stage,
  firstShift
}: {
  stage: string
  /** Open by default on a first shift; otherwise it waits behind Stuck?. */
  firstShift: boolean
}) {
  const [open, setOpen] = useState(firstShift)
  const [hints, setHints] = useState(0)
  const c = COACH[stage]
  if (!c) return null
  if (!open)
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full min-h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1.5"
      >
        <HelpCircle size={12} /> Stuck? What this step is for
      </button>
    )
  return (
    <section
      aria-label="How this step works"
      className="rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/50 p-3 space-y-2"
    >
      <div className="flex items-start gap-2">
        <GraduationCap size={14} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-semibold text-blue-900 dark:text-blue-200">{c.head}</p>
          <p className="text-[11px] text-blue-800 dark:text-blue-300 leading-relaxed mt-0.5">{c.body}</p>
        </div>
        <button
          onClick={() => setOpen(false)}
          aria-label="Hide the walkthrough"
          className="p-1 -mr-1 -mt-1 text-blue-500 dark:text-blue-400 flex-shrink-0"
        >
          <X size={14} />
        </button>
      </div>
      {c.hints.slice(0, hints).map((h, i) => (
        <p
          key={h}
          className="text-[11px] text-blue-800 dark:text-blue-300 border-l-2 border-blue-300 dark:border-blue-700 pl-2"
        >
          {i === c.hints.length - 1 ? <b>{h}</b> : h}
        </p>
      ))}
      {hints < c.hints.length && (
        <button
          onClick={() => setHints((n) => n + 1)}
          className="min-h-9 px-2.5 rounded-lg border border-blue-300 dark:border-blue-700 text-[11px] text-blue-700 dark:text-blue-300"
        >
          {hints ? 'More help' : 'Give me a nudge'}
        </button>
      )}
    </section>
  )
}
