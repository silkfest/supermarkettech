'use client'
import { useState } from 'react'
import { Check } from 'lucide-react'
import type { Step } from '@/lib/game/inspection/engine'

const SYSTEMS = ['Refrigeration', 'Defrost']
const COMPONENTS: Record<string, string[]> = {
  Defrost: ['Electric heaters', 'Termination control', 'Schedule'],
  Refrigeration: ['TXV', 'Liquid solenoid', 'Evaporator fans']
}
const FAILURES: Record<string, string[]> = {
  'Electric heaters': [
    'Heater #1 open',
    'Heater #2 open',
    'Heater #3 open',
    'Grounded element'
  ]
}
const DEFAULT_FAILURES = ['Failed open', 'Incorrect adjustment']

/** Three taps, not three dropdowns — the call is long enough already. */
export default function DiagnosisTree({
  enabled,
  checklist,
  onDiagnose
}: {
  enabled: boolean
  checklist: Step[]
  onDiagnose: (system: string, component: string, failure: string) => void
}) {
  const [system, setSystem] = useState('')
  const [component, setComponent] = useState('')
  const [failure, setFailure] = useState('')
  return (
    <section className="space-y-3">
      <h3 className="font-bold">Call the fault</h3>
      {!enabled && (
        <ul className="space-y-1" aria-label="Evidence still needed">
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
      )}
      <fieldset disabled={!enabled} className="space-y-3 disabled:opacity-50">
        <Row
          legend="System"
          options={SYSTEMS}
          value={system}
          onPick={(v) => {
            setSystem(v)
            setComponent('')
            setFailure('')
          }}
        />
        {system && (
          <Row
            legend="Component"
            options={COMPONENTS[system]}
            value={component}
            onPick={(v) => {
              setComponent(v)
              setFailure('')
            }}
          />
        )}
        {component && (
          <Row
            legend="Failure"
            options={FAILURES[component] ?? DEFAULT_FAILURES}
            value={failure}
            onPick={setFailure}
          />
        )}
        <button
          disabled={!failure}
          onClick={() => onDiagnose(system, component, failure)}
          className="w-full min-h-12 rounded-lg bg-blue-700 font-semibold text-sm disabled:opacity-40"
        >
          {failure ? `Call it: ${failure}` : 'Submit diagnosis'}
        </button>
      </fieldset>
    </section>
  )
}

function Row({
  legend,
  options,
  value,
  onPick
}: {
  legend: string
  options: string[]
  value: string
  onPick: (v: string) => void
}) {
  return (
    <div role="radiogroup" aria-label={`Diagnosis ${legend.toLowerCase()}`}>
      <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-1">
        {legend}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {options.map((o) => (
          <button
            key={o}
            role="radio"
            aria-checked={value === o}
            onClick={() => onPick(o)}
            className={`min-h-11 px-2 py-2 rounded-lg border text-xs text-left ${value === o ? 'border-blue-300 bg-blue-800 text-white' : 'border-slate-600 bg-slate-800 text-slate-200'}`}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  )
}
