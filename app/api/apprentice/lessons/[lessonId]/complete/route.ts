import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseRouteAuth } from '@/lib/supabase/client'
import { maybeCompleteCourse } from '@/lib/apprentice/lessonCompletion'

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
  if (lesson.lesson_type === 'quiz') {
    return NextResponse.json({ error: 'Quiz lessons must be completed via the quiz endpoint' }, { status: 400 })
  }

  const { data, error } = await supabase.from('lesson_completions').upsert({
    user_id:      user.id,
    lesson_id:    lessonId,
    completed_at: new Date().toISOString(),
    score:        null,
    total:        null,
    passed:       true,
  }, { onConflict: 'user_id,lesson_id' }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await maybeCompleteCourse(supabase, user.id, lesson.course_id)

  return NextResponse.json(data, { status: 201 })
}
