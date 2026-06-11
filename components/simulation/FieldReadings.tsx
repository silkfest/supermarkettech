'use client'
import type { ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, XCircle, Info, Activity } from 'lucide-react'

// ── Shared types ────────────────────────────────────────────────────────────────
export interface Finding {
  severity: 'critical' | 'warning' | 'info' | 'ok'
  label: string
  measurement: string
  causes: string[]
  checks: string[]
}

/** One numeric input in the "Enter your readings" form. */
export interface FieldDef {
  key: string
  label: string
  unit: string
  placeholder?: string
  hint?: string
  /** Optional section header rendered above this field. */
  section?: string
}

/** One derived/calculated value displayed in the results column. */
export interface DerivedRow {
  label: string
  value: number | null
  dec?: number
  unit?: string
  note?: string
  color?: string
  tooltip?: string
}

const n = (s: string) => (s.trim() === '' ? null : Number(s))
/** Helper: parse a readings record into numbers (null when blank). */
export function parseReadings<T extends Record<string, string>>(r: T): Record<keyof T, number | null> {
  const out = {} as Record<keyof T, number | null>
  for (const k in r) out[k] = n(r[k])
  return out
}

// ── Form input ──────────────────────────────────────────────────────────────────
function FieldInput({ def, value, onChange }: { def: FieldDef; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2 py-0.5">
      <div className="w-36 flex-shrink-0">
        <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">{def.label}</div>
        {def.hint && <div className="text-[9px] text-slate-500 dark:text-slate-600">{def.hint}</div>}
      </div>
      <div className="relative flex-1">
        <input
          type="number"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={def.placeholder ?? '—'}
          className="w-full bg-slate-100 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 rounded-lg px-2.5 py-1.5 text-sm font-mono text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 pointer-events-none">{def.unit}</span>
      </div>
    </div>
  )
}

// ── Panel ─────────────────────────────────────────────────────────────────────
interface PanelProps {
  fields: FieldDef[]
  values: Record<string, string>
  onChange: (key: string, value: string) => void
  onClear: () => void
  derived: DerivedRow[]
  findings: Finding[]
  /** Optional note rendered under the findings (e.g. which rack config was used). */
  footnote?: string
  intro?: string
  /** Optional actions (e.g. an "Ask the AI" button) rendered below the input form. */
  actions?: ReactNode
}

export default function FieldReadingsPanel({ fields, values, onChange, onClear, derived, findings, footnote, intro, actions }: PanelProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Left: input form */}
      <div className="space-y-1">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Enter Your Readings</span>
          <button onClick={onClear} className="text-[10px] text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 underline underline-offset-2">Clear all</button>
        </div>
        <p className="text-[10px] text-slate-500 mb-2 leading-relaxed">
          {intro ?? 'Enter what you measure on site — leave blank any values you haven’t taken yet. Calculations update instantly.'}
        </p>
        {fields.map(def => (
          <div key={def.key}>
            {def.section && (
              <div className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest pt-3 pb-0.5">{def.section}</div>
            )}
            <FieldInput def={def} value={values[def.key] ?? ''} onChange={v => onChange(def.key, v)} />
          </div>
        ))}
        {actions && <div className="pt-4">{actions}</div>}
      </div>

      {/* Right: derived + findings */}
      <div className="space-y-4">
        {/* Calculated values */}
        <div className="bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
          <div className="px-3 py-2 bg-slate-100 dark:bg-slate-700/60 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
            <Activity size={13} className="text-slate-500 dark:text-slate-400" />
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Calculated Values</span>
          </div>
          <div className="px-3 py-1.5">
            {derived.filter(d => d.value !== null).length === 0 ? (
              <p className="text-xs text-slate-500 py-3 text-center">Enter readings to see calculations</p>
            ) : derived.filter(d => d.value !== null).map(d => (
              <div key={d.label} className="flex items-center justify-between py-1.5 border-b border-slate-200 dark:border-slate-700/40 last:border-0">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  {d.label}
                  {d.tooltip && (
                    <span className="relative group/tip flex-shrink-0">
                      <Info size={10} className="text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400 cursor-help transition-colors" />
                      <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-56 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-[10px] leading-relaxed px-2.5 py-2 shadow-xl opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150 z-50">
                        {d.tooltip}
                      </span>
                    </span>
                  )}
                </span>
                <div className="text-right">
                  <span className={`text-sm font-mono font-semibold tabular-nums ${d.color ?? 'text-slate-900 dark:text-white'}`}>
                    {d.value!.toFixed(d.dec ?? 1)}{d.unit ? ` ${d.unit}` : ''}
                  </span>
                  {d.note && <div className="text-[9px] text-amber-500 dark:text-amber-400">{d.note}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Findings */}
        <div className="bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
          <div className="px-3 py-2 bg-slate-100 dark:bg-slate-700/60 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
            <AlertTriangle size={13} className="text-slate-500 dark:text-slate-400" />
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Findings</span>
            <span className="ml-auto text-[10px] text-slate-500">{findings.length} result{findings.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="p-3 space-y-3">
            {findings.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">Enter readings on the left to see analysis</p>
            ) : findings.map((f, i) => (
              <div key={i} className={`rounded-lg border p-3 ${
                f.severity === 'critical' ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/40' :
                f.severity === 'warning'  ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/40' :
                f.severity === 'ok'       ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/40' :
                'bg-slate-100 dark:bg-slate-700/40 border-slate-300 dark:border-slate-600'}`}>
                <div className="flex items-start gap-2 mb-1.5">
                  {f.severity === 'critical' ? <XCircle size={13} className="text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" /> :
                   f.severity === 'warning'  ? <AlertTriangle size={13} className="text-amber-500 dark:text-amber-400 flex-shrink-0 mt-0.5" /> :
                   f.severity === 'ok'       ? <CheckCircle2 size={13} className="text-emerald-500 dark:text-emerald-400 flex-shrink-0 mt-0.5" /> :
                   <Info size={13} className="text-slate-500 dark:text-slate-400 flex-shrink-0 mt-0.5" />}
                  <div className="min-w-0">
                    <span className={`text-xs font-semibold ${
                      f.severity === 'critical' ? 'text-red-600 dark:text-red-300' :
                      f.severity === 'warning'  ? 'text-amber-700 dark:text-amber-300' :
                      f.severity === 'ok'       ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-600 dark:text-slate-300'}`}>{f.label}</span>
                    {f.measurement && <span className="text-[10px] text-slate-500 dark:text-slate-400 ml-1.5">{f.measurement}</span>}
                  </div>
                </div>
                {f.causes.length > 0 && (
                  <div className="ml-5 mb-1">
                    <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">Possible causes: </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">{f.causes.join(' · ')}</span>
                  </div>
                )}
                {f.checks.map((c, j) => (
                  <div key={j} className="ml-5 flex items-start gap-1.5 mt-0.5">
                    <span className="text-[9px] text-slate-500 dark:text-slate-600 mt-0.5">→</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">{c}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {footnote && <p className="text-[10px] text-slate-500 text-center">{footnote}</p>}
      </div>
    </div>
  )
}
