import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/client'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = getSupabaseServer()

  const [storeResult, equipResult, pmResult] = await Promise.all([
    supabase.from('stores').select('*').eq('id', id).single(),
    supabase.from('equipment').select('*').eq('store_id', id).order('equipment_type').order('name'),
    supabase
      .from('pm_reports')
      .select('id, store_name, performed_at, report_type')
      .order('performed_at', { ascending: false })
      .limit(10),
  ])

  if (storeResult.error) return NextResponse.json({ error: storeResult.error.message }, { status: 404 })

  const store = storeResult.data as Record<string, unknown>

  // Filter PMs by store name (until pm_reports has a store_id FK)
  const storePms = (pmResult.data ?? []).filter(
    (pm: { store_name: string }) => pm.store_name === store.name
  )

  return NextResponse.json({
    ...store,
    equipment:   equipResult.data  ?? [],
    recent_pms:  storePms,
  })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = getSupabaseServer()
  const body = await req.json()

  const update: Record<string, unknown> = {}
  if ('name'            in body) update.name             = body.name
  if ('address'         in body) update.address          = body.address
  if ('contactName'     in body) update.contact_name     = body.contactName
  if ('phone'           in body) update.phone            = body.phone
  if ('trendingIssues'  in body) update.trending_issues  = body.trendingIssues

  const { data, error } = await supabase
    .from('stores')
    .update({ ...update, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = getSupabaseServer()
  const { error } = await supabase.from('stores').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
