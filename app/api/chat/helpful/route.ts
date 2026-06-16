import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseRouteAuth } from '@/lib/supabase/client'

export async function POST(req: NextRequest) {
  const { data: { user } } = await getSupabaseRouteAuth(req).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const questionText = typeof body?.questionText === 'string' ? body.questionText.trim() : ''
  const sessionId   = typeof body?.sessionId   === 'string' ? body.sessionId   : null

  if (questionText.length < 10) {
    return NextResponse.json({ error: 'Question too short' }, { status: 400 })
  }

  const supabase = getSupabaseServer()
  const { error } = await supabase.from('helpful_prompts').insert({
    user_id:       user.id,
    session_id:    sessionId,
    question_text: questionText.slice(0, 500),
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
