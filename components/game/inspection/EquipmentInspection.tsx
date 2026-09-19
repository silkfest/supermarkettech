'use client'
import { useMemo, useState } from 'react'
import { Check, HelpCircle, MapPin, X } from 'lucide-react'
import { scoreCall } from '@/lib/game/engine'
import { defOf, type InspectionDef } from '@/lib/game/inspection/defs'
import {
  canDiagnose,
  canVerify,
  diagnoseChecklist,
  guidance,
  verifyChecklist
} from '@/lib/game/inspection/engine'
import type {
  ComponentId,
  InspectionAction,
  InspectionState,
  InspectionTool
} from '@/lib/game/inspection/types'
import type { ActiveCall, CallResult } from '@/lib/game/types'
import type { ToolId } from '@/lib/game/tools'
import { MeasurementInstrument } from '../InstrumentPanel'
import EquipmentScene from './EquipmentScene'
import EvidenceNotebook from './EvidenceNotebook'
import DiagnosisTree from './DiagnosisTree'
import ServiceDebrief from './ServiceDebrief'

/** Short badge shown on every action, so which tool does what is still learned —
 * it is just no longer a switch you have to flip before the job. */
const TOOL_LABEL: Partial<Record<InspectionTool, string>> = {
  flashlight: 'Flashlight',
  multimeter: 'Multimeter',
  clamp: 'Clamp meter',
  thermometer: 'Temp probe',
  controller: 'Controller',
  hands: 'Hand tools'
}
type Group = 'look' | 'measure' | 'circuit' | 'repair'
const GROUPS: { id: Group; title: string }[] = [
  { id: 'look', title: 'Look it over' },
  { id: 'measure', title: 'Take a reading' },
  { id: 'circuit', title: 'Work the circuit' },
  { id: 'repair', title: 'Repair' }
]
type Tab = 'work' | 'notebook' | 'diagnosis' | 'report'
const TABS: { id: Tab; label: string }[] = [
  { id: 'work', label: 'Work' },
  { id: 'notebook', label: 'Notebook' },
  { id: 'diagnosis', label: 'Diagnose' },
  { id: 'report', label: 'Report' }
]

export default function EquipmentInspection({
  call,
  result,
  owned,
  onAction,
  onComplete,
  onClose
}: {
  call: ActiveCall | null
  result?: CallResult
  owned: Set<ToolId>
  onAction: (action: InspectionAction) => void
  onComplete: (result: CallResult) => void
  onClose: () => void
}) {
  const [selected, setSelected] = useState<ComponentId>('product')
  const [measurementId, setMeasurementId] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('work')
  // Tied to the step it was asked about, so the ladder resets itself when the
  // call moves on without any render-time state juggling.
  const [hint, setHint] = useState({ step: '', level: 0 })
  const s = call?.inspection
  const def = s ? defOf(s) : null
  const measurement = def?.measurements.find((m) => m.id === measurementId)
  // Full Supermarket's first slice supplies loaner meters if career progression
  // has not unlocked them yet. No permanent rank/tool/save changes are made.
  const loaned = useMemo(
    () =>
      (['multimeter', 'clamp', 'thermometer', 'controller', 'hands'] as const)
        .filter((t) => !owned.has(t as ToolId))
        .map((t) => TOOL_LABEL[t]),
    [owned]
  )
  const stepKey = s ? guidance(s).text : ''
  const shownHints = hint.step === stepKey ? hint.level : 0
  const actions =
    s && def ? buildActions(s, def, selected, onAction, setMeasurementId) : []
  return (
    <div className="h-full flex flex-col bg-slate-900 text-slate-100 rounded-xl border border-slate-600 overflow-hidden">
      <header className="p-3 border-b border-slate-700 flex items-start gap-2">
        <div className="flex-1">
          <p className="text-[10px] text-amber-300 uppercase tracking-widest">
            Equipment inspection
          </p>
          <h2 className="font-bold text-sm">{def?.ticket}</h2>
        </div>
        <button
          onClick={onClose}
          aria-label="Back to supermarket"
          className="min-h-11 min-w-11 grid place-items-center"
        >
          <X size={18} />
        </button>
      </header>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {result ? (
          <ServiceDebrief result={result} />
        ) : s && call ? (
          <>
            <p className="text-xs text-slate-300">{def?.report}</p>
            <nav className="grid grid-cols-4 gap-1" aria-label="Inspection pages">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  aria-pressed={tab === t.id}
                  onClick={() => setTab(t.id)}
                  className={`min-h-11 px-1 py-2 rounded-lg border text-xs ${tab === t.id ? 'border-amber-400 bg-slate-800 text-amber-200' : 'border-slate-600 bg-slate-800 text-slate-300'}`}
                >
                  {t.label}
                  {t.id === 'notebook' && s.evidence.length > 0 && (
                    <span className="ml-1 text-[10px] text-slate-400">
                      {s.evidence.length}
                    </span>
                  )}
                  {t.id === 'diagnosis' && canDiagnose(s) && !s.diagnosis && (
                    <span className="ml-1 text-emerald-400">&bull;</span>
                  )}
                  {t.id === 'report' && canVerify(s) && (
                    <span className="ml-1 text-emerald-400">&bull;</span>
                  )}
                </button>
              ))}
            </nav>
            {s.feedback && (
              <p
                role="status"
                className="text-xs bg-slate-800 border-l-2 border-amber-400 p-3"
              >
                {s.feedback}
              </p>
            )}
            <NextStep
              state={s}
              hintLevel={shownHints}
              onHint={() => setHint({ step: stepKey, level: shownHints + 1 })}
              onGo={(area) => {
                setSelected(area)
                setMeasurementId(null)
                setTab('work')
              }}
            />
            {tab === 'work' && (
              <>
                <EquipmentScene
                  state={s}
                  selected={selected}
                  onSelect={(id) => {
                    setSelected(id)
                    setMeasurementId(null)
                  }}
                />
<StatusLine state={s} def={def!} />
                {GROUPS.map((g) => {
                  const items = actions.filter((a) => a.group === g.id)
                  if (!items.length) return null
                  return (
                    <section key={g.id} aria-label={g.title}>
                      <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-1">
                        {g.title}
                      </p>
                      <div className="space-y-1.5">
                        {items.map((a) => (
                          <button
                            key={a.key}
                            onClick={a.run}
                            className="w-full min-h-12 px-3 py-2 rounded-lg border border-slate-600 bg-slate-800 hover:bg-slate-700 text-left flex items-center gap-2"
                          >
                            <span className="text-xs flex-1">{a.label}</span>
                            <span className="text-[9px] uppercase tracking-wide text-amber-300 border border-amber-700 rounded px-1.5 py-0.5 flex-shrink-0">
                              {TOOL_LABEL[a.tool]}
                            </span>
                          </button>
                        ))}
                      </div>
                    </section>
                  )
                })}
                {measurement && (
                  <MeasurementInstrument
                    key={measurement.id}
                    measurement={measurement}
                    reading={
                      [...s.evidence]
                        .reverse()
                        .find(
                          (e) =>
                            (e.id === measurement.id ||
                              e.id === def!.readingAliases[measurement.id]) &&
                            e.phase === (s.repaired ? 'after' : 'before')
                        )?.value
                    }
                    onSample={(mode, terminals) =>
                      onAction({
                        type: 'measure',
                        measurement: measurement.id,
                        mode,
                        terminals,
                        tool: measurement.tool
                      })
                    }
                  />
                )}
                <section aria-label="Let it run">
                  <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-1">
                    Let it run
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      className="min-h-12 rounded-lg border border-slate-600 bg-slate-800 text-xs"
                      onClick={() => onAction({ type: 'wait', minutes: 3 })}
                    >
                      Watch 3 min
                    </button>
                    <button
                      className="min-h-12 rounded-lg border border-slate-600 bg-slate-800 text-xs"
                      onClick={() => onAction({ type: 'wait', minutes: 10 })}
                    >
                      Wait 10 min
                    </button>
                  </div>
                </section>
                {!!loaned.length && (
                  <p className="text-[10px] text-slate-400">
                    Dispatch loaners for this call: {loaned.join(', ')}.
                  </p>
                )}
              </>
            )}
            {tab === 'notebook' && <EvidenceNotebook evidence={s.evidence} />}
            {tab === 'diagnosis' && (
              <>
                <DiagnosisTree
                  tree={def!.diagnosis}
                  enabled={canDiagnose(s) && !s.diagnosis}
                  checklist={diagnoseChecklist(s)}
                  onDiagnose={(system, component, failure) =>
                    onAction({ type: 'diagnose', system, component, failure })
                  }
                />
                {s.diagnosis && (
                  <p className="text-xs text-emerald-300">
                    {s.diagnosis}. Fit the part on the Work page.
                  </p>
                )}
              </>
            )}
            {tab === 'report' && (
              <ReportTab
                state={s}
                def={def!}
                onAction={onAction}
                onComplete={(note) =>
                  onComplete(scoreCall(call, def!.fault, note))
                }
              />
            )}
          </>
        ) : null}
      </div>
    </div>
  )
}

/** The one line that says what to do, a button that takes you to the spot, and
 * a Stuck? ladder that gives up more detail each press rather than all at once. */
function NextStep({
  state,
  hintLevel,
  onHint,
  onGo
}: {
  state: InspectionState
  hintLevel: number
  onHint: () => void
  onGo: (area: ComponentId) => void
}) {
  const g = guidance(state)
  const shown = g.hints.slice(0, hintLevel)
  const more = hintLevel < g.hints.length
  return (
    <section
      aria-label="Next step"
      className="text-xs text-blue-100 bg-blue-950/60 border border-blue-900 rounded-lg p-2 space-y-2"
    >
      <div>
        <span className="text-[10px] uppercase tracking-widest text-blue-400 block">
          Next
        </span>
        {g.text}
      </div>
      {shown.map((h, i) => (
        <p key={h} className="text-[11px] text-blue-300 border-l-2 border-blue-700 pl-2">
          {i === g.hints.length - 1 ? <b>{h}</b> : h}
        </p>
      ))}
      <div className="flex gap-2">
        {g.area && (
          <button
            onClick={() => onGo(g.area!)}
            className="min-h-10 px-3 rounded-lg border border-blue-600 bg-blue-900/60 text-[11px] flex items-center gap-1"
          >
            <MapPin size={11} /> Take me there
          </button>
        )}
        {more && (
          <button
            onClick={onHint}
            className="min-h-10 px-3 rounded-lg border border-slate-600 bg-slate-800 text-[11px] text-slate-300 flex items-center gap-1"
          >
            <HelpCircle size={11} /> {hintLevel ? 'More help' : 'Stuck?'}
          </button>
        )}
      </div>
    </section>
  )
}

interface UiAction {
  key: string
  group: Group
  label: string
  tool: InspectionTool
  run: () => void
}

/** Every action names the tool it takes and reaches for it itself. The engine
 * still enforces the same prerequisites — this only removes the extra tap. */
/** What the case is doing right now, in the terms of the call you are on. */
function StatusLine({
  state: s,
  def
}: {
  state: InspectionState
  def: InspectionDef
}) {
  const circuit = def.id === 'f2-evap-fan' ? 'Fan' : 'Heater'
  const mode =
    def.id === 'f2-evap-fan'
      ? (s.fans ?? []).every(Boolean)
        ? 'All three fans running'
        : 'One fan stopped'
      : s.defrostStarted !== null
        ? 'Defrost running — ends when you end it'
        : s.terminatedAt !== null
          ? 'Refrigeration / pull-down'
          : 'Refrigeration'
  return (
    <p className="text-xs text-slate-300">
      {mode} &middot;{' '}
      {s.isolated
        ? s.provedDead
          ? `${circuit} circuit proved dead`
          : `${circuit} disconnect OFF; verify dead`
        : `${circuit} circuit available`}
      {s.coverOpen ? ' \u00b7 cover off' : ''}
    </p>
  )
}

function buildActions(
  s: InspectionState,
  def: InspectionDef,
  selected: ComponentId,
  onAction: (a: InspectionAction) => void,
  openMeter: (id: string | null) => void
): UiAction[] {
  const out: UiAction[] = []
  const add = (
    key: string,
    group: Group,
    label: string,
    tool: InspectionTool,
    run: () => void
  ) => out.push({ key, group, label, tool, run })
  const act = (a: InspectionAction) => () => {
    openMeter(null)
    onAction(a)
  }
  const meter = (id: string) => () => openMeter(id)

  if (selected === 'controller') {
    add('look', 'look', 'Read the controller and its history', 'controller', act({ type: 'observe', component: 'controller', tool: 'controller' }))
    if (def.id === 'f1-defrost') {
      if (s.defrostStarted === null)
        add('defrost', 'circuit', 'Request a manual defrost', 'controller', act({ type: 'force-defrost', tool: 'controller' }))
      else
        add('enddefrost', 'circuit', 'End the defrost', 'controller', act({ type: 'end-defrost', tool: 'controller' }))
      if (s.diagnosis && !s.repaired)
        add('rep-term', 'repair', 'Replace termination control · $75', 'hands', act({ type: 'replace', part: 'termination', tool: 'hands' }))
    }
  } else {
    add('look', 'look', def.lookLabels[selected] ?? `Inspect the ${LOOK_LABEL[selected]}`, 'flashlight', act({ type: 'observe', component: selected, tool: 'flashlight' }))
  }

  if (selected === 'product')
    add(
      'probe',
      'measure',
      def.id === 'f2-evap-fan'
        ? 'Insert probe into product at the warm end'
        : 'Probe between the product packs',
      'thermometer',
      meter('product')
    )

  if (def.id === 'f2-evap-fan') {
    if (selected === 'product')
      for (const [i, where] of ['supply', 'centre', 'return'].entries())
        add(`air${i + 1}`, 'measure', `Read the discharge air at the ${where} end`, 'thermometer', meter(`air${i + 1}`))
    if (selected === 'electrical' || selected === 'fans') {
      add('cover', 'circuit', s.coverOpen ? 'Secure the fan compartment cover' : 'Open the fan compartment cover', 'hands', act({ type: s.coverOpen ? 'close-cover' : 'open-cover', tool: 'hands' }))
      add('clampit', 'measure', 'Clamp the fan circuit conductor', 'clamp', meter('circuit'))
      if (!s.isolated)
        add('isolate', 'circuit', 'Secure the fan disconnect OFF', 'hands', act({ type: 'isolate', tool: 'hands' }))
      add('dead', 'measure', s.isolated ? 'Prove the circuit dead' : 'Check for voltage', 'multimeter', meter('dead'))
      add('leads', 'measure', 'Check voltage at the stopped motor leads', 'multimeter', meter('leads'))
      if (s.isolated && !s.leadsDisconnected)
        add('disconnect', 'circuit', 'Separate the motor leads', 'hands', act({ type: 'disconnect', tool: 'hands' }))
      if (s.isolated || s.leadsDisconnected || s.coverOpen)
        add('restore', 'circuit', 'Reconnect, secure covers and restore', 'hands', act({ type: 'restore', tool: 'hands' }))
    }
    if (selected === 'fans')
      for (const n of [1, 2, 3]) {
        add(`m${n}`, 'measure', `Ohm fan motor ${n} winding`, 'multimeter', meter(`m${n}`))
        add(`mg${n}`, 'measure', `Ohm fan motor ${n} to the case frame`, 'multimeter', meter(`mg${n}`))
        if (s.diagnosis && !s.repaired)
          add(`rep${n}`, 'repair', `Replace fan motor ${n} · $95`, 'hands', act({ type: 'replace', part: `M${n}`, tool: 'hands' }))
      }
    if (selected === 'fans' && s.diagnosis && !s.repaired)
      add('rep-all', 'repair', 'Replace all three fan motors · $285', 'hands', act({ type: 'replace', part: 'all-motors', tool: 'hands' }))
    return out
  }

  if (selected === 'electrical' || selected === 'heaters') {
    add(
      'cover',
      'circuit',
      s.coverOpen ? 'Secure the service cover' : 'Remove the service cover',
      'hands',
      act({ type: s.coverOpen ? 'close-cover' : 'open-cover', tool: 'hands' })
    )
    add('clampit', 'measure', 'Clamp the heater feeder', 'clamp', meter('current'))
    if (!s.isolated)
      add('isolate', 'circuit', 'Secure the heater disconnect OFF', 'hands', act({ type: 'isolate', tool: 'hands' }))
    add('dead', 'measure', s.isolated ? 'Prove the circuit dead' : 'Check for voltage', 'multimeter', meter('dead'))
    if (s.isolated && !s.leadsDisconnected)
      add('disconnect', 'circuit', 'Disconnect one lead per element', 'hands', act({ type: 'disconnect', tool: 'hands' }))
    if (s.isolated || s.leadsDisconnected || s.coverOpen)
      add('restore', 'circuit', 'Reconnect, secure covers and restore', 'hands', act({ type: 'restore', tool: 'hands' }))
  }

  if (selected === 'heaters')
    for (const n of [1, 2, 3]) {
      add(`e${n}`, 'measure', `Ohm heater ${n} across its terminals`, 'multimeter', meter(`e${n}`))
      add(`g${n}`, 'measure', `Ohm heater ${n} to the case frame`, 'multimeter', meter(`g${n}`))
      if (s.diagnosis && !s.repaired)
        add(`rep${n}`, 'repair', `Replace heater ${n} · $140`, 'hands', act({ type: 'replace', part: `H${n}`, tool: 'hands' }))
    }

  return out
}
const LOOK_LABEL: Record<ComponentId, string> = {
  product: 'doors and product',
  controller: 'controller',
  coil: 'evaporator coil',
  fans: 'fan bank',
  heaters: 'heater access',
  txv: 'TXV',
  solenoid: 'liquid solenoid',
  drain: 'drain and pan',
  electrical: 'defrost circuit'
}

/** The written report is the one place the notebook still has to be turned into
 * words. Chips assemble it from what was actually found, so a phone keyboard is
 * not the thing standing between a finished repair and a closed work order. */
function ReportTab({
  state: s,
  def,
  onAction,
  onComplete
}: {
  state: InspectionState
  def: InspectionDef
  onAction: (a: InspectionAction) => void
  onComplete: (note: string) => void
}) {
  const checklist = verifyChecklist(s)
  const ready = canVerify(s)
  const fanCall = def.id === 'f2-evap-fan'
  const chips: { label: string; text: string }[] = []
  if (s.diagnosis) chips.push({ label: 'Found', text: `Found: ${s.diagnosis}.` })
  // The headline reading differs per call: heater feeder current on the defrost
  // job, fan circuit current on the fan job.
  const key = s.evidence.find(
    (e) => e.id === (fanCall ? 'circuit' : 'current') && e.phase === 'before'
  )
  if (key)
    chips.push({
      label: 'Measured',
      text: fanCall
        ? `Measured ${key.value} on the fan circuit.`
        : `Measured ${key.value} on the heater feeder against 8.7 A nameplate.`
    })
  if (s.repairs.length)
    chips.push({ label: 'Repaired', text: `${s.repairs.join('; ')}.` })
  if (s.verified)
    chips.push({
      label: 'Verified',
      text: fanCall
        ? 'Verified full fan circuit current, even discharge air the length of the case, the heavy frost cleared and product pull-down.'
        : 'Verified full defrost current, a cleared coil, temperature termination and pull-down.'
    })
  const append = (text: string) =>
    onAction({ type: 'note', value: s.note ? `${s.note.trim()} ${text}` : text })
  return (
    <section className="space-y-3">
      <h3 className="font-bold">Verify and close the work order</h3>
      <ul className="space-y-1" aria-label="Verification checklist">
        {checklist.map((c) => (
          <li
            key={c.label}
            className={`flex items-start gap-2 text-xs ${c.done ? 'text-emerald-300' : 'text-slate-400'}`}
          >
            <span className="mt-0.5 w-4 flex-shrink-0">
              {c.done ? <Check size={12} /> : '○'}
            </span>
            {c.label}
          </li>
        ))}
      </ul>
      {!s.verified && (
        <button
          className="w-full min-h-12 rounded-lg border border-slate-600 bg-slate-800 text-xs disabled:opacity-40"
          disabled={!ready}
          onClick={() => onAction({ type: 'verify' })}
        >
          {ready ? 'Confirm verified operation' : 'Finish the checks above first'}
        </button>
      )}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-1">
          Service report
        </p>
        {!!chips.length && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {chips.map((c) => (
              <button
                key={c.label}
                onClick={() => append(c.text)}
                className="min-h-9 px-2.5 rounded-full border border-blue-700 bg-blue-950 text-[11px] text-blue-200"
              >
                + {c.label}
              </button>
            ))}
          </div>
        )}
        <textarea
          aria-label="Service report"
          value={s.note}
          onChange={(e) => onAction({ type: 'note', value: e.target.value })}
          rows={5}
          placeholder="Observed… Measured… Replaced… Verified…"
          className="block w-full p-2 rounded bg-slate-800 border border-slate-600 text-xs"
        />
      </div>
      <button
        className="w-full min-h-12 rounded-lg bg-emerald-800 font-semibold text-sm disabled:opacity-40"
        disabled={!s.verified || !ready || s.note.trim().length < 20}
        onClick={() => onComplete(s.note.trim())}
      >
        Complete report and view debrief
      </button>
    </section>
  )
}
