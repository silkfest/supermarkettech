'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams, useParams } from 'next/navigation'
import { Printer, Download, Pencil, Trash2, CheckCircle2, Circle, AlertTriangle, Info, AlertCircle, Loader2 } from 'lucide-react'
import PhotoGallery from '@/components/PhotoGallery'
import PageHeader from '@/components/PageHeader'
import { REFRIG_CHECKLIST, HVAC_CHECKLIST } from '@/lib/maintenance/checklists'
import { type EquipmentType, usesRefrigerant } from '@/lib/maintenance/hvac-equipment'
import { buildReportDoc, type ReportKind } from '@/lib/reports/doc'

const RACK_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

function importanceBadge(imp: string) {
  if (imp === 'CRITICAL') return { cls: 'text-red-700 bg-red-50 border-red-200', icon: <AlertCircle size={12} className="text-red-500" /> }
  if (imp === 'IMPORTANT') return { cls: 'text-amber-700 bg-amber-50 border-amber-200', icon: <AlertTriangle size={12} className="text-amber-500" /> }
  return { cls: 'text-emerald-700 bg-emerald-50 border-emerald-200', icon: <Info size={12} className="text-emerald-500" /> }
}

/** Who did the work, from either shape the report may carry. */
function technicianFrom(raw: unknown): { name: string; cert: string } {
  if (typeof raw === 'string') return { name: raw, cert: '' }
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, string>
  return { name: o.name ?? '', cert: o.cert ?? '' }
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden print:border-slate-300 print:rounded-none print:shadow-none print:mb-4 print:overflow-visible">
      <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 print:bg-white print:border-slate-200">
        <h2 className="text-xs font-semibold text-slate-600 uppercase tracking-widest">{title}</h2>
      </div>
      <div className="px-6 py-5 print:overflow-visible">{children}</div>
    </div>
  )
}

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div>
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-sm text-slate-800">{value}</p>
    </div>
  )
}

// ─── Refrigeration report view ────────────────────────────────────────────────
function RefrigView({ data }: { data: Record<string, unknown> }) {
  const units = data.units as Record<string, unknown> | null
  const checklist = data.checklist as Record<string, boolean> | null
  const notes = data.notes as Array<{
    id: string; text: string; importance: string
    assetId?: string; rackIndex?: number | null; systemNumber?: string
  }> | null
  const photos = (data.photos as Array<{ url: string; label: string }>) ?? []
  const racks = (units?.racks as unknown[]) ?? []
  // Both PM forms save this as a plain string; older reports hold an object.
  const technician = technicianFrom(units?.technician)
  const storeAddress = units?.storeAddress as string | null

  const checkedItems = REFRIG_CHECKLIST.filter(i => checklist?.[i.id])
  const uncheckedItems = REFRIG_CHECKLIST.filter(i => checklist && checklist[i.id] === false)

  const rackLetter = (idx: number) => RACK_LETTERS[idx] ?? String(idx + 1)

  const rackTitle = (idx: number) => {
    const r = racks[idx] as Record<string, unknown> | undefined
    if (!r) return ''
    return (r.tabDisplayName as string) || `Rack ${rackLetter(idx)}`
  }

  const noteMeta = (n: { assetId?: string; rackIndex?: number | null; systemNumber?: string }) => {
    const rack = typeof n.rackIndex === 'number' ? rackTitle(n.rackIndex) : ''
    return [n.assetId && `Asset: ${n.assetId}`, rack, n.systemNumber && `System: ${n.systemNumber}`]
      .filter(Boolean).join(' · ')
  }

  return (
    <div className="space-y-5">
      {/* Technician / Site */}
      <SectionCard title="Site & Technician">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Field label="Store / Site" value={data.store_name as string} />
          <Field label="Address" value={storeAddress} />
          <Field label="Technician" value={technician.name} />
          <Field label="Certification" value={technician.cert} />
        </div>
      </SectionCard>

      {/* Checklist */}
      {checklist && (
        <SectionCard title="Checklist">
          <div className="space-y-1.5">
            {REFRIG_CHECKLIST.map(item => {
              const checked = !!checklist[item.id]
              return (
                <div key={item.id} className={`flex items-start gap-2.5 py-1 ${!checked ? 'opacity-40' : ''}`}>
                  {checked
                    ? <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                    : <Circle size={14} className="text-slate-300 flex-shrink-0 mt-0.5" />
                  }
                  <span className="text-sm text-slate-700">{item.label}</span>
                </div>
              )
            })}
          </div>
          {checklist && (
            <p className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-100">
              {checkedItems.length} of {REFRIG_CHECKLIST.length} items completed
              {uncheckedItems.length > 0 && ` · ${uncheckedItems.length} outstanding`}
            </p>
          )}
        </SectionCard>
      )}

      {/* Racks */}
      {racks.length > 0 && racks.map((rack: unknown, idx: number) => {
        const r = rack as Record<string, unknown>
        const label = (r.tabDisplayName as string) || `Rack ${rackLetter(idx)}`
        const compCount = (r.compressorCount as number) ?? 1
        const models = (r.compressorModels as string[]) ?? []
        const serials = (r.compressorSerials as string[]) ?? []
        const compAmps = (r.compAmps as string[]) ?? []
        const compVolts = (r.compVolts as string[]) ?? []
        const oilPots = (r.oilPotsPercent as string[]) ?? []
        const oilPress = (r.oilPress as string[]) ?? []
        const hpSet = (r.hpSetPoints as string[]) ?? []
        const lpSet = (r.lpSetPoints as string[]) ?? []

        return (
          <SectionCard key={r.id as string ?? idx} title={label}>
            <div className="space-y-4">
              {/* Overview */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Field label="Rack Manufacturer" value={r.rackManufacturer as string} />
                <Field label="Compressor Mfr" value={r.compressorManufacturer as string} />
                <Field label="Refrigerant" value={r.refrigerant as string} />
                <Field label="Rack Type" value={r.rackType as string} />
                <Field label="Oil Condition" value={r.oilConditionAcidTest as string} />
                <Field label="Condenser Condition" value={r.condenserConditions as string} />
                <Field label="Sight Glass" value={r.liquidLineSightGlass as string} />
                <Field label="Receiver Levels" value={r.receiverLevels as string} />
                <Field label="Suction Setpoint" value={r.suctionPressureSetpoint as string} />
                <Field label="Suction Actual" value={r.suctionPressureActual as string} />
                <Field label="Discharge Setpoint" value={r.dischargePressureSetpoint as string} />
                <Field label="Discharge Actual" value={r.dischargePressureActual as string} />
                <Field label="Control Voltage" value={r.controlVoltage as string} />
                <Field label="Reservoir %" value={r.reservoirPercent as string} />
                <Field label="Defrost Differential" value={r.defrostDifferential as string} />
                <Field label="Heat Reclaim" value={r.heatReclaim as string} />
              </div>

              {/* Compressor table */}
              {compCount > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="text-left px-3 py-2 font-semibold text-slate-500 border border-slate-200">Comp</th>
                        <th className="text-left px-3 py-2 font-semibold text-slate-500 border border-slate-200">Model</th>
                        <th className="text-left px-3 py-2 font-semibold text-slate-500 border border-slate-200">Serial</th>
                        <th className="text-left px-3 py-2 font-semibold text-slate-500 border border-slate-200">Amps</th>
                        <th className="text-left px-3 py-2 font-semibold text-slate-500 border border-slate-200">Volts</th>
                        <th className="text-left px-3 py-2 font-semibold text-slate-500 border border-slate-200">Oil Pot %</th>
                        <th className="text-left px-3 py-2 font-semibold text-slate-500 border border-slate-200">Oil Press</th>
                        <th className="text-left px-3 py-2 font-semibold text-slate-500 border border-slate-200">HP Set</th>
                        <th className="text-left px-3 py-2 font-semibold text-slate-500 border border-slate-200">LP Set</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: compCount }, (_, i) => (
                        <tr key={i} className="even:bg-slate-50/50">
                          <td className="px-3 py-2 border border-slate-200 font-medium text-slate-700">{i + 1}</td>
                          <td className="px-3 py-2 border border-slate-200 text-slate-600">{models[i] ?? '—'}</td>
                          <td className="px-3 py-2 border border-slate-200 text-slate-600">{serials[i] ?? '—'}</td>
                          <td className="px-3 py-2 border border-slate-200 text-slate-600">{compAmps[i] ?? '—'}</td>
                          <td className="px-3 py-2 border border-slate-200 text-slate-600">{compVolts[i] ?? '—'}</td>
                          <td className="px-3 py-2 border border-slate-200 text-slate-600">{oilPots[i] ?? '—'}</td>
                          <td className="px-3 py-2 border border-slate-200 text-slate-600">{oilPress[i] ?? '—'}</td>
                          <td className="px-3 py-2 border border-slate-200 text-slate-600">{hpSet[i] ?? '—'}</td>
                          <td className="px-3 py-2 border border-slate-200 text-slate-600">{lpSet[i] ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </SectionCard>
        )
      })}

      {/* Notes / Deficiencies */}
      {notes && notes.length > 0 && (
        <SectionCard title="Notes & Deficiencies">
          <div className="space-y-2.5">
            {notes.map((n, i) => {
              const badge = importanceBadge(n.importance)
              return (
                <div key={n.id ?? i} className={`flex items-start gap-3 px-3 py-2.5 rounded-lg border ${badge.cls}`}>
                  {badge.icon}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{n.text}</p>
                    {/* What the note is against. The form asks for all three; they
                        were recorded and then never shown on the report. */}
                    {noteMeta(n) && <p className="text-[11px] mt-0.5 opacity-70">{noteMeta(n)}</p>}
                  </div>
                  <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border flex-shrink-0 ${badge.cls}`}>
                    {n.importance}
                  </span>
                </div>
              )
            })}
          </div>
        </SectionCard>
      )}

      {/* Photos */}
      {photos.length > 0 && (
        <SectionCard title="Photos">
          <PhotoGallery photos={photos} />
        </SectionCard>
      )}
    </div>
  )
}

// ─── HVAC report view ─────────────────────────────────────────────────────────
function HvacView({ data }: { data: Record<string, unknown> }) {
  const units = data.units as Record<string, unknown> | null
  const checklist = data.checklist as Record<string, boolean> | null
  const notes = data.notes as Array<{ id: string; note: string; equipmentIndex: number | null; assetId: string; importance: string }> | null
  const photos = (data.photos as Array<{ url: string; label: string }>) ?? []
  const equipment = (units?.equipment as unknown[]) ?? []
  // Both PM forms save this as a plain string; older reports hold an object.
  const technician = technicianFrom(units?.technician)
  const storeAddress = units?.storeAddress as string | null

  /** A blank refrigerant on a gas unit heater or an exhaust fan is not missing
   *  data — the form never asks for it. Say so, rather than leaving a dash that
   *  reads like something the tech forgot. */
  const refrigerantCell = (e: Record<string, string>) => {
    if (e.refrigerantType) return e.refrigerantType
    return usesRefrigerant(e.type as EquipmentType) ? '—' : 'N/A'
  }

  const equipLabel = (type: string, area?: string) => {
    const map: Record<string, string> = {
      AIR_HANDLER: 'Air Handler', MAIN_AC: 'Main AC',
      RTU: area ? `RTU ${area}` : 'RTU',
      EXHAUST_FAN: area ? `EF ${area}` : 'Exhaust Fan',
      UNIT_HEATER: area ? `UH ${area}` : 'Unit Heater',
    }
    return map[type] ?? type
  }

  return (
    <div className="space-y-5">
      <SectionCard title="Site & Technician">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Field label="Store / Site" value={data.store_name as string} />
          <Field label="Address" value={storeAddress} />
          <Field label="Technician" value={technician.name} />
          <Field label="Certification" value={technician.cert} />
        </div>
      </SectionCard>

      {/* HVAC Checklist */}
      {checklist && (
        <SectionCard title="PM Checklist">
          <div className="space-y-1.5">
            {HVAC_CHECKLIST.map((label, i) => {
              const key = `item${i + 1}` as keyof typeof checklist
              const checked = !!checklist[key]
              return (
                <div key={i} className={`flex items-start gap-2.5 py-1 ${!checked ? 'opacity-40' : ''}`}>
                  {checked
                    ? <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                    : <Circle size={14} className="text-slate-300 flex-shrink-0 mt-0.5" />
                  }
                  <span className="text-sm text-slate-700">{label}</span>
                </div>
              )
            })}
          </div>
          <p className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-100">
            {Object.values(checklist).filter(Boolean).length} of {HVAC_CHECKLIST.length} items completed
          </p>
        </SectionCard>
      )}

      {/* Equipment */}
      {equipment.length > 0 && (
        <SectionCard title="Equipment">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left px-3 py-2 font-semibold text-slate-500 border border-slate-200">Unit</th>
                  <th className="text-left px-3 py-2 font-semibold text-slate-500 border border-slate-200">Brand</th>
                  <th className="text-left px-3 py-2 font-semibold text-slate-500 border border-slate-200">Model</th>
                  <th className="text-left px-3 py-2 font-semibold text-slate-500 border border-slate-200">Serial</th>
                  <th className="text-left px-3 py-2 font-semibold text-slate-500 border border-slate-200">Refrigerant</th>
                  <th className="text-left px-3 py-2 font-semibold text-slate-500 border border-slate-200">Voltage</th>
                </tr>
              </thead>
              <tbody>
                {equipment.map((eq: unknown, i: number) => {
                  const e = eq as Record<string, string>
                  return (
                    <tr key={e.id ?? i} className="even:bg-slate-50/50">
                      <td className="px-3 py-2 border border-slate-200 font-medium text-slate-700">{equipLabel(e.type, e.serviceArea)}</td>
                      <td className="px-3 py-2 border border-slate-200 text-slate-600">{e.brand || '—'}</td>
                      <td className="px-3 py-2 border border-slate-200 text-slate-600">{e.modelNumber || '—'}</td>
                      <td className="px-3 py-2 border border-slate-200 text-slate-600">{e.serialNumber || '—'}</td>
                      <td className="px-3 py-2 border border-slate-200 text-slate-600">{refrigerantCell(e)}</td>
                      <td className="px-3 py-2 border border-slate-200 text-slate-600">{e.voltage || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {/* Photos kept against individual units, shown per unit rather than
              folded into the report's own set so it stays clear which one they
              belong to. */}
          {equipment.some(eq => ((eq as { photos?: unknown[] }).photos ?? []).length > 0) && (
            <div className="mt-5 space-y-4 border-t border-slate-100 pt-4">
              {equipment.map((eq: unknown, i: number) => {
                const e = eq as Record<string, string> & { photos?: Array<{ url: string; label: string }> }
                const unitPhotos = e.photos ?? []
                if (unitPhotos.length === 0) return null
                return (
                  <div key={e.id ?? i}>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                      {equipLabel(e.type, e.serviceArea)}
                    </p>
                    <PhotoGallery photos={unitPhotos} className="grid grid-cols-2 md:grid-cols-4 gap-3 print:grid-cols-2" />
                  </div>
                )
              })}
            </div>
          )}
        </SectionCard>
      )}

      {/* Deficiencies */}
      {notes && notes.length > 0 && (
        <SectionCard title="Deficiencies">
          <div className="space-y-2.5">
            {notes.map((n, i) => {
              const badge = importanceBadge(n.importance)
              const eqLabel = n.equipmentIndex != null
                ? equipLabel((equipment[n.equipmentIndex] as Record<string, string>)?.type ?? '', (equipment[n.equipmentIndex] as Record<string, string>)?.serviceArea)
                : null
              return (
                <div key={n.id ?? i} className={`flex items-start gap-3 px-3 py-2.5 rounded-lg border ${badge.cls}`}>
                  {badge.icon}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{n.note}</p>
                    {eqLabel && <p className="text-[11px] mt-0.5 opacity-70">Unit: {eqLabel}</p>}
                    {n.assetId && <p className="text-[11px] mt-0.5 opacity-70">Asset: {n.assetId}</p>}
                  </div>
                  <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border flex-shrink-0 ${badge.cls}`}>
                    {n.importance}
                  </span>
                </div>
              )
            })}
          </div>
        </SectionCard>
      )}

      {/* Photos */}
      {photos.length > 0 && (
        <SectionCard title="Photos">
          <PhotoGallery photos={photos} />
        </SectionCard>
      )}
    </div>
  )
}

// ─── Individual report view ───────────────────────────────────────────────────
function IndividualView({ data }: { data: Record<string, unknown> }) {
  const photos = (data.photos as Array<{ url: string; label: string }>) ?? []
  const parts = (data.parts_needed as string[]) ?? []
  const issue = data.issue_explanation as string | null | undefined
  const steps = data.steps_taken as string | null | undefined
  const next = data.whats_next as string | null | undefined
  const equipment = data.equipment as (Record<string, string | null | undefined> & {
    specs?: Array<{ label: string; value: string }>
  }) | null | undefined
  const specs = equipment?.specs ?? []

  return (
    <div className="space-y-5">
      {equipment && (
        <SectionCard title="Equipment">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 mb-3">
            <Field label="Unit" value={equipment.name} />
            <Field label="Manufacturer" value={equipment.manufacturer} />
            <Field label="Model" value={equipment.model} />
            <Field label="Serial" value={equipment.serial_number} />
            <Field label="Refrigerant" value={equipment.refrigerant} />
            <Field label="Location" value={equipment.location} />
          </div>
          {specs.length > 0 && (
            <div className="rounded-xl border border-slate-100 overflow-hidden divide-y divide-slate-100">
              {specs.map((s, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2 odd:bg-slate-50/60">
                  <span className="text-xs text-slate-500 flex-1">{s.label}</span>
                  <span className="text-xs font-medium text-slate-700 text-right">{s.value}</span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      )}
      {issue && (
        <SectionCard title="Issue / Complaint">
          <p className="text-sm text-slate-800 whitespace-pre-wrap">{issue}</p>
        </SectionCard>
      )}
      {steps && (
        <SectionCard title="Steps Taken">
          <p className="text-sm text-slate-800 whitespace-pre-wrap">{steps}</p>
        </SectionCard>
      )}
      {next && (
        <SectionCard title="What's Next">
          <p className="text-sm text-slate-800 whitespace-pre-wrap">{next}</p>
        </SectionCard>
      )}
      {parts.length > 0 && (
        <SectionCard title="Parts Needed">
          <ul className="space-y-1.5">
            {parts.map((part, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-slate-700">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                {part}
              </li>
            ))}
          </ul>
        </SectionCard>
      )}
      {photos.length > 0 && (
        <SectionCard title="Photos">
          <PhotoGallery photos={photos} />
        </SectionCard>
      )}
    </div>
  )
}

// ─── Main content ─────────────────────────────────────────────────────────────
function ReportViewContent() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const id = params.id as string
  const type = searchParams.get('type') ?? 'pm'            // 'pm' | 'individual'
  const reportType = searchParams.get('report_type') ?? '' // 'refrigeration' | 'hvac' | ''

  const [data, setData] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [pdfBusy, setPdfBusy] = useState(false)
  const [pdfError, setPdfError] = useState('')

  useEffect(() => {
    if (!id) return
    const url = type === 'individual' ? `/api/individual-reports/${id}` : `/api/pm-reports/${id}`
    fetch(url)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => { setError('Failed to load report'); setLoading(false) })
  }, [id, type])

  /** The PDF is built here rather than printed from this page: the browser's
   *  own print output carries a URL and date stamp that cannot be styled away,
   *  and its page breaks come out of rules written for a screen layout. */
  async function handleDownloadPdf() {
    if (!data) return
    setPdfBusy(true)
    setPdfError('')
    try {
      const kind: ReportKind = type === 'individual' ? 'individual' : reportType === 'hvac' ? 'hvac' : 'refrigeration'
      // Loaded on demand — the PDF library is far larger than this page.
      const { downloadReportPdf } = await import('@/lib/reports/pdf')
      await downloadReportPdf(buildReportDoc(kind, data))
    } catch {
      setPdfError('Could not build the PDF. You can still use Print.')
    } finally {
      setPdfBusy(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    const url = type === 'individual' ? `/api/individual-reports/${id}` : `/api/pm-reports/${id}`
    await fetch(url, { method: 'DELETE' })
    router.push('/maintenance')
  }

  const editUrl = type === 'individual'
    ? `/maintenance/individual-report?id=${id}`
    : reportType === 'hvac'
      ? `/maintenance/hvac-pm?id=${id}`
      : `/maintenance/refrigeration-pm?id=${id}`

  const typeLabel = type === 'individual'
    ? 'Individual Report'
    : reportType === 'hvac' ? 'HVAC PM' : 'Refrigeration PM'

  const dateStr = data?.performed_at
    ? new Date(data.performed_at as string).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })
    : ''

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-sm text-slate-400">Loading report…</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-sm text-red-500">{error || 'Report not found'}</p>
      </div>
    )
  }

  const storeName = data.store_name as string | null | undefined
  const pmSeason = data.pm_season as string | null | undefined
  const simproNumber = data.simpro_number as string | null | undefined

  return (
    <>
      {/* Print / PDF styles */}
      <style>{`
        @media print {
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .no-print { display: none !important; }
          body { background: white !important; font-size: 11pt; }
          .print-page { background: white !important; padding: 0 !important; }
          .print-header { border-bottom: 2px solid #1e40af; padding-bottom: 10px; margin-bottom: 18px; }
          /* Cards used to refuse to split, so one that didn't fit in what was
             left of a page jumped to the next and left most of a page blank.
             Only small things that read badly when split are kept whole. */
          .bg-white { break-inside: auto; page-break-inside: auto; }
          thead { display: table-header-group; }
          tr, li { break-inside: avoid; page-break-inside: avoid; }
          h2 { break-after: avoid; page-break-after: avoid; }
          /* The horizontal scroller clips to the page width on paper, which is
             what sliced the last columns off the equipment table. */
          .overflow-x-auto { overflow: visible !important; }
          table { width: 100%; font-size: 8.5pt; table-layout: fixed; }
          td, th { word-break: break-word; overflow-wrap: anywhere; }
          th, td { padding: 4px 8px !important; border: 1px solid #cbd5e1 !important; }
          th { background: #f8fafc !important; font-weight: 600; }
          h2 { font-size: 9pt !important; letter-spacing: 0.08em !important; text-transform: uppercase; color: #475569 !important; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 10px; }
          .space-y-5 > * + * { margin-top: 16px !important; }
          .grid { display: grid !important; }
          /* Photos — let them breathe and show in full */
          img { max-width: 100% !important; height: auto !important; object-fit: contain !important; break-inside: avoid; page-break-inside: avoid; }
          @page { size: A4 portrait; margin: 14mm 12mm; }
        }
      `}</style>

      <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <PageHeader
          className="no-print"
          title={`${typeLabel}${storeName ? ` · ${storeName}` : ''}`}
          actions={
            <>
              <button
                onClick={handleDownloadPdf}
                disabled={pdfBusy}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50"
                title="Download this report as a PDF"
              >
                {pdfBusy ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                <span className="hidden sm:inline">{pdfBusy ? 'Building…' : 'PDF'}</span>
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
                title="Print this report"
              >
                <Printer size={14} />
                <span className="hidden sm:inline">Print</span>
              </button>
              <button
                onClick={() => router.push(editUrl)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
              >
                <Pencil size={14} />
                <span className="hidden sm:inline">Edit</span>
              </button>
              {showDeleteConfirm ? (
                <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5">
                  <span className="text-xs text-red-700 font-medium hidden sm:inline">Delete?</span>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="px-2 py-1 bg-red-600 text-white text-xs font-medium rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center gap-1"
                  >
                    {deleting && <Loader2 size={11} className="animate-spin" />}
                    {deleting ? '…' : 'Yes'}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-2 py-1 bg-white text-slate-600 text-xs font-medium rounded-md border border-slate-200 hover:bg-slate-50"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
                >
                  <Trash2 size={14} />
                  <span className="hidden sm:inline">Delete</span>
                </button>
              )}
            </>
          }
        />

        <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 space-y-5">
          {pdfError && (
            <p className="no-print text-xs text-amber-700 dark:text-amber-400 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              {pdfError}
            </p>
          )}
          {/* Report title block */}
          <div className="print-header">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-xl font-bold text-slate-900">{typeLabel}</h1>
                <p className="text-sm text-slate-500 mt-0.5">{storeName}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-slate-700">{dateStr}</p>
                {pmSeason && <p className="text-xs text-slate-400 mt-0.5">{pmSeason} PM</p>}
                {simproNumber && <p className="text-xs text-slate-400 mt-0.5">Simpro #{simproNumber}</p>}
              </div>
            </div>
          </div>

          {/* Type-specific content */}
          {type === 'individual' && <IndividualView data={data} />}
          {type === 'pm' && reportType === 'hvac' && <HvacView data={data} />}
          {type === 'pm' && reportType !== 'hvac' && <RefrigView data={data} />}
        </div>
      </div>
    </>
  )
}

export default function ReportViewPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center text-sm text-slate-400">Loading…</div>}>
      <ReportViewContent />
    </Suspense>
  )
}
