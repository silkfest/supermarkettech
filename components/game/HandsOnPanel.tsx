'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Zap, CheckCircle2, BookOpen, Trophy } from 'lucide-react'
import SafetyCircuitTrainer from '@/components/simulation/SafetyCircuitTrainer'
import type { Lesson } from '@/lib/game/lessons'

interface Props {
  lesson: Lesson
  alreadyPassed: boolean
  onFinish: (score: number, passed: boolean) => void
  onClose: () => void
}

/** Wide overlay for stations that embed a simulator. Passes after N solved rounds. */
export default function HandsOnPanel({ lesson, alreadyPassed, onFinish, onClose }: Props) {
  const router = useRouter()
  const need = lesson.handson?.solvesToPass ?? 2
  const [scores, setScores] = useState<number[]>([])
  const solved = scores.length
  const passed = alreadyPassed || solved >= need

  function handleSolved(score: number) {
    const next = [...scores, score]
    setScores(next)
    if (next.length === need) {
      const avg = Math.round(next.reduce((a, b) => a + b, 0) / next.length)
      onFinish(avg, true)
    }
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-start gap-3" style={{ borderTopColor: '#f59e0b', borderTopWidth: 3 }}>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded text-white bg-amber-500 flex items-center gap-1"><Zap size={9} /> HANDS-ON</span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">{lesson.minutes} min</span>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${passed
              ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
              : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
              {passed ? 'Station passed' : `Find the Fault: ${solved}/${need} solved`}
            </span>
          </div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{lesson.title}</h2>
        </div>
        <button onClick={onClose} className="p-1.5 -mr-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700" title="Back to the shop">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm">
        {lesson.sections.map(s => (
          <section key={s.heading} className="space-y-1.5">
            <h3 className="text-[13px] font-bold text-slate-900 dark:text-white">{s.heading}</h3>
            {s.body.map((p, i) => <p key={i} className="text-[12.5px] text-slate-700 dark:text-slate-300 leading-relaxed">{p}</p>)}
          </section>
        ))}

        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 p-3 sm:p-4">
          <SafetyCircuitTrainer variant={lesson.handson?.variant ?? '120'} onSolved={handleSolved} />
        </div>

        {solved >= need && !alreadyPassed && (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-[12px] text-emerald-800 dark:text-emerald-200">
            <Trophy size={14} className="flex-shrink-0 mt-0.5" />
            <span>Signed off — {need} faults found, average score {Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)}. Keep going for practice, or head to the next station.</span>
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          {(lesson.knowledge?.length ?? 0) > 0 && (
            <>
              <span className="text-[10px] text-slate-500 flex items-center gap-1"><BookOpen size={10} /> Go deeper:</span>
              {lesson.knowledge!.map(k => (
                <button key={k.slug} onClick={() => router.push(`/knowledge/${k.slug}`)}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 text-blue-700 dark:text-blue-300 hover:border-blue-400">
                  {k.label}
                </button>
              ))}
            </>
          )}
          <button onClick={onClose} className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold">
            {passed && <CheckCircle2 size={12} />} Back to the shop
          </button>
        </div>
      </div>
    </div>
  )
}
