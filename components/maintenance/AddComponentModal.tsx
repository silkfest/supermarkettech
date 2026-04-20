'use client'
import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'

const COMPONENT_TYPES = [
  'Compressor', 'Condenser Unit', 'Rack Controller', 'EEV Board',
  'Oil Separator', 'Receiver', 'Head Pressure Controller', 'Defrost Board', 'Other',
]

const inputCls = 'w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white'
const labelCls = 'block text-xs font-medium text-slate-600 mb-1'

interface Props {
  onClose: () => void
  onAdded: () => void
}

export default function AddComponentModal({ onClose, onAdded }: Props) {
  const [form, setForm] = useState({
    type: 'Compressor',
    manufacturer: '',
    model: '',
    serial: '',
    storeName: '',
    rackLabel: '',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const set = (field: string, value: string) =>
    setForm(f => ({ ...f, [field]: value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.type) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/components', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to add component')
      onAdded()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add component')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-800">Add Component</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Type */}
          <div>
            <label className={labelCls}>Component Type *</label>
            <select
              value={form.type}
              onChange={e => set('type', e.target.value)}
              className={inputCls}
              required
            >
              {COMPONENT_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>

          {/* Manufacturer + Model */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Manufacturer</label>
              <input
                value={form.manufacturer}
                onChange={e => set('manufacturer', e.target.value)}
                placeholder="e.g. Copeland"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Model</label>
              <input
                value={form.model}
                onChange={e => set('model', e.target.value)}
                placeholder="e.g. ZB45KCE"
                className={inputCls}
              />
            </div>
          </div>

          {/* Serial */}
          <div>
            <label className={labelCls}>Serial Number</label>
            <input
              value={form.serial}
              onChange={e => set('serial', e.target.value)}
              placeholder="e.g. 25A12345"
              className={inputCls}
            />
          </div>

          {/* Site */}
          <div>
            <label className={labelCls}>Site / Store Name</label>
            <input
              value={form.storeName}
              onChange={e => set('storeName', e.target.value)}
              placeholder="e.g. Store #42 – Main St"
              className={inputCls}
            />
          </div>

          {/* Rack label */}
          <div>
            <label className={labelCls}>Rack / Location <span className="text-slate-400 font-normal">(optional)</span></label>
            <input
              value={form.rackLabel}
              onChange={e => set('rackLabel', e.target.value)}
              placeholder="e.g. Rack A"
              className={inputCls}
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={busy || !form.type}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {busy ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : 'Add Component'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
