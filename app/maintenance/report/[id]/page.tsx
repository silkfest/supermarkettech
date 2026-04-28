'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams, useParams } from 'next/navigation'
import { ArrowLeft, Home, Printer, Pencil, CheckCircle2, Circle, AlertTriangle, Info, AlertCircle } from 'lucide-react'

// ─── Refrigeration checklist labels ───────────────────────────────────────────
const REFRIG_CHECKLIST: { id: string; label: string }[] = [
  { id: 'cl_leakCheckStore', label: 'Perform a complete leak check of entire store.' },
  { id: 'cl_cleanSelfContained', label: 'Clean all self contained condensers.' },
  { id: 'cl_cleanCondensersPowerWash', label: 'Clean all condensers. (Power Wash)' },
  { id: 'cl_inspectCheckFans', label: 'Inspect condensers and start and check fans.' },
  { id: 'cl_testCompressorSafeties', label: "Test compressors oil failures and safety's in all modes." },
  { id: 'cl_checkCleanOilCoolingFans', label: 'Check and clean oil head cooling fans.' },
  { id: 'cl_checkRunningOilPressures', label: 'Check running oil pressures on all compressors.' },
  { id: 'cl_checkOilLevelsUnitsRacks', label: 'Check oil levels of all units and racks.' },
  { id: 'cl_checkGasChargeSightGlass', label: 'Check gas charge, sight glass and solid liquid column on receivers.' },
  { id: 'cl_checkReceiverPressureItem', label: 'Check each receiver pressure.' },
  { id: 'cl_checkRackPressures', label: 'Check rack suction and discharge pressures.' },
  { id: 'cl_checkPressureDifferentials', label: 'Check pressure differentials across each drier and suction core.' },
  { id: 'cl_checkDefrostSettings', label: 'Check pressure and settings on hot or cold gas defrosts.' },
  { id: 'cl_checkElectricalPhase', label: 'Check each electrical phase during compressor operation.' },
  { id: 'cl_checkReplaceOilFilters', label: 'Check and replace all oil filters as needed.' },
  { id: 'cl_checkTagEprValves', label: 'Check and tag each EPR valve pressure setting.' },
  { id: 'cl_checkCaseWalkinAirVelocityDrains', label: 'Check all cases and walk-ins for proper air velocity and drains.' },
  { id: 'cl_checkAdjustCaseTemps', label: 'Check and adjust display case temperatures.' },
  { id: 'cl_performOilAcidTests', label: 'Perform oil acid tests on racks. (Record results)' },
  { id: 'cl_checkComputerAlarms', label: 'Check computer for ongoing alarms and issues.' },
  { id: 'cl_checkHoneycombs', label: 'Check honeycombs' },
  { id: 'cl_verifyHeatReclaim', label: 'Verify heat reclaim operation.' },
  { id: 'cl_calibrateLeakDetector', label: 'Calibrate Leak detector' },
  { id: 'cl_checkFrozenFoodDoorsGasketsThermo', label: 'Check Frozen Food doors, door gaskets and thermometers' },
  { id: 'cl_checkWalkinFansCleanEvaps', label: 'Check walk in cooler fans and clean evaporators' },
  { id: 'cl_checkCaseConditionFloor', label: 'Check overall condition of Refrigeration cases on floor' },
  { id: 'cl_inspectRefrigerationLines', label: 'Inspect refrigeration lines, Armaflex, Hangers & Cushion Clamps' },
  { id: 'cl_inspectDefrostSchedulesNoiseVibration', label: 'Inspect Frozen Food defrost schedules, noise or vibration on racks' },
  { id: 'cl_inspectFanMotorsBrushSweepClear', label: 'Inspect fan motors, brush off compressors, sweep machine room.' },
  { id: 'cl_cleanMachineRoom', label: 'Clean Machine Room' },
  { id: 'cl_picturesEmailed', label: 'Pictures of Machine Room emailed to Office' },
]

const HVAC_CHECKLIST = [
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

const RACK_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

function importanceBadge(imp: string) {
  if (imp === 'CRITICAL') return { cls: 'text-red-700 bg-red-50 border-red-200', icon: <AlertCircle size={12} className="text-red-500" /> }
  if (imp === 'IMPORTANT') return { cls: 'text-amber-700 bg-amber-50 border-amber-200', icon: <AlertTriangle size={12} className="text-amber-500" /> }
  return { cls: 'text-emerald-700 bg-emerald-50 border-emerald-200', icon: <Info size={12} className="text-emerald-500" /> }
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden print:border-slate-300 print:rounded-none print:shadow-none print:mb-4">
      <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 print:bg-white print:border-slate-200">
        <h2 className="text-xs font-semibold text-slate-600 uppercase tracking-widest">{title}</h2>
      </div>
      <div className="px-6 py-5">{children}</div>
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
  const notes = data.notes as Array<{ id: string; text: string; importance: string }> | null
  const racks = (units?.racks as unknown[]) ?? []
  const technician = units?.technician as Record<string, string> | null
  const storeAddress = units?.storeAddress as string | null

  const checkedItems = REFRIG_CHECKLIST.filter(i => checklist?.[i.id])
  const uncheckedItems = REFRIG_CHECKLIST.filter(i => checklist && checklist[i.id] === false)

  const rackLetter = (idx: number) => RACK_LETTERS[idx] ?? String(idx + 1)

  return (
    <div className="space-y-5">
      {/* Technician / Site */}
      <SectionCard title="Site & Technician">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Field label="Store / Site" value={data.store_name as string} />
          <Field label="Address" value={storeAddress} />
          <Field label="Technician" value={technician?.name} />
          <Field label="Certification" value={technician?.cert} />
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
                  <span className="text-sm flex-1">{n.text}</span>
                  <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border ${badge.cls}`}>
                    {n.importance}
                  </span>
                </div>
              )
            })}
          </div>
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
  const equipment = (units?.equipment as unknown[]) ?? []
  const technician = units?.technician as Record<string, string> | null
  const storeAddress = units?.storeAddress as string | null

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
          <Field label="Technician" value={technician?.name} />
          <Field label="Certification" value={technician?.cert} />
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
                      <td className="px-3 py-2 border border-slate-200 text-slate-600">{e.refrigerantType || '—'}</td>
                      <td className="px-3 py-2 border border-slate-200 text-slate-600">{e.voltage || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
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
    </div>
  )
}

// ─── Individual report view ───────────────────────────────────────────────────
function IndividualView({ data }: { data: Record<string, unknown> }) {
  const photos = (data.photos as Array<{ url: string; label: string }>) ?? []
  const parts = (data.parts_needed as string[]) ?? []

  return (
    <div className="space-y-5">
      {data.issue_explanation && (
        <SectionCard title="Issue / Complaint">
          <p className="text-sm text-slate-800 whitespace-pre-wrap">{data.issue_explanation as string}</p>
        </SectionCard>
      )}
      {data.steps_taken && (
        <SectionCard title="Steps Taken">
          <p className="text-sm text-slate-800 whitespace-pre-wrap">{data.steps_taken as string}</p>
        </SectionCard>
      )}
      {data.whats_next && (
        <SectionCard title="What's Next">
          <p className="text-sm text-slate-800 whitespace-pre-wrap">{data.whats_next as string}</p>
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
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {photos.map((p, i) => (
              <div key={i} className="space-y-1">
                <img src={p.url} alt={p.label} className="w-full h-36 object-cover rounded-lg border border-slate-200" />
                {p.label && <p className="text-xs text-slate-500 truncate">{p.label}</p>}
              </div>
            ))}
          </div>
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

  useEffect(() => {
    if (!id) return
    const url = type === 'individual' ? `/api/individual-reports/${id}` : `/api/pm-reports/${id}`
    fetch(url)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => { setError('Failed to load report'); setLoading(false) })
  }, [id, type])

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

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .print-header { border-bottom: 1px solid #cbd5e1; padding-bottom: 12px; margin-bottom: 20px; }
        }
      `}</style>

      <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between no-print">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/dashboard')} className="text-slate-400 hover:text-slate-600" title="Dashboard">
              <Home size={18} />
            </button>
            <button onClick={() => router.back()} className="text-slate-400 hover:text-slate-600">
              <ArrowLeft size={18} />
            </button>
            <div className="flex items-baseline gap-0.5">
              <span className="text-lg font-bold text-blue-600">Cold</span>
              <span className="text-lg font-bold text-slate-800">IQ</span>
            </div>
            <span className="text-slate-400">/</span>
            <span className="text-sm font-medium text-slate-700">{typeLabel}</span>
            {data.store_name && (
              <><span className="text-slate-400">/</span><span className="text-sm text-slate-500">{data.store_name as string}</span></>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              <Printer size={14} />
              Print / PDF
            </button>
            <button
              onClick={() => router.push(editUrl)}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
            >
              <Pencil size={14} />
              Edit
            </button>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6 py-8 space-y-5">
          {/* Report title block */}
          <div className="print-header">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-xl font-bold text-slate-900">{typeLabel}</h1>
                <p className="text-sm text-slate-500 mt-0.5">{data.store_name as string}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-slate-700">{dateStr}</p>
                {data.pm_season && <p className="text-xs text-slate-400 mt-0.5">{data.pm_season as string} PM</p>}
                {data.simpro_number && <p className="text-xs text-slate-400 mt-0.5">Simpro #{data.simpro_number as string}</p>}
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
