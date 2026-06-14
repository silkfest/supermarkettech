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
  const options = Array.isArray(body.options) ? body.options.map((o: string) => String(o).trim()).filter(Boolean) : []
  if (options.length < 2) return NextResponse.json({ error: 'At least 2 options required' }, { status: 400 })
  const correctIndex = Number(body.correct_index)
  if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= options.length) {
    return NextResponse.json({ error: 'Invalid correct_index' }, { status: 400 })
  }

  const { data, error } = await supabase.from('quiz_questions').insert({
    lesson_id:     lessonId,
    question:      body.question?.trim() ?? '',
    options,
    correct_index: correctIndex,
    explanation:   body.explanation?.trim() ?? '',
    sort_order:    body.sort_order ?? 0,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
