import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseRouteAuth } from '@/lib/supabase/client'

const ELEVATED_ROLES = ['admin', 'manager']

export async function POST(req: NextRequest, { params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params
  const { data: { user } } = await getSupabaseRouteAuth(req).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseServer()
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  const role = (profile as { role: string } | null)?.role ?? ''
  if (!ELEVATED_ROLES.includes(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const questionType: string = ['single', 'multiple', 'true_false', 'fill_blank', 'hotspot'].includes(body.question_type)
    ? body.question_type
    : 'single'

  const insert: Record<string, unknown> = {
    lesson_id:     lessonId,
    question:      body.question?.trim() ?? '',
    explanation:   body.explanation?.trim() ?? '',
    sort_order:    body.sort_order ?? 0,
    question_type: questionType,
    placement:     body.placement === 'inline' ? 'inline' : 'end',
    section_anchor: body.section_anchor?.trim() || null,
    options: [],
  }

  if (questionType === 'single' || questionType === 'true_false') {
    const options = questionType === 'true_false'
      ? ['True', 'False']
      : (Array.isArray(body.options) ? body.options.map((o: string) => String(o).trim()).filter(Boolean) : [])
    if (options.length < 2) return NextResponse.json({ error: 'At least 2 options required' }, { status: 400 })
    const correctIndex = Number(body.correct_index)
    if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= options.length) {
      return NextResponse.json({ error: 'Invalid correct_index' }, { status: 400 })
    }
    insert.options = options
    insert.correct_index = correctIndex
  } else if (questionType === 'multiple') {
    const options = Array.isArray(body.options) ? body.options.map((o: string) => String(o).trim()).filter(Boolean) : []
    if (options.length < 2) return NextResponse.json({ error: 'At least 2 options required' }, { status: 400 })
    const correctIndices = Array.isArray(body.correct_indices) ? body.correct_indices.map(Number) : []
    if (correctIndices.length === 0 || correctIndices.some((i: number) => !Number.isInteger(i) || i < 0 || i >= options.length)) {
      return NextResponse.json({ error: 'Invalid correct_indices' }, { status: 400 })
    }
    insert.options = options
    insert.correct_indices = correctIndices
  } else if (questionType === 'fill_blank') {
    const correctText = Array.isArray(body.correct_text)
      ? body.correct_text.map((s: string) => String(s).trim()).filter(Boolean)
      : (body.correct_text ? [String(body.correct_text).trim()] : [])
    if (correctText.length === 0) return NextResponse.json({ error: 'At least one acceptable answer required' }, { status: 400 })
    insert.correct_text = correctText
  } else if (questionType === 'hotspot') {
    const hotspotPoints = Array.isArray(body.hotspot_points) ? body.hotspot_points : []
    if (!body.hotspot_diagram || hotspotPoints.length === 0) {
      return NextResponse.json({ error: 'hotspot_diagram and hotspot_points required' }, { status: 400 })
    }
    insert.hotspot_diagram = body.hotspot_diagram
    insert.hotspot_points = hotspotPoints
  }

  const { data, error } = await supabase.from('quiz_questions').insert(insert).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
