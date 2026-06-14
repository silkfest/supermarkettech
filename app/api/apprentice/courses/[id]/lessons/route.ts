import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseRouteAuth } from '@/lib/supabase/client'

const ELEVATED_ROLES = ['admin', 'manager']

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data: { user } } = await getSupabaseRouteAuth(req).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseServer()
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  const role = (profile as { role: string } | null)?.role ?? ''
  const isElevated = ELEVATED_ROLES.includes(role)

  const [courseRes, lessonsRes, courseCompletionRes] = await Promise.all([
    supabase.from('courses').select('*').eq('id', id).single(),
    supabase.from('course_lessons').select('*').eq('course_id', id).order('sort_order').order('created_at'),
    supabase.from('course_completions').select('completed_at, notes').eq('user_id', user.id).eq('course_id', id).maybeSingle(),
  ])

  if (courseRes.error) return NextResponse.json({ error: courseRes.error.message }, { status: 404 })
  if (lessonsRes.error) return NextResponse.json({ error: lessonsRes.error.message }, { status: 500 })

  const lessons = lessonsRes.data ?? []
  const lessonIds = lessons.map(l => l.id)
  const taskIds = [...new Set(lessons.map(l => l.training_task_id).filter(Boolean))]

  const [questionsRes, lessonCompletionsRes, tasksRes, taskProgressRes] = await Promise.all([
    lessonIds.length
      ? supabase.from('quiz_questions').select('*').in('lesson_id', lessonIds).order('sort_order').order('created_at')
      : Promise.resolve({ data: [], error: null }),
    lessonIds.length
      ? supabase.from('lesson_completions').select('lesson_id, completed_at, score, total, passed').eq('user_id', user.id).in('lesson_id', lessonIds)
      : Promise.resolve({ data: [], error: null }),
    taskIds.length
      ? supabase.from('training_tasks').select('id, title, category').in('id', taskIds)
      : Promise.resolve({ data: [], error: null }),
    taskIds.length
      ? supabase.from('apprentice_progress').select('task_id, status').eq('user_id', user.id).in('task_id', taskIds)
      : Promise.resolve({ data: [], error: null }),
  ])

  if (questionsRes.error) return NextResponse.json({ error: questionsRes.error.message }, { status: 500 })

  const completionMap: Record<string, { completed_at: string; score: number | null; total: number | null; passed: boolean | null }> = {}
  for (const c of lessonCompletionsRes.data ?? []) {
    completionMap[c.lesson_id] = { completed_at: c.completed_at, score: c.score, total: c.total, passed: c.passed }
  }

  const taskMap = new Map((tasksRes.data ?? []).map(t => [t.id, t]))
  const taskProgressMap = new Map((taskProgressRes.data ?? []).map(p => [p.task_id, p.status]))

  // Quiz/inline questions, grouped by lesson. End-of-lesson quiz questions hide
  // correct answers from non-elevated users; inline checks are graded separately
  // via /api/apprentice/questions/[id]/check, so the answer key is withheld either way.
  const questionsByLesson: Record<string, unknown[]> = {}
  for (const q of questionsRes.data ?? []) {
    const entry: Record<string, unknown> = {
      id: q.id,
      question: q.question,
      options: q.options,
      sort_order: q.sort_order,
      question_type: q.question_type,
      placement: q.placement,
      section_anchor: q.section_anchor,
      hotspot_diagram: q.hotspot_diagram,
      // hotspot_points (with labels) form the word bank shown to the student — the
      // secret is the marker<->label mapping, not the label set, so always send it.
      hotspot_points: q.question_type === 'hotspot' ? q.hotspot_points : undefined,
    }
    if (isElevated) {
      entry.correct_index = q.correct_index
      entry.correct_indices = q.correct_indices
      entry.correct_text = q.correct_text
      entry.explanation = q.explanation
    }
    if (!questionsByLesson[q.lesson_id]) questionsByLesson[q.lesson_id] = []
    questionsByLesson[q.lesson_id].push(entry)
  }

  const merged = lessons.map(l => {
    const allQuestions = (questionsByLesson[l.id] ?? []) as Array<Record<string, unknown>>
    const task = l.training_task_id ? taskMap.get(l.training_task_id) : null
    return {
      ...l,
      questions: l.lesson_type === 'quiz' ? allQuestions.filter(q => q.placement === 'end') : undefined,
      inlineQuestions: l.lesson_type === 'kb_topic' ? allQuestions.filter(q => q.placement === 'inline') : undefined,
      completion: completionMap[l.id] ?? null,
      task: task ? { ...task, status: taskProgressMap.get(l.training_task_id) ?? 'not_started' } : null,
    }
  })

  return NextResponse.json({
    course: { ...courseRes.data, completion: courseCompletionRes.data ?? null },
    lessons: merged,
  })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data: { user } } = await getSupabaseRouteAuth(req).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseServer()
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  const role = (profile as { role: string } | null)?.role ?? ''
  if (!ELEVATED_ROLES.includes(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const lessonType = body.lesson_type
  if (!['kb_topic', 'video', 'quiz', 'simulator', 'field_task'].includes(lessonType)) {
    return NextResponse.json({ error: 'Invalid lesson_type' }, { status: 400 })
  }

  const { data, error } = await supabase.from('course_lessons').insert({
    course_id:     id,
    title:         body.title?.trim() ?? '',
    description:   body.description?.trim() ?? '',
    lesson_type:   lessonType,
    kb_topic_slug: body.kb_topic_slug?.trim() || null,
    video_url:     body.video_url?.trim() || null,
    simulator_path: body.simulator_path?.trim() || null,
    training_task_id: body.training_task_id?.trim() || null,
    sort_order:    body.sort_order ?? 0,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
