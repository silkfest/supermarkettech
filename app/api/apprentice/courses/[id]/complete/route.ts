import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseRouteAuth } from '@/lib/supabase/client'

const ELEVATED_ROLES = ['admin', 'manager', 'journeyman']

async function resolveUserId(bodyUserId: string | undefined, callerId: string, supabase: ReturnType<typeof getSupabaseServer>): Promise<string | null> {
  const targetId = bodyUserId ?? callerId
  if (targetId === callerId) return targetId
  const { data: profile } = await supabase.from('users').select('role').eq('id', callerId).single()
  const role = (profile as { role: string } | null)?.role ?? ''
  return ELEVATED_ROLES.includes(role) ? targetId : null
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data: { user } } = await getSupabaseRouteAuth(req).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseServer()
  const body = await req.json().catch(() => ({}))
  const userId = await resolveUserId(body.userId, user.id, supabase)
  if (!userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Lesson-based courses are completed automatically once all lessons are done — block manual completion
  const { count: lessonCount } = await supabase.from('course_lessons').select('id', { count: 'exact', head: true }).eq('course_id', id)
  if ((lessonCount ?? 0) > 0) return NextResponse.json({ error: 'This course is completed automatically by finishing its lessons' }, { status: 400 })

  const { data, error } = await supabase.from('course_completions').upsert({
    user_id:      userId,
    course_id:    id,
    completed_at: new Date().toISOString(),
    notes:        body.notes ?? '',
  }, { onConflict: 'user_id,course_id' }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data: { user } } = await getSupabaseRouteAuth(req).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseServer()
  const body = await req.json().catch(() => ({}))
  const userId = await resolveUserId(body.userId, user.id, supabase)
  if (!userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { error } = await supabase.from('course_completions')
    .delete()
    .eq('user_id', userId)
    .eq('course_id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
