import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseRouteAuth } from '@/lib/supabase/client'
import { maybeCompleteCourse, QUIZ_PASS_PERCENT } from '@/lib/apprentice/lessonCompletion'

export async function POST(req: NextRequest, { params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params
  const { data: { user } } = await getSupabaseRouteAuth(req).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseServer()

  const { data: lesson, error: lessonError } = await supabase
    .from('course_lessons')
    .select('id, course_id, lesson_type')
    .eq('id', lessonId)
    .single()

  if (lessonError) return NextResponse.json({ error: lessonError.message }, { status: 404 })
  if (lesson.lesson_type !== 'quiz') return NextResponse.json({ error: 'Not a quiz lesson' }, { status: 400 })

  const body = await req.json().catch(() => ({}))
  const answers: unknown[] = Array.isArray(body.answers) ? body.answers : []

  const { data: questions, error: questionsError } = await supabase
    .from('quiz_questions')
    .select('id, correct_index, explanation, options, question')
    .eq('lesson_id', lessonId)
    .order('sort_order')
    .order('created_at')

  if (questionsError) return NextResponse.json({ error: questionsError.message }, { status: 500 })
  if (!questions || questions.length === 0) return NextResponse.json({ error: 'Quiz has no questions' }, { status: 400 })

  let correctCount = 0
  const results = questions.map((q, i) => {
    const submitted = answers[i]
    const isCorrect = submitted === q.correct_index
    if (isCorrect) correctCount++
    return {
      question_id:   q.id,
      correct_index: q.correct_index,
      explanation:   q.explanation,
      submitted,
      is_correct:    isCorrect,
    }
  })

  const total = questions.length
  const percent = Math.round((correctCount / total) * 100)
  const passed = percent >= QUIZ_PASS_PERCENT

  const { data, error } = await supabase.from('lesson_completions').upsert({
    user_id:      user.id,
    lesson_id:    lessonId,
    completed_at: new Date().toISOString(),
    score:        correctCount,
    total,
    passed,
  }, { onConflict: 'user_id,lesson_id' }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (passed) {
    await maybeCompleteCourse(supabase, user.id, lesson.course_id)
  }

  return NextResponse.json({
    completion: data,
    score: correctCount,
    total,
    percent,
    passed,
    pass_threshold: QUIZ_PASS_PERCENT,
    results,
  }, { status: 201 })
}
