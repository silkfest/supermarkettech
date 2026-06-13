import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseRouteAuth } from '@/lib/supabase/client'

const ELEVATED_ROLES = ['admin', 'manager', 'journeyman']

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ questionId: string }> }) {
  const { questionId } = await params
  const { data: { user } } = await getSupabaseRouteAuth(req).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseServer()
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  const role = (profile as { role: string } | null)?.role ?? ''
  if (!ELEVATED_ROLES.includes(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const update: Record<string, unknown> = {}
  if (body.question      !== undefined) update.question      = body.question.trim()
  if (body.options       !== undefined) update.options       = body.options
  if (body.correct_index !== undefined) update.correct_index = body.correct_index
  if (body.explanation   !== undefined) update.explanation   = body.explanation.trim()
  if (body.sort_order    !== undefined) update.sort_order    = body.sort_order

  const { data, error } = await supabase.from('quiz_questions').update(update).eq('id', questionId).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ questionId: string }> }) {
  const { questionId } = await params
  const { data: { user } } = await getSupabaseRouteAuth(req).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseServer()
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  const role = (profile as { role: string } | null)?.role ?? ''
  if (!ELEVATED_ROLES.includes(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { error } = await supabase.from('quiz_questions').delete().eq('id', questionId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
