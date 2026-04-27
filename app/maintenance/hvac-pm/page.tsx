'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Plus, X, ChevronDown, Pencil, Loader2 } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type Season = 'FALL' | 'WINTER' | 'SPRING' | 'SUMMER' | ''
type EquipmentType = 'AIR_HANDLER' | 'MAIN_AC' | 'RTU' | 'EXHAUST_FAN' | 'UNIT_HEATER' | ''
type RefrigerantType = 'R-22' | 'R-410A' | 'R-407C' | 'R-134a' | ''
type VoltageType = '120/1/60' | '208/1/60' | '208/3/60' | '575/3/60' | ''
type Importance = 'CRITICAL' | 'IMPORTANT' | 'ROUTINE'

interface Equipment {
  id: string
  type: EquipmentType
  serviceArea: string
  brand: string
  modelNumber: string
  serialNumber: string
  refrigerantType: RefrigerantType
  voltage: VoltageType
}

interface Deficiency {
  id: string
  note: string
  equipmentIndex: number | null
  assetId: string
  importance: Importance
}

interface CheckItems {
  item1: boolean; item2: boolean; item3: boolean; item4: boolean
  item5: boolean; item6: boolean; item7: boolean; item8: boolean
  item9: boolean; item10: boolean; item11: boolean
}

const CHECKLIST_LABELS = [
  'Check all heating and A/C systems.',
  'Check all heat exchangers and chimney.',
  'Oil motors and grease fittings on all HVAC.',
  'Grease all fittings on air handler.',
  'Replace all filters.',
  'Check returns. (Visual)',
  'Check all controls for accuracy and proper operation.',
  'Check all sensors and thermostats for proper operation.',
  'Check condition of belts on air handler, HVAC and exhaust and change as needed.',
  'Check access door seals on all HVAC.',
  'Check drainpipes and condensation pans.',
]

const defaultCheckItems = (): CheckItems => ({
  item1: false, item2: false, item3: false, item4: false,
  item5: false, item6: false, item7: false, item8: false,
  item9: false, item10: false, item11: false,
})

const equipmentLabel = (type: EquipmentType, serviceArea?: string) => {
  switch (type) {
    case 'AIR_HANDLER': return 'Air Handler'
    case 'MAIN_AC': return 'Main AC'
    case 'RTU': return serviceArea ? `RTU ${serviceArea}` : 'RTU'
    case 'EXHAUST_FAN': return serviceArea ? `EF ${serviceArea}` : 'Exhaust Fan'
    case 'UNIT_HEATER': return serviceArea ? `UH ${serviceArea}` : 'Unit Heater'
    default: return ''
  }
}

const needsServiceArea = (t: EquipmentType) =>
  ['RTU', 'EXHAUST_FAN', 'UNIT_HEATER'].includes(t)

const importanceBadge = (imp: Importance) => {
  if (imp === 'CRITICAL') return 'text-red-600 bg-red-50 border-red-200'
  if (imp === 'IMPORTANT') return 'text-amber-600 bg-amber-50 border-amber-200'
  return 'text-emerald-600 bg-emerald-50 border-emerald-200'
}

// ─── Main Content ─────────────────────────────────────────────────────────────

function HvacPMContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const equipmentId = searchParams.get('equipmentId')
  const equipmentName = searchParams.get('equipmentName') ?? ''
  const editId = searchParams.get('id')

  // Store info
  const [storeName, setStoreName] = useState('')
  const [storeId, setStoreId] = useState<string | null>(null)
  const [sitesList, setSitesList] = useState<{ id: string; name: string; address: string }[]>([])
  const [storeAddress, setStoreAddress] = useState('')
  const [technician, setTechnician] = useState('')
  const [performedAt, setPerformedAt] = useState(new Date().toISOString().slice(0, 10))
  const [season, setSeason] = useState<Season>('')
  const [simproNumber, setSimproNumber] = useState('')

  // Equipment
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [collapsedEquipment, setCollapsedEquipment] = useState<Record<string, boolean>>({})
  const [showTypeModal, setShowTypeModal] = useState(false)
  const [pendingType, setPendingType] = useState<EquipmentType>('')
  const [serviceAreaInput, setServiceAreaInput] = useState('')
  const [showServiceAreaModal, setShowServiceAreaModal] = useState(false)

  // Deficiencies
  const [deficiencies, setDeficiencies] = useState<Deficiency[]>([])
  const [showDefModal, setShowDefModal] = useState(false)
  const [defNote, setDefNote] = useState('')
  const [defEquipIdx, setDefEquipIdx] = useState<number | null>(null)
  const [defAssetId, setDefAssetId] = useState('')
  const [defImportance, setDefImportance] = useState<Importance>('ROUTINE')
  const [editingDefId, setEditingDefId] = useState<string | null>(null)
  const [editDefNote, setEditDefNote] = useState('')
  const [editDefEquipIdx, setEditDefEquipIdx] = useState<number | null>(null)
  const [editDefAssetId, setEditDefAssetId] = useState('')
  const [editDefImportance, setEditDefImportance] = useState<Importance>('ROUTINE')

  // Checklist
  const [checkItems, setCheckItems] = useState<CheckItems>(defaultCheckItems())
  const [checklistOpen, setChecklistOpen] = useState(true)

  // Save state
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  // Fetch sites list for store picker
  useEffect(() => {
    fetch('/api/stores').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setSitesList(data)
    }).catch(() => {})
  }, [])

  // Load existing report
  useEffect(() => {
    if (!editId) return
    fetch(`/api/pm-reports/${editId}`).then(r => r.json()).then(d => {
      setStoreName(d.store_name ?? '')
      setStoreId(d.store_id ?? null)
      setSeason(d.pm_season ?? '')
      setSimproNumber(d.simpro_number ?? '')
      setPerformedAt(d.performed_at ? d.performed_at.slice(0, 10) : new Date().toISOString().slice(0, 10))
      if (d.checklist && typeof d.checklist === 'object') {
        setCheckItems({ ...defaultCheckItems(), ...d.checklist })
      }
      if (d.units && typeof d.units === 'object' && !Array.isArray(d.units)) {
        setStoreAddress(d.units.storeAddress ?? '')
        setTechnician(d.units.technician ?? '')
        if (Array.isArray(d.units.equipment)) setEquipment(d.units.equipment)
      }
      if (Array.isArray(d.notes)) setDeficiencies(d.notes)
    })
  }, [editId])

  // Equipment helpers
  const addEquipment = (type: EquipmentType, serviceArea = '') => {
    setEquipment(prev => [...prev, {
      id: crypto.randomUUID(), type, serviceArea,
      brand: '', modelNumber: '', serialNumber: '',
      refrigerantType: '', voltage: ''
    }])
  }

  const updateEquipment = (id: string, field: keyof Equipment, value: string) => {
    setEquipment(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e))
  }

  const removeEquipment = (id: string) => {
    const idx = equipment.findIndex(e => e.id === id)
    setDeficiencies(defs => defs.map(d => {
      if (d.equipmentIndex === null) return d
      if (d.equipmentIndex === idx) return { ...d, equipmentIndex: null }
      if (d.equipmentIndex > idx) return { ...d, equipmentIndex: d.equipmentIndex - 1 }
      return d
    }))
    setEquipment(prev => prev.filter(e => e.id !== id))
  }

  // Checklist helpers
  const toggleCheck = (key: keyof CheckItems) =>
    setCheckItems(prev => ({ ...prev, [key]: !prev[key] }))

  const selectAll = (val: boolean) => {
    const updates: Partial<CheckItems> = {}
    visibleItems.filter(i => !i.hidden).forEach(i => { updates[i.key] = val })
    setCheckItems(prev => ({ ...prev, ...updates }))
  }

  const visibleItems = CHECKLIST_LABELS.map((label, i) => ({
    label,
    key: `item${i + 1}` as keyof CheckItems,
    hidden: (season === 'WINTER' || season === 'SUMMER') && [1, 3, 5].includes(i),
  }))

  // Deficiency helpers
  const handleAddDeficiency = () => {
    if (!defNote.trim()) return
    setDeficiencies(prev => [...prev, {
      id: crypto.randomUUID(),
      note: defNote.trim(),
      equipmentIndex: defEquipIdx,
      assetId: defAssetId,
      importance: defImportance,
    }])
    setDefNote(''); setDefEquipIdx(null); setDefAssetId(''); setDefImportance('ROUTINE')
    setShowDefModal(false)
  }

  const openEditDef = (d: Deficiency) => {
    setEditingDefId(d.id); setEditDefNote(d.note)
    setEditDefEquipIdx(d.equipmentIndex); setEditDefAssetId(d.assetId)
    setEditDefImportance(d.importance)
  }

  const saveDefEdit = () => {
    setDeficiencies(prev => prev.map(d =>
      d.id === editingDefId
        ? { ...d, note: editDefNote, equipmentIndex: editDefEquipIdx, assetId: editDefAssetId, importance: editDefImportance }
        : d
    ))
    setEditingDefId(null)
  }

  // Save report
  const handleSave = async () => {
    if (!storeName.trim()) { setError('Store name is required'); return }
    setSaving(true); setError('')
    const payload = {
      equipment_id: equipmentId ?? null,
      report_type: 'hvac',
      store_name: storeName,
      store_id: storeId,
      pm_season: season || null,
      performed_at: new Date(performedAt).toISOString(),
      simpro_number: simproNumber || null,
      checklist: checkItems,
      units: { technician, storeAddress, equipment },
      notes: deficiencies,
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

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-slate-400 hover:text-slate-600"><ArrowLeft size={18} /></button>
          <div className="flex items-baseline gap-0.5">
            <span className="text-lg font-bold text-blue-600">Cold</span>
            <span className="text-lg font-bold text-slate-800">IQ</span>
          </div>
          <span className="text-slate-400">/</span>
          <span className="text-sm font-medium text-slate-700">HVAC PM</span>
          {equipmentName && <><span className="text-slate-400">/</span><span className="text-sm text-slate-500">{equipmentName}</span></>}
        </div>
        <button
          onClick={handleSave}
          disabled={saving || saved}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
        >
          {saving && <Loader2 size={14} className="animate-spin" />}
          {saved ? 'Saved ✓' : saving ? 'Saving…' : editId ? 'Update Report' : 'Save Report'}
        </button>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {error && <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}

        {/* ── Store Information ── */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
            <h2 className="text-sm font-semibold text-slate-800">Store Information</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Store / Site Name *</label>
              {sitesList.length > 0 ? (
                <>
                  <select
                    value={storeId ?? (storeName ? '__other__' : '')}
                    onChange={e => {
                      const val = e.target.value
                      if (val === '__other__') {
                        setStoreId(null)
                      } else if (val) {
                        const site = sitesList.find(s => s.id === val)
                        if (site) { setStoreId(site.id); setStoreName(site.name); setStoreAddress(site.address ?? '') }
                      } else {
                        setStoreId(null); setStoreName('')
                      }
                    }}
                    className={inputCls}
                  >
                    <option value="">Select site…</option>
                    {sitesList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    <option value="__other__">Other / custom</option>
                  </select>
                  {storeId === null && (
                    <input value={storeName} onChange={e => setStoreName(e.target.value)} className={`${inputCls} mt-1.5`} placeholder="Type site name…" />
                  )}
                </>
              ) : (
                <input value={storeName} onChange={e => setStoreName(e.target.value)} className={inputCls} placeholder="e.g. Sobeys Bayers Lake" />
              )}
            </div>
            <div>
              <label className={labelCls}>Store Address</label>
              <input value={storeAddress} onChange={e => setStoreAddress(e.target.value)} className={inputCls} placeholder="Street address" />
            </div>
            <div>
              <label className={labelCls}>Technician</label>
              <input value={technician} onChange={e => setTechnician(e.target.value)} className={inputCls} placeholder="Technician name" />
            </div>
            <div>
              <label className={labelCls}>Date</label>
              <input type="date" value={performedAt} onChange={e => setPerformedAt(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Season</label>
              <select value={season} onChange={e => setSeason(e.target.value as Season)} className={inputCls}>
                <option value="">Select Season</option>
                <option value="SPRING">Spring</option>
                <option value="SUMMER">Summer</option>
                <option value="FALL">Fall</option>
                <option value="WINTER">Winter</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Simpro # (optional)</label>
              <input value={simproNumber} onChange={e => setSimproNumber(e.target.value)} className={inputCls} placeholder="Job number" />
            </div>
          </div>
        </div>

        {/* ── Service Checklist ── */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <button
            onClick={() => setChecklistOpen(o => !o)}
            className="w-full px-6 py-4 flex items-center justify-between bg-slate-50 border-b border-slate-100 hover:bg-slate-100 transition-colors"
          >
            <h2 className="text-sm font-semibold text-slate-800">Service Checklist</h2>
            <ChevronDown size={16} className={`text-slate-400 transition-transform ${checklistOpen ? 'rotate-180' : ''}`} />
          </button>
          {checklistOpen && (
            <div className="p-6 space-y-3">
              <label className="flex items-center gap-2 pb-3 border-b border-slate-100 cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  onChange={e => selectAll(e.target.checked)}
                  checked={visibleItems.filter(i => !i.hidden).every(i => checkItems[i.key])}
                  readOnly={false}
                />
                <span className="text-sm font-medium text-slate-700">Select All</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {visibleItems.map(({ label, key, hidden }, i) => {
                  if (hidden) return null
                  return (
                    <label key={key} className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                        checked={checkItems[key]}
                        onChange={() => toggleCheck(key)}
                      />
                      <span className="text-sm text-slate-700">{i + 1}. {label}</span>
                    </label>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Equipment Data ── */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">Equipment Data</h2>
            <button
              onClick={() => setShowTypeModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-500 text-white rounded-lg hover:bg-emerald-600"
            >
              <Plus size={13} /> Add Equipment
            </button>
          </div>
          {equipment.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">No equipment added yet</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {equipment.map((eq, idx) => {
                const label = equipmentLabel(eq.type, eq.serviceArea) || `Equipment ${idx + 1}`
                const isOpen = !collapsedEquipment[eq.id]
                return (
                  <div key={eq.id}>
                    <button
                      onClick={() => setCollapsedEquipment(prev => ({ ...prev, [eq.id]: !prev[eq.id] }))}
                      className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors"
                    >
                      <span className="text-xs font-medium px-2 py-0.5 rounded bg-blue-100 text-blue-700">{label}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={e => { e.stopPropagation(); removeEquipment(eq.id) }}
                          className="text-slate-300 hover:text-red-500"
                        ><X size={14} /></button>
                        <ChevronDown size={14} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      </div>
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-5 pt-4 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-50">
                        <div>
                          <label className={labelCls}>Brand</label>
                          <input value={eq.brand} onChange={e => updateEquipment(eq.id, 'brand', e.target.value)} className={inputCls} placeholder="e.g. Trane" />
                        </div>
                        <div>
                          <label className={labelCls}>Model Number</label>
                          <input value={eq.modelNumber} onChange={e => updateEquipment(eq.id, 'modelNumber', e.target.value)} className={inputCls} placeholder="Model #" />
                        </div>
                        <div>
                          <label className={labelCls}>Serial Number</label>
                          <input value={eq.serialNumber} onChange={e => updateEquipment(eq.id, 'serialNumber', e.target.value)} className={inputCls} placeholder="Serial #" />
                        </div>
                        <div>
                          <label className={labelCls}>Refrigerant Type</label>
                          <select value={eq.refrigerantType} onChange={e => updateEquipment(eq.id, 'refrigerantType', e.target.value)} className={inputCls}>
                            <option value="">Select</option>
                            <option>R-22</option>
                            <option>R-410A</option>
                            <option>R-407C</option>
                            <option>R-134a</option>
                          </select>
                        </div>
                        <div>
                          <label className={labelCls}>Voltage</label>
                          <select value={eq.voltage} onChange={e => updateEquipment(eq.id, 'voltage', e.target.value)} className={inputCls}>
                            <option value="">Select</option>
                            <option>120/1/60</option>
                            <option>208/1/60</option>
                            <option>208/3/60</option>
                            <option>575/3/60</option>
                          </select>
                        </div>
                        {needsServiceArea(eq.type) && (
                          <div>
                            <label className={labelCls}>Service Area</label>
                            <input value={eq.serviceArea} onChange={e => updateEquipment(eq.id, 'serviceArea', e.target.value)} className={inputCls} placeholder="e.g. Bakery" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Deficiencies ── */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">Deficiencies / Notes</h2>
            <button
              onClick={() => setShowDefModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-purple-500 text-white rounded-lg hover:bg-purple-600"
            >
              <Plus size={13} /> Add Deficiency
            </button>
          </div>
          {deficiencies.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">No deficiencies recorded</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {deficiencies.map(d => (
                <li key={d.id} className="px-5 py-4">
                  {editingDefId === d.id ? (
                    <div className="space-y-3">
                      <textarea value={editDefNote} onChange={e => setEditDefNote(e.target.value)} rows={2} className={inputCls} />
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={labelCls}>Asset ID</label>
                          <input value={editDefAssetId} onChange={e => setEditDefAssetId(e.target.value)} className={inputCls} />
                        </div>
                        <div>
                          <label className={labelCls}>Importance</label>
                          <select value={editDefImportance} onChange={e => setEditDefImportance(e.target.value as Importance)} className={inputCls}>
                            <option value="ROUTINE">Routine</option>
                            <option value="IMPORTANT">Important</option>
                            <option value="CRITICAL">Critical</option>
                          </select>
                        </div>
                        {equipment.length > 0 && (
                          <div className="col-span-2">
                            <label className={labelCls}>Related Equipment</label>
                            <select value={editDefEquipIdx ?? ''} onChange={e => setEditDefEquipIdx(e.target.value === '' ? null : Number(e.target.value))} className={inputCls}>
                              <option value="">None</option>
                              {equipment.map((eq, i) => (
                                <option key={eq.id} value={i}>{equipmentLabel(eq.type, eq.serviceArea)}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={saveDefEdit} className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save</button>
                        <button onClick={() => setEditingDefId(null)} className="px-3 py-1.5 text-xs bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <span className={`inline-flex text-[10px] font-semibold px-1.5 py-0.5 rounded border mr-2 ${importanceBadge(d.importance)}`}>
                          {d.importance}
                        </span>
                        <span className="text-sm text-slate-800">{d.note}</span>
                        <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-400">
                          {d.assetId && <span>Asset: {d.assetId}</span>}
                          {d.equipmentIndex !== null && equipment[d.equipmentIndex] && (
                            <span>Equipment: {equipmentLabel(equipment[d.equipmentIndex].type, equipment[d.equipmentIndex].serviceArea)}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0">
                        <button onClick={() => openEditDef(d)} className="text-slate-300 hover:text-blue-500"><Pencil size={13} /></button>
                        <button onClick={() => setDeficiencies(prev => prev.filter(x => x.id !== d.id))} className="text-slate-300 hover:text-red-500"><X size={13} /></button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ── Equipment Type Modal ── */}
      {showTypeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-sm font-semibold text-slate-800 mb-4">Select Equipment Type</h3>
            <div className="space-y-2">
              {(['AIR_HANDLER', 'MAIN_AC', 'RTU', 'EXHAUST_FAN', 'UNIT_HEATER'] as EquipmentType[]).map(t => (
                <button
                  key={t}
                  onClick={() => {
                    setPendingType(t)
                    setShowTypeModal(false)
                    if (needsServiceArea(t)) {
                      setServiceAreaInput('')
                      setShowServiceAreaModal(true)
                    } else {
                      addEquipment(t)
                    }
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                >
                  {equipmentLabel(t)}
                </button>
              ))}
            </div>
            <button onClick={() => setShowTypeModal(false)} className="mt-4 w-full px-4 py-2 text-sm text-slate-500 hover:text-slate-700">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Service Area Modal ── */}
      {showServiceAreaModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-sm font-semibold text-slate-800 mb-1">Service Area</h3>
            <p className="text-xs text-slate-500 mb-4">Enter the area served by this {equipmentLabel(pendingType)}</p>
            <input
              autoFocus
              value={serviceAreaInput}
              onChange={e => setServiceAreaInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && serviceAreaInput.trim()) {
                  addEquipment(pendingType, serviceAreaInput.trim())
                  setShowServiceAreaModal(false)
                }
              }}
              className={inputCls}
              placeholder="e.g. Bakery, Produce, Office…"
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => {
                  if (serviceAreaInput.trim()) {
                    addEquipment(pendingType, serviceAreaInput.trim())
                    setShowServiceAreaModal(false)
                  }
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
              >Add</button>
              <button
                onClick={() => setShowServiceAreaModal(false)}
                className="flex-1 px-4 py-2 text-sm bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200"
              >Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Deficiency Modal ── */}
      {showDefModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-sm font-semibold text-slate-800">Add Deficiency</h3>
            <div>
              <label className={labelCls}>Note *</label>
              <textarea
                autoFocus
                value={defNote}
                onChange={e => setDefNote(e.target.value)}
                rows={3}
                className={inputCls}
                placeholder="Describe the deficiency…"
              />
            </div>
            <div>
              <label className={labelCls}>Importance</label>
              <select value={defImportance} onChange={e => setDefImportance(e.target.value as Importance)} className={inputCls}>
                <option value="ROUTINE">Routine</option>
                <option value="IMPORTANT">Important</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
            {equipment.length > 0 && (
              <div>
                <label className={labelCls}>Related Equipment</label>
                <select value={defEquipIdx ?? ''} onChange={e => setDefEquipIdx(e.target.value === '' ? null : Number(e.target.value))} className={inputCls}>
                  <option value="">None</option>
                  {equipment.map((eq, i) => (
                    <option key={eq.id} value={i}>{equipmentLabel(eq.type, eq.serviceArea)}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className={labelCls}>Asset ID (optional)</label>
              <input value={defAssetId} onChange={e => setDefAssetId(e.target.value)} className={inputCls} placeholder="Asset tag #" />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={handleAddDeficiency} className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">Add</button>
              <button
                onClick={() => { setShowDefModal(false); setDefNote(''); setDefEquipIdx(null); setDefAssetId(''); setDefImportance('ROUTINE') }}
                className="flex-1 px-4 py-2 text-sm bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200"
              >Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function HvacPMPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center text-sm text-slate-400">Loading…</div>}>
      <HvacPMContent />
    </Suspense>
  )
}
