'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  CheckCircle2, Circle, Loader2, BookOpen, Video, HelpCircle,
  ExternalLink, RotateCcw, ChevronLeft, ChevronRight, ListChecks, X,
  Gauge, ClipboardCheck,
} from 'lucide-react'
import PageShell from '@/components/layout/PageShell'
import PageHeader from '@/components/PageHeader'
import YouTubeEmbed from '@/components/training/YouTubeEmbed'
import MarkdownContent from '@/components/knowledge/MarkdownContent'
import HotspotDiagram, { type HotspotPoint } from '@/components/training/HotspotDiagram'
import { getTopicBySlug } from '@/lib/knowledge/topics'

interface LessonCompletion { completed_at: string; score: number | null; total: number | null; passed: boolean | null }
type QuestionType = 'single' | 'multiple' | 'true_false' | 'fill_blank' | 'hotspot'
interface QuizQuestion {
  id: string; question: string; options: string[]; sort_order: number; question_type: QuestionType
  placement?: 'end' | 'inline'; section_anchor?: string | null
  hotspot_diagram?: string | null; hotspot_points?: HotspotPoint[]
  correct_index?: number; correct_indices?: number[]; correct_text?: string[]; explanation?: string
}
type Answer = number | number[] | string | Record<string, string> | null

interface TaskInfo { id: string; title: string; category: string; status: string }

interface Lesson {
  id: string; title: string; description: string; lesson_type: 'kb_topic' | 'video' | 'quiz' | 'simulator' | 'field_task'
  kb_topic_slug: string | null; video_url: string | null; sort_order: number
  simulator_path?: string | null; training_task_id?: string | null; task?: TaskInfo | null
  questions?: QuizQuestion[]
  inlineQuestions?: QuizQuestion[]
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
  question_id: string
  correct_index?: number; correct_indices?: number[]; correct_text?: string[]; hotspot_points?: HotspotPoint[]
  explanation: string; submitted: unknown; is_correct: boolean
}
interface QuizResponse {
  score: number; total: number; percent: number; passed: boolean; pass_threshold: number; results: QuizResult[]
}

const LESSON_ICON: Record<Lesson['lesson_type'], React.ComponentType<{ size?: number; className?: string }>> = {
  kb_topic: BookOpen,
  video: Video,
  quiz: HelpCircle,
  simulator: Gauge,
  field_task: ClipboardCheck,
}

function emptyAnswer(type: QuestionType): Answer {
  if (type === 'multiple') return []
  if (type === 'fill_blank') return ''
  if (type === 'hotspot') return {}
  return null
}

function isAnswered(type: QuestionType, answer: Answer): boolean {
  if (type === 'multiple') return Array.isArray(answer) && answer.length > 0
  if (type === 'fill_blank') return typeof answer === 'string' && answer.trim().length > 0
  if (type === 'hotspot') return !!answer && typeof answer === 'object' && !Array.isArray(answer) && Object.keys(answer).length > 0
  return answer !== null
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

// ── Single-question interaction (shared by end-of-lesson quizzes and inline checks) ──
function QuestionBody({
  q, answer, onChange, disabled, result,
}: {
  q: QuizQuestion; answer: Answer; onChange: (a: Answer) => void; disabled: boolean; result?: QuizResult
}) {
  const [selectedWord, setSelectedWord] = useState<string | null>(null)

  if (q.question_type === 'multiple') {
    const selected = Array.isArray(answer) ? answer : []
    return (
      <div className="space-y-1.5">
        {q.options.map((opt, oi) => {
          const isSelected = selected.includes(oi)
          const correctSet = new Set(result?.correct_indices ?? [])
          let cls = 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600'
          if (result) {
            if (correctSet.has(oi)) cls = 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-500'
            else if (isSelected) cls = 'border-red-400 bg-red-50 dark:bg-red-900/20 dark:border-red-500'
          } else if (isSelected) {
            cls = 'border-blue-400 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-500'
          }
          return (
            <button
              key={oi}
              disabled={disabled}
              onClick={() => onChange(isSelected ? selected.filter(i => i !== oi) : [...selected, oi])}
              className={`w-full text-left text-sm px-3 py-2 rounded-lg border transition-colors disabled:cursor-default ${cls} text-slate-700 dark:text-slate-200`}
            >
              {opt}
            </button>
          )
        })}
        <p className="text-[11px] text-slate-400">Select all that apply.</p>
      </div>
    )
  }

  if (q.question_type === 'fill_blank') {
    const value = typeof answer === 'string' ? answer : ''
    let cls = 'border-slate-200 dark:border-slate-700 focus:border-blue-400'
    if (result) cls = result.is_correct ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20' : 'border-red-400 bg-red-50 dark:bg-red-900/20'
    return (
      <div className="space-y-1.5">
        <input
          type="text"
          value={value}
          disabled={disabled}
          onChange={e => onChange(e.target.value)}
          placeholder="Type your answer..."
          className={`w-full text-sm px-3 py-2 rounded-lg border bg-white dark:bg-slate-800 outline-none ${cls} text-slate-700 dark:text-slate-200`}
        />
        {result && !result.is_correct && (
          <p className="text-xs text-slate-500 dark:text-slate-400">Accepted answer: {(result.correct_text ?? []).join(' / ')}</p>
        )}
      </div>
    )
  }

  if (q.question_type === 'hotspot') {
    const value = (answer && typeof answer === 'object' && !Array.isArray(answer)) ? answer as Record<string, string> : {}
    const points = q.hotspot_points ?? []
    const resultPoints = result?.hotspot_points
    const pointResult: Record<string, boolean> | undefined = resultPoints
      ? Object.fromEntries(resultPoints.map(p => [p.id, value[p.id] === p.label]))
      : undefined
    return (
      <HotspotDiagram
        diagram={q.hotspot_diagram ?? ''}
        points={points}
        value={value}
        onChange={(next) => onChange(next)}
        disabled={disabled}
        result={pointResult}
        selectedWord={selectedWord}
        onSelectWord={setSelectedWord}
      />
    )
  }

  // single / true_false
  const selected = typeof answer === 'number' ? answer : null
  return (
    <div className="space-y-1.5">
      {q.options.map((opt, oi) => {
        const isSelected = selected === oi
        let cls = 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600'
        if (result) {
          if (oi === result.correct_index) cls = 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-500'
          else if (isSelected) cls = 'border-red-400 bg-red-50 dark:bg-red-900/20 dark:border-red-500'
        } else if (isSelected) {
          cls = 'border-blue-400 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-500'
        }
        return (
          <button
            key={oi}
            disabled={disabled}
            onClick={() => onChange(oi)}
            className={`w-full text-left text-sm px-3 py-2 rounded-lg border transition-colors disabled:cursor-default ${cls} text-slate-700 dark:text-slate-200`}
          >
            {opt}
          </button>
        )
      })}
    </div>
  )
}

// ── Inline knowledge check (shown within a kb_topic section) ────────────────────
function InlineCheck({ q }: { q: QuizQuestion }) {
  const [answer, setAnswer] = useState<Answer>(() => emptyAnswer(q.question_type))
  const [result, setResult] = useState<QuizResult | null>(null)
  const [checking, setChecking] = useState(false)

  async function check() {
    setChecking(true)
    const res = await fetch(`/api/apprentice/questions/${q.id}/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answer }),
    })
    const data = await res.json()
    setChecking(false)
    if (res.ok) setResult({ question_id: q.id, submitted: answer, ...data })
  }

  function retry() {
    setResult(null)
    setAnswer(emptyAnswer(q.question_type))
  }

  return (
    <div className="rounded-lg border border-blue-200 dark:border-blue-700/50 bg-blue-50/50 dark:bg-blue-900/10 p-3 my-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-blue-500 dark:text-blue-400 mb-1.5">Quick check</p>
      <p className="text-sm font-medium text-slate-800 dark:text-slate-100 mb-2">{q.question}</p>
      <QuestionBody q={q} answer={answer} onChange={setAnswer} disabled={!!result} result={result ?? undefined} />
      {!result ? (
        <button
          onClick={check}
          disabled={!isAnswered(q.question_type, answer) || checking}
          className="mt-2 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 disabled:opacity-40 flex items-center gap-2"
        >
          {checking && <Loader2 size={12} className="animate-spin"/>}
          Check answer
        </button>
      ) : (
        <div className="mt-2">
          <p className={`text-xs ${result.is_correct ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            {result.is_correct ? 'Correct! ' : 'Not quite. '}{result.explanation}
          </p>
          {!result.is_correct && (
            <button onClick={retry} className="mt-1.5 text-xs flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline">
              <RotateCcw size={12}/> Try again
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Quiz step ──────────────────────────────────────────────────────────────────
function QuizLesson({ lesson, onCompleted }: { lesson: Lesson; onCompleted: (completion: LessonCompletion) => void }) {
  const questions = lesson.questions ?? []
  const [answers, setAnswers] = useState<Answer[]>(() => questions.map(q => emptyAnswer(q.question_type)))
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<QuizResponse | null>(null)

  const allAnswered = questions.every((q, i) => isAnswered(q.question_type, answers[i]))

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
    setAnswers(questions.map(q => emptyAnswer(q.question_type)))
  }

  return (
    <div className="space-y-4">
      {questions.map((q, qi) => {
        const r = result?.results.find(res => res.question_id === q.id)
        return (
          <div key={q.id} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-100 mb-2">{qi + 1}. {q.question}</p>
            <QuestionBody q={q} answer={answers[qi]} onChange={(a) => setAnswers(prev => prev.map((p, i) => i === qi ? a : p))} disabled={!!result} result={r}/>
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
  | { kind: 'simulator'; lesson: Lesson; lessonIndex: number; lastOfLesson: boolean }
  | { kind: 'field-task'; lesson: Lesson; lessonIndex: number; lastOfLesson: boolean }

function lessonDone(l: Lesson) {
  return !!l.completion && (l.lesson_type !== 'quiz' || l.completion.passed)
}

const TASK_STATUS_LABEL: Record<string, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  pending_review: 'Pending manager review',
  completed: 'Completed',
}
const TASK_STATUS_CLASS: Record<string, string> = {
  not_started: 'text-slate-500 dark:text-slate-400',
  in_progress: 'text-blue-600 dark:text-blue-400',
  pending_review: 'text-amber-600 dark:text-amber-400',
  completed: 'text-emerald-600 dark:text-emerald-400',
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
      } else if (lesson.lesson_type === 'simulator') {
        out.push({ kind: 'simulator', lesson, lessonIndex, lastOfLesson: true })
      } else if (lesson.lesson_type === 'field_task') {
        out.push({ kind: 'field-task', lesson, lessonIndex, lastOfLesson: true })
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
    // Reading lessons (KB last section, external KB link, video, simulator, field task)
    // auto-complete on advancing — like kb-link, these are self-reported.
    if ((step.kind === 'kb' && step.lastOfLesson) || step.kind === 'kb-link' || step.kind === 'video'
      || step.kind === 'simulator' || step.kind === 'field-task') {
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
                <>
                  <MarkdownContent content={step.section.body} />
                  {(step.lesson.inlineQuestions ?? [])
                    .filter(q => q.section_anchor === step.section.title)
                    .map(q => <InlineCheck key={q.id} q={q} />)}
                </>
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

              {step.kind === 'simulator' && (
                <div className="space-y-3">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {step.lesson.description || 'Apply what you just learned in the rack simulator.'}
                  </p>
                  {step.lesson.simulator_path && (
                    <a
                      href={step.lesson.simulator_path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700"
                    >
                      <Gauge size={14}/> Open simulator <ExternalLink size={13}/>
                    </a>
                  )}
                  <p className="text-[11px] text-slate-400">Run at least one scenario attempt, then mark this lesson done.</p>
                </div>
              )}

              {step.kind === 'field-task' && (
                <div className="space-y-3">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {step.lesson.description || 'Apply this on the job and have your manager sign off in the Tasks tab.'}
                  </p>
                  {step.lesson.task && (
                    <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{step.lesson.task.category}</p>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{step.lesson.task.title}</p>
                      <p className={`text-xs mt-1 ${TASK_STATUS_CLASS[step.lesson.task.status] ?? 'text-slate-500'}`}>
                        Status: {TASK_STATUS_LABEL[step.lesson.task.status] ?? step.lesson.task.status}
                      </p>
                    </div>
                  )}
                  <a
                    href="/apprentice/training"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    <ClipboardCheck size={14}/> Go to Tasks <ExternalLink size={13}/>
                  </a>
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
