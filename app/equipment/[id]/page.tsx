'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  ArrowLeft, Package, Wrench, Pencil, Check, X,
  Building2, MapPin, Calendar, Thermometer, Tag, StickyNote,
  ClipboardList, ChevronRight, Wind, RefrigeratorIcon, Home,
  FileText, ExternalLink, Loader2, ListChecks, Plus,
  Camera, Image as ImageIcon, Workflow,
} from 'lucide-react'
import { getSupabaseBrowser } from '@/lib/supabase/client'
import EditableRow from '@/components/EditableRow'

// ── Types ──────────────────────────────────────────────────────────────────

interface MediaItem { url: string; label: string }

interface EquipmentDetail {
  id: string
  store_id: string
  name: string
  equipment_type: string
  manufacturer: string
  model: string
  serial_number: string
  refrigerant: string
  installed_at: string | null
  location: string
  notes: string
  specs: { label: string; value: string }[] | null
  status: string
  updated_at: string
  photos: MediaItem[] | null
  wiring_diagrams: MediaItem[] | null
  // joined
  stores: { name: string; address: string } | null
  pm_history: PMEntry[]
  individual_reports: IndividualReportEntry[]
}

interface PMEntry {
  id: string
  store_name: string
  performed_at: string
  report_type: string
}

interface IndividualReportEntry {
  id: string
  store_name: string
  performed_at: string
  issue_explanation: string | null
}

interface DocRow {
  id: string
  title: string
  status: string
  page_count: number | null
  file_size: number | null
  url: string | null
}

// ── Constants ─────────────────────────────────────────────────────────────

const EQUIP_TYPES = [
  { value: 'rack',         label: 'Refrigeration Rack' },
  { value: 'display_case', label: 'Display Case' },
  { value: 'walk_in',      label: 'Walk-In Cooler/Freezer' },
  { value: 'hvac',         label: 'HVAC Unit' },
  { value: 'condenser',    label: 'Condenser Unit' },
  { value: 'other',        label: 'Other' },
]

const TYPE_META: Record<string, { bg: string; text: string; icon: React.ReactNode; label: string }> = {
  rack:         { bg: 'bg-blue-50 dark:bg-blue-500/10',       text: 'text-blue-600 dark:text-blue-400',       icon: <RefrigeratorIcon size={20}/>, label: 'Refrigeration Rack' },
  display_case: { bg: 'bg-cyan-50 dark:bg-cyan-500/10',       text: 'text-cyan-600 dark:text-cyan-400',       icon: <RefrigeratorIcon size={20}/>, label: 'Display Case' },
  walk_in:      { bg: 'bg-indigo-50 dark:bg-indigo-500/10',   text: 'text-indigo-600 dark:text-indigo-400',   icon: <RefrigeratorIcon size={20}/>, label: 'Walk-In' },
  hvac:         { bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', icon: <Wind size={20}/>,             label: 'HVAC Unit' },
  condenser:    { bg: 'bg-violet-50 dark:bg-violet-500/10',   text: 'text-violet-600 dark:text-violet-400',   icon: <Thermometer size={20}/>,      label: 'Condenser' },
  other:        { bg: 'bg-slate-100 dark:bg-slate-800',       text: 'text-slate-500 dark:text-slate-400',     icon: <Package size={20}/>,          label: 'Other' },
}

const STATUS_STYLES: Record<string, { dot: string; badge: string }> = {
  OK:      { dot: 'bg-green-500',  badge: 'bg-green-50 dark:bg-emerald-500/10 text-green-700 dark:text-emerald-400 border-green-200 dark:border-emerald-500/30' },
  WARNING: { dot: 'bg-amber-400',  badge: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30' },
  ALARM:   { dot: 'bg-red-500',    badge: 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/30' },
  OFFLINE: { dot: 'bg-slate-400',  badge: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700' },
  UNKNOWN: { dot: 'bg-slate-300',  badge: 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700' },
}

const STATUSES = ['OK', 'WARNING', 'ALARM', 'OFFLINE', 'UNKNOWN']
const REFRIGERANTS = ['R-404A','R-448A','R-449A','R-407A','R-407F','R-22','R-410A','R-134a','R-290','R-717','R-744','Other']

function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' })
}

function fmtPmType(t: string) {
  if (t === 'refrigeration') return 'Refrigeration PM'
  if (t === 'hvac') return 'HVAC PM'
  return t ?? 'PM Report'
}

// ── Component ─────────────────────────────────────────────────────────────

export default function EquipmentDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [equip, setEquip] = useState<EquipmentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  const [editField, setEditField] = useState<string | null>(null)
  const [editVal, setEditVal] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedField, setSavedField] = useState<string | null>(null)

  const [editingSpecs, setEditingSpecs] = useState(false)
  const [specsDraft, setSpecsDraft] = useState<{ label: string; value: string }[]>([])
  const [savingSpecs, setSavingSpecs] = useState(false)

  const [documents, setDocuments] = useState<DocRow[]>([])
  const [loadingDocs, setLoadingDocs] = useState(false)

  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [uploadingDiagram, setUploadingDiagram] = useState(false)
  const photoFileRef = useRef<HTMLInputElement>(null)
  const diagramFileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function init() {
      const supabase = getSupabaseBrowser()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: profileData } = await supabase.from('users').select('role').eq('id', user.id).single()
      const profileRole = (profileData as { role?: string } | null)?.role
      setIsAdmin(profileRole === 'admin' || profileRole === 'manager')

      const res = await fetch(`/api/equipment/${id}`)
      if (res.ok) setEquip(await res.json())
      setLoading(false)
    }
    init()
  }, [id, router])

  // Load relevant documents for this equipment
  useEffect(() => {
    if (!id) return
    setLoadingDocs(true)
    fetch(`/api/documents?equipmentId=${id}`)
      .then(r => r.ok ? r.json() : [])
      .then((data: DocRow[]) => setDocuments(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoadingDocs(false))
  }, [id])

  async function saveField(field: string, value: string) {
    if (!equip) return
    setSaving(true)
    const res = await fetch(`/api/equipment/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    })
    if (res.ok) {
      const updated = await res.json()
      setEquip(prev => prev ? { ...prev, ...updated } : prev)
      setSavedField(field)
      setTimeout(() => setSavedField(null), 2000)
    }
    setEditField(null)
    setSaving(false)
  }

  async function saveSpecs(rows: { label: string; value: string }[]) {
    if (!equip) return
    const cleaned = rows.filter(r => r.label.trim() || r.value.trim())
    setSavingSpecs(true)
    const res = await fetch(`/api/equipment/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ specs: cleaned }),
    })
    if (res.ok) {
      const updated = await res.json()
      setEquip(prev => prev ? { ...prev, ...updated } : prev)
      setEditingSpecs(false)
    }
    setSavingSpecs(false)
  }

  async function saveMedia(field: 'photos' | 'wiring_diagrams', items: MediaItem[]) {
    if (!equip) return
    setEquip(prev => prev ? { ...prev, [field]: items } : prev)
    const payloadKey = field === 'photos' ? 'photos' : 'wiringDiagrams'
    await fetch(`/api/equipment/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [payloadKey]: items }),
    })
  }

  async function handleMediaUpload(field: 'photos' | 'wiring_diagrams', files: FileList | null, setUploading: (v: boolean) => void) {
    if (!equip || !files?.length) return
    setUploading(true)
    const results = await Promise.all(
      Array.from(files).map(async (file) => {
        const fd = new FormData()
        fd.append('file', file)
        fd.append('label', '')
        const res = await fetch('/api/upload-report-photo', { method: 'POST', body: fd })
        if (!res.ok) return null
        const data = await res.json()
        return { url: data.url, label: data.label } as MediaItem
      })
    )
    const newItems = results.filter((p): p is MediaItem => p !== null)
    if (newItems.length > 0) {
      const current = (field === 'photos' ? equip.photos : equip.wiring_diagrams) ?? []
      await saveMedia(field, [...current, ...newItems])
    }
    setUploading(false)
  }

  function updateMediaLabel(field: 'photos' | 'wiring_diagrams', index: number, label: string) {
    if (!equip) return
    const current = (field === 'photos' ? equip.photos : equip.wiring_diagrams) ?? []
    setEquip(prev => prev ? { ...prev, [field]: current.map((item, i) => i === index ? { ...item, label } : item) } : prev)
  }

  function removeMedia(field: 'photos' | 'wiring_diagrams', index: number) {
    if (!equip) return
    const current = (field === 'photos' ? equip.photos : equip.wiring_diagrams) ?? []
    saveMedia(field, current.filter((_, i) => i !== index))
  }

  if (loading) return (
    <div className="min-h-[100dvh] bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm">
      Loading…
    </div>
  )

  if (!equip) return (
    <div className="min-h-[100dvh] bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm">
      Equipment not found.
    </div>
  )

  const meta = TYPE_META[equip.equipment_type] ?? TYPE_META.other
  const statusStyle = STATUS_STYLES[equip.status] ?? STATUS_STYLES.UNKNOWN

  return (
    <div className="min-h-[100dvh] bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="safe-top bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button
          onClick={() => router.push('/dashboard')}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
          title="Dashboard"
        >
          <Home size={18} />
        </button>
        <button
          onClick={() => equip.store_id ? router.push(`/stores/${equip.store_id}`) : router.back()}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
          title="Back"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-semibold text-slate-900 dark:text-slate-100 truncate">{equip.name}</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">{equip.stores?.name ?? '—'}</p>
        </div>
        <span className={`text-[11px] font-semibold px-2 py-1 rounded-full border ${statusStyle.badge}`}>
          {equip.status}
        </span>
      </div>

      <div className="px-4 py-4 max-w-2xl mx-auto flex flex-col gap-4">

        {/* Save confirmation flash */}
        {savedField && (
          <div className="flex items-center gap-1.5 px-3 py-2 bg-green-50 dark:bg-emerald-500/10 border border-green-200 dark:border-emerald-500/30 rounded-xl text-xs text-green-700 dark:text-emerald-400 animate-pulse-once">
            <Check size={12}/> Saved
          </div>
        )}

        {/* Equipment card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
          {/* Type banner */}
          <div className={`flex items-center gap-3 px-4 py-3 ${meta.bg} border-b border-slate-100 dark:border-slate-800`}>
            <div className={`${meta.text}`}>{meta.icon}</div>
            <div>
              <p className={`text-sm font-semibold ${meta.text}`}>{meta.label}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{equip.stores?.name}</p>
            </div>
          </div>

          {/* Detail rows */}
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            <EditableRow label="Manufacturer" icon={<Tag size={13}/>} value={equip.manufacturer}
              isAdmin={isAdmin} fieldKey="manufacturer" editField={editField} editVal={editVal}
              saving={saving} placeholder="e.g. Copeland"
              onEdit={(k,v) => { setEditField(k); setEditVal(v) }}
              onSave={saveField} onCancel={() => setEditField(null)} onEditValChange={setEditVal}
            />
            <EditableRow label="Model" icon={<Tag size={13}/>} value={equip.model}
              isAdmin={isAdmin} fieldKey="model" editField={editField} editVal={editVal}
              saving={saving} placeholder="e.g. ZF34K4E-TFD"
              onEdit={(k,v) => { setEditField(k); setEditVal(v) }}
              onSave={saveField} onCancel={() => setEditField(null)} onEditValChange={setEditVal}
            />
            <EditableRow label="Serial #" icon={<Tag size={13}/>} value={equip.serial_number}
              isAdmin={isAdmin} fieldKey="serialNumber" editField={editField} editVal={editVal}
              saving={saving} placeholder="Serial number"
              onEdit={(k,v) => { setEditField(k); setEditVal(v) }}
              onSave={saveField} onCancel={() => setEditField(null)} onEditValChange={setEditVal}
            />

            {/* Refrigerant — select */}
            <div className="flex items-center gap-3 px-4 py-2.5">
              <span className="text-slate-400 dark:text-slate-500 flex-shrink-0"><Thermometer size={13}/></span>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">Refrigerant</p>
                {editField === 'refrigerant' ? (
                  <div className="flex items-center gap-2 mt-0.5">
                    <select
                      value={editVal}
                      onChange={e => setEditVal(e.target.value)}
                      autoFocus
                      className="flex-1 px-2 py-1 text-sm border border-blue-300 dark:border-blue-700 rounded-lg focus:outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    >
                      <option value="">— select —</option>
                      {REFRIGERANTS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <button onClick={() => saveField('refrigerant', editVal)} disabled={saving}
                      className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                      <Check size={12}/>
                    </button>
                    <button onClick={() => setEditField(null)} className="p-1.5 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                      <X size={12}/>
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-slate-800 dark:text-slate-200">{equip.refrigerant || <span className="text-slate-400 dark:text-slate-500 italic">Not set</span>}</p>
                )}
              </div>
              {isAdmin && editField !== 'refrigerant' && (
                <button onClick={() => { setEditField('refrigerant'); setEditVal(equip.refrigerant ?? '') }}
                  className="p-1.5 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex-shrink-0">
                  <Pencil size={12}/>
                </button>
              )}
            </div>

            {/* Status — select */}
            <div className="flex items-center gap-3 px-4 py-2.5">
              <span className="text-slate-400 dark:text-slate-500 flex-shrink-0">
                <div className={`w-3 h-3 rounded-full ${statusStyle.dot}`}/>
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">Status</p>
                {editField === 'status' ? (
                  <div className="flex items-center gap-2 mt-0.5">
                    <select
                      value={editVal}
                      onChange={e => setEditVal(e.target.value)}
                      autoFocus
                      className="flex-1 px-2 py-1 text-sm border border-blue-300 dark:border-blue-700 rounded-lg focus:outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    >
                      {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <button onClick={() => saveField('status', editVal)} disabled={saving}
                      className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                      <Check size={12}/>
                    </button>
                    <button onClick={() => setEditField(null)} className="p-1.5 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                      <X size={12}/>
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-slate-800 dark:text-slate-200">{equip.status}</p>
                )}
              </div>
              {isAdmin && editField !== 'status' && (
                <button onClick={() => { setEditField('status'); setEditVal(equip.status) }}
                  className="p-1.5 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex-shrink-0">
                  <Pencil size={12}/>
                </button>
              )}
            </div>

            <EditableRow label="Location" icon={<MapPin size={13}/>} value={equip.location}
              isAdmin={isAdmin} fieldKey="location" editField={editField} editVal={editVal}
              saving={saving} placeholder="e.g. Machine room"
              onEdit={(k,v) => { setEditField(k); setEditVal(v) }}
              onSave={saveField} onCancel={() => setEditField(null)} onEditValChange={setEditVal}
            />

            {/* Install date */}
            <div className="flex items-center gap-3 px-4 py-2.5">
              <span className="text-slate-400 dark:text-slate-500 flex-shrink-0"><Calendar size={13}/></span>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">Install date</p>
                {editField === 'installedAt' ? (
                  <div className="flex items-center gap-2 mt-0.5">
                    <input
                      type="date"
                      value={editVal}
                      onChange={e => setEditVal(e.target.value)}
                      autoFocus
                      className="flex-1 px-2 py-1 text-sm border border-blue-300 dark:border-blue-700 rounded-lg focus:outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                    <button onClick={() => saveField('installedAt', editVal)} disabled={saving}
                      className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                      <Check size={12}/>
                    </button>
                    <button onClick={() => setEditField(null)} className="p-1.5 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                      <X size={12}/>
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-slate-800 dark:text-slate-200">{fmtDate(equip.installed_at)}</p>
                )}
              </div>
              {isAdmin && editField !== 'installedAt' && (
                <button onClick={() => { setEditField('installedAt'); setEditVal(equip.installed_at?.slice(0,10) ?? '') }}
                  className="p-1.5 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex-shrink-0">
                  <Pencil size={12}/>
                </button>
              )}
            </div>
          </div>

          {/* Specifications */}
          <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                <ListChecks size={13}/> Specifications
              </div>
              {isAdmin && !editingSpecs && (
                <button
                  onClick={() => {
                    setSpecsDraft(equip.specs && equip.specs.length ? equip.specs.map(s => ({ ...s })) : [{ label: '', value: '' }])
                    setEditingSpecs(true)
                  }}
                  className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500">
                  <Pencil size={12}/>
                </button>
              )}
            </div>
            {editingSpecs ? (
              <div className="flex flex-col gap-2">
                {specsDraft.map((row, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      value={row.label}
                      onChange={e => setSpecsDraft(d => d.map((r, j) => j === i ? { ...r, label: e.target.value } : r))}
                      placeholder="Label (e.g. Compressor Voltage)"
                      className="flex-1 min-w-0 px-2.5 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                    <input
                      value={row.value}
                      onChange={e => setSpecsDraft(d => d.map((r, j) => j === i ? { ...r, value: e.target.value } : r))}
                      placeholder="Value (e.g. 575V / 3-ph / 60Hz)"
                      className="flex-1 min-w-0 px-2.5 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                    <button onClick={() => setSpecsDraft(d => d.filter((_, j) => j !== i))}
                      className="p-1.5 text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 flex-shrink-0">
                      <X size={13}/>
                    </button>
                  </div>
                ))}
                <div className="flex items-center gap-2 pt-0.5">
                  <button onClick={() => setSpecsDraft(d => [...d, { label: '', value: '' }])}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-500 dark:text-slate-400 border border-dashed border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800">
                    <Plus size={12}/> Add row
                  </button>
                  <div className="flex-1"/>
                  <button onClick={() => saveSpecs(specsDraft)} disabled={savingSpecs}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 disabled:opacity-50">
                    <Check size={12}/> Save
                  </button>
                  <button onClick={() => setEditingSpecs(false)} className="px-3 py-1.5 text-xs text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                    Cancel
                  </button>
                </div>
              </div>
            ) : equip.specs && equip.specs.length > 0 ? (
              <div className="rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                {equip.specs.map((s, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2 odd:bg-slate-50/60 dark:odd:bg-slate-800/60">
                    <span className="text-xs text-slate-500 dark:text-slate-400 flex-1">{s.label}</span>
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300 text-right">{s.value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 dark:text-slate-500 italic">No specifications added</p>
            )}
          </div>

          {/* Notes */}
          <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                <StickyNote size={13}/> Notes
              </div>
              {isAdmin && editField !== 'notes' && (
                <button onClick={() => { setEditField('notes'); setEditVal(equip.notes ?? '') }}
                  className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500">
                  <Pencil size={12}/>
                </button>
              )}
            </div>
            {editField === 'notes' ? (
              <div className="flex flex-col gap-2">
                <textarea
                  value={editVal}
                  onChange={e => setEditVal(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-blue-300 dark:border-blue-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button onClick={() => saveField('notes', editVal)} disabled={saving}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 disabled:opacity-50">
                    <Check size={12}/> Save
                  </button>
                  <button onClick={() => setEditField(null)} className="px-3 py-1.5 text-xs text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className={`text-sm whitespace-pre-wrap ${equip.notes ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400 dark:text-slate-500 italic'}`}>
                {equip.notes || 'No notes'}
              </p>
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex gap-2">
          <button
            onClick={() => router.push(`/maintenance/individual-report?equipmentId=${equip.id}&equipmentName=${encodeURIComponent(equip.name)}`)}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-300 font-medium hover:border-purple-300 dark:hover:border-purple-500/50 hover:shadow-sm transition-all"
          >
            <ClipboardList size={15} className="text-purple-500"/> Individual Report
          </button>
          <button
            onClick={() => router.push(`/maintenance/components?equipmentId=${equip.id}&equipmentName=${encodeURIComponent(equip.name)}`)}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-300 font-medium hover:border-blue-300 dark:hover:border-blue-500/50 hover:shadow-sm transition-all"
          >
            <Package size={15} className="text-blue-500"/> Components
          </button>
        </div>

        {/* Documents */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Manuals & Documents</p>
          </div>
          {loadingDocs ? (
            <div className="flex items-center gap-2 px-4 py-4 text-xs text-slate-400 dark:text-slate-500">
              <Loader2 size={12} className="animate-spin"/> Loading…
            </div>
          ) : documents.length === 0 ? (
            <div className="px-4 py-5 text-center">
              <FileText size={20} className="text-slate-200 dark:text-slate-700 mx-auto mb-1.5"/>
              <p className="text-xs text-slate-400 dark:text-slate-500">No manuals linked yet</p>
              <p className="text-[11px] text-slate-300 dark:text-slate-600 mt-0.5">Open this unit in the dashboard to link or upload a manual</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {documents.map(doc => {
                const ready = doc.status === 'READY' && doc.url
                const processing = doc.status === 'PROCESSING'
                return ready ? (
                  <a
                    key={doc.id}
                    href={doc.url!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <FileText size={14} className="text-red-400 flex-shrink-0"/>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-blue-600 dark:text-blue-400 truncate">{doc.title}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        {doc.page_count ? `${doc.page_count} pages` : 'PDF'}
                        {doc.file_size ? ` · ${Math.round(doc.file_size / 1024)}KB` : ''}
                      </p>
                    </div>
                    <ExternalLink size={12} className="text-slate-300 dark:text-slate-600 flex-shrink-0"/>
                  </a>
                ) : (
                  <div key={doc.id} className="flex items-center gap-3 px-4 py-3">
                    {processing
                      ? <Loader2 size={14} className="text-amber-400 animate-spin flex-shrink-0"/>
                      : <FileText size={14} className="text-slate-300 dark:text-slate-600 flex-shrink-0"/>
                    }
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{doc.title}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">{processing ? 'Processing…' : doc.status}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Photos */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <ImageIcon size={13}/> Photos
            </p>
            {isAdmin && (
              <button
                onClick={() => photoFileRef.current?.click()}
                disabled={uploadingPhoto}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-300 disabled:opacity-50"
              >
                {uploadingPhoto ? <Loader2 size={12} className="animate-spin"/> : <Camera size={12}/>}
                {uploadingPhoto ? 'Uploading…' : 'Add Photos'}
              </button>
            )}
            <input ref={photoFileRef} type="file" accept="image/*" multiple className="hidden"
              onChange={e => { handleMediaUpload('photos', e.target.files, setUploadingPhoto); e.target.value = '' }} />
          </div>
          {(equip.photos ?? []).length === 0 ? (
            <div className="px-4 py-5 text-center">
              <ImageIcon size={20} className="text-slate-200 dark:text-slate-700 mx-auto mb-1.5"/>
              <p className="text-xs text-slate-400 dark:text-slate-500">No photos yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4">
              {(equip.photos ?? []).map((p, i) => (
                <div key={i} className="relative group">
                  <img src={p.url} alt={p.label || `Photo ${i + 1}`} className="w-full aspect-[4/3] object-cover rounded-lg border border-slate-200 dark:border-slate-700"/>
                  {isAdmin ? (
                    <input
                      value={p.label}
                      onChange={e => updateMediaLabel('photos', i, e.target.value)}
                      onBlur={() => saveMedia('photos', equip.photos ?? [])}
                      placeholder="Add label…"
                      className="w-full mt-1 px-1.5 py-0.5 text-[11px] text-slate-500 dark:text-slate-400 bg-transparent border border-transparent rounded hover:border-slate-200 dark:hover:border-slate-700 focus:border-blue-400 focus:outline-none focus:bg-white dark:focus:bg-slate-800 transition-colors"
                    />
                  ) : p.label ? (
                    <p className="mt-1 px-1.5 text-[11px] text-slate-500 dark:text-slate-400 truncate">{p.label}</p>
                  ) : null}
                  {isAdmin && (
                    <button onClick={() => removeMedia('photos', i)}
                      className="absolute top-1.5 right-1.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow">
                      <X size={11}/>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Wiring Diagrams */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Workflow size={13}/> Wiring Diagrams
            </p>
            {isAdmin && (
              <button
                onClick={() => diagramFileRef.current?.click()}
                disabled={uploadingDiagram}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-300 disabled:opacity-50"
              >
                {uploadingDiagram ? <Loader2 size={12} className="animate-spin"/> : <Plus size={12}/>}
                {uploadingDiagram ? 'Uploading…' : 'Add Diagram'}
              </button>
            )}
            <input ref={diagramFileRef} type="file" accept="image/*,application/pdf" multiple className="hidden"
              onChange={e => { handleMediaUpload('wiring_diagrams', e.target.files, setUploadingDiagram); e.target.value = '' }} />
          </div>
          {(equip.wiring_diagrams ?? []).length === 0 ? (
            <div className="px-4 py-5 text-center">
              <Workflow size={20} className="text-slate-200 dark:text-slate-700 mx-auto mb-1.5"/>
              <p className="text-xs text-slate-400 dark:text-slate-500">No wiring diagrams yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4">
              {(equip.wiring_diagrams ?? []).map((d, i) => {
                const isPdf = /\.pdf($|\?)/i.test(d.url)
                return (
                  <div key={i} className="relative group">
                    {isPdf ? (
                      <a href={d.url} target="_blank" rel="noopener noreferrer"
                        className="w-full aspect-[4/3] flex flex-col items-center justify-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                        <FileText size={22} className="text-red-400"/>
                        <span className="text-[11px] text-blue-600 dark:text-blue-400">Open PDF</span>
                      </a>
                    ) : (
                      <a href={d.url} target="_blank" rel="noopener noreferrer">
                        <img src={d.url} alt={d.label || `Diagram ${i + 1}`} className="w-full aspect-[4/3] object-cover rounded-lg border border-slate-200 dark:border-slate-700"/>
                      </a>
                    )}
                    {isAdmin ? (
                      <input
                        value={d.label}
                        onChange={e => updateMediaLabel('wiring_diagrams', i, e.target.value)}
                        onBlur={() => saveMedia('wiring_diagrams', equip.wiring_diagrams ?? [])}
                        placeholder="Add label…"
                        className="w-full mt-1 px-1.5 py-0.5 text-[11px] text-slate-500 dark:text-slate-400 bg-transparent border border-transparent rounded hover:border-slate-200 dark:hover:border-slate-700 focus:border-blue-400 focus:outline-none focus:bg-white dark:focus:bg-slate-800 transition-colors"
                      />
                    ) : d.label ? (
                      <p className="mt-1 px-1.5 text-[11px] text-slate-500 dark:text-slate-400 truncate">{d.label}</p>
                    ) : null}
                    {isAdmin && (
                      <button onClick={() => removeMedia('wiring_diagrams', i)}
                        className="absolute top-1.5 right-1.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow">
                        <X size={11}/>
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Service History — PM reports and individual reports combined into one spot, newest first */}
        {(equip.pm_history.length + equip.individual_reports.length) > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 px-1">
              Service history ({equip.pm_history.length + equip.individual_reports.length})
            </p>
            <div className="flex flex-col gap-2">
              {[
                ...equip.pm_history.map(pm => ({ kind: 'pm' as const, ...pm })),
                ...equip.individual_reports.map(r => ({ kind: 'individual' as const, ...r })),
              ]
                .sort((a, b) => +new Date(b.performed_at) - +new Date(a.performed_at))
                .map(entry => entry.kind === 'pm' ? (
                  <div key={`pm-${entry.id}`} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                      <Wrench size={14} className="text-slate-500 dark:text-slate-400"/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{fmtPmType(entry.report_type)}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">{fmtDate(entry.performed_at)}</p>
                    </div>
                  </div>
                ) : (
                  <button
                    key={`ir-${entry.id}`}
                    onClick={() => router.push(`/maintenance/report/${entry.id}?type=individual&report_type=`)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 flex items-center gap-3 text-left hover:border-purple-300 dark:hover:border-purple-500/50 hover:shadow-sm transition-all"
                  >
                    <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                      <ClipboardList size={14} className="text-purple-500"/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{entry.issue_explanation || 'Individual Report'}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">{fmtDate(entry.performed_at)}</p>
                    </div>
                    <ChevronRight size={14} className="text-slate-300 dark:text-slate-600 flex-shrink-0"/>
                  </button>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
