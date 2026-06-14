import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseRouteAuth } from '@/lib/supabase/client'
import { gradeQuestion } from '@/lib/apprentice/gradeQuestion'

// Grades a single inline knowledge-check question. Formative only — does not
// affect lesson_completions or course progress.
export async function POST(req: NextRequest, { params }: { params: Promise<{ questionId: string }> }) {
  const { questionId } = await params
  const { data: { user } } = await getSupabaseRouteAuth(req).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseServer()
  const { data: question, error } = await supabase
    .from('quiz_questions')
    .select('id, question_type, correct_index, correct_indices, correct_text, hotspot_points, explanation')
    .eq('id', questionId)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const isCorrect = gradeQuestion(question, body.answer)

  return NextResponse.json({
    is_correct:      isCorrect,
    explanation:     question.explanation,
    correct_index:   question.correct_index,
    correct_indices: question.correct_indices,
    correct_text:    question.correct_text,
    hotspot_points:  question.hotspot_points,
  })
}
