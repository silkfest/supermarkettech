'use client'
import { useState, useEffect } from 'react'
import { X, Loader2 } from 'lucide-react'

interface Props {
  onClose: () => void
  onCreated: () => void
  /** Pre-set store — pass when opening from within a store page */
  storeId?: string
}

const REFRIGERANTS = ['R-404A','R-448A','R-449A','R-407A','R-407F','R-507A','R-22','R-410A','R-134a','R-290','R-717','R-744','Other']
const EQUIP_TYPES  = ['rack','case','condenser','rooftop','compressor','other']

export default function AddEquipmentModal({ onClose, onCreated, storeId: presetStoreId }: Props) {
  const [form, setForm] = useState({
    name: '', manufacturer: '', model: '',
    serial_number: '', refrigerant: 'R-448A',
    location: '', equipmentType: 'rack',
  })
  const [storeId,  setStoreId]  = useState(presetStoreId ?? '')
  const [stores,   setStores]   = useState<{ id: string; name: string }[]>([])
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  // Fetch stores for the site dropdown (skip if a storeId was pre-set)
  useEffect(() => {
    if (presetStoreId) return
    fetch('/api/stores')
      .then(r => r.ok ? r.json() : [])
      .then((data: { id: string; name: string }[]) => setStores(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [presetStoreId])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!storeId)            { setError('Please select a site');                        return }
    if (!form.name.trim())   { setError('Unit name is required');                        return }
    if (!form.manufacturer.trim() || !form.model.trim()) {
      setError('Manufacturer and model are required'); return
    }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/equipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId, ...form }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error ?? 'Failed to create equipment')
      }
      onCreated()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create')
    } finally {
      setSaving(false)
    }
  }

  const inp = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
  const lbl = 'block text-xs font-medium text-slate-600 mb-1'

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 sticky top-0 bg-white">
          <h2 className="text-sm font-semibold text-slate-800">Add equipment</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg transition-colors"><X size={16}/></button>
        </div>

        <form onSubmit={submit} className="px-5 py-4 space-y-3">
          {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

          {/* Site selector — hidden if storeId was pre-set */}
          {!presetStoreId && (
            <div>
              <label className={lbl}>Site *</label>
              <select
                value={storeId}
                onChange={e => setStoreId(e.target.value)}
                className={inp}
                required
              >
                <option value="">Select a site…</option>
                {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              {stores.length === 0 && (
                <p className="text-[10px] text-slate-400 mt-1">
                  No sites found — <a href="/stores" className="underline text-blue-500">create a site first</a>.
                </p>
              )}
            </div>
          )}

          {/* Equipment type */}
          <div>
            <label className={lbl}>Equipment type</label>
            <select value={form.equipmentType} onChange={e => set('equipmentType', e.target.value)} className={inp}>
              {EQUIP_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </div>

          {/* Text fields */}
          {[
            { k: 'name',          label: 'Unit name *',    placeholder: 'e.g. Dairy Run — Aisle 3' },
            { k: 'manufacturer',  label: 'Manufacturer *', placeholder: 'e.g. Hussmann' },
            { k: 'model',         label: 'Model *',        placeholder: 'e.g. P5-4-SSWL' },
            { k: 'serial_number', label: 'Serial number',  placeholder: 'Optional' },
            { k: 'location',      label: 'Location',       placeholder: 'e.g. Aisle 3, back wall' },
          ].map(({ k, label, placeholder }) => (
            <div key={k}>
              <label className={lbl}>{label}</label>
              <input
                value={(form as Record<string, string>)[k]}
                onChange={e => set(k, e.target.value)}
                placeholder={placeholder}
                className={inp}
              />
            </div>
          ))}

          {/* Refrigerant */}
          <div>
            <label className={lbl}>Refrigerant</label>
            <select value={form.refrigerant} onChange={e => set('refrigerant', e.target.value)} className={inp}>
              {REFRIGERANTS.map(r => <option key={r}>{r}</option>)}
            </select>
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border border-slate-300 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
              {saving && <Loader2 size={14} className="animate-spin"/>}
              {saving ? 'Saving…' : 'Add equipment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
