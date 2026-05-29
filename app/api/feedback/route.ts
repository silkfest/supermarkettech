import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseRouteAuth } from '@/lib/supabase/client'

const MANAGER_ROLES = ['admin', 'manager']

// GET /api/feedback?userId=xxx — fetch feedback for a user
export async function GET(req: NextRequest) {
  const { data: { user } } = await getSupabaseRouteAuth(req).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase   = getSupabaseServer()
  const targetId   = new URL(req.url).searchParams.get('userId') ?? user.id

  // Only managers/admins can read feedback for others
  if (targetId !== user.id) {
    const { data: me } = await supabase.from('users').select('role').eq('id', user.id).single()
    if (!MANAGER_ROLES.includes((me as { role: string } | null)?.role ?? '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const { data, error } = await supabase
    .from('feedback')
    .select('id, content, created_at, manager:manager_id(name, email, role)')
    .eq('technician_id', targetId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// POST /api/feedback — managers submit feedback for a tech
export async function POST(req: NextRequest) {
  const { data: { user } } = await getSupabaseRouteAuth(req).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseServer()
  const { data: me } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!MANAGER_ROLES.includes((me as { role: string } | null)?.role ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { technicianId, content } = body
  if (!technicianId || !content?.trim()) {
    return NextResponse.json({ error: 'technicianId and content are required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('feedback')
    .insert({ technician_id: technicianId, manager_id: user.id, content: content.trim() })
    .select('id, content, created_at, manager:manager_id(name, email, role)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
