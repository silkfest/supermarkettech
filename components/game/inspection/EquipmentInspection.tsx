'use client'
import { useState } from 'react'
import { X } from 'lucide-react'
import { scoreCall } from '@/lib/game/engine'
import {
  F1_FAULT,
  F1_REPORT,
  F1_TICKET,
  MEASUREMENTS
} from '@/lib/game/inspection/f1'
import { canDiagnose, canVerify } from '@/lib/game/inspection/engine'
import type {
  ComponentId,
  InspectionAction,
  InspectionTool
} from '@/lib/game/inspection/types'
import type { ActiveCall, CallResult } from '@/lib/game/types'
import type { ToolId } from '@/lib/game/tools'
import { MeasurementInstrument } from '../InstrumentPanel'
import EquipmentScene from './EquipmentScene'
import EvidenceNotebook from './EvidenceNotebook'
import DiagnosisTree from './DiagnosisTree'
import ServiceDebrief from './ServiceDebrief'

const BAG: { id: InspectionTool; label: string }[] = [
  { id: 'flashlight', label: 'Flashlight' },
  { id: 'multimeter', label: 'Multimeter' },
  { id: 'clamp', label: 'Clamp meter' },
  { id: 'thermometer', label: 'Temp probe' },
  { id: 'controller', label: 'Controller' },
  { id: 'hands', label: 'Hand tools' }
]
const btn =
  'min-h-11 px-3 py-2 rounded-lg border border-slate-600 bg-slate-800 hover:bg-slate-700 text-xs disabled:opacity-40'
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
  const [tool, setTool] = useState<InspectionTool>('flashlight')
  const [selected, setSelected] = useState<ComponentId>('product')
  const [measurementId, setMeasurementId] = useState<string | null>(null)
  const [tab, setTab] = useState<
    'inspect' | 'evidence' | 'diagnosis' | 'report'
  >('inspect')
  const s = call?.inspection
  const measurement = MEASUREMENTS.find((m) => m.id === measurementId)
  // Full Supermarket's first slice supplies loaner meters if career progression
  // has not unlocked them yet. No permanent rank/tool/save changes are made.
  const loaned = BAG.filter(
    (t) => t.id !== 'flashlight' && !owned.has(t.id as ToolId)
  )
  function action(a: InspectionAction) {
    onAction(a)
  }
  function measure(id: string) {
    setMeasurementId(id)
  }
  return (
    <div className="h-full flex flex-col bg-slate-900 text-slate-100 rounded-xl border border-slate-600 overflow-hidden">
      <header className="p-3 border-b border-slate-700 flex items-start gap-2">
        <div className="flex-1">
          <p className="text-[10px] text-amber-300 uppercase tracking-widest">
            Equipment inspection
          </p>
          <h2 className="font-bold text-sm">{F1_TICKET}</h2>
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
            <p className="text-xs text-slate-300">{F1_REPORT}</p>
            <nav
              className="grid grid-cols-4 gap-1"
              aria-label="Inspection pages"
            >
              {(['inspect', 'evidence', 'diagnosis', 'report'] as const).map(
                (t) => (
                  <button
                    key={t}
                    aria-pressed={tab === t}
                    onClick={() => setTab(t)}
                    className={`${btn} capitalize px-1 ${tab === t ? 'border-amber-400 text-amber-200' : ''}`}
                  >
                    {t}
                  </button>
                )
              )}
            </nav>
            {s.feedback && (
              <p
                role="status"
                className="text-xs bg-slate-800 border-l-2 border-amber-400 p-3"
              >
                {s.feedback}
              </p>
            )}
            {tab === 'inspect' && (
              <>
                <EquipmentScene
                  state={s}
                  selected={selected}
                  onSelect={(id) => {
                    setSelected(id)
                    setMeasurementId(null)
                  }}
                />
                <p className="text-xs text-slate-300">
                  {s.defrostStarted !== null
                    ? 'Defrost running'
                    : s.terminatedAt !== null
                      ? 'Refrigeration / pull-down'
                      : 'Refrigeration'}{' '}
                  ·{' '}
                  {s.isolated
                    ? s.provedDead
                      ? 'Heater circuit proved dead'
                      : 'Heater disconnect OFF; verify dead'
                    : 'Heater circuit available'}
                </p>
                <div
                  role="toolbar"
                  aria-label="Technician tools"
                  className="grid grid-cols-3 gap-1"
                >
                  {BAG.map((t) => (
                    <button
                      key={t.id}
                      aria-pressed={tool === t.id}
                      onClick={() => {
                        setTool(t.id)
                        setMeasurementId(null)
                      }}
                      className={`${btn} px-1 ${tool === t.id ? 'bg-blue-800 border-blue-300' : ''}`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                {!!loaned.length && (
                  <p className="text-[10px] text-slate-400">
                    Dispatch loaners for this call:{' '}
                    {loaned.map((t) => t.label).join(', ')}.
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  <button
                    className={btn}
                    onClick={() =>
                      action({ type: 'observe', component: selected, tool })
                    }
                  >
                    Use {tool === 'controller' ? 'interface' : 'flashlight'} on
                    selected area
                  </button>
                  {selected === 'product' && (
                    <button className={btn} onClick={() => measure('product')}>
                      Position temperature probe
                    </button>
                  )}
                  {selected === 'controller' && (
                    <button
                      className={btn}
                      onClick={() => action({ type: 'force-defrost', tool })}
                    >
                      Request manual defrost
                    </button>
                  )}
                  {(selected === 'electrical' || selected === 'heaters') && (
                    <>
                      {!s.coverOpen && (
                        <button
                          className={btn}
                          onClick={() => action({ type: 'open-cover', tool })}
                        >
                          Remove service cover
                        </button>
                      )}
                      {s.coverOpen && (
                        <button
                          className={btn}
                          onClick={() => action({ type: 'close-cover', tool })}
                        >
                          Secure service cover
                        </button>
                      )}
                      <button
                        className={btn}
                        onClick={() => action({ type: 'isolate', tool })}
                      >
                        Secure heater disconnect OFF
                      </button>
                      <button className={btn} onClick={() => measure('dead')}>
                        Voltage test points
                      </button>
                      <button
                        className={btn}
                        onClick={() => action({ type: 'disconnect', tool })}
                      >
                        Disconnect element leads
                      </button>
                      <button
                        className={btn}
                        onClick={() => measure('current')}
                      >
                        Feeder clamp position
                      </button>
                      <button
                        className={btn}
                        onClick={() => action({ type: 'restore', tool })}
                      >
                        Reconnect / secure covers / restore
                      </button>
                    </>
                  )}
                  {selected === 'heaters' &&
                    [1, 2, 3].map((n) => (
                      <div
                        key={n}
                        className="flex flex-wrap gap-1 border border-slate-600 rounded p-1"
                      >
                        <button
                          className={btn}
                          onClick={() => measure(`e${n}`)}
                        >
                          H{n} terminals
                        </button>
                        <button
                          className={btn}
                          onClick={() => measure(`g${n}`)}
                        >
                          H{n} → frame
                        </button>
                        {s.diagnosis && (
                          <button
                            className={btn}
                            onClick={() =>
                              action({ type: 'replace', part: `H${n}`, tool })
                            }
                          >
                            Replace H{n} · $140
                          </button>
                        )}
                      </div>
                    ))}
                  {selected === 'controller' && s.diagnosis && (
                    <button
                      className={btn}
                      onClick={() =>
                        action({ type: 'replace', part: 'termination', tool })
                      }
                    >
                      Replace termination control · $75
                    </button>
                  )}
                </div>
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
                              (measurement.id === 'current' &&
                                e.id === 'current-off') ||
                              (measurement.id === 'dead' && e.id === 'live')) &&
                            e.phase === (s.repaired ? 'after' : 'before')
                        )?.value
                    }
                    onSample={(mode, terminals) =>
                      action({
                        type: 'measure',
                        measurement: measurement.id,
                        mode,
                        terminals,
                        tool
                      })
                    }
                  />
                )}
                <div className="flex gap-2">
                  <button
                    className={btn}
                    onClick={() => action({ type: 'wait', minutes: 3 })}
                  >
                    Watch / wait 3 min
                  </button>
                  <button
                    className={btn}
                    onClick={() => action({ type: 'wait', minutes: 10 })}
                  >
                    Wait 10 min
                  </button>
                </div>
                <p className="text-[10px] text-slate-400">
                  Readings remain unknown until sampled. Open Evidence to record
                  observations and measurements.
                </p>
              </>
            )}
            {tab === 'evidence' && (
              <EvidenceNotebook
                evidence={s.evidence}
                onRecord={(id) => action({ type: 'record', id })}
              />
            )}
            {tab === 'diagnosis' && (
              <>
                <DiagnosisTree
                  enabled={canDiagnose(s)}
                  onDiagnose={(system, component, failure) =>
                    action({ type: 'diagnose', system, component, failure })
                  }
                />
                {s.diagnosis && (
                  <p className="text-xs text-emerald-300">
                    {s.diagnosis}. Use hand tools at the heater access to
                    repair.
                  </p>
                )}
              </>
            )}
            {tab === 'report' && (
              <>
                <h3 className="font-bold">Verify and close the work order</h3>
                <p className="text-xs">
                  Record the post-repair feeder current during defrost, cleared
                  coil, controller termination and product temperature after
                  pull-down. Secure the service cover.
                </p>
                <button
                  className={btn}
                  onClick={() => action({ type: 'verify' })}
                >
                  {canVerify(s)
                    ? 'Confirm verified operation'
                    : 'Review verification requirements'}
                </button>
                <label className="block text-xs">
                  Service report
                  <textarea
                    aria-label="Service report"
                    value={s.note}
                    onChange={(e) =>
                      action({ type: 'note', value: e.target.value })
                    }
                    rows={5}
                    placeholder="Observed… Measured… Replaced… Verified…"
                    className="block w-full mt-2 p-2 rounded bg-slate-800 border border-slate-600"
                  />
                </label>
                <button
                  className={`${btn} bg-emerald-800 w-full`}
                  disabled={
                    !s.verified || !canVerify(s) || s.note.trim().length < 20
                  }
                  onClick={() =>
                    onComplete(scoreCall(call, F1_FAULT, s.note.trim()))
                  }
                >
                  Complete report and view debrief
                </button>
              </>
            )}
          </>
        ) : null}
      </div>
    </div>
  )
}
