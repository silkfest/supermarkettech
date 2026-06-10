import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseRouteAuth } from '@/lib/supabase/client'

const ELEVATED_ROLES = ['admin', 'manager']

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data: { user } } = await getSupabaseRouteAuth(req).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseServer()
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!ELEVATED_ROLES.includes((profile as { role: string } | null)?.role ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.title        !== undefined) update.title        = body.title.trim()
  if (body.content      !== undefined) update.content      = body.content.trim()
  if (body.pinned       !== undefined) update.pinned       = body.pinned
  if (body.requires_ack !== undefined) update.requires_ack = body.requires_ack

  const { data, error } = await supabase.from('announcements').update(update).eq('id', id)
    .select('*, users(name), acknowledgements:announcement_acknowledgements(user_id, acknowledged_at, users(name))').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const acks = (data as unknown as { acknowledgements?: { user_id: string }[] }).acknowledgements ?? []
  return NextResponse.json({ ...data, acknowledged_by_me: acks.some(a => a.user_id === user.id) })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data: { user } } = await getSupabaseRouteAuth(req).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseServer()
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!ELEVATED_ROLES.includes((profile as { role: string } | null)?.role ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error } = await supabase.from('announcements').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
