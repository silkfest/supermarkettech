'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Snowflake, Sliders, Zap, LayoutGrid, Cpu, Store, Thermometer, Calculator,
  CircuitBoard, Gauge, ToggleRight,
  BookOpen,
} from 'lucide-react'
import { TOPICS, type KnowledgeTopic } from '@/lib/knowledge/topics'

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
      className="w-full text-left bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md hover:border-slate-300 transition-all group"
    >
      {/* Icon + title row */}
      <div className="flex items-start gap-3 mb-2">
        <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${colors.bg} ${colors.text}`}>
          {ICON_MAP[topic.iconName] ?? <BookOpen size={22} />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 text-sm group-hover:text-blue-600 transition-colors">
            {topic.title}
          </p>
          {manualCount > 0 && (
            <p className="text-[11px] text-slate-400 mt-0.5">
              {manualCount} manual{manualCount !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-slate-500 leading-relaxed mb-3 line-clamp-3">
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

  const manufacturerTopics = TOPICS.filter(t => t.category === 'manufacturer')
  const fundamentalsTopics = TOPICS.filter(t => t.category === 'fundamentals')

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-4 md:px-8">
        <div className="max-w-5xl mx-auto">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 mb-3 transition-colors"
          >
            <ArrowLeft size={13} />
            Dashboard
          </button>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Knowledge Base</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Technical reference from the AI system prompt — manufacturer specs, diagnostic procedures, and field rules.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-6 md:px-8 space-y-8">

        {/* Manufacturer Reference */}
        <section>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
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
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
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
      </div>
    </div>
  )
}
