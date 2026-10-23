'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowRight, BookOpen, FlaskConical, GraduationCap, MessageSquare } from 'lucide-react'
import PageShell from '@/components/layout/PageShell'
import PageHeader from '@/components/PageHeader'
import { LEARNING_PATHS } from '@/lib/learning/resources'
import LearningTabBar from '@/components/layout/LearningTabBar'

export default function LearnPage() {
  const [last, setLast] = useState<{slug: string; title: string} | null>(null)
  useEffect(() => { try { const value = JSON.parse(localStorage.getItem('coldiq_last_topic') ?? 'null'); if (value && /^[a-z0-9-]+$/.test(value.slug)) setLast(value) } catch {} }, [])
  return <PageShell><div className="min-h-screen bg-slate-50 dark:bg-slate-950">
    <PageHeader title="Learn" home={false} back={false}/><LearningTabBar/>
    <main className="max-w-5xl mx-auto px-4 py-8 md:px-8 space-y-7">
      <div><p className="text-xs font-semibold uppercase tracking-widest text-blue-700 dark:text-blue-400">Build your diagnostic skills</p><h1 className="mt-2 text-3xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">Understand it. Practise it. Prove it.</h1><p className="mt-3 text-slate-600 dark:text-slate-400">Move from an explanation to measurements, then to supervised work in the field.</p></div>
      {last && <Link href={`/knowledge/${last.slug}`} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 text-sm text-slate-700 dark:text-slate-200"><span>Continue reading <strong>{last.title}</strong></span><ArrowRight size={18}/></Link>}
      <section aria-labelledby="learning-paths">
        <h2 id="learning-paths" className="text-lg font-semibold text-slate-900 dark:text-white">Guided learning paths</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Start with a goal, work through existing resources and practise explaining your reasoning.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">{LEARNING_PATHS.map(path => <Link key={path.slug} href={path.href} className="flex flex-col rounded-2xl bg-slate-900 dark:bg-blue-950 border border-slate-700 p-6 text-white hover:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-500">
          <h3 className="text-xl font-semibold">{path.title}</h3><p className="mt-3 flex-1 text-sm leading-relaxed text-slate-200">{path.description}</p><span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-200">Start the path <ArrowRight size={16}/></span>
        </Link>)}</div>
      </section>
      <div className="grid gap-4 sm:grid-cols-2">
        {[{title:'Reference library', body:'Explore equipment, components and operating principles.',href:'/knowledge',Icon:BookOpen},{title:'Practice lab',body:'Work through fault scenarios and wiring trainers.',href:'/simulation',Icon:FlaskConical},{title:'My training',body:'Assigned courses, assessments and field task approvals.',href:'/apprentice/training',Icon:GraduationCap},{title:'Ask the team',body:'Discuss observations and questions with your colleagues.',href:'/ask',Icon:MessageSquare}].map(({title,body,href,Icon}) => <Link key={href} href={href} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 hover:border-blue-400"><Icon size={22} className="text-blue-700 dark:text-blue-400"/><h2 className="mt-3 font-semibold text-slate-900 dark:text-white">{title}</h2><p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{body}</p></Link>)}
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-400">Reading progress, simulated practice and supervised field approval are different kinds of evidence. ColdIQ progress does not award a trade qualification or apprenticeship hours.</p>
    </main>
  </div></PageShell>
}
