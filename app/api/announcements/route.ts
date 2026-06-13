import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseRouteAuth } from '@/lib/supabase/client'
import type { Announcement } from '@/types'

const ELEVATED_ROLES = ['admin', 'manager']

export async function GET(req: NextRequest) {
  const { data: { user } } = await getSupabaseRouteAuth(req).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseServer()
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  const isManager = ELEVATED_ROLES.includes((profile as { role: string } | null)?.role ?? '')

  const url = new URL(req.url)
  const limit = Number(url.searchParams.get('limit') ?? '0')

  let query = supabase.from('announcements')
    .select('*, users(name), acknowledgements:announcement_acknowledgements(user_id, acknowledged_at, users(name))')
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false })
  if (limit > 0) query = query.limit(limit)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let totalActiveUsers: number | undefined
  if (isManager) {
    const { count } = await supabase.from('users').select('id', { count: 'exact', head: true }).eq('status', 'active')
    totalActiveUsers = count ?? undefined
  }

  const result = (data ?? []).map((a) => {
    const acks = (a as unknown as Announcement).acknowledgements ?? []
    const acknowledged_by_me = acks.some(ack => ack.user_id === user.id)
    if (isManager) {
      return { ...a, acknowledged_by_me, total_active_users: totalActiveUsers }
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { acknowledgements, ...rest } = a as unknown as Announcement
    return { ...rest, acknowledged_by_me }
  })

  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const { data: { user } } = await getSupabaseRouteAuth(req).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseServer()
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!ELEVATED_ROLES.includes((profile as { role: string } | null)?.role ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const title = body.title?.trim() ?? ''
  const content = body.content?.trim() ?? ''
  if (!title || !content) {
    return NextResponse.json({ error: 'Title and content are required' }, { status: 400 })
  }

  const { data, error } = await supabase.from('announcements').insert({
    title,
    content,
    created_by: user.id,
    pinned: body.pinned ?? false,
    requires_ack: body.requires_ack ?? false,
  }).select('*, users(name), acknowledgements:announcement_acknowledgements(user_id, acknowledged_at, users(name))').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ...data, acknowledged_by_me: false }, { status: 201 })
}
