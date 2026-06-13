import { getSupabaseServer } from '@/lib/supabase/client'

export const QUIZ_PASS_PERCENT = 70

/**
 * After a lesson is completed/passed, checks whether every lesson in the
 * course is now done (quizzes must be passed) and if so marks the course
 * itself complete for the user, awarding its points via course_completions.
 */
export async function maybeCompleteCourse(
  supabase: ReturnType<typeof getSupabaseServer>,
  userId: string,
  courseId: string,
) {
  const { data: lessons } = await supabase
    .from('course_lessons')
    .select('id, lesson_type')
    .eq('course_id', courseId)

  if (!lessons || lessons.length === 0) return

  const lessonIds = lessons.map(l => l.id)
  const { data: completions } = await supabase
    .from('lesson_completions')
    .select('lesson_id, passed')
    .eq('user_id', userId)
    .in('lesson_id', lessonIds)

  const completionMap = new Map((completions ?? []).map(c => [c.lesson_id, c.passed]))

  const allDone = lessons.every(l => {
    const passed = completionMap.get(l.id)
    if (!completionMap.has(l.id)) return false
    if (l.lesson_type === 'quiz') return passed === true
    return true
  })

  if (!allDone) return

  await supabase.from('course_completions').upsert({
    user_id:      userId,
    course_id:    courseId,
    completed_at: new Date().toISOString(),
    notes:        '',
  }, { onConflict: 'user_id,course_id' })
}
