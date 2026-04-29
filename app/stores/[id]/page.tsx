'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  ArrowLeft, Building2, MapPin, Phone, User, Wrench, Plus,
  ChevronRight, Pencil, X, Check, AlertTriangle, Package,
  Thermometer, Wind, RefrigeratorIcon, Home,
} from 'lucide-react'
import { getSupabaseBrowser } from '@/lib/supabase/client'
import EditableRow from '@/components/EditableRow'

// ── Types ──────────────────────────────────────────────────────────────────

interface StoreDetail {
  id: string
  name: string
  address: string
  contact_name: string
  phone: string
  trending_issues: string
  updated_at: string
  equipment: EquipmentRow[]
  recent_pms: RecentPM[]
}

interface EquipmentRow {
  id: string
  name: string
  equipment_type: string
  manufacturer: string
  model: string
  serial_number: string
  refrigerant: string
  status: string
  location: string
  installed_at: string | null
}

interface RecentPM {
  id: string
  store_name: string
  performed_at: string
  report_type: string
}

interface AddEquipForm {
  name: string
  equipmentType: string
  manufacturer: string
  model: string
  serialNumber: string
  refrigerant: string
  installedAt: string
  location: string
  notes: string
}

// ── Constants ─────────────────────────────────────────────────────────────

const EMPTY_EQUIP: AddEquipForm = {
  name: '', equipmentType: 'rack', manufacturer: '', model: '',
  serialNumber: '', refrigerant: '', installedAt: '', location: '', notes: '',
}

const EQUIP_TYPES = [
  { value: 'rack',         label: 'Refrigeration Rack' },
  { value: 'display_case', label: 'Display Case' },
  { value: 'walk_in',      label: 'Walk-In Cooler/Freezer' },
  { value: 'hvac',         label: 'HVAC Unit' },
  { value: 'condenser',    label: 'Condenser Unit' },
  { value: 'other',        label: 'Other' },
]

const TYPE_META: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  rack:         { bg: 'bg-blue-50',    text: 'text-blue-600',   icon: <RefrigeratorIcon size={16}/> },
  display_case: { bg: 'bg-cyan-50',    text: 'text-cyan-600',   icon: <RefrigeratorIcon size={16}/> },
  walk_in:      { bg: 'bg-indigo-50',  text: 'text-indigo-600', icon: <RefrigeratorIcon size={16}/> },
  hvac:         { bg: 'bg-emerald-50', text: 'text-emerald-600',icon: <Wind size={16}/> },
  condenser:    { bg: 'bg-violet-50',  text: 'text-violet-600', icon: <Thermometer size={16}/> },
  other:        { bg: 'bg-slate-100',  text: 'text-slate-500',  icon: <Package size={16}/> },
}

const STATUS_COLORS: Record<string, string> = {
  OK:      'bg-green-500',
  WARNING: 'bg-amber-400',
  ALARM:   'bg-red-500',
  OFFLINE: 'bg-slate-400',
  UNKNOWN: 'bg-slate-300',
}

const REFRIGERANTS = ['R-404A','R-448A','R-449A','R-407A','R-407F','R-22','R-410A','R-134a','R-290','R-717','R-744','Other']

function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' })
}

// ── Component ─────────────────────────────────────────────────────────────

export default function StoreDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [store, setStore] = useState<StoreDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  // Edit store
  const [editField, setEditField] = useState<string | null>(null)
  const [editVal, setEditVal] = useState('')
  const [saving, setSaving] = useState(false)

  // Add equipment modal
  const [showAddEquip, setShowAddEquip] = useState(false)
  const [equipForm, setEquipForm] = useState<AddEquipForm>(EMPTY_EQUIP)
  const [addingEquip, setAddingEquip] = useState(false)

  useEffect(() => {
    async function init() {
      const supabase = getSupabaseBrowser()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: profileData } = await supabase.from('users').select('role').eq('id', user.id).single()
      const profileRole = (profileData as { role?: string } | null)?.role
      setIsAdmin(profileRole === 'admin' || profileRole === 'manager')

      const res = await fetch(`/api/stores/${id}`)
      if (res.ok) setStore(await res.json())
      setLoading(false)
    }
    init()
  }, [id, router])

  async function saveField(field: string, value: string) {
    setSaving(true)
    const body: Record<string, string> = { [field]: value }
    const res = await fetch(`/api/stores/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      const updated = await res.json()
      setStore(prev => prev ? { ...prev, ...updated } : prev)
    }
    setEditField(null)
    setSaving(false)
  }

  async function handleAddEquip() {
    if (!equipForm.name.trim() || !store) return
    setAddingEquip(true)
    const res = await fetch('/api/equipment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeId: id, ...equipForm }),
    })
    if (res.ok) {
      const created = await res.json()
      setStore(prev => prev ? { ...prev, equipment: [...prev.equipment, created] } : prev)
      setEquipForm(EMPTY_EQUIP)
      setShowAddEquip(false)
    }
    setAddingEquip(false)
  }

  // Group equipment by type
  const grouped = store?.equipment.reduce((acc, eq) => {
    const t = eq.equipment_type ?? 'other'
    if (!acc[t]) acc[t] = []
    acc[t].push(eq)
    return acc
  }, {} as Record<string, EquipmentRow[]>)

  const typeOrder = ['rack', 'display_case', 'walk_in', 'hvac', 'condenser', 'other']

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-slate-50 flex items-center justify-center text-slate-400 text-sm">
        Loading…
      </div>
    )
  }

  if (!store) {
    return (
      <div className="min-h-[100dvh] bg-slate-50 flex items-center justify-center text-slate-400 text-sm">
        Site not found.
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button
          onClick={() => router.push('/dashboard')}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
          title="Dashboard"
        >
          <Home size={18} />
        </button>
        <button
          onClick={() => router.push('/stores')}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
          title="All sites"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-semibold text-slate-900 truncate">{store.name}</h1>
          <p className="text-xs text-slate-500">{store.equipment.length} unit{store.equipment.length !== 1 ? 's' : ''}</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowAddEquip(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={13} /> Add unit
          </button>
        )}
      </div>

      <div className="px-4 py-4 max-w-2xl mx-auto flex flex-col gap-4">

        {/* Site info card */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Building2 size={20} className="text-blue-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">{store.name}</p>
              <p className="text-xs text-slate-400">Site profile</p>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {/* Name */}
            <EditableRow
              label="Site name" icon={<Building2 size={13}/>} value={store.name}
              isAdmin={isAdmin} fieldKey="name"
              editField={editField} editVal={editVal} saving={saving}
              onEdit={(k, v) => { setEditField(k); setEditVal(v) }}
              onSave={saveField} onCancel={() => setEditField(null)}
              onEditValChange={setEditVal}
              placeholder="Site name"
            />
            {/* Address */}
            <EditableRow
              label="Address" icon={<MapPin size={13}/>} value={store.address}
              isAdmin={isAdmin} fieldKey="address"
              editField={editField} editVal={editVal} saving={saving}
              onEdit={(k, v) => { setEditField(k); setEditVal(v) }}
              onSave={saveField} onCancel={() => setEditField(null)}
              onEditValChange={setEditVal}
              placeholder="Enter address"
            />
            {/* Contact */}
            <EditableRow
              label="Contact" icon={<User size={13}/>} value={store.contact_name}
              isAdmin={isAdmin} fieldKey="contactName"
              editField={editField} editVal={editVal} saving={saving}
              onEdit={(k, v) => { setEditField(k); setEditVal(v) }}
              onSave={saveField} onCancel={() => setEditField(null)}
              onEditValChange={setEditVal}
              placeholder="Store manager name"
            />
            {/* Phone */}
            <EditableRow
              label="Phone" icon={<Phone size={13}/>} value={store.phone}
              isAdmin={isAdmin} fieldKey="phone"
              editField={editField} editVal={editVal} saving={saving}
              onEdit={(k, v) => { setEditField(k); setEditVal(v) }}
              onSave={saveField} onCancel={() => setEditField(null)}
              onEditValChange={setEditVal}
              placeholder="Contact number"
            />
          </div>

          {/* Trending issues */}
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <AlertTriangle size={13} className="text-amber-500" />
                Trending issues
              </div>
              {isAdmin && editField !== 'trendingIssues' && (
                <button
                  onClick={() => { setEditField('trendingIssues'); setEditVal(store.trending_issues ?? '') }}
                  className="p-1 rounded-md hover:bg-slate-100 text-slate-400"
                >
                  <Pencil size={12} />
                </button>
              )}
            </div>
            {editField === 'trendingIssues' ? (
              <div className="flex flex-col gap-2">
                <textarea
                  value={editVal}
                  onChange={e => setEditVal(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-blue-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                  placeholder="Known recurring issues…"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => saveField('trendingIssues', editVal)}
                    disabled={saving}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Check size={12} /> Save
                  </button>
                  <button onClick={() => setEditField(null)} className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 rounded-lg">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className={`text-sm ${store.trending_issues ? 'text-amber-700 bg-amber-50 px-3 py-2 rounded-xl' : 'text-slate-400 italic'}`}>
                {store.trending_issues || 'No trending issues noted'}
              </p>
            )}
          </div>
        </div>

        {/* Equipment grouped by type */}
        {typeOrder.map(type => {
          const items = grouped?.[type]
          if (!items?.length) return null
          const meta = TYPE_META[type] ?? TYPE_META.other
          const typeLabel = EQUIP_TYPES.find(t => t.value === type)?.label ?? type
          return (
            <div key={type}>
              <div className="flex items-center gap-2 mb-2 px-1">
                <div className={`w-6 h-6 rounded-lg ${meta.bg} flex items-center justify-center ${meta.text}`}>
                  {meta.icon}
                </div>
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">{typeLabel}</p>
                <span className="text-xs text-slate-400">({items.length})</span>
              </div>
              <div className="flex flex-col gap-2">
                {items.map(eq => (
                  <button
                    key={eq.id}
                    onClick={() => router.push(`/equipment/${eq.id}`)}
                    className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-left hover:border-slate-300 hover:shadow-sm transition-all flex items-center gap-3"
                  >
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_COLORS[eq.status] ?? 'bg-slate-300'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{eq.name}</p>
                      <p className="text-xs text-slate-500 truncate">
                        {[eq.manufacturer, eq.model].filter(Boolean).join(' · ')}
                        {eq.refrigerant ? ` · ${eq.refrigerant}` : ''}
                        {eq.location ? ` · ${eq.location}` : ''}
                      </p>
                    </div>
                    <ChevronRight size={14} className="text-slate-400 flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )
        })}

        {store.equipment.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-slate-400 bg-white border border-dashed border-slate-200 rounded-2xl">
            <Package size={28} className="mb-2 opacity-30" />
            <p className="text-sm">No equipment added yet</p>
            {isAdmin && (
              <button
                onClick={() => setShowAddEquip(true)}
                className="mt-3 flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700"
              >
                <Plus size={12} /> Add first unit
              </button>
            )}
          </div>
        )}

        {/* Recent PMs */}
        {store.recent_pms.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1">Recent PMs</p>
            <div className="flex flex-col gap-2">
              {store.recent_pms.map(pm => (
                <div key={pm.id} className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-3">
                  <Wrench size={14} className="text-slate-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-800 truncate">{pm.report_type ?? 'PM Report'}</p>
                    <p className="text-xs text-slate-400">{fmtDate(pm.performed_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add Equipment Modal */}
      {showAddEquip && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white w-full md:max-w-md rounded-t-3xl md:rounded-2xl max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <h2 className="text-base font-semibold text-slate-900">Add unit</h2>
              <button onClick={() => setShowAddEquip(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                <X size={16} />
              </button>
            </div>
            <div className="px-5 pb-6 flex flex-col gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Unit name *</label>
                <input
                  value={equipForm.name}
                  onChange={e => setEquipForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Rack A — Island Dairy"
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Equipment type</label>
                <select
                  value={equipForm.equipmentType}
                  onChange={e => setEquipForm(f => ({ ...f, equipmentType: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                >
                  {EQUIP_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Manufacturer</label>
                  <input
                    value={equipForm.manufacturer}
                    onChange={e => setEquipForm(f => ({ ...f, manufacturer: e.target.value }))}
                    placeholder="Copeland"
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Model</label>
                  <input
                    value={equipForm.model}
                    onChange={e => setEquipForm(f => ({ ...f, model: e.target.value }))}
                    placeholder="ZF34K4E-TFD"
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Serial #</label>
                  <input
                    value={equipForm.serialNumber}
                    onChange={e => setEquipForm(f => ({ ...f, serialNumber: e.target.value }))}
                    placeholder="SN-12345"
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Refrigerant</label>
                  <select
                    value={equipForm.refrigerant}
                    onChange={e => setEquipForm(f => ({ ...f, refrigerant: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                  >
                    <option value="">— select —</option>
                    {REFRIGERANTS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Install date</label>
                  <input
                    type="date"
                    value={equipForm.installedAt}
                    onChange={e => setEquipForm(f => ({ ...f, installedAt: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Location</label>
                  <input
                    value={equipForm.location}
                    onChange={e => setEquipForm(f => ({ ...f, location: e.target.value }))}
                    placeholder="Machine room"
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
                <textarea
                  value={equipForm.notes}
                  onChange={e => setEquipForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Any relevant notes…"
                  rows={2}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                />
              </div>
              <button
                onClick={handleAddEquip}
                disabled={addingEquip || !equipForm.name.trim()}
                className="mt-1 w-full py-3 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {addingEquip ? 'Saving…' : 'Add unit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

