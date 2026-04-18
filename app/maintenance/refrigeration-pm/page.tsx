'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Plus, X, Camera, Loader2, ChevronDown, ChevronUp } from 'lucide-react'

interface Photo { url: string; label: string }

interface RackUnit {
  id: string
  name: string
  type: 'rack' | 'conventional'
  refrigerant: string
  suctionPressure: string
  dischargePressure: string
  oilLevel: string
  oilPressure: string
  superheat: string
  subcooling: string
  suctionTemp: string
  dischargeTemp: string
  ambientTemp: string
  notes: string
}

const CHECKLIST_ITEMS = [
  { id: 'condenser_coil_cleaned', label: 'Condenser coil cleaned' },
  { id: 'evaporator_coil_checked', label: 'Evaporator coil checked / cleaned' },
  { id: 'condenser_fan_motors', label: 'Condenser fan motors & blades inspected' },
  { id: 'evaporator_fan_motors', label: 'Evaporator fan motors & blades inspected' },
  { id: 'electrical_connections', label: 'Electrical connections tightened' },
  { id: 'contactors_checked', label: 'Contactors & relays inspected' },
  { id: 'capacitors_checked', label: 'Capacitors tested / inspected' },
  { id: 'belts_checked', label: 'Belts & pulleys checked' },
  { id: 'refrigerant_leak_check', label: 'Refrigerant leak check performed' },
  { id: 'refrigerant_level', label: 'Refrigerant level / charge verified' },
  { id: 'oil_level_checked', label: 'Oil level checked' },
  { id: 'oil_separator', label: 'Oil separator / return checked' },
  { id: 'crankcase_heater', label: 'Crankcase heater operational' },
  { id: 'head_pressure_control', label: 'Head pressure control verified' },
  { id: 'low_pressure_control', label: 'Low pressure control verified' },
  { id: 'high_pressure_control', label: 'High pressure control / safety verified' },
  { id: 'defrost_system', label: 'Defrost system / timers checked' },
  { id: 'defrost_heaters', label: 'Defrost heaters & termination sensors checked' },
  { id: 'door_gaskets', label: 'Door gaskets inspected' },
  { id: 'door_closers', label: 'Door closers & hinges inspected' },
  { id: 'case_lighting', label: 'Case lighting inspected' },
  { id: 'drain_pans', label: 'Drain pans & drain lines cleared' },
  { id: 'temperature_verified', label: 'Case/box temperatures verified & logged' },
  { id: 'thermostat_calibrated', label: 'Thermostat / controller calibrated' },
  { id: 'expansion_valve', label: 'Expansion valve(s) checked' },
  { id: 'filter_drier', label: 'Filter drier condition checked' },
  { id: 'sight_glass', label: 'Sight glass condition checked' },
  { id: 'vibration_isolators', label: 'Vibration isolators / mounts checked' },
  { id: 'service_valves', label: 'Service valves opened / operational' },
  { id: 'rack_controller', label: 'Rack controller / energy management checked' },
  { id: 'alarm_setpoints', label: 'Alarm setpoints verified' },
  { id: 'general_cleaning', label: 'General cleaning completed' },
]

type CheckState = 'pass' | 'fail' | 'na' | ''

function newUnit(type: 'rack' | 'conventional'): RackUnit {
  return {
    id: crypto.randomUUID(),
    name: type === 'rack' ? 'Rack 1' : 'Unit 1',
    type,
    refrigerant: 'R-404A',
    suctionPressure: '',
    dischargePressure: '',
    oilLevel: '',
    oilPressure: '',
    superheat: '',
    subcooling: '',
    suctionTemp: '',
    dischargeTemp: '',
    ambientTemp: '',
    notes: '',
  }
}

function RefrigerationPMContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const equipmentId = searchParams.get('equipmentId')
  const equipmentName = searchParams.get('equipmentName') ?? ''
  const editId = searchParams.get('id')
  const fileRef = useRef<HTMLInputElement>(null)

  const [storeName, setStoreName] = useState('')
  const [performedAt, setPerformedAt] = useState(new Date().toISOString().slice(0, 16))
  const [pmSeason, setPmSeason] = useState<'spring' | 'fall' | ''>('')
  const [simproNumber, setSimproNumber] = useState('')
  const [units, setUnits] = useState<RackUnit[]>([newUnit('rack')])
  const [activeUnit, setActiveUnit] = useState(0)
  const [checklist, setChecklist] = useState<Record<string, CheckState>>({})
  const [notes, setNotes] = useState('')
  const [photos, setPhotos] = useState<Photo[]>([])
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [checklistOpen, setChecklistOpen] = useState(true)

  useEffect(() => {
    if (editId) {
      fetch(`/api/pm-reports/${editId}`).then(r => r.json()).then(d => {
        setStoreName(d.store_name ?? '')
        setPerformedAt(d.performed_at ? d.performed_at.slice(0, 16) : new Date().toISOString().slice(0, 16))
        setPmSeason(d.pm_season ?? '')
        setSimproNumber(d.simpro_number ?? '')
        setUnits(d.units?.length ? d.units : [newUnit('rack')])
        setChecklist(d.checklist ?? {})
        setNotes(d.notes ?? '')
        setPhotos(d.photos ?? [])
      })
    }
  }, [editId])

  function updateUnit(id: string, field: keyof RackUnit, value: string) {
    setUnits(prev => prev.map(u => u.id === id ? { ...u, [field]: value } : u))
  }

  function addUnit(type: 'rack' | 'conventional') {
    const count = units.filter(u => u.type === type).length + 1
    const unit = newUnit(type)
    unit.name = type === 'rack' ? `Rack ${count}` : `Unit ${count}`
    setUnits(prev => [...prev, unit])
    setActiveUnit(units.length)
  }

  function removeUnit(id: string) {
    if (units.length === 1) return
    const idx = units.findIndex(u => u.id === id)
    setUnits(prev => prev.filter(u => u.id !== id))
    setActiveUnit(Math.max(0, idx - 1))
  }

  function setCheck(id: string, val: CheckState) {
    setChecklist(prev => ({ ...prev, [id]: val }))
  }

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
      report_type: 'refrigeration',
      store_name: storeName,
      pm_season: pmSeason || null,
      performed_at: new Date(performedAt).toISOString(),
      simpro_number: simproNumber,
      checklist,
      units,
      notes,
      photos,
    }
    const url = editId ? `/api/pm-reports/${editId}` : '/api/pm-reports'
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
  const activeU = units[activeUnit]

  const passCount = Object.values(checklist).filter(v => v === 'pass').length
  const failCount = Object.values(checklist).filter(v => v === 'fail').length

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
          <span className="text-sm font-medium text-slate-700">Refrigeration PM</span>
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

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {error && <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}

        {/* Job Details */}
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
              <label className={labelCls}>PM Season</label>
              <select value={pmSeason} onChange={e => setPmSeason(e.target.value as 'spring' | 'fall' | '')} className={inputCls}>
                <option value="">— Select —</option>
                <option value="spring">Spring</option>
                <option value="fall">Fall</option>
              </select>
            </div>
            <div className="col-span-2 md:col-span-1">
              <label className={labelCls}>Simpro # (optional)</label>
              <input value={simproNumber} onChange={e => setSimproNumber(e.target.value)} className={inputCls} placeholder="Job number" />
            </div>
          </div>
        </div>

        {/* Units */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-800">Equipment Readings</h2>
            <div className="flex gap-2">
              <button onClick={() => addUnit('rack')} className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 font-medium">
                <Plus size={12}/> Rack
              </button>
              <button onClick={() => addUnit('conventional')} className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium">
                <Plus size={12}/> Conv. Unit
              </button>
            </div>
          </div>

          {/* Unit tabs */}
          <div className="flex gap-1.5 mb-5 flex-wrap">
            {units.map((u, i) => (
              <button
                key={u.id}
                onClick={() => setActiveUnit(i)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${activeUnit === i ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${u.type === 'rack' ? 'bg-blue-400' : 'bg-emerald-400'} ${activeUnit === i ? 'bg-white/60' : ''}`}/>
                {u.name}
                {units.length > 1 && (
                  <span onClick={ev => { ev.stopPropagation(); removeUnit(u.id) }} className="ml-0.5 opacity-60 hover:opacity-100">
                    <X size={10}/>
                  </span>
                )}
              </button>
            ))}
          </div>

          {activeU && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Unit Name</label>
                  <input value={activeU.name} onChange={e => updateUnit(activeU.id, 'name', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Refrigerant Type</label>
                  <select value={activeU.refrigerant} onChange={e => updateUnit(activeU.id, 'refrigerant', e.target.value)} className={inputCls}>
                    {['R-404A','R-22','R-407A','R-407C','R-410A','R-448A','R-449A','R-452A','R-134a','R-290','R-744 (CO₂)','Other'].map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { field: 'suctionPressure', label: 'Suction Pressure (PSI)' },
                  { field: 'dischargePressure', label: 'Discharge Pressure (PSI)' },
                  { field: 'oilLevel', label: 'Oil Level' },
                  { field: 'oilPressure', label: 'Oil Pressure (PSI)' },
                  { field: 'superheat', label: 'Superheat (°F)' },
                  { field: 'subcooling', label: 'Subcooling (°F)' },
                  { field: 'suctionTemp', label: 'Suction Temp (°F)' },
                  { field: 'dischargeTemp', label: 'Discharge Temp (°F)' },
                  { field: 'ambientTemp', label: 'Ambient Temp (°F)' },
                ].map(({ field, label }) => (
                  <div key={field}>
                    <label className={labelCls}>{label}</label>
                    <input
                      value={(activeU as unknown as Record<string, string>)[field]}
                      onChange={e => updateUnit(activeU.id, field as keyof RackUnit, e.target.value)}
                      className={inputCls}
                      placeholder="—"
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className={labelCls}>Unit Notes</label>
                <textarea value={activeU.notes} onChange={e => updateUnit(activeU.id, 'notes', e.target.value)} rows={2} className={inputCls} placeholder="Issues, observations for this unit…" />
              </div>
            </div>
          )}
        </div>

        {/* Checklist */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <button
            onClick={() => setChecklistOpen(o => !o)}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-semibold text-slate-800">PM Checklist</h2>
              <div className="flex gap-1.5">
                {passCount > 0 && <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">{passCount} Pass</span>}
                {failCount > 0 && <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-medium">{failCount} Fail</span>}
              </div>
            </div>
            {checklistOpen ? <ChevronUp size={16} className="text-slate-400"/> : <ChevronDown size={16} className="text-slate-400"/>}
          </button>

          {checklistOpen && (
            <div className="border-t border-slate-100">
              {/* Legend */}
              <div className="flex items-center gap-4 px-6 py-3 bg-slate-50 text-xs text-slate-500 border-b border-slate-100">
                <span className="flex items-center gap-1.5"><span className="w-5 h-5 rounded bg-green-100 border border-green-300 flex items-center justify-center text-green-700 font-bold text-[10px]">P</span> Pass</span>
                <span className="flex items-center gap-1.5"><span className="w-5 h-5 rounded bg-red-100 border border-red-300 flex items-center justify-center text-red-700 font-bold text-[10px]">F</span> Fail</span>
                <span className="flex items-center gap-1.5"><span className="w-5 h-5 rounded bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-500 font-bold text-[10px]">N/A</span> N/A</span>
              </div>
              <div className="divide-y divide-slate-50">
                {CHECKLIST_ITEMS.map(item => {
                  const val = checklist[item.id] ?? ''
                  return (
                    <div key={item.id} className="flex items-center justify-between px-6 py-3 hover:bg-slate-50">
                      <span className="text-sm text-slate-700">{item.label}</span>
                      <div className="flex gap-1.5 flex-shrink-0 ml-4">
                        {(['pass', 'fail', 'na'] as const).map(opt => (
                          <button
                            key={opt}
                            onClick={() => setCheck(item.id, val === opt ? '' : opt)}
                            className={`w-9 h-7 rounded text-[11px] font-semibold border transition-colors ${
                              val === opt
                                ? opt === 'pass' ? 'bg-green-500 border-green-500 text-white'
                                  : opt === 'fail' ? 'bg-red-500 border-red-500 text-white'
                                  : 'bg-slate-500 border-slate-500 text-white'
                                : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                            }`}
                          >
                            {opt === 'pass' ? 'P' : opt === 'fail' ? 'F' : 'N/A'}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-slate-800 mb-3">General Notes</h2>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4} className={inputCls} placeholder="Overall observations, recommendations, parts to order…" />
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

export default function RefrigerationPMPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center text-sm text-slate-400">Loading…</div>}>
      <RefrigerationPMContent />
    </Suspense>
  )
}
