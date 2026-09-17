'use client'
import { useState } from 'react'
export default function DiagnosisTree({
  enabled,
  onDiagnose
}: {
  enabled: boolean
  onDiagnose: (system: string, component: string, failure: string) => void
}) {
  const [system, setSystem] = useState('')
  const [component, setComponent] = useState('')
  const [failure, setFailure] = useState('')
  const components =
    system === 'Defrost'
      ? ['Electric heaters', 'Termination control', 'Schedule']
      : ['TXV', 'Liquid solenoid', 'Evaporator fans']
  const failures =
    component === 'Electric heaters'
      ? [
          'Heater #1 open',
          'Heater #2 open',
          'Heater #3 open',
          'Grounded element'
        ]
      : ['Failed open', 'Incorrect adjustment']
  return (
    <section className="space-y-2">
      <h3 className="font-bold">Diagnosis tree</h3>
      {!enabled && (
        <p className="text-xs text-slate-400">
          Gather and record the defrost pattern, heater current and individual
          element readings first.
        </p>
      )}
      <fieldset disabled={!enabled} className="space-y-2 disabled:opacity-50">
        <label className="block text-xs">
          System
          <select
            aria-label="Diagnosis system"
            value={system}
            onChange={(e) => {
              setSystem(e.target.value)
              setComponent('')
              setFailure('')
            }}
            className="block w-full bg-slate-700 rounded p-3"
          >
            <option value="">Select system</option>
            {['Refrigeration', 'Defrost'].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        {system && (
          <label className="block text-xs">
            Component
            <select
              aria-label="Diagnosis component"
              value={component}
              onChange={(e) => {
                setComponent(e.target.value)
                setFailure('')
              }}
              className="block w-full bg-slate-700 rounded p-3"
            >
              <option value="">Select component</option>
              {components.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
        )}
        {component && (
          <label className="block text-xs">
            Failure
            <select
              aria-label="Diagnosis failure"
              value={failure}
              onChange={(e) => setFailure(e.target.value)}
              className="block w-full bg-slate-700 rounded p-3"
            >
              <option value="">Select failure</option>
              {failures.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
        )}
        <button
          disabled={!failure}
          onClick={() => onDiagnose(system, component, failure)}
          className="min-h-11 px-3 rounded bg-blue-700 disabled:opacity-40"
        >
          Submit diagnosis
        </button>
      </fieldset>
    </section>
  )
}
