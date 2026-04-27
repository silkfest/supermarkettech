'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  ArrowLeft, Package, Wrench, Pencil, Check, X,
  Building2, MapPin, Calendar, Thermometer, Tag, StickyNote,
  ClipboardList, ChevronRight, Wind, RefrigeratorIcon,
} from 'lucide-react'
import { getSupabaseBrowser } from '@/lib/supabase/client'

// ── Types ──────────────────────────────────────────────────────────────────

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
  status: string
  updated_at: string
  // joined
  stores: { name: string; address: string } | null
  pm_history: PMEntry[]
}

interface PMEntry {
  id: string
  store_name: string
  performed_at: string
  report_type: string
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
  rack:         { bg: 'bg-blue-50',    text: 'text-blue-600',   icon: <RefrigeratorIcon size={20}/>, label: 'Refrigeration Rack' },
  display_case: { bg: 'bg-cyan-50',    text: 'text-cyan-600',   icon: <RefrigeratorIcon size={20}/>, label: 'Display Case' },
  walk_in:      { bg: 'bg-indigo-50',  text: 'text-indigo-600', icon: <RefrigeratorIcon size={20}/>, label: 'Walk-In' },
  hvac:         { bg: 'bg-emerald-50', text: 'text-emerald-600',icon: <Wind size={20}/>,             label: 'HVAC Unit' },
  condenser:    { bg: 'bg-violet-50',  text: 'text-violet-600', icon: <Thermometer size={20}/>,      label: 'Condenser' },
  other:        { bg: 'bg-slate-100',  text: 'text-slate-500',  icon: <Package size={20}/>,          label: 'Other' },
}

const STATUS_STYLES: Record<string, { dot: string; badge: string }> = {
  OK:      { dot: 'bg-green-500',  badge: 'bg-green-50 text-green-700 border-green-200' },
  WARNING: { dot: 'bg-amber-400',  badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  ALARM:   { dot: 'bg-red-500',    badge: 'bg-red-50 text-red-700 border-red-200' },
  OFFLINE: { dot: 'bg-slate-400',  badge: 'bg-slate-100 text-slate-600 border-slate-200' },
  UNKNOWN: { dot: 'bg-slate-300',  badge: 'bg-slate-50 text-slate-500 border-slate-200' },
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

  useEffect(() => {
    async function init() {
      const supabase = getSupabaseBrowser()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
      setIsAdmin(profile?.role === 'admin' || profile?.role === 'manager')

      const res = await fetch(`/api/equipment/${id}`)
      if (res.ok) setEquip(await res.json())
      setLoading(false)
    }
    init()
  }, [id, router])

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
    }
    setEditField(null)
    setSaving(false)
  }

  if (loading) return (
    <div className="min-h-[100dvh] bg-slate-50 flex items-center justify-center text-slate-400 text-sm">
      Loading…
    </div>
  )

  if (!equip) return (
    <div className="min-h-[100dvh] bg-slate-50 flex items-center justify-center text-slate-400 text-sm">
      Equipment not found.
    </div>
  )

  const meta = TYPE_META[equip.equipment_type] ?? TYPE_META.other
  const statusStyle = STATUS_STYLES[equip.status] ?? STATUS_STYLES.UNKNOWN

  return (
    <div className="min-h-[100dvh] bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button
          onClick={() => equip.store_id ? router.push(`/stores/${equip.store_id}`) : router.back()}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-semibold text-slate-900 truncate">{equip.name}</h1>
          <p className="text-xs text-slate-500">{equip.stores?.name ?? '—'}</p>
        </div>
        <span className={`text-[11px] font-semibold px-2 py-1 rounded-full border ${statusStyle.badge}`}>
          {equip.status}
        </span>
      </div>

      <div className="px-4 py-4 max-w-2xl mx-auto flex flex-col gap-4">

        {/* Equipment card */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          {/* Type banner */}
          <div className={`flex items-center gap-3 px-4 py-3 ${meta.bg} border-b border-slate-100`}>
            <div className={`${meta.text}`}>{meta.icon}</div>
            <div>
              <p className={`text-sm font-semibold ${meta.text}`}>{meta.label}</p>
              <p className="text-xs text-slate-500">{equip.stores?.name}</p>
            </div>
          </div>

          {/* Detail rows */}
          <div className="divide-y divide-slate-100">
            <DetailRow label="Manufacturer" icon={<Tag size={13}/>} value={equip.manufacturer}
              isAdmin={isAdmin} fieldKey="manufacturer" editField={editField} editVal={editVal}
              saving={saving} placeholder="e.g. Copeland"
              onEdit={(k,v) => { setEditField(k); setEditVal(v) }}
              onSave={saveField} onCancel={() => setEditField(null)} onEditValChange={setEditVal}
            />
            <DetailRow label="Model" icon={<Tag size={13}/>} value={equip.model}
              isAdmin={isAdmin} fieldKey="model" editField={editField} editVal={editVal}
              saving={saving} placeholder="e.g. ZF34K4E-TFD"
              onEdit={(k,v) => { setEditField(k); setEditVal(v) }}
              onSave={saveField} onCancel={() => setEditField(null)} onEditValChange={setEditVal}
            />
            <DetailRow label="Serial #" icon={<Tag size={13}/>} value={equip.serial_number}
              isAdmin={isAdmin} fieldKey="serialNumber" editField={editField} editVal={editVal}
              saving={saving} placeholder="Serial number"
              onEdit={(k,v) => { setEditField(k); setEditVal(v) }}
              onSave={saveField} onCancel={() => setEditField(null)} onEditValChange={setEditVal}
            />

            {/* Refrigerant — select */}
            <div className="flex items-center gap-3 px-4 py-2.5">
              <span className="text-slate-400 flex-shrink-0"><Thermometer size={13}/></span>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">Refrigerant</p>
                {editField === 'refrigerant' ? (
                  <div className="flex items-center gap-2 mt-0.5">
                    <select
                      value={editVal}
                      onChange={e => setEditVal(e.target.value)}
                      autoFocus
                      className="flex-1 px-2 py-1 text-sm border border-blue-300 rounded-lg focus:outline-none bg-white"
                    >
                      <option value="">— select —</option>
                      {REFRIGERANTS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <button onClick={() => saveField('refrigerant', editVal)} disabled={saving}
                      className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                      <Check size={12}/>
                    </button>
                    <button onClick={() => setEditField(null)} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg">
                      <X size={12}/>
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-slate-800">{equip.refrigerant || <span className="text-slate-400 italic">Not set</span>}</p>
                )}
              </div>
              {isAdmin && editField !== 'refrigerant' && (
                <button onClick={() => { setEditField('refrigerant'); setEditVal(equip.refrigerant ?? '') }}
                  className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg flex-shrink-0">
                  <Pencil size={12}/>
                </button>
              )}
            </div>

            {/* Status — select */}
            <div className="flex items-center gap-3 px-4 py-2.5">
              <span className="text-slate-400 flex-shrink-0">
                <div className={`w-3 h-3 rounded-full ${statusStyle.dot}`}/>
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">Status</p>
                {editField === 'status' ? (
                  <div className="flex items-center gap-2 mt-0.5">
                    <select
                      value={editVal}
                      onChange={e => setEditVal(e.target.value)}
                      autoFocus
                      className="flex-1 px-2 py-1 text-sm border border-blue-300 rounded-lg focus:outline-none bg-white"
                    >
                      {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <button onClick={() => saveField('status', editVal)} disabled={saving}
                      className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                      <Check size={12}/>
                    </button>
                    <button onClick={() => setEditField(null)} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg">
                      <X size={12}/>
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-slate-800">{equip.status}</p>
                )}
              </div>
              {isAdmin && editField !== 'status' && (
                <button onClick={() => { setEditField('status'); setEditVal(equip.status) }}
                  className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg flex-shrink-0">
                  <Pencil size={12}/>
                </button>
              )}
            </div>

            <DetailRow label="Location" icon={<MapPin size={13}/>} value={equip.location}
              isAdmin={isAdmin} fieldKey="location" editField={editField} editVal={editVal}
              saving={saving} placeholder="e.g. Machine room"
              onEdit={(k,v) => { setEditField(k); setEditVal(v) }}
              onSave={saveField} onCancel={() => setEditField(null)} onEditValChange={setEditVal}
            />

            {/* Install date */}
            <div className="flex items-center gap-3 px-4 py-2.5">
              <span className="text-slate-400 flex-shrink-0"><Calendar size={13}/></span>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">Install date</p>
                {editField === 'installedAt' ? (
                  <div className="flex items-center gap-2 mt-0.5">
                    <input
                      type="date"
                      value={editVal}
                      onChange={e => setEditVal(e.target.value)}
                      autoFocus
                      className="flex-1 px-2 py-1 text-sm border border-blue-300 rounded-lg focus:outline-none"
                    />
                    <button onClick={() => saveField('installedAt', editVal)} disabled={saving}
                      className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                      <Check size={12}/>
                    </button>
                    <button onClick={() => setEditField(null)} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg">
                      <X size={12}/>
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-slate-800">{fmtDate(equip.installed_at)}</p>
                )}
              </div>
              {isAdmin && editField !== 'installedAt' && (
                <button onClick={() => { setEditField('installedAt'); setEditVal(equip.installed_at?.slice(0,10) ?? '') }}
                  className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg flex-shrink-0">
                  <Pencil size={12}/>
                </button>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="px-4 py-3 border-t border-slate-100">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <StickyNote size={13}/> Notes
              </div>
              {isAdmin && editField !== 'notes' && (
                <button onClick={() => { setEditField('notes'); setEditVal(equip.notes ?? '') }}
                  className="p-1 rounded-md hover:bg-slate-100 text-slate-400">
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
                  className="w-full px-3 py-2 text-sm border border-blue-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button onClick={() => saveField('notes', editVal)} disabled={saving}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 disabled:opacity-50">
                    <Check size={12}/> Save
                  </button>
                  <button onClick={() => setEditField(null)} className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 rounded-lg">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className={`text-sm ${equip.notes ? 'text-slate-700' : 'text-slate-400 italic'}`}>
                {equip.notes || 'No notes'}
              </p>
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex gap-2">
          <button
            onClick={() => router.push(`/maintenance?equipmentId=${equip.id}&equipmentName=${encodeURIComponent(equip.name)}`)}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 font-medium hover:border-blue-300 hover:shadow-sm transition-all"
          >
            <Wrench size={15} className="text-blue-500"/> Run PM
          </button>
          <button
            onClick={() => router.push(`/maintenance/components?search=${encodeURIComponent(equip.name)}`)}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 font-medium hover:border-blue-300 hover:shadow-sm transition-all"
          >
            <ClipboardList size={15} className="text-purple-500"/> Components
          </button>
        </div>

        {/* PM History */}
        {equip.pm_history.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1">
              PM history ({equip.pm_history.length})
            </p>
            <div className="flex flex-col gap-2">
              {equip.pm_history.map(pm => (
                <div key={pm.id} className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <Wrench size={14} className="text-slate-500"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800">{fmtPmType(pm.report_type)}</p>
                    <p className="text-xs text-slate-400">{fmtDate(pm.performed_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {equip.pm_history.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 bg-white border border-dashed border-slate-200 rounded-2xl text-slate-400">
            <Wrench size={24} className="mb-2 opacity-30"/>
            <p className="text-sm">No PM history yet</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Inline editable text row ───────────────────────────────────────────────

interface DetailRowProps {
  label: string
  icon: React.ReactNode
  value: string
  isAdmin: boolean
  fieldKey: string
  editField: string | null
  editVal: string
  saving: boolean
  placeholder: string
  onEdit: (key: string, val: string) => void
  onSave: (key: string, val: string) => void
  onCancel: () => void
  onEditValChange: (v: string) => void
}

function DetailRow({
  label, icon, value, isAdmin, fieldKey,
  editField, editVal, saving, placeholder,
  onEdit, onSave, onCancel, onEditValChange,
}: DetailRowProps) {
  const isEditing = editField === fieldKey
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <span className="text-slate-400 flex-shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-slate-400 uppercase tracking-wider">{label}</p>
        {isEditing ? (
          <div className="flex items-center gap-2 mt-0.5">
            <input
              value={editVal}
              onChange={e => onEditValChange(e.target.value)}
              placeholder={placeholder}
              autoFocus
              className="flex-1 px-2 py-1 text-sm border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <button onClick={() => onSave(fieldKey, editVal)} disabled={saving}
              className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              <Check size={12}/>
            </button>
            <button onClick={onCancel} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg">
              <X size={12}/>
            </button>
          </div>
        ) : (
          <p className="text-sm text-slate-800 truncate">
            {value || <span className="text-slate-400 italic">Not set</span>}
          </p>
        )}
      </div>
      {isAdmin && !isEditing && (
        <button onClick={() => onEdit(fieldKey, value ?? '')}
          className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg flex-shrink-0">
          <Pencil size={12}/>
        </button>
      )}
    </div>
  )
}
