'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Plus, X, Camera, Loader2 } from 'lucide-react'

interface Photo { url: string; label: string }

export default function IndividualReportPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const equipmentId = searchParams.get('equipmentId')
  const equipmentName = searchParams.get('equipmentName') ?? ''
  const editId = searchParams.get('id')
  const fileRef = useRef<HTMLInputElement>(null)

  const [storeName, setStoreName] = useState('')
  const [performedAt, setPerformedAt] = useState(new Date().toISOString().slice(0, 16))
  const [issueExplanation, setIssueExplanation] = useState('')
  const [stepsTaken, setStepsTaken] = useState('')
  const [whatsNext, setWhatsNext] = useState('')
  const [simproNumber, setSimproNumber] = useState('')
  const [parts, setParts] = useState<string[]>([])
  const [newPart, setNewPart] = useState('')
  const [photos, setPhotos] = useState<Photo[]>([])
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (editId) {
      fetch(`/api/individual-reports/${editId}`).then(r => r.json()).then(d => {
        setStoreName(d.store_name ?? '')
        setPerformedAt(d.performed_at ? d.performed_at.slice(0, 16) : new Date().toISOString().slice(0, 16))
        setIssueExplanation(d.issue_explanation ?? '')
        setStepsTaken(d.steps_taken ?? '')
        setWhatsNext(d.whats_next ?? '')
        setSimproNumber(d.simpro_number ?? '')
        setParts(d.parts_needed ?? [])
        setPhotos(d.photos ?? [])
      })
    }
  }, [editId])

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setUploading(true)
    for (const file of files) {
      const label = prompt(`Label for ${file.name}?`) ?? ''
      const fd = new FormData()
      fd.append('file', file)
      fd.append('label', label)
      const res = await fetch('/api/upload-report-photo', { method: 'POST', body: fd })
      if (res.ok) {
        const data = await res.json()
        setPhotos(prev => [...prev, { url: data.url, label: data.label }])
      }
    }
    setUploading(false)
    e.target.value = ''
  }

  async function handleSave() {
    if (!storeName.trim()) { setError('Store name is required'); return }
    setSaving(true); setError('')
    const payload = {
      equipment_id: equipmentId ?? null,
      store_name: storeName,
      performed_at: new Date(performedAt).toISOString(),
      issue_explanation: issueExplanation,
      steps_taken: stepsTaken,
      whats_next: whatsNext,
      simpro_number: simproNumber,
      parts_needed: parts,
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
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-slate-400 hover:text-slate-600"><ArrowLeft size={18}/></button>
          <div className="flex items-baseline gap-0.5">
            <span className="text-lg font-bold text-blue-600">Cold</span>
            <span className="text-lg font-bold text-slate-800">IQ</span>
          </div>
          <span className="text-slate-400">/</span>
          <span className="text-sm font-medium text-slate-700">Individual Report</span>
          {equipmentName && <><span className="text-slate-400">/</span><span className="text-sm text-slate-500">{equipmentName}</span></>}
        </div>
        <button
          onClick={handleSave}
          disabled={saving || saved}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
        >
          {saving && <Loader2 size={14} className="animate-spin"/>}
          {saved ? 'Saved ✓' : saving ? 'Saving…' : editId ? 'Update Report' : 'Save Report'}
        </button>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {error && <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}

        {/* Store Info */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-slate-800 mb-4">Job Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 md:col-span-1">
              <label className={labelCls}>Store / Site Name *</label>
              <input value={storeName} onChange={e => setStoreName(e.target.value)} className={inputCls} placeholder="e.g. Sobeys Bayers Lake" />
            </div>
            <div className="col-span-2 md:col-span-1">
              <label className={labelCls}>Date & Time</label>
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
            <label className={labelCls}>What's Next</label>
            <textarea value={whatsNext} onChange={e => setWhatsNext(e.target.value)} rows={2} className={inputCls} placeholder="Follow-up actions, parts to order, next visit…" />
          </div>
        </div>

        {/* Parts */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-slate-800 mb-4">Parts Needed</h2>
          <div className="flex gap-2 mb-3">
            <input value={newPart} onChange={e => setNewPart(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && newPart.trim()) { setParts(p => [...p, newPart.trim()]); setNewPart('') }}} className={`${inputCls} flex-1`} placeholder="Part name or number — press Enter to add" />
            <button onClick={() => { if (newPart.trim()) { setParts(p => [...p, newPart.trim()]); setNewPart('') }}} className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600">
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
        </div>

        {/* Photos */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-800">Photos</h2>
            <button onClick={() => fileRef.current?.click()} disabled={uploading} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 disabled:opacity-50">
              {uploading ? <Loader2 size={13} className="animate-spin"/> : <Camera size={13}/>}
              {uploading ? 'Uploading…' : 'Add Photos'}
            </button>
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} />
          </div>
          {photos.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">No photos yet — tap "Add Photos" to attach images</p>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {photos.map((p, i) => (
                <div key={i} className="relative group">
                  <img src={p.url} alt={p.label} className="w-full h-28 object-cover rounded-lg border border-slate-200" />
                  {p.label && <p className="text-[10px] text-slate-500 mt-1 truncate">{p.label}</p>}
                  <button onClick={() => setPhotos(ph => ph.filter((_, j) => j !== i))} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <X size={10}/>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
