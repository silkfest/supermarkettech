'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, BookOpen, CheckCircle2, XCircle, ArrowRight, Clock, Trophy, RotateCcw } from 'lucide-react'
import { lessonPass, type Lesson } from '@/lib/game/lessons'
import PtGlideSlides from './PtGlideSlides'
import RlWiringDiagram from './RlWiringDiagram'
import { LESSON_COLOR } from './StoreMap'

interface Props {
  lesson: Lesson
  alreadyPassed: boolean
  onFinish: (score: number, passed: boolean) => void
  onClose: () => void
}

export default function LessonPanel({ lesson, alreadyPassed, onFinish, onClose }: Props) {
  const router = useRouter()
  const [mode, setMode] = useState<'read' | 'quiz' | 'done'>('read')
  const [qi, setQi] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [correct, setCorrect] = useState(0)

  const q = lesson.quiz[qi]
  const total = lesson.quiz.length
  const needed = lessonPass(total)
  const pct = Math.round((correct / total) * 100)
  const passed = correct >= needed

  function answer(i: number) {
    if (picked !== null) return
    setPicked(i)
    if (i === q.answer) setCorrect(c => c + 1)
  }
  function next() {
    if (qi + 1 < total) { setQi(qi + 1); setPicked(null); return }
    setMode('done')
    onFinish(pct, passed)
  }
  function retry() {
    setQi(0); setPicked(null); setCorrect(0); setMode('quiz')
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-start gap-3" style={{ borderTopColor: LESSON_COLOR, borderTopWidth: 3 }}>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded text-white" style={{ background: LESSON_COLOR }}>LESSON</span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1"><Clock size={10} />{lesson.minutes} min read</span>
            {alreadyPassed && <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1"><CheckCircle2 size={10} /> Passed</span>}
          </div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{lesson.title}</h2>
        </div>
        <button onClick={onClose} className="p-1.5 -mr-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700" title="Back to the shop">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 text-sm">
        {mode === 'read' && (
          <div className="space-y-5">
            {lesson.sections.map(s => (
              <section key={s.heading} className="space-y-2">
                <h3 className="text-[13px] font-bold text-slate-900 dark:text-white">{s.heading}</h3>
                {s.body.map((p, i) => <p key={i} className="text-[13px] text-slate-700 dark:text-slate-300 leading-relaxed">{p}</p>)}
                {s.bullets && (
                  <ul className="space-y-1.5">
                    {s.bullets.map((b, i) => (
                      <li key={i} className="text-[12.5px] text-slate-700 dark:text-slate-300 leading-relaxed pl-4 relative">
                        <span className="absolute left-0 top-2 w-1.5 h-1.5 rounded-full" style={{ background: LESSON_COLOR }} />
                        {b}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
            {lesson.id === 'pt' && <PtGlideSlides />}
            {lesson.id === 'defrost' && <RlWiringDiagram />}
            {(lesson.knowledge?.length ?? 0) > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] text-slate-500 flex items-center gap-1"><BookOpen size={10} /> Go deeper:</span>
                {lesson.knowledge!.map(k => (
                  <button key={k.slug} onClick={() => router.push(`/knowledge/${k.slug}`)}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 text-blue-700 dark:text-blue-300 hover:border-blue-400">
                    {k.label}
                  </button>
                ))}
              </div>
            )}
            <button onClick={() => setMode('quiz')}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold">
              Take the check — {total} questions, {needed} to pass <ArrowRight size={13} />
            </button>
          </div>
        )}

        {mode === 'quiz' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              <span>Question {qi + 1} of {total}</span>
              <span>{correct} correct</span>
            </div>
            <div className="h-1 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
              <div className="h-full transition-[width]" style={{ width: `${(qi / total) * 100}%`, background: LESSON_COLOR }} />
            </div>
            <p className="text-[13px] font-medium text-slate-900 dark:text-white leading-relaxed">{q.q}</p>
            <div className="space-y-1.5">
              {q.options.map((o, i) => {
                const state = picked === null ? 'idle' : i === q.answer ? 'right' : i === picked ? 'wrong' : 'dim'
                return (
                  <button key={i} onClick={() => answer(i)} disabled={picked !== null}
                    className={`w-full text-left px-3 py-2 rounded-lg border text-[12px] transition-colors ${
                      state === 'right' ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-200 font-medium'
                      : state === 'wrong' ? 'bg-red-50 dark:bg-red-500/10 border-red-300 dark:border-red-500/40 text-red-700 dark:text-red-200'
                      : state === 'dim' ? 'border-slate-200 dark:border-slate-700 text-slate-400'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200 font-medium hover:border-emerald-400'}`}>
                    {o}
                  </button>
                )
              })}
            </div>
            {picked !== null && (
              <div className={`flex items-start gap-2 px-3 py-2 rounded-lg border text-[12px] ${picked === q.answer
                ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-200'
                : 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-200'}`}>
                {picked === q.answer ? <CheckCircle2 size={13} className="flex-shrink-0 mt-0.5" /> : <XCircle size={13} className="flex-shrink-0 mt-0.5" />}
                <span>{q.why}</span>
              </div>
            )}
            {picked !== null && (
              <button onClick={next} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold">
                {qi + 1 < total ? 'Next question' : 'See result'} <ArrowRight size={13} />
              </button>
            )}
          </div>
        )}

        {mode === 'done' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Trophy size={16} className={passed ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'} />
              <span className="text-lg font-bold text-slate-900 dark:text-white">{correct}/{total}</span>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${passed ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300'}`}>
                {passed ? 'Station passed' : `Need ${needed} to pass`}
              </span>
            </div>
            <p className="text-[12.5px] text-slate-600 dark:text-slate-400">
              {passed
                ? 'Nice. That one is signed off. Head to the next station.'
                : 'Close. Re-read the parts you missed and run the check again — it costs nothing.'}
            </p>
            <div className="flex gap-2">
              {!passed && (
                <button onClick={retry} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700">
                  <RotateCcw size={12} /> Try again
                </button>
              )}
              <button onClick={onClose} className="flex-1 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold">Back to the shop</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
