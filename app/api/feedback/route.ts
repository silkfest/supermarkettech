import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseRouteAuth } from '@/lib/supabase/client'

const MANAGER_ROLES = ['admin', 'manager']
const SELECT_FIELDS = 'id, content, strengths, improvements, review_period, rating_overall, rating_technical, rating_safety, rating_teamwork, created_at, manager:manager_id(name, email, role)'

// GET /api/feedback?userId=xxx
export async function GET(req: NextRequest) {
  const { data: { user } } = await getSupabaseRouteAuth(req).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseServer()
  const targetId = new URL(req.url).searchParams.get('userId') ?? user.id

  if (targetId !== user.id) {
    const { data: me } = await supabase.from('users').select('role').eq('id', user.id).single()
    if (!MANAGER_ROLES.includes((me as { role: string } | null)?.role ?? '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const { data, error } = await supabase
    .from('feedback')
    .select(SELECT_FIELDS)
    .eq('technician_id', targetId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// POST /api/feedback
export async function POST(req: NextRequest) {
  const { data: { user } } = await getSupabaseRouteAuth(req).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseServer()
  const { data: me } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!MANAGER_ROLES.includes((me as { role: string } | null)?.role ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { technicianId, content, strengths, improvements, review_period,
          rating_overall, rating_technical, rating_safety, rating_teamwork } = body

  if (!technicianId || (!strengths?.trim() && !content?.trim())) {
    return NextResponse.json({ error: 'At least a strengths note or comment is required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('feedback')
    .insert({
      technician_id:    technicianId,
      manager_id:       user.id,
      content:          content?.trim()      || null,
      strengths:        strengths?.trim()    || null,
      improvements:     improvements?.trim() || null,
      review_period:    review_period?.trim() || null,
      rating_overall:   rating_overall   ?? null,
      rating_technical: rating_technical ?? null,
      rating_safety:    rating_safety    ?? null,
      rating_teamwork:  rating_teamwork  ?? null,
    })
    .select(SELECT_FIELDS)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
