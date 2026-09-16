'use client'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, ClipboardList, Gauge, Wrench, Search, CheckCircle2, XCircle, Lock, AlertTriangle, BookOpen, Trophy, ArrowRight, Clock, DollarSign, Briefcase } from 'lucide-react'
import { useLiveReadings } from '@/components/simulation/useLiveReadings'
import { SYSTEM_META } from '@/lib/game/faults'
import { scoreCall } from '@/lib/game/engine'
import { SYSTEM_COLOR } from './StoreMap'
import InstrumentPanel from './InstrumentPanel'
import { missingTools, type ToolId } from '@/lib/game/tools'
import type { ActiveCall, CallResult, Check, EquipmentNode, FaultDef, Option } from '@/lib/game/types'

interface Props {
  call: ActiveCall | null
  fault: FaultDef
  node: EquipmentNode
  onUpdate: (patch: Partial<ActiveCall>) => void
  onSpend: (minutes: number) => void
  onComplete: (result: CallResult) => void
  onClose: () => void
  /** What is on the truck at this rank — checks needing anything else are locked. */
  owned: Set<ToolId>
}

const STAGES = [
  { key: 'ticket', label: 'Ticket', icon: ClipboardList },
  { key: 'diagnose', label: 'Diagnose', icon: Search },
  { key: 'fix', label: 'Fix', icon: Wrench },
  { key: 'verify', label: 'Verify', icon: Gauge },
  { key: 'log', label: 'Log', icon: ClipboardList },
] as const

/** Stable per-call shuffle: the right answer must not always sit in the same slot. */
function hash(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}
function shuffled<T>(arr: T[], seed: number): T[] {
  const a = [...arr]
  let x = seed || 1
  for (let i = a.length - 1; i > 0; i--) {
    x ^= x << 13; x >>>= 0
    x ^= x >>> 17
    x ^= x << 5; x >>>= 0
    const j = x % (i + 1)
    const t = a[i]; a[i] = a[j]; a[j] = t
  }
  return a
}

const STATUS_TEXT = {
  ok: 'text-emerald-600 dark:text-emerald-400',
  warn: 'text-amber-600 dark:text-amber-400',
  crit: 'text-red-600 dark:text-red-400',
}

export default function CallPanel({ call, fault, node, onUpdate, onSpend, onComplete, onClose, owned }: Props) {
  const router = useRouter()
  const [wrongCauses, setWrongCauses] = useState<string[]>([])
  const [wrongFixes, setWrongFixes] = useState<string[]>([])
  const [feedback, setFeedback] = useState<{ tone: 'good' | 'bad'; text: string } | null>(null)
  const [note, setNote] = useState('')
  const [result, setResult] = useState<CallResult | null>(null)
  const [instrument, setInstrument] = useState<Check | null>(null)

  const color = SYSTEM_COLOR[fault.system]
  const stage = result ? 'done' : (call?.stage ?? 'ticket')
  // Once the repair is in, the gauges settle on the post-fix values.
  const repaired = stage === 'verify' || stage === 'log' || stage === 'done'
  const specs = useMemo(() => fault.readings.map(r => ({
    key: r.key,
    target: repaired ? r.after ?? r.value : r.value,
    jitter: r.jitter ?? 0, wander: r.wander ?? 0, bias: 0,
  })), [fault, repaired])
  const live = useLiveReadings(specs, 900)
  const correctCause = fault.causes.find(c => c.correct)!
  const correctFix = fault.fixes.find(f => f.correct)!
  const seed = hash(`${call?.id ?? 'x'}:${fault.id}`)
  const causeOptions = useMemo(() => shuffled(fault.causes, seed), [fault, seed])
  const fixOptions = useMemo(() => shuffled(fault.fixes, seed ^ 0x9e3779b9), [fault, seed])

  function runCheck(id: string) {
    if (!call || call.checksDone.includes(id)) return
    const chk = fault.checks.find(c => c.id === id)!
    if (missingTools(chk.tool, owned).length > 0) return
    // Some checks are work, not a purchase: you do them on the instrument first.
    if (chk.instrument && !instrument) { setInstrument(chk); return }
    // Locking out from inside the ohms bench must not close the bench under you.
    if (instrument?.id === id) setInstrument(null)
    onUpdate({ checksDone: [...call.checksDone, id], lotoDone: call.lotoDone || id === 'loto' })
    onSpend(chk.minutes)
  }

  function pickCause(opt: Option) {
    if (!call) return
    const attempts = call.causeAttempts + 1
    if (opt.correct) {
      onUpdate({ causeAttempts: attempts, stage: 'fix' })
      setFeedback(null)
    } else {
      setWrongCauses(w => [...w, opt.id])
      onUpdate({ causeAttempts: attempts })
      onSpend(10)
      setFeedback({ tone: 'bad', text: opt.why })
    }
  }

  function pickFix(opt: Option) {
    if (!call) return
    const attempts = call.fixAttempts + 1
    if (opt.correct) {
      onUpdate({ fixAttempts: attempts, stage: 'verify' })
      onSpend(30)
      setFeedback(null)
      setNote(`Found: ${correctCause.label}. Repaired: ${opt.label}. Next: `)
    } else {
      setWrongFixes(w => [...w, opt.id])
      onUpdate({ fixAttempts: attempts, partsWasted: call.partsWasted + (opt.cost ?? 0) })
      onSpend(20)
      setFeedback({
        tone: 'bad',
        text: opt.cost ? `${opt.why} That is $${opt.cost} of parts on the truck you will not get back.` : opt.why,
      })
    }
  }

  function closeCall() {
    if (!call) return
    const r = scoreCall(call, fault, note.trim())
    setResult(r)
    onComplete(r)
  }

  const stageIdx = STAGES.findIndex(s => s.key === stage)

  return (
    <div className="relative flex flex-col h-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-start gap-3" style={{ borderTopColor: color, borderTopWidth: 3 }}>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded text-white" style={{ background: color }}>{SYSTEM_META[fault.system].short}</span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{node.label}</span>
          </div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{fault.title}</h2>
        </div>
        <button onClick={onClose} className="p-1.5 -mr-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700" title="Back to the floor">
          <X size={16} />
        </button>
      </div>

      {/* Stage strip */}
      {stage !== 'done' && (
        <div className="grid grid-cols-5 border-b border-slate-200 dark:border-slate-700">
          {STAGES.map((s, i) => {
            const Icon = s.icon
            const active = i === stageIdx
            const done = i < stageIdx
            return (
              <div key={s.key} className={`flex items-center justify-center gap-1 py-1.5 text-[10px] font-semibold border-b-2 -mb-px ${
                active ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : done ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-400 dark:text-slate-500'}`}>
                {done ? <CheckCircle2 size={11} /> : <Icon size={11} />}{s.label}
              </div>
            )
          })}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm">

        {/* ── Ticket ── */}
        {stage === 'ticket' && call && (
          <>
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Store reported</p>
              <p className="text-slate-700 dark:text-slate-300 text-[13px] leading-relaxed">{fault.report}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">What you see walking up</p>
              <p className="text-slate-700 dark:text-slate-300 text-[13px] leading-relaxed">{fault.cue}</p>
            </div>
            {fault.loto && (
              <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-[12px] text-amber-700 dark:text-amber-300">
                <Lock size={13} className="flex-shrink-0 mt-0.5" />
                This one is electrical. Lock it out before you put hands on it.
              </div>
            )}
            <button onClick={() => onUpdate({ stage: 'diagnose' })}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold">
              Start diagnosing <ArrowRight size={13} />
            </button>
          </>
        )}

        {/* ── Diagnose ── */}
        {(stage === 'diagnose' || stage === 'fix' || stage === 'verify' || stage === 'log') && call && (
          <>
            <section>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
                <Gauge size={10} /> {repaired ? 'Readings after the repair' : 'Live readings'}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {fault.readings.map(r => {
                  const moved = repaired && r.after !== undefined && r.after !== r.value
                  return (
                    <div key={r.key} className={`px-2.5 py-2 rounded-lg border ${moved
                      ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30'
                      : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700'}`}>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">{r.label}</p>
                      <p className={`text-base font-bold tabular-nums leading-tight ${repaired ? STATUS_TEXT.ok : STATUS_TEXT[r.status]}`}>
                        {live[r.key].toFixed(r.decimals ?? 0)}<span className="text-[10px] font-medium ml-0.5 text-slate-400">{r.unit}</span>
                      </p>
                      {moved && (
                        <p className="text-[9px] text-slate-400 leading-tight mt-0.5 tabular-nums">
                          was {r.value.toFixed(r.decimals ?? 0)} {r.unit}
                        </p>
                      )}
                      {!moved && r.expect && <p className="text-[9px] text-slate-400 leading-tight mt-0.5">expect {r.expect}</p>}
                    </div>
                  )
                })}
              </div>
            </section>

            {stage === 'diagnose' && (
              <section>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1"><Search size={10} /> Investigate <span className="normal-case tracking-normal font-normal">— each check costs shift time</span></p>
                <div className="space-y-1.5">
                  {fault.checks.map(c => {
                    const done = call.checksDone.includes(c.id)
                    const missing = missingTools(c.tool, owned)
                    const locked = !done && missing.length > 0
                    return (
                      <button key={c.id} onClick={() => runCheck(c.id)} disabled={done || locked}
                        className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${
                          done ? 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700 cursor-default'
                          : locked ? 'bg-slate-50 dark:bg-slate-900/40 border-dashed border-slate-300 dark:border-slate-600 cursor-not-allowed'
                          : c.id === 'loto' ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 hover:border-amber-400'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 hover:border-blue-400 dark:hover:border-blue-400'}`}>
                        <div className="flex items-center gap-2">
                          {locked ? <Briefcase size={12} className="text-slate-400 flex-shrink-0" />
                            : c.id === 'loto' ? <Lock size={12} className="text-amber-600 dark:text-amber-400 flex-shrink-0" />
                            : done ? <CheckCircle2 size={12} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                            : <span className="w-3 h-3 rounded-full border border-slate-300 dark:border-slate-500 flex-shrink-0" />}
                          <span className={`text-[12px] flex-1 ${done || locked ? 'text-slate-500 dark:text-slate-400' : 'text-slate-800 dark:text-slate-200 font-medium'}`}>{c.label}</span>
                          {!done && !locked && c.instrument && (
                            <span className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded-full text-white flex-shrink-0 ${c.instrument.kind === 'meter' ? 'bg-amber-500' : 'bg-cyan-500'}`}>
                              {c.instrument.kind === 'meter' ? (c.instrument.mode === 'ohms' ? 'OHM IT' : 'METER IT') : 'READ IT'}
                            </span>
                          )}
                          <span className="text-[9px] text-slate-400 flex items-center gap-0.5 flex-shrink-0"><Clock size={9} />{c.minutes}m</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5 ml-5">{c.tool}</p>
                        {locked && (
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 ml-5">
                            Not on the truck yet — {missing.map(m => m.name).join(' and ')}.
                          </p>
                        )}
                        {done && <p className="text-[12px] text-slate-700 dark:text-slate-300 mt-1.5 ml-5 leading-relaxed">{c.finding}</p>}
                      </button>
                    )
                  })}
                </div>
              </section>
            )}

            {stage === 'diagnose' && (
              <section>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Call it — what&apos;s the root cause?</p>
                <OptionList options={causeOptions} wrong={wrongCauses} onPick={pickCause} />
              </section>
            )}

            {stage === 'fix' && (
              <section className="space-y-2">
                <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-[12px]">
                  <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div><span className="font-semibold text-emerald-700 dark:text-emerald-300">Diagnosis: {correctCause.label}</span><p className="text-slate-600 dark:text-slate-400 mt-0.5">{correctCause.why}</p></div>
                </div>
                {fault.loto && !call.lotoDone && (
                  <button onClick={() => runCheck('loto')}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/40 text-[12px] text-amber-700 dark:text-amber-300 hover:border-amber-500">
                    <Lock size={13} className="flex-shrink-0" /> <span className="font-medium">Lock out / tag out before the repair</span><span className="ml-auto text-[9px] flex items-center gap-0.5"><Clock size={9} />5m</span>
                  </button>
                )}
                {fault.loto && call.lotoDone && (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1"><Lock size={11} /> Locked out and verified dead.</p>
                )}
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Repair — pick the fix <span className="normal-case tracking-normal font-normal">— wrong parts are billed to the company, not the customer</span></p>
                <OptionList options={fixOptions} wrong={wrongFixes} onPick={pickFix} />
              </section>
            )}

            {stage === 'verify' && (
              <section className="space-y-2">
                <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-[12px]">
                  <Wrench size={13} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div><span className="font-semibold text-emerald-700 dark:text-emerald-300">Repaired: {correctFix.label}</span><p className="text-slate-600 dark:text-slate-400 mt-0.5">{correctFix.why}</p></div>
                </div>
                <p className="text-[12px] text-slate-700 dark:text-slate-300 leading-relaxed">
                  Do not leave yet. Let it run and watch the numbers come back — this is what the equipment should look like
                  when it is right, and it is the only proof the repair actually worked.
                </p>
                <button onClick={() => onUpdate({ stage: 'log' })}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold">
                  Readings are back in range <ArrowRight size={13} />
                </button>
              </section>
            )}

            {stage === 'log' && (
              <section className="space-y-2">
                <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-[12px]">
                  <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div><span className="font-semibold text-emerald-700 dark:text-emerald-300">Fixed and verified: {correctFix.label}</span><p className="text-slate-600 dark:text-slate-400 mt-0.5">{correctFix.why}</p></div>
                </div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Service note</p>
                <textarea value={note} onChange={e => setNote(e.target.value)} rows={4}
                  className="w-full text-[12px] px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-400" />
                <p className="text-[10px] text-slate-400">Same shape as a real service report: fault found, work performed, next action.</p>
                <button onClick={closeCall} disabled={note.trim().length < 10}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-semibold">
                  Close the call <ArrowRight size={13} />
                </button>
              </section>
            )}

            {feedback && stage !== 'log' && stage !== 'verify' && (
              <div className={`flex items-start gap-2 px-3 py-2 rounded-lg border text-[12px] ${feedback.tone === 'good'
                ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-200'
                : 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-200'}`}>
                {feedback.tone === 'good' ? <CheckCircle2 size={13} className="flex-shrink-0 mt-0.5" /> : <XCircle size={13} className="flex-shrink-0 mt-0.5" />}
                <span>{feedback.text}</span>
              </div>
            )}
          </>
        )}

        {/* ── Done ── */}
        {stage === 'done' && result && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Trophy size={16} className={result.points >= 80 ? 'text-emerald-600 dark:text-emerald-400' : result.points >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'} />
              <span className="text-lg font-bold text-slate-900 dark:text-white">+{result.points} pts</span>
              <span className="text-[11px] text-slate-500 ml-auto">{result.minutesSpent} min on site</span>
            </div>
            <ul className="space-y-1 text-[12px]">
              <ScoreRow label="Diagnosis" pts={result.diagnosisPts} max={50} detail={result.causeAttempts === 1 ? 'first call' : `${result.causeAttempts} tries`} />
              <ScoreRow label="Repair" pts={result.fixPts} max={30} detail={result.fixAttempts === 1 ? 'first try' : `${result.fixAttempts} tries`} />
              <ScoreRow label="Efficiency" pts={result.efficiencyPts} max={20} detail={`${result.checksUsed} checks · ${result.keyChecksTotal} needed`} />
              {result.safetyPenalty > 0 && (
                <li className="flex items-center gap-2 text-red-600 dark:text-red-400"><AlertTriangle size={12} /> Safety: worked live without lockout <span className="ml-auto font-bold tabular-nums">−{result.safetyPenalty}</span></li>
              )}
              {result.partsWasted > 0 && (
                <li className="flex items-center gap-2 text-red-600 dark:text-red-400"><DollarSign size={12} /> Parts thrown at it that did not fix it <span className="ml-auto font-bold tabular-nums">${result.partsWasted}</span></li>
              )}
            </ul>
            {(fault.knowledge?.length ?? 0) > 0 && (
              <div className="flex items-center gap-2 flex-wrap pt-1">
                <span className="text-[10px] text-slate-500 flex items-center gap-1"><BookOpen size={10} /> Read more:</span>
                {fault.knowledge!.map(k => (
                  <button key={k.slug} onClick={() => router.push(`/knowledge/${k.slug}`)}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 text-blue-700 dark:text-blue-300 hover:border-blue-400">
                    {k.label}
                  </button>
                ))}
              </div>
            )}
            <button onClick={onClose} className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold">Back to the floor</button>
          </div>
        )}
      </div>

      {instrument && (
        <InstrumentPanel
          key={instrument.id}
          check={instrument}
          needsLoto={!!fault.loto}
          lotoDone={!!call?.lotoDone}
          onLoto={() => runCheck('loto')}
          onSpend={onSpend}
          onDone={() => runCheck(instrument.id)}
          onClose={() => setInstrument(null)} />
      )}
    </div>
  )
}

function OptionList({ options, wrong, onPick }: { options: Option[]; wrong: string[]; onPick: (o: Option) => void }) {
  return (
    <div className="space-y-1.5">
      {options.map(o => {
        const isWrong = wrong.includes(o.id)
        return (
          <button key={o.id} onClick={() => onPick(o)} disabled={isWrong}
            className={`w-full text-left px-3 py-2 rounded-lg border text-[12px] transition-colors ${
              isWrong ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-300 line-through cursor-default'
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200 font-medium hover:border-blue-400 dark:hover:border-blue-400'}`}>
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

function ScoreRow({ label, pts, max, detail }: { label: string; pts: number; max: number; detail: string }) {
  return (
    <li className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
      <span className="font-medium">{label}</span>
      <span className="text-slate-400 text-[10px]">{detail}</span>
      <span className={`ml-auto font-bold tabular-nums ${pts === max ? 'text-emerald-600 dark:text-emerald-400' : pts > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>{pts}/{max}</span>
    </li>
  )
}
