import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseRouteAuth } from '@/lib/supabase/client'

const ELEVATED_ROLES = ['admin', 'manager', 'journeyman']

export async function GET(req: NextRequest) {
  const { data: { user } } = await getSupabaseRouteAuth(req).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseServer()
  const url = new URL(req.url)
  const category = url.searchParams.get('category') ?? ''
  const store    = url.searchParams.get('store')    ?? ''
  const trade    = url.searchParams.get('trade')    ?? ''

  let query = supabase.from('policies').select('*').eq('is_published', true).order('sort_order').order('created_at')
  if (category) query = query.eq('category', category)
  if (store)    query = query.eq('store', store)
  if (trade)    query = query.eq('trade', trade)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
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
  const { data, error } = await supabase.from('policies').insert({
    title:       body.title?.trim()       ?? '',
    description: body.description?.trim() ?? '',
    category:    body.category            ?? 'company_policy',
    store:       body.store               ?? '',
    trade:       body.trade               ?? 'general',
    url:         body.url?.trim()         ?? '',
    sort_order:  body.sort_order          ?? 0,
    is_published:body.is_published        ?? true,
    created_by:  user.id,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
