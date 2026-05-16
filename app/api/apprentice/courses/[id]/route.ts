import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseRouteAuth } from '@/lib/supabase/client'

const ELEVATED_ROLES = ['admin', 'manager', 'journeyman']

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data: { user } } = await getSupabaseRouteAuth(req).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseServer()
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  const role = (profile as { role: string } | null)?.role ?? ''
  if (!ELEVATED_ROLES.includes(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const update: Record<string, unknown> = {}
  if (body.title            !== undefined) update.title            = body.title.trim()
  if (body.description      !== undefined) update.description      = body.description.trim()
  if (body.category         !== undefined) update.category         = body.category
  if (body.type             !== undefined) update.type             = body.type
  if (body.url              !== undefined) update.url              = body.url.trim()
  if (body.duration_minutes !== undefined) update.duration_minutes = body.duration_minutes
  if (body.points           !== undefined) update.points           = body.points
  if (body.sort_order       !== undefined) update.sort_order       = body.sort_order
  if (body.is_published     !== undefined) update.is_published     = body.is_published

  const { data, error } = await supabase.from('courses').update(update).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data: { user } } = await getSupabaseRouteAuth(req).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseServer()
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  const role = (profile as { role: string } | null)?.role ?? ''
  if (!['admin', 'manager'].includes(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { error } = await supabase.from('courses').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
