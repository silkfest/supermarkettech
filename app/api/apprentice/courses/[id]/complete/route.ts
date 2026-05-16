import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseRouteAuth } from '@/lib/supabase/client'

const ELEVATED_ROLES = ['admin', 'manager', 'journeyman']

async function resolveUserId(req: NextRequest, callerId: string, supabase: ReturnType<typeof getSupabaseServer>): Promise<string | null> {
  const body = await req.clone().json().catch(() => ({}))
  const targetId: string = body.userId ?? callerId
  if (targetId === callerId) return targetId
  const { data: profile } = await supabase.from('users').select('role').eq('id', callerId).single()
  const role = (profile as { role: string } | null)?.role ?? ''
  return ELEVATED_ROLES.includes(role) ? targetId : null
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { data: { user } } = await getSupabaseRouteAuth(req).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseServer()
  const userId = await resolveUserId(req, user.id, supabase)
  if (!userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const { data, error } = await supabase.from('course_completions').upsert({
    user_id:      userId,
    course_id:    params.id,
    completed_at: new Date().toISOString(),
    notes:        body.notes ?? '',
  }, { onConflict: 'user_id,course_id' }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { data: { user } } = await getSupabaseRouteAuth(req).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseServer()
  const userId = await resolveUserId(req, user.id, supabase)
  if (!userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { error } = await supabase.from('course_completions')
    .delete()
    .eq('user_id', userId)
    .eq('course_id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
