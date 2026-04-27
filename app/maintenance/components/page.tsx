'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Search, BookOpen, ExternalLink, X, ChevronRight,
  Loader2, Plus, Zap, Wind, Cpu, Sliders, Droplets, Package,
  Gauge, Snowflake, Server, Monitor, Filter, Box, LayoutGrid, Pencil,
} from 'lucide-react'
import ManualFinderModal from '@/components/maintenance/ManualFinderModal'
import { getSupabaseBrowser } from '@/lib/supabase/client'
import type { ComponentRecord } from '@/app/api/components/route'
import type { UserRole } from '@/types'

// ── Type metadata ─────────────────────────────────────────────────────────────
const TYPE_META: Record<string, { bg: string; text: string; badge: string; icon: React.ReactNode }> = {
  Compressor:               { bg: 'bg-blue-100',    text: 'text-blue-600',    badge: 'bg-blue-100 text-blue-700',    icon: <Zap      size={22} /> },
  'Condenser Unit':          { bg: 'bg-cyan-100',    text: 'text-cyan-600',    badge: 'bg-cyan-100 text-cyan-700',    icon: <Wind     size={22} /> },
  'Rack Controller':         { bg: 'bg-violet-100',  text: 'text-violet-600',  badge: 'bg-violet-100 text-violet-700',icon: <Cpu      size={22} /> },
  'EEV Board':               { bg: 'bg-indigo-100',  text: 'text-indigo-600',  badge: 'bg-indigo-100 text-indigo-700',icon: <Sliders  size={22} /> },
  'Oil Separator':           { bg: 'bg-amber-100',   text: 'text-amber-600',   badge: 'bg-amber-100 text-amber-700',  icon: <Droplets size={22} /> },
  Receiver:                  { bg: 'bg-orange-100',  text: 'text-orange-600',  badge: 'bg-orange-100 text-orange-700',icon: <Package  size={22} /> },
  'Head Pressure Controller':{ bg: 'bg-rose-100',    text: 'text-rose-600',    badge: 'bg-rose-100 text-rose-700',    icon: <Gauge    size={22} /> },
  'Defrost Board':           { bg: 'bg-teal-100',    text: 'text-teal-600',    badge: 'bg-teal-100 text-teal-700',    icon: <Snowflake size={22}/> },
  'Rack System':             { bg: 'bg-sky-100',     text: 'text-sky-600',     badge: 'bg-sky-100 text-sky-700',      icon: <Server   size={22} /> },
  'Case Controller':         { bg: 'bg-fuchsia-100', text: 'text-fuchsia-600', badge: 'bg-fuchsia-100 text-fuchsia-700',icon:<Monitor  size={22} /> },
  'Filter Drier':            { bg: 'bg-lime-100',    text: 'text-lime-600',    badge: 'bg-lime-100 text-lime-700',    icon: <Filter   size={22} /> },
}
const DEFAULT_META = { bg: 'bg-slate-100', text: 'text-slate-500', badge: 'bg-slate-100 text-slate-600', icon: <Box size={22} /> }

const COMPONENT_TYPES = [
  'Compressor', 'Condenser Unit', 'Rack Controller', 'EEV Board',
  'Oil Separator', 'Receiver', 'Head Pressure Controller', 'Defrost Board',
  'Rack System', 'Case Controller', 'Filter Drier', 'Other',
]

// ── Add component modal ───────────────────────────────────────────────────────
function AddComponentModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    type: 'Compressor', manufacturer: '', model: '',
    serial: '', manualTitle: '', manualUrl: '', storeName: '',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr]       = useState('')

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))

  async function save() {
    if (!form.manufacturer.trim() || !form.model.trim()) { setErr('Manufacturer and model are required.'); return }
    setSaving(true); setErr('')
    try {
      const res = await fetch('/api/components', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) { const d = await res.json(); setErr(d.error ?? 'Save failed.') }
      else onSaved()
    } catch { setErr('Network error.') }
    setSaving(false)
  }

  const inp = 'w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
  const lbl = 'block text-xs font-medium text-slate-600 mb-1'

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800">Add Component</h2>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"><X size={18} /></button>
        </div>
        <div>
          <label className={lbl}>Type</label>
          <select value={form.type} onChange={set('type')} className={inp}>
            {COMPONENT_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={lbl}>Manufacturer <span className="text-red-400">*</span></label>
            <input value={form.manufacturer} onChange={set('manufacturer')} placeholder="e.g. Copeland" className={inp} />
          </div>
          <div>
            <label className={lbl}>Model <span className="text-red-400">*</span></label>
            <input value={form.model} onChange={set('model')} placeholder="e.g. 4DR3-0750" className={inp} />
          </div>
        </div>
        <div>
          <label className={lbl}>Serial Number <span className="text-slate-400 font-normal">(optional)</span></label>
          <input value={form.serial} onChange={set('serial')} placeholder="e.g. 26A1234567" className={inp} />
        </div>
        <div>
          <label className={lbl}>Site / Store <span className="text-slate-400 font-normal">(optional)</span></label>
          <input value={form.storeName} onChange={set('storeName')} placeholder="e.g. Main St Superstore" className={inp} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={lbl}>Manual Title <span className="text-slate-400 font-normal">(optional)</span></label>
            <input value={form.manualTitle} onChange={set('manualTitle')} placeholder="e.g. Installation Guide" className={inp} />
          </div>
          <div>
            <label className={lbl}>Manual URL <span className="text-slate-400 font-normal">(optional)</span></label>
            <input value={form.manualUrl} onChange={set('manualUrl')} placeholder="https://…" className={inp} />
          </div>
        </div>
        {err && <p className="text-xs text-red-500">{err}</p>}
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">Cancel</button>
          <button onClick={save} disabled={saving} className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            {saving ? 'Saving…' : 'Add Component'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Edit manual modal (admin/manager only) ────────────────────────────────────
function EditManualModal({
  component,
  onClose,
  onSaved,
}: {
  component: ComponentRecord
  onClose: () => void
  onSaved: (manualTitle: string, manualUrl: string) => void
}) {
  const [title, setTitle]   = useState(component.manualTitle)
  const [url,   setUrl]     = useState(component.manualUrl)
  const [saving, setSaving] = useState(false)
  const [err,    setErr]    = useState('')

  async function save() {
    setSaving(true); setErr('')
    try {
      const res = await fetch('/api/components', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: component.catalogId, manualTitle: title, manualUrl: url }),
      })
      if (!res.ok) { const d = await res.json(); setErr(d.error ?? 'Save failed.') }
      else onSaved(title, url)
    } catch { setErr('Network error.') }
    setSaving(false)
  }

  const inp = 'w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
  const lbl = 'block text-xs font-medium text-slate-600 mb-1'

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-800">Edit Manual Link</h2>
            <p className="text-xs text-slate-500 mt-0.5">{component.manufacturer} {component.model}</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        <div>
          <label className={lbl}>Manual Title</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Installation & Operation Manual"
            className={inp}
          />
        </div>
        <div>
          <label className={lbl}>Manual URL</label>
          <input
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://…"
            className={inp}
          />
          {url && (
            <a href={url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-blue-500 hover:underline">
              <ExternalLink size={10} /> Test link
            </a>
          )}
        </div>

        {err && <p className="text-xs text-red-500">{err}</p>}

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Pencil size={14} />}
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ComponentRegistryPage() {
  const router = useRouter()

  // allComponents = full unfiltered list (used for counts + type grid)
  const [allComponents, setAllComponents] = useState<ComponentRecord[]>([])
  // components = currently displayed (filtered by search / type)
  const [components, setComponents]       = useState<ComponentRecord[]>([])
  const [types, setTypes]                 = useState<string[]>([])
  const [loading, setLoading]             = useState(true)
  const [query, setQuery]                 = useState('')
  const [activeType, setActiveType]       = useState('')
  const [manualTarget, setManualTarget]   = useState<ComponentRecord | null>(null)
  const [editTarget, setEditTarget]       = useState<ComponentRecord | null>(null)
  const [showAdd, setShowAdd]             = useState(false)
  const [userRole, setUserRole]           = useState<UserRole | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isAdmin = userRole === 'admin' || userRole === 'manager'

  // Auth: get current user role
  useEffect(() => {
    async function checkRole() {
      try {
        const sb = getSupabaseBrowser()
        const { data: { user } } = await sb.auth.getUser()
        if (!user) return
        const { data } = await sb.from('users').select('role').eq('id', user.id).single()
        if (data?.role) setUserRole(data.role as UserRole)
      } catch { /* silent */ }
    }
    checkRole()
  }, [])

  // Initial full fetch
  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetch('/api/components').then(r => r.json())
      if (Array.isArray(data)) {
        setAllComponents(data)
        setComponents(data)
        setTypes(Array.from(new Set(data.map((c: ComponentRecord) => c.type))).sort() as string[])
      }
    } catch { /* silent */ }
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  // Filtered fetch on search / type change
  const fetchFiltered = useCallback(async (q: string, t: string) => {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (t) params.set('type', t)
    try {
      const data = await fetch(`/api/components?${params}`).then(r => r.json())
      if (Array.isArray(data)) setComponents(data)
    } catch { /* silent */ }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchFiltered(query, activeType), 280)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, activeType, fetchFiltered])

  const inFilterMode = !!(query || activeType)
  const withManual   = components.filter(c => c.manualId || c.manualUrl).length

  return (
    <div className="min-h-[100dvh] bg-slate-50">

      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => router.push('/maintenance')} className="p-1.5 -ml-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-baseline gap-0.5">
          <span className="text-lg font-bold text-blue-600">Cold</span>
          <span className="text-lg font-bold text-slate-800">IQ</span>
        </div>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-medium text-slate-700">Component Registry</span>
        <button
          onClick={() => setShowAdd(true)}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={13} /> Add
        </button>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-5 space-y-4">

        {/* Search */}
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by model, serial, manufacturer, or site…"
            className="w-full pl-9 pr-9 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={14} />
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 gap-3 text-slate-400 text-sm">
            <Loader2 size={16} className="animate-spin" /> Loading components…
          </div>
        ) : (

          /* ── Category grid (shown when not searching) ─────────────────── */
          !inFilterMode ? (
            <div className="space-y-4">
              {/* Stats */}
              {allComponents.length > 0 && (
                <p className="text-xs text-slate-500">
                  <span className="font-semibold text-slate-700">{allComponents.length}</span> components across{' '}
                  <span className="font-semibold text-slate-700">{types.length}</span> categories
                </p>
              )}

              {/* Type squares grid */}
              {types.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                  {/* "All" tile */}
                  <button
                    onClick={() => { setActiveType(''); setQuery('') }}
                    className="flex flex-col items-center justify-center gap-2 p-3 bg-white border-2 border-slate-200 rounded-2xl hover:border-blue-300 hover:shadow-sm active:scale-95 transition-all"
                  >
                    <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center">
                      <LayoutGrid size={22} />
                    </div>
                    <span className="text-[11px] font-semibold text-slate-700 text-center leading-tight">All</span>
                    <span className="text-[10px] text-slate-400">{allComponents.length}</span>
                  </button>

                  {types.map(t => {
                    const meta  = TYPE_META[t] ?? DEFAULT_META
                    const count = allComponents.filter(c => c.type === t).length
                    return (
                      <button
                        key={t}
                        onClick={() => setActiveType(t)}
                        className="flex flex-col items-center justify-center gap-2 p-3 bg-white border-2 border-slate-200 rounded-2xl hover:border-blue-300 hover:shadow-sm active:scale-95 transition-all"
                      >
                        <div className={`w-12 h-12 rounded-xl ${meta.bg} ${meta.text} flex items-center justify-center`}>
                          {meta.icon}
                        </div>
                        <span className="text-[11px] font-semibold text-slate-700 text-center leading-tight">{t}</span>
                        <span className="text-[10px] text-slate-400">{count}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

          ) : (

            /* ── Filtered results ──────────────────────────────────────────── */
            <div className="space-y-3">
              {/* Active filter pill + clear */}
              <div className="flex items-center gap-2">
                {activeType && (
                  <button
                    onClick={() => setActiveType('')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-full"
                  >
                    {activeType} <X size={11} />
                  </button>
                )}
                <span className="text-xs text-slate-500">{components.length} result{components.length !== 1 ? 's' : ''}</span>
                {withManual > 0 && (
                  <span className="text-xs text-slate-400">· <span className="text-emerald-600 font-medium">{withManual}</span> with manuals</span>
                )}
              </div>

              {components.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-sm text-slate-500">No components match your search.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {components.map(c => {
                    const meta = TYPE_META[c.type] ?? DEFAULT_META
                    return (
                      <div key={c.key} className="bg-white border border-slate-200 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                          {/* Icon square */}
                          <div className={`flex-shrink-0 w-11 h-11 rounded-xl ${meta.bg} ${meta.text} flex items-center justify-center`}>
                            {meta.icon}
                          </div>

                          <div className="flex-1 min-w-0">
                            {/* Badges */}
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${meta.badge}`}>{c.type}</span>
                              {c.isCatalog && <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Catalog</span>}
                              {c.slot     && <span className="text-[10px] text-slate-400">Comp {c.slot}</span>}
                              {c.rackLabel && <span className="text-[10px] text-slate-400">{c.rackLabel}</span>}
                            </div>

                            {/* Name */}
                            <p className="text-sm font-semibold text-slate-800 leading-tight">
                              {[c.manufacturer, c.model].filter(Boolean).join(' ') || '—'}
                            </p>

                            {c.serial && <p className="text-xs text-slate-500 mt-0.5">S/N: {c.serial}</p>}

                            <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-400">
                              {c.storeName ? <span>{c.storeName}</span> : <span className="italic">Catalog entry</span>}
                              {c.pmDate && <><span>·</span><span>{new Date(c.pmDate).toLocaleDateString()}</span></>}
                            </div>

                            {/* Manual */}
                            <div className="mt-2 flex items-center gap-2 flex-wrap">
                              {c.manualUrl ? (
                                <a href={c.manualUrl} target="_blank" rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700 hover:bg-emerald-100 transition-colors">
                                  <ExternalLink size={11} />
                                  <span className="font-medium truncate max-w-[200px]">{c.manualTitle || 'Open Manual'}</span>
                                </a>
                              ) : c.manualId ? (
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700">
                                  <BookOpen size={11} />
                                  <span className="font-medium truncate max-w-[200px]">{c.manualTitle || 'Manual linked'}</span>
                                </div>
                              ) : (
                                <button onClick={() => setManualTarget(c)}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 border border-dashed border-slate-300 rounded-lg text-xs text-slate-500 hover:border-blue-300 hover:text-blue-600 transition-colors">
                                  <BookOpen size={11} /> Find Manual
                                </button>
                              )}
                              {/* Edit manual link — admin/manager only, catalog entries only */}
                              {isAdmin && c.isCatalog && (
                                <button
                                  onClick={() => setEditTarget(c)}
                                  className="p-1 text-slate-300 hover:text-blue-500 rounded transition-colors"
                                  title="Edit manual link"
                                >
                                  <Pencil size={12} />
                                </button>
                              )}
                            </div>
                          </div>

                          {!c.isCatalog && (
                            <button
                              onClick={() => router.push(`/maintenance/refrigeration-pm?id=${c.pmReportId}`)}
                              className="flex-shrink-0 p-1.5 text-slate-300 hover:text-blue-500 rounded-lg hover:bg-slate-50 transition-colors"
                              title="Open source PM report"
                            >
                              <ChevronRight size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        )}
      </div>

      {/* Modals */}
      {manualTarget && (
        <ManualFinderModal
          manufacturer={manualTarget.manufacturer}
          model={manualTarget.model}
          equipmentId={manualTarget.equipmentId ?? undefined}
          onClose={() => setManualTarget(null)}
          onLinked={() => { setManualTarget(null); fetchAll() }}
        />
      )}
      {showAdd && (
        <AddComponentModal
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); fetchAll() }}
        />
      )}

      {editTarget && (
        <EditManualModal
          component={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={(manualTitle, manualUrl) => {
            // Update local state immediately — no reload needed
            const patch = (list: ComponentRecord[]) =>
              list.map(c => c.key === editTarget.key ? { ...c, manualTitle, manualUrl } : c)
            setAllComponents(patch)
            setComponents(patch)
            setEditTarget(null)
          }}
        />
      )}
    </div>
  )
}
