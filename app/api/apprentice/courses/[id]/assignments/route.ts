import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseRouteAuth } from '@/lib/supabase/client'

const ELEVATED_ROLES = ['admin', 'manager']
const ASSIGNABLE_ROLES = ['apprentice', 'journeyman', 'manager', 'admin']

// Resolve the caller and confirm they may manage assignments. Returns the
// service-role client + caller id, or null when unauthorized/forbidden.
async function requireManager(req: NextRequest): Promise<{ supabase: ReturnType<typeof getSupabaseServer>; callerId: string } | null> {
  const { data: { user } } = await getSupabaseRouteAuth(req).auth.getUser()
  if (!user) return null
  const supabase = getSupabaseServer()
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  const role = (profile as { role: string } | null)?.role ?? ''
  if (!ELEVATED_ROLES.includes(role)) return null
  return { supabase, callerId: user.id }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await requireManager(req)
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await ctx.supabase
    .from('course_assignments')
    .select('user_id, role')
    .eq('course_id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    users: (data ?? []).filter(a => a.user_id).map(a => a.user_id),
    roles: (data ?? []).filter(a => a.role).map(a => a.role),
  })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await requireManager(req)
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const userId: string | undefined = body.userId
  const role: string | undefined = body.role
  if ((userId ? 1 : 0) + (role ? 1 : 0) !== 1) {
    return NextResponse.json({ error: 'Provide exactly one of userId or role' }, { status: 400 })
  }
  if (role && !ASSIGNABLE_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  const { error } = await ctx.supabase.from('course_assignments').insert({
    course_id:   id,
    user_id:     userId ?? null,
    role:        role ?? null,
    assigned_by: ctx.callerId,
  })

  // 23505 = unique violation: the assignment already exists, which is fine.
  if (error && error.code !== '23505') {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true }, { status: 201 })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await requireManager(req)
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const userId: string | undefined = body.userId
  const role: string | undefined = body.role
  if ((userId ? 1 : 0) + (role ? 1 : 0) !== 1) {
    return NextResponse.json({ error: 'Provide exactly one of userId or role' }, { status: 400 })
  }

  let query = ctx.supabase.from('course_assignments').delete().eq('course_id', id)
  query = userId ? query.eq('user_id', userId) : query.eq('role', role!)
  const { error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
