'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Search, BookOpen, X, ChevronRight, Loader2, Plus, Trash2 } from 'lucide-react'
import ManualFinderModal from '@/components/maintenance/ManualFinderModal'
import AddComponentModal from '@/components/maintenance/AddComponentModal'
import type { ComponentRecord } from '@/app/api/components/route'

const TYPE_COLORS: Record<string, string> = {
  Compressor:                'bg-blue-100 text-blue-700',
  'Condenser Unit':          'bg-cyan-100 text-cyan-700',
  'Rack Controller':         'bg-violet-100 text-violet-700',
  'EEV Board':               'bg-indigo-100 text-indigo-700',
  'Oil Separator':           'bg-amber-100 text-amber-700',
  Receiver:                  'bg-orange-100 text-orange-700',
  'Head Pressure Controller':'bg-rose-100 text-rose-700',
  'Defrost Board':           'bg-teal-100 text-teal-700',
  Other:                     'bg-slate-100 text-slate-600',
}

function typeBadge(type: string) {
  return TYPE_COLORS[type] ?? 'bg-slate-100 text-slate-600'
}

export default function ComponentRegistryPage() {
  const router = useRouter()

  const [components, setComponents]     = useState<ComponentRecord[]>([])
  const [loading, setLoading]           = useState(true)
  const [query, setQuery]               = useState('')
  const [activeType, setActiveType]     = useState('')
  const [types, setTypes]               = useState<string[]>([])
  const [manualTarget, setManualTarget] = useState<ComponentRecord | null>(null)
  const [showAdd, setShowAdd]           = useState(false)
  const [deletingId, setDeletingId]     = useState<string | null>(null)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchComponents = useCallback(async (q: string, t: string) => {
    setLoading(true)
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (t) params.set('type', t)
    try {
      const res  = await fetch(`/api/components?${params}`)
      const data = await res.json()
      if (Array.isArray(data)) setComponents(data)
    } catch { /* silent */ }
    setLoading(false)
  }, [])

  // Load all on mount to build type list
  useEffect(() => {
    fetch('/api/components')
      .then(r => r.json())
      .then((data: ComponentRecord[]) => {
        if (!Array.isArray(data)) return
        setComponents(data)
        const unique = Array.from(new Set(data.map(c => c.type))).sort()
        setTypes(unique)
      })
      .finally(() => setLoading(false))
  }, [])

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchComponents(query, activeType), 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, activeType, fetchComponents])

  async function handleDelete(c: ComponentRecord) {
    if (!c.manualComponentId) return
    setDeletingId(c.manualComponentId)
    try {
      await fetch(`/api/components?id=${c.manualComponentId}`, { method: 'DELETE' })
      fetchComponents(query, activeType)
    } finally {
      setDeletingId(null)
    }
  }

  const withManual    = components.filter(c => c.manualId).length
  const withoutManual = components.length - withManual

  return (
    <div className="min-h-[100dvh] bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button
          onClick={() => router.push('/maintenance')}
          className="p-1.5 -ml-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-baseline gap-0.5">
          <span className="text-lg font-bold text-blue-600">Cold</span>
          <span className="text-lg font-bold text-slate-800">IQ</span>
        </div>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-medium text-slate-700 flex-1">Component Registry</span>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={14} /> Add
        </button>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-5 space-y-4">

        {/* Search bar */}
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by model, serial, manufacturer, or site…"
            className="w-full pl-9 pr-9 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Type filter chips */}
        {types.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
            <button
              onClick={() => setActiveType('')}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                activeType === '' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
              }`}
            >
              All
            </button>
            {types.map(t => (
              <button
                key={t}
                onClick={() => setActiveType(t === activeType ? '' : t)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  activeType === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        )}

        {/* Stats row */}
        {!loading && components.length > 0 && (
          <div className="flex gap-4 text-xs text-slate-500">
            <span><span className="font-semibold text-slate-700">{components.length}</span> components</span>
            <span className="text-slate-300">·</span>
            <span><span className="font-semibold text-emerald-600">{withManual}</span> with manuals</span>
            {withoutManual > 0 && (
              <>
                <span className="text-slate-300">·</span>
                <span><span className="font-semibold text-amber-600">{withoutManual}</span> missing manuals</span>
              </>
            )}
          </div>
        )}

        {/* Results */}
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-slate-400 text-sm">
            <Loader2 size={16} className="animate-spin" />
            Loading components…
          </div>
        ) : components.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-3xl mb-2">🔩</div>
            <p className="text-sm text-slate-500">
              {query || activeType ? 'No components match your search.' : 'No components recorded yet.'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {!query && !activeType && 'Components are added via Refrigeration PMs or the Add button above.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {components.map(c => (
              <div key={c.key} className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Type + rack + source badge */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${typeBadge(c.type)}`}>
                        {c.type}
                      </span>
                      {c.slot && (
                        <span className="text-[10px] text-slate-400">Comp {c.slot}</span>
                      )}
                      {c.rackLabel && (
                        <span className="text-[10px] text-slate-400">{c.rackLabel}</span>
                      )}
                      {c.source === 'manual' && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">Manual entry</span>
                      )}
                    </div>

                    {/* Manufacturer + model */}
                    <p className="text-sm font-semibold text-slate-800 leading-tight">
                      {[c.manufacturer, c.model].filter(Boolean).join(' ') || '—'}
                    </p>

                    {/* Serial */}
                    {c.serial && (
                      <p className="text-xs text-slate-500 mt-0.5">S/N: {c.serial}</p>
                    )}

                    {/* Site + date */}
                    <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-400">
                      <span>{c.storeName || 'Unknown site'}</span>
                      <span>·</span>
                      <span>{new Date(c.pmDate).toLocaleDateString()}</span>
                    </div>

                    {/* Manual status */}
                    <div className="mt-2.5">
                      {c.manualId ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700">
                          <BookOpen size={11} />
                          <span className="font-medium truncate max-w-[220px]">{c.manualTitle || 'Manual linked'}</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => setManualTarget(c)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 border border-dashed border-slate-300 rounded-lg text-xs text-slate-500 hover:border-blue-300 hover:text-blue-600 transition-colors"
                        >
                          <BookOpen size={11} />
                          Find Manual
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col items-center gap-1 flex-shrink-0">
                    {c.source === 'pm' && c.pmReportId ? (
                      <button
                        onClick={() => router.push(`/maintenance/refrigeration-pm?id=${c.pmReportId}`)}
                        className="p-1.5 text-slate-300 hover:text-blue-500 rounded-lg hover:bg-slate-50 transition-colors"
                        title="Open source PM report"
                      >
                        <ChevronRight size={16} />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleDelete(c)}
                        disabled={deletingId === c.manualComponentId}
                        className="p-1.5 text-slate-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-40"
                        title="Delete component"
                      >
                        {deletingId === c.manualComponentId
                          ? <Loader2 size={14} className="animate-spin" />
                          : <Trash2 size={14} />}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Manual finder modal */}
      {manualTarget && (
        <ManualFinderModal
          manufacturer={manualTarget.manufacturer}
          model={manualTarget.model}
          equipmentId={manualTarget.equipmentId ?? undefined}
          onClose={() => setManualTarget(null)}
          onLinked={() => {
            setManualTarget(null)
            fetchComponents(query, activeType)
          }}
        />
      )}

      {/* Add component modal */}
      {showAdd && (
        <AddComponentModal
          onClose={() => setShowAdd(false)}
          onAdded={() => {
            setShowAdd(false)
            fetchComponents(query, activeType)
          }}
        />
      )}
    </div>
  )
}
