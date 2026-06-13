'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  CheckCircle2, Circle, Loader2, BookOpen, Video, HelpCircle,
  ExternalLink, Clock, ChevronRight, RotateCcw,
} from 'lucide-react'
import PageShell from '@/components/layout/PageShell'
import PageHeader from '@/components/PageHeader'
import YouTubeEmbed from '@/components/training/YouTubeEmbed'

interface LessonCompletion { completed_at: string; score: number | null; total: number | null; passed: boolean | null }
interface QuizQuestion { id: string; question: string; options: string[]; sort_order: number; correct_index?: number; explanation?: string }
interface Lesson {
  id: string; title: string; description: string; lesson_type: 'kb_topic' | 'video' | 'quiz'
  kb_topic_slug: string | null; video_url: string | null; sort_order: number
  questions?: QuizQuestion[]
  completion: LessonCompletion | null
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

export default function CoursePlayerPage() {
  const params = useParams()
  const router = useRouter()
  const courseId = params.id as string

  const [course, setCourse] = useState<CourseInfo | null>(null)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [loading, setLoading] = useState(true)
  const [marking, setMarking] = useState<string | null>(null)

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

  async function markComplete(lesson: Lesson) {
    setMarking(lesson.id)
    const res = await fetch(`/api/apprentice/lessons/${lesson.id}/complete`, { method: 'POST' })
    if (res.ok) {
      const data = await res.json()
      setLessons(prev => prev.map(l => l.id === lesson.id ? { ...l, completion: data } : l))
      // Refresh course completion status in case this was the final lesson
      const courseRes = await fetch(`/api/apprentice/courses/${courseId}/lessons`)
      if (courseRes.ok) {
        const courseData = await courseRes.json()
        setCourse(courseData.course)
      }
    }
    setMarking(null)
  }

  function onQuizCompleted(lessonId: string, completion: LessonCompletion) {
    setLessons(prev => prev.map(l => l.id === lessonId ? { ...l, completion } : l))
    if (completion.passed) {
      fetch(`/api/apprentice/courses/${courseId}/lessons`).then(r => r.ok && r.json()).then(d => d && setCourse(d.course))
    }
  }

  if (loading) {
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

  const completedCount = lessons.filter(l => l.completion && (l.lesson_type !== 'quiz' || l.completion.passed)).length
  const progressPct = lessons.length ? Math.round((completedCount / lessons.length) * 100) : 0

  return (
    <PageShell>
      <PageHeader title={course.title} back="/apprentice/training" variant="learning"/>

      <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 space-y-5">
        {/* Course summary */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white">{course.title}</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{course.description}</p>
            </div>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${course.completion ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
              +{course.points} XP
            </span>
          </div>
          <div className="flex items-center gap-3 mb-2">
            {course.duration_minutes > 0 && (
              <span className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                <Clock size={11}/> {course.duration_minutes} min
              </span>
            )}
            {lessons.length > 0 && (
              <span className="text-[11px] text-slate-500 dark:text-slate-400">{completedCount}/{lessons.length} lessons complete</span>
            )}
            {course.url && (
              <a href={course.url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-blue-600 dark:text-blue-400 flex items-center gap-1 hover:underline">
                <ExternalLink size={11}/> External resource
              </a>
            )}
          </div>
          {lessons.length > 0 && (
            <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
              <div className="h-full bg-blue-500 transition-all" style={{ width: `${progressPct}%` }}/>
            </div>
          )}
          {course.completion && (
            <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-2">
              ✓ Course completed {new Date(course.completion.completed_at).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Lessons */}
        {lessons.length === 0 && (
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 text-center text-sm text-slate-500 dark:text-slate-400">
            This course doesn&apos;t have any lessons yet.
          </div>
        )}

        {lessons.map((lesson, i) => {
          const Icon = LESSON_ICON[lesson.lesson_type]
          const done = !!lesson.completion && (lesson.lesson_type !== 'quiz' || lesson.completion.passed)

          return (
            <div key={lesson.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/40">
                {done ? <CheckCircle2 size={18} className="text-emerald-500 flex-shrink-0"/> : <Circle size={18} className="text-slate-400 flex-shrink-0"/>}
                <Icon size={16} className="text-slate-400 flex-shrink-0"/>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Lesson {i + 1}</span>
                <span className="text-sm font-medium text-slate-800 dark:text-slate-100 flex-1 truncate">{lesson.title}</span>
              </div>

              <div className="p-4 space-y-3">
                {lesson.description && <p className="text-sm text-slate-500 dark:text-slate-400">{lesson.description}</p>}

                {lesson.lesson_type === 'kb_topic' && lesson.kb_topic_slug && (
                  <>
                    <button
                      onClick={() => router.push(`/knowledge/${lesson.kb_topic_slug}`)}
                      className="w-full sm:w-auto px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-center gap-2"
                    >
                      <BookOpen size={14}/> Read knowledge base topic <ChevronRight size={14}/>
                    </button>
                    {!done && (
                      <button
                        onClick={() => markComplete(lesson)}
                        disabled={marking === lesson.id}
                        className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-40 flex items-center gap-2"
                      >
                        {marking === lesson.id && <Loader2 size={14} className="animate-spin"/>}
                        Mark as read
                      </button>
                    )}
                  </>
                )}

                {lesson.lesson_type === 'video' && lesson.video_url && (
                  <>
                    <YouTubeEmbed url={lesson.video_url} title={lesson.title}/>
                    {!done && (
                      <button
                        onClick={() => markComplete(lesson)}
                        disabled={marking === lesson.id}
                        className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-40 flex items-center gap-2"
                      >
                        {marking === lesson.id && <Loader2 size={14} className="animate-spin"/>}
                        Mark as watched
                      </button>
                    )}
                  </>
                )}

                {lesson.lesson_type === 'quiz' && (
                  <QuizLesson lesson={lesson} onCompleted={(c) => onQuizCompleted(lesson.id, c)}/>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </PageShell>
  )
}
