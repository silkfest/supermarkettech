'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Search, BookOpen, ExternalLink, X, ChevronRight, ChevronDown,
  Loader2, Plus, Zap, Wind, Cpu, Sliders, Droplets, Package,
  Gauge, Snowflake, Server, Monitor, Filter, Box, LayoutGrid,
  Pencil, Camera, Tag, Wrench, CalendarClock, Thermometer, Home,
} from 'lucide-react'
import ManualFinderModal from '@/components/maintenance/ManualFinderModal'
import { getSupabaseBrowser } from '@/lib/supabase/client'
import type { ComponentRecord } from '@/app/api/components/route'
import type { UserRole } from '@/types'

// ── Type metadata ──────────────────────────────────────────────────────────────
const TYPE_META: Record<string, { bg: string; text: string; badge: string; icon: React.ReactNode }> = {
  Compressor:               { bg: 'bg-blue-100',    text: 'text-blue-600',    badge: 'bg-blue-100 text-blue-700',      icon: <Zap      size={22}/> },
  'Condenser Unit':          { bg: 'bg-cyan-100',    text: 'text-cyan-600',    badge: 'bg-cyan-100 text-cyan-700',      icon: <Wind     size={22}/> },
  'Rack Controller':         { bg: 'bg-violet-100',  text: 'text-violet-600',  badge: 'bg-violet-100 text-violet-700',  icon: <Cpu      size={22}/> },
  'EEV Board':               { bg: 'bg-indigo-100',  text: 'text-indigo-600',  badge: 'bg-indigo-100 text-indigo-700',  icon: <Sliders  size={22}/> },
  'Oil Separator':           { bg: 'bg-amber-100',   text: 'text-amber-600',   badge: 'bg-amber-100 text-amber-700',    icon: <Droplets size={22}/> },
  Receiver:                  { bg: 'bg-orange-100',  text: 'text-orange-600',  badge: 'bg-orange-100 text-orange-700',  icon: <Package  size={22}/> },
  'Head Pressure Controller':{ bg: 'bg-rose-100',    text: 'text-rose-600',    badge: 'bg-rose-100 text-rose-700',      icon: <Gauge    size={22}/> },
  'Defrost Board':           { bg: 'bg-teal-100',    text: 'text-teal-600',    badge: 'bg-teal-100 text-teal-700',      icon: <Snowflake size={22}/> },
  'Rack System':             { bg: 'bg-sky-100',     text: 'text-sky-600',     badge: 'bg-sky-100 text-sky-700',        icon: <Server   size={22}/> },
  'Case Controller':         { bg: 'bg-fuchsia-100', text: 'text-fuchsia-600', badge: 'bg-fuchsia-100 text-fuchsia-700',icon: <Monitor  size={22}/> },
  'Filter Drier':            { bg: 'bg-lime-100',    text: 'text-lime-600',    badge: 'bg-lime-100 text-lime-700',      icon: <Filter    size={22}/> },
  'Gas Cooler':              { bg: 'bg-cyan-100',    text: 'text-cyan-600',    badge: 'bg-cyan-100 text-cyan-700',      icon: <Wind      size={22}/> },
  'Flash Tank':              { bg: 'bg-sky-100',     text: 'text-sky-600',     badge: 'bg-sky-100 text-sky-700',        icon: <Package   size={22}/> },
  'Booster Compressor':      { bg: 'bg-blue-100',    text: 'text-blue-600',    badge: 'bg-blue-100 text-blue-700',      icon: <Zap       size={22}/> },
  'Transcritical Compressor':{ bg: 'bg-indigo-100',  text: 'text-indigo-600',  badge: 'bg-indigo-100 text-indigo-700',  icon: <Zap       size={22}/> },
  'HPCO / MPCO':             { bg: 'bg-rose-100',    text: 'text-rose-600',    badge: 'bg-rose-100 text-rose-700',      icon: <Gauge     size={22}/> },
  'Economizer':              { bg: 'bg-amber-100',   text: 'text-amber-600',   badge: 'bg-amber-100 text-amber-700',    icon: <Sliders   size={22}/> },
  'Adiabatic System':        { bg: 'bg-teal-100',    text: 'text-teal-600',    badge: 'bg-teal-100 text-teal-700',      icon: <Droplets  size={22}/> },
  'CO2 Pump':                { bg: 'bg-orange-100',  text: 'text-orange-600',  badge: 'bg-orange-100 text-orange-700',  icon: <Gauge     size={22}/> },
}
const DEFAULT_META = { bg: 'bg-slate-100', text: 'text-slate-500', badge: 'bg-slate-100 text-slate-600', icon: <Box size={22}/> }

const COMPONENT_TYPES = [
  'Compressor','Condenser Unit','Rack Controller','EEV Board',
  'Oil Separator','Receiver','Head Pressure Controller','Defrost Board',
  'Rack System','Case Controller','Filter Drier',
  // CO2 / transcritical types
  'Gas Cooler','Flash Tank','Booster Compressor','Transcritical Compressor',
  'HPCO / MPCO','Economizer','Adiabatic System','CO2 Pump',
  'Other',
]

const DEFROST_TYPES    = ['Electric', 'Hot Gas', 'CO2 Off-Cycle', 'Natural']
const LOAD_CATEGORIES  = ['Low Temp', 'Medium Temp', 'High Temp', 'Process']

const DEFROST_COLOURS: Record<string, string> = {
  'Electric':      'bg-blue-50 text-blue-700 border-blue-200',
  'Hot Gas':       'bg-orange-50 text-orange-700 border-orange-200',
  'CO2 Off-Cycle': 'bg-sky-50 text-sky-700 border-sky-200',
  'Natural':       'bg-green-50 text-green-700 border-green-200',
}
const LOAD_COLOURS: Record<string, string> = {
  'Low Temp':    'bg-violet-50 text-violet-700 border-violet-200',
  'Medium Temp': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'High Temp':   'bg-red-50 text-red-700 border-red-200',
  'Process':     'bg-slate-100 text-slate-600 border-slate-200',
}

const REFRIGERANTS = ['R-404A','R-448A','R-449A','R-22','R-134a','R-410A','R-407A','R-407F','CO2 (R-744)','R-290','R-32','Other']
const OIL_TYPES    = ['Emkarate RL32','Emkarate RL46','Mobil EAL Arctic 22 CC','Mobil EAL Arctic 32 CC','Mobil EAL Arctic 46 CC','Mobil SHC 625','Suniso 3GS','Other']

const STATUS_COLORS: Record<string, string> = {
  active:        'bg-emerald-100 text-emerald-700',
  spare:         'bg-amber-100 text-amber-700',
  decommissioned:'bg-slate-200 text-slate-500',
}

function fmt(date: string) {
  if (!date) return ''
  return new Date(date).toLocaleDateString('en-CA', { year: 'numeric', month: 'short' })
}

// ── Shared form field styles ───────────────────────────────────────────────────
const INP = 'w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
const LBL = 'block text-xs font-medium text-slate-600 mb-1'
const SEL = INP + ' appearance-none'

// ── Form state type ────────────────────────────────────────────────────────────
interface CompForm {
  type: string; manufacturer: string; model: string; serial: string
  storeName: string; assetTag: string; refrigerant: string; oilType: string
  installDate: string; lastServiceDate: string; status: string
  manualTitle: string; manualUrl: string
  notes: string; troubleshooting: string
  defrostType: string; loadCategory: string; supplier: string; partNumber: string
}
const EMPTY_FORM: CompForm = {
  type: 'Compressor', manufacturer: '', model: '', serial: '',
  storeName: '', assetTag: '', refrigerant: '', oilType: '',
  installDate: '', lastServiceDate: '', status: 'active',
  manualTitle: '', manualUrl: '', notes: '', troubleshooting: '',
  defrostType: '', loadCategory: '', supplier: '', partNumber: '',
}

// ── Component form fields (shared by Add + Edit modals) ───────────────────────
function ComponentFormFields({ form, set, isEdit = false }: {
  form: CompForm
  set: (k: keyof CompForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void
  isEdit?: boolean
}) {
  return (
    <div className="space-y-4">
      {/* Type + Status */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LBL}>Type</label>
          <select value={form.type} onChange={set('type')} className={SEL}>
            {COMPONENT_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className={LBL}>Status</label>
          <select value={form.status} onChange={set('status')} className={SEL}>
            <option value="active">Active</option>
            <option value="spare">Spare</option>
            <option value="decommissioned">Decommissioned</option>
          </select>
        </div>
      </div>

      {/* Manufacturer + Model */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LBL}>Manufacturer {!isEdit && <span className="text-red-400">*</span>}</label>
          <input value={form.manufacturer} onChange={set('manufacturer')} placeholder="e.g. Copeland" className={INP} />
        </div>
        <div>
          <label className={LBL}>Model {!isEdit && <span className="text-red-400">*</span>}</label>
          <input value={form.model} onChange={set('model')} placeholder="e.g. 4DR3-0750" className={INP} />
        </div>
      </div>

      {/* Serial + Asset tag */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LBL}>Serial Number</label>
          <input value={form.serial} onChange={set('serial')} placeholder="e.g. 26A1234567" className={INP} />
        </div>
        <div>
          <label className={LBL}>Asset / Tag #</label>
          <input value={form.assetTag} onChange={set('assetTag')} placeholder="e.g. COMP-042" className={INP} />
        </div>
      </div>

      {/* Refrigerant + Oil type */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LBL}>Refrigerant</label>
          <select value={form.refrigerant} onChange={set('refrigerant')} className={SEL}>
            <option value="">— select —</option>
            {REFRIGERANTS.map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className={LBL}>Oil Type</label>
          <select value={form.oilType} onChange={set('oilType')} className={SEL}>
            <option value="">— select —</option>
            {OIL_TYPES.map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
      </div>

      {/* Site */}
      <div>
        <label className={LBL}>Site / Store</label>
        <input value={form.storeName} onChange={set('storeName')} placeholder="e.g. Main St Superstore" className={INP} />
      </div>

      {/* Install + Last service */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LBL}>Install Date</label>
          <input type="date" value={form.installDate} onChange={set('installDate')} className={INP} />
        </div>
        <div>
          <label className={LBL}>Last Service Date</label>
          <input type="date" value={form.lastServiceDate} onChange={set('lastServiceDate')} className={INP} />
        </div>
      </div>

      {/* CO2 / Extended metadata */}
      <div className="pt-1 border-t border-slate-100">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">CO2 / Extended Details</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LBL}>Defrost Type</label>
            <select value={form.defrostType} onChange={set('defrostType')} className={SEL}>
              <option value="">— N/A —</option>
              {DEFROST_TYPES.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className={LBL}>Load Category</label>
            <select value={form.loadCategory} onChange={set('loadCategory')} className={SEL}>
              <option value="">— N/A —</option>
              {LOAD_CATEGORIES.map(l => <option key={l}>{l}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div>
            <label className={LBL}>Supplier</label>
            <input value={form.supplier} onChange={set('supplier')} placeholder="e.g. Bitzer, Danfoss" className={INP} />
          </div>
          <div>
            <label className={LBL}>Part Number</label>
            <input value={form.partNumber} onChange={set('partNumber')} placeholder="Manufacturer P/N" className={INP} />
          </div>
        </div>
      </div>

      {/* Manual */}
      <div className="pt-1 border-t border-slate-100">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Documentation</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LBL}>Manual Title</label>
            <input value={form.manualTitle} onChange={set('manualTitle')} placeholder="Installation Guide" className={INP} />
          </div>
          <div>
            <label className={LBL}>Manual URL</label>
            <input value={form.manualUrl} onChange={set('manualUrl')} placeholder="https://…" className={INP} />
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="pt-1 border-t border-slate-100">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Notes & Troubleshooting</p>
        <div>
          <label className={LBL}>Notes</label>
          <textarea
            value={form.notes}
            onChange={set('notes') as unknown as React.ChangeEventHandler<HTMLTextAreaElement>}
            placeholder="Known issues, quirks, service history…"
            rows={3}
            className={INP + ' resize-none'}
          />
        </div>
        <div className="mt-3">
          <label className={LBL}>Troubleshooting Steps</label>
          <textarea
            value={form.troubleshooting}
            onChange={set('troubleshooting') as unknown as React.ChangeEventHandler<HTMLTextAreaElement>}
            placeholder={"One step per line:\nCheck suction pressure\nCheck oil level\nVerify EEV operation"}
            rows={5}
            className={INP + ' resize-none font-mono text-xs'}
          />
          <p className="text-[10px] text-slate-400 mt-1">One step per line — displayed as a numbered list</p>
        </div>
      </div>
    </div>
  )
}

// ── Add Component Modal ────────────────────────────────────────────────────────
function AddComponentModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<CompForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [err, setErr]       = useState('')

  const set = (k: keyof CompForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
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

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col max-h-[92dvh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100 flex-shrink-0">
          <h2 className="text-base font-semibold text-slate-800">Add Component</h2>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"><X size={18}/></button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-5 py-4">
          <ComponentFormFields form={form} set={set} />
          {err && <p className="text-xs text-red-500 mt-3">{err}</p>}
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 py-4 border-t border-slate-100 flex-shrink-0">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">Cancel</button>
          <button onClick={save} disabled={saving} className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
            {saving ? <Loader2 size={14} className="animate-spin"/> : <Plus size={14}/>}
            {saving ? 'Saving…' : 'Add Component'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Edit Component Modal ───────────────────────────────────────────────────────
function EditComponentModal({
  component, onClose, onSaved,
}: {
  component: ComponentRecord
  onClose: () => void
  onSaved: (updated: Partial<ComponentRecord>) => void
}) {
  const [form, setForm] = useState<CompForm>({
    type:            component.type,
    manufacturer:    component.manufacturer,
    model:           component.model,
    serial:          component.serial,
    storeName:       component.storeName,
    assetTag:        component.assetTag,
    refrigerant:     component.refrigerant,
    oilType:         component.oilType,
    installDate:     component.installDate,
    lastServiceDate: component.lastServiceDate,
    status:          component.status || 'active',
    manualTitle:     component.manualTitle,
    manualUrl:       component.manualUrl,
    notes:           component.notes,
    troubleshooting: component.troubleshooting,
    defrostType:     component.defrostType  ?? '',
    loadCategory:    component.loadCategory ?? '',
    supplier:        component.supplier     ?? '',
    partNumber:      component.partNumber   ?? '',
  })
  const [saving,      setSaving]      = useState(false)
  const [err,         setErr]         = useState('')
  const [uploading,   setUploading]   = useState(false)
  const [photoPreview, setPhotoPreview] = useState(component.photoUrl)
  const fileRef = useRef<HTMLInputElement>(null)

  const set = (k: keyof CompForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))

  async function uploadPhoto(file: File) {
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('catalogId', component.catalogId!)
    try {
      const res = await fetch('/api/components/upload', { method: 'POST', body: fd })
      const d   = await res.json()
      if (res.ok) setPhotoPreview(d.url)
      else setErr(d.error ?? 'Upload failed.')
    } catch { setErr('Upload failed.') }
    setUploading(false)
  }

  async function save() {
    setSaving(true); setErr('')
    try {
      const res = await fetch('/api/components', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: component.catalogId, ...form }),
      })
      if (!res.ok) { const d = await res.json(); setErr(d.error ?? 'Save failed.') }
      else onSaved({ ...form, photoUrl: photoPreview })
    } catch { setErr('Network error.') }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col max-h-[92dvh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100 flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-slate-800">Edit Component</h2>
            <p className="text-xs text-slate-500 mt-0.5">{component.manufacturer} {component.model}</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"><X size={18}/></button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

          {/* Photo section */}
          <div className="pt-1">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Photo</p>
            <div className="flex items-center gap-3">
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt="Component photo"
                  className="w-20 h-20 rounded-xl object-cover border border-slate-200 flex-shrink-0"
                />
              ) : (
                <div className="w-20 h-20 rounded-xl bg-slate-100 border border-dashed border-slate-300 flex items-center justify-center flex-shrink-0">
                  <Camera size={22} className="text-slate-400"/>
                </div>
              )}
              <div>
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 disabled:opacity-50 transition-colors"
                >
                  {uploading ? <Loader2 size={12} className="animate-spin"/> : <Camera size={12}/>}
                  {uploading ? 'Uploading…' : photoPreview ? 'Replace photo' : 'Upload photo'}
                </button>
                <p className="text-[10px] text-slate-400 mt-1">JPG or PNG, max 5 MB</p>
              </div>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) uploadPhoto(f) }}
            />
          </div>

          <div className="border-t border-slate-100"/>
          <ComponentFormFields form={form} set={set} isEdit />
          {err && <p className="text-xs text-red-500">{err}</p>}
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 py-4 border-t border-slate-100 flex-shrink-0">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">Cancel</button>
          <button onClick={save} disabled={saving} className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
            {saving ? <Loader2 size={14} className="animate-spin"/> : <Pencil size={14}/>}
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Component card ─────────────────────────────────────────────────────────────
function ComponentCard({
  c, isAdmin, onEdit, onManualTarget,
}: {
  c: ComponentRecord
  isAdmin: boolean
  onEdit: (c: ComponentRecord) => void
  onManualTarget: (c: ComponentRecord) => void
}) {
  const router   = useRouter()
  const [expanded, setExpanded] = useState(false)
  const meta     = TYPE_META[c.type] ?? DEFAULT_META
  const hasExtra = !!(c.notes || c.troubleshooting)
  const steps    = c.troubleshooting ? c.troubleshooting.split('\n').filter(s => s.trim()) : []
  const isDecom  = c.status === 'decommissioned'

  return (
    <div className={`bg-white border rounded-xl overflow-hidden transition-all ${isDecom ? 'border-slate-200 opacity-60' : 'border-slate-200'}`}>
      {/* Photo banner if present */}
      {c.photoUrl && (
        <img
          src={c.photoUrl}
          alt={`${c.manufacturer} ${c.model}`}
          className="w-full h-36 object-cover"
        />
      )}

      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon square */}
          <div className={`flex-shrink-0 w-11 h-11 rounded-xl ${meta.bg} ${meta.text} flex items-center justify-center`}>
            {meta.icon}
          </div>

          <div className="flex-1 min-w-0">
            {/* Badges row */}
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${meta.badge}`}>{c.type}</span>
              {c.status && c.status !== 'active' && (
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[c.status] ?? 'bg-slate-100 text-slate-500'}`}>
                  {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                </span>
              )}
              {c.refrigerant && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                  {c.refrigerant}
                </span>
              )}
              {c.isCatalog && <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-400">Catalog</span>}
            </div>

            {/* Name */}
            <p className={`text-sm font-semibold leading-tight ${isDecom ? 'line-through text-slate-400' : 'text-slate-800'}`}>
              {[c.manufacturer, c.model].filter(Boolean).join(' ') || '—'}
            </p>

            {/* Serial + Asset tag */}
            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
              {c.serial && <p className="text-xs text-slate-500">S/N: {c.serial}</p>}
              {c.assetTag && (
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <Tag size={10}/> {c.assetTag}
                </p>
              )}
            </div>

            {/* Meta row: site · install · last service · oil */}
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
              {c.storeName && <span className="text-xs text-slate-400">{c.storeName}</span>}
              {c.installDate && (
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <CalendarClock size={10}/> Installed {fmt(c.installDate)}
                </span>
              )}
              {c.lastServiceDate && (
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Wrench size={10}/> Serviced {fmt(c.lastServiceDate)}
                </span>
              )}
              {c.oilType && (
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Droplets size={10}/> {c.oilType}
                </span>
              )}
            </div>

            {/* CO2 metadata badges */}
            {(c.defrostType || c.loadCategory || c.supplier || c.partNumber) && (
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {c.defrostType && (
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${DEFROST_COLOURS[c.defrostType] ?? 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                    {c.defrostType} defrost
                  </span>
                )}
                {c.loadCategory && (
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${LOAD_COLOURS[c.loadCategory] ?? 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                    {c.loadCategory}
                  </span>
                )}
                {(c.supplier || c.partNumber) && (
                  <span className="text-[10px] text-slate-400">
                    {[c.supplier, c.partNumber].filter(Boolean).join(' · ')}
                  </span>
                )}
              </div>
            )}

            {/* Manual + Edit */}
            <div className="mt-2.5 flex items-center gap-2 flex-wrap">
              {c.manualUrl ? (
                <a href={c.manualUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700 hover:bg-emerald-100 transition-colors">
                  <ExternalLink size={11}/>
                  <span className="font-medium truncate max-w-[200px]">{c.manualTitle || 'Open Manual'}</span>
                </a>
              ) : c.manualId ? (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700">
                  <BookOpen size={11}/>
                  <span className="font-medium truncate max-w-[200px]">{c.manualTitle || 'Manual linked'}</span>
                </div>
              ) : (
                <button onClick={() => onManualTarget(c)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 border border-dashed border-slate-300 rounded-lg text-xs text-slate-500 hover:border-blue-300 hover:text-blue-600 transition-colors">
                  <BookOpen size={11}/> Find Manual
                </button>
              )}
              {isAdmin && c.isCatalog && (
                <button onClick={() => onEdit(c)} className="p-1 text-slate-300 hover:text-blue-500 rounded transition-colors" title="Edit component">
                  <Pencil size={12}/>
                </button>
              )}
            </div>

            {/* Expand toggle for notes / troubleshooting */}
            {hasExtra && (
              <button
                onClick={() => setExpanded(e => !e)}
                className="mt-2 flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"
              >
                <ChevronDown size={13} className={`transition-transform ${expanded ? 'rotate-180' : ''}`}/>
                {expanded ? 'Hide details' : 'Notes & troubleshooting'}
              </button>
            )}

            {/* Expanded details */}
            {expanded && (
              <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
                {c.notes && (
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Notes</p>
                    <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">{c.notes}</p>
                  </div>
                )}
                {steps.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <Thermometer size={10}/> Troubleshooting
                    </p>
                    <ol className="space-y-1">
                      {steps.map((step, i) => (
                        <li key={i} className="flex gap-2 text-xs text-slate-600">
                          <span className="flex-shrink-0 w-4 h-4 rounded-full bg-blue-100 text-blue-600 text-[10px] font-bold flex items-center justify-center">
                            {i + 1}
                          </span>
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* PM report link */}
          {!c.isCatalog && (
            <button
              onClick={() => router.push(`/maintenance/refrigeration-pm?id=${c.pmReportId}`)}
              className="flex-shrink-0 p-1.5 text-slate-300 hover:text-blue-500 rounded-lg hover:bg-slate-50 transition-colors"
              title="Open source PM report"
            >
              <ChevronRight size={16}/>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ComponentRegistryPage() {
  const router = useRouter()

  const [allComponents,    setAllComponents]    = useState<ComponentRecord[]>([])
  const [components,       setComponents]       = useState<ComponentRecord[]>([])
  const [types,            setTypes]            = useState<string[]>([])
  const [loading,          setLoading]          = useState(true)
  const [query,            setQuery]            = useState('')
  const [activeType,       setActiveType]       = useState('')
  const [activeDefrost,    setActiveDefrost]    = useState('')
  const [activeLoad,       setActiveLoad]       = useState('')
  const [manualTarget,     setManualTarget]     = useState<ComponentRecord | null>(null)
  const [editTarget,       setEditTarget]       = useState<ComponentRecord | null>(null)
  const [showAdd,          setShowAdd]          = useState(false)
  const [userRole,         setUserRole]         = useState<UserRole | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isAdmin = userRole === 'admin' || userRole === 'manager'

  useEffect(() => {
    async function checkRole() {
      try {
        const sb = getSupabaseBrowser()
        const { data: { user } } = await sb.auth.getUser()
        if (!user) return
        const { data } = await sb.from('users').select('role').eq('id', user.id).single()
        const role = (data as { role?: string } | null)?.role
        if (role) setUserRole(role as UserRole)
      } catch { /* silent */ }
    }
    checkRole()
  }, [])

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

  const fetchFiltered = useCallback(async (q: string, t: string, defrost: string, load: string) => {
    const params = new URLSearchParams()
    if (q)      params.set('q', q)
    if (t)      params.set('type', t)
    if (defrost) params.set('defrostType', defrost)
    if (load)   params.set('loadCategory', load)
    try {
      const data = await fetch(`/api/components?${params}`).then(r => r.json())
      if (Array.isArray(data)) setComponents(data)
    } catch { /* silent */ }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchFiltered(query, activeType, activeDefrost, activeLoad), 280)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, activeType, activeDefrost, activeLoad, fetchFiltered])

  const inFilterMode = !!(query || activeType || activeDefrost || activeLoad)

  function handleEditSaved(updated: Partial<ComponentRecord>) {
    const patch = (list: ComponentRecord[]) =>
      list.map(c => c.key === editTarget!.key ? { ...c, ...updated } : c)
    setAllComponents(patch)
    setComponents(patch)
    setEditTarget(null)
  }

  return (
    <div className="min-h-[100dvh] bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => router.push('/dashboard')} className="p-1.5 -ml-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100" title="Dashboard">
          <Home size={20}/>
        </button>
        <button onClick={() => router.push('/maintenance')} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100" title="Maintenance">
          <ArrowLeft size={20}/>
        </button>
        <div className="flex items-baseline gap-0.5">
          <span className="text-lg font-bold text-blue-600">Cold</span>
          <span className="text-lg font-bold text-slate-800">IQ</span>
        </div>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-medium text-slate-700">Component Registry</span>
        {isAdmin && (
          <button onClick={() => setShowAdd(true)} className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
            <Plus size={13}/> Add
          </button>
        )}
      </div>

      <div className="max-w-4xl mx-auto px-4 py-5 space-y-4">
        {/* Search + filters */}
        <div className="space-y-2">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by model, serial, manufacturer, supplier…"
              className="w-full pl-9 pr-9 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {query && <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={14}/></button>}
          </div>
          <div className="flex gap-2 flex-wrap">
            <select
              value={activeDefrost}
              onChange={e => setActiveDefrost(e.target.value)}
              className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
            >
              <option value="">Defrost type…</option>
              {DEFROST_TYPES.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select
              value={activeLoad}
              onChange={e => setActiveLoad(e.target.value)}
              className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
            >
              <option value="">Load category…</option>
              {LOAD_CATEGORIES.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            {(activeDefrost || activeLoad) && (
              <button
                onClick={() => { setActiveDefrost(''); setActiveLoad('') }}
                className="px-3 py-2 text-xs text-slate-500 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center gap-1"
              >
                <X size={11}/> Clear filters
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 gap-3 text-slate-400 text-sm">
            <Loader2 size={16} className="animate-spin"/> Loading components…
          </div>
        ) : !inFilterMode ? (
          /* ── Category grid ── */
          <div className="space-y-3">
            {allComponents.length > 0 && (
              <p className="text-xs text-slate-500">
                <span className="font-semibold text-slate-700">{allComponents.length}</span> components across{' '}
                <span className="font-semibold text-slate-700">{types.length}</span> categories
              </p>
            )}
            {types.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                <button onClick={() => { setActiveType(''); setQuery('') }}
                  className="flex flex-col items-center justify-center gap-2 p-3 bg-white border-2 border-slate-200 rounded-2xl hover:border-blue-300 hover:shadow-sm active:scale-95 transition-all">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center"><LayoutGrid size={22}/></div>
                  <span className="text-[11px] font-semibold text-slate-700">All</span>
                  <span className="text-[10px] text-slate-400">{allComponents.length}</span>
                </button>
                {types.map(t => {
                  const meta  = TYPE_META[t] ?? DEFAULT_META
                  const count = allComponents.filter(c => c.type === t).length
                  return (
                    <button key={t} onClick={() => setActiveType(t)}
                      className="flex flex-col items-center justify-center gap-2 p-3 bg-white border-2 border-slate-200 rounded-2xl hover:border-blue-300 hover:shadow-sm active:scale-95 transition-all">
                      <div className={`w-12 h-12 rounded-xl ${meta.bg} ${meta.text} flex items-center justify-center`}>{meta.icon}</div>
                      <span className="text-[11px] font-semibold text-slate-700 text-center leading-tight">{t}</span>
                      <span className="text-[10px] text-slate-400">{count}</span>
                    </button>
                  )
                })}
              </div>
            )}
            {allComponents.length === 0 && (
              <div className="text-center py-16">
                <p className="text-sm text-slate-500">No components yet.</p>
                {isAdmin && (
                  <button onClick={() => setShowAdd(true)} className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors">
                    <Plus size={14}/> Add your first component
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          /* ── Filtered results ── */
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              {activeType && (
                <button onClick={() => setActiveType('')} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-full">
                  {activeType} <X size={11}/>
                </button>
              )}
              {activeDefrost && (
                <button onClick={() => setActiveDefrost('')} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 text-white text-xs font-medium rounded-full">
                  {activeDefrost} <X size={11}/>
                </button>
              )}
              {activeLoad && (
                <button onClick={() => setActiveLoad('')} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 text-white text-xs font-medium rounded-full">
                  {activeLoad} <X size={11}/>
                </button>
              )}
              <span className="text-xs text-slate-500">{components.length} result{components.length !== 1 ? 's' : ''}</span>
            </div>

            {components.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-sm text-slate-500">No components match your search.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {components.map(c => (
                  <ComponentCard
                    key={c.key}
                    c={c}
                    isAdmin={isAdmin}
                    onEdit={setEditTarget}
                    onManualTarget={setManualTarget}
                  />
                ))}
              </div>
            )}
          </div>
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
      {showAdd && <AddComponentModal onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); fetchAll() }}/>}
      {editTarget && (
        <EditComponentModal
          component={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={handleEditSaved}
        />
      )}
    </div>
  )
}
