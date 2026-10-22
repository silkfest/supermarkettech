import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseRouteAuth } from '@/lib/supabase/client'
import { practiceTarget, hasFieldSignoff } from '@/lib/apprentice/practiceEvidence'
import { maybeCompleteCourse } from '@/lib/apprentice/lessonCompletion'

export async function POST(req: NextRequest, { params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params
  const { data: { user } } = await getSupabaseRouteAuth(req).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseServer()

  const { data: lesson, error: lessonError } = await supabase
    .from('course_lessons')
    .select('id, course_id, lesson_type, simulator_path, training_task_id')
    .eq('id', lessonId)
    .single()

  if (lessonError) return NextResponse.json({ error: lessonError.message }, { status: 404 })
  if (lesson.lesson_type === 'quiz') {
    return NextResponse.json({ error: 'Quiz lessons must be completed via the quiz endpoint' }, { status: 400 })
  }

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!['admin', 'manager'].includes(profile?.role ?? '')) {
    const { data: assignment } = await supabase.from('course_assignments').select('id')
      .eq('course_id', lesson.course_id).or(`user_id.eq.${user.id},role.eq.${profile?.role ?? ''}`).limit(1).maybeSingle()
    if (!assignment) return NextResponse.json({ error: 'This course is not assigned to you' }, { status: 403 })
  }
  if (lesson.lesson_type === 'simulator') {
    const target = practiceTarget(lesson.simulator_path)
    if (!target) return NextResponse.json({ error: 'This lesson needs an attempt-tracked simulator. Ask your course author to update its link.' }, { status: 409 })
    let query = supabase.from('simulator_attempts').select('id').eq('user_id', user.id).eq('rack', target.rack)
    if (target.scenarioPrefix) query = query.like('scenario_id', `${target.scenarioPrefix}%`)
    const { data: attempt, error } = await query.limit(1).maybeSingle()
    if (error) return NextResponse.json({ error: 'Could not check your practice record. Try again.' }, { status: 503 })
    if (!attempt) return NextResponse.json({ error: 'Complete an attempt in this simulator, then return and continue. Recorded practice is not a competency sign-off.' }, { status: 409 })
  }
  if (lesson.lesson_type === 'field_task') {
    if (!lesson.training_task_id) return NextResponse.json({ error: 'This lesson needs a linked field task. Ask your course author to add one.' }, { status: 409 })
    const { data: progress, error } = await supabase.from('apprentice_progress').select('status, verified_by')
      .eq('user_id', user.id).eq('task_id', lesson.training_task_id).maybeSingle()
    if (error) return NextResponse.json({ error: 'Could not check your field-task record. Try again.' }, { status: 503 })
    if (!hasFieldSignoff(progress, user.id)) return NextResponse.json({ error: 'The linked task needs sign-off from another authorised reviewer in My training before you can continue.' }, { status: 409 })
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
