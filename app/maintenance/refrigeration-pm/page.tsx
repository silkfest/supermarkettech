'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Plus, X, ChevronDown, Pencil, Loader2, BookOpen } from 'lucide-react'
import ManualFinderModal from '@/components/maintenance/ManualFinderModal'

// ─── Types ────────────────────────────────────────────────────────────────────

type PMSeason = '' | 'Spring' | 'Summer' | 'Fall' | 'Winter'
type RefrigerantType = 'R-404A' | 'R-448A' | 'R-449A' | 'R-507' | 'R-407A' | 'R-407C' | 'R-22' | 'R-134a' | 'R-744' | ''
type OilCondition = 'Good - No Test Done' | 'Good - Acid Test Passed' | 'Bad - Acid Test Failed' | ''
type CondenserCondition = 'Good' | 'CFM out' | 'Dirty Needs Cleaning' | ''
type SightGlass = 'Clear' | 'Flashing' | ''
type RackType = 'MT' | 'LT' | 'DT' | ''
type HowControlled = 'Thermostat - under case' | 'Thermostat - on top of case' | 'Pressure Control' | ''
type CondenserSetUp = 'Individual' | 'Rack Condenser' | ''
type Importance = 'CRITICAL' | 'IMPORTANT' | 'ROUTINE'
type UnitType = 'rack' | 'conventional'
type OtherComponentType =
  | 'Condenser Unit' | 'Rack Controller' | 'EEV Board' | 'Oil Separator'
  | 'Receiver' | 'Head Pressure Controller' | 'Defrost Board' | 'Other'

interface OtherComponent {
  id: string
  componentType: OtherComponentType | ''
  manufacturer: string
  model: string
  serial: string
  manualId: string
  manualTitle: string
}

const createArr8 = (): string[] => Array(8).fill('')
const RACK_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const rackLabel = (unitsList: UnitData[], idx: number): string => {
  const n = unitsList.filter((x, xi) => x.unitType === 'rack' && xi <= idx).length
  return `Rack ${RACK_LETTERS[n - 1] ?? n}`
}

interface UnitData {
  id: string
  unitType: UnitType
  tabDisplayName: string
  compressorCount: number
  compressorModels: string[]
  compressorSerials: string[]
  compressorManualIds: string[]
  compressorManualTitles: string[]
  otherComponents: OtherComponent[]
  // Shared
  compressorManufacturer: string
  refrigerant: RefrigerantType
  oilConditionAcidTest: OilCondition
  condenserConditions: CondenserCondition
  receiverLevels: string
  liquidLineSightGlass: SightGlass
  suctionPressureSetpoint: string
  suctionPressureActual: string
  dischargePressureSetpoint: string
  dischargePressureActual: string
  pressureDropDriers: string
  receiverPressure: string
  // Rack only
  rackManufacturer: string
  rackType: RackType
  reservoirPercent: string
  oilPotsPercent: string[]
  oilPress: string[]
  compAmps: string[]
  compVolts: string[]
  controlVoltage: string
  hpSetPoints: string[]
  lpSetPoints: string[]
  llAlarmTrip: string
  floatPercent: string
  tempF: string
  ofcTripTime: string[]
  defrostDifferential: string
  heatReclaim: string
  phaseProtector: string
  // Conventional only
  systemManufacturer: string
  systemIdentifier: string
  oilPotPercent_conventional: string
  oilPress_conventional: string
  compAmps_conventional: string
  compVolts_conventional: string
  controlPower: string
  howControlled: HowControlled
  condenserSetUp: CondenserSetUp
  hpSetpoint_conventional: string
  lpSetpoint_conventional: string
  ofcTrip_conventional: string
}

interface NoteItem {
  id: string
  text: string
  importance: Importance
  assetId: string
  rackIndex: number | null
  systemNumber: string
}

const createRack = (): UnitData => ({
  id: crypto.randomUUID(),
  unitType: 'rack',
  tabDisplayName: '',
  compressorCount: 2,
  compressorModels: createArr8(),
  compressorSerials: createArr8(),
  compressorManualIds: createArr8(),
  compressorManualTitles: createArr8(),
  otherComponents: [],
  compressorManufacturer: '',
  refrigerant: '',
  oilConditionAcidTest: '',
  condenserConditions: '',
  receiverLevels: '',
  liquidLineSightGlass: '',
  suctionPressureSetpoint: '',
  suctionPressureActual: '',
  dischargePressureSetpoint: '',
  dischargePressureActual: '',
  pressureDropDriers: '',
  receiverPressure: '',
  rackManufacturer: '',
  rackType: '',
  reservoirPercent: '',
  oilPotsPercent: createArr8(),
  oilPress: createArr8(),
  compAmps: createArr8(),
  compVolts: createArr8(),
  controlVoltage: '',
  hpSetPoints: createArr8(),
  lpSetPoints: createArr8(),
  llAlarmTrip: '',
  floatPercent: '',
  tempF: '',
  ofcTripTime: createArr8(),
  defrostDifferential: '',
  heatReclaim: '',
  phaseProtector: '',
  systemManufacturer: '',
  systemIdentifier: '',
  oilPotPercent_conventional: '',
  oilPress_conventional: '',
  compAmps_conventional: '',
  compVolts_conventional: '',
  controlPower: '',
  howControlled: '',
  condenserSetUp: '',
  hpSetpoint_conventional: '',
  lpSetpoint_conventional: '',
  ofcTrip_conventional: '',
})

const createConventional = (systemIdentifier: string): UnitData => ({
  ...createRack(),
  id: crypto.randomUUID(),
  unitType: 'conventional',
  systemIdentifier,
  tabDisplayName: systemIdentifier,
  oilPotsPercent: [],
  oilPress: [],
  compAmps: [],
  compVolts: [],
  hpSetPoints: [],
  lpSetPoints: [],
  ofcTripTime: [],
})

// ─── Checklist ────────────────────────────────────────────────────────────────

type ChecklistKey =
  'cl_leakCheckStore' | 'cl_cleanSelfContained' | 'cl_cleanCondensersPowerWash' |
  'cl_inspectCheckFans' | 'cl_testCompressorSafeties' | 'cl_checkCleanOilCoolingFans' |
  'cl_checkRunningOilPressures' | 'cl_checkOilLevelsUnitsRacks' | 'cl_checkGasChargeSightGlass' |
  'cl_checkReceiverPressureItem' | 'cl_checkRackPressures' | 'cl_checkPressureDifferentials' |
  'cl_checkDefrostSettings' | 'cl_checkElectricalPhase' | 'cl_checkReplaceOilFilters' |
  'cl_checkTagEprValves' | 'cl_checkCaseWalkinAirVelocityDrains' | 'cl_checkAdjustCaseTemps' |
  'cl_performOilAcidTests' | 'cl_checkComputerAlarms' | 'cl_checkHoneycombs' |
  'cl_verifyHeatReclaim' | 'cl_calibrateLeakDetector' | 'cl_checkFrozenFoodDoorsGasketsThermo' |
  'cl_checkWalkinFansCleanEvaps' | 'cl_checkCaseConditionFloor' | 'cl_inspectRefrigerationLines' |
  'cl_inspectDefrostSchedulesNoiseVibration' | 'cl_inspectFanMotorsBrushSweepClear' |
  'cl_cleanMachineRoom' | 'cl_picturesEmailed'

type ChecklistMap = Record<ChecklistKey, boolean>

const CHECKLIST_ITEMS: { id: ChecklistKey; label: string; condition?: string | string[] }[] = [
  { id: 'cl_leakCheckStore', label: 'Perform a complete leak check of entire store.' },
  { id: 'cl_cleanSelfContained', label: 'Clean all self contained condensers.' },
  { id: 'cl_cleanCondensersPowerWash', label: 'Clean all condensers. (Power Wash)', condition: 'Spring' },
  { id: 'cl_inspectCheckFans', label: 'Inspect condensers and start and check fans.' },
  { id: 'cl_testCompressorSafeties', label: "Test compressors oil failures and safety's in all modes." },
  { id: 'cl_checkCleanOilCoolingFans', label: 'Check and clean oil head cooling fans.' },
  { id: 'cl_checkRunningOilPressures', label: 'Check running oil pressures on all compressors.' },
  { id: 'cl_checkOilLevelsUnitsRacks', label: 'Check oil levels of all units and racks.' },
  { id: 'cl_checkGasChargeSightGlass', label: 'Check gas charge, sight glass and solid liquid column on receivers. (Tag level on indicator with date)' },
  { id: 'cl_checkReceiverPressureItem', label: 'Check each receiver pressure.' },
  { id: 'cl_checkRackPressures', label: 'Check rack suction and discharge pressures.' },
  { id: 'cl_checkPressureDifferentials', label: 'Check pressure differentials across each drier and suction core.' },
  { id: 'cl_checkDefrostSettings', label: 'Check pressure and settings on hot or cold gas defrosts.' },
  { id: 'cl_checkElectricalPhase', label: 'Check each electrical phase during compressor operation.' },
  { id: 'cl_checkReplaceOilFilters', label: 'Check and replace all oil filters as needed. (once yearly in Phase #1)' },
  { id: 'cl_checkTagEprValves', label: 'Check and tag each EPR valve pressure setting.' },
  { id: 'cl_checkCaseWalkinAirVelocityDrains', label: 'Check all cases and walk-ins for proper air velocity and drains.' },
  { id: 'cl_checkAdjustCaseTemps', label: 'Check and adjust display case temperatures.' },
  { id: 'cl_performOilAcidTests', label: 'Perform oil acid tests on racks. (Record results)', condition: ['Fall', 'Spring'] },
  { id: 'cl_checkComputerAlarms', label: 'Check computer for ongoing alarms and issues.' },
  { id: 'cl_checkHoneycombs', label: 'Check honeycombs' },
  { id: 'cl_verifyHeatReclaim', label: 'Verify heat reclaim operation.' },
  { id: 'cl_calibrateLeakDetector', label: 'Calibrate Leak detector' },
  { id: 'cl_checkFrozenFoodDoorsGasketsThermo', label: 'Check Frozen Food doors, door gaskets and thermometers' },
  { id: 'cl_checkWalkinFansCleanEvaps', label: 'Check walk in cooler fans and clean evaporators' },
  { id: 'cl_checkCaseConditionFloor', label: 'Check overall condition of Refrigeration cases on floor (kickplates, bumpers, ice build up, water leaks)' },
  { id: 'cl_inspectRefrigerationLines', label: 'Inspect refrigeration lines, Armaflex, Hangers & Cushion Clamps' },
  { id: 'cl_inspectDefrostSchedulesNoiseVibration', label: 'Inspect Frozen Food defrost schedules, noise or vibration on racks' },
  { id: 'cl_inspectFanMotorsBrushSweepClear', label: 'Inspect fan motors, brush off compressors, sweep machine room and clear machine room of any garbage or oil on floor.' },
  { id: 'cl_cleanMachineRoom', label: 'Clean Machine Room' },
  { id: 'cl_picturesEmailed', label: 'Pictures of Machine Room emailed to Office' },
]

const defaultChecklist = (): ChecklistMap =>
  Object.fromEntries(CHECKLIST_ITEMS.map(i => [i.id, false])) as ChecklistMap

const isChecklistVisible = (item: typeof CHECKLIST_ITEMS[0], season: PMSeason) => {
  if (!item.condition) return true
  const cond = Array.isArray(item.condition) ? item.condition : [item.condition]
  return season === '' || cond.includes(season)
}

const importanceBadge = (imp: Importance) => {
  if (imp === 'CRITICAL') return 'text-red-600 bg-red-50 border-red-200'
  if (imp === 'IMPORTANT') return 'text-amber-600 bg-amber-50 border-amber-200'
  return 'text-emerald-600 bg-emerald-50 border-emerald-200'
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const inputCls = 'w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white'
const labelCls = 'block text-xs font-medium text-slate-700 mb-1'
const narrowInput = 'w-full px-2 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-center'


function RackForm({ unit, onChange, equipmentId }: {
  unit: UnitData
  onChange: (field: keyof UnitData, value: unknown) => void
  equipmentId?: string
}) {
  const [descOpen, setDescOpen] = useState(true)
  const [oilOpen, setOilOpen] = useState(true)
  const [safetyOpen, setSafetyOpen] = useState(true)
  const [pressureOpen, setPressureOpen] = useState(true)
  const [componentsOpen, setComponentsOpen] = useState(true)
  // Manual finder modal — stores which slot is being targeted
  const [manualCompIdx, setManualCompIdx] = useState<number | null>(null)
  const [manualCompId, setManualCompId] = useState<string | null>(null)

  const addOtherComponent = () => {
    const newComp: OtherComponent = { id: crypto.randomUUID(), componentType: '', manufacturer: '', model: '', serial: '', manualId: '', manualTitle: '' }
    onChange('otherComponents', [...(unit.otherComponents ?? []), newComp])
  }
  const updateOtherComponent = (id: string, field: keyof OtherComponent, value: string) => {
    onChange('otherComponents', (unit.otherComponents ?? []).map(c => c.id === id ? { ...c, [field]: value } : c))
  }
  const removeOtherComponent = (id: string) => {
    onChange('otherComponents', (unit.otherComponents ?? []).filter(c => c.id !== id))
  }

  const updateArr = (field: 'oilPotsPercent' | 'oilPress' | 'compAmps' | 'compVolts' | 'hpSetPoints' | 'lpSetPoints' | 'ofcTripTime' | 'compressorModels' | 'compressorSerials' | 'compressorManualIds' | 'compressorManualTitles', i: number, v: string) => {
    const arr = [...(unit[field] as string[])]
    arr[i] = v
    onChange(field, arr)
  }

  const Section = ({ title, open, toggle, children }: { title: string; open: boolean; toggle: () => void; children: React.ReactNode }) => (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button onClick={toggle} className="w-full px-4 py-3 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors text-left">
        <span className="text-xs font-semibold text-slate-700">{title}</span>
        <ChevronDown size={14} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="p-4">{children}</div>}
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Description */}
      <Section title="Description" open={descOpen} toggle={() => setDescOpen(o => !o)}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Rack Manufacturer</label>
            <input value={unit.rackManufacturer} onChange={e => onChange('rackManufacturer', e.target.value)} className={inputCls} placeholder="e.g. Hussmann" />
          </div>
          <div>
            <label className={labelCls}>Compressor Manufacturer</label>
            <input value={unit.compressorManufacturer} onChange={e => onChange('compressorManufacturer', e.target.value)} className={inputCls} placeholder="e.g. Copeland" />
          </div>
          <div>
            <label className={labelCls}>Refrigerant</label>
            <select value={unit.refrigerant} onChange={e => onChange('refrigerant', e.target.value)} className={inputCls}>
              <option value="">Select</option>
              {['R-404A', 'R-448A', 'R-449A', 'R-507', 'R-407A', 'R-407C', 'R-22', 'R-134a', 'R-744'].map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Rack Type</label>
            <select value={unit.rackType} onChange={e => onChange('rackType', e.target.value)} className={inputCls}>
              <option value="">Select</option>
              <option value="MT">MT (Medium Temp)</option>
              <option value="LT">LT (Low Temp)</option>
              <option value="DT">DT (Dual Temp)</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Oil Condition / Acid Test</label>
            <select value={unit.oilConditionAcidTest} onChange={e => onChange('oilConditionAcidTest', e.target.value)} className={inputCls}>
              <option value="">Select</option>
              <option>Good - No Test Done</option>
              <option>Good - Acid Test Passed</option>
              <option>Bad - Acid Test Failed</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Condenser Conditions</label>
            <select value={unit.condenserConditions} onChange={e => onChange('condenserConditions', e.target.value)} className={inputCls}>
              <option value="">Select</option>
              <option>Good</option>
              <option>CFM out</option>
              <option>Dirty Needs Cleaning</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Liquid Line Sight Glass</label>
            <select value={unit.liquidLineSightGlass} onChange={e => onChange('liquidLineSightGlass', e.target.value)} className={inputCls}>
              <option value="">Select</option>
              <option>Clear</option>
              <option>Flashing</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Receiver Levels</label>
            <input value={unit.receiverLevels} onChange={e => onChange('receiverLevels', e.target.value)} className={inputCls} placeholder="e.g. 75%" />
          </div>
          <div>
            <label className={labelCls}>Control Voltage</label>
            <input value={unit.controlVoltage} onChange={e => onChange('controlVoltage', e.target.value)} className={inputCls} placeholder="e.g. 120V" />
          </div>
          <div>
            <label className={labelCls}>Reservoir %</label>
            <input value={unit.reservoirPercent} onChange={e => onChange('reservoirPercent', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>LL Alarm Trip</label>
            <input value={unit.llAlarmTrip} onChange={e => onChange('llAlarmTrip', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Float %</label>
            <input value={unit.floatPercent} onChange={e => onChange('floatPercent', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Temp (°F)</label>
            <input value={unit.tempF} onChange={e => onChange('tempF', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Defrost Differential</label>
            <input value={unit.defrostDifferential} onChange={e => onChange('defrostDifferential', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Heat Reclaim</label>
            <input value={unit.heatReclaim} onChange={e => onChange('heatReclaim', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Phase Protector</label>
            <input value={unit.phaseProtector} onChange={e => onChange('phaseProtector', e.target.value)} className={inputCls} />
          </div>
        </div>
      </Section>

      {/* Measurements / Oil */}
      <Section title="Measurements / Oil" open={oilOpen} toggle={() => setOilOpen(o => !o)}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: unit.compressorCount }, (_, i) => (
            <div key={i} className="bg-slate-50 rounded-lg p-3 space-y-2.5">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                <p className="text-[11px] font-semibold text-slate-700">Comp {i + 1}</p>
                {i === unit.compressorCount - 1 && unit.compressorCount > 2 && (
                  <button
                    type="button"
                    onClick={() => onChange('compressorCount', unit.compressorCount - 1)}
                    className="w-4 h-4 flex items-center justify-center rounded-full bg-red-100 text-red-500 hover:bg-red-200 text-xs font-bold leading-none"
                    title="Remove last compressor"
                  >−</button>
                )}
              </div>
              {/* Model / Serial */}
              <div>
                <label className="block text-[10px] text-slate-500 mb-0.5">Model</label>
                <input
                  value={(unit.compressorModels ?? [])[i] ?? ''}
                  onChange={e => updateArr('compressorModels', i, e.target.value)}
                  className={narrowInput}
                  placeholder="e.g. ZB45KCE"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-0.5">Serial #</label>
                <input
                  value={(unit.compressorSerials ?? [])[i] ?? ''}
                  onChange={e => updateArr('compressorSerials', i, e.target.value)}
                  className={narrowInput}
                  placeholder="S/N"
                />
              </div>
              {/* Manual link */}
              {(unit.compressorManualIds ?? [])[i] ? (
                <div className="flex items-center gap-1 px-1.5 py-1 bg-emerald-50 border border-emerald-200 rounded text-[10px] text-emerald-700">
                  <BookOpen size={9} />
                  <span className="truncate flex-1">{(unit.compressorManualTitles ?? [])[i] || 'Manual linked'}</span>
                  <button
                    type="button"
                    onClick={() => setManualCompIdx(i)}
                    className="text-emerald-500 hover:text-emerald-700 flex-shrink-0"
                    title="Change manual"
                  >✎</button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setManualCompIdx(i)}
                  className="w-full flex items-center justify-center gap-1 py-1 text-[10px] text-slate-400 border border-dashed border-slate-200 rounded hover:border-blue-300 hover:text-blue-500 transition-colors"
                >
                  <BookOpen size={9} /> Manual
                </button>
              )}
              <div className="border-t border-slate-200 pt-2 space-y-2">
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5">Oil Pots %</label>
                  <input value={unit.oilPotsPercent[i] ?? ''} onChange={e => updateArr('oilPotsPercent', i, e.target.value)} className={narrowInput} />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5">Oil Press</label>
                  <input value={unit.oilPress[i] ?? ''} onChange={e => updateArr('oilPress', i, e.target.value)} className={narrowInput} />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5">Comp Amps</label>
                  <input value={unit.compAmps[i] ?? ''} onChange={e => updateArr('compAmps', i, e.target.value)} className={narrowInput} />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5">Comp Volts</label>
                  <input value={unit.compVolts[i] ?? ''} onChange={e => updateArr('compVolts', i, e.target.value)} className={narrowInput} />
                </div>
              </div>
            </div>
          ))}
        </div>
        {unit.compressorCount < 8 && (
          <button
            type="button"
            onClick={() => onChange('compressorCount', unit.compressorCount + 1)}
            className="mt-3 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 border border-dashed border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
          >
            <Plus size={12} /> Add Compressor
          </button>
        )}
      </Section>

      {/* Safety Controls */}
      <Section title="Safety Controls" open={safetyOpen} toggle={() => setSafetyOpen(o => !o)}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: unit.compressorCount }, (_, i) => (
            <div key={i} className="bg-slate-50 rounded-lg p-3 space-y-2.5">
              <p className="text-[11px] font-semibold text-slate-700 text-center pb-1.5 border-b border-slate-200">Comp {i + 1}</p>
              <div>
                <label className="block text-[10px] text-slate-500 mb-0.5">HP Setpoint</label>
                <input value={unit.hpSetPoints[i] ?? ''} onChange={e => updateArr('hpSetPoints', i, e.target.value)} className={narrowInput} />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-0.5">LP Setpoint</label>
                <input value={unit.lpSetPoints[i] ?? ''} onChange={e => updateArr('lpSetPoints', i, e.target.value)} className={narrowInput} />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-0.5">OFC Trip Time</label>
                <input value={unit.ofcTripTime[i] ?? ''} onChange={e => updateArr('ofcTripTime', i, e.target.value)} className={narrowInput} />
              </div>
            </div>
          ))}
        </div>
        {unit.compressorCount < 8 && (
          <button
            type="button"
            onClick={() => onChange('compressorCount', unit.compressorCount + 1)}
            className="mt-3 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 border border-dashed border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
          >
            <Plus size={12} /> Add Compressor
          </button>
        )}
      </Section>

      {/* Pressures */}
      <Section title="Pressures" open={pressureOpen} toggle={() => setPressureOpen(o => !o)}>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Suction Pressure Setpoint</label>
            <input value={unit.suctionPressureSetpoint} onChange={e => onChange('suctionPressureSetpoint', e.target.value)} className={inputCls} placeholder="psig" />
          </div>
          <div>
            <label className={labelCls}>Suction Pressure Actual</label>
            <input value={unit.suctionPressureActual} onChange={e => onChange('suctionPressureActual', e.target.value)} className={inputCls} placeholder="psig" />
          </div>
          <div>
            <label className={labelCls}>Discharge Pressure Setpoint</label>
            <input value={unit.dischargePressureSetpoint} onChange={e => onChange('dischargePressureSetpoint', e.target.value)} className={inputCls} placeholder="psig" />
          </div>
          <div>
            <label className={labelCls}>Discharge Pressure Actual</label>
            <input value={unit.dischargePressureActual} onChange={e => onChange('dischargePressureActual', e.target.value)} className={inputCls} placeholder="psig" />
          </div>
          <div>
            <label className={labelCls}>Pressure Drop Driers</label>
            <input value={unit.pressureDropDriers} onChange={e => onChange('pressureDropDriers', e.target.value)} className={inputCls} placeholder="psig" />
          </div>
          <div>
            <label className={labelCls}>Receiver Pressure</label>
            <input value={unit.receiverPressure} onChange={e => onChange('receiverPressure', e.target.value)} className={inputCls} placeholder="psig" />
          </div>
        </div>
      </Section>

      {/* Other Components */}
      <Section title="Other Components" open={componentsOpen} toggle={() => setComponentsOpen(o => !o)}>
        <p className="text-xs text-slate-500 mb-3">
          Record model &amp; serial for condensers, controllers, EEV boards, etc.
          Upload their manuals via the <span className="font-medium text-blue-600">Documents</span> panel on the dashboard — the AI will automatically use them when diagnosing this equipment.
        </p>
        {(unit.otherComponents ?? []).length > 0 && (
          <div className="space-y-3 mb-3">
            {(unit.otherComponents ?? []).map(comp => (
              <div key={comp.id} className="bg-slate-50 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">Component Type</label>
                      <select
                        value={comp.componentType}
                        onChange={e => updateOtherComponent(comp.id, 'componentType', e.target.value)}
                        className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                      >
                        <option value="">Select…</option>
                        {(['Condenser Unit', 'Rack Controller', 'EEV Board', 'Oil Separator', 'Receiver', 'Head Pressure Controller', 'Defrost Board', 'Other'] as OtherComponentType[]).map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">Manufacturer</label>
                      <input value={comp.manufacturer} onChange={e => updateOtherComponent(comp.id, 'manufacturer', e.target.value)} placeholder="e.g. Emerson" className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">Model</label>
                      <input value={comp.model} onChange={e => updateOtherComponent(comp.id, 'model', e.target.value)} placeholder="Model #" className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">Serial #</label>
                      <input value={comp.serial} onChange={e => updateOtherComponent(comp.id, 'serial', e.target.value)} placeholder="S/N" className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white" />
                    </div>
                  </div>
                  {/* Manual button */}
                  <div className="mt-2 flex items-center gap-2">
                    {comp.manualId ? (
                      <div className="flex items-center gap-1.5 flex-1 px-2 py-1 bg-emerald-50 border border-emerald-200 rounded text-[10px] text-emerald-700">
                        <BookOpen size={10} />
                        <span className="truncate">{comp.manualTitle || 'Manual linked'}</span>
                        <button type="button" onClick={() => setManualCompId(comp.id)} className="ml-auto text-emerald-500 hover:text-emerald-700">✎</button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setManualCompId(comp.id)}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs text-slate-500 border border-dashed border-slate-300 rounded-lg hover:border-blue-300 hover:text-blue-600 transition-colors"
                      >
                        <BookOpen size={11} /> Find Manual
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeOtherComponent(comp.id)}
                    className="mt-1 flex-shrink-0 self-start text-slate-300 hover:text-red-500 transition-colors"
                  ><X size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={addOtherComponent}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 border border-dashed border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <Plus size={12} /> Add Component
        </button>
      </Section>
    </div>

    {/* Manual finder for a compressor slot */}
    {manualCompIdx !== null && (
      <ManualFinderModal
        manufacturer={unit.compressorManufacturer}
        model={(unit.compressorModels ?? [])[manualCompIdx] ?? ''}
        equipmentId={equipmentId}
        onClose={() => setManualCompIdx(null)}
        onLinked={doc => {
          updateArr('compressorManualIds', manualCompIdx, doc.id)
          updateArr('compressorManualTitles', manualCompIdx, doc.title)
          setManualCompIdx(null)
        }}
      />
    )}

    {/* Manual finder for an other component */}
    {manualCompId !== null && (unit.otherComponents ?? []).find(c => c.id === manualCompId) && (
      <ManualFinderModal
        manufacturer={(unit.otherComponents ?? []).find(c => c.id === manualCompId)!.manufacturer}
        model={(unit.otherComponents ?? []).find(c => c.id === manualCompId)!.model}
        equipmentId={equipmentId}
        onClose={() => setManualCompId(null)}
        onLinked={doc => {
          updateOtherComponent(manualCompId, 'manualId', doc.id)
          updateOtherComponent(manualCompId, 'manualTitle', doc.title)
          setManualCompId(null)
        }}
      />
    )}
  )
}

function ConventionalForm({ unit, onChange }: {
  unit: UnitData
  onChange: (field: keyof UnitData, value: unknown) => void
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className={labelCls}>System Manufacturer</label>
        <input value={unit.systemManufacturer} onChange={e => onChange('systemManufacturer', e.target.value)} className={inputCls} placeholder="e.g. Hussmann" />
      </div>
      <div>
        <label className={labelCls}>Compressor Manufacturer</label>
        <input value={unit.compressorManufacturer} onChange={e => onChange('compressorManufacturer', e.target.value)} className={inputCls} placeholder="e.g. Copeland" />
      </div>
      <div>
        <label className={labelCls}>Refrigerant</label>
        <select value={unit.refrigerant} onChange={e => onChange('refrigerant', e.target.value)} className={inputCls}>
          <option value="">Select</option>
          {['R-404A', 'R-448A', 'R-449A', 'R-507', 'R-407A', 'R-407C', 'R-22', 'R-134a', 'R-744'].map(r => <option key={r}>{r}</option>)}
        </select>
      </div>
      <div>
        <label className={labelCls}>Oil Condition / Acid Test</label>
        <select value={unit.oilConditionAcidTest} onChange={e => onChange('oilConditionAcidTest', e.target.value)} className={inputCls}>
          <option value="">Select</option>
          <option>Good - No Test Done</option>
          <option>Good - Acid Test Passed</option>
          <option>Bad - Acid Test Failed</option>
        </select>
      </div>
      <div>
        <label className={labelCls}>Condenser Conditions</label>
        <select value={unit.condenserConditions} onChange={e => onChange('condenserConditions', e.target.value)} className={inputCls}>
          <option value="">Select</option>
          <option>Good</option>
          <option>CFM out</option>
          <option>Dirty Needs Cleaning</option>
        </select>
      </div>
      <div>
        <label className={labelCls}>Condenser Set Up</label>
        <select value={unit.condenserSetUp} onChange={e => onChange('condenserSetUp', e.target.value)} className={inputCls}>
          <option value="">Select</option>
          <option value="Individual">Individual</option>
          <option value="Rack Condenser">Rack Condenser</option>
        </select>
      </div>
      <div>
        <label className={labelCls}>How Controlled</label>
        <select value={unit.howControlled} onChange={e => onChange('howControlled', e.target.value)} className={inputCls}>
          <option value="">Select</option>
          <option value="Thermostat - under case">Thermostat - under case</option>
          <option value="Thermostat - on top of case">Thermostat - on top of case</option>
          <option value="Pressure Control">Pressure Control</option>
        </select>
      </div>
      <div>
        <label className={labelCls}>Control Power</label>
        <input value={unit.controlPower} onChange={e => onChange('controlPower', e.target.value)} className={inputCls} placeholder="e.g. 120V" />
      </div>
      <div>
        <label className={labelCls}>Liquid Line Sight Glass</label>
        <select value={unit.liquidLineSightGlass} onChange={e => onChange('liquidLineSightGlass', e.target.value)} className={inputCls}>
          <option value="">Select</option>
          <option>Clear</option>
          <option>Flashing</option>
        </select>
      </div>
      <div>
        <label className={labelCls}>Receiver Levels</label>
        <input value={unit.receiverLevels} onChange={e => onChange('receiverLevels', e.target.value)} className={inputCls} />
      </div>
      <div className="md:col-span-2 border-t border-slate-100 pt-4">
        <p className="text-xs font-semibold text-slate-600 mb-3">Measurements</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className={labelCls}>Oil Pot %</label>
            <input value={unit.oilPotPercent_conventional} onChange={e => onChange('oilPotPercent_conventional', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Oil Press</label>
            <input value={unit.oilPress_conventional} onChange={e => onChange('oilPress_conventional', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Comp Amps</label>
            <input value={unit.compAmps_conventional} onChange={e => onChange('compAmps_conventional', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Comp Volts</label>
            <input value={unit.compVolts_conventional} onChange={e => onChange('compVolts_conventional', e.target.value)} className={inputCls} />
          </div>
        </div>
      </div>
      <div className="md:col-span-2 border-t border-slate-100 pt-4">
        <p className="text-xs font-semibold text-slate-600 mb-3">Safety Controls</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>HP Setpoint</label>
            <input value={unit.hpSetpoint_conventional} onChange={e => onChange('hpSetpoint_conventional', e.target.value)} className={inputCls} placeholder="psig" />
          </div>
          <div>
            <label className={labelCls}>LP Setpoint</label>
            <input value={unit.lpSetpoint_conventional} onChange={e => onChange('lpSetpoint_conventional', e.target.value)} className={inputCls} placeholder="psig" />
          </div>
          <div>
            <label className={labelCls}>OFC Trip</label>
            <input value={unit.ofcTrip_conventional} onChange={e => onChange('ofcTrip_conventional', e.target.value)} className={inputCls} />
          </div>
        </div>
      </div>
      <div className="md:col-span-2 border-t border-slate-100 pt-4">
        <p className="text-xs font-semibold text-slate-600 mb-3">Pressures</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>Suction Setpoint</label>
            <input value={unit.suctionPressureSetpoint} onChange={e => onChange('suctionPressureSetpoint', e.target.value)} className={inputCls} placeholder="psig" />
          </div>
          <div>
            <label className={labelCls}>Suction Actual</label>
            <input value={unit.suctionPressureActual} onChange={e => onChange('suctionPressureActual', e.target.value)} className={inputCls} placeholder="psig" />
          </div>
          <div>
            <label className={labelCls}>Discharge Setpoint</label>
            <input value={unit.dischargePressureSetpoint} onChange={e => onChange('dischargePressureSetpoint', e.target.value)} className={inputCls} placeholder="psig" />
          </div>
          <div>
            <label className={labelCls}>Discharge Actual</label>
            <input value={unit.dischargePressureActual} onChange={e => onChange('dischargePressureActual', e.target.value)} className={inputCls} placeholder="psig" />
          </div>
          <div>
            <label className={labelCls}>Pressure Drop Driers</label>
            <input value={unit.pressureDropDriers} onChange={e => onChange('pressureDropDriers', e.target.value)} className={inputCls} placeholder="psig" />
          </div>
          <div>
            <label className={labelCls}>Receiver Pressure</label>
            <input value={unit.receiverPressure} onChange={e => onChange('receiverPressure', e.target.value)} className={inputCls} placeholder="psig" />
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Content ─────────────────────────────────────────────────────────────

function RefrigerationPMContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const equipmentId = searchParams.get('equipmentId')
  const equipmentName = searchParams.get('equipmentName') ?? ''
  const editId = searchParams.get('id')

  // Store info
  const [storeName, setStoreName] = useState('')
  const [storeAddress, setStoreAddress] = useState('')
  const [technician, setTechnician] = useState('')
  const [performedAt, setPerformedAt] = useState(new Date().toISOString().slice(0, 10))
  const [season, setSeason] = useState<PMSeason>('')
  const [simproNumber, setSimproNumber] = useState('')

  // Units (racks + conventional)
  const [units, setUnits] = useState<UnitData[]>([createRack()])
  const [activeUnitId, setActiveUnitId] = useState<string>('')

  // Add unit modals
  const [showAddConventionalModal, setShowAddConventionalModal] = useState(false)
  const [newSysId, setNewSysId] = useState('')

  // Notes / deficiencies
  const [notes, setNotes] = useState<NoteItem[]>([])
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [noteImportance, setNoteImportance] = useState<Importance>('ROUTINE')
  const [noteAssetId, setNoteAssetId] = useState('')
  const [noteRackIndex, setNoteRackIndex] = useState<number | null>(null)
  const [noteSystemNumber, setNoteSystemNumber] = useState('')
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editNoteText, setEditNoteText] = useState('')
  const [editNoteImportance, setEditNoteImportance] = useState<Importance>('ROUTINE')
  const [editNoteAssetId, setEditNoteAssetId] = useState('')

  // Checklist
  const [checklist, setChecklist] = useState<ChecklistMap>(defaultChecklist())
  const [checklistOpen, setChecklistOpen] = useState(true)

  // Save
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  // Initialise active unit
  useEffect(() => {
    if (units.length > 0 && !activeUnitId) {
      setActiveUnitId(units[0].id)
    }
  }, [units, activeUnitId])

  // Load existing report
  useEffect(() => {
    if (!editId) return
    fetch(`/api/pm-reports/${editId}`).then(r => r.json()).then(d => {
      setStoreName(d.store_name ?? '')
      setSeason(d.pm_season ?? '')
      setSimproNumber(d.simpro_number ?? '')
      setPerformedAt(d.performed_at ? d.performed_at.slice(0, 10) : new Date().toISOString().slice(0, 10))
      if (d.checklist && typeof d.checklist === 'object') setChecklist({ ...defaultChecklist(), ...d.checklist })
      if (d.units && typeof d.units === 'object' && !Array.isArray(d.units)) {
        setStoreAddress(d.units.storeAddress ?? '')
        setTechnician(d.units.technician ?? '')
        if (Array.isArray(d.units.racks) && d.units.racks.length > 0) {
          // Back-compat: old reports stored full 8-slot arrays without compressorCount
          const normalised = d.units.racks.map((r: UnitData) => ({
            ...r,
            compressorCount: r.compressorCount ?? 8,
          }))
          setUnits(normalised)
          setActiveUnitId(normalised[0].id)
        }
      }
      if (Array.isArray(d.notes)) setNotes(d.notes)
    })
  }, [editId])

  // Unit helpers
  const updateUnit = (id: string, field: keyof UnitData, value: unknown) => {
    setUnits(prev => prev.map(u => u.id === id ? { ...u, [field]: value } : u))
  }

  const removeUnit = (id: string) => {
    setUnits(prev => {
      const next = prev.filter(u => u.id !== id)
      if (next.length === 0) return [createRack()]
      if (activeUnitId === id) setActiveUnitId(next[0].id)
      return next
    })
  }

  const addRack = () => {
    const rack = createRack()
    setUnits(prev => [...prev, rack])
    setActiveUnitId(rack.id)
  }

  const addConventional = () => {
    if (!newSysId.trim()) return
    const unit = createConventional(newSysId.trim())
    setUnits(prev => [...prev, unit])
    setActiveUnitId(unit.id)
    setNewSysId('')
    setShowAddConventionalModal(false)
  }

  // Checklist helpers
  const toggleCheck = (key: ChecklistKey) =>
    setChecklist(prev => ({ ...prev, [key]: !prev[key] }))

  const selectAll = (val: boolean) => {
    const updates: Partial<ChecklistMap> = {}
    CHECKLIST_ITEMS.filter(i => isChecklistVisible(i, season)).forEach(i => { updates[i.id] = val })
    setChecklist(prev => ({ ...prev, ...updates }))
  }

  // Note helpers
  const handleAddNote = () => {
    if (!noteText.trim()) return
    setNotes(prev => [...prev, {
      id: crypto.randomUUID(),
      text: noteText.trim(),
      importance: noteImportance,
      assetId: noteAssetId,
      rackIndex: noteRackIndex,
      systemNumber: noteSystemNumber,
    }])
    setNoteText(''); setNoteImportance('ROUTINE'); setNoteAssetId(''); setNoteRackIndex(null); setNoteSystemNumber('')
    setShowNoteModal(false)
  }

  const openEditNote = (n: NoteItem) => {
    setEditingNoteId(n.id); setEditNoteText(n.text)
    setEditNoteImportance(n.importance); setEditNoteAssetId(n.assetId)
  }

  const saveNoteEdit = () => {
    setNotes(prev => prev.map(n =>
      n.id === editingNoteId
        ? { ...n, text: editNoteText, importance: editNoteImportance, assetId: editNoteAssetId }
        : n
    ))
    setEditingNoteId(null)
  }

  // Save
  const handleSave = async () => {
    if (!storeName.trim()) { setError('Store name is required'); return }
    setSaving(true); setError('')
    const payload = {
      equipment_id: equipmentId ?? null,
      report_type: 'refrigeration',
      store_name: storeName,
      pm_season: season || null,
      performed_at: new Date(performedAt).toISOString(),
      simpro_number: simproNumber || null,
      checklist,
      units: { technician, storeAddress, racks: units },
      notes,
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

  const activeUnit = units.find(u => u.id === activeUnitId)
  const visibleChecklist = CHECKLIST_ITEMS.filter(i => isChecklistVisible(i, season))

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
          <span className="text-sm font-medium text-slate-700">Refrigeration PM</span>
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

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {error && <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}

        {/* ── Store Information ── */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
            <h2 className="text-sm font-semibold text-slate-800">Store Information</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Store / Site Name *</label>
              <input value={storeName} onChange={e => setStoreName(e.target.value)} className={inputCls} placeholder="e.g. Sobeys Bayers Lake" />
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
              <label className={labelCls}>PM Season</label>
              <select value={season} onChange={e => setSeason(e.target.value as PMSeason)} className={inputCls}>
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
            <h2 className="text-sm font-semibold text-slate-800">Service Checklist ({visibleChecklist.filter(i => checklist[i.id]).length}/{visibleChecklist.length} complete)</h2>
            <ChevronDown size={16} className={`text-slate-400 transition-transform ${checklistOpen ? 'rotate-180' : ''}`} />
          </button>
          {checklistOpen && (
            <div className="p-6 space-y-3">
              <label className="flex items-center gap-2 pb-3 border-b border-slate-100 cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  onChange={e => selectAll(e.target.checked)}
                  checked={visibleChecklist.length > 0 && visibleChecklist.every(i => checklist[i.id])}
                  readOnly={false}
                />
                <span className="text-sm font-medium text-slate-700">Select All</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {visibleChecklist.map(item => (
                  <label key={item.id} className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                      checked={checklist[item.id]}
                      onChange={() => toggleCheck(item.id)}
                    />
                    <span className="text-sm text-slate-700">
                      {item.label}
                      {item.condition && (
                        <span className="ml-1 text-[10px] text-slate-400">
                          ({Array.isArray(item.condition) ? item.condition.join('/') : item.condition} only)
                        </span>
                      )}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Rack / Unit Tabs ── */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">Racks & Conventional Units</h2>
            <div className="flex gap-2">
              <button
                onClick={addRack}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                <Plus size={13} /> Add Rack
              </button>
              <button
                onClick={() => { setNewSysId(''); setShowAddConventionalModal(true) }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-500 text-white rounded-lg hover:bg-emerald-600"
              >
                <Plus size={13} /> Add Conventional Unit
              </button>
            </div>
          </div>

          {/* Tab bar */}
          <div className="flex overflow-x-auto border-b border-slate-200 bg-white">
            {units.map((u, idx) => {
              const label = u.unitType === 'rack'
                ? rackLabel(units, idx)
                : u.systemIdentifier || `Conv ${idx + 1}`
              return (
                <button
                  key={u.id}
                  onClick={() => setActiveUnitId(u.id)}
                  className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium whitespace-nowrap border-r border-slate-200 transition-colors ${
                    activeUnitId === u.id ? 'bg-blue-50 text-blue-700 border-b-2 border-b-blue-500' : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${u.unitType === 'rack' ? 'bg-blue-400' : 'bg-emerald-400'}`} />
                  {label}
                  {units.length > 1 && (
                    <button
                      onClick={e => { e.stopPropagation(); removeUnit(u.id) }}
                      className="ml-1 text-slate-300 hover:text-red-500"
                    ><X size={10} /></button>
                  )}
                </button>
              )
            })}
          </div>

          {/* Active unit form */}
          {activeUnit && (
            <div className="p-6">
              {activeUnit.unitType === 'rack' ? (
                <RackForm
                  unit={activeUnit}
                  onChange={(field, value) => updateUnit(activeUnit.id, field, value)}
                  equipmentId={equipmentId ?? undefined}
                />
              ) : (
                <ConventionalForm
                  unit={activeUnit}
                  onChange={(field, value) => updateUnit(activeUnit.id, field, value)}
                />
              )}
            </div>
          )}
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
                          {n.rackIndex !== null && units[n.rackIndex] && (
                            <span>{rackLabel(units, n.rackIndex)}</span>
                          )}
                          {n.systemNumber && <span>System: {n.systemNumber}</span>}
                        </div>
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0">
                        <button onClick={() => openEditNote(n)} className="text-slate-300 hover:text-blue-500"><Pencil size={13} /></button>
                        <button onClick={() => setNotes(prev => prev.filter(x => x.id !== n.id))} className="text-slate-300 hover:text-red-500"><X size={13} /></button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ── Add Conventional Unit Modal ── */}
      {showAddConventionalModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-sm font-semibold text-slate-800 mb-1">Conventional Unit</h3>
            <p className="text-xs text-slate-500 mb-4">Enter a system identifier (e.g. System 1, Deli, Produce)</p>
            <input
              autoFocus
              value={newSysId}
              onChange={e => setNewSysId(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && newSysId.trim()) addConventional() }}
              className={inputCls}
              placeholder="System identifier…"
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={addConventional}
                className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
              >Add</button>
              <button
                onClick={() => setShowAddConventionalModal(false)}
                className="flex-1 px-4 py-2 text-sm bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200"
              >Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Note Modal ── */}
      {showNoteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-sm font-semibold text-slate-800">Add Note / Deficiency</h3>
            <div>
              <label className={labelCls}>Note *</label>
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
            {units.some(u => u.unitType === 'rack') && (
              <div>
                <label className={labelCls}>Related Rack (optional)</label>
                <select
                  value={noteRackIndex ?? ''}
                  onChange={e => setNoteRackIndex(e.target.value === '' ? null : Number(e.target.value))}
                  className={inputCls}
                >
                  <option value="">None</option>
                  {units.map((u, i) => u.unitType === 'rack' && (
                    <option key={u.id} value={i}>{rackLabel(units, i)}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <button onClick={handleAddNote} className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">Add</button>
              <button
                onClick={() => { setShowNoteModal(false); setNoteText(''); setNoteImportance('ROUTINE'); setNoteAssetId(''); setNoteRackIndex(null); setNoteSystemNumber('') }}
                className="flex-1 px-4 py-2 text-sm bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200"
              >Cancel</button>
            </div>
          </div>
        </div>
      )}
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
