import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseRouteAuth } from '@/lib/supabase/client'

const ELEVATED_ROLES = ['admin', 'manager', 'journeyman']

// GET /api/profile?userId=xxx  — fetch profile + certs
export async function GET(req: NextRequest) {
  const { data: { user } } = await getSupabaseRouteAuth(req).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseServer()
  const targetId = new URL(req.url).searchParams.get('userId') ?? user.id

  // Only elevated roles can view others
  if (targetId !== user.id) {
    const { data: me } = await supabase.from('users').select('role').eq('id', user.id).single()
    if (!ELEVATED_ROLES.includes((me as { role: string } | null)?.role ?? '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const [profileRes, certsRes] = await Promise.all([
    supabase.from('users').select('id,name,email,role,status,created_at,mentor_id,apprenticeship_start_date,apprenticeship_hours,apprenticeship_year').eq('id', targetId).single(),
    supabase.from('tech_certifications').select('*').eq('user_id', targetId).order('created_at', { ascending: false }),
  ])

  if (profileRes.error) return NextResponse.json({ error: profileRes.error.message }, { status: 500 })

  return NextResponse.json({
    profile: profileRes.data,
    certs:   certsRes.data ?? [],
  })
}

// PATCH /api/profile  — update apprenticeship fields for a user
export async function PATCH(req: NextRequest) {
  const { data: { user } } = await getSupabaseRouteAuth(req).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseServer()
  const body = await req.json()
  const targetId: string = body.userId ?? user.id

  // Only elevated roles can edit others
  if (targetId !== user.id) {
    const { data: me } = await supabase.from('users').select('role').eq('id', user.id).single()
    if (!ELEVATED_ROLES.includes((me as { role: string } | null)?.role ?? '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const update: Record<string, unknown> = {}
  if (body.apprenticeship_start_date !== undefined) update.apprenticeship_start_date = body.apprenticeship_start_date || null
  if (body.apprenticeship_hours      !== undefined) update.apprenticeship_hours      = Number(body.apprenticeship_hours)
  if (body.apprenticeship_year       !== undefined) update.apprenticeship_year       = Number(body.apprenticeship_year)
  if (body.name                      !== undefined) update.name                      = body.name.trim()
  if (body.has_seen_onboarding       !== undefined) update.has_seen_onboarding       = Boolean(body.has_seen_onboarding)

  const { data, error } = await supabase.from('users').update(update).eq('id', targetId).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
