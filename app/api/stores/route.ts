import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseRouteAuth } from '@/lib/supabase/client'

export async function GET(req: NextRequest) {
  const { data: { user } } = await getSupabaseRouteAuth(req).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = getSupabaseServer()

  const { data: stores, error } = await supabase
    .from('stores')
    .select('*')
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Enrich each store with equipment count + most recent PM date
  const storeIds = (stores ?? []).map((s: { id: string }) => s.id)

  const [equipResult, pmResult] = await Promise.all([
    supabase
      .from('equipment')
      .select('store_id')
      .in('store_id', storeIds),
    supabase
      .from('pm_reports')
      .select('store_name, performed_at')
      .order('performed_at', { ascending: false }),
  ])

  // Build equipment counts per store
  const equipCounts: Record<string, number> = {}
  for (const e of equipResult.data ?? []) {
    equipCounts[e.store_id] = (equipCounts[e.store_id] ?? 0) + 1
  }

  // Build latest PM date per store name (stores may not have IDs in pm_reports yet)
  const latestPm: Record<string, string> = {}
  for (const pm of pmResult.data ?? []) {
    if (pm.store_name && !latestPm[pm.store_name]) {
      latestPm[pm.store_name] = pm.performed_at
    }
  }

  const enriched = (stores ?? []).map((s: Record<string, unknown>) => ({
    ...s,
    equipment_count: equipCounts[s.id as string] ?? 0,
    last_pm_date:    latestPm[s.name as string] ?? null,
  }))

  return NextResponse.json(enriched)
}

export async function POST(req: NextRequest) {
  const { data: { user } } = await getSupabaseRouteAuth(req).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = getSupabaseServer()
  const body = await req.json()
  const { name, address, contactName, phone, trendingIssues } = body

  if (!name?.trim()) return NextResponse.json({ error: 'name is required' }, { status: 400 })

  const { data, error } = await supabase
    .from('stores')
    .insert({
      name,
      address:          address          ?? '',
      contact_name:     contactName      ?? '',
      phone:            phone            ?? '',
      trending_issues:  trendingIssues   ?? '',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
