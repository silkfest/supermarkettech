'use client'

import { useState } from 'react'
import type { OpenPdfFn } from '../MarkdownContent'

export function ReliefChangeoverDiagram({ openPdf }: { openPdf?: OpenPdfFn }) {
  const [position, setPosition] = useState<'back' | 'front' | 'middle'>('back')
  const left = position !== 'front'
  const right = position !== 'back'
  return (
    <figure className="my-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-4">
      <figcaption className="text-sm font-semibold text-slate-900 dark:text-slate-100">Dual-relief changeover — schematic learning view</figcaption>
      <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">Simplified INST-054 outlet relationship, stem on the right. Not a dimensional drawing or proof of isolation on installed equipment.</p>
      <div className="flex flex-wrap gap-2 my-4" role="group" aria-label="Illustrated stem position">
        {([['back', 'Backseated · out'], ['front', 'Frontseated · in'], ['middle', 'Intermediate · avoid']] as const).map(([value, label]) => (
          <button key={value} type="button" aria-pressed={position === value} onClick={() => setPosition(value)} className={`min-h-11 px-3 py-2 text-xs rounded-lg border focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 ${position === value ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200'}`}>{label}</button>
        ))}
      </div>
      <svg viewBox="0 0 360 270" className="w-full max-w-xl mx-auto text-slate-700 dark:text-slate-200" role="img" aria-label={`Stem ${position === 'back' ? 'fully out; left far relief active, right near branch isolated' : position === 'front' ? 'fully in; right near relief active, left far branch isolated' : 'intermediate; both outlets open, neither isolated'}`}>
        <rect x="60" y="130" width="235" height="50" rx="12" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M170 224V155" stroke="#0284c7" strokeWidth="10" />
        <path d="M170 155H95V100" stroke={left ? '#0284c7' : '#94a3b8'} strokeWidth="10" fill="none" strokeDasharray={left ? undefined : '5 5'} />
        <path d="M170 155H235V100" stroke={right ? '#0284c7' : '#94a3b8'} strokeWidth="10" fill="none" strokeDasharray={right ? undefined : '5 5'} />
        {[{x:95, active:left, name:'Left · far', port:'Primary'}, {x:235, active:right, name:'Right · near', port:'Secondary'}].map(v => <g key={v.x}>
          <rect x={v.x-22} y="65" width="44" height="38" rx="5" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d={`M${v.x-12} 93l24-7-24-7 24-7`} stroke="currentColor" fill="none" />
          <text x={v.x} y="20" textAnchor="middle" fill="currentColor" fontSize="14">{v.name}</text>
          <text x={v.x} y="39" textAnchor="middle" fill="currentColor" fontSize="12">{v.port} relief</text>
          <text x={v.x} y="58" textAnchor="middle" fill="currentColor" fontSize="12">{v.active ? 'ACTIVE' : 'ISOLATED*'}</text>
          {!v.active && <path d={`M${v.x-13} 113h26`} stroke="#dc2626" strokeWidth="5" />}
        </g>)}
        <path d={`M${position === 'front' ? 252 : position === 'back' ? 284 : 268} 155H340`} stroke="currentColor" strokeWidth="5" />
        <path d="M340 142v26" stroke="currentColor" strokeWidth="5" />
        <text x="290" y="200" textAnchor="middle" fill="currentColor" fontSize="12">Operating stem</text>
        <text x="170" y="245" textAnchor="middle" fill="currentColor" fontSize="14">Protected vessel inlet</text>
      </svg>
      <p role="status" className={`text-sm font-medium ${position === 'middle' ? 'text-amber-700 dark:text-amber-400' : 'text-blue-700 dark:text-blue-400'}`}>
        {position === 'middle' ? 'Both branches communicate with the vessel. Neither relief is isolated.' : position === 'back' ? 'Fully out: far / left relief active; near / right branch seat-isolated.' : 'Fully in: near / right relief active; far / left branch seat-isolated.'}
      </p>
      <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">Blue solid path = pressure connection, not continuous discharge. Dashed path + red stop = seat isolation. *Trapped pressure or leakage may remain; isolation alone does not authorize removal.</p>
      <button type="button" onClick={() => openPdf ? openPdf('/manuals/mueller-inst-054-changeover-manifold.pdf', 'Mueller INST-054 · page 1') : window.open('/manuals/mueller-inst-054-changeover-manifold.pdf', '_blank', 'noopener')} className="mt-3 min-h-11 text-sm text-blue-600 dark:text-blue-400 underline">Open manufacturer drawing · INST-054</button>
    </figure>
  )
}
