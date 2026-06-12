'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Plus, X, Loader2, Home } from 'lucide-react'
import PhotoUploadGrid, { type UploadPhoto } from '@/components/PhotoUploadGrid'

type Photo = UploadPhoto
interface EquipmentInfo {
  name: string
  manufacturer: string | null
  model: string | null
  refrigerant: string | null
  specs: { label: string; value: string }[] | null
  stores: { name: string; address: string } | null
}

/** Returns the current local time in the format datetime-local inputs expect (YYYY-MM-DDTHH:mm) */
function toLocalISO(date = new Date()) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function IndividualReportContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const equipmentId = searchParams.get('equipmentId')
  const equipmentName = searchParams.get('equipmentName') ?? ''
  const editId = searchParams.get('id')

  const [storeName, setStoreName] = useState('')
  // Initialise with LOCAL time so the datetime-local input shows the correct current time
  const [performedAt, setPerformedAt] = useState(() => toLocalISO())
  const [issueExplanation, setIssueExplanation] = useState('')
  const [stepsTaken, setStepsTaken] = useState('')
  const [whatsNext, setWhatsNext] = useState('')
  const [simproNumber, setSimproNumber] = useState('')
  const [parts, setParts] = useState<string[]>([])
  const [newPart, setNewPart] = useState('')
  const [photos, setPhotos] = useState<Photo[]>([])
  const [equipment, setEquipment] = useState<EquipmentInfo | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!equipmentId) return
    fetch(`/api/equipment/${equipmentId}`).then(r => r.json()).then(d => {
      if (!d?.id) return
      setEquipment({ name: d.name, manufacturer: d.manufacturer, model: d.model, refrigerant: d.refrigerant, specs: d.specs, stores: d.stores })
      // Auto-fill the store from the linked equipment's site — only when creating fresh (don't clobber an edited report's saved value)
      if (!editId && d.stores?.name) setStoreName(d.stores.name)
    })
  }, [equipmentId, editId])

  useEffect(() => {
    if (editId) {
      fetch(`/api/individual-reports/${editId}`).then(r => r.json()).then(d => {
        setStoreName(d.store_name ?? '')
        // Convert the stored UTC timestamp to local time for the input
        setPerformedAt(d.performed_at ? toLocalISO(new Date(d.performed_at)) : toLocalISO())
        setIssueExplanation(d.issue_explanation ?? '')
        setStepsTaken(d.steps_taken ?? '')
        setWhatsNext(d.whats_next ?? '')
        setSimproNumber(d.simpro_number ?? '')
        setParts(d.parts_needed ?? [])
        setPhotos(d.photos ?? [])
      })
    }
  }, [editId])

  async function handleSave() {
    if (!storeName.trim()) { setError('Store name is required'); return }

    // Auto-commit any part that was typed but not yet pressed Enter / +
    const finalParts = newPart.trim() ? [...parts, newPart.trim()] : parts

    setSaving(true); setError('')
    const payload = {
      equipment_id: equipmentId ?? null,
      store_name: storeName,
      // The datetime-local value is local time — new Date() parses it as local → .toISOString() gives correct UTC
      performed_at: new Date(performedAt).toISOString(),
      issue_explanation: issueExplanation,
      steps_taken: stepsTaken,
      whats_next: whatsNext,
      simpro_number: simproNumber,
      parts_needed: finalParts,
      photos,
    }
    const url = editId ? `/api/individual-reports/${editId}` : '/api/individual-reports'
    const method = editId ? 'PATCH' : 'POST'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    setSaving(false)
    if (res.ok) {
      setSaved(true)
      setTimeout(() => router.push(`/maintenance?equipmentId=${equipmentId ?? ''}&equipmentName=${equipmentName}`), 1200)
    } else {
      const d = await res.json()
      setError(d.error ?? 'Failed to save')
    }
  }

  const inputCls = 'w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white'
  const labelCls = 'block text-xs font-medium text-slate-700 mb-1'

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="safe-top bg-white border-b border-slate-200 px-4 md:px-6 py-3 md:py-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={() => router.push('/dashboard')} className="text-slate-400 hover:text-slate-600 flex-shrink-0" title="Dashboard"><Home size={18}/></button>
          <button onClick={() => router.back()} className="text-slate-400 hover:text-slate-600 flex-shrink-0"><ArrowLeft size={18}/></button>
          <div className="flex items-baseline gap-0.5 flex-shrink-0">
            <span className="text-lg font-bold text-blue-600">Cold</span>
            <span className="text-lg font-bold text-slate-800">IQ</span>
          </div>
          <span className="text-slate-400 flex-shrink-0">/</span>
          <span className="text-sm font-medium text-slate-700 truncate">Individual Report{equipmentName ? ` · ${equipmentName}` : ''}</span>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || saved}
          className="px-3 md:px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 flex-shrink-0"
        >
          {saving && <Loader2 size={14} className="animate-spin"/>}
          {saved ? '✓' : saving ? '…' : <><span className="hidden sm:inline">{editId ? 'Update' : 'Save'} Report</span><span className="sm:hidden">Save</span></>}
        </button>
      </div>

      <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6">
        {error && <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}

        {/* Reporting on this equipment — pulled from the linked case/system record */}
        {equipment && (
          <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-6">
            <h2 className="text-sm font-semibold text-slate-800 mb-3">Reporting On</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 mb-3">
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Unit</p>
                <p className="text-sm text-slate-800">{equipment.name}</p>
              </div>
              {equipment.manufacturer && (
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Manufacturer</p>
                  <p className="text-sm text-slate-800">{equipment.manufacturer}</p>
                </div>
              )}
              {equipment.model && (
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Model</p>
                  <p className="text-sm text-slate-800">{equipment.model}</p>
                </div>
              )}
              {equipment.refrigerant && (
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Refrigerant</p>
                  <p className="text-sm text-slate-800">{equipment.refrigerant}</p>
                </div>
              )}
            </div>
            {equipment.specs && equipment.specs.length > 0 && (
              <div className="rounded-xl border border-slate-100 overflow-hidden divide-y divide-slate-100">
                {equipment.specs.map((s, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2 odd:bg-slate-50/60">
                    <span className="text-xs text-slate-500 flex-1">{s.label}</span>
                    <span className="text-xs font-medium text-slate-700 text-right">{s.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Store Info */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-6">
          <h2 className="text-sm font-semibold text-slate-800 mb-4">Job Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="col-span-2 md:col-span-1">
              <label className={labelCls}>Store / Site Name *</label>
              <input value={storeName} onChange={e => setStoreName(e.target.value)} className={inputCls} placeholder="e.g. Sobeys Bayers Lake" />
            </div>
            <div className="col-span-2 md:col-span-1">
              <label className={labelCls}>Date &amp; Time</label>
              <input type="datetime-local" value={performedAt} onChange={e => setPerformedAt(e.target.value)} className={inputCls} />
            </div>
            <div className="col-span-2 md:col-span-1">
              <label className={labelCls}>Simpro # (optional)</label>
              <input value={simproNumber} onChange={e => setSimproNumber(e.target.value)} className={inputCls} placeholder="Job number" />
            </div>
          </div>
        </div>

        {/* Issue */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-800">Report Details</h2>
          <div>
            <label className={labelCls}>Issue / Complaint</label>
            <textarea value={issueExplanation} onChange={e => setIssueExplanation(e.target.value)} rows={3} className={inputCls} placeholder="Describe the issue or reason for the call…" />
          </div>
          <div>
            <label className={labelCls}>Steps Taken</label>
            <textarea value={stepsTaken} onChange={e => setStepsTaken(e.target.value)} rows={4} className={inputCls} placeholder="What was done on site…" />
          </div>
          <div>
            <label className={labelCls}>What&apos;s Next</label>
            <textarea value={whatsNext} onChange={e => setWhatsNext(e.target.value)} rows={2} className={inputCls} placeholder="Follow-up actions, parts to order, next visit…" />
          </div>
        </div>

        {/* Parts */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-slate-800 mb-4">Parts Needed</h2>
          <div className="flex gap-2 mb-3">
            <input
              value={newPart}
              onChange={e => setNewPart(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && newPart.trim()) {
                  setParts(p => [...p, newPart.trim()])
                  setNewPart('')
                }
              }}
              className={`${inputCls} flex-1`}
              placeholder="Part name or number — press Enter or + to add"
            />
            <button
              onClick={() => { if (newPart.trim()) { setParts(p => [...p, newPart.trim()]); setNewPart('') }}}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600"
            >
              <Plus size={16}/>
            </button>
          </div>
          {parts.length > 0 && (
            <ul className="space-y-1.5">
              {parts.map((part, i) => (
                <li key={i} className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg text-sm text-slate-700">
                  <span>{part}</span>
                  <button onClick={() => setParts(p => p.filter((_, j) => j !== i))} className="text-slate-400 hover:text-red-500"><X size={14}/></button>
                </li>
              ))}
            </ul>
          )}
          {parts.length === 0 && !newPart && (
            <p className="text-xs text-slate-400">No parts added yet</p>
          )}
        </div>

        {/* Photos */}
        <PhotoUploadGrid photos={photos} onChange={setPhotos} />
      </div>
    </div>
  )
}

export default function IndividualReportPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center text-sm text-slate-400">Loading…</div>}>
      <IndividualReportContent />
    </Suspense>
  )
}
