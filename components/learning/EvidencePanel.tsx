'use client'
import Link from 'next/link'
import { getTopicEvidence, contentRevision } from '@/lib/knowledge/evidence'
export default function EvidencePanel({ slug, content }: { slug: string; content: string }) {
  const evidence = getTopicEvidence(slug)
  const revision = contentRevision(content)
  return <section aria-label="Applicability and sources" className="mb-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-4 text-sm space-y-3">
    <div className="flex flex-wrap justify-between gap-2">
      <strong className="text-slate-800 dark:text-slate-100">{evidence.status === 'sources-linked' ? 'Sources linked · technical sign-off pending' : 'Technical review pending'}</strong>
      <span className="text-xs text-slate-500 dark:text-slate-400">Revision {revision}</span>
    </div>
    <p className="text-slate-600 dark:text-slate-300">{evidence.scope}</p>
    {evidence.checkedOn && <p className="text-xs text-slate-500 dark:text-slate-400">Procedure source compared {evidence.checkedOn}. {evidence.reviewer ? `Reviewed by ${evidence.reviewer}.` : 'No independent technical reviewer recorded.'}</p>}
    {evidence.procedures?.map(p => <div key={p.id} className="rounded-lg bg-white dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-700 space-y-2">
      <h2 className="font-semibold text-slate-900 dark:text-white">{p.title}</h2>
      <p className="text-xs text-slate-600 dark:text-slate-400">Applies to: {p.appliesTo}</p>
      <ol className="list-decimal pl-5 space-y-1 text-slate-800 dark:text-slate-200">{p.steps.map(s => <li key={s}>{s}</li>)}</ol>
      <p className="text-slate-600 dark:text-slate-300">{p.expected}</p>
      <a href={p.source.url} target="_blank" rel="noopener noreferrer" className="inline-block py-2 text-blue-700 dark:text-blue-300 underline">{p.source.title} — {p.source.location}</a>
    </div>)}
    <div className="flex flex-wrap gap-x-5 gap-y-2">
      {evidence.practice && <Link className="min-h-11 inline-flex items-center text-blue-700 dark:text-blue-300 underline" href="/learn/defrost">Learn and practise defrost diagnosis</Link>}
      <Link className="min-h-11 inline-flex items-center text-blue-700 dark:text-blue-300 underline" href={`/feedback?topic=${encodeURIComponent(slug)}&revision=${revision}`}>Report a content issue</Link>
    </div>
  </section>
}
