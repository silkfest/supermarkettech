'use client'
import Link from 'next/link'
import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import type { LearningPath } from '@/lib/learning/paths'
import PageShell from '@/components/layout/PageShell'
import PageHeader from '@/components/PageHeader'
import LearningTabBar from '@/components/layout/LearningTabBar'

export default function LearningPathView({ path }: { path: LearningPath }) {
  const [answer, setAnswer] = useState<number | null>(null)
  return <PageShell><div className="min-h-screen bg-slate-50 dark:bg-slate-950">
    <PageHeader title="Learning path" back="/learn" home={false}/><LearningTabBar/>
    <main className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-blue-700 dark:text-blue-400">Understand → practise → demonstrate</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{path.title}</h1>
        <p className="mt-3 text-slate-700 dark:text-slate-300">Goal: {path.goal}</p>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{path.audience}</p>
      </div>
      <nav aria-label="Path steps" className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Choose where to start</p>
        <ol className="mt-2">{path.steps.map((step, i) => <li key={step.id}><a href={`#${step.id}`} className="min-h-11 flex items-center gap-3 text-sm text-blue-700 dark:text-blue-300 underline underline-offset-4"><span className="font-mono text-slate-500 dark:text-slate-400">{String(i+1).padStart(2,'0')}</span>{step.title}</a></li>)}</ol>
      </nav>
      {path.steps.map((step, i) => <section id={step.id} key={step.id} aria-labelledby={`${step.id}-title`} className="scroll-mt-24 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 md:p-6">
        <div className="flex gap-4"><span aria-hidden="true" className="text-xl font-mono font-semibold text-blue-700 dark:text-blue-400">{String(i+1).padStart(2,'0')}</span>
          <div className="min-w-0 flex-1">
            <h2 id={`${step.id}-title`} className="text-lg font-semibold text-slate-900 dark:text-white">{step.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{step.body}</p>
            <div className={`mt-3 ${step.links.length > 2 ? 'grid sm:grid-cols-2 gap-x-4' : 'space-y-1'}`}>{step.links.map(link => <Link key={link.href} href={link.href} className="flex min-h-11 items-center justify-between gap-2 text-sm font-semibold text-blue-700 dark:text-blue-300 underline underline-offset-4">{link.label}<ArrowRight size={16} className="shrink-0"/></Link>)}</div>
            <div className="mt-4 border-t border-slate-200 dark:border-slate-700 pt-3"><p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Before moving on</p><p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{step.outcome}</p></div>
          </div>
        </div>
      </section>)}
      <section aria-labelledby="reasoning-check" className="rounded-2xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-5 md:p-6">
        <h2 id="reasoning-check" className="font-semibold text-slate-900 dark:text-white">Check your reasoning</h2>
        <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{path.check.question}</p>
        <div className="mt-4 space-y-2">{path.check.choices.map((choice,i) => <button key={choice.text} aria-pressed={answer === i} onClick={() => setAnswer(i)} className={`block w-full min-h-12 rounded-lg border p-3 text-left text-sm ${answer === i ? 'border-blue-600 bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-300' : 'border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200'}`}>{choice.text}</button>)}</div>
        {answer !== null && <div role="status" className="mt-4 text-sm text-slate-700 dark:text-slate-200"><p>{answer === path.check.correct ? '' : 'Not yet. '}{path.check.choices[answer].feedback}</p><Link className="mt-2 inline-flex min-h-11 items-center underline" href={path.check.reference.href}>{path.check.reference.label}</Link></div>}
      </section>
      <p className="text-sm text-slate-600 dark:text-slate-400">This is self-directed study. Opening resources or answering the check does not award course completion, field sign-off or apprenticeship hours. Use My training for assigned assessments and approvals.</p>
      <Link href="/learn" className="inline-flex min-h-11 items-center text-sm font-semibold text-blue-700 dark:text-blue-300 underline">Explore learning paths</Link>
    </main>
  </div></PageShell>
}
