'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Snowflake, Sliders, Zap, LayoutGrid, Cpu, Store, Thermometer, Calculator,
  CircuitBoard, Gauge, ToggleRight, Wind, Monitor, Activity, Flame, Warehouse, Layers,
  ShoppingBag, Settings2, RefreshCcw,
  BookOpen, Search, X, Sparkles, SlidersHorizontal, ChevronDown,
} from 'lucide-react'
import { TOPICS, type KnowledgeTopic } from '@/lib/knowledge/topics'
import PageShell from '@/components/layout/PageShell'
import LearningTabBar from '@/components/layout/LearningTabBar'
import PageHeader from '@/components/PageHeader'
import type { ContentMatch } from '@/app/api/knowledge/search/route'

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
type SearchMatch = 'topic' | 'manual' | 'both' | 'content'

interface DynamicTopic {
  id: string
  slug: string
  title: string
  short_title: string | null
  description: string
  tags: string[]
  icon_name: string | null
  color_class: string | null
  document_id: string | null
  created_at: string
}

function DynamicTopicCard({ topic, onClick }: { topic: DynamicTopic; onClick: () => void }) {
  const colors = COLOR_MAP[topic.color_class ?? ''] ?? COLOR_MAP.amber
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-4 hover:shadow-md hover:border-amber-300 dark:hover:border-amber-600 transition-all group"
    >
      <div className="flex items-start gap-3 mb-2">
        <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${colors.bg} ${colors.text}`}>
          {ICON_MAP[topic.icon_name ?? ''] ?? <BookOpen size={22} />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors">
            {topic.title}
          </p>
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 dark:text-amber-400 mt-0.5">
            <Sparkles size={9} /> From Manual
          </span>
        </div>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-3 line-clamp-3">
        {topic.description}
      </p>
      <div className="flex flex-wrap gap-1">
        {(topic.tags ?? []).map(tag => (
          <span key={tag} className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded border ${colors.tag}`}>
            {tag}
          </span>
        ))}
      </div>
    </button>
  )
}

// ── Topic card ────────────────────────────────────────────────────────────────
function TopicCard({
  topic,
  manualCount,
  onClick,
  matchSource,
}: {
  topic: KnowledgeTopic
  manualCount: number
  onClick: () => void
  matchSource?: SearchMatch
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
          {matchSource === 'manual' && (
            <p className="text-[10px] text-blue-500 dark:text-blue-400 mt-0.5 font-medium">matched in manuals</p>
          )}
          {matchSource === 'content' && (
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">matched in content</p>
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
  const [docMatchSlugs, setDocMatchSlugs] = useState<string[]>([])
  const [contentMatches, setContentMatches] = useState<ContentMatch[]>([])
  const [dynamicTopics, setDynamicTopics] = useState<DynamicTopic[]>([])
  const [dynamicLoading, setDynamicLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [filterOpen, setFilterOpen] = useState(false)
  const filterRef = useRef<HTMLDivElement>(null)

  const CATEGORIES = [
    { key: 'all',            label: 'All Topics' },
    { key: 'rack-systems',   label: 'Rack Systems' },
    { key: 'compressors',    label: 'Compressors' },
    { key: 'controllers',    label: 'Controllers' },
    { key: 'display-cases',  label: 'Display Cases' },
    { key: 'self-contained', label: 'Self Contained' },
    { key: 'hvac',           label: 'HVAC' },
    { key: 'fundamentals',   label: 'Fundamentals' },
  ]

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Fetch dynamic (DB-generated) topics
  useEffect(() => {
    fetch('/api/knowledge/dynamic')
      .then(r => r.ok ? r.json() : [])
      .then((data: DynamicTopic[]) => { setDynamicTopics(Array.isArray(data) ? data : []); setDynamicLoading(false) })
      .catch(() => setDynamicLoading(false))
  }, [])

  // Fetch manual counts for all topics in a single batched request
  useEffect(() => {
    fetch('/api/knowledge/manual-counts')
      .then(r => r.ok ? r.json() : {})
      .then((data: Record<string, number>) => {
        setManualCounts(Object.entries(data).map(([slug, count]) => ({ slug, count })))
      })
      .catch(() => setManualCounts([]))
  }, [])

  // Debounced search of document titles + knowledge content
  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) { setDocMatchSlugs([]); setContentMatches([]); return }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/knowledge/search?q=${encodeURIComponent(q)}`)
        if (res.ok) {
          const { docSlugs, contentMatches: cm } = await res.json()
          setDocMatchSlugs(docSlugs ?? [])
          setContentMatches(cm ?? [])
        }
      } catch { /* ignore */ }
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  function getCount(slug: string) {
    return manualCounts.find(m => m.slug === slug)?.count ?? 0
  }

  const q = query.trim().toLowerCase()

  // Build combined topic results with source tracking
  const filteredTopics: Array<{ topic: KnowledgeTopic; matchSource: SearchMatch }> | null = q
    ? (() => {
        const topicHits = new Set(
          TOPICS.filter(t =>
            t.title.toLowerCase().includes(q) ||
            t.description.toLowerCase().includes(q) ||
            t.tags.some(tag => tag.toLowerCase().includes(q))
          ).map(t => t.slug)
        )
        const docHits = new Set(docMatchSlugs)
        const contentHits = new Set(contentMatches.map(m => m.topicSlug))
        const allSlugs = new Set([...topicHits, ...docHits, ...contentHits])
        return TOPICS
          .filter(t => allSlugs.has(t.slug))
          .map(t => ({
            topic: t,
            matchSource: (topicHits.has(t.slug)
              ? (docHits.has(t.slug) ? 'both' : 'topic')
              : docHits.has(t.slug)
              ? 'manual'
              : 'content') as SearchMatch,
          }))
      })()
    : null

  const filteredDynamic: DynamicTopic[] | null = q
    ? dynamicTopics.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        (t.tags ?? []).some(tag => tag.toLowerCase().includes(q))
      )
    : null

  const compressorTopics    = TOPICS.filter(t => t.category === 'compressors')
  const controllerTopics   = TOPICS.filter(t => t.category === 'controllers')
  const displayCaseTopics  = TOPICS.filter(t => t.category === 'display-cases')
  const selfContainedTopics = TOPICS.filter(t => t.category === 'self-contained')
  const rackTopics         = TOPICS.filter(t => t.category === 'rack-systems')
  const hvacTopics         = TOPICS.filter(t => t.category === 'hvac')
  const fundamentalsTopics = TOPICS.filter(t => t.category === 'fundamentals')

  return (
    <PageShell>
    <div className="bg-slate-50 dark:bg-slate-950 min-h-screen">
      {/* Header */}
      <div className="safe-top bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-4 md:px-6 py-4 sticky top-0 z-10">
        <PageHeader title="Learning" home={false} back="/dashboard" sticky={false} className="px-0 py-0 mb-3 bg-transparent dark:bg-transparent" />
        {/* Search bar + category filter */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search topics, manuals, model numbers…"
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

          {/* Category dropdown — hidden while searching */}
          {!query && (
            <div ref={filterRef} className="relative flex-shrink-0">
              <button
                onClick={() => setFilterOpen(v => !v)}
                className={`flex items-center gap-1.5 h-full px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                  activeCategory !== 'all'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500'
                }`}
              >
                <SlidersHorizontal size={13} />
                <span className="hidden sm:inline">
                  {CATEGORIES.find(c => c.key === activeCategory)?.label ?? 'All Topics'}
                </span>
                <ChevronDown size={11} className={`transition-transform ${filterOpen ? 'rotate-180' : ''}`} />
              </button>

              {filterOpen && (
                <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-20 py-1 overflow-hidden">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.key}
                      onClick={() => { setActiveCategory(cat.key); setFilterOpen(false) }}
                      className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                        activeCategory === cat.key
                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Learning tab bar */}
      <LearningTabBar />

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-6 md:px-8 space-y-8">

        {filteredTopics !== null ? (
          /* Search results */
          <>
            {/* Static topic cards */}
            <section>
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">
                {filteredTopics.length + (filteredDynamic?.length ?? 0)} topic{filteredTopics.length + (filteredDynamic?.length ?? 0) !== 1 ? 's' : ''} for &ldquo;{query.trim()}&rdquo;
              </p>
              {filteredTopics.length === 0 && contentMatches.length === 0 && (filteredDynamic?.length ?? 0) === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-8 text-center">
                  <p className="text-sm text-slate-500 dark:text-slate-400">No results match that search.</p>
                  <button onClick={() => setQuery('')} className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline">
                    Clear search
                  </button>
                </div>
              ) : filteredTopics.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredTopics.map(({ topic, matchSource }) => (
                    <TopicCard
                      key={topic.slug}
                      topic={topic}
                      manualCount={getCount(topic.slug)}
                      matchSource={matchSource}
                      onClick={() => router.push(`/knowledge/${topic.slug}`)}
                    />
                  ))}
                </div>
              ) : null}
            </section>

            {/* Dynamic topic results */}
            {(filteredDynamic?.length ?? 0) > 0 && (
              <section>
                <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">
                  From your manuals
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredDynamic!.map(topic => (
                    <DynamicTopicCard key={topic.slug} topic={topic} onClick={() => router.push(`/knowledge/${topic.slug}`)} />
                  ))}
                </div>
              </section>
            )}

            {/* Content excerpts */}
            {contentMatches.length > 0 && (
              <section>
                <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">
                  {contentMatches.length} passage{contentMatches.length !== 1 ? 's' : ''} in knowledge content
                </p>
                <div className="space-y-2">
                  {contentMatches.map((match, i) => (
                    <button
                      key={i}
                      onClick={() => router.push(`/knowledge/${match.topicSlug}`)}
                      className="w-full text-left bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-3 hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-sm transition-all group"
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">{match.topicTitle}</span>
                        <span className="text-slate-300 dark:text-slate-600 text-[11px]">›</span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{match.sectionTitle}</span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2 group-hover:text-slate-800 dark:group-hover:text-slate-100">
                        {match.excerpt}
                      </p>
                    </button>
                  ))}
                </div>
              </section>
            )}
          </>
        ) : (
          <>
            {/* Rack Systems */}
            {(activeCategory === 'all' || activeCategory === 'rack-systems') && (
            <section>
              <h2 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">
                Rack Systems
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {rackTopics.map(topic => (
                  <TopicCard key={topic.slug} topic={topic} manualCount={getCount(topic.slug)} onClick={() => router.push(`/knowledge/${topic.slug}`)} />
                ))}
              </div>
            </section>
            )}

            {/* Compressors */}
            {(activeCategory === 'all' || activeCategory === 'compressors') && (
            <section>
              <h2 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">
                Compressors
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {compressorTopics.map(topic => (
                  <TopicCard key={topic.slug} topic={topic} manualCount={getCount(topic.slug)} onClick={() => router.push(`/knowledge/${topic.slug}`)} />
                ))}
              </div>
            </section>
            )}

            {/* Controllers */}
            {(activeCategory === 'all' || activeCategory === 'controllers') && (
            <section>
              <h2 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">
                Controllers
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {controllerTopics.map(topic => (
                  <TopicCard key={topic.slug} topic={topic} manualCount={getCount(topic.slug)} onClick={() => router.push(`/knowledge/${topic.slug}`)} />
                ))}
              </div>
            </section>
            )}

            {/* Display Cases */}
            {(activeCategory === 'all' || activeCategory === 'display-cases') && (
            <section>
              <h2 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">
                Display Cases
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {displayCaseTopics.map(topic => (
                  <TopicCard key={topic.slug} topic={topic} manualCount={getCount(topic.slug)} onClick={() => router.push(`/knowledge/${topic.slug}`)} />
                ))}
              </div>
            </section>
            )}

            {/* Self Contained */}
            {(activeCategory === 'all' || activeCategory === 'self-contained') && (
            <section>
              <h2 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">
                Self Contained
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {selfContainedTopics.map(topic => (
                  <TopicCard key={topic.slug} topic={topic} manualCount={getCount(topic.slug)} onClick={() => router.push(`/knowledge/${topic.slug}`)} />
                ))}
              </div>
            </section>
            )}

            {/* HVAC */}
            {(activeCategory === 'all' || activeCategory === 'hvac') && (
            <section>
              <h2 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">
                Commercial HVAC
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {hvacTopics.map(topic => (
                  <TopicCard key={topic.slug} topic={topic} manualCount={getCount(topic.slug)} onClick={() => router.push(`/knowledge/${topic.slug}`)} />
                ))}
              </div>
            </section>
            )}

            {/* Fundamentals */}
            {(activeCategory === 'all' || activeCategory === 'fundamentals') && (
            <section>
              <h2 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">
                Fundamentals
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {fundamentalsTopics.map(topic => (
                  <TopicCard key={topic.slug} topic={topic} manualCount={getCount(topic.slug)} onClick={() => router.push(`/knowledge/${topic.slug}`)} />
                ))}
              </div>
            </section>
            )}

            {/* From Your Manuals */}
            {activeCategory === 'all' && (dynamicLoading || dynamicTopics.length > 0) && (
              <section>
                <h2 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <Sparkles size={11} /> From Your Manuals
                </h2>
                {dynamicLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-4 animate-pulse">
                        <div className="flex items-start gap-3 mb-2">
                          <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex-shrink-0" />
                          <div className="flex-1 space-y-2">
                            <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-3/4" />
                            <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded w-1/2" />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded" />
                          <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded w-4/5" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {dynamicTopics.map(topic => (
                      <DynamicTopicCard key={topic.slug} topic={topic} onClick={() => router.push(`/knowledge/${topic.slug}`)} />
                    ))}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </div>
    </PageShell>
  )
}
