'use client'
import { useState, useEffect, useRef, Suspense, type SetStateAction } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus, X, ChevronDown, Pencil, Loader2 } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import PhotoUploadGrid, { type UploadPhoto } from '@/components/PhotoUploadGrid'
import { draftKey, readDraft, writeDraft, clearDraft, isWorthSaving, describeDraftAge } from '@/lib/maintenance/draft'
import { describeSaveError } from '@/lib/maintenance/save-errors'
import {
  type EquipmentType, usesRefrigerant, needsServiceArea, equipmentLabel, MAX_UNIT_PHOTOS,
} from '@/lib/maintenance/hvac-equipment'

// ─── Types ────────────────────────────────────────────────────────────────────

type Season = '' | 'Spring' | 'Summer' | 'Fall' | 'Winter'

/** What is kept on the device between visits: the answers the tech typed,
 *  not transient UI state like which panel is open. */
interface DraftData {
  storeName: string
  storeId: string | null
  storeAddress: string
  technician: string
  performedAt: string
  season: Season
  simproNumber: string
  equipment: Equipment[]
  checkItems: CheckItems
  deficiencies: Deficiency[]
  photos: UploadPhoto[]
}
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
  /** Photos of this unit specifically — typically the nameplate and whatever is
   *  being flagged. Separate from the report's own photo set. */
  photos: UploadPhoto[]
}

interface HvacEquipmentInfo {
  id: string
  name: string
  manufacturer: string | null
  model: string | null
  serial_number: string | null
  refrigerant: string | null
  specs: { label: string; value: string }[] | null
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

/** Bring stored equipment up to the current shape.
 *
 *  Reports and drafts saved before units had their own photos have no photos
 *  array at all, and older reports can carry a refrigerant on a unit heater or
 *  exhaust fan from when the form asked every unit for one. That value is now
 *  unreachable in the form, so it would sit on the report unchallenged — drop it
 *  rather than let a gas appliance keep a refrigerant nobody can see to correct.
 */
const normaliseEquipment = (rows: Equipment[]): Equipment[] => rows.map(e => ({
  ...e,
  photos: Array.isArray(e.photos) ? e.photos : [],
  refrigerantType: usesRefrigerant(e.type) ? e.refrigerantType : '',
}))

const defaultCheckItems = (): CheckItems => ({
  item1: false, item2: false, item3: false, item4: false,
  item5: false, item6: false, item7: false, item8: false,
  item9: false, item10: false, item11: false,
})

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
  const presetStoreId = searchParams.get('storeId')

  // Store info
  const [storeName, setStoreName] = useState('')
  const [storeId, setStoreId] = useState<string | null>(presetStoreId ?? null)
  const [sitesList, setSitesList] = useState<{ id: string; name: string; address: string }[]>([])
  const [storeAddress, setStoreAddress] = useState('')
  const [technician, setTechnician] = useState('')
  const [performedAt, setPerformedAt] = useState(() => new Date().toLocaleDateString('en-CA'))
  const [season, setSeason] = useState<Season>('')
  const [simproNumber, setSimproNumber] = useState('')

  // Equipment
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [collapsedEquipment, setCollapsedEquipment] = useState<Record<string, boolean>>({})

  // HVAC unit records on file for the selected site — reference only (manufacturer/model/
  // serial/refrigerant/specs); the PM form's equipment "type" classification (Air Handler,
  // RTU, etc.) isn't stored on the equipment record so it can't be safely auto-filled
  const [siteHvacUnits, setSiteHvacUnits] = useState<HvacEquipmentInfo[]>([])
  const fetchedHvacForStoreRef = useRef<string | null>(null)
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

  // Photos
  const [photos, setPhotos] = useState<UploadPhoto[]>([])

  // Save state
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [errorDetail, setErrorDetail] = useState('')

  /* ---- Draft kept on the device ----
   * A PM is filled in over an hour on a phone. Before this, a refresh, a
   * reclaimed tab or a flat battery lost the lot. */
  const DRAFT_KEY = draftKey('hvac-pm', editId)
  const [restoredFrom, setRestoredFrom] = useState<string>('')
  // Set as soon as a draft is applied, so the fetch of an existing report does
  // not overwrite the tech's newer unsaved edits.
  const restoredRef = useRef(false)
  // Nothing is written until the form has been loaded, or an empty initial
  // render would overwrite the very draft we are about to restore.
  const draftReadyRef = useRef(false)
  // The form as it looks untouched, captured on the first pass rather than
  // written out by hand: a new rack carries a random id, so any fixed
  // baseline would differ from it and store a draft for a form nobody typed in.
  const untouchedRef = useRef<DraftData | null>(null)

  // Restore a draft before any fetch runs, so nothing can clobber it.
  useEffect(() => {
    const draft = readDraft<DraftData>(DRAFT_KEY, Date.now())
    if (draft) {
      const d = draft.data
      restoredRef.current = true
      if (d.storeName !== undefined) setStoreName(d.storeName)
      if (d.storeId !== undefined) setStoreId(d.storeId)
      if (d.storeAddress !== undefined) setStoreAddress(d.storeAddress)
      if (d.technician !== undefined) setTechnician(d.technician)
      if (d.performedAt) setPerformedAt(d.performedAt)
      if (d.season !== undefined) setSeason(d.season)
      if (d.simproNumber !== undefined) setSimproNumber(d.simproNumber)
      if (Array.isArray(d.equipment)) setEquipment(normaliseEquipment(d.equipment))
      if (d.checkItems) setCheckItems({ ...defaultCheckItems(), ...d.checkItems })
      if (Array.isArray(d.deficiencies)) setDeficiencies(d.deficiencies)
      if (Array.isArray(d.photos)) setPhotos(d.photos)
      setRestoredFrom(describeDraftAge(draft.savedAt, Date.now()))
    }
    draftReadyRef.current = true
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Fetch sites list for store picker — also pre-fills name/address if storeId came from URL
  useEffect(() => {
    fetch('/api/stores').then(r => r.json()).then(data => {
      if (Array.isArray(data)) {
        setSitesList(data)
        if (presetStoreId && !editId) {
          const site = data.find((s: { id: string; name: string; address: string }) => s.id === presetStoreId)
          if (site) { setStoreName(site.name); setStoreAddress(site.address ?? '') }
        }
      }
    }).catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Pull HVAC unit records on file for the selected site, for reference (manufacturer/
  // model/serial/refrigerant/specs) — surfaced so the tech can see "model info" while
  // adding equipment entries below. Not auto-filled into entries: the PM form's equipment
  // "type" (Air Handler, RTU, Exhaust Fan, …) isn't captured on the equipment record, so
  // there's no reliable way to match a catalog unit to a specific entry.
  useEffect(() => {
    if (!storeId) return
    if (fetchedHvacForStoreRef.current === storeId) return
    fetchedHvacForStoreRef.current = storeId
    fetch(`/api/stores/${storeId}`).then(r => r.ok ? r.json() : null).then(d => {
      const units: HvacEquipmentInfo[] = (d?.equipment ?? []).filter((e: { equipment_type: string }) => e.equipment_type === 'hvac')
      setSiteHvacUnits(units)
    }).catch(() => {})
  }, [storeId])

  // Load existing report
  useEffect(() => {
    if (!editId) return
    // A restored draft is the tech's newer unsaved work on this same report;
    // the saved copy would be a step backwards. "Start fresh" reloads to get it.
    if (restoredRef.current) return
    fetch(`/api/pm-reports/${editId}`).then(r => r.json()).then(d => {
      setStoreName(d.store_name ?? '')
      setStoreId(d.store_id ?? null)
      setSeason(d.pm_season ?? '')
      setSimproNumber(d.simpro_number ?? '')
      setPerformedAt(d.performed_at ? new Date(d.performed_at).toLocaleDateString('en-CA') : new Date().toLocaleDateString('en-CA'))
      if (d.checklist && typeof d.checklist === 'object') {
        setCheckItems({ ...defaultCheckItems(), ...d.checklist })
      }
      if (d.units && typeof d.units === 'object' && !Array.isArray(d.units)) {
        setStoreAddress(d.units.storeAddress ?? '')
        setTechnician(d.units.technician ?? '')
        if (Array.isArray(d.units.equipment)) setEquipment(normaliseEquipment(d.units.equipment))
      }
      if (Array.isArray(d.notes)) setDeficiencies(d.notes)
      setPhotos(d.photos ?? [])
    })
  }, [editId])

  // Equipment helpers
  const addEquipment = (type: EquipmentType, serviceArea = '') => {
    setEquipment(prev => [...prev, {
      id: crypto.randomUUID(), type, serviceArea,
      brand: '', modelNumber: '', serialNumber: '',
      refrigerantType: '', voltage: '', photos: []
    }])
  }

  const updateEquipment = (id: string, field: keyof Equipment, value: string) => {
    setEquipment(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e))
  }

  /** PhotoUploadGrid hands back an updater, so the unit's list is threaded
   *  through it rather than replaced wholesale — an upload that lands after a
   *  label edit must not clobber the edit. */
  const updateEquipmentPhotos = (id: string, update: SetStateAction<UploadPhoto[]>) => {
    setEquipment(prev => prev.map(e => e.id === id
      ? { ...e, photos: typeof update === 'function' ? update(e.photos) : update }
      : e))
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
    hidden: (season === 'Winter' || season === 'Summer') && [1, 3, 5].includes(i),
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

  // Write the form to the device as it is filled in. Debounced so typing a
  // store name is one write, not thirty.
  useEffect(() => {
    if (!draftReadyRef.current) return
    const data: DraftData = {
      storeName, storeId, storeAddress, technician, performedAt, season,
      simproNumber, equipment, checkItems, deficiencies, photos,
    }
    if (untouchedRef.current === null) {
      // First pass. A restored draft is already worth keeping, so it gets a
      // baseline nothing matches; an untouched form becomes the baseline itself.
      untouchedRef.current = restoredRef.current ? ({} as DraftData) : data
      return
    }
    // An untouched form is not a draft; storing one would later tell every tech
    // who merely opened the page that they have unsaved work.
    if (!isWorthSaving(data, untouchedRef.current)) return
    const t = setTimeout(() => writeDraft(DRAFT_KEY, data, Date.now()), 600)
    return () => clearTimeout(t)
  }, [DRAFT_KEY, presetStoreId, storeName, storeId, storeAddress, technician, performedAt,
      season, simproNumber, equipment, checkItems, deficiencies, photos])

  // Throw the draft away and go back to the saved version (or a blank form).
  const startFresh = () => {
    clearDraft(DRAFT_KEY)
    window.location.reload()
  }

  // Save report
  const handleSave = async () => {
    if (!storeName.trim()) { setError('Store name is required'); return }
    setSaving(true); setError(''); setErrorDetail('')
    const payload = {
      equipment_id: equipmentId ?? null,
      report_type: 'hvac',
      store_name: storeName,
      store_id: storeId,
      pm_season: season || null,
      performed_at: new Date(performedAt + 'T12:00:00').toISOString(),
      simpro_number: simproNumber || null,
      checklist: checkItems,
      units: { technician, storeAddress, equipment },
      notes: deficiencies,
      photos,
    }
    const url = editId ? `/api/pm-reports/${editId}` : '/api/pm-reports'
    const method = editId ? 'PATCH' : 'POST'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    setSaving(false)
    if (res.ok) {
      // Saved to the server, so the device copy has done its job.
      clearDraft(DRAFT_KEY)
      setSaved(true)
      setTimeout(() => router.push(`/maintenance?equipmentId=${equipmentId ?? ''}&equipmentName=${equipmentName}`), 1200)
    } else {
      const d = await res.json().catch(() => ({}))
      const friendly = describeSaveError(d?.error, res.status)
      setError(friendly.message)
      setErrorDetail(friendly.detail ?? '')
    }
  }

  const inputCls = 'w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white'
  const labelCls = 'block text-xs font-medium text-slate-700 mb-1'

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title={`HVAC PM${equipmentName ? ` · ${equipmentName}` : ''}`}
        actions={
          <button
            onClick={handleSave}
            disabled={saving || saved}
            className="px-3 md:px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 flex-shrink-0"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {saved ? '✓' : saving ? '…' : <><span className="hidden sm:inline">{editId ? 'Update' : 'Save'} Report</span><span className="sm:hidden">Save</span></>}
          </button>
        }
      />

      <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6">
        {restoredFrom && (
          <div className="px-4 py-3 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-500/30 rounded-lg flex items-start gap-3">
            <span className="flex-1 text-sm text-blue-800 dark:text-blue-200">
              Picked up your unsaved report from this device, last changed {restoredFrom}.
            </span>
            <button
              type="button"
              onClick={startFresh}
              className="min-h-9 shrink-0 text-xs font-semibold text-blue-700 dark:text-blue-300 underline"
            >
              Start fresh
            </button>
          </div>
        )}
        {error && (
          <div className="px-4 py-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-500/30 rounded-lg">
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            {errorDetail && (
              <details className="mt-2">
                <summary className="cursor-pointer text-[11px] text-red-600 dark:text-red-400">Technical detail</summary>
                <p className="mt-1 text-[11px] font-mono break-words text-red-600 dark:text-red-400">{errorDetail}</p>
              </details>
            )}
          </div>
        )}

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
                <option value="Spring">Spring</option>
                <option value="Summer">Summer</option>
                <option value="Fall">Fall</option>
                <option value="Winter">Winter</option>
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

        {/* ── HVAC Units On Record (reference) ── */}
        {siteHvacUnits.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h2 className="text-sm font-semibold text-slate-800">HVAC Units on Record at this Site ({siteHvacUnits.length})</h2>
              <p className="text-xs text-slate-400 mt-0.5">Pulled from the equipment catalog — reference for model/serial/refrigerant info while filling in equipment below</p>
            </div>
            <div className="divide-y divide-slate-100">
              {siteHvacUnits.map(u => (
                <div key={u.id} className="px-6 py-4">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-2">
                    <p className="text-sm font-medium text-slate-800">{u.name}</p>
                    {(u.manufacturer || u.model) && (
                      <span className="text-xs text-slate-400">{[u.manufacturer, u.model].filter(Boolean).join(' · ')}</span>
                    )}
                    {u.serial_number && <span className="text-xs text-slate-400">SN {u.serial_number}</span>}
                    {u.refrigerant && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">{u.refrigerant}</span>}
                  </div>
                  {u.specs && u.specs.length > 0 && (
                    <div className="rounded-xl border border-slate-100 overflow-hidden divide-y divide-slate-100">
                      {u.specs.map((s, i) => (
                        <div key={i} className="flex items-center gap-3 px-3 py-2 odd:bg-slate-50/60">
                          <span className="text-xs text-slate-500 flex-1">{s.label}</span>
                          <span className="text-xs font-medium text-slate-700 text-right">{s.value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

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
                        {/* A unit heater burns gas and an exhaust fan just moves air —
                            neither holds refrigerant, and asking invites a tech to pick
                            something to clear the field. */}
                        {usesRefrigerant(eq.type) && (
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
                        )}
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
                        <div className="md:col-span-2 pt-1 border-t border-slate-100">
                          <PhotoUploadGrid
                            photos={eq.photos}
                            onChange={update => updateEquipmentPhotos(eq.id, update)}
                            title={`${label} Photos`}
                            description=""
                            maxPhotos={MAX_UNIT_PHOTOS}
                            compact
                          />
                        </div>
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

        {/* ── Photos ── */}
        <PhotoUploadGrid photos={photos} onChange={setPhotos} />
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
