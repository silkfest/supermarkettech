'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus, Pencil, Trash2, ChevronDown, Loader2, X } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import PhotoUploadGrid, { type UploadPhoto } from '@/components/PhotoUploadGrid'
import { draftKey, readDraft, writeDraft, clearDraft, isWorthSaving, describeDraftAge } from '@/lib/maintenance/draft'
import { describeSaveError } from '@/lib/maintenance/save-errors'
import {
  CO2_CHECKLIST, CO2_MACHINE_ROOM_ITEMS, CO2_REGIMES, CO2_BOTTLE_ITEM_ID, isCo2ItemInSeason,
  type Co2RegimeKey,
} from '@/lib/maintenance/co2-checklist'
import {
  CO2_SLOTS, co2RackList, co2RackTitle, compressorModels, compressorRlas,
  findCompressorCount, findCompressorManufacturer,
  type Co2RackEquipment,
} from '@/lib/maintenance/co2-racks'

/* ── Types ──────────────────────────────────────────────────────────────── */

type PMSeason = '' | 'Spring' | 'Summer' | 'Fall' | 'Winter'
type Importance = 'CRITICAL' | 'IMPORTANT' | 'ROUTINE'
type OilCondition = 'Good - No Test Done' | 'Good - Acid Test Passed' | 'Bad - Acid Test Failed' | ''
type CondenserCondition = 'Good' | 'CFM out' | 'Dirty Needs Cleaning' | ''

/** The paper form prints eight compressor columns; racks with fewer leave the
 *  rest blank. The array is kept at full length so shrinking the count and
 *  growing it again does not lose what was typed. */
const SLOTS = CO2_SLOTS
const createSlots = (): string[] => Array(SLOTS).fill('')

interface Co2Rack {
  id: string
  /** Tab label — the equipment record's name when it was filled from one. */
  name: string
  /** The equipment record this rack was filled from, so its nameplate can be
   *  read back for the per-compressor reference on return visits. */
  equipmentId: string | null
  rackManufacturer: string
  compressorManufacturer: string
  /** R-744 charge, split the way the form splits it. */
  chargeMT: string
  chargeLT: string
  compressorCount: number
  /** Model per compressor, saved with the report so the PDF prints what was in
   *  the rack on the day — a swapped compressor must not rewrite old reports. */
  compressorModels: string[]
  omcLevel: string[]
  oilPressReservoir: string[]
  compAmps: string[]
  compVolts: string[]
  hpSetPoints: string[]
  lpSetPoints: string[]
  ofcTripTime: string[]
  reservoirPercent: string
  oilLevelReservoir: string
  oilCondition: OilCondition
  acidTest: string
  /** "L.L Alarm – Any occurred?" */
  llAlarm: string
}

/** CO₂ bottles on site, counted against the inventory checklist item. */
interface Co2Bottles {
  full: string
  empty: string
}

interface Co2Regime {
  condenserCondition: CondenserCondition
  flashtankLevel: string
  suctionSetpoint: string
  suctionActual: string
  dischargeSetpoint: string
  dischargeActual: string
  defrostDifferential: string
  heatReclaim: string
  driersLabeled: string
  phaseProtector: string
  flashtankPressure: string
}

type Co2Regimes = Record<Co2RegimeKey, Co2Regime>

interface NoteItem {
  id: string
  text: string
  importance: Importance
  assetId: string
  regime: Co2RegimeKey | ''
  systemNumber: string
}

type ChecklistMap = Record<string, boolean>

interface DraftData {
  storeName: string
  storeId: string | null
  storeAddress: string
  technician: string
  performedAt: string
  season: PMSeason
  simproNumber: string
  racks: Co2Rack[]
  regimes: Co2Regimes
  bottles: Co2Bottles
  checklist: ChecklistMap
  notes: NoteItem[]
  photos: UploadPhoto[]
}

const createRack = (name = ''): Co2Rack => ({
  id: crypto.randomUUID(),
  name,
  equipmentId: null,
  rackManufacturer: '', compressorManufacturer: '',
  chargeMT: '', chargeLT: '',
  compressorCount: SLOTS,
  compressorModels: createSlots(),
  omcLevel: createSlots(), oilPressReservoir: createSlots(),
  compAmps: createSlots(), compVolts: createSlots(),
  hpSetPoints: createSlots(), lpSetPoints: createSlots(), ofcTripTime: createSlots(),
  reservoirPercent: '', oilLevelReservoir: '', oilCondition: '', acidTest: '', llAlarm: '',
})

/** First fill of a rack tab from its equipment record.
 *
 *  Only the standing facts — who built it, the compressor make, how many.
 *  Everything else on the tab is a reading taken on site. */
const buildRackFromEquipment = (e: Co2RackEquipment): Co2Rack => ({
  ...createRack(e.name),
  equipmentId: e.id,
  rackManufacturer: e.manufacturer ?? '',
  compressorManufacturer: findCompressorManufacturer(e.specs),
  compressorCount: findCompressorCount(e.specs) ?? SLOTS,
  compressorModels: compressorModels(e.specs),
})

const createRegime = (): Co2Regime => ({
  condenserCondition: '', flashtankLevel: '',
  suctionSetpoint: '', suctionActual: '', dischargeSetpoint: '', dischargeActual: '',
  defrostDifferential: '', heatReclaim: '', driersLabeled: '', phaseProtector: '',
  flashtankPressure: '',
})

const createRegimes = (): Co2Regimes => ({ LT: createRegime(), MT: createRegime(), DT: createRegime() })

const defaultChecklist = (): ChecklistMap => Object.fromEntries([
  ...CO2_CHECKLIST.map(i => [i.id, false]),
  ...CO2_MACHINE_ROOM_ITEMS.map(i => [i.id, false]),
]) as ChecklistMap

const importanceBadge = (imp: Importance) => {
  if (imp === 'CRITICAL') return 'text-red-600 bg-red-50 border-red-200'
  if (imp === 'IMPORTANT') return 'text-amber-600 bg-amber-50 border-amber-200'
  return 'text-emerald-600 bg-emerald-50 border-emerald-200'
}

const inputCls = 'w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white'
const labelCls = 'block text-xs font-medium text-slate-700 mb-1'
const narrowInput = 'w-full px-2 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-center'
const regimeInput = 'w-full px-2 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white'

const Section = ({ title, open, toggle, children }: { title: string; open: boolean; toggle: () => void; children: React.ReactNode }) => (
  <div className="border border-slate-200 rounded-xl overflow-hidden">
    <button onClick={toggle} className="w-full px-4 py-3 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors">
      <span className="text-sm font-semibold text-slate-800">{title}</span>
      <ChevronDown size={16} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
    </button>
    {open && <div className="p-4">{children}</div>}
  </div>
)

/* ── Page ───────────────────────────────────────────────────────────────── */

function Co2PMContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get('id')   // the other PM forms use ?id= too
  const equipmentId = searchParams.get('equipmentId')
  const equipmentName = searchParams.get('equipmentName') ?? ''
  const presetStoreId = searchParams.get('storeId')

  const [storeName, setStoreName] = useState('')
  const [storeId, setStoreId] = useState<string | null>(presetStoreId ?? null)
  const [sitesList, setSitesList] = useState<{ id: string; name: string; address: string }[]>([])
  const [storeAddress, setStoreAddress] = useState('')
  const [technician, setTechnician] = useState('')
  const [performedAt, setPerformedAt] = useState(new Date().toLocaleDateString('en-CA'))
  const [season, setSeason] = useState<PMSeason>('')
  const [simproNumber, setSimproNumber] = useState('')

  const [racks, setRacks] = useState<Co2Rack[]>(() => [createRack()])
  const [activeRackId, setActiveRackId] = useState<string | null>(null)
  const [rackEquipment, setRackEquipment] = useState<Co2RackEquipment[]>([])
  const [regimes, setRegimes] = useState<Co2Regimes>(createRegimes())
  const [bottles, setBottles] = useState<Co2Bottles>({ full: '', empty: '' })
  const [checklist, setChecklist] = useState<ChecklistMap>(defaultChecklist())
  const [notes, setNotes] = useState<NoteItem[]>([])
  const [photos, setPhotos] = useState<UploadPhoto[]>([])

  const [checklistOpen, setChecklistOpen] = useState(true)
  const [rackOpen, setRackOpen] = useState(true)
  const [readingsOpen, setReadingsOpen] = useState(true)
  const [safetyOpen, setSafetyOpen] = useState(true)
  const [regimesOpen, setRegimesOpen] = useState(true)

  const [showNoteModal, setShowNoteModal] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [noteImportance, setNoteImportance] = useState<Importance>('ROUTINE')
  const [noteAssetId, setNoteAssetId] = useState('')
  const [noteRegime, setNoteRegime] = useState<Co2RegimeKey | ''>('')
  const [noteSystemNumber, setNoteSystemNumber] = useState('')
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editNoteText, setEditNoteText] = useState('')
  const [editNoteImportance, setEditNoteImportance] = useState<Importance>('ROUTINE')
  const [editNoteAssetId, setEditNoteAssetId] = useState('')

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [errorDetail, setErrorDetail] = useState('')

  /* ---- Draft kept on the device ---- */
  const DRAFT_KEY = draftKey('co2-pm', editId)
  const [restoredFrom, setRestoredFrom] = useState('')
  const restoredRef = useRef(false)
  const draftReadyRef = useRef(false)
  const untouchedRef = useRef<DraftData | null>(null)

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
      if (Array.isArray(d.racks) && d.racks.length) {
        setRacks(d.racks.map(r => ({ ...createRack(), ...r })))
      }
      if (d.regimes) setRegimes({ ...createRegimes(), ...d.regimes })
      if (d.bottles) setBottles({ full: d.bottles.full ?? '', empty: d.bottles.empty ?? '' })
      if (d.checklist) setChecklist({ ...defaultChecklist(), ...d.checklist })
      if (Array.isArray(d.notes)) setNotes(d.notes)
      if (Array.isArray(d.photos)) setPhotos(d.photos)
      setRestoredFrom(describeDraftAge(draft.savedAt, Date.now()))
    }
    draftReadyRef.current = true
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!draftReadyRef.current) return
    const data: DraftData = {
      storeName, storeId, storeAddress, technician, performedAt, season,
      simproNumber, racks, regimes, bottles, checklist, notes, photos,
    }
    if (untouchedRef.current === null) {
      untouchedRef.current = restoredRef.current ? ({} as DraftData) : data
      return
    }
    if (!isWorthSaving(data, untouchedRef.current)) return
    const t = setTimeout(() => writeDraft(DRAFT_KEY, data, Date.now()), 600)
    return () => clearTimeout(t)
  }, [DRAFT_KEY, storeName, storeId, storeAddress, technician, performedAt, season,
      simproNumber, racks, regimes, bottles, checklist, notes, photos])

  const startFresh = () => {
    clearDraft(DRAFT_KEY)
    window.location.reload()
  }

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

  // Rack records on file for the selected site. They serve two purposes: the
  // nameplate reference shown beside each compressor's amps box (always), and
  // a first fill of the rack tabs (only on a fresh report whose racks are still
  // untouched — a tech's entries are never overwritten). Only equipment_type
  // 'rack' feeds this; cases and circuits are deliberately excluded.
  useEffect(() => {
    if (!storeId) { setRackEquipment([]); return }
    let cancelled = false
    fetch(`/api/stores/${storeId}`).then(r => r.ok ? r.json() : null).then(d => {
      if (cancelled) return
      const found: Co2RackEquipment[] = (d?.equipment ?? [])
        .filter((e: { equipment_type: string }) => e.equipment_type === 'rack')
      setRackEquipment(found)
      if (!found.length || editId) return
      setRacks(prev => {
        const pristine = prev.length === 1 && !prev[0].rackManufacturer
          && !prev[0].compressorManufacturer && !prev[0].chargeMT && !prev[0].chargeLT
          && !prev[0].omcLevel.some(Boolean) && !prev[0].compAmps.some(Boolean)
          && !prev[0].compressorModels.some(Boolean)
        if (!pristine) return prev
        const filled = found.map(buildRackFromEquipment)
        setActiveRackId(filled[0].id)
        return filled
      })
    }).catch(() => {})
    return () => { cancelled = true }
  // autoFill is keyed on the site, not on every render of the rack list
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId, editId])

  // Load an existing report for editing.
  useEffect(() => {
    if (!editId) return
    if (restoredRef.current) return   // a draft is newer unsaved work on this report
    fetch(`/api/pm-reports/${editId}`).then(r => r.json()).then(d => {
      setStoreName(d.store_name ?? '')
      setStoreId(d.store_id ?? null)
      setSeason(d.pm_season ?? '')
      setSimproNumber(d.simpro_number ?? '')
      setPerformedAt(d.performed_at ? new Date(d.performed_at).toLocaleDateString('en-CA') : new Date().toLocaleDateString('en-CA'))
      if (d.checklist && typeof d.checklist === 'object') setChecklist({ ...defaultChecklist(), ...d.checklist })
      if (d.units && typeof d.units === 'object' && !Array.isArray(d.units)) {
        setStoreAddress(d.units.storeAddress ?? '')
        setTechnician(typeof d.units.technician === 'string' ? d.units.technician : (d.units.technician?.name ?? ''))
        const saved = co2RackList(d.units)
        if (saved.length) setRacks(saved.map(r => ({ ...createRack(), ...r })))
        if (d.units.regimes) setRegimes({ ...createRegimes(), ...d.units.regimes })
        if (d.units.bottles) setBottles({ full: d.units.bottles.full ?? '', empty: d.units.bottles.empty ?? '' })
      }
      if (Array.isArray(d.notes)) setNotes(d.notes)
      setPhotos(d.photos ?? [])
    })
  }, [editId])

  /* ---- racks ---- */

  /** The tab being filled in. Falls back to the first rack so the form always
   *  has somewhere to put a reading, even if a tab was just deleted. */
  const activeRack = racks.find(r => r.id === activeRackId) ?? racks[0]

  const patchActive = (fn: (r: Co2Rack) => Co2Rack) =>
    setRacks(prev => prev.map(r => (r.id === activeRack?.id ? fn(r) : r)))

  const updateRack = <K extends keyof Co2Rack>(field: K, value: Co2Rack[K]) =>
    patchActive(r => ({ ...r, [field]: value }))

  const updateSlot = (field: keyof Co2Rack, index: number, value: string) =>
    patchActive(r => {
      const arr = [...(r[field] as string[])]
      arr[index] = value
      return { ...r, [field]: arr }
    })

  const addRack = () => {
    const fresh = createRack()
    setRacks(prev => [...prev, fresh])
    setActiveRackId(fresh.id)
  }

  /** Whether anything has been typed on a rack — the id, name and slot arrays
   *  it is born with do not count as work. */
  const rackHasEntries = (r: Co2Rack) =>
    [r.rackManufacturer, r.compressorManufacturer, r.chargeMT, r.chargeLT,
      r.reservoirPercent, r.oilLevelReservoir, r.oilCondition, r.acidTest, r.llAlarm]
      .some(Boolean)
    || [r.compressorModels, r.omcLevel, r.oilPressReservoir, r.compAmps, r.compVolts,
      r.hpSetPoints, r.lpSetPoints, r.ofcTripTime].some(a => a.some(Boolean))

  /** Removing the last rack would leave the form with nothing to write on, so
   *  the button is hidden at one rack rather than leaving an empty state. An
   *  hour of readings should not go on a mis-tap either, so a rack with
   *  anything on it asks first. */
  const removeRack = (id: string) => {
    const target = racks.find(r => r.id === id)
    if (target && rackHasEntries(target)
      && !window.confirm(`Remove ${co2RackTitle(target.name, racks.indexOf(target))} and the readings on it?`)) return
    setRacks(prev => {
      if (prev.length <= 1) return prev
      const next = prev.filter(r => r.id !== id)
      if (id === activeRack?.id) setActiveRackId(next[0].id)
      return next
    })
  }

  /** Rated amps for each compressor on the active rack, re-read from the
   *  equipment record rather than stored on the report. */
  const activeRefs = (() => {
    const record = rackEquipment.find(e => e.id === activeRack?.equipmentId)
    return record ? compressorRlas(record.specs) : []
  })()

  const updateRegime = (key: Co2RegimeKey, field: keyof Co2Regime, value: string) =>
    setRegimes(prev => ({ ...prev, [key]: { ...prev[key], [field]: value } }))

  /** The safety values are usually identical across a rack's compressors; the
   *  HFC form offers the same shortcut. Blanks are skipped so a half-filled
   *  Comp 1 cannot wipe what is already on the others. */
  const hasSafetyValues = !!(activeRack.hpSetPoints[0] || activeRack.lpSetPoints[0] || activeRack.ofcTripTime[0])
  const applySafetyToAll = () => {
    patchActive(prev => {
      const spread = (arr: string[]) => {
        const first = arr[0]
        if (!first) return arr
        return arr.map((v, i) => (i < prev.compressorCount ? first : v))
      }
      return {
        ...prev,
        hpSetPoints: spread(prev.hpSetPoints),
        lpSetPoints: spread(prev.lpSetPoints),
        ofcTripTime: spread(prev.ofcTripTime),
      }
    })
  }

  const visibleChecklist = CO2_CHECKLIST.filter(i => isCo2ItemInSeason(i, season))
  const toggleCheck = (key: string) => setChecklist(prev => ({ ...prev, [key]: !prev[key] }))
  const selectAll = (val: boolean) => {
    const updates: ChecklistMap = {}
    visibleChecklist.forEach(i => { updates[i.id] = val })
    setChecklist(prev => ({ ...prev, ...updates }))
  }

  const handleAddNote = () => {
    if (!noteText.trim()) return
    setNotes(prev => [...prev, {
      id: crypto.randomUUID(),
      text: noteText.trim(),
      importance: noteImportance,
      assetId: noteAssetId,
      regime: noteRegime,
      systemNumber: noteSystemNumber,
    }])
    setNoteText(''); setNoteImportance('ROUTINE'); setNoteAssetId(''); setNoteRegime(''); setNoteSystemNumber('')
    setShowNoteModal(false)
  }

  const openEditNote = (n: NoteItem) => {
    setEditingNoteId(n.id); setEditNoteText(n.text)
    setEditNoteImportance(n.importance); setEditNoteAssetId(n.assetId)
  }

  const saveNoteEdit = () => {
    setNotes(prev => prev.map(n => n.id === editingNoteId
      ? { ...n, text: editNoteText, importance: editNoteImportance, assetId: editNoteAssetId }
      : n))
    setEditingNoteId(null)
  }

  const handleSave = async () => {
    if (!storeName.trim()) { setError('Store name is required'); return }
    setSaving(true); setError(''); setErrorDetail('')
    const payload = {
      equipment_id: equipmentId ?? null,
      report_type: 'co2',
      store_name: storeName,
      store_id: storeId,
      pm_season: season || null,
      performed_at: new Date(performedAt + 'T12:00:00').toISOString(),
      simpro_number: simproNumber || null,
      checklist,
      units: { technician, storeAddress, racks, regimes, bottles },
      notes,
      photos,
    }
    const url = editId ? `/api/pm-reports/${editId}` : '/api/pm-reports'
    const method = editId ? 'PATCH' : 'POST'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    setSaving(false)
    if (res.ok) {
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

  /* ── Render ── */

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title={`CO₂ PM${equipmentName ? ` · ${equipmentName}` : ''}`}
        actions={
          <button
            onClick={handleSave}
            disabled={saving || saved}
            className="px-3 md:px-4 py-2 bg-cyan-600 text-white text-sm font-medium rounded-lg hover:bg-cyan-700 disabled:opacity-50 flex items-center gap-2 flex-shrink-0"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {saved ? '✓' : saving ? '…' : <><span className="hidden sm:inline">{editId ? 'Update' : 'Save'} Report</span><span className="sm:hidden">Save</span></>}
          </button>
        }
      />

      <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6">
        {restoredFrom && (
          <div className="px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
            <span className="flex-1 text-sm text-blue-800">
              Picked up your unsaved report from this device, last changed {restoredFrom}.
            </span>
            <button type="button" onClick={startFresh} className="min-h-9 shrink-0 text-xs font-semibold text-blue-700 underline">
              Start fresh
            </button>
          </div>
        )}
        {error && (
          <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
            {errorDetail && (
              <details className="mt-2">
                <summary className="cursor-pointer text-[11px] text-red-600">Technical detail</summary>
                <p className="mt-1 text-[11px] font-mono break-words text-red-600">{errorDetail}</p>
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
              <label className={labelCls}>PM Season / Phase</label>
              <select value={season} onChange={e => setSeason(e.target.value as PMSeason)} className={inputCls}>
                <option value="">Select Season</option>
                <option value="Fall">Fall (Phase 1)</option>
                <option value="Winter">Winter (Phase 2)</option>
                <option value="Spring">Spring (Phase 3)</option>
                <option value="Summer">Summer (Phase 4)</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Simpro # (optional)</label>
              <input value={simproNumber} onChange={e => setSimproNumber(e.target.value)} className={inputCls} placeholder="Job number" />
            </div>
            <div className="md:col-span-2 flex flex-wrap gap-x-6 gap-y-2 pt-1 border-t border-slate-100">
              {CO2_MACHINE_ROOM_ITEMS.map(item => (
                <label key={item.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                    checked={!!checklist[item.id]}
                    onChange={() => toggleCheck(item.id)}
                  />
                  <span className="text-sm text-slate-700">{item.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* ── Service Checklist ── */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <button
            onClick={() => setChecklistOpen(o => !o)}
            className="w-full px-6 py-4 flex items-center justify-between bg-slate-50 border-b border-slate-100 hover:bg-slate-100 transition-colors"
          >
            <h2 className="text-sm font-semibold text-slate-800">
              Service Checklist ({visibleChecklist.filter(i => checklist[i.id]).length}/{visibleChecklist.length} complete)
            </h2>
            <ChevronDown size={16} className={`text-slate-400 transition-transform ${checklistOpen ? 'rotate-180' : ''}`} />
          </button>
          {checklistOpen && (
            <div className="p-6 space-y-3">
              <label className="flex items-center gap-2 pb-3 border-b border-slate-100 cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                  onChange={e => selectAll(e.target.checked)}
                  checked={visibleChecklist.length > 0 && visibleChecklist.every(i => checklist[i.id])}
                />
                <span className="text-sm font-medium text-slate-700">Select All</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {visibleChecklist.map(item => (
                  <div key={item.id}>
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 flex-shrink-0"
                        checked={!!checklist[item.id]}
                        onChange={() => toggleCheck(item.id)}
                      />
                      <span className="text-sm text-slate-700">
                        {item.label}
                        {item.season && (
                          <span className="ml-1 text-[10px] text-slate-400">({item.season.join('/')} only)</span>
                        )}
                      </span>
                    </label>
                    {/* The count belongs with the item that asks for it, not in
                        a section of its own further down the form. */}
                    {item.id === CO2_BOTTLE_ITEM_ID && (
                      <div className="mt-1.5 ml-6 flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <label className="text-[11px] text-slate-500" htmlFor="co2-bottles-full">Full</label>
                          <input
                            id="co2-bottles-full"
                            inputMode="numeric"
                            value={bottles.full}
                            onChange={e => setBottles(b => ({ ...b, full: e.target.value }))}
                            className="w-16 px-2 py-1 text-xs text-center border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-cyan-500 bg-white"
                          />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <label className="text-[11px] text-slate-500" htmlFor="co2-bottles-empty">Empty</label>
                          <input
                            id="co2-bottles-empty"
                            inputMode="numeric"
                            value={bottles.empty}
                            onChange={e => setBottles(b => ({ ...b, empty: e.target.value }))}
                            className="w-16 px-2 py-1 text-xs text-center border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-cyan-500 bg-white"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Rack Data ── */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">
              CO₂ Racks{racks.length > 1 ? ` (${racks.length})` : ''}
            </h2>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200">R-744</span>
          </div>

          {/* One tab per rack. A CO₂ store commonly runs a booster alongside a
              separate MT rack, and each carries its own readings. */}
          <div className="flex items-stretch gap-1 overflow-x-auto border-b border-slate-200 px-3 pt-3 bg-slate-50">
            {racks.map((r, i) => {
              const active = r.id === activeRack?.id
              return (
                <div
                  key={r.id}
                  className={`group flex items-center gap-1 rounded-t-lg border border-b-0 px-3 py-2 flex-shrink-0 ${
                    active ? 'bg-white border-slate-200' : 'bg-transparent border-transparent hover:bg-white/60'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setActiveRackId(r.id)}
                    className={`text-xs font-semibold whitespace-nowrap ${active ? 'text-cyan-700' : 'text-slate-500'}`}
                  >
                    {co2RackTitle(r.name, i)}
                  </button>
                  {racks.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRack(r.id)}
                      aria-label={`Remove ${co2RackTitle(r.name, i)}`}
                      className="p-1 -mr-1 text-slate-400 hover:text-red-600"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              )
            })}
            <button
              type="button"
              onClick={addRack}
              className="flex items-center gap-1 px-3 py-2 text-xs font-semibold text-cyan-700 hover:text-cyan-800 flex-shrink-0"
            >
              <Plus size={13} /> Add Rack
            </button>
          </div>

          <div className="p-4 md:p-6 space-y-4">

            <Section title="Rack Description" open={rackOpen} toggle={() => setRackOpen(o => !o)}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Rack Name</label>
                  <input
                    value={activeRack.name}
                    onChange={e => updateRack('name', e.target.value)}
                    className={inputCls}
                    placeholder={co2RackTitle('', racks.indexOf(activeRack))}
                  />
                </div>
                <div>
                  <label className={labelCls}>Rack Manufacturer</label>
                  <input value={activeRack.rackManufacturer} onChange={e => updateRack('rackManufacturer', e.target.value)} className={inputCls} placeholder="e.g. Carnot, Advansor, Hussmann" />
                </div>
                <div>
                  <label className={labelCls}>Compressor Manufacturer</label>
                  <input value={activeRack.compressorManufacturer} onChange={e => updateRack('compressorManufacturer', e.target.value)} className={inputCls} placeholder="e.g. Bitzer, Dorin" />
                </div>
                <div>
                  <label className={labelCls}>R-744 Charge — MT</label>
                  <input value={activeRack.chargeMT} onChange={e => updateRack('chargeMT', e.target.value)} className={inputCls} placeholder="e.g. 450 lb" />
                </div>
                <div>
                  <label className={labelCls}>R-744 Charge — LT</label>
                  <input value={activeRack.chargeLT} onChange={e => updateRack('chargeLT', e.target.value)} className={inputCls} placeholder="e.g. 180 lb" />
                </div>
                <div>
                  <label className={labelCls}>Compressors on this rack</label>
                  <select
                    value={activeRack.compressorCount}
                    onChange={e => updateRack('compressorCount', Number(e.target.value))}
                    className={inputCls}
                  >
                    {Array.from({ length: SLOTS }, (_, i) => i + 1).map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
              </div>
            </Section>

            <Section title="Oil Levels" open={readingsOpen} toggle={() => setReadingsOpen(o => !o)}>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className={labelCls}>Reservoir %</label>
                  <input value={activeRack.reservoirPercent} onChange={e => updateRack('reservoirPercent', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Oil Level in Reservoir</label>
                  <input value={activeRack.oilLevelReservoir} onChange={e => updateRack('oilLevelReservoir', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Oil Condition</label>
                  <select value={activeRack.oilCondition} onChange={e => updateRack('oilCondition', e.target.value as OilCondition)} className={inputCls}>
                    <option value="">Select</option>
                    <option>Good - No Test Done</option>
                    <option>Good - Acid Test Passed</option>
                    <option>Bad - Acid Test Failed</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Acid Test</label>
                  <input value={activeRack.acidTest} onChange={e => updateRack('acidTest', e.target.value)} className={inputCls} placeholder="Result" />
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Array.from({ length: activeRack.compressorCount }, (_, i) => (
                  <div key={i} className="bg-slate-50 rounded-lg p-3 space-y-2.5">
                    <div className="pb-1.5 border-b border-slate-200">
                      <p className="text-[11px] font-semibold text-slate-700 text-center">Comp {i + 1}</p>
                      {activeRefs[i] && (
                        <p className="text-[10px] text-slate-500 text-center leading-tight mt-0.5">{activeRefs[i]}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">Model</label>
                      <input
                        value={activeRack.compressorModels[i] ?? ''}
                        onChange={e => updateSlot('compressorModels', i, e.target.value)}
                        className={narrowInput}
                        placeholder="e.g. 4DTC-25K"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">OMC Level</label>
                      <input value={activeRack.omcLevel[i] ?? ''} onChange={e => updateSlot('omcLevel', i, e.target.value)} className={narrowInput} />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">Oil Press / Reservoir</label>
                      <input value={activeRack.oilPressReservoir[i] ?? ''} onChange={e => updateSlot('oilPressReservoir', i, e.target.value)} className={narrowInput} />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">Comp Amps</label>
                      <input value={activeRack.compAmps[i] ?? ''} onChange={e => updateSlot('compAmps', i, e.target.value)} className={narrowInput} />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">Comp Volts</label>
                      <input value={activeRack.compVolts[i] ?? ''} onChange={e => updateSlot('compVolts', i, e.target.value)} className={narrowInput} />
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Mechanical Safety Controls" open={safetyOpen} toggle={() => setSafetyOpen(o => !o)}>
              {activeRack.compressorCount > 1 && (
                <div className="mb-4 rounded-lg border border-cyan-200 bg-cyan-50 p-3">
                  <p className="text-sm font-medium text-slate-800">Same safety values across this rack?</p>
                  <p className="mt-1 text-xs text-slate-600">
                    Enter HP, LP and OFC trip time under Comp 1, then copy to all {activeRack.compressorCount} compressors.
                    Blanks are skipped, and you can edit any compressor afterward.
                  </p>
                  <button
                    type="button"
                    onClick={applySafetyToAll}
                    disabled={!hasSafetyValues}
                    className="mt-3 min-h-11 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Apply Comp 1 to all compressors
                  </button>
                </div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Array.from({ length: activeRack.compressorCount }, (_, i) => (
                  <div key={i} className="bg-slate-50 rounded-lg p-3 space-y-2.5">
                    <p className="text-[11px] font-semibold text-slate-700 text-center pb-1.5 border-b border-slate-200">Comp {i + 1}</p>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">H.P. Set Point</label>
                      <input value={activeRack.hpSetPoints[i] ?? ''} onChange={e => updateSlot('hpSetPoints', i, e.target.value)} className={narrowInput} />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">L.P. Set Point</label>
                      <input value={activeRack.lpSetPoints[i] ?? ''} onChange={e => updateSlot('lpSetPoints', i, e.target.value)} className={narrowInput} />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">OFC Trip (sec)</label>
                      <input value={activeRack.ofcTripTime[i] ?? ''} onChange={e => updateSlot('ofcTripTime', i, e.target.value)} className={narrowInput} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <label className={labelCls}>L.L Alarm — any occurred?</label>
                <input value={activeRack.llAlarm} onChange={e => updateRack('llAlarm', e.target.value)} className={inputCls} placeholder="e.g. None, or describe" />
              </div>
            </Section>

            <Section title="L/T · M/T · D/T Readings" open={regimesOpen} toggle={() => setRegimesOpen(o => !o)}>
              <p className="text-xs text-slate-500 mb-3">Leave a column blank where the store has no such system.</p>
              <div className="space-y-4">
                {CO2_REGIMES.map(({ key, label }) => (
                  <div key={key} className="border border-slate-200 rounded-lg overflow-hidden">
                    <div className="px-3 py-2 bg-slate-50 border-b border-slate-200">
                      <span className="text-xs font-semibold text-slate-700">{label}</span>
                    </div>
                    <div className="p-3 grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-0.5">Condenser Condition</label>
                        <select
                          value={regimes[key].condenserCondition}
                          onChange={e => updateRegime(key, 'condenserCondition', e.target.value)}
                          className={regimeInput}
                        >
                          <option value="">—</option>
                          <option>Good</option>
                          <option>CFM out</option>
                          <option>Dirty Needs Cleaning</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-0.5">Flashtank Level</label>
                        <input value={regimes[key].flashtankLevel} onChange={e => updateRegime(key, 'flashtankLevel', e.target.value)} className={regimeInput} />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-0.5">Flashtank Pressure (psig)</label>
                        <input value={regimes[key].flashtankPressure} onChange={e => updateRegime(key, 'flashtankPressure', e.target.value)} className={regimeInput} />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-0.5">Defrost Differential</label>
                        <input value={regimes[key].defrostDifferential} onChange={e => updateRegime(key, 'defrostDifferential', e.target.value)} className={regimeInput} />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-0.5">Suction Setpoint</label>
                        <input value={regimes[key].suctionSetpoint} onChange={e => updateRegime(key, 'suctionSetpoint', e.target.value)} className={regimeInput} />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-0.5">Suction Actual</label>
                        <input value={regimes[key].suctionActual} onChange={e => updateRegime(key, 'suctionActual', e.target.value)} className={regimeInput} />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-0.5">Discharge Setpoint</label>
                        <input value={regimes[key].dischargeSetpoint} onChange={e => updateRegime(key, 'dischargeSetpoint', e.target.value)} className={regimeInput} />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-0.5">Discharge Actual</label>
                        <input value={regimes[key].dischargeActual} onChange={e => updateRegime(key, 'dischargeActual', e.target.value)} className={regimeInput} />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-0.5">Heat Reclaim</label>
                        <input value={regimes[key].heatReclaim} onChange={e => updateRegime(key, 'heatReclaim', e.target.value)} className={regimeInput} />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-0.5">Driers Labelled?</label>
                        <input value={regimes[key].driersLabeled} onChange={e => updateRegime(key, 'driersLabeled', e.target.value)} className={regimeInput} placeholder="Change annually" />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-0.5">Phase Protector</label>
                        <input value={regimes[key].phaseProtector} onChange={e => updateRegime(key, 'phaseProtector', e.target.value)} className={regimeInput} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          </div>
        </div>

        {/* ── Notes / Deficiencies ── */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">Notes / Deficiencies</h2>
            <button
              onClick={() => setShowNoteModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-purple-500 text-white rounded-lg hover:bg-purple-600"
            >
              <Plus size={13} /> Add Note
            </button>
          </div>
          {notes.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">No notes recorded</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {notes.map(n => (
                <li key={n.id} className="px-5 py-4">
                  {editingNoteId === n.id ? (
                    <div className="space-y-3">
                      <textarea value={editNoteText} onChange={e => setEditNoteText(e.target.value)} rows={2} className={inputCls} />
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={labelCls}>Asset ID</label>
                          <input value={editNoteAssetId} onChange={e => setEditNoteAssetId(e.target.value)} className={inputCls} />
                        </div>
                        <div>
                          <label className={labelCls}>Importance</label>
                          <select value={editNoteImportance} onChange={e => setEditNoteImportance(e.target.value as Importance)} className={inputCls}>
                            <option value="ROUTINE">Routine</option>
                            <option value="IMPORTANT">Important</option>
                            <option value="CRITICAL">Critical</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={saveNoteEdit} className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save</button>
                        <button onClick={() => setEditingNoteId(null)} className="px-3 py-1.5 text-xs bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <span className={`inline-flex text-[10px] font-semibold px-1.5 py-0.5 rounded border mr-2 ${importanceBadge(n.importance)}`}>
                          {n.importance}
                        </span>
                        <span className="text-sm text-slate-800">{n.text}</span>
                        <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-400">
                          {n.assetId && <span>Asset: {n.assetId}</span>}
                          {n.regime && <span>{n.regime}</span>}
                          {n.systemNumber && <span>System: {n.systemNumber}</span>}
                        </div>
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0">
                        <button onClick={() => openEditNote(n)} className="text-slate-300 hover:text-blue-500"><Pencil size={13} /></button>
                        <button onClick={() => setNotes(prev => prev.filter(x => x.id !== n.id))} className="text-slate-300 hover:text-red-500"><Trash2 size={13} /></button>
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

      {/* ── Add Note Modal ── */}
      {showNoteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-3 max-h-[90vh] overflow-y-auto">
            <h3 className="text-sm font-semibold text-slate-800">Add Note / Deficiency</h3>
            <div>
              <label className={labelCls}>Note</label>
              <textarea
                autoFocus
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                rows={3}
                className={inputCls}
                placeholder="Describe the issue or finding…"
              />
            </div>
            <div>
              <label className={labelCls}>Importance</label>
              <select value={noteImportance} onChange={e => setNoteImportance(e.target.value as Importance)} className={inputCls}>
                <option value="ROUTINE">Routine</option>
                <option value="IMPORTANT">Important</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Asset ID (optional)</label>
              <input value={noteAssetId} onChange={e => setNoteAssetId(e.target.value)} className={inputCls} placeholder="Asset tag #" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>System (optional)</label>
                <select value={noteRegime} onChange={e => setNoteRegime(e.target.value as Co2RegimeKey | '')} className={inputCls}>
                  <option value="">None</option>
                  {CO2_REGIMES.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>System # (optional)</label>
                <input value={noteSystemNumber} onChange={e => setNoteSystemNumber(e.target.value)} className={inputCls} placeholder="e.g. 12" />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={handleAddNote} className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">Add</button>
              <button
                onClick={() => { setShowNoteModal(false); setNoteText(''); setNoteImportance('ROUTINE'); setNoteAssetId(''); setNoteRegime(''); setNoteSystemNumber('') }}
                className="flex-1 px-4 py-2 text-sm bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200"
              >Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Co2PMPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center text-sm text-slate-400">Loading…</div>}>
      <Co2PMContent />
    </Suspense>
  )
}
