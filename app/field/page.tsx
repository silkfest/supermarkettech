'use client'
import Link from 'next/link'
import { useState } from 'react'
import { ArrowRight, BookOpen, MessageSquare, Snowflake } from 'lucide-react'
import PageShell from '@/components/layout/PageShell'
import PageHeader from '@/components/PageHeader'
import ResourceSearch from '@/components/learning/ResourceSearch'

export default function FieldPage() {
  const [preset, setPreset] = useState('')
  return <PageShell><div className="min-h-screen bg-slate-50 dark:bg-slate-950">
    <PageHeader title="On a call" home={false} back={false} actions={<Link href="/learn" className="min-h-11 inline-flex items-center gap-2 rounded-lg px-3 text-sm font-medium text-blue-700 dark:text-blue-400">Learn <ArrowRight size={16}/></Link>}/>
    <main className="mx-auto max-w-5xl px-4 py-7 md:px-8 md:py-10 space-y-7">
      <div><p className="text-xs font-semibold uppercase tracking-widest text-blue-700 dark:text-blue-400">Field reference</p>
        <h1 className="mt-2 text-3xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">What are you working on?</h1>
        <p className="mt-3 text-base text-slate-600 dark:text-slate-400 max-w-2xl">Find a procedure, check a manual or understand the next measurement. Match the equipment before using a setting.</p></div>
      <ResourceSearch key={preset} initialQuery={preset}/>
      <div className="flex flex-wrap gap-2" aria-label="Common searches">
        {['Traulsen force defrost','MT SLA','E2 inputs','Iced evaporator'].map(q => <button key={q} onClick={() => setPreset(q)} className="min-h-11 rounded-full border border-slate-200 dark:border-slate-700 px-4 text-sm text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-900">{q}</button>)}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/knowledge/traulsen#force-a-defrost" className="rounded-2xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-6">
          <Snowflake size={24} className="text-blue-700 dark:text-blue-400"/><p className="mt-4 text-xs font-semibold text-blue-700 dark:text-blue-400">QUICK PROCEDURE · NEXT GEN ONLY</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">Force a Traulsen defrost</h2><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Controller identification, button sequence and manufacturer source.</p><span className="mt-5 flex items-center gap-2 text-sm font-semibold text-blue-700 dark:text-blue-400">Open procedure <ArrowRight size={16}/></span>
        </Link>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Choose your next step</h2>
          <Link href="/knowledge" className="mt-4 flex min-h-14 items-center gap-3 border-b border-slate-100 dark:border-slate-800 py-3 text-sm font-medium text-slate-700 dark:text-slate-200"><BookOpen size={20}/> Browse equipment and topics <ArrowRight size={16} className="ml-auto"/></Link>
          <Link href="/dashboard" className="flex min-h-14 items-center gap-3 py-3 text-sm font-medium text-slate-700 dark:text-slate-200"><MessageSquare size={20}/> Ask ColdIQ <ArrowRight size={16} className="ml-auto"/></Link>
          <p className="mt-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">AI guidance should explain its evidence and limits. An answer or citation is not a technical sign-off.</p>
        </div>
      </div>
    </main>
  </div></PageShell>
}
