'use client'
import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  onClose: () => void
  onCreated: () => void
}

const REFRIGERANTS = ['R-448A','R-449A','R-404A','R-507A','R-134a','R-290','R-744','R-22']

export default function AddEquipmentModal({ onClose, onCreated }: Props) {
  const [form, setForm]   = useState({ name:'', manufacturer:'', model:'', serial_number:'', refrigerant:'R-448A', location:'' })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.manufacturer || !form.model) { setError('Name, manufacturer and model are required'); return }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/equipment', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(form) })
      if (!res.ok) throw new Error(await res.text())
      onCreated()
      onClose()
    } catch (err: any) {
      setError(err.message ?? 'Failed to create')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="text-sm font-semibold text-slate-800">Add equipment</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg transition-colors"><X size={16}/></button>
        </div>

        <form onSubmit={submit} className="px-5 py-4 space-y-3">
          {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

          {[
            { k:'name',          label:'Unit name *',     placeholder:'e.g. Dairy Run — Aisle 3' },
            { k:'manufacturer',  label:'Manufacturer *',  placeholder:'e.g. Hussmann' },
            { k:'model',         label:'Model *',         placeholder:'e.g. P5-4-SSWL' },
            { k:'serial_number', label:'Serial number',   placeholder:'Optional' },
            { k:'location',      label:'Location',        placeholder:'e.g. Aisle 3' },
          ].map(({ k, label, placeholder }) => (
            <div key={k}>
              <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
              <input
                value={(form as any)[k]}
                onChange={e => set(k, e.target.value)}
                placeholder={placeholder}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          ))}

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Refrigerant</label>
            <select
              value={form.refrigerant}
              onChange={e => set('refrigerant', e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {REFRIGERANTS.map(r => <option key={r}>{r}</option>)}
            </select>
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border border-slate-300 text-sm text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
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
