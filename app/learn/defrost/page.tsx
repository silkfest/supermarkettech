'use client'
import Link from 'next/link'
import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import PageShell from '@/components/layout/PageShell'
import PageHeader from '@/components/PageHeader'
import LearningTabBar from '@/components/layout/LearningTabBar'

export default function DefrostPath() {
  const [answer, setAnswer] = useState<number | null>(null)
  return <PageShell><div className="min-h-screen bg-slate-50 dark:bg-slate-950"><PageHeader title="Defrost learning path" back="/learn" home={false}/><LearningTabBar/>
    <main className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      <div><p className="text-xs font-semibold uppercase tracking-widest text-blue-700 dark:text-blue-400">Understand → practise → demonstrate</p><h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">Diagnose a defrost problem</h1><p className="mt-3 text-slate-600 dark:text-slate-400">Goal: distinguish a control request from actual heat, collect evidence and verify recovery. This path links existing resources; it does not award course completion.</p></div>
      {[
        ['01','Identify the equipment','Match the installed controller and confirm whether the unit uses electric or off-cycle defrost.','Controller identification','/knowledge/traulsen#start-here-identify-the-controller'],
        ['02','Understand the sequence','Identify initiation, termination, drip time and fan delay. Write down which loads should operate in each state.','Read the defrost reference','/knowledge/defrost-systems'],
        ['03','Practise your measurements','Use the DT bunker trainer. Compare a healthy cycle with a hidden fault. Record what each measurement rules out. Values in this simulator are educational examples.','Open the bunker trainer','/simulation/dt-bunker'],
        ['04','Apply it to a service call','Enter Cold Call and work toward a frozen-case call. Diagnose from the evidence, make the repair and verify operation.','Open Cold Call','/game'],
        ['05','Demonstrate it in the field','With your supervisor, identify the actual system, explain your tests and verify recovery. Submit the appropriate assigned task for approval.','Open assigned tasks','/apprentice/training'],
      ].map(([n,title,body,label,href]) => <section key={n} className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 md:p-6"><div className="flex gap-4"><span className="text-xl font-mono font-semibold text-blue-700 dark:text-blue-400">{n}</span><div><h2 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h2><p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{body}</p><Link href={href} className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-blue-700 dark:text-blue-400">{label}<ArrowRight size={16}/></Link></div></div></section>)}
      <section className="rounded-2xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-6">
        <h2 className="font-semibold text-slate-900 dark:text-white">Check your reasoning</h2><p className="mt-2 text-sm text-slate-700 dark:text-slate-300">An electric-defrost controller shows its heater command ON. What does that prove?</p>
        <div className="mt-4 space-y-2">{['The heater is drawing current.','The controller is requesting heat; actual output still needs checking.','The whole coil has cleared.'].map((a,i) => <button key={a} aria-pressed={answer === i} onClick={() => setAnswer(i)} className={`block w-full min-h-12 rounded-lg border p-3 text-left text-sm ${answer === i ? 'border-blue-600 bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-400' : 'border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200'}`}>{a}</button>)}</div>
        {answer !== null && <p role="status" className="mt-4 text-sm text-slate-700 dark:text-slate-200">{answer === 1 ? 'Correct. ' : 'Not yet. '}A command describes the requested state. Check the appropriate circuit voltage, current and temperature response to determine what actually happened. See <Link className="underline" href="/knowledge/traulsen#reading-live-sensors-the-fastest-diagnostic-on-the-cabinet">command versus output</Link>.</p>}
      </section>
      <p className="text-sm text-slate-600 dark:text-slate-400">After practice, explain which measurement changed your diagnosis and how you confirmed the repair. Revisit the question later without looking at the answer.</p>
    </main></div></PageShell>
}
