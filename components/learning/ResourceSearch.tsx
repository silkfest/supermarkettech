'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Search, ArrowUpRight, Loader2, X } from 'lucide-react'
import type { SearchResult, ResourceKind } from '@/lib/knowledge/search'

const LABELS: Record<ResourceKind, string> = { procedure: 'Procedure', knowledge: 'Reference', manual: 'Manual', practice: 'Practice', path: 'Learning path', course: 'Course' }
const FILTERS = [
  { label: 'All', value: 'all' }, { label: 'Answers', value: 'answers' },
  { label: 'Manuals', value: 'manuals' }, { label: 'Learn & practise', value: 'learn' },
]

export default function ResourceSearch({ initialQuery = '', query: externalQuery, hideInput = false }: { initialQuery?: string; query?: string; hideInput?: boolean }) {
  const [query, setQuery] = useState(initialQuery)
  const q = externalQuery ?? query
  const [results, setResults] = useState<SearchResult[]>([])
  const [total, setTotal] = useState(0)
  const [retry, setRetry] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [unavailable, setUnavailable] = useState<string[]>([])
  const [filter, setFilter] = useState(0)
  useEffect(() => {
    if (externalQuery === undefined) setQuery(initialQuery || new URLSearchParams(window.location.search).get('q') || '')
  }, [initialQuery, externalQuery])
  useEffect(() => {
    const controller = new AbortController()
    setResults([]); setTotal(0); setError(''); setUnavailable([])
    if (q.trim().length < 2) { setLoading(false); return }
    setLoading(true)
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/knowledge/search?q=${encodeURIComponent(q)}&filter=${FILTERS[filter].value}`, { signal: controller.signal })
        if (!res.ok) throw new Error(res.status === 401 ? 'Sign in to search your resources.' : 'Search is unavailable. Please try again.')
        const data = await res.json()
        if (!controller.signal.aborted) { setResults(data.results ?? []); setTotal(data.total ?? data.results?.length ?? 0); setUnavailable(data.unavailable ?? []) }
      } catch (e) {
        if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Search failed.')
      } finally { if (!controller.signal.aborted) setLoading(false) }
    }, 250)
    return () => { clearTimeout(timer); controller.abort() }
  }, [q, filter, retry])

  return <section aria-label="Search ColdIQ resources" className="space-y-4">
    {!hideInput && <div className="relative">
      <label htmlFor="resource-search" className="sr-only">Search equipment, symptoms, alarms or skills</label>
      <Search className="absolute left-4 top-4 text-blue-600 dark:text-blue-400" size={20}/>
      <input id="resource-search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Equipment, symptom, alarm or skill…" type="search" autoComplete="off" maxLength={200}
        className="w-full rounded-2xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 py-4 pl-12 pr-12 text-base text-slate-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
      {query && <button aria-label="Clear search" className="absolute right-1 top-1 p-3 text-slate-500" onClick={() => setQuery('')}><X size={20}/></button>}
    </div>}
    {q.trim().length >= 2 && <>
      <div className="flex flex-wrap gap-2" aria-label="Result type">
        {FILTERS.map((f,i) => <button key={f.label} onClick={() => setFilter(i)} aria-pressed={filter === i} className={`min-h-11 rounded-full px-4 text-sm font-medium border ${filter === i ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'}`}>{f.label}</button>)}
      </div>
      <div role="status" aria-live="polite" className="text-sm text-slate-600 dark:text-slate-400">
        {loading ? <span className="flex gap-2 items-center"><Loader2 size={16} className="animate-spin"/>Searching…</span> : error || (total > results.length ? `Showing ${results.length} of ${total} matches. Narrow your search for more specific results.` : `${results.length} results`)}
      </div>
      {error && <button onClick={() => setRetry(n => n + 1)} className="min-h-11 px-4 rounded-lg border border-slate-300 dark:border-slate-600 text-sm text-blue-700 dark:text-blue-300">Retry search</button>}
      {FILTERS[filter].value === 'manuals' && <p className="text-xs text-slate-600 dark:text-slate-400">Searches manual titles. Open a document to search its contents and confirm model coverage.</p>}
      {!!unavailable.length && <p className="text-sm text-amber-700 dark:text-amber-400">Partial results: {unavailable.join(', ')} could not be fully searched.</p>}
      {!loading && !error && !results.length && <p className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-5 text-sm text-slate-600 dark:text-slate-400">No matches here. Try the manufacturer, controller or a shorter symptom. You can also browse the <Link className="underline" href="/knowledge">reference library</Link>.</p>}
      <div className="space-y-3">
        {results.map(r => <Link key={r.id} href={r.href} target={r.kind === 'manual' ? '_blank' : undefined} rel={r.kind === 'manual' ? 'noopener noreferrer' : undefined}
          className="block rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 md:p-5 hover:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-500">
          <div className="flex items-start justify-between gap-3"><div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-400">{LABELS[r.kind]}{r.status === 'sources-linked' ? ' · Sources linked' : ''}</p>
            <h3 className="mt-1 font-semibold text-slate-900 dark:text-white">{r.title}</h3>
          </div><ArrowUpRight size={18} className="shrink-0 text-slate-500"/></div>
          {r.applicability && <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">Applies to: {r.applicability}</p>}
          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{r.excerpt || r.description}</p>
          {r.status === 'review-pending' && <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">Technical review pending · confirm model-specific instructions</p>}
        </Link>)}
      </div>
    </>}
  </section>
}
