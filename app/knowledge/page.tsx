'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Snowflake, Sliders, Zap, LayoutGrid, Cpu, Store, Thermometer, Calculator,
  CircuitBoard, Gauge, ToggleRight, Wind, Monitor, Activity, Flame, Warehouse, Layers,
  ShoppingBag, Settings2, RefreshCcw,
  BookOpen, Search, X,
} from 'lucide-react'
import { TOPICS, type KnowledgeTopic } from '@/lib/knowledge/topics'
import PageShell from '@/components/layout/PageShell'

// ── Color map — static class names so Tailwind purge can see them ─────────────
const COLOR_MAP: Record<string, { bg: string; text: string; border: string; tag: string }> = {
  sky:     { bg: 'bg-sky-100',     text: 'text-sky-600',     border: 'border-sky-200',    tag: 'bg-sky-50 text-sky-700 border-sky-200' },
  blue:    { bg: 'bg-blue-100',    text: 'text-blue-600',    border: 'border-blue-200',   tag: 'bg-blue-50 text-blue-700 border-blue-200' },
  violet:  { bg: 'bg-violet-100',  text: 'text-violet-600',  border: 'border-violet-200', tag: 'bg-violet-50 text-violet-700 border-violet-200' },
  emerald: { bg: 'bg-emerald-100', text: 'text-emerald-600', border: 'border-emerald-200',tag: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  rose:    { bg: 'bg-rose-100',    text: 'text-rose-600',    border: 'border-rose-200',   tag: 'bg-rose-50 text-rose-700 border-rose-200' },
  amber:   { bg: 'bg-amber-100',   text: 'text-amber-600',   border: 'border-amber-200',  tag: 'bg-amber-50 text-amber-700 border-amber-200' },
  teal:    { bg: 'bg-teal-100',    text: 'text-teal-600',    border: 'border-teal-200',   tag: 'bg-teal-50 text-teal-700 border-teal-200' },
  indigo:  { bg: 'bg-indigo-100', text: 'text-indigo-600', border: 'border-indigo-200', tag: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  purple:  { bg: 'bg-purple-100', text: 'text-purple-600', border: 'border-purple-200', tag: 'bg-purple-50 text-purple-700 border-purple-200' },
  cyan:    { bg: 'bg-cyan-100',   text: 'text-cyan-600',   border: 'border-cyan-200',   tag: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  orange:  { bg: 'bg-orange-100', text: 'text-orange-600', border: 'border-orange-200', tag: 'bg-orange-50 text-orange-700 border-orange-200' },
  lime:    { bg: 'bg-lime-100',   text: 'text-lime-600',   border: 'border-lime-200',   tag: 'bg-lime-50 text-lime-700 border-lime-200' },
  green:   { bg: 'bg-green-100',  text: 'text-green-600',  border: 'border-green-200',  tag: 'bg-green-50 text-green-700 border-green-200' },
  red:     { bg: 'bg-red-100',    text: 'text-red-600',    border: 'border-red-200',    tag: 'bg-red-50 text-red-700 border-red-200' },
  yellow:  { bg: 'bg-yellow-100', text: 'text-yellow-600', border: 'border-yellow-200', tag: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  slate:   { bg: 'bg-slate-100',  text: 'text-slate-600',  border: 'border-slate-200',  tag: 'bg-slate-50 text-slate-700 border-slate-200' },
  pink:    { bg: 'bg-pink-100',   text: 'text-pink-600',   border: 'border-pink-200',   tag: 'bg-pink-50 text-pink-700 border-pink-200' },
}

// ── Icon map ──────────────────────────────────────────────────────────────────
const ICON_MAP: Record<string, React.ReactNode> = {
  Snowflake:   <Snowflake   size={22} />,
  Sliders:     <Sliders     size={22} />,
  Zap:         <Zap         size={22} />,
  LayoutGrid:  <LayoutGrid  size={22} />,
  Cpu:         <Cpu         size={22} />,
  Store:       <Store       size={22} />,
  Thermometer:  <Thermometer  size={22} />,
  Calculator:   <Calculator   size={22} />,
  CircuitBoard: <CircuitBoard size={22} />,
  Gauge:        <Gauge        size={22} />,
  ToggleRight:  <ToggleRight  size={22} />,
  Wind:         <Wind         size={22} />,
  Monitor:      <Monitor      size={22} />,
  Activity:     <Activity     size={22} />,
  Flame:        <Flame        size={22} />,
  Warehouse:    <Warehouse    size={22} />,
  Layers:       <Layers       size={22} />,
  ShoppingBag:  <ShoppingBag  size={22} />,
  Settings2:    <Settings2    size={22} />,
  RefreshCcw:   <RefreshCcw   size={22} />,
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface ManualCount { slug: string; count: number }

// ── Topic card ────────────────────────────────────────────────────────────────
function TopicCard({
  topic,
  manualCount,
  onClick,
}: {
  topic: KnowledgeTopic
  manualCount: number
  onClick: () => void
}) {
  const colors = COLOR_MAP[topic.colorClass] ?? COLOR_MAP.blue

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-4 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 transition-all group"
    >
      {/* Icon + title row */}
      <div className="flex items-start gap-3 mb-2">
        <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${colors.bg} ${colors.text}`}>
          {ICON_MAP[topic.iconName] ?? <BookOpen size={22} />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {topic.title}
          </p>
          {manualCount > 0 && (
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
              {manualCount} manual{manualCount !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-3 line-clamp-3">
        {topic.description}
      </p>

      {/* Tag pills */}
      <div className="flex flex-wrap gap-1">
        {topic.tags.map(tag => (
          <span
            key={tag}
            className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded border ${colors.tag}`}
          >
            {tag}
          </span>
        ))}
      </div>
    </button>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function KnowledgePage() {
  const router = useRouter()
  const [manualCounts, setManualCounts] = useState<ManualCount[]>([])
  const [query, setQuery] = useState('')

  // Fetch manual counts for all topics
  useEffect(() => {
    async function fetchCounts() {
      const results = await Promise.allSettled(
        TOPICS.map(async topic => {
          const res = await fetch(`/api/knowledge/${topic.slug}/manuals`)
          if (!res.ok) return { slug: topic.slug, count: 0 }
          const data = await res.json()
          return { slug: topic.slug, count: Array.isArray(data) ? data.length : 0 }
        })
      )
      setManualCounts(
        results
          .filter((r): r is PromiseFulfilledResult<ManualCount> => r.status === 'fulfilled')
          .map(r => r.value)
      )
    }
    fetchCounts()
  }, [])

  function getCount(slug: string) {
    return manualCounts.find(m => m.slug === slug)?.count ?? 0
  }

  const q = query.trim().toLowerCase()
  const filteredTopics = q
    ? TOPICS.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.tags.some(tag => tag.toLowerCase().includes(q))
      )
    : null

  const manufacturerTopics = TOPICS.filter(t => t.category === 'manufacturer')
  const fundamentalsTopics = TOPICS.filter(t => t.category === 'fundamentals')

  return (
    <PageShell>
    <div className="bg-slate-50 dark:bg-slate-950 min-h-screen">
      {/* Header */}
      <div className="safe-top bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-4 md:px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => router.push('/dashboard')} className="p-1.5 -ml-1 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-baseline gap-0.5">
            <span className="text-lg font-bold text-blue-600">Cold</span>
            <span className="text-lg font-bold text-slate-800 dark:text-slate-200">IQ</span>
          </div>
          <span className="text-slate-300 dark:text-slate-600">/</span>
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Knowledge Base</span>
        </div>
        {/* Search bar */}
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search topics, tags, or descriptions…"
            className="w-full pl-9 pr-8 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-700"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-6 md:px-8 space-y-8">

        {filteredTopics !== null ? (
          /* Search results */
          <section>
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">
              {filteredTopics.length} result{filteredTopics.length !== 1 ? 's' : ''} for &ldquo;{query.trim()}&rdquo;
            </p>
            {filteredTopics.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-8 text-center">
                <p className="text-sm text-slate-500 dark:text-slate-400">No topics match that search.</p>
                <button onClick={() => setQuery('')} className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline">
                  Clear search
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredTopics.map(topic => (
                  <TopicCard
                    key={topic.slug}
                    topic={topic}
                    manualCount={getCount(topic.slug)}
                    onClick={() => router.push(`/knowledge/${topic.slug}`)}
                  />
                ))}
              </div>
            )}
          </section>
        ) : (
          <>
            {/* Manufacturer Reference */}
            <section>
              <h2 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">
                Manufacturer Reference
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {manufacturerTopics.map(topic => (
                  <TopicCard
                    key={topic.slug}
                    topic={topic}
                    manualCount={getCount(topic.slug)}
                    onClick={() => router.push(`/knowledge/${topic.slug}`)}
                  />
                ))}
              </div>
            </section>

            {/* Fundamentals */}
            <section>
              <h2 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">
                Fundamentals
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {fundamentalsTopics.map(topic => (
                  <TopicCard
                    key={topic.slug}
                    topic={topic}
                    manualCount={getCount(topic.slug)}
                    onClick={() => router.push(`/knowledge/${topic.slug}`)}
                  />
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
    </PageShell>
  )
}
