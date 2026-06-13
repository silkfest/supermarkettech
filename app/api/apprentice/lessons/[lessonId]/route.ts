import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseRouteAuth } from '@/lib/supabase/client'

const ELEVATED_ROLES = ['admin', 'manager', 'journeyman']

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params
  const { data: { user } } = await getSupabaseRouteAuth(req).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseServer()
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  const role = (profile as { role: string } | null)?.role ?? ''
  if (!ELEVATED_ROLES.includes(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const update: Record<string, unknown> = {}
  if (body.title         !== undefined) update.title         = body.title.trim()
  if (body.description   !== undefined) update.description   = body.description.trim()
  if (body.lesson_type   !== undefined) update.lesson_type   = body.lesson_type
  if (body.kb_topic_slug !== undefined) update.kb_topic_slug = body.kb_topic_slug?.trim() || null
  if (body.video_url     !== undefined) update.video_url     = body.video_url?.trim() || null
  if (body.sort_order    !== undefined) update.sort_order    = body.sort_order

  const { data, error } = await supabase.from('course_lessons').update(update).eq('id', lessonId).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params
  const { data: { user } } = await getSupabaseRouteAuth(req).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseServer()
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  const role = (profile as { role: string } | null)?.role ?? ''
  if (!ELEVATED_ROLES.includes(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { error } = await supabase.from('course_lessons').delete().eq('id', lessonId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
