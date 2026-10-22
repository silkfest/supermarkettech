import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { practiceForTopic } from '@/lib/learning/connections'
export default function RelatedPractice({ slug }: { slug: string }) {
  const resources = practiceForTopic(slug)
  if (!resources.length) return null
  return <section aria-label="Related learning and practice" className="my-5 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-5">
    <h2 className="font-semibold text-slate-900 dark:text-white">Put this into practice</h2>
    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Use these educational examples to practise reasoning. Match the actual equipment manual when working in the field.</p>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">{resources.map(r => <Link key={r.href} href={r.href} className="rounded-lg border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900 p-4 hover:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500">
      <span className="flex items-start justify-between gap-3 font-semibold text-sm text-blue-700 dark:text-blue-300">{r.title}<ArrowUpRight size={16} className="shrink-0"/></span>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{r.description}</p>
    </Link>)}</div>
  </section>
}
