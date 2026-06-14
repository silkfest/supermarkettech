'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  CheckCircle2, Circle, Loader2, BookOpen, Video, HelpCircle,
  ExternalLink, RotateCcw, ChevronLeft, ChevronRight, ListChecks, X,
} from 'lucide-react'
import PageShell from '@/components/layout/PageShell'
import PageHeader from '@/components/PageHeader'
import YouTubeEmbed from '@/components/training/YouTubeEmbed'
import MarkdownContent from '@/components/knowledge/MarkdownContent'
import { getTopicBySlug } from '@/lib/knowledge/topics'

interface LessonCompletion { completed_at: string; score: number | null; total: number | null; passed: boolean | null }
interface QuizQuestion { id: string; question: string; options: string[]; sort_order: number; correct_index?: number; explanation?: string }
interface Lesson {
  id: string; title: string; description: string; lesson_type: 'kb_topic' | 'video' | 'quiz'
  kb_topic_slug: string | null; video_url: string | null; sort_order: number
  questions?: QuizQuestion[]
  completion: LessonCompletion | null
  // resolved client-side for kb_topic lessons
  sections?: { title: string; body: string }[]
  contentResolved?: boolean
}
interface CourseInfo {
  id: string; title: string; description: string; category: string
  type: string; url: string; duration_minutes: number; points: number
  completion: { completed_at: string; notes: string } | null
}

interface QuizResult {
  question_id: string; correct_index: number; explanation: string; submitted: unknown; is_correct: boolean
}
interface QuizResponse {
  score: number; total: number; percent: number; passed: boolean; pass_threshold: number; results: QuizResult[]
}

const LESSON_ICON: Record<Lesson['lesson_type'], React.ComponentType<{ size?: number; className?: string }>> = {
  kb_topic: BookOpen,
  video: Video,
  quiz: HelpCircle,
}

// Strip leading emoji (matches extractSections in MarkdownContent)
const EMOJI_PREFIX = /^[\u{1F300}-\u{1FAF8}\u{2600}-\u{26FF}\u{2700}-\u{27BF}️⃣]+\s*/u

// Split KB markdown into section chunks, one per `### ` heading. Content before the
// first `### ` (the `## Title` + intro) becomes an "Overview" chunk.
function splitSections(content: string): { title: string; body: string }[] {
  const lines = content.split('\n')
  const sections: { title: string; body: string }[] = []
  let current: { title: string; lines: string[] } | null = null
  const intro: string[] = []

  for (const line of lines) {
    if (line.trim().startsWith('### ')) {
      if (current) sections.push({ title: current.title, body: current.lines.join('\n') })
      const raw = line.trim().slice(4).trim()
      const clean = raw.replace(EMOJI_PREFIX, '') || raw
      current = { title: clean, lines: [line] }
    } else if (current) {
      current.lines.push(line)
    } else {
      intro.push(line)
    }
  }
  if (current) sections.push({ title: current.title, body: current.lines.join('\n') })

  const introBody = intro.join('\n').trim()
  if (introBody) sections.unshift({ title: 'Overview', body: introBody })
  if (sections.length === 0) sections.push({ title: 'Overview', body: content })
  return sections
}

// ── Quiz step ──────────────────────────────────────────────────────────────────
function QuizLesson({ lesson, onCompleted }: { lesson: Lesson; onCompleted: (completion: LessonCompletion) => void }) {
  const questions = lesson.questions ?? []
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null))
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<QuizResponse | null>(null)

  const allAnswered = answers.every(a => a !== null)

  async function submit() {
    setSubmitting(true)
    const res = await fetch(`/api/apprentice/lessons/${lesson.id}/quiz`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers }),
    })
    const data = await res.json()
    setSubmitting(false)
    if (res.ok) {
      setResult(data)
      if (data.completion) onCompleted(data.completion)
    }
  }

  function retry() {
    setResult(null)
    setAnswers(questions.map(() => null))
  }

  return (
    <div className="space-y-4">
      {questions.map((q, qi) => {
        const r = result?.results.find(res => res.question_id === q.id)
        return (
          <div key={q.id} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-100 mb-2">{qi + 1}. {q.question}</p>
            <div className="space-y-1.5">
              {q.options.map((opt, oi) => {
                const selected = answers[qi] === oi
                let cls = 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600'
                if (result) {
                  if (oi === r?.correct_index) cls = 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-500'
                  else if (selected) cls = 'border-red-400 bg-red-50 dark:bg-red-900/20 dark:border-red-500'
                } else if (selected) {
                  cls = 'border-blue-400 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-500'
                }
                return (
                  <button
                    key={oi}
                    disabled={!!result}
                    onClick={() => setAnswers(prev => prev.map((a, i) => i === qi ? oi : a))}
                    className={`w-full text-left text-sm px-3 py-2 rounded-lg border transition-colors disabled:cursor-default ${cls} text-slate-700 dark:text-slate-200`}
                  >
                    {opt}
                  </button>
                )
              })}
            </div>
            {result && r && (
              <p className={`text-xs mt-2 ${r.is_correct ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                {r.is_correct ? 'Correct! ' : 'Incorrect. '}{r.explanation}
              </p>
            )}
          </div>
        )
      })}

      {!result && (
        <button
          onClick={submit}
          disabled={!allAnswered || submitting}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-40 flex items-center gap-2"
        >
          {submitting && <Loader2 size={14} className="animate-spin"/>}
          Submit quiz
        </button>
      )}

      {result && (
        <div className={`rounded-lg border p-3 ${result.passed ? 'border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-700/50' : 'border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700/50'}`}>
          <p className={`text-sm font-semibold ${result.passed ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}>
            {result.score}/{result.total} correct ({result.percent}%) — {result.passed ? 'Passed' : `Needs ${result.pass_threshold}% to pass`}
          </p>
          {!result.passed && (
            <button onClick={retry} className="mt-2 text-xs flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline">
              <RotateCcw size={12}/> Try again
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Flattened step model ─────────────────────────────────────────────────────────
type Step =
  | { kind: 'kb'; lesson: Lesson; lessonIndex: number; sectionIndex: number; sectionCount: number; section: { title: string; body: string }; lastOfLesson: boolean }
  | { kind: 'kb-link'; lesson: Lesson; lessonIndex: number; lastOfLesson: boolean }
  | { kind: 'video'; lesson: Lesson; lessonIndex: number; lastOfLesson: boolean }
  | { kind: 'quiz'; lesson: Lesson; lessonIndex: number; lastOfLesson: boolean }

function lessonDone(l: Lesson) {
  return !!l.completion && (l.lesson_type !== 'quiz' || l.completion.passed)
}

export default function CoursePlayerPage() {
  const params = useParams()
  const router = useRouter()
  const courseId = params.id as string

  const [course, setCourse] = useState<CourseInfo | null>(null)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [loading, setLoading] = useState(true)
  const [marking, setMarking] = useState(false)
  const [stepIdx, setStepIdx] = useState(0)
  const [outlineOpen, setOutlineOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/apprentice/courses/${courseId}/lessons`)
    if (res.ok) {
      const data = await res.json()
      setCourse(data.course)
      setLessons(data.lessons)
    }
    setLoading(false)
  }, [courseId])

  useEffect(() => { load() }, [load])

  // Resolve KB topic content inline (static topics first, then dynamic DB topics)
  useEffect(() => {
    const pending = lessons.filter(l => l.lesson_type === 'kb_topic' && !l.contentResolved)
    if (pending.length === 0) return
    let cancelled = false

    ;(async () => {
      const resolved = await Promise.all(pending.map(async (l) => {
        const slug = l.kb_topic_slug ?? ''
        const staticTopic = slug ? getTopicBySlug(slug) : undefined
        let content = staticTopic?.content ?? ''
        if (!content && slug) {
          try {
            const r = await fetch(`/api/knowledge/dynamic/${slug}`)
            if (r.ok) { const d = await r.json(); content = d?.content ?? '' }
          } catch { /* fall through to empty */ }
        }
        return { id: l.id, sections: content ? splitSections(content) : [] }
      }))
      if (cancelled) return
      setLessons(prev => prev.map(l => {
        const found = resolved.find(r => r.id === l.id)
        return found ? { ...l, sections: found.sections, contentResolved: true } : l
      }))
    })()

    return () => { cancelled = true }
  }, [lessons])

  const contentReady = useMemo(
    () => lessons.every(l => l.lesson_type !== 'kb_topic' || l.contentResolved),
    [lessons]
  )

  // Build the flat list of steps
  const steps = useMemo<Step[]>(() => {
    const out: Step[] = []
    lessons.forEach((lesson, lessonIndex) => {
      if (lesson.lesson_type === 'kb_topic') {
        const sections = lesson.sections ?? []
        if (sections.length > 0) {
          sections.forEach((section, sectionIndex) => {
            out.push({
              kind: 'kb', lesson, lessonIndex, sectionIndex,
              sectionCount: sections.length, section,
              lastOfLesson: sectionIndex === sections.length - 1,
            })
          })
        } else {
          out.push({ kind: 'kb-link', lesson, lessonIndex, lastOfLesson: true })
        }
      } else if (lesson.lesson_type === 'video') {
        out.push({ kind: 'video', lesson, lessonIndex, lastOfLesson: true })
      } else if (lesson.lesson_type === 'quiz') {
        out.push({ kind: 'quiz', lesson, lessonIndex, lastOfLesson: true })
      }
    })
    return out
  }, [lessons])

  // Keep stepIdx in range when steps resolve
  useEffect(() => {
    if (stepIdx > steps.length - 1) setStepIdx(Math.max(0, steps.length - 1))
  }, [steps.length, stepIdx])

  async function markComplete(lesson: Lesson) {
    if (lessonDone(lesson)) return
    setMarking(true)
    const res = await fetch(`/api/apprentice/lessons/${lesson.id}/complete`, { method: 'POST' })
    if (res.ok) {
      const data = await res.json()
      setLessons(prev => prev.map(l => l.id === lesson.id ? { ...l, completion: data } : l))
      // Refresh course completion in case this was the final lesson
      const courseRes = await fetch(`/api/apprentice/courses/${courseId}/lessons`)
      if (courseRes.ok) { const d = await courseRes.json(); setCourse(d.course) }
    }
    setMarking(false)
  }

  function onQuizCompleted(lessonId: string, completion: LessonCompletion) {
    setLessons(prev => prev.map(l => l.id === lessonId ? { ...l, completion } : l))
    if (completion.passed) {
      fetch(`/api/apprentice/courses/${courseId}/lessons`).then(r => r.ok && r.json()).then(d => d && setCourse(d.course))
    }
  }

  function jumpToLesson(lessonIndex: number) {
    const idx = steps.findIndex(s => s.lessonIndex === lessonIndex)
    if (idx >= 0) setStepIdx(idx)
    setOutlineOpen(false)
  }

  async function goNext() {
    const step = steps[stepIdx]
    if (!step) return
    // Reading lessons (KB last section, external KB link, or video) auto-complete on advancing
    if ((step.kind === 'kb' && step.lastOfLesson) || step.kind === 'kb-link' || step.kind === 'video') {
      await markComplete(step.lesson)
    }
    if (stepIdx < steps.length - 1) {
      setStepIdx(i => i + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      router.push('/apprentice/training')
    }
  }

  if (loading || !contentReady) {
    return (
      <PageShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 size={24} className="animate-spin text-blue-400"/>
        </div>
      </PageShell>
    )
  }

  if (!course) {
    return (
      <PageShell>
        <PageHeader title="Course not found" back="/apprentice/training"/>
        <div className="p-6 text-sm text-slate-500 dark:text-slate-400">This course could not be found.</div>
      </PageShell>
    )
  }

  const completedCount = lessons.filter(lessonDone).length
  const step = steps[stepIdx]
  const atFirst = stepIdx === 0
  const atLast = stepIdx === steps.length - 1
  const stepPct = steps.length ? Math.round(((stepIdx + 1) / steps.length) * 100) : 0
  // Must pass a quiz before moving past it
  const quizBlocked = step?.kind === 'quiz' && !lessonDone(step.lesson)

  return (
    <PageShell>
      <PageHeader title={course.title} back="/apprentice/training" variant="learning"/>

      <div className="max-w-3xl mx-auto px-4 md:px-6 py-5 space-y-4">

        {/* Progress + outline toggle */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="min-w-0">
              <h1 className="text-base font-bold text-slate-900 dark:text-white truncate">{course.title}</h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {lessons.length} lesson{lessons.length === 1 ? '' : 's'} · {completedCount}/{lessons.length} complete · +{course.points} XP
              </p>
            </div>
            {steps.length > 0 && (
              <button
                onClick={() => setOutlineOpen(o => !o)}
                className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                <ListChecks size={13}/> Outline
              </button>
            )}
          </div>
          {steps.length > 0 && (
            <>
              <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                <div className="h-full bg-blue-500 transition-all" style={{ width: `${stepPct}%` }}/>
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">Step {stepIdx + 1} of {steps.length}</p>
            </>
          )}
          {course.completion && (
            <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-2">
              ✓ Course completed {new Date(course.completion.completed_at).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Outline drawer */}
        {outlineOpen && steps.length > 0 && (
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3">
            <div className="flex items-center justify-between mb-2 px-1">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Course outline</p>
              <button onClick={() => setOutlineOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={14}/></button>
            </div>
            <div className="space-y-0.5">
              {lessons.map((l, i) => {
                const Icon = LESSON_ICON[l.lesson_type]
                const done = lessonDone(l)
                const active = step?.lessonIndex === i
                return (
                  <button
                    key={l.id}
                    onClick={() => jumpToLesson(i)}
                    className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-left text-sm transition-colors ${active ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'}`}
                  >
                    {done ? <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0"/> : <Circle size={16} className="text-slate-400 flex-shrink-0"/>}
                    <Icon size={14} className="text-slate-400 flex-shrink-0"/>
                    <span className="flex-1 truncate">{l.title}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Current step */}
        {!step ? (
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 text-center text-sm text-slate-500 dark:text-slate-400">
            This course doesn&apos;t have any lessons yet.
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
            {/* Step header */}
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/40">
              {(() => { const Icon = LESSON_ICON[step.lesson.lesson_type]; return <Icon size={15} className="text-slate-400 flex-shrink-0"/> })()}
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Lesson {step.lessonIndex + 1}</span>
              <span className="text-sm font-medium text-slate-800 dark:text-slate-100 flex-1 truncate">{step.lesson.title}</span>
              {step.kind === 'kb' && step.sectionCount > 1 && (
                <span className="text-[11px] text-slate-400 flex-shrink-0">{step.sectionIndex + 1}/{step.sectionCount}</span>
              )}
              {lessonDone(step.lesson) && <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0"/>}
            </div>

            <div className="p-4 md:p-5">
              {step.kind === 'kb' && (
                <MarkdownContent content={step.section.body} />
              )}

              {step.kind === 'kb-link' && (
                <div className="space-y-3">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {step.lesson.description || 'This lesson links to a knowledge base topic.'}
                  </p>
                  {step.lesson.kb_topic_slug && (
                    <a
                      href={`/knowledge/${step.lesson.kb_topic_slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                      <BookOpen size={14}/> Open knowledge base topic <ExternalLink size={13}/>
                    </a>
                  )}
                </div>
              )}

              {step.kind === 'video' && (
                <div className="space-y-3">
                  {step.lesson.description && <p className="text-sm text-slate-500 dark:text-slate-400">{step.lesson.description}</p>}
                  {step.lesson.video_url && <YouTubeEmbed url={step.lesson.video_url} title={step.lesson.title}/>}
                </div>
              )}

              {step.kind === 'quiz' && (
                <div className="space-y-3">
                  {step.lesson.description && <p className="text-sm text-slate-500 dark:text-slate-400">{step.lesson.description}</p>}
                  <QuizLesson lesson={step.lesson} onCompleted={(c) => onQuizCompleted(step.lesson.id, c)}/>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step navigation */}
        {steps.length > 0 && (
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => { setStepIdx(i => Math.max(0, i - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
              disabled={atFirst}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-default"
            >
              <ChevronLeft size={15}/> Back
            </button>

            <div className="flex flex-col items-end gap-1">
              <button
                onClick={goNext}
                disabled={marking || quizBlocked}
                title={quizBlocked ? 'Pass the quiz to continue' : undefined}
                className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {marking && <Loader2 size={14} className="animate-spin"/>}
                {atLast ? 'Finish' : 'Next'}
                {!atLast && <ChevronRight size={15}/>}
              </button>
              {quizBlocked && <p className="text-[11px] text-amber-600 dark:text-amber-400">Pass the quiz to continue</p>}
            </div>
          </div>
        )}
      </div>
    </PageShell>
  )
}
