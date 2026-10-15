'use client'

import { useId, useState } from 'react'

export const EJECTOR_VIEWS = {
  defrost: { label: 'Carnot defrost return', suction: 'Defrost return', inlet: 'Evaporator after heat release', detail: 'Patent embodiment: receiver supplies the defrost circuit; ejector assists return to the receiver. Optional supply heating and control valves omitted.' },
  gas: { label: 'Gas lift · HP example', suction: 'MT vapour', inlet: 'MT evaporator suction', detail: 'Danfoss HP example: MT vapour is lifted to the receiver. Parallel compressors draw receiver vapour; they are not shown here.' },
  liquid: { label: 'Liquid recovery · LE', suction: 'Collected liquid', inlet: 'Suction accumulator', detail: 'Danfoss LE example: recover accumulator liquid to the receiver. Accumulator level protection and suitable case controls are required.' },
} as const

export function EjectorFlowDiagram() {
  const [mode, setMode] = useState<keyof typeof EJECTOR_VIEWS>('defrost')
  const marker = useId().replace(/:/g, '')
  const v = EJECTOR_VIEWS[mode]
  return <figure className="my-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-4">
    <figcaption className="font-semibold text-slate-900 dark:text-slate-100">Three ports, different jobs</figcaption>
    <div className="my-3 flex flex-wrap gap-2" role="group" aria-label="Ejector application">
      {(Object.keys(EJECTOR_VIEWS) as Array<keyof typeof EJECTOR_VIEWS>).map(key => <button type="button" key={key} aria-pressed={mode === key} onClick={() => setMode(key)} className={`min-h-11 rounded-lg border px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 ${mode === key ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200'}`}>{EJECTOR_VIEWS[key].label}</button>)}
    </div>
    <svg viewBox="0 0 360 370" role="img" aria-label={`${v.label}: high-pressure motive plus ${v.suction}, mixed discharge to receiver`} className="w-full max-w-lg mx-auto text-slate-800 dark:text-slate-100">
      <defs><marker id={marker} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="context-stroke" /></marker></defs>
      <rect x="95" y="8" width="250" height="50" rx="8" fill="none" stroke="currentColor" />
      <text x="220" y="29" textAnchor="middle" fill="currentColor" fontSize="14">High-pressure cooled CO₂</text>
      <text x="220" y="47" textAnchor="middle" fill="currentColor" fontSize="12">Cooling stage / gas cooler</text>
      <path d="M220 58V130" stroke="#d97706" strokeWidth="4" markerEnd={`url(#${marker})`} />
      <text x="232" y="100" fill="currentColor" fontSize="13">Motive</text>
      <rect x="5" y="125" width="140" height="65" rx="8" fill="none" stroke="currentColor" />
      <text x="75" y="149" textAnchor="middle" fill="currentColor" fontSize="12">{v.suction}</text>
      <text x="75" y="172" textAnchor="middle" fill="currentColor" fontSize="10">{v.inlet}</text>
      <path d="M145 157H190" stroke="#0284c7" strokeWidth="4" markerEnd={`url(#${marker})`} />
      <path d="M192 135H248L232 165L248 220H192L208 165Z" fill="none" stroke="currentColor" strokeWidth="2" />
      <text x="272" y="170" fill="currentColor" fontSize="13">Ejector</text>
      <path d="M220 220V295" stroke="#059669" strokeWidth="4" markerEnd={`url(#${marker})`} />
      <text x="232" y="255" fill="currentColor" fontSize="12">Mixed</text><text x="232" y="272" fill="currentColor" fontSize="12">discharge</text>
      <rect x="140" y="300" width="160" height="50" rx="14" fill="none" stroke="currentColor" />
      <text x="220" y="330" textAnchor="middle" fill="currentColor" fontSize="15">Receiver</text>
      {mode === 'defrost' && <><path d="M140 325H45V195" fill="none" stroke="#a855f7" strokeWidth="3" strokeDasharray="6 4" markerEnd={`url(#${marker})`} /><text x="55" y="235" fill="currentColor" fontSize="11">Via defrost</text><text x="55" y="251" fill="currentColor" fontSize="11">supply &amp; coil</text></>}
    </svg>
    <p role="status" className="text-sm text-slate-700 dark:text-slate-300">{v.detail}</p>
    <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">Conceptual flow only. Not a piping drawing, pressure map or valve operating sequence. Verify the installed OEM schematic.</p>
  </figure>
}
